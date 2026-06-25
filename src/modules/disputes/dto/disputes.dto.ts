import {
  IsString, IsIn, IsOptional, MaxLength, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDisputeDto {
  @ApiProperty({ enum: ['WORKER_NO_SHOW', 'ATTENDANCE_DISPUTE', 'PAYMENT_DISPUTE', 'FRAUDULENT_REVIEW'] })
  @IsString()
  @IsIn(['WORKER_NO_SHOW', 'ATTENDANCE_DISPUTE', 'PAYMENT_DISPUTE', 'FRAUDULENT_REVIEW'])
  type: string;

  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;
}

export class AddEvidenceDto {
  @ApiProperty() @IsString() fileUrl: string;
  @ApiProperty({ enum: ['IMAGE', 'GPS_LOG', 'CHAT_EXPORT'] })
  @IsString() @IsIn(['IMAGE', 'GPS_LOG', 'CHAT_EXPORT']) fileType: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class ResolveDisputeDto {
  @ApiProperty({ enum: ['UNDER_REVIEW', 'RESOLVED', 'REJECTED'] })
  @IsString()
  @IsIn(['UNDER_REVIEW', 'RESOLVED', 'REJECTED'])
  status: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) resolution?: string;
}
