import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { SendMessageDto, MessageCursorQueryDto } from './dto/chat.dto';

@ApiTags('chat')
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List caller's chats with last message and unread info" })
  listChats(@Request() req: { user: { id: string } }) {
    return this.chatService.listChats(req.user.id);
  }

  @Get(':id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cursor-paginated messages for a chat (newest first)' })
  getMessages(
    @Param('id') chatId: string,
    @Request() req: { user: { id: string } },
    @Query() query: MessageCursorQueryDto,
  ) {
    return this.chatService.getMessages(chatId, req.user.id, query);
  }

  @Post(':id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a message to a chat' })
  sendMessage(
    @Param('id') chatId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(chatId, req.user.id, dto);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all messages in a chat as read' })
  markRead(
    @Param('id') chatId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.chatService.markRead(chatId, req.user.id);
  }
}
