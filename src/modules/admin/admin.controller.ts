import {
  Controller, Get, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Admin — list all users' })
  listUsers(
    @Query('search') search?: string,
    @Query('accountType') accountType?: string,
    @Query('verificationLevel') verificationLevel?: string,
    @Query('citySlug') citySlug?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listUsers({ search, accountType, verificationLevel, citySlug, page: Number(page ?? 1), limit: Number(limit ?? 20) });
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Admin — update user (verify, deactivate, make admin)' })
  updateUser(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateUser(id, dto);
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Admin — list all organizations' })
  listOrganizations(
    @Query('search') search?: string,
    @Query('isVerified') isVerified?: string,
    @Query('citySlug') citySlug?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listOrganizations({
      search, citySlug,
      isVerified: isVerified !== undefined ? isVerified === 'true' : undefined,
      page: Number(page ?? 1), limit: Number(limit ?? 20),
    });
  }

  @Patch('organizations/:id')
  @ApiOperation({ summary: 'Admin — verify org / deactivate' })
  updateOrg(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateOrganization(id, dto);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Admin — list all jobs' })
  listJobs(
    @Query('status') status?: string,
    @Query('citySlug') citySlug?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listJobs({ status, citySlug, categorySlug, page: Number(page ?? 1), limit: Number(limit ?? 20) });
  }

  @Patch('jobs/:id')
  @ApiOperation({ summary: 'Admin — update job status (remove violating content)' })
  updateJob(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateJob(id, dto);
  }

  @Get('disputes')
  @ApiOperation({ summary: 'Admin — list all disputes' })
  listDisputes(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listDisputes({ status, type, page: Number(page ?? 1), limit: Number(limit ?? 20) });
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Admin — list all invoices' })
  listInvoices(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listInvoices({ status, page: Number(page ?? 1), limit: Number(limit ?? 20) });
  }

  @Get('reports/summary')
  @ApiOperation({ summary: 'Admin — platform summary report' })
  getSummary() {
    return this.adminService.getSummaryReport();
  }
}
