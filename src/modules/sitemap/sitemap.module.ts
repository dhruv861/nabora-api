import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SitemapController } from './sitemap.controller';
import { SitemapService } from './sitemap.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [SitemapController],
  providers: [SitemapService],
  exports: [SitemapService],
})
export class SitemapModule {}
