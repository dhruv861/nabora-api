import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SavedWorkersService {
  constructor(private readonly prisma: PrismaService) {}

  async save(saverId: string, workerId: string) {
    if (saverId === workerId) throw new ConflictException('You cannot save yourself');
    await this.prisma.savedWorker.upsert({
      where: { saverId_workerId: { saverId, workerId } },
      create: { saverId, workerId },
      update: {},
    });
    return { saved: true };
  }

  async unsave(saverId: string, workerId: string) {
    await this.prisma.savedWorker.deleteMany({ where: { saverId, workerId } });
    return { saved: false };
  }

  async list(saverId: string, page = 1, limit = 20) {
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const [total, saved] = await Promise.all([
      this.prisma.savedWorker.count({ where: { saverId } }),
      this.prisma.savedWorker.findMany({
        where: { saverId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          worker: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              averageRating: true,
              ratingCount: true,
              reliabilityScore: true,
              verificationLevel: true,
              availabilityStatus: true,
              citySlug: true,
              area: true,
              workerProfile: {
                select: {
                  slug: true,
                  headline: true,
                  categorySlug: true,
                  skills: { include: { skill: { select: { name: true, slug: true } } } },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: saved.map((s) => s.worker),
      meta: { total, page, limit: take, pages: Math.ceil(total / take) },
    };
  }
}
