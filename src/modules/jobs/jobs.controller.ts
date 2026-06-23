import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, Ip, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto, UpdateJobDto } from './dto/create-job.dto';
import { JobFeedQueryDto } from './dto/job-feed-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // ── IMPORTANT: static routes BEFORE parameterised :id routes ─────────────

  // GET /v1/jobs/my — must be registered before :id, :citySlug, etc.
  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get jobs posted by the authenticated user' })
  async getMyJobs(
    @Request() req: { user: { id: string } },
    @Query() query: JobFeedQueryDto,
  ) {
    return this.jobsService.findMyJobs(req.user.id, query);
  }

  // GET /v1/jobs — feed with PostGIS radius + cursor pagination
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Job feed — PostGIS radius + cursor pagination' })
  async getFeed(@Query() query: JobFeedQueryDto) {
    return this.jobsService.getFeed(query);
  }

  // POST /v1/jobs — create job (DRAFT)
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a job posting (status: DRAFT)' })
  async create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateJobDto,
  ) {
    return this.jobsService.create(req.user.id, dto);
  }

  // GET /v1/users/me/job-usage — free plan usage
  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get free-plan job posting usage for current month' })
  async getUsage(@Request() req: { user: { id: string } }) {
    return this.jobsService.getJobUsage(req.user.id);
  }

  // GET /v1/jobs/:citySlug/:categorySlug/:slug — public job detail (SEO)
  @Get(':citySlug/:categorySlug/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Public job detail page (SEO)' })
  @ApiParam({ name: 'citySlug', example: 'ahmedabad' })
  @ApiParam({ name: 'categorySlug', example: 'promoter' })
  @ApiParam({ name: 'slug', example: 'brand-activation-promoter-cm123abc' })
  async getBySlug(
    @Param('citySlug') citySlug: string,
    @Param('categorySlug') categorySlug: string,
    @Param('slug') slug: string,
    @Ip() ip: string,
  ) {
    const job = await this.jobsService.findBySlug(citySlug, categorySlug, slug);
    // Fire-and-forget view count (never blocks response)
    this.jobsService.incrementViewCount(job.id, ip).catch(() => {});
    return job;
  }

  // POST /v1/jobs/:id/publish
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a draft job (runs quality gate)' })
  async publish(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.jobsService.publish(id, req.user.id);
  }

  // POST /v1/jobs/:id/feature
  @Post(':id/feature')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a job as featured' })
  async feature(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.jobsService.featureJob(id, req.user.id);
  }

  // PATCH /v1/jobs/:id
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a draft job' })
  async update(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(id, req.user.id, dto);
  }

  // DELETE /v1/jobs/:id
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a job (status = DELETED)' })
  async remove(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.jobsService.remove(id, req.user.id);
  }
}
