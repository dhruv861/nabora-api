import {
  Controller, Post, Get, Patch, Body, Param, UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto, AddEvidenceDto, ResolveDisputeDto } from './dto/disputes.dto';

@ApiTags('disputes')
@Controller()
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post('hires/:id/disputes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Raise a dispute on a hire (worker or employer)' })
  create(
    @Param('id') hireId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: CreateDisputeDto,
  ) {
    return this.disputesService.create(hireId, req.user.id, dto);
  }

  @Get('hires/:id/dispute')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the dispute for a hire (party only) — null if none" })
  findByHire(
    @Param('id') hireId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.disputesService.findByHire(hireId, req.user.id);
  }

  @Get('disputes/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dispute detail (parties or admin)' })
  findOne(
    @Param('id') disputeId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.disputesService.findOne(disputeId, req.user.id);
  }

  @Post('disputes/:id/evidence')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add evidence to a dispute (party only)' })
  addEvidence(
    @Param('id') disputeId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: AddEvidenceDto,
  ) {
    return this.disputesService.addEvidence(disputeId, req.user.id, dto);
  }

  @Patch('disputes/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve or reject a dispute (admin only)' })
  resolve(
    @Param('id') disputeId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputesService.resolve(disputeId, req.user.id, dto);
  }
}
