import {
  Controller, Get, Patch, Post, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { UsersService } from './users.service';
import {
  UpdateUserDto,
  UpdateLocationDto,
  CreateWorkerProfileDto,
  UpdateWorkerProfileDto,
} from './dto/users.dto';

class AddPortfolioItemDto {
  @ApiProperty() @IsString() @IsUrl() imageUrl: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

class ReorderPortfolioDto {
  @ApiProperty({ type: [String] }) orderedIds: string[];
}

@ApiTags('users')
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Public worker browse ─────────────────────────────────────────────────
  @Get('workers')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Browse public worker profiles (PostGIS distance sort)' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'availability', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiQuery({ name: 'radius', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  browseWorkers(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('availability') availability?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.browseWorkers({
      city, category, availability,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      radius: radius ? Number(radius) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ─── Worker profile by slug (SEO page fetch) ──────────────────────────────
  @Get('workers/by-slug/:slug')
  @ApiOperation({ summary: 'Get public worker profile by slug (used by SEO pages)' })
  findWorkerBySlug(@Param('slug') slug: string) {
    return this.usersService.findWorkerBySlug(slug);
  }

  // ─── Public user profile by ID ────────────────────────────────────────────
  @Get('users/:id')
  @ApiOperation({ summary: 'Get public user profile by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findPublicProfile(id);
  }

  // ─── My profile mutations ─────────────────────────────────────────────────
  @Patch('users/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own profile' })
  updateMe(@Request() req: { user: { id: string } }, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(req.user.id, dto);
  }

  @Patch('users/me/location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own location' })
  updateLocation(@Request() req: { user: { id: string } }, @Body() dto: UpdateLocationDto) {
    return this.usersService.updateLocation(req.user.id, dto);
  }

  @Post('users/me/worker-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create worker profile' })
  createWorkerProfile(@Request() req: { user: { id: string } }, @Body() dto: CreateWorkerProfileDto) {
    return this.usersService.createWorkerProfile(req.user.id, dto);
  }

  @Patch('users/me/worker-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own worker profile' })
  updateWorkerProfile(@Request() req: { user: { id: string } }, @Body() dto: UpdateWorkerProfileDto) {
    return this.usersService.updateWorkerProfile(req.user.id, dto);
  }

  // ─── Portfolio management ─────────────────────────────────────────────────
  @Post('users/me/portfolio')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a portfolio item' })
  addPortfolioItem(@Request() req: { user: { id: string } }, @Body() dto: AddPortfolioItemDto) {
    return this.usersService.addPortfolioItem(req.user.id, dto.imageUrl, dto.title, dto.description);
  }

  @Delete('users/me/portfolio/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a portfolio item' })
  deletePortfolioItem(@Request() req: { user: { id: string } }, @Param('itemId') itemId: string) {
    return this.usersService.deletePortfolioItem(req.user.id, itemId);
  }

  @Patch('users/me/portfolio/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder portfolio items' })
  reorderPortfolio(@Request() req: { user: { id: string } }, @Body() dto: ReorderPortfolioDto) {
    return this.usersService.reorderPortfolio(req.user.id, dto.orderedIds);
  }

  // ─── Saved Jobs ───────────────────────────────────────────────────────────
  @Post('users/me/saved-jobs/:jobId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save a job' })
  saveJob(@Request() req: { user: { id: string } }, @Param('jobId') jobId: string) {
    return this.usersService.saveJob(req.user.id, jobId);
  }

  @Delete('users/me/saved-jobs/:jobId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsave a job' })
  unsaveJob(@Request() req: { user: { id: string } }, @Param('jobId') jobId: string) {
    return this.usersService.unsaveJob(req.user.id, jobId);
  }

  @Get('users/me/saved-jobs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated saved jobs' })
  getSavedJobs(
    @Request() req: { user: { id: string } },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getSavedJobs(req.user.id, cursor, Number(limit ?? 20));
  }
}
