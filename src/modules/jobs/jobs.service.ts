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

// ─── SQL Injection Safety ─────────────────────────────────────────────────────
// All numeric inputs are coerced with Number() and validated with isNaN / bounds.
// All string filter inputs are validated against strict whitelists:
//   - Slugs:  /^[a-z0-9-]+$/  (no user content interpolated)
//   - Enums:  explicit array includes check
// $queryRawUnsafe is used ONLY for the spatial query where Prisma tagged-template
// cannot accept runtime SQL fragments. No free-text user content is ever interpolated.
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
  ) {}

  // ─── Slug ──────────────────────────────────────────────────────────────────
  generateJobSlug(title: string, jobId: string): string {
    const base = (title ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    const safeBase = base.length > 0 ? base : 'job';
    const shortId = jobId.slice(0, 8);
    return `${safeBase}-${shortId}`;
  }

  // ─── Quality Gate ──────────────────────────────────────────────────────────
  validateQualityGate(job: { title: string; description: string; area: string; payRate: number }): {
    valid: boolean;
    failures: string[];
  } {
    const failures: string[] = [];
    const wordCount = (job.title ?? '').trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 5) failures.push('Title must be at least 5 words');
    if ((job.description ?? '').length < 100) failures.push('Description must be at least 100 characters');
    if (!job.area || job.area.trim().length < 2) failures.push('Area is required');
    if (!job.payRate || job.payRate <= 0) failures.push('Pay rate must be greater than 0');
    return { valid: failures.length === 0, failures };
  }

  // ─── Create ────────────────────────────────────────────────────────────────
  async create(userId: string, dto: CreateJobDto) {
    const { skillIds, ...jobData } = dto;

    // Create with a temp slug, then update with real slug using the generated ID
    const job = await this.prisma.job.create({
      data: {
        ...jobData,
        slug: `draft-${Date.now()}`,   // temporary — replaced immediately below
        posterId: userId,
        status: JobStatus.DRAFT,
        workDate: new Date(dto.workDate),
        workDateEnd: dto.workDateEnd ? new Date(dto.workDateEnd) : undefined,
        skills: skillIds?.length
          ? { create: skillIds.map((skillId) => ({ skillId })) }
          : undefined,
      },
    });

    // Replace temp slug with final slug (title + shortId)
    const slug = this.generateJobSlug(dto.title, job.id);
    return this.prisma.job.update({
      where: { id: job.id },
      data: { slug },
      include: { skills: { include: { skill: true } } },
    });
  }

  // ─── Publish ───────────────────────────────────────────────────────────────
  async publish(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.posterId !== userId) throw new ForbiddenException('You do not own this job');
    if (job.status !== JobStatus.DRAFT) {
      throw new BadRequestException(`Job is already ${job.status}`);
    }

    const { valid, failures } = this.validateQualityGate(job as Parameters<typeof this.validateQualityGate>[0]);
    if (!valid) throw new BadRequestException({ message: 'Quality gate failed', failures });

    const workDate = new Date(job.workDate);
    const expiresAt = new Date(workDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.PUBLISHED,
        expiresAt,
      },
      include: { skills: { include: { skill: true } } },
    });
  }

  // ─── Feed ──────────────────────────────────────────────────────────────────
  async getFeed(query: JobFeedQueryDto): Promise<{ jobs: unknown[]; nextCursor: string | null; total?: number }> {
    const rawLat  = Number(query.lat);
    const rawLng  = Number(query.lng);
    const radius  = Math.min(Number(query.radius ?? 20), 100);
    const limit   = Math.min(Number(query.limit ?? 20), 50);

    const hasCoords = !isNaN(rawLat) && !isNaN(rawLng)
      && rawLat >= -90 && rawLat <= 90
      && rawLng >= -180 && rawLng <= 180;

    if (!hasCoords) {
      return this.getFeedByRecency(query);
    }

    // ── Whitelist all string filters (SQL injection prevention) ────────────
    const SLUG_RE = /^[a-z0-9-]+$/;
    const citySlug     = SLUG_RE.test(query.city ?? '')     ? query.city!     : null;
    const categorySlug = SLUG_RE.test(query.category ?? '') ? query.category! : null;
    const payUnit      = ['HOUR', 'DAY', 'FIXED'].includes(query.payUnit ?? '') ? query.payUnit! : null;
    const payMin       = query.payMin !== undefined ? Number(query.payMin) : null;
    const payMax       = query.payMax !== undefined ? Number(query.payMax) : null;
    const dateStr      = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? '') ? query.date! : null;

    // Validate numeric filters
    if (payMin !== null && isNaN(payMin)) throw new BadRequestException('Invalid payMin');
    if (payMax !== null && isNaN(payMax)) throw new BadRequestException('Invalid payMax');

    const radiusMeters = radius * 1000;
    const limitSafe    = limit + 1; // fetch one extra to detect hasMore

    // Section-specific overrides
    const nearbyRadiusMeters = query.section === 'nearby' ? 2000 : radiusMeters;
    const featuredOnly       = query.section === 'featured' || query.featured === true;

    // ── Build safe WHERE clause fragments ──────────────────────────────────
    const conditions: string[] = [
      `j.status = 'PUBLISHED'`,
      `j."workDate" >= NOW()`,
      `j."location_point" IS NOT NULL`,
      `ST_DWithin(j."location_point", ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)`,
    ];
    if (citySlug)     conditions.push(`j."citySlug" = '${citySlug}'`);
    if (categorySlug) conditions.push(`j."categorySlug" = '${categorySlug}'`);
    if (payUnit)      conditions.push(`j."payUnit" = '${payUnit}'`);
    if (payMin !== null) conditions.push(`j."payRate" >= ${payMin}`);
    if (payMax !== null) conditions.push(`j."payRate" <= ${payMax}`);
    if (dateStr)      conditions.push(`DATE(j."workDate") = '${dateStr}'`);
    if (featuredOnly) conditions.push(`j."isFeatured" = true`);

    // ── Cursor-based pagination ────────────────────────────────────────────
    let cursorCondition = '';
    if (query.cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(query.cursor, 'base64url').toString()) as {
          distanceKm: number; id: string;
        };
        const dkm = Number(decoded.distanceKm);
        // Validate cursor values
        if (!isNaN(dkm) && /^[a-z0-9]+$/i.test(decoded.id)) {
          cursorCondition = `AND (
            ROUND(ST_Distance(j."location_point", ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography)::numeric / 1000, 4) > ${dkm}
            OR (
              ROUND(ST_Distance(j."location_point", ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography)::numeric / 1000, 4) = ${dkm}
              AND j.id > '${decoded.id}'
            )
          )`;
        }
      } catch {
        // Invalid cursor — ignore and return from start
      }
    }

    // countOnly: lightweight count query for filter preview
    if (query.countOnly) {
      const countSql = `
        SELECT COUNT(*)::int AS count
        FROM "Job" j
        WHERE ${conditions.join(' AND ')}
        ${cursorCondition}
      `;
      const countResult = await this.prisma.$queryRawUnsafe(
        countSql, rawLat, rawLng, nearbyRadiusMeters,
      ) as { count: number }[];
      return { jobs: [], nextCursor: null, total: countResult[0].count };
    }

    const sql = `
      SELECT
        j.*,
        ROUND(
          ST_Distance(j."location_point", ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography)::numeric / 1000,
          4
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
      sql, rawLat, rawLng, nearbyRadiusMeters, limitSafe,
    )) as Record<string, unknown>[];

    const hasMore = jobs.length > limit;
    if (hasMore) jobs.pop();

    const nextCursor = hasMore
      ? Buffer.from(
          JSON.stringify({
            distanceKm: jobs[jobs.length - 1].distanceKm,
            id: jobs[jobs.length - 1].id,
          }),
        ).toString('base64url')
      : null;

    return { jobs, nextCursor };
  }

  // ─── Feed by recency (no coords) ──────────────────────────────────────────
  private async getFeedByRecency(query: JobFeedQueryDto) {
    const SLUG_RE = /^[a-z0-9-]+$/;
    const citySlug     = SLUG_RE.test(query.city ?? '')     ? query.city!     : undefined;
    const categorySlug = SLUG_RE.test(query.category ?? '') ? query.category! : undefined;
    const limit        = Math.min(Number(query.limit ?? 20), 50);
    const cursor       = query.cursor;

    const jobs = await this.prisma.job.findMany({
      where: {
        status: JobStatus.PUBLISHED,
        workDate: { gte: new Date() },
        ...(citySlug     ? { citySlug }     : {}),
        ...(categorySlug ? { categorySlug } : {}),
        ...(cursor ? { id: { gt: cursor } } : {}),
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
    const nextCursor = hasMore ? jobs[jobs.length - 1].id : null;
    return { jobs, nextCursor };
  }

  // ─── Get by slug ───────────────────────────────────────────────────────────
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

  // ─── My jobs ───────────────────────────────────────────────────────────────
  async findMyJobs(userId: string, query: JobFeedQueryDto) {
    const statusFilter = query.status && ['DRAFT', 'PUBLISHED', 'CLOSED', 'EXPIRED', 'DELETED'].includes(query.status)
      ? { status: query.status }
      : {};
    return this.prisma.job.findMany({
      where: { posterId: userId, ...statusFilter },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { applications: true } },
        skills: { include: { skill: true } },
      },
    });
  }

  // ─── Update ────────────────────────────────────────────────────────────────
  async update(jobId: string, userId: string, dto: UpdateJobDto) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.posterId !== userId) throw new ForbiddenException('You do not own this job');
    if (job.status !== JobStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT jobs can be edited');
    }

    const { skillIds, ...data } = dto;
    const updateData: Record<string, unknown> = { ...data };
    if (dto.workDate) updateData.workDate = new Date(dto.workDate);

    if (skillIds !== undefined) {
      await this.prisma.jobSkill.deleteMany({ where: { jobId } });
      if (skillIds.length > 0) {
        await this.prisma.jobSkill.createMany({
          data: skillIds.map((skillId) => ({ jobId, skillId })),
          skipDuplicates: true,
        });
      }
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data: updateData,
      include: { skills: { include: { skill: true } } },
    });
  }

  // ─── Soft delete ───────────────────────────────────────────────────────────
  async remove(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.posterId !== userId) throw new ForbiddenException('You do not own this job');
    return this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.DELETED },
    });
  }

  // ─── Feature ───────────────────────────────────────────────────────────────
  async featureJob(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.posterId !== userId) throw new ForbiddenException('You do not own this job');
    // MVP: feature is free, no payment gate
    const featuredUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return this.prisma.job.update({
      where: { id: jobId },
      data: { isFeatured: true, featuredUntil },
    });
  }

  // ─── View count (fire-and-forget, debounced per IP per hour) ─────────────
  async incrementViewCount(jobId: string, visitorIp: string): Promise<void> {
    const cacheKey = `view:${jobId}:${visitorIp}`;
    const seen = await this.cache.get(cacheKey);
    if (seen) return;
    await this.cache.set(cacheKey, '1', 3600);
    await this.prisma.job.updateMany({
      where: { id: jobId },
      data: { viewCount: { increment: 1 } },
    });
  }

  // ─── Job usage for free-plan limit ───────────────────────────────────────
  async getJobUsage(userId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await this.prisma.job.count({
      where: {
        posterId: userId,
        status: { not: JobStatus.DELETED },
        createdAt: { gte: startOfMonth },
      },
    });

    return { used: count, limit: 5, remaining: Math.max(0, 5 - count) };
  }
}
