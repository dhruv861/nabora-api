import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrgRole } from '../../common/types/enums';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from './dto/organizations.dto';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  /** POST /v1/organizations */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an organization (caller becomes OWNER)' })
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.orgsService.create(req.user.id, dto);
  }

  /** GET /v1/users/me/organizations — listed here for discoverability */
  // (actual route registered in UsersController to match /users/me/* pattern)

  /** GET /v1/organizations/:id */
  @Get(':id')
  @ApiOperation({ summary: 'Get public organization profile' })
  findOne(@Param('id') id: string) {
    return this.orgsService.findOne(id);
  }

  /** PATCH /v1/organizations/:id */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(OrgRole.OWNER, OrgRole.OPERATIONS_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update org info (OWNER or OPERATIONS_MANAGER)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgsService.update(id, dto);
  }

  /** GET /v1/organizations/:id/members */
  @Get(':id/members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    OrgRole.OWNER,
    OrgRole.OPERATIONS_MANAGER,
    OrgRole.EVENT_MANAGER,
    OrgRole.FIELD_COORDINATOR,
    OrgRole.FINANCE_MANAGER,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List org members (any org member)' })
  listMembers(@Param('id') id: string) {
    return this.orgsService.listMembers(id);
  }

  /** POST /v1/organizations/:id/members/invite */
  @Post(':id/members/invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(OrgRole.OWNER, OrgRole.OPERATIONS_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite a user by phone to the org' })
  inviteMember(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: InviteMemberDto,
  ) {
    return this.orgsService.inviteMember(id, req.user.id, dto);
  }

  /** PATCH /v1/organizations/:id/members/:userId */
  @Patch(':id/members/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(OrgRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change a member role (OWNER only)' })
  updateMemberRole(
    @Param('id') orgId: string,
    @Param('userId') targetUserId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.orgsService.updateMemberRole(orgId, targetUserId, req.user.id, dto);
  }

  /** DELETE /v1/organizations/:id/members/:userId */
  @Delete(':id/members/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(OrgRole.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member (OWNER only)' })
  removeMember(
    @Param('id') orgId: string,
    @Param('userId') targetUserId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.orgsService.removeMember(orgId, targetUserId, req.user.id);
  }
}
