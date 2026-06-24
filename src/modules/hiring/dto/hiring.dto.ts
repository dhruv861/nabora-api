import {
  IsNumber,
  IsIn,
  IsOptional,
  IsDateString,
  Min,
  IsString,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HireStatus } from '../../../common/types/enums';

export class HireApplicationDto {
  @ApiProperty({ example: 600 })
  @IsNumber()
  @Min(1)
  agreedRate: number;

  @ApiProperty({ enum: ['HOUR', 'DAY', 'FIXED'] })
  @IsString()
  @IsIn(['HOUR', 'DAY', 'FIXED'])
  agreedUnit: 'HOUR' | 'DAY' | 'FIXED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endTime?: string;
}

export class ListHiresQueryDto {
  @ApiProperty({ enum: ['WORKER', 'EMPLOYER'] })
  @IsString()
  @IsIn(['WORKER', 'EMPLOYER'])
  role: 'WORKER' | 'EMPLOYER';

  @ApiPropertyOptional({ enum: Object.values(HireStatus) })
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
