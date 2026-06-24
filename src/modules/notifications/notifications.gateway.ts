import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? '*', credentials: true },
  namespace: '/',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(socket: Socket) {
    try {
      const token =
        (socket.handshake.auth?.token as string) ??
        (socket.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) { socket.disconnect(); return; }

      const payload = this.jwtService.verify<{ sub: string }>(token);
      const userId = payload.sub;
      socket.data.userId = userId;
      socket.join(`user:${userId}`);

      if (!this.userSockets.has(userId)) this.userSockets.set(userId, new Set());
      this.userSockets.get(userId)!.add(socket.id);
      this.logger.log(`User ${userId} connected (${socket.id})`);
    } catch {
      this.logger.warn(`Rejected unauthenticated socket ${socket.id}`);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = socket.data?.userId as string | undefined;
    if (userId) {
      this.userSockets.get(userId)?.delete(socket.id);
      if (this.userSockets.get(userId)?.size === 0) this.userSockets.delete(userId);
      this.logger.log(`User ${userId} disconnected (${socket.id})`);
    }
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitToChat(chatId: string, event: string, payload: unknown) {
    this.server.to(`chat:${chatId}`).emit(event, payload);
  }

  @SubscribeMessage('join_chat')
  handleJoinChat(@MessageBody() data: { chatId: string }, @ConnectedSocket() socket: Socket) {
    const userId = socket.data?.userId;
    if (!userId || !data?.chatId) return;
    socket.join(`chat:${data.chatId}`);
    this.logger.log(`User ${userId} joined chat:${data.chatId}`);
  }

  @SubscribeMessage('leave_chat')
  handleLeaveChat(@MessageBody() data: { chatId: string }, @ConnectedSocket() socket: Socket) {
    if (data?.chatId) socket.leave(`chat:${data.chatId}`);
  }

  /** Relay typing indicator to other chat participants */
  @SubscribeMessage('typing')
  handleTyping(@MessageBody() data: { chatId: string }, @ConnectedSocket() socket: Socket) {
    const userId = socket.data?.userId;
    if (!userId || !data?.chatId) return;
    // Emit to the chat room excluding the sender
    socket.to(`chat:${data.chatId}`).emit('user_typing', { userId, chatId: data.chatId });
  }

  /** Relay stop-typing to other chat participants */
  @SubscribeMessage('stop_typing')
  handleStopTyping(@MessageBody() data: { chatId: string }, @ConnectedSocket() socket: Socket) {
    const userId = socket.data?.userId;
    if (!userId || !data?.chatId) return;
    socket.to(`chat:${data.chatId}`).emit('user_stop_typing', { userId, chatId: data.chatId });
  }
}
