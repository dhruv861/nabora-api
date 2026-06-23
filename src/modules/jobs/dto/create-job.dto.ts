import {
  IsString, IsNumber, IsPositive, IsDateString, IsOptional,
  IsArray, MinLength, MaxLength, Min, IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({ example: 'Brand Activation Promoter Required', minLength: 5 })
  @IsString()
  @MinLength(5, { message: 'Title must be at least 5 characters (aim for 5+ words)' })
  title: string;

  @ApiProperty({ minLength: 100 })
  @IsString()
  @MinLength(100, { message: 'Description must be at least 100 characters' })
  description: string;

  @ApiProperty({ maxLength: 160 })
  @IsString()
  @MaxLength(160)
  shortDescription: string;

  @ApiProperty({ example: 'Promoter' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'promoter' })
  @IsString()
  categorySlug: string;

  @ApiProperty({ example: 'Ahmedabad' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'ahmedabad' })
  @IsString()
  citySlug: string;

  @ApiProperty({ example: 'Navrangpura', minLength: 2 })
  @IsString()
  @MinLength(2, { message: 'Area is required' })
  area: string;

  @ApiProperty({ example: 23.0225 })
  @IsNumber()
  locationLat: number;

  @ApiProperty({ example: 72.5714 })
  @IsNumber()
  locationLng: number;

  @ApiProperty({ example: 800 })
  @IsNumber()
  @IsPositive()
  payRate: number;

  @ApiProperty({ enum: ['HOUR', 'DAY', 'FIXED'] })
  @IsString()
  @IsIn(['HOUR', 'DAY', 'FIXED'])
  payUnit: string;

  @ApiProperty({ example: '2026-07-15T09:00:00Z' })
  @IsDateString()
  workDate: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  workDateEnd?: string;

  @ApiProperty({ example: 3, minimum: 1 })
  @IsNumber()
  @Min(1)
  vacancies: number;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  skillIds?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  eventId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  eventRoleId?: string;
}

export class UpdateJobDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(160)
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  area?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  locationLat?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  locationLng?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  payRate?: number;

  @ApiPropertyOptional({ enum: ['HOUR', 'DAY', 'FIXED'] })
  @IsString()
  @IsIn(['HOUR', 'DAY', 'FIXED'])
  @IsOptional()
  payUnit?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  workDate?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(1)
  vacancies?: number;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  skillIds?: string[];
}
