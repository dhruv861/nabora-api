import { Controller, Get, Patch, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
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
}
