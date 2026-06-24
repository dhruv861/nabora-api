import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { SendMessageDto, MessageCursorQueryDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    private readonly notifications: NotificationsService,
  ) {}

  /** GET /v1/chats — caller's chats with last message + unread count */
  async listChats(userId: string) {
    const participations = await this.prisma.chatParticipant.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            participants: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { sender: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { chat: { updatedAt: 'desc' } },
    });

    return participations.map((p) => {
      const { chat } = p;
      const lastMessage = chat.messages[0] ?? null;
      const counterparty = chat.participants
        .map((cp) => cp.user)
        .find((u) => u.id !== userId);

      // Unread: messages after my lastReadAt
      const myLastReadAt = p.lastReadAt;
      return {
        id: chat.id,
        hireId: chat.hireId,
        jobId: chat.jobId,
        counterparty,
        lastMessage,
        // Unread count is computed client-side from lastReadAt for now;
        // a DB aggregate would require a subquery — deferred to Sprint 10 perf pass
        myLastReadAt,
        updatedAt: chat.updatedAt,
      };
    });
  }

  /** GET /v1/chats/:id/messages — cursor-paginated message history */
  async getMessages(chatId: string, userId: string, query: MessageCursorQueryDto) {
    await this.assertParticipant(chatId, userId);

    const limit = Math.min(query.limit ?? 30, 100);

    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        ...(query.cursor ? { createdAt: { lt: (await this.prisma.message.findUnique({ where: { id: query.cursor }, select: { createdAt: true } }))?.createdAt } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();
    const nextCursor = hasMore ? messages[messages.length - 1].id : null;

    return {
      data: messages.reverse(), // return chronological order
      nextCursor,
    };
  }

  /** POST /v1/chats/:id/messages — send a message */
  async sendMessage(chatId: string, senderId: string, dto: SendMessageDto) {
    await this.assertParticipant(chatId, senderId);

    const message = await this.prisma.message.create({
      data: {
        chatId,
        senderId,
        content: dto.content,
        type: dto.type ?? 'TEXT',
        mediaUrl: dto.mediaUrl,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Update chat updatedAt
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    // Real-time push to everyone in the chat room
    this.gateway.emitToChat(chatId, 'new_message', message);

    // Notify offline participants (DB notification + user room push)
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: { select: { userId: true } },
      },
    });
    const participantIds = (chat?.participants ?? []).map((p) => p.userId);
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true },
    });
    this.notifications
      .notifyChatMessage(
        senderId,
        sender?.name ?? null,
        chatId,
        participantIds,
        dto.content,
        chat?.hireId ?? undefined,
      )
      .catch(() => {});

    return message;
  }

  /** PATCH /v1/chats/:id/read — mark all messages read */
  async markRead(chatId: string, userId: string) {
    await this.assertParticipant(chatId, userId);

    const now = new Date();
    await this.prisma.chatParticipant.update({
      where: { chatId_userId: { chatId, userId } },
      data: { lastReadAt: now },
    });

    // Mark all messages in chat as read (for is_read flag on message level)
    await this.prisma.message.updateMany({
      where: { chatId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });

    // Push read receipt to chat room so sender's UI can update
    this.gateway.emitToChat(chatId, 'message_read', { chatId, userId, readAt: now });

    return { success: true };
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async assertParticipant(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: { where: { userId }, select: { userId: true } } },
    });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.participants.length === 0)
      throw new ForbiddenException('You are not a participant of this chat');
    return chat;
  }
}
