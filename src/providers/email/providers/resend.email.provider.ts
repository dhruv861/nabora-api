import { Injectable } from '@nestjs/common';
import { IEmailProvider } from '../email.interface';

/**
 * Resend.com — modern email API, generous free tier (3000 emails/month).
 * TODO: implement with Resend SDK in Phase 2.
 */
@Injectable()
export class ResendEmailProvider implements IEmailProvider {
  async send(_options: { to: string; subject: string; html: string }): Promise<void> {
    throw new Error('Resend email provider not yet implemented. Set EMAIL_PROVIDER=console for development.');
  }
}
