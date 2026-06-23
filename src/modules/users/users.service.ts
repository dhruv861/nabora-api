import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto, UpdateLocationDto, CreateWorkerProfileDto, UpdateWorkerProfileDto } from './dto/users.dto';

function generateWorkerSlug(name: string, id: string): string {
  const base = (name ?? 'worker')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 40);
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
}
