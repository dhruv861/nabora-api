import {
  Injectable, NotFoundException, ConflictException,
  ForbiddenException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HiringService } from '../hiring/hiring.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateEventDto, UpdateEventDto, UpdateEventStatusDto,
  AddRolesDto, UpdateRoleDto, ListEventsQueryDto, BulkHireDto,
} from './dto/events.dto';

function generateEventSlug(roleTitle: string, eventTitle: string, id: string): string {
  const base = `${roleTitle}-${eventTitle}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 60);
  return `${base}-${id.substring(0, 8)}`;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hiringService: HiringService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async assertOrgMember(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId, isActive: true },
    });
    if (!member) throw new ForbiddenException('You are not a member of this organization');
    return member;
  }

  private async assertEventOrgMember(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    await this.assertOrgMember(event.organizationId, userId);
    return event;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(orgId: string, userId: string, dto: CreateEventDto) {
    await this.assertOrgMember(orgId, userId);
    if (new Date(dto.endDate) <= new Date(dto.startDate))
      throw new BadRequestException('End date must be after start date');

    return this.prisma.event.create({
      data: {
        organizationId: orgId,
        title: dto.title,
        description: dto.description,
        venue: dto.venue,
        city: dto.city,
        citySlug: dto.citySlug,
        locationLat: dto.locationLat,
        locationLng: dto.locationLng,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: 'DRAFT',
      },
      include: { roles: true, organization: { select: { name: true, logoUrl: true } } },
    });
  }

  async findOne(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organization: { select: { id: true, name: true, logoUrl: true, isVerified: true, citySlug: true } },
        roles: {
          include: {
            jobs: {
              where: { status: { not: 'DELETED' } },
              select: { id: true, slug: true, citySlug: true, categorySlug: true, vacancies: true, status: true },
            },
          },
        },
        _count: { select: { jobs: true } },
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async update(eventId: string, userId: string, dto: UpdateEventDto) {
    await this.assertEventOrgMember(eventId, userId);
    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...dto,
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
      },
    });
  }

  async updateStatus(eventId: string, userId: string, dto: UpdateEventStatusDto) {
    const event = await this.assertEventOrgMember(eventId, userId);
    if (dto.status === 'COMPLETED') {
      // Close all linked published jobs
      await this.prisma.job.updateMany({
        where: { eventId, status: 'PUBLISHED' },
        data: { status: 'CLOSED' },
      });
    }
    return this.prisma.event.update({
      where: { id: eventId },
      data: { status: dto.status },
    });
  }

  async listOrgEvents(orgId: string, userId: string, query: ListEventsQueryDto) {
    await this.assertOrgMember(orgId, userId);
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, events] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        orderBy: { startDate: 'asc' },
        skip,
        take: limit,
        include: {
          roles: { select: { id: true, title: true, vacancies: true, payRate: true, payUnit: true } },
          _count: {
            select: {
              jobs: true,
              roles: true,
            },
          },
        },
      }),
    ]);

    // Enrich with applicant counts per event
    const enriched = await Promise.all(
      events.map(async (event) => {
        const jobIds = await this.prisma.job
          .findMany({ where: { eventId: event.id }, select: { id: true } })
          .then((jobs) => jobs.map((j) => j.id));
        const applicantCount = await this.prisma.application.count({
          where: { jobId: { in: jobIds } },
        });
        return { ...event, applicantCount };
      }),
    );

    return { data: enriched, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  // ── Roles ────────────────────────────────────────────────────────────────

  async addRoles(eventId: string, userId: string, dto: AddRolesDto) {
    const event = await this.assertEventOrgMember(eventId, userId);
    if (event.status !== 'DRAFT')
      throw new ConflictException('Roles can only be added to DRAFT events');

    await this.prisma.eventRole.createMany({
      data: dto.roles.map((r) => ({
        eventId,
        title: r.title,
        description: r.description,
        vacancies: r.vacancies,
        payRate: r.payRate,
        payUnit: r.payUnit,
      })),
    });

    return this.findOne(eventId);
  }

  async updateRole(eventId: string, roleId: string, userId: string, dto: UpdateRoleDto) {
    const event = await this.assertEventOrgMember(eventId, userId);
    if (event.status !== 'DRAFT')
      throw new ConflictException('Roles can only be updated on DRAFT events');

    return this.prisma.eventRole.update({
      where: { id: roleId },
      data: dto,
    });
  }

  async deleteRole(eventId: string, roleId: string, userId: string) {
    const event = await this.assertEventOrgMember(eventId, userId);
    if (event.status !== 'DRAFT')
      throw new ConflictException('Roles can only be deleted from DRAFT events');

    await this.prisma.eventRole.delete({ where: { id: roleId } });
    return { deleted: true };
  }

  // ── Publish ────────────────────────────────────────────────────────────

  async publish(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { roles: true, organization: { select: { id: true, name: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    await this.assertOrgMember(event.organizationId, userId);
    if (event.status !== 'DRAFT') throw new ConflictException('Only DRAFT events can be published');
    if (!event.roles.length) throw new BadRequestException('Event must have at least one role before publishing');
    if (!event.roles.some((r) => r.vacancies > 0))
      throw new BadRequestException('At least one role must have vacancies > 0');

    await this.prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id: eventId }, data: { status: 'PUBLISHED' } });

      for (const role of event.roles) {
        // Generate a unique slug for each role-job
        const tempId = `${role.id.substring(0, 6)}`;
        const slug = generateEventSlug(role.title, event.title, tempId);
        const shortDesc = role.description
          ? role.description.substring(0, 157) + (role.description.length > 157 ? '...' : '')
          : event.title.substring(0, 160);

        await tx.job.create({
          data: {
            title: role.title,
            description: [
              event.title,
              event.venue,
              role.description ?? '',
            ].filter(Boolean).join(' — '),
            shortDescription: shortDesc,
            category: 'event',
            categorySlug: 'event',
            city: event.city,
            citySlug: event.citySlug,
            area: event.venue.substring(0, 80),
            locationLat: event.locationLat,
            locationLng: event.locationLng,
            payRate: role.payRate,
            payUnit: role.payUnit,
            vacancies: role.vacancies,
            workDate: event.startDate,
            workDateEnd: event.endDate,
            status: 'PUBLISHED',
            posterId: userId,
            organizationId: event.organizationId,
            eventId: event.id,
            eventRoleId: role.id,
            slug,
          },
        });
      }
    });

    return this.findOne(eventId);
  }

  // ── Applicants (aggregated across all roles) ───────────────────────────────────

  async listApplicants(eventId: string, userId: string, statusFilter?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { roles: { include: { jobs: { select: { id: true } } } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    await this.assertOrgMember(event.organizationId, userId);

    const roleGroups = await Promise.all(
      event.roles.map(async (role) => {
        const jobId = role.jobs[0]?.id;
        if (!jobId) return { role, job: null, applications: [], filled: 0 };

        const job = await this.prisma.job.findUnique({
          where: { id: jobId },
          select: { id: true, title: true, slug: true, citySlug: true, categorySlug: true, vacancies: true, status: true },
        });

        const hiredCount = await this.prisma.hire.count({ where: { jobId } });

        const applications = await this.prisma.application.findMany({
          where: {
            jobId,
            ...(statusFilter ? { status: statusFilter } : {}),
          },
          orderBy: { createdAt: 'desc' },
          include: {
            applicant: {
              select: {
                id: true, name: true, avatarUrl: true,
                averageRating: true, ratingCount: true,
                reliabilityScore: true, citySlug: true, area: true,
                verificationLevel: true,
                workerProfile: {
                  select: {
                    headline: true, categorySlug: true, slug: true,
                    skills: { include: { skill: { select: { name: true, slug: true } } } },
                  },
                },
              },
            },
          },
        });

        return {
          role: { id: role.id, title: role.title, vacancies: role.vacancies, payRate: role.payRate, payUnit: role.payUnit },
          job,
          filled: hiredCount,
          applications,
        };
      }),
    );

    return roleGroups;
  }

  // ── Bulk hire ───────────────────────────────────────────────────────────

  async bulkHire(eventId: string, employerId: string, dto: BulkHireDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    await this.assertOrgMember(event.organizationId, employerId);

    const results: { applicationId: string; success: boolean; hireId?: string; error?: string }[] = [];
    let successCount = 0;
    let failCount = 0;

    // Sequential to avoid race conditions on vacancies
    for (const item of dto.hires) {
      try {
        const hire = await this.hiringService.hire(item.applicationId, employerId, {
          agreedRate: item.agreedRate,
          agreedUnit: item.agreedUnit,
          startTime: item.startTime,
          endTime: item.endTime,
        });
        results.push({ applicationId: item.applicationId, success: true, hireId: hire.id });
        successCount++;
      } catch (err: any) {
        const error = err?.response?.message ?? err?.message ?? 'Unknown error';
        results.push({ applicationId: item.applicationId, success: false, error });
        failCount++;
        this.logger.warn(`Bulk hire failed for application ${item.applicationId}: ${error}`);
      }
    }

    return { results, successCount, failCount };
  }
}
