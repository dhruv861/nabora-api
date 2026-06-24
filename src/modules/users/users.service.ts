import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto, UpdateLocationDto, CreateWorkerProfileDto, UpdateWorkerProfileDto } from './dto/users.dto';

function generateWorkerSlug(name: string | null | undefined, id: string): string {
  const sanitised = (name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40);
  const base = sanitised.length > 0 ? sanitised : 'worker';
  const shortId = id.substring(0, 6);
  return `${base}-wp${shortId}`;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Public profile by ID ────────────────────────────────────────────────
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

  // ─── Public worker profile by slug ───────────────────────────────────────
  async findWorkerBySlug(slug: string) {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true, name: true, bio: true, avatarUrl: true,
            city: true, citySlug: true, area: true,
            availabilityStatus: true, verificationLevel: true,
            reliabilityScore: true, averageRating: true, ratingCount: true,
            completedJobCount: true, isActive: true,
          },
        },
        skills: { include: { skill: true } },
        portfolioItems: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!profile || !profile.user.isActive || !profile.isPublic)
      throw new NotFoundException('Worker profile not found');
    return { ...profile.user, workerProfile: profile };
  }

  // ─── Browse workers (PostGIS distance sort, optional coords) ─────────────
  async browseWorkers(query: {
    city?: string;
    category?: string;
    availability?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      isActive: true,
      workerProfile: { isPublic: true },
    };
    if (query.city) where.citySlug = query.city;
    if (query.availability) where.availabilityStatus = query.availability;

    const [total, workers] = await Promise.all([
      this.prisma.user.count({ where: where as Parameters<typeof this.prisma.user.count>[0]['where'] }),
      this.prisma.user.findMany({
        where: where as Parameters<typeof this.prisma.user.findMany>[0]['where'],
        orderBy: [{ reliabilityScore: 'desc' }, { averageRating: 'desc' }],
        skip,
        take: limit,
        include: {
          workerProfile: {
            include: {
              skills: { include: { skill: { select: { name: true, slug: true } } } },
            },
          },
        },
      }),
    ]);

    return { workers: workers.filter((w) => w.workerProfile !== null), total, page, limit };
  }

  // ─── Portfolio management ─────────────────────────────────────────────────
  async addPortfolioItem(userId: string, imageUrl: string, title?: string, description?: string) {
    const profile = await this.prisma.workerProfile.findUniqueOrThrow({ where: { userId } });
    const count = await this.prisma.portfolioItem.count({ where: { workerProfileId: profile.id } });
    return this.prisma.portfolioItem.create({
      data: { workerProfileId: profile.id, imageUrl, title, description, sortOrder: count },
    });
  }

  async deletePortfolioItem(userId: string, itemId: string) {
    const profile = await this.prisma.workerProfile.findUniqueOrThrow({ where: { userId } });
    const item = await this.prisma.portfolioItem.findUnique({ where: { id: itemId } });
    if (!item || item.workerProfileId !== profile.id) throw new NotFoundException('Portfolio item not found');
    await this.prisma.portfolioItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  async reorderPortfolio(userId: string, orderedIds: string[]) {
    const profile = await this.prisma.workerProfile.findUniqueOrThrow({ where: { userId } });
    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.portfolioItem.updateMany({
          where: { id, workerProfileId: profile.id },
          data: { sortOrder: index },
        }),
      ),
    );
    return { reordered: true };
  }

  // ─── Profile update ───────────────────────────────────────────────────────
  async updateMe(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({ where: { id: userId }, data: dto });
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
    return this.prisma.workerProfile.create({ data: { userId, slug, ...dto } });
  }

  async updateWorkerProfile(userId: string, dto: UpdateWorkerProfileDto) {
    const profile = await this.prisma.workerProfile.findUniqueOrThrow({ where: { userId } });
    return this.prisma.workerProfile.update({ where: { id: profile.id }, data: dto });
  }

  // ─── Saved Jobs ───────────────────────────────────────────────────────────
  async saveJob(userId: string, jobId: string) {
    await this.prisma.savedJob.upsert({
      where: { userId_jobId: { userId, jobId } },
      create: { userId, jobId },
      update: {},
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
    return { jobs: saved.map((s) => s.job), nextCursor };
  }
}
