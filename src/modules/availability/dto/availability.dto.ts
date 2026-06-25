import {
  IsDateString, IsBoolean, IsOptional, IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpsertAvailabilityDto {
  @ApiProperty({ example: '2025-07-20', description: 'Date in YYYY-MM-DD format' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Type(() => Boolean)
  isAvailable: boolean;
}

export class GetAvailabilityQueryDto {
  @ApiPropertyOptional({ example: '2025-07-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2025-07-31' })
  @IsOptional()
  @IsString()
  to?: string;
}
