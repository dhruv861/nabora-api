import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
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
import { ApplicationsService } from './applications.service';
import { ApplyJobDto, UpdateApplicationStatusDto, ListApplicationsQueryDto } from './dto/applications.dto';

@ApiTags('applications')
@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  // POST /v1/jobs/:id/apply
  @Post('jobs/:id/apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to a published job' })
  apply(
    @Param('id') jobId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: ApplyJobDto,
  ) {
    return this.applicationsService.apply(jobId, req.user.id, dto);
  }

  // GET /v1/jobs/:id/applications — poster only
  @Get('jobs/:id/applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List applications for a job (poster only)' })
  listJobApplications(
    @Param('id') jobId: string,
    @Request() req: { user: { id: string } },
    @Query() query: ListApplicationsQueryDto,
  ) {
    return this.applicationsService.listJobApplications(jobId, req.user.id, query);
  }

  // PATCH /v1/jobs/:id/applications/:applicationId
  @Patch('jobs/:id/applications/:applicationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Shortlist or reject an application (poster only)' })
  updateStatus(
    @Param('id') jobId: string,
    @Param('applicationId') applicationId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(jobId, applicationId, req.user.id, dto);
  }

  // GET /v1/users/me/applications
  @Get('users/me/applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the caller's own application history" })
  myApplications(
    @Request() req: { user: { id: string } },
    @Query() query: ListApplicationsQueryDto,
  ) {
    return this.applicationsService.myApplications(req.user.id, query);
  }

  // DELETE /v1/jobs/:id/applications/:applicationId (withdraw)
  @Delete('jobs/:id/applications/:applicationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw a PENDING application' })
  withdraw(
    @Param('id') jobId: string,
    @Param('applicationId') applicationId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.applicationsService.withdraw(jobId, applicationId, req.user.id);
  }
}
