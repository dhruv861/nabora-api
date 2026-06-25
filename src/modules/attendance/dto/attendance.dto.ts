import { IsNumber, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckInDto {
  @ApiProperty() @IsNumber() lat: number;
  @ApiProperty() @IsNumber() lng: number;
  @ApiProperty() @IsString() selfieUrl: string;
}

export class CheckOutDto {
  @ApiProperty() @IsNumber() lat: number;
  @ApiProperty() @IsNumber() lng: number;
}

export class OverrideAttendanceDto {
  @ApiProperty({ enum: ['CHECKED_OUT', 'ABSENT', 'DISPUTED'] })
  @IsString()
  @IsIn(['CHECKED_OUT', 'ABSENT', 'DISPUTED'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
