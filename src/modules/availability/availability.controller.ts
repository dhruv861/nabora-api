import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { AvailabilityService } from './availability.service';
import { UpsertAvailabilityDto, GetAvailabilityQueryDto } from './dto/availability.dto';

@ApiTags('availability')
@Controller()
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /** POST /v1/users/me/availability */
  @Post('users/me/availability')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set availability for a specific date (upsert)' })
  upsert(
    @Request() req: { user: { id: string } },
    @Body() dto: UpsertAvailabilityDto,
  ) {
    return this.availabilityService.upsert(req.user.id, dto);
  }

  /** GET /v1/users/me/availability */
  @Get('users/me/availability')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my availability slots for a date range' })
  getMine(
    @Request() req: { user: { id: string } },
    @Query() query: GetAvailabilityQueryDto,
  ) {
    return this.availabilityService.getMine(req.user.id, query);
  }

  /** DELETE /v1/users/me/availability/:date */
  @Delete('users/me/availability/:date')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset availability for a date (removes slot → defaults to available)' })
  deleteSlot(
    @Request() req: { user: { id: string } },
    @Param('date') date: string,
  ) {
    return this.availabilityService.deleteSlot(req.user.id, date);
  }

  /** GET /v1/users/:id/availability — public */
  @Get('users/:id/availability')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get a worker public availability for a date range' })
  getPublic(
    @Param('id') userId: string,
    @Query() query: GetAvailabilityQueryDto,
  ) {
    return this.availabilityService.getPublic(userId, query);
  }
}
