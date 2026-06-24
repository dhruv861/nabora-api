import { IsString, IsOptional, IsIn, IsInt, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'See you at 9am!' })
  @IsString()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ enum: ['TEXT', 'IMAGE'], default: 'TEXT' })
  @IsOptional()
  @IsString()
  @IsIn(['TEXT', 'IMAGE'])
  type?: 'TEXT' | 'IMAGE' = 'TEXT';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

export class MessageCursorQueryDto {
  @ApiPropertyOptional({ description: 'Cursor (message ID) for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 30;
}
