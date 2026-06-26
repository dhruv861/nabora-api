import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJobDto, UpdateJobDto } from './dto/create-job.dto';
import { JobFeedQueryDto } from './dto/job-feed-query.dto';
import type { ICacheProvider } from '../../providers/cache/cache.interface';
import { CACHE_PROVIDER } from '../../providers/cache/cache.interface';
import { JobStatus } from '../../common/types/enums';
import { computeMatchScore, buildFeedCacheKey } from './matching.util';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
  ) {}

  generateJobSlug(title: string, jobId: string): string {
    const base = (title ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    const safeBase = base.length > 0 ? base : 'job';
    return `${safeBase}-${jobId.slice(0, 8)}`;
  }

  validateQualityGate(job: { title: string; description: string; area: string; payRate: number }) {
    const failures: string[] = [];
    if ((job.title ?? '').trim().split(/\s+/).filter(Boolean).length < 5)
      failures.push('Title must be at least 5 words');
    if ((job.description ?? '').length < 100)
      failures.push('Description must be at least 100 characters');
    if (!job.area || job.area.trim().length < 2) failures.push('Area is required');
    if (!job.payRate || job.payRate <= 0) failures.push('Pay rate must be greater than 0');
    return { valid: failures.length === 0, failures };
  }

  async create(userId: string, dto: CreateJobDto) {
    const { skillIds, ...jobData } = dto;
    const job = await this.prisma.job.create({
      data: {
        ...jobData,
        slug: `draft-${Date.now()}`,
        posterId: userId,
        status: JobStatus.DRAFT,
        workDate: new Date(dto.workDate),
        workDateEnd: dto.workDateEnd ? new Date(dto.workDateEnd) : undefined,
        skills: skillIds?.length ? { create: skillIds.map((skillId) => ({ skillId })) } : undefined,
      },
    });
    const slug = this.generateJobSlug(dto.title, job.id);
    return this.prisma.job.update({
      where: { id: job.id },
      data: { slug },
      include: { skills: { include: { skill: true } } },
    });
  }

  async publish(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.posterId !== userId) throw new ForbiddenException('You do not own this job');
    if (job.status !== JobStatus.DRAFT) throw new BadRequestException(`Job is already ${job.status}`);
    const { valid, failures } = this.validateQualityGate(job as any);
    if (!valid) throw new BadRequestException({ message: 'Quality gate failed', failures });
    const expiresAt = new Date(new Date(job.workDate).getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.PUBLISHED, expiresAt },
      include: { skills: { include: { skill: true } } },
    });
  }

  // ── Feed ───────────────────────────────────────────────────────────────────
  async getFeed(
    query: JobFeedQueryDto,
    callerId?: string,
  ): Promise<{ jobs: unknown[]; nextCursor: string | null; total?: number }> {
    const rawLat = Number(query.lat);
    const rawLng = Number(query.lng);
    const radius  = Math.min(Number(query.radius ?? 20), 100);
    const limit   = Math.min(Number(query.limit ?? 20), 50);
    const section = query.section ?? 'featured';

    const hasCoords = !isNaN(rawLat) && !isNaN(rawLng)
      && rawLat >= -90 && rawLat <= 90
      && rawLng >= -180 && rawLng <= 180;

    if (!hasCoords) return this.getFeedByRecency(query);

    // ── Cache check (non-personalised sections only) ────────────────────────
    if (section !== 'recommended') {
      const cacheKey = buildFeedCacheKey({ ...query, section });
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        try { return JSON.parse(cached as string); } catch { /* ignore */ }
      }
      const result = await this.runSpatialQuery(query, rawLat, rawLng, radius, limit, section);
      await this.cache.set(cacheKey, JSON.stringify(result), 60);
      return result;
    }

    // ── Recommended: personalised match scoring ─────────────────────────────
    return this.getRecommendedFeed(query, rawLat, rawLng, radius, limit, callerId);
  }

  // ── Recommended feed with match scoring ────────────────────────────────────
  private async getRecommendedFeed(
    query: JobFeedQueryDto,
    lat: number, lng: number,
    radius: number, limit: number,
    callerId?: string,
  ): Promise<{ jobs: unknown[]; nextCursor: string | null }> {
    // Fetch caller worker profile for scoring (if authenticated)
    let workerProfile: {
      skillSlugs: string[];
      availabilityStatus: string;
      reliabilityScore: number;
      averageRating: number;
      isNewWorker: boolean;
    } | null = null;

    if (callerId) {
      const user = await this.prisma.user.findUnique({
        where: { id: callerId },
        select: {
          availabilityStatus: true,
          reliabilityScore: true,
          averageRating: true,
          isNewWorker: true,
          workerProfile: {
            select: {
              skills: { select: { skill: { select: { slug: true } } } },
            },
          },
        },
      });
      if (user) {
        workerProfile = {
          skillSlugs: user.workerProfile?.skills.map((us) => us.skill.slug) ?? [],
          availabilityStatus: user.availabilityStatus,
          reliabilityScore: user.reliabilityScore,
          averageRating: user.averageRating,
          isNewWorker: user.isNewWorker,
        };
      }
    }

    // Run spatial query (wider radius for recommended)
    const raw = await this.runSpatialQuery(query, lat, lng, radius, 100, 'recommended');
    const rawJobs = raw.jobs as Record<string, unknown>[];

    if (!workerProfile) {
      // No profile: fallback to featured sort
      return { jobs: rawJobs.slice(0, limit), nextCursor: rawJobs.length > limit ? (rawJobs[limit - 1].id as string) : null };
    }

    // Score each job
    const scored = rawJobs.map((job) => {
      const jobSkillSlugs = (job.skills as any[])?.map((s: any) => s.slug ?? s.skill?.slug).filter(Boolean) ?? [];
      const distanceKm = Number(job.distanceKm ?? 99);
      const score = computeMatchScore({
        distanceKm,
        jobSkillSlugs,
        workerSkillSlugs: workerProfile!.skillSlugs,
        availabilityStatus: workerProfile!.availabilityStatus,
        reliabilityScore: workerProfile!.reliabilityScore,
        averageRating: workerProfile!.averageRating,
        isNewWorker: workerProfile!.isNewWorker,
      });
      return { ...job, matchScore: score };
    });

    // Filter score < 35 and sort by score DESC
    const filtered = scored
      .filter((j) => j.matchScore >= 35)
      .sort((a, b) => b.matchScore - a.matchScore);

    const page = filtered.slice(0, limit);
    const nextCursor = filtered.length > limit
      ? Buffer.from(JSON.stringify({ id: (page[page.length - 1] as any).id, score: page[page.length - 1].matchScore })).toString('base64url')
      : null;

    return { jobs: page, nextCursor };
  }

  // ── Core spatial query (used by all sections) ───────────────────────────────
  private async runSpatialQuery(
    query: JobFeedQueryDto,
    lat: number, lng: number,
    radius: number, limit: number,
    section: string,
  ): Promise<{ jobs: unknown[]; nextCursor: string | null }> {
    const limitSafe   = limit + 1;
    const SLUG_RE     = /^[a-z0-9-]+$/;
    const citySlug    = SLUG_RE.test(query.city ?? '')     ? query.city!     : null;
    const categorySlug= SLUG_RE.test(query.category ?? '') ? query.category! : null;
    const payUnit     = ['HOUR', 'DAY', 'FIXED'].includes(query.payUnit ?? '') ? query.payUnit! : null;
    const payMin      = query.payMin !== undefined ? Number(query.payMin) : null;
    const payMax      = query.payMax !== undefined ? Number(query.payMax) : null;
    const dateStr     = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? '') ? query.date! : null;

    // Section-specific radius adjustments
    const radiusMeters = section === 'nearby' ? 5000 : radius * 1000;
    const featuredOnly = section === 'featured' || query.featured === true;
    const newOnly      = section === 'new';

    const conditions: string[] = [
      `j.status = 'PUBLISHED'`,
      `j."workDate" >= NOW()`,
      `j."location_point" IS NOT NULL`,
      `ST_DWithin(j."location_point", ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)`,
    ];
    if (citySlug)          conditions.push(`j."citySlug" = '${citySlug}'`);
    if (categorySlug)      conditions.push(`j."categorySlug" = '${categorySlug}'`);
    if (payUnit)           conditions.push(`j."payUnit" = '${payUnit}'`);
    if (payMin !== null)   conditions.push(`j."payRate" >= ${payMin}`);
    if (payMax !== null)   conditions.push(`j."payRate" <= ${payMax}`);
    if (dateStr)           conditions.push(`DATE(j."workDate") = '${dateStr}'`);
    if (featuredOnly)      conditions.push(`j."isFeatured" = true`);
    if (newOnly)           conditions.push(`j."createdAt" >= NOW() - INTERVAL '24 hours'`);

    let cursorCondition = '';
    if (query.cursor && section !== 'recommended') {
      try {
        const decoded = JSON.parse(Buffer.from(query.cursor, 'base64url').toString()) as { distanceKm: number; id: string };
        const dkm = Number(decoded.distanceKm);
        if (!isNaN(dkm) && /^[a-z0-9]+$/i.test(decoded.id)) {
          cursorCondition = `AND (
            ROUND(ST_Distance(j."location_point", ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography)::numeric / 1000, 4) > ${dkm}
            OR (
              ROUND(ST_Distance(j."location_point", ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography)::numeric / 1000, 4) = ${dkm}
              AND j.id > '${decoded.id}'
            )
          )`;
        }
      } catch { /* ignore invalid cursor */ }
    }

    const sql = `
      SELECT
        j.*,
        ROUND(
          ST_Distance(j."location_point", ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography)::numeric / 1000, 4
        ) AS "distanceKm",
        o.name AS "organizationName",
        o."logoUrl" AS "organizationLogo",
        o."isVerified" AS "organizationVerified"
      FROM "Job" j
      LEFT JOIN "Organization" o ON o.id = j."organizationId"
      WHERE ${conditions.join(' AND ')}
      ${cursorCondition}
      ORDER BY j."isFeatured" DESC, "distanceKm" ASC, j.id ASC
      LIMIT $4
    `;

    const jobs = (await this.prisma.$queryRawUnsafe(
      sql, lat, lng, radiusMeters, limitSafe,
    )) as Record<string, unknown>[];

    const hasMore = jobs.length > limit;
    if (hasMore) jobs.pop();
    const nextCursor = hasMore
      ? Buffer.from(JSON.stringify({ distanceKm: jobs[jobs.length - 1].distanceKm, id: jobs[jobs.length - 1].id })).toString('base64url')
      : null;

    return { jobs, nextCursor };
  }

  private async getFeedByRecency(query: JobFeedQueryDto) {
    const SLUG_RE     = /^[a-z0-9-]+$/;
    const citySlug    = SLUG_RE.test(query.city ?? '')     ? query.city!     : undefined;
    const categorySlug= SLUG_RE.test(query.category ?? '') ? query.category! : undefined;
    const limit       = Math.min(Number(query.limit ?? 20), 50);
    const jobs = await this.prisma.job.findMany({
      where: {
        status: JobStatus.PUBLISHED,
        workDate: { gte: new Date() },
        ...(citySlug     ? { citySlug }     : {}),
        ...(categorySlug ? { categorySlug } : {}),
        ...(query.cursor ? { id: { gt: query.cursor } } : {}),
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: limit + 1,
      include: {
        organization: { select: { name: true, logoUrl: true, isVerified: true } },
        skills: { include: { skill: { select: { name: true, slug: true } } } },
      },
    });
    const hasMore = jobs.length > limit;
    if (hasMore) jobs.pop();
    return { jobs, nextCursor: hasMore ? jobs[jobs.length - 1].id : null };
  }

  async findBySlug(citySlug: string, categorySlug: string, slug: string) {
    const job = await this.prisma.job.findFirst({
      where: { slug, citySlug, categorySlug },
      include: {
        organization: true,
        skills: { include: { skill: true } },
        poster: { select: { id: true, name: true, avatarUrl: true, verificationLevel: true } },
        _count: { select: { applications: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async findMyJobs(userId: string, query: JobFeedQueryDto) {
    const statusFilter = query.status && ['DRAFT','PUBLISHED','CLOSED','EXPIRED','DELETED'].includes(query.status)
      ? { status: query.status } : {};
    return this.prisma.job.findMany({
      where: { posterId: userId, ...statusFilter },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { applications: true } }, skills: { include: { skill: true } } },
    });
  }

  async update(jobId: string, userId: string, dto: UpdateJobDto) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.posterId !== userId) throw new ForbiddenException('You do not own this job');
    if (job.status !== JobStatus.DRAFT) throw new BadRequestException('Only DRAFT jobs can be edited');
    const { skillIds, ...data } = dto;
    const updateData: Record<string, unknown> = { ...data };
    if (dto.workDate) updateData.workDate = new Date(dto.workDate);
    if (skillIds !== undefined) {
      await this.prisma.jobSkill.deleteMany({ where: { jobId } });
      if (skillIds.length > 0) {
        await this.prisma.jobSkill.createMany({ data: skillIds.map((skillId) => ({ jobId, skillId })), skipDuplicates: true });
      }
    }
    return this.prisma.job.update({ where: { id: jobId }, data: updateData, include: { skills: { include: { skill: true } } } });
  }

  async remove(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.posterId !== userId) throw new ForbiddenException('You do not own this job');
    return this.prisma.job.update({ where: { id: jobId }, data: { status: JobStatus.DELETED } });
  }

  async featureJob(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.posterId !== userId) throw new ForbiddenException('You do not own this job');
    return this.prisma.job.update({
      where: { id: jobId },
      data: { isFeatured: true, featuredUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
  }

  async incrementViewCount(jobId: string, visitorIp: string): Promise<void> {
    const cacheKey = `view:${jobId}:${visitorIp}`;
    const seen = await this.cache.get(cacheKey);
    if (seen) return;
    await this.cache.set(cacheKey, '1', 3600);
    await this.prisma.job.updateMany({ where: { id: jobId }, data: { viewCount: { increment: 1 } } });
  }

  async getJobUsage(userId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const count = await this.prisma.job.count({
      where: { posterId: userId, status: { not: JobStatus.DELETED }, createdAt: { gte: startOfMonth } },
    });
    return { used: count, limit: 5, remaining: Math.max(0, 5 - count) };
  }
}
