import { IsString, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '9876543210', description: 'Indian 10-digit mobile number' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, { message: 'phone must be a valid 10-digit Indian mobile number' })
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, { message: 'phone must be a valid 10-digit Indian mobile number' })
  phone: string;

  @ApiProperty({ example: '482910', description: '6-digit OTP' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'otp must be a 6-digit number' })
  otp: string;
}

export class VerifyFirebaseTokenDto {
  @ApiProperty({ description: 'Firebase ID token from client' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
