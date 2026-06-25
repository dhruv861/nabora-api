import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ICacheProvider } from '../../providers/cache/cache.interface';
import { CACHE_PROVIDER } from '../../providers/cache/cache.interface';
import { NotificationType, OrgRole } from '../../common/types/enums';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateOrganizationDto, UpdateOrganizationDto, InviteMemberDto, UpdateMemberRoleDto,
} from './dto/organizations.dto';

function generateOrgSlug(name: string, id: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-').substring(0, 40);
  return `${base || 'org'}-org${id.substring(0, 6)}`;
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const org = await this.prisma.organization.create({
      data: {
        name: dto.name, slug: `draft-${Date.now()}`,
        description: dto.description, city: dto.city, citySlug: dto.citySlug,
        address: dto.address, gstin: dto.gstin, website: dto.website, logoUrl: dto.logoUrl,
        members: { create: { userId, role: OrgRole.OWNER, joinedAt: new Date(), isActive: true } },
      },
    });
    const slug = generateOrgSlug(dto.name, org.id);
    return this.prisma.organization.update({
      where: { id: org.id }, data: { slug },
      include: { members: { where: { userId }, select: { role: true } }, _count: { select: { members: true, jobs: true } } },
    });
  }

  async findOne(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId, isActive: true },
      include: { _count: { select: { members: { where: { isActive: true } }, jobs: { where: { status: 'PUBLISHED' } }, events: { where: { status: { in: ['PUBLISHED', 'ONGOING'] } } } } } },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async findBySlug(slug: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug, isActive: true },
      include: {
        _count: { select: { members: { where: { isActive: true } }, jobs: true } },
        jobs: { where: { status: 'PUBLISHED' }, orderBy: { workDate: 'asc' }, take: 10, include: { _count: { select: { applications: true } } } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(orgId: string, dto: UpdateOrganizationDto) {
    return this.prisma.organization.update({ where: { id: orgId }, data: dto });
  }

  async listMembers(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      include: { user: { select: { id: true, name: true, avatarUrl: true, phone: true, verificationLevel: true, averageRating: true } } },
    });
  }

  async inviteMember(orgId: string, inviterId: string, dto: InviteMemberDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone }, select: { id: true, name: true } });
    if (!user) throw new NotFoundException('No Nabora account found with this phone number');
    if (user.id === inviterId) throw new NotFoundException('You cannot invite yourself');
    const existing = await this.prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: orgId, userId: user.id } } });
    if (existing?.isActive) throw new NotFoundException('User is already a member');
    await this.prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
      create: { organizationId: orgId, userId: user.id, role: dto.role, isActive: true, joinedAt: null },
      update: { role: dto.role, isActive: true, joinedAt: null },
    });
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    this.notifications.notify(user.id, NotificationType.APPLICATION_RECEIVED, 'Organization Invitation',
      `You have been invited to join ${org?.name ?? 'an organization'} as ${dto.role.replace(/_/g, ' ')}`, { orgId },
    ).catch(() => {});
    return { invited: true, userId: user.id };
  }

  async updateMemberRole(orgId: string, targetUserId: string, callerId: string, dto: UpdateMemberRoleDto) {
    if (targetUserId === callerId) throw new ForbiddenException('You cannot change your own role');
    const member = await this.prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } } });
    if (!member?.isActive) throw new NotFoundException('Member not found');
    return this.prisma.organizationMember.update({ where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } }, data: { role: dto.role } });
  }

  async removeMember(orgId: string, targetUserId: string, callerId: string) {
    if (targetUserId === callerId) throw new ForbiddenException('You cannot remove yourself. Transfer ownership first.');
    const member = await this.prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } } });
    if (!member?.isActive) throw new NotFoundException('Member not found');
    return this.prisma.organizationMember.update({ where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } }, data: { isActive: false } });
  }

  async myOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId, isActive: true },
      include: { organization: { include: { _count: { select: { members: { where: { isActive: true } }, jobs: { where: { status: 'PUBLISHED' } } } } } } },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => ({ ...m.organization, myRole: m.role, joinedAt: m.joinedAt }));
  }

  // ── Sprint 9: Org Analytics ────────────────────────────────────────────────
  async getAnalytics(orgId: string, userId: string) {
    // Auth: org member check
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId, isActive: true },
    });
    if (!member) throw new ForbiddenException('You are not a member of this organization');

    const cacheKey = `org:analytics:${orgId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) { try { return JSON.parse(cached as string); } catch { /* ignore */ } }

    const orgJobs = await this.prisma.job.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });
    const jobIds = orgJobs.map((j) => j.id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalJobs, jobsThisMonth, activeJobs,
      totalApplications,
      totalHires, completedHires, hiresThisMonth,
      totalInvoices, paidInvoices, billedAgg, paidAgg,
      workerRatingAgg, workerReliabilityAgg,
      totalEvents, activeEvents,
    ] = await Promise.all([
      this.prisma.job.count({ where: { organizationId: orgId } }),
      this.prisma.job.count({ where: { organizationId: orgId, createdAt: { gte: startOfMonth } } }),
      this.prisma.job.count({ where: { organizationId: orgId, status: 'PUBLISHED' } }),
      jobIds.length ? this.prisma.application.count({ where: { jobId: { in: jobIds } } }) : Promise.resolve(0),
      jobIds.length ? this.prisma.hire.count({ where: { jobId: { in: jobIds } } }) : Promise.resolve(0),
      jobIds.length ? this.prisma.hire.count({ where: { jobId: { in: jobIds }, status: 'COMPLETED' } }) : Promise.resolve(0),
      jobIds.length ? this.prisma.hire.count({ where: { jobId: { in: jobIds }, createdAt: { gte: startOfMonth } } }) : Promise.resolve(0),
      jobIds.length ? this.prisma.invoice.count({ where: { hire: { jobId: { in: jobIds } } } }) : Promise.resolve(0),
      jobIds.length ? this.prisma.invoice.count({ where: { hire: { jobId: { in: jobIds } }, status: 'PAID' } }) : Promise.resolve(0),
      jobIds.length ? this.prisma.invoice.aggregate({ where: { hire: { jobId: { in: jobIds } } }, _sum: { totalPayable: true } }) : Promise.resolve({ _sum: { totalPayable: null } }),
      jobIds.length ? this.prisma.invoice.aggregate({ where: { hire: { jobId: { in: jobIds } }, status: 'PAID' }, _sum: { totalPayable: true } }) : Promise.resolve({ _sum: { totalPayable: null } }),
      jobIds.length ? this.prisma.rating.aggregate({ where: { hire: { jobId: { in: jobIds } }, targetType: 'WORKER' }, _avg: { overallScore: true } }) : Promise.resolve({ _avg: { overallScore: null } }),
      jobIds.length ? this.prisma.user.aggregate({ where: { hiresAsWorker: { some: { jobId: { in: jobIds } } } }, _avg: { reliabilityScore: true } }) : Promise.resolve({ _avg: { reliabilityScore: null } }),
      this.prisma.event.count({ where: { organizationId: orgId } }),
      this.prisma.event.count({ where: { organizationId: orgId, status: { in: ['PUBLISHED', 'ONGOING'] } } }),
    ]);

    const result = {
      totalJobs, jobsThisMonth, activeJobs,
      totalApplications,
      totalHires, completedHires, hiresThisMonth,
      hireRate: totalApplications > 0 ? +(totalHires / totalApplications).toFixed(3) : 0,
      totalInvoices, paidInvoices,
      collectionRate: totalInvoices > 0 ? +(paidInvoices / totalInvoices).toFixed(3) : 0,
      totalBilledAmount: billedAgg._sum.totalPayable ?? 0,
      collectedAmount: paidAgg._sum.totalPayable ?? 0,
      avgWorkerRating: +(workerRatingAgg._avg.overallScore ?? 0).toFixed(2),
      avgWorkerReliability: +(workerReliabilityAgg._avg.reliabilityScore ?? 0).toFixed(2),
      totalEvents, activeEvents,
    };

    await this.cache.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }
}
