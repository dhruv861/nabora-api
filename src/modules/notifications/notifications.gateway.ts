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
  cors: { origin: '*', credentials: true },
  namespace: '/',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  // Map userId -> Set<socketId> (one user can have multiple tabs/devices)
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(socket: Socket) {
    try {
      const token =
        (socket.handshake.auth?.token as string) ??
        (socket.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) {
        socket.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: string }>(token);
      const userId = payload.sub;

      socket.data.userId = userId;

      // Join a room keyed by userId — used for targeted emits
      socket.join(`user:${userId}`);

      // Track socket ID
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      this.logger.log(`User ${userId} connected (socket ${socket.id})`);
    } catch {
      this.logger.warn(`Rejected unauthenticated socket ${socket.id}`);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = socket.data?.userId as string | undefined;
    if (userId) {
      this.userSockets.get(userId)?.delete(socket.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
      this.logger.log(`User ${userId} disconnected (socket ${socket.id})`);
    }
  }

  /**
   * Emit an event to all sockets belonging to userId.
   * Safe to call even if the user is offline — emits to an empty room.
   */
  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  /**
   * Emit a new_message event to all participants of a chat room.
   * Called by ChatService after persisting the message.
   */
  emitToChat(chatId: string, event: string, payload: unknown) {
    this.server.to(`chat:${chatId}`).emit(event, payload);
  }

  /** Client joins a specific chat room to receive real-time messages. */
  @SubscribeMessage('join_chat')
  handleJoinChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = socket.data?.userId;
    if (!userId || !data?.chatId) return;
    socket.join(`chat:${data.chatId}`);
    this.logger.log(`User ${userId} joined chat room ${data.chatId}`);
  }

  /** Client leaves a chat room (optional — happens automatically on disconnect). */
  @SubscribeMessage('leave_chat')
  handleLeaveChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    if (data?.chatId) socket.leave(`chat:${data.chatId}`);
  }
}
