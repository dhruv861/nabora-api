import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto, UpdateLocationDto, CreateWorkerProfileDto, UpdateWorkerProfileDto } from './dto/users.dto';

function generateWorkerSlug(name: string | null | undefined, id: string): string {
  const sanitised = (name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')   // remove special chars (keeps spaces)
    .trim()
    .replace(/\s+/g, '-')           // spaces → hyphens
    .replace(/^-+|-+$/g, '')        // strip leading/trailing hyphens
    .substring(0, 40);

  // Fall back to 'worker' if sanitisation yields an empty string
  const base = sanitised.length > 0 ? sanitised : 'worker';
  const shortId = id.substring(0, 6);
  return `${base}-wp${shortId}`;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: {
        workerProfile: {
          include: {
            skills: { include: { skill: true } },
            portfolioItems: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  async updateLocation(userId: string, dto: UpdateLocationDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        locationLat: dto.lat,
        locationLng: dto.lng,
        city: dto.city,
        citySlug: dto.citySlug,
        area: dto.area,
        locationUpdatedAt: new Date(),
      },
    });
  }

  async createWorkerProfile(userId: string, dto: CreateWorkerProfileDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const existing = await this.prisma.workerProfile.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Worker profile already exists');

    const slug = generateWorkerSlug(user.name ?? 'worker', userId);

    return this.prisma.workerProfile.create({
      data: { userId, slug, ...dto },
    });
  }

  async updateWorkerProfile(userId: string, dto: UpdateWorkerProfileDto) {
    const profile = await this.prisma.workerProfile.findUniqueOrThrow({ where: { userId } });
    return this.prisma.workerProfile.update({
      where: { id: profile.id },
      data: dto,
    });
  }

  // ─── Saved Jobs (Sprint 2.2) ─────────────────────────────────────────────

  async saveJob(userId: string, jobId: string) {
    // Ignore if already saved (upsert / ignore pattern)
    await this.prisma.savedJob.upsert({
      where: { userId_jobId: { userId, jobId } },
      create: { userId, jobId },
      update: {},  // no-op if already exists
    });
    return { saved: true };
  }

  async unsaveJob(userId: string, jobId: string) {
    await this.prisma.savedJob.deleteMany({ where: { userId, jobId } });
    return { saved: false };
  }

  async getSavedJobs(userId: string, cursor?: string, limit = 20) {
    const take = Math.min(limit, 50);
    const saved = await this.prisma.savedJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        job: {
          include: {
            organization: { select: { name: true, logoUrl: true, isVerified: true } },
            skills: { include: { skill: { select: { name: true, slug: true } } } },
          },
        },
      },
    });

    const hasMore = saved.length > take;
    if (hasMore) saved.pop();
    const nextCursor = hasMore ? saved[saved.length - 1].id : null;

    return {
      jobs: saved.map((s) => s.job),
      nextCursor,
    };
  }
}

