import { Controller, Get, Patch, Post, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import {
  UpdateUserDto,
  UpdateLocationDto,
  CreateWorkerProfileDto,
  UpdateWorkerProfileDto,
} from './dto/users.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get public user profile' })
  findOne(@Param('id') id: string) {
    return this.usersService.findPublicProfile(id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own profile (name, bio, email, availability)' })
  updateMe(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateMe(req.user.id, dto);
  }

  @Patch('me/location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own location (triggers PostGIS column update)' })
  updateLocation(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateLocationDto,
  ) {
    return this.usersService.updateLocation(req.user.id, dto);
  }

  @Post('me/worker-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create worker profile (generates slug)' })
  createWorkerProfile(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateWorkerProfileDto,
  ) {
    return this.usersService.createWorkerProfile(req.user.id, dto);
  }

  @Patch('me/worker-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own worker profile' })
  updateWorkerProfile(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateWorkerProfileDto,
  ) {
    return this.usersService.updateWorkerProfile(req.user.id, dto);
  }

  // ─── Saved Jobs (Sprint 2.2) ───────────────────────────────────────────────

  @Post('me/saved-jobs/:jobId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save a job' })
  saveJob(
    @Request() req: { user: { id: string } },
    @Param('jobId') jobId: string,
  ) {
    return this.usersService.saveJob(req.user.id, jobId);
  }

  @Delete('me/saved-jobs/:jobId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsave a job' })
  unsaveJob(
    @Request() req: { user: { id: string } },
    @Param('jobId') jobId: string,
  ) {
    return this.usersService.unsaveJob(req.user.id, jobId);
  }

  @Get('me/saved-jobs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated saved jobs with full job data' })
  getSavedJobs(
    @Request() req: { user: { id: string } },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getSavedJobs(req.user.id, cursor, Number(limit ?? 20));
  }
}
