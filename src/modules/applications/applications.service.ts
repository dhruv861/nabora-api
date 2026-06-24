import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApplyJobDto, UpdateApplicationStatusDto, ListApplicationsQueryDto } from './dto/applications.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // POST /v1/jobs/:jobId/apply
  async apply(jobId: string, applicantId: string, dto: ApplyJobDto) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'DELETED' || job.status === 'EXPIRED') throw new GoneException('This job is no longer available');
    if (job.status === 'CLOSED') throw new GoneException('This job is closed and no longer accepting applications');
    if (job.status !== 'PUBLISHED') throw new BadRequestException('This job is not accepting applications');
    if (job.posterId === applicantId) throw new ForbiddenException('You cannot apply to your own job');

    const existing = await this.prisma.application.findUnique({
      where: { jobId_applicantId: { jobId, applicantId } },
    });
    if (existing) throw new ConflictException('You have already applied to this job');

    const application = await this.prisma.application.create({
      data: { jobId, applicantId, coverNote: dto.coverNote },
      include: { job: { select: { title: true, posterId: true } } },
    });

    // Notify job poster (fire-and-forget)
    const applicant = await this.prisma.user.findUnique({ where: { id: applicantId }, select: { name: true } });
    this.notifications
      .notifyNewApplication(
        job.posterId,
        applicant?.name ?? null,
        job.title,
        jobId,
        application.id,
      )
      .catch(() => {});

    return application;
  }

  // GET /v1/jobs/:jobId/applications — poster only, paginated
  async listJobApplications(jobId: string, posterId: string, query: ListApplicationsQueryDto) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.posterId !== posterId) throw new ForbiddenException('Only the job poster can view applications');

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where = {
      jobId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, applications] = await Promise.all([
      this.prisma.application.count({ where }),
      this.prisma.application.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          applicant: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              averageRating: true,
              ratingCount: true,
              reliabilityScore: true,
              citySlug: true,
              area: true,
              verificationLevel: true,
              workerProfile: {
                select: {
                  headline: true,
                  categorySlug: true,
                  slug: true,
                  skills: { include: { skill: { select: { name: true, slug: true } } } },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: applications,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  // PATCH /v1/jobs/:jobId/applications/:applicationId — poster only
  async updateStatus(jobId: string, applicationId: string, posterId: string, dto: UpdateApplicationStatusDto) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.jobId !== jobId) throw new BadRequestException('Application does not belong to this job');
    if (application.job.posterId !== posterId) throw new ForbiddenException('Only the job poster can update application status');
    if (application.status === 'HIRED') throw new ConflictException('Cannot change status of an already hired application');
    if (application.status === 'WITHDRAWN') throw new ConflictException('Cannot change status of a withdrawn application');

    return this.prisma.application.update({
      where: { id: applicationId },
      data: { status: dto.status },
    });
  }

  // GET /v1/users/me/applications — caller's own applications
  async myApplications(applicantId: string, query: ListApplicationsQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where = {
      applicantId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, applications] = await Promise.all([
      this.prisma.application.count({ where }),
      this.prisma.application.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              citySlug: true,
              categorySlug: true,
              slug: true,
              payRate: true,
              payUnit: true,
              workDate: true,
              status: true,
              poster: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: applications,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  // DELETE /v1/jobs/:jobId/applications/:applicationId — withdraw (PENDING only)
  async withdraw(jobId: string, applicationId: string, applicantId: string) {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Application not found');
    if (application.jobId !== jobId) throw new BadRequestException('Application does not belong to this job');
    if (application.applicantId !== applicantId) throw new ForbiddenException('You can only withdraw your own application');
    if (application.status !== 'PENDING') throw new ConflictException('Only PENDING applications can be withdrawn');

    return this.prisma.application.update({
      where: { id: applicationId },
      data: { status: 'WITHDRAWN' },
    });
  }
}
