import { Get, Controller } from '@nestjs/common';
import { AdminService } from '../admin/admin.service';
import { OrganizationsService } from './organizations.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  Controller as C, Get as G, Post, Patch, Delete, Body, Param, UseGuards, Request,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags as AT, ApiBearerAuth, ApiOperation as AO } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrgRole } from '../../common/types/enums';
import {
  CreateOrganizationDto, UpdateOrganizationDto, InviteMemberDto, UpdateMemberRoleDto,
} from './dto/organizations.dto';

@AT('organizations')
@C('organizations')
export class OrganizationsController {
  constructor(
    private readonly orgsService: OrganizationsService,
  ) {}

  @Post() @UseGuards(JwtAuthGuard) @ApiBearerAuth() @AO({ summary: 'Create org' })
  create(@Request() req: { user: { id: string } }, @Body() dto: CreateOrganizationDto) {
    return this.orgsService.create(req.user.id, dto);
  }

  /** GET /v1/organizations/by-slug/:slug — public, used by SEO org profile page */
  @G('by-slug/:slug') @AO({ summary: 'Get org by slug (public SEO page)' })
  findBySlug(@Param('slug') slug: string) {
    return this.orgsService.findBySlug(slug);
  }

  @G(':id') @AO({ summary: 'Get org by ID' })
  findOne(@Param('id') id: string) { return this.orgsService.findOne(id); }

  @Patch(':id') @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(OrgRole.OWNER, OrgRole.OPERATIONS_MANAGER) @ApiBearerAuth() @AO({ summary: 'Update org' })
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) { return this.orgsService.update(id, dto); }

  @G(':id/members') @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(OrgRole.OWNER, OrgRole.OPERATIONS_MANAGER, OrgRole.EVENT_MANAGER, OrgRole.FIELD_COORDINATOR, OrgRole.FINANCE_MANAGER)
  @ApiBearerAuth() @AO({ summary: 'List org members' })
  listMembers(@Param('id') id: string) { return this.orgsService.listMembers(id); }

  @Post(':id/members/invite') @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(OrgRole.OWNER, OrgRole.OPERATIONS_MANAGER) @ApiBearerAuth() @AO({ summary: 'Invite member' })
  inviteMember(@Param('id') id: string, @Request() req: { user: { id: string } }, @Body() dto: InviteMemberDto) {
    return this.orgsService.inviteMember(id, req.user.id, dto);
  }

  @Patch(':id/members/:userId') @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(OrgRole.OWNER) @ApiBearerAuth() @AO({ summary: 'Change member role' })
  updateMemberRole(
    @Param('id') orgId: string, @Param('userId') targetUserId: string,
    @Request() req: { user: { id: string } }, @Body() dto: UpdateMemberRoleDto,
  ) { return this.orgsService.updateMemberRole(orgId, targetUserId, req.user.id, dto); }

  @Delete(':id/members/:userId') @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(OrgRole.OWNER) @ApiBearerAuth() @HttpCode(HttpStatus.OK) @AO({ summary: 'Remove member' })
  removeMember(
    @Param('id') orgId: string, @Param('userId') targetUserId: string,
    @Request() req: { user: { id: string } },
  ) { return this.orgsService.removeMember(orgId, targetUserId, req.user.id); }
}
