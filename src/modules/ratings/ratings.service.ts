import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../common/types/enums';
import { CreateRatingDto, ListRatingsQueryDto } from './dto/ratings.dto';

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Score helpers ──────────────────────────────────────────────────

  private computeOverallScore(dto: CreateRatingDto): number {
    const scores = (dto.targetType === 'WORKER'
      ? [dto.skillQuality, dto.communication, dto.professionalism, dto.punctuality]
      : [dto.paymentReliability, dto.communication, dto.workingConditions]
    ).filter((s): s is number => s !== undefined && s !== null);

    if (scores.length === 0) throw new BadRequestException('At least one rating subcategory is required');
    return +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
  }

  async updateUserAverageRating(userId: string): Promise<void> {
    const result = await this.prisma.rating.aggregate({
      where: { receiverId: userId },
      _avg: { overallScore: true },
      _count: true,
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        averageRating: result._avg.overallScore ?? 0,
        ratingCount: result._count,
      },
    });
  }

  async computeReliabilityScore(userId: string): Promise<number> {
    const hires = await this.prisma.hire.findMany({
      where: { workerId: userId },
      include: { attendance: { select: { status: true } } },
    });

    const total = hires.length;
    if (total === 0) return 0;

    const completed = hires.filter((h) => h.status === 'COMPLETED').length;
    const attended = hires.filter((h) =>
      h.attendance.some((a) => a.status === 'CHECKED_OUT'),
    ).length;
    const cancelled = hires.filter((h) => h.status === 'CANCELLED').length;

    const completionRate = completed / total;
    const attendanceRate = attended / total;
    const cancellationPenalty = Math.min(cancelled * 5, 20);

    const score = (completionRate * 0.5 + attendanceRate * 0.5) * 100 - cancellationPenalty;
    return +Math.max(0, Math.min(100, score)).toFixed(2);
  }

  /** Nightly cron: 2am — recompute reliability scores for all active workers */
  @Cron('0 2 * * *')
  async recomputeAllReliabilityScores(): Promise<void> {
    this.logger.log('[Cron] Recomputing reliability scores...');
    const users = await this.prisma.user.findMany({
      where: { completedJobCount: { gt: 0 }, isActive: true },
      select: { id: true },
    });
    let updated = 0;
    for (const user of users) {
      try {
        const score = await this.computeReliabilityScore(user.id);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { reliabilityScore: score },
        });
        updated++;
      } catch (err) {
        this.logger.error(`Failed to recompute reliability for user ${user.id}`, err);
      }
    }
    this.logger.log(`[Cron] Reliability scores updated for ${updated}/${users.length} users`);
  }

  // ── Endpoints ─────────────────────────────────────────────────────

  async createRating(hireId: string, giverId: string, dto: CreateRatingDto) {
    const hire = await this.prisma.hire.findUnique({
      where: { id: hireId },
      include: {
        job: { select: { title: true } },
        worker: { select: { id: true, name: true } },
        employer: { select: { id: true, name: true } },
      },
    });
    if (!hire) throw new NotFoundException('Hire not found');
    if (hire.status !== 'COMPLETED')
      throw new ConflictException('Can only rate a completed hire');
    if (hire.workerId !== giverId && hire.employerId !== giverId)
      throw new ForbiddenException('You are not a party to this hire');

    // Determine receiver
    const receiverId =
      dto.targetType === 'WORKER' ? hire.workerId : hire.employerId;

    // Guard: can only rate the other party, not yourself
    if (giverId === receiverId)
      throw new BadRequestException('You cannot rate yourself');

    // Validate caller can give this rating type
    if (dto.targetType === 'WORKER' && giverId !== hire.employerId)
      throw new ForbiddenException('Only the employer can rate the worker');
    if (dto.targetType === 'EMPLOYER' && giverId !== hire.workerId)
      throw new ForbiddenException('Only the worker can rate the employer');

    // Duplicate guard
    const existing = await this.prisma.rating.findFirst({
      where: { hireId, giverId, targetType: dto.targetType },
    });
    if (existing) throw new ConflictException('You have already rated this hire');

    const overallScore = this.computeOverallScore(dto);

    const rating = await this.prisma.rating.create({
      data: {
        hireId,
        giverId,
        receiverId,
        targetType: dto.targetType,
        skillQuality: dto.skillQuality,
        communication: dto.communication,
        professionalism: dto.professionalism,
        punctuality: dto.punctuality,
        paymentReliability: dto.paymentReliability,
        workingConditions: dto.workingConditions,
        overallScore,
        review: dto.review,
      },
      include: {
        giver: { select: { id: true, name: true, avatarUrl: true } },
        receiver: { select: { id: true, name: true } },
      },
    });

    // Update receiver's aggregate rating
    await this.updateUserAverageRating(receiverId);

    // Notify receiver
    const giverName =
      giverId === hire.employerId
        ? (hire.employer.name ?? 'Employer')
        : (hire.worker.name ?? 'Worker');
    this.notifications
      .notify(
        receiverId,
        NotificationType.REVIEW_RECEIVED,
        'New Review Received',
        `${giverName} left you a ${overallScore.toFixed(1)}★ review for "${hire.job.title}"`,
        { hireId, ratingId: rating.id },
      )
      .catch(() => {});

    return rating;
  }

  async listUserRatings(userId: string, query: ListRatingsQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where = {
      receiverId: userId,
      ...(query.targetType ? { targetType: query.targetType } : {}),
    };

    const [total, ratings] = await Promise.all([
      this.prisma.rating.count({ where }),
      this.prisma.rating.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          giver: {
            select: {
              id: true, name: true, avatarUrl: true, verificationLevel: true,
              workerProfile: { select: { headline: true } },
            },
          },
          hire: { select: { job: { select: { title: true } } } },
        },
      }),
    ]);

    return {
      data: ratings,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getMyRatingForHire(hireId: string, giverId: string) {
    return this.prisma.rating.findFirst({
      where: { hireId, giverId },
      include: {
        giver: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }
}
