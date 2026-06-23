import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ISmsProvider } from '../sms.interface';

/**
 * Twilio SMS provider.
 * NOTE: Install the twilio package only when switching to this provider:
 *   npm install twilio
 */
@Injectable()
export class TwilioSmsProvider implements ISmsProvider {
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromPhone: string;

  constructor(private config: ConfigService) {
    this.accountSid = config.get<string>('TWILIO_ACCOUNT_SID', '');
    this.authToken = config.get<string>('TWILIO_AUTH_TOKEN', '');
    this.fromPhone = config.get<string>('TWILIO_PHONE_NUMBER', '');
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    // Using Twilio REST API directly to avoid requiring the twilio npm package
    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      new URLSearchParams({
        Body: `Your Nabora OTP is ${otp}. Valid for 5 minutes.`,
        From: this.fromPhone,
        To: `+91${phone}`,
      }).toString(),
      {
        auth: { username: this.accountSid, password: this.authToken },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
  }
}
