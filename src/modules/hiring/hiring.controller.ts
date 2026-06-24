import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HiringService } from './hiring.service';
import { HireApplicationDto, ListHiresQueryDto } from './dto/hiring.dto';

@ApiTags('hiring')
@Controller()
export class HiringController {
  constructor(private readonly hiringService: HiringService) {}

  // IMPORTANT: static route 'hires/my' must come before 'hires/:id'

  // GET /v1/hires/my
  @Get('hires/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get hires for current user (role: WORKER|EMPLOYER)' })
  myHires(
    @Request() req: { user: { id: string } },
    @Query() query: ListHiresQueryDto,
  ) {
    return this.hiringService.myHires(req.user.id, query);
  }

  // GET /v1/hires/:id
  @Get('hires/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get hire detail (worker or employer of that hire only)' })
  findOne(
    @Param('id') hireId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.hiringService.findOne(hireId, req.user.id);
  }

  // POST /v1/applications/:applicationId/hire
  @Post('applications/:applicationId/hire')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hire an applicant (poster only)' })
  hire(
    @Param('applicationId') applicationId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: HireApplicationDto,
  ) {
    return this.hiringService.hire(applicationId, req.user.id, dto);
  }

  // POST /v1/hires/:id/complete
  @Post('hires/:id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a hire as completed (employer only)' })
  complete(
    @Param('id') hireId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.hiringService.complete(hireId, req.user.id);
  }
}
