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

  /** GET /v1/chats */
  async listChats(userId: string) {
    const participations = await this.prisma.chatParticipant.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            participants: {
              include: { user: { select: { id: true, name: true, avatarUrl: true } } },
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
      const counterparty = chat.participants.map((cp) => cp.user).find((u) => u.id !== userId);
      return {
        id: chat.id,
        hireId: chat.hireId,
        jobId: chat.jobId,
        counterparty,
        lastMessage,
        myLastReadAt: p.lastReadAt,
        updatedAt: chat.updatedAt,
      };
    });
  }

  /** GET /v1/chats/:id/messages */
  async getMessages(chatId: string, userId: string, query: MessageCursorQueryDto) {
    await this.assertParticipant(chatId, userId);
    const limit = Math.min(query.limit ?? 30, 100);

    const cursorDate = query.cursor
      ? (await this.prisma.message.findUnique({ where: { id: query.cursor }, select: { createdAt: true } }))?.createdAt
      : undefined;

    const messages = await this.prisma.message.findMany({
      where: { chatId, ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();
    const nextCursor = hasMore ? messages[messages.length - 1].id : null;
    return { data: messages.reverse(), nextCursor };
  }

  /** POST /v1/chats — create or get existing chat */
  async createOrGetChat(
    initiatorId: string,
    recipientId: string,
    jobId?: string,
    hireId?: string,
  ) {
    // Check if a chat already exists between these two users for this context
    const existing = await this.prisma.chat.findFirst({
      where: {
        ...(hireId ? { hireId } : {}),
        participants: {
          every: { userId: { in: [initiatorId, recipientId] } },
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (existing) return existing;

    // Create new chat
    return this.prisma.chat.create({
      data: {
        jobId,
        hireId,
        participants: {
          create: [
            { userId: initiatorId },
            { userId: recipientId },
          ],
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  /** POST /v1/chats/:id/messages */
  async sendMessage(chatId: string, senderId: string, dto: SendMessageDto) {
    await this.assertParticipant(chatId, senderId);

    const message = await this.prisma.message.create({
      data: { chatId, senderId, content: dto.content, type: dto.type ?? 'TEXT', mediaUrl: dto.mediaUrl },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await this.prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

    this.gateway.emitToChat(chatId, 'new_message', message);

    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: { select: { userId: true } } },
    });
    const participantIds = (chat?.participants ?? []).map((p) => p.userId);
    const sender = await this.prisma.user.findUnique({ where: { id: senderId }, select: { name: true } });

    this.notifications
      .notifyChatMessage(senderId, sender?.name ?? null, chatId, participantIds, dto.content, chat?.hireId ?? undefined)
      .catch(() => {});

    return message;
  }

  /** PATCH /v1/chats/:id/read */
  async markRead(chatId: string, userId: string) {
    await this.assertParticipant(chatId, userId);
    const now = new Date();
    await this.prisma.chatParticipant.update({
      where: { chatId_userId: { chatId, userId } },
      data: { lastReadAt: now },
    });
    await this.prisma.message.updateMany({
      where: { chatId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });
    this.gateway.emitToChat(chatId, 'message_read', { chatId, userId, readAt: now });
    return { success: true };
  }

  private async assertParticipant(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: { where: { userId }, select: { userId: true } } },
    });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.participants.length === 0) throw new ForbiddenException('You are not a participant of this chat');
    return chat;
  }
}
