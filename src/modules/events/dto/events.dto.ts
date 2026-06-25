import {
  IsString, IsOptional, IsNumber, IsDateString, IsIn, IsArray,
  ValidateNested, Min, MinLength, IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty() @IsString() @MinLength(2) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsString() venue: string;
  @ApiProperty() @IsString() city: string;
  @ApiProperty() @IsString() citySlug: string;
  @ApiProperty() @IsNumber() locationLat: number;
  @ApiProperty() @IsNumber() locationLng: number;
  @ApiProperty() @IsDateString() startDate: string;
  @ApiProperty() @IsDateString() endDate: string;
}

export class UpdateEventDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() venue?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
}

export class UpdateEventStatusDto {
  @ApiProperty({ enum: ['ONGOING', 'COMPLETED', 'CANCELLED'] })
  @IsString()
  @IsIn(['ONGOING', 'COMPLETED', 'CANCELLED'])
  status: string;
}

export class EventRoleDto {
  @ApiProperty() @IsString() @MinLength(2) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsInt() @Min(1) vacancies: number;
  @ApiProperty() @IsNumber() @Min(1) payRate: number;
  @ApiProperty({ enum: ['HOUR', 'DAY', 'FIXED'] }) @IsString() @IsIn(['HOUR', 'DAY', 'FIXED']) payUnit: string;
}

export class AddRolesDto {
  @ApiProperty({ type: [EventRoleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventRoleDto)
  roles: EventRoleDto[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) vacancies?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) payRate?: number;
  @ApiPropertyOptional({ enum: ['HOUR', 'DAY', 'FIXED'] }) @IsOptional() @IsString() payUnit?: string;
}

export class ListEventsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number = 20;
}

export class BulkHireItemDto {
  @ApiProperty() @IsString() applicationId: string;
  @ApiProperty() @IsNumber() @Min(1) agreedRate: number;
  @ApiProperty({ enum: ['HOUR', 'DAY', 'FIXED'] }) @IsString() @IsIn(['HOUR', 'DAY', 'FIXED']) agreedUnit: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endTime?: string;
}

export class BulkHireDto {
  @ApiProperty({ type: [BulkHireItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkHireItemDto)
  hires: BulkHireItemDto[];
}
