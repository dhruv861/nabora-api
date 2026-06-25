import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ICacheProvider } from '../../providers/cache/cache.interface';
import { CACHE_PROVIDER } from '../../providers/cache/cache.interface';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class SitemapService {
  private readonly logger = new Logger(SitemapService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
  ) {}

  /** Nightly 1am — expire published jobs past their expiresAt */
  @Cron('0 1 * * *')
  async expireJobs(): Promise<void> {
    this.logger.log('[Cron] Running job expiry...');
    const result = await this.prisma.job.updateMany({
      where: { status: 'PUBLISHED', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
    this.logger.log(`[Cron] Expired ${result.count} jobs`);
  }

  /** Nightly 3am — delete notifications older than 90 days */
  @Cron('0 3 * * *')
  async cleanupOldNotifications(): Promise<void> {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    this.logger.log(`[Cron] Deleted ${result.count} old notifications`);
  }

  async getSitemapJobs() {
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

  async getSitemapWorkers() {
    const cacheKey = 'sitemap:workers';
    const cached = await this.cache.get(cacheKey);
    if (cached) return { data: cached };
    const workers = await this.prisma.workerProfile.findMany({
      where: { isPublic: true },
      select: { slug: true, categorySlug: true, updatedAt: true, user: { select: { citySlug: true } } },
      take: 10000,
    });
    const result = workers.map((w) => ({
      slug: w.slug, citySlug: w.user.citySlug, categorySlug: w.categorySlug, updatedAt: w.updatedAt,
    }));
    await this.cache.set(cacheKey, result, 3600);
    return { data: result };
  }

  async getSitemapOrgs() {
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
