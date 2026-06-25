import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrgRole } from '../../common/types/enums';
import { EventsService } from './events.service';
import {
  CreateEventDto, UpdateEventDto, UpdateEventStatusDto,
  AddRolesDto, UpdateRoleDto, ListEventsQueryDto, BulkHireDto,
} from './dto/events.dto';

@ApiTags('events')
@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /** POST /v1/organizations/:orgId/events */
  @Post('organizations/:orgId/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(OrgRole.OWNER, OrgRole.OPERATIONS_MANAGER, OrgRole.EVENT_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event (DRAFT)' })
  create(
    @Param('orgId') orgId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.create(orgId, req.user.id, dto);
  }

  /** GET /v1/organizations/:orgId/events */
  @Get('organizations/:orgId/events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List org events (org member only)' })
  listOrgEvents(
    @Param('orgId') orgId: string,
    @Request() req: { user: { id: string } },
    @Query() query: ListEventsQueryDto,
  ) {
    return this.eventsService.listOrgEvents(orgId, req.user.id, query);
  }

  /** GET /v1/events/:id — public */
  @Get('events/:id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get public event detail' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  /** PATCH /v1/events/:id */
  @Patch('events/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update event info (org member)' })
  update(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, req.user.id, dto);
  }

  /** PATCH /v1/events/:id/status */
  @Patch('events/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update event status (ONGOING|COMPLETED|CANCELLED)' })
  updateStatus(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateEventStatusDto,
  ) {
    return this.eventsService.updateStatus(id, req.user.id, dto);
  }

  /** POST /v1/events/:id/roles */
  @Post('events/:id/roles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add roles to a DRAFT event' })
  addRoles(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: AddRolesDto,
  ) {
    return this.eventsService.addRoles(id, req.user.id, dto);
  }

  /** PATCH /v1/events/:id/roles/:roleId */
  @Patch('events/:id/roles/:roleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a role (DRAFT only)' })
  updateRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateRoleDto,
  ) {
    return this.eventsService.updateRole(id, roleId, req.user.id, dto);
  }

  /** DELETE /v1/events/:id/roles/:roleId */
  @Delete('events/:id/roles/:roleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a role (DRAFT only)' })
  deleteRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.eventsService.deleteRole(id, roleId, req.user.id);
  }

  /** POST /v1/events/:id/publish */
  @Post('events/:id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish event — creates a Job per role' })
  publish(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.eventsService.publish(id, req.user.id);
  }

  /** GET /v1/events/:id/applicants */
  @Get('events/:id/applicants')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all applicants grouped by role (org member)' })
  listApplicants(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Query('status') status?: string,
  ) {
    return this.eventsService.listApplicants(id, req.user.id, status);
  }

  /** POST /v1/events/:id/bulk-hire */
  @Post('events/:id/bulk-hire')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk hire applicants across roles (sequential, partial success)' })
  bulkHire(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: BulkHireDto,
  ) {
    return this.eventsService.bulkHire(id, req.user.id, dto);
  }
}
