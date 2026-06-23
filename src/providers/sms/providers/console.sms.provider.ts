import { Injectable, Logger } from '@nestjs/common';
import { ISmsProvider } from '../sms.interface';

/**
 * Prints OTP to console. Use only in local development without Firebase.
 */
@Injectable()
export class ConsoleSmsProvider implements ISmsProvider {
  private readonly logger = new Logger('ConsoleSmsProvider');

  async sendOtp(phone: string, otp: string): Promise<void> {
    this.logger.warn(`[DEV OTP] Phone: +91${phone} | OTP: ${otp}`);
  }
}
