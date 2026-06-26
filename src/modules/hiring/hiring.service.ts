import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { HireApplicationDto, ListHiresQueryDto } from './dto/hiring.dto';

const INVOICE_QUEUE = 'invoice-generation';

@Injectable()
export class HiringService {
  private readonly logger = new Logger(HiringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @InjectQueue(INVOICE_QUEUE) private readonly invoiceQueue: Queue,
  ) {}

  // POST /v1/applications/:applicationId/hire
  async hire(applicationId: string, employerId: string, dto: HireApplicationDto) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.job.posterId !== employerId)
      throw new ForbiddenException('Only the job poster can hire applicants');
    if (!['PENDING', 'SHORTLISTED'].includes(application.status))
      throw new ConflictException(`Cannot hire an application with status: ${application.status}`);

    const { job } = application;

    let hire: Awaited<ReturnType<typeof this.prisma.hire.create>>;

    try {
      hire = await this.prisma.$transaction(async (tx) => {
        // a+b: update application + create hire atomically
        await tx.application.update({
          where: { id: applicationId },
          data: { status: 'HIRED' },
        });

        const newHire = await tx.hire.create({
          data: {
            jobId: job.id,
            workerId: application.applicantId,
            employerId,
            applicationId,
            status: 'ACTIVE',
            agreedRate: dto.agreedRate,
            agreedUnit: dto.agreedUnit,
            ...(dto.startTime ? { startTime: new Date(dto.startTime) } : {}),
            ...(dto.endTime ? { endTime: new Date(dto.endTime) } : {}),
          },
          include: { job: { select: { title: true } } },
        });

        // d: decrement vacancies; close job at 0
        const updatedJob = await tx.job.update({
          where: { id: job.id },
          data: { vacancies: { decrement: 1 } },
          select: { vacancies: true },
        });
        if (updatedJob.vacancies <= 0) {
          await tx.job.update({
            where: { id: job.id },
            data: { status: 'CLOSED' },
          });
        }

        return newHire;
      });
    } catch (err: any) {
      // Catch unique constraint on hires.applicationId (double-hire race condition)
      if (err?.code === 'P2002' && err?.meta?.target?.includes('applicationId')) {
        throw new ConflictException('This applicant was already hired');
      }
      throw err;
    }

    // e: upsert Chat + ChatParticipant rows using the now-unique hireId constraint.
    // findUnique on hireId is safe — the @@unique([hireId]) on Chat prevents duplicates at DB level.
    try {
      await this.prisma.chat.upsert({
        where: { hireId: hire.id },
        create: {
          hireId: hire.id,
          jobId: job.id,
          participants: {
            create: [
              { userId: employerId },
              { userId: application.applicantId },
            ],
          },
        },
        update: {}, // no-op if already exists — idempotent
      });
    } catch (err) {
      this.logger.error('Failed to upsert chat for hire', err);
    }

    // f: notify worker
    this.notifications.notifyHired(hire).catch(() => {});

    return hire;
  }

  // POST /v1/hires/:id/complete — employer only
  async complete(hireId: string, employerId: string) {
    const hire = await this.prisma.hire.findUnique({
      where: { id: hireId },
      include: {
        job: { select: { title: true } },
        worker: { select: { id: true, completedJobCount: true, isNewWorker: true } },
      },
    });
    if (!hire) throw new NotFoundException('Hire not found');
    if (hire.employerId !== employerId) throw new ForbiddenException('Only the employer can complete a hire');
    if (hire.status !== 'ACTIVE') throw new ConflictException(`Cannot complete a hire with status: ${hire.status}`);

    // a: mark hire COMPLETED
    await this.prisma.hire.update({ where: { id: hireId }, data: { status: 'COMPLETED' } });

    // b: increment completedJobCount; flip isNewWorker at 5
    const newCount = (hire.worker.completedJobCount ?? 0) + 1;
    await this.prisma.user.update({
      where: { id: hire.workerId },
      data: {
        completedJobCount: newCount,
        ...(newCount >= 5 ? { isNewWorker: false } : {}),
      },
    });

    // c: enqueue invoice-generation Bull job
    await this.invoiceQueue.add('generate', { hireId }, { attempts: 3, backoff: 5000 });

    // Notify worker
    this.notifications
      .notifyHireCompleted(hire.workerId, hire.job.title, hireId)
      .catch(() => {});

    return { success: true, hireId };
  }

  // GET /v1/hires/:id — worker or employer of that hire only
  async findOne(hireId: string, userId: string) {
    const hire = await this.prisma.hire.findUnique({
      where: { id: hireId },
      include: {
        job: {
          select: {
            id: true, title: true, citySlug: true, categorySlug: true, slug: true,
            payRate: true, payUnit: true, workDate: true, area: true,
          },
        },
        worker: { select: { id: true, name: true, avatarUrl: true, phone: true, averageRating: true } },
        employer: { select: { id: true, name: true, avatarUrl: true } },
        attendance: { orderBy: { workDate: 'asc' } },
        invoice: { select: { id: true, status: true, totalPayable: true, invoiceNumber: true } },
        chat: { select: { id: true } },
      },
    });
    if (!hire) throw new NotFoundException('Hire not found');
    if (hire.workerId !== userId && hire.employerId !== userId)
      throw new ForbiddenException('You are not a party to this hire');
    return hire;
  }

  // GET /v1/hires/my
  async myHires(userId: string, query: ListHiresQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const roleFilter =
      query.role === 'WORKER' ? { workerId: userId } : { employerId: userId };

    const where = {
      ...roleFilter,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, hires] = await Promise.all([
      this.prisma.hire.count({ where }),
      this.prisma.hire.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          job: { select: { id: true, title: true, citySlug: true, categorySlug: true, slug: true, workDate: true } },
          worker: { select: { id: true, name: true, avatarUrl: true } },
          employer: { select: { id: true, name: true, avatarUrl: true } },
          invoice: { select: { status: true, totalPayable: true } },
          chat: { select: { id: true } },
        },
      }),
    ]);

    return {
      data: hires,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
}
