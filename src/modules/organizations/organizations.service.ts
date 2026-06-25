import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, OrgRole } from '../../common/types/enums';
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
        jobs: {
          where: { status: 'PUBLISHED' },
          orderBy: { workDate: 'asc' },
          take: 10,
          include: { _count: { select: { applications: true } } },
        },
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
    if (user.id === inviterId) throw new ConflictException('You cannot invite yourself');
    const existing = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
    });
    if (existing && existing.isActive) throw new ConflictException('User is already a member');
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
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    if (!member || !member.isActive) throw new NotFoundException('Member not found');
    return this.prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
      data: { role: dto.role },
    });
  }

  async removeMember(orgId: string, targetUserId: string, callerId: string) {
    if (targetUserId === callerId) throw new ForbiddenException('You cannot remove yourself. Transfer ownership first.');
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    if (!member || !member.isActive) throw new NotFoundException('Member not found');
    return this.prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
      data: { isActive: false },
    });
  }

  async myOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId, isActive: true },
      include: { organization: { include: { _count: { select: { members: { where: { isActive: true } }, jobs: { where: { status: 'PUBLISHED' } } } } } } },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => ({ ...m.organization, myRole: m.role, joinedAt: m.joinedAt }));
  }
}
