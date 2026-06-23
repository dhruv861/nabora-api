import { IsOptional, IsString, IsNumber, Min, Max, IsBoolean, IsArray, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class JobFeedQueryDto {
  @ApiPropertyOptional({ description: 'Latitude for radius search' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude for radius search' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ default: 20, description: 'Radius in km (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  radius?: number = 20;

  @ApiPropertyOptional({ example: 'ahmedabad' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'promoter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  payMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  payMax?: number;

  @ApiPropertyOptional({ enum: ['HOUR', 'DAY', 'FIXED'] })
  @IsOptional()
  @IsString()
  payUnit?: string;

  @ApiPropertyOptional({ example: '2026-07-15' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ description: 'Base64-encoded cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['recommended', 'nearby', 'new', 'featured'] })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ description: 'Return only count (for filter preview)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  countOnly?: boolean;

  @ApiPropertyOptional({ description: 'Employer status filter for /my endpoint' })
  @IsOptional()
  @IsString()
  status?: string;
}
