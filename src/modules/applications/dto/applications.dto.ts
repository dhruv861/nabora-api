import {
  IsOptional,
  IsString,
  MaxLength,
  IsIn,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '../../../common/types/enums';

export class ApplyJobDto {
  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  coverNote?: string;
}

export class UpdateApplicationStatusDto {
  @ApiPropertyOptional({ enum: ['SHORTLISTED', 'REJECTED'] })
  @IsString()
  @IsIn(['SHORTLISTED', 'REJECTED'])
  status: 'SHORTLISTED' | 'REJECTED';
}

export class ListApplicationsQueryDto {
  @ApiPropertyOptional({ enum: Object.values(ApplicationStatus) })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
