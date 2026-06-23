import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ICacheProvider } from '../../providers/cache/cache.interface';
import { CACHE_PROVIDER } from '../../providers/cache/cache.interface';
import { AddUserSkillsDto } from './dto/skills.dto';

const SKILLS_CACHE_KEY = 'skills:all';
const SKILLS_CACHE_TTL = 3600; // 1 hour

@Injectable()
export class SkillsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
  ) {}

  async findAll(category?: string) {
    if (!category) {
      // Check cache first
      const cached = await this.cache.get(SKILLS_CACHE_KEY);
      if (cached) return JSON.parse(cached) as unknown[];
    }

    const skills = await this.prisma.skill.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    if (!category) {
      // Only cache the unfiltered list
      await this.cache.set(SKILLS_CACHE_KEY, JSON.stringify(skills), SKILLS_CACHE_TTL);
    }

    return skills;
  }

  async addUserSkills(userId: string, dto: AddUserSkillsDto) {
    const profile = await this.prisma.workerProfile.findUniqueOrThrow({
      where: { userId },
    });

    const upserts = dto.skills.map((s) =>
      this.prisma.userSkill.upsert({
        where: {
          workerProfileId_skillId: { workerProfileId: profile.id, skillId: s.skillId },
        },
        update: { yearsExp: s.yearsExp },
        create: {
          workerProfileId: profile.id,
          skillId: s.skillId,
          yearsExp: s.yearsExp,
        },
      }),
    );

    await Promise.all(upserts);
    return { message: `${dto.skills.length} skill(s) added/updated` };
  }

  async removeUserSkill(userId: string, skillId: string) {
    const profile = await this.prisma.workerProfile.findUniqueOrThrow({
      where: { userId },
    });

    await this.prisma.userSkill.deleteMany({
      where: { workerProfileId: profile.id, skillId },
    });

    return { message: 'Skill removed' };
  }
}
