import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AdminUpdateUserDto {
  isActive?: boolean;
  verificationLevel?: string;
  isAdmin?: boolean;
}

export interface AdminUpdateJobDto { status?: string; }
export interface AdminUpdateOrgDto { isVerified?: boolean; isActive?: boolean; }
export interface AdminReportsQuery { /* future filters */ }

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(query: {
    search?: string; accountType?: string; verificationLevel?: string; citySlug?: string;
    page?: number; limit?: number;
  }) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const where: any = {
      ...(query.accountType ? { accountType: query.accountType } : {}),
      ...(query.verificationLevel ? { verificationLevel: query.verificationLevel } : {}),
      ...(query.citySlug ? { citySlug: query.citySlug } : {}),
      ...(query.search ? {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search } },
        ],
      } : {}),
    };
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        select: {
          id: true, name: true, phone: true, email: true, avatarUrl: true,
          accountType: true, verificationLevel: true, citySlug: true, city: true,
          isActive: true, isAdmin: true, isNewWorker: true,
          completedJobCount: true, averageRating: true, reliabilityScore: true, createdAt: true,
          workerProfile: { select: { slug: true, headline: true, categorySlug: true } },
        },
      }),
    ]);
    return { data: users, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async updateUser(userId: string, dto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({ where: { id: userId }, data: dto });
  }

  async listOrganizations(query: { search?: string; isVerified?: boolean; citySlug?: string; page?: number; limit?: number }) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const where: any = {
      ...(query.isVerified !== undefined ? { isVerified: query.isVerified } : {}),
      ...(query.citySlug ? { citySlug: query.citySlug } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [total, orgs] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: { _count: { select: { members: true, jobs: true, events: true } } },
      }),
    ]);
    return { data: orgs, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async updateOrganization(orgId: string, dto: AdminUpdateOrgDto) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    return this.prisma.organization.update({ where: { id: orgId }, data: dto });
  }

  async listJobs(query: { status?: string; citySlug?: string; categorySlug?: string; page?: number; limit?: number }) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const where: any = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.citySlug ? { citySlug: query.citySlug } : {}),
      ...(query.categorySlug ? { categorySlug: query.categorySlug } : {}),
    };
    const [total, jobs] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: {
          poster: { select: { name: true, phone: true } },
          organization: { select: { name: true } },
          _count: { select: { applications: true } },
        },
      }),
    ]);
    return { data: jobs, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async updateJob(jobId: string, dto: AdminUpdateJobDto) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    return this.prisma.job.update({ where: { id: jobId }, data: dto });
  }

  async listDisputes(query: { status?: string; type?: string; page?: number; limit?: number }) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const where: any = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
    };
    const [total, disputes] = await Promise.all([
      this.prisma.dispute.count({ where }),
      this.prisma.dispute.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: {
          raisedBy: { select: { name: true, phone: true } },
          hire: { select: { job: { select: { title: true } }, worker: { select: { name: true } }, employer: { select: { name: true } } } },
          _count: { select: { evidence: true } },
        },
      }),
    ]);
    return { data: disputes, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async listInvoices(query: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const where: any = { ...(query.status ? { status: query.status } : {}) };
    const [total, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: {
          hire: {
            select: {
              worker: { select: { name: true } },
              employer: { select: { name: true } },
              job: { select: { title: true } },
            },
          },
        },
      }),
    ]);
    return { data: invoices, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getSummaryReport() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalUsers, usersThisMonth, totalOrgs, orgsThisMonth,
           totalJobs, activeJobs, jobsThisMonth,
           totalHires, completedHires, hiresThisMonth,
           totalInvoices, paidInvoices, billedAgg, openDisputes, reviewingDisputes] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
        this.prisma.organization.count({ where: { isActive: true } }),
        this.prisma.organization.count({ where: { createdAt: { gte: startOfMonth } } }),
        this.prisma.job.count(),
        this.prisma.job.count({ where: { status: 'PUBLISHED' } }),
        this.prisma.job.count({ where: { createdAt: { gte: startOfMonth } } }),
        this.prisma.hire.count(),
        this.prisma.hire.count({ where: { status: 'COMPLETED' } }),
        this.prisma.hire.count({ where: { createdAt: { gte: startOfMonth } } }),
        this.prisma.invoice.count(),
        this.prisma.invoice.count({ where: { status: 'PAID' } }),
        this.prisma.invoice.aggregate({ _sum: { totalPayable: true }, where: { status: 'PAID' } }),
        this.prisma.dispute.count({ where: { status: 'OPEN' } }),
        this.prisma.dispute.count({ where: { status: 'UNDER_REVIEW' } }),
      ]);

    const platformRevenue = paidInvoices * 99; // ₹99 platform fee per invoice

    return {
      users: { total: totalUsers, thisMonth: usersThisMonth },
      organizations: { total: totalOrgs, thisMonth: orgsThisMonth },
      jobs: { total: totalJobs, active: activeJobs, thisMonth: jobsThisMonth },
      hires: { total: totalHires, completed: completedHires, thisMonth: hiresThisMonth },
      invoices: {
        total: totalInvoices,
        paid: paidInvoices,
        totalBilled: billedAgg._sum.totalPayable ?? 0,
        platformRevenue,
      },
      disputes: { open: openDisputes, underReview: reviewingDisputes },
    };
  }

  async findOrgBySlug(slug: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug },
      include: {
        _count: { select: { members: true, jobs: true } },
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
}
