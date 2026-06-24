import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '../../common/types/enums';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  /** Generic notification: persists to DB then pushes via Socket.IO. */
  async notify(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    try {
      const notification = await this.prisma.notification.create({
        data: { userId, type, title, body, data: data ?? {} },
      });
      // Sprint 4: push to socket room
      this.gateway.emitToUser(userId, 'notification', {
        id: notification.id,
        type,
        title,
        body,
        data: data ?? {},
        createdAt: notification.createdAt,
      });
    } catch (err) {
      this.logger.error(`Failed to persist/push notification for user ${userId}`, err);
    }
  }

  /** Called after a worker applies to a job. Notifies the job poster. */
  async notifyNewApplication(
    posterId: string,
    workerName: string | null,
    jobTitle: string,
    jobId: string,
    applicationId: string,
  ) {
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
    hire: { id: string; workerId: string; job?: { title?: string } | null; jobId: string },
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

  /** Called when a new chat message is sent. Notifies all non-sender participants. */
  async notifyChatMessage(
    senderId: string,
    senderName: string | null,
    chatId: string,
    participantIds: string[],
    messagePreview: string,
    hireId?: string,
  ) {
    const recipients = participantIds.filter((id) => id !== senderId);
    await Promise.all(
      recipients.map((userId) =>
        this.notify(
          userId,
          NotificationType.CHAT_MESSAGE,
          `New message from ${senderName ?? 'Someone'}`,
          messagePreview.length > 60 ? messagePreview.slice(0, 57) + '...' : messagePreview,
          { chatId, hireId },
        ),
      ),
    );
  }
}
