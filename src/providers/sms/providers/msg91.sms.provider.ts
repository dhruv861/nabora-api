import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ISmsProvider } from '../sms.interface';

@Injectable()
export class Msg91SmsProvider implements ISmsProvider {
  constructor(private config: ConfigService) {}

  async sendOtp(phone: string, otp: string): Promise<void> {
    await axios.post('https://api.msg91.com/api/v5/otp', {
      authkey: this.config.get<string>('MSG91_AUTH_KEY'),
      mobile: `91${phone}`,
      otp,
      template_id: this.config.get<string>('MSG91_TEMPLATE_ID'),
      sender: this.config.get<string>('MSG91_SENDER_ID'),
    });
  }
}
