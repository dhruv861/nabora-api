import { Injectable } from '@nestjs/common';
import { ISmsProvider } from '../sms.interface';

/**
 * Firebase handles OTP delivery client-side via Firebase JS SDK.
 * Backend only verifies the Firebase ID token — no SMS sent from here.
 */
@Injectable()
export class FirebaseSmsProvider implements ISmsProvider {
  async sendOtp(_phone: string, _otp: string): Promise<void> {
    // No-op: Firebase JS SDK on the frontend handles OTP delivery directly.
    // Backend receives and verifies the resulting Firebase ID token instead.
  }
}
