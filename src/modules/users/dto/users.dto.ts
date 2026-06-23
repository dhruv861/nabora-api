import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AvailabilityStatus } from '../../../common/types/enums';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Rahul Sharma' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;

  @ApiPropertyOptional({ example: 'rahul@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'rahulsharma@okaxis' })
  @IsOptional()
  @IsString()
  upiId?: string;

  @ApiPropertyOptional({ enum: Object.values(AvailabilityStatus) })
  @IsOptional()
  @IsString()
  availabilityStatus?: string;
}

export class UpdateLocationDto {
  @ApiProperty({ example: 23.0469 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: 72.5058 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiPropertyOptional({ example: 'Ahmedabad' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'ahmedabad' })
  @IsOptional()
  @IsString()
  citySlug?: string;

  @ApiPropertyOptional({ example: 'Vastrapur' })
  @IsOptional()
  @IsString()
  area?: string;
}

export class CreateWorkerProfileDto {
  @ApiPropertyOptional({ example: 'Freelance Photographer & Event Promoter' })
  @IsOptional()
  @IsString()
  headline?: string;

  @ApiPropertyOptional({ example: 'photographer' })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsExp?: number;
}

export class UpdateWorkerProfileDto extends CreateWorkerProfileDto {}
