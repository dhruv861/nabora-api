import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import type { ICacheProvider } from '../../providers/cache/cache.interface';
import { CACHE_PROVIDER } from '../../providers/cache/cache.interface';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('sitemap')
@Controller('sitemap')
export class SitemapController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
  ) {}

  @Get('jobs')
  @ApiOperation({ summary: 'Sitemap data — all published jobs (slug, citySlug, categorySlug, updatedAt)' })
  async sitemapJobs() {
    const cacheKey = 'sitemap:jobs';
    const cached = await this.cache.get(cacheKey);
    if (cached) return { data: cached };

    const jobs = await this.prisma.job.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, citySlug: true, categorySlug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 10000,
    });

    await this.cache.set(cacheKey, jobs, 3600);
    return { data: jobs };
  }

  @Get('workers')
  @ApiOperation({ summary: 'Sitemap data — all public worker profiles' })
  async sitemapWorkers() {
    const cacheKey = 'sitemap:workers';
    const cached = await this.cache.get(cacheKey);
    if (cached) return { data: cached };

    const workers = await this.prisma.workerProfile.findMany({
      where: { isPublic: true },
      select: {
        slug: true,
        categorySlug: true,
        updatedAt: true,
        user: { select: { citySlug: true } },
      },
      take: 10000,
    });

    const result = workers.map((w) => ({
      slug: w.slug,
      citySlug: w.user.citySlug,
      categorySlug: w.categorySlug,
      updatedAt: w.updatedAt,
    }));

    await this.cache.set(cacheKey, result, 3600);
    return { data: result };
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Sitemap data — all active organizations' })
  async sitemapOrganizations() {
    const cacheKey = 'sitemap:orgs';
    const cached = await this.cache.get(cacheKey);
    if (cached) return { data: cached };

    const orgs = await this.prisma.organization.findMany({
      where: { isActive: true },
      select: { slug: true, citySlug: true, updatedAt: true },
      take: 10000,
    });

    await this.cache.set(cacheKey, orgs, 3600);
    return { data: orgs };
  }
}
