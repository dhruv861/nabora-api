import {
  Controller, Post, Get, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RatingsService } from './ratings.service';
import { CreateRatingDto, ListRatingsQueryDto } from './dto/ratings.dto';

@ApiTags('ratings')
@Controller()
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post('hires/:id/ratings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a rating for a completed hire' })
  createRating(
    @Param('id') hireId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingsService.createRating(hireId, req.user.id, dto);
  }

  @Get('users/:id/ratings')
  @ApiOperation({ summary: 'Get public ratings for a user' })
  listUserRatings(
    @Param('id') userId: string,
    @Query() query: ListRatingsQueryDto,
  ) {
    return this.ratingsService.listUserRatings(userId, query);
  }

  @Get('hires/:id/rating')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the caller's own rating for a hire (null if not yet rated)" })
  getMyRating(
    @Param('id') hireId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.ratingsService.getMyRatingForHire(hireId, req.user.id);
  }
}
