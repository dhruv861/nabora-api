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
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { SendMessageDto, MessageCursorQueryDto } from './dto/chat.dto';

class CreateChatDto {
  @ApiProperty() @IsString() recipientId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jobId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hireId?: string;
}

@ApiTags('chat')
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** GET /v1/chats */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List caller's chats with last message and unread info" })
  listChats(@Request() req: { user: { id: string } }) {
    return this.chatService.listChats(req.user.id);
  }

  /** GET /v1/chats/:id/messages */
  @Get(':id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cursor-paginated messages for a chat' })
  getMessages(
    @Param('id') chatId: string,
    @Request() req: { user: { id: string } },
    @Query() query: MessageCursorQueryDto,
  ) {
    return this.chatService.getMessages(chatId, req.user.id, query);
  }

  /** POST /v1/chats — create or get existing chat between two users */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or get existing chat between two users' })
  createOrGetChat(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateChatDto,
  ) {
    return this.chatService.createOrGetChat(req.user.id, dto.recipientId, dto.jobId, dto.hireId);
  }

  /** POST /v1/chats/:id/messages */
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

  /** PATCH /v1/chats/:id/read */
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
