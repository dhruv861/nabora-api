import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '../../common/types/enums';

/**
 * NotificationsService — Sprint 3 stub.
 * Writes Notification rows to the DB only.
 * Sprint 4 will add the Socket.IO push call inside each method
 * WITHOUT changing the method signatures.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Generic notification create — called internally by all helpers below. */
  async notify(userId: string, type: string, title: string, body: string, data?: Record<string, unknown>) {
    try {
      await this.prisma.notification.create({
        data: { userId, type, title, body, data: data ?? {} },
      });
      // Sprint 4: gateway.emit(userId, { type, title, body, data })
    } catch (err) {
      this.logger.error(`Failed to persist notification for user ${userId}`, err);
    }
  }

  /** Called after a worker applies to a job. Notifies the job poster. */
  async notifyNewApplication(posterId: string, workerName: string | null, jobTitle: string, jobId: string, applicationId: string) {
    await this.notify(
      posterId,
      NotificationType.APPLICATION_RECEIVED,
      'New Application',
      `${workerName ?? 'Someone'} applied to your job: ${jobTitle}`,
      { jobId, applicationId },
    );
  }

  /** Called after an employer hires an applicant. Notifies the worker. */
  async notifyHired(
    hire: {
      id: string;
      workerId: string;
      job?: { title?: string } | null;
      jobId: string;
    },
  ) {
    await this.notify(
      hire.workerId,
      NotificationType.APPLICATION_HIRED,
      'You got hired!',
      `Congratulations! You have been hired for: ${hire.job?.title ?? 'a job'}`,
      { hireId: hire.id, jobId: hire.jobId },
    );
  }

  /** Called after a hire is completed. Notifies the worker. */
  async notifyHireCompleted(workerId: string, jobTitle: string, hireId: string) {
    await this.notify(
      workerId,
      NotificationType.HIRE_COMPLETED,
      'Job Completed',
      `Your job "${jobTitle}" has been marked as completed. Please leave a review.`,
      { hireId },
    );
  }
}
