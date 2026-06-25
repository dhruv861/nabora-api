import {
  IsString, IsIn, IsOptional, IsBoolean, IsNumber, IsDateString, IsInt, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  gstApplicable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gstRate?: number;
}

export class MarkPaidDto {
  @ApiProperty({ enum: ['UPI', 'CASH', 'BANK_TRANSFER'] })
  @IsString()
  @IsIn(['UPI', 'CASH', 'BANK_TRANSFER'])
  paymentMethod: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentProofUrl?: string;
}

export class ListInvoicesQueryDto {
  @ApiPropertyOptional({ enum: ['WORKER', 'EMPLOYER'] })
  @IsOptional()
  @IsString()
  role?: 'WORKER' | 'EMPLOYER';

  @ApiPropertyOptional()
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
