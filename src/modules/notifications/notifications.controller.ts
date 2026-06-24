import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { Inject } from '@nestjs/common';
import type { ICacheProvider } from '../../providers/cache/cache.interface';
import { CACHE_PROVIDER } from '../../providers/cache/cache.interface';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
  ) {}

  /** GET /v1/notifications — paginated list, optional unreadOnly filter */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get auth user's notifications" })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @Request() req: { user: { id: string } },
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const userId = req.user.id;
    const onlyUnread = unreadOnly === 'true';
    const take = Math.min(Number(limit) || 20, 50);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [total, notifications] = await Promise.all([
      this.prisma.notification.count({
        where: { userId, ...(onlyUnread ? { isRead: false } : {}) },
      }),
      this.prisma.notification.findMany({
        where: { userId, ...(onlyUnread ? { isRead: false } : {}) },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return {
      data: notifications,
      meta: { total, page: Number(page), limit: take, pages: Math.ceil(total / take) },
    };
  }

  /** GET /v1/notifications/unread-count — cached 30s */
  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread notification count (cached 30s)' })
  async unreadCount(@Request() req: { user: { id: string } }) {
    const cacheKey = `notif:unread:${req.user.id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached !== null && cached !== undefined) return { count: Number(cached) };

    const count = await this.prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    await this.cache.set(cacheKey, String(count), 30);
    return { count };
  }

  /** PATCH /v1/notifications/:id/read — mark one as read */
  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markOneRead(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    await this.prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true },
    });
    // Bust cache
    await this.cache.delete?.(`notif:unread:${req.user.id}`);
    return { success: true };
  }

  /** PATCH /v1/notifications/read-all — mark all as read */
  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@Request() req: { user: { id: string } }) {
    await this.prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    await this.cache.delete?.(`notif:unread:${req.user.id}`);
    return { success: true };
  }
}
