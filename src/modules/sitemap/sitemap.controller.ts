import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SitemapService } from './sitemap.service';

@ApiTags('sitemap')
@Controller('sitemap')
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get('jobs') @ApiOperation({ summary: 'Sitemap — published jobs' })
  sitemapJobs() { return this.sitemapService.getSitemapJobs(); }

  @Get('workers') @ApiOperation({ summary: 'Sitemap — public worker profiles' })
  sitemapWorkers() { return this.sitemapService.getSitemapWorkers(); }

  @Get('organizations') @ApiOperation({ summary: 'Sitemap — active organizations' })
  sitemapOrganizations() { return this.sitemapService.getSitemapOrgs(); }
}
