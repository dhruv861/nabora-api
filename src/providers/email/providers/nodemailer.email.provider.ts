import { Injectable } from '@nestjs/common';
import { IEmailProvider } from '../email.interface';

/**
 * SMTP via Nodemailer — use with Gmail, SendGrid, or self-hosted SMTP.
 * TODO: implement with Nodemailer in Phase 2.
 */
@Injectable()
export class NodemailerEmailProvider implements IEmailProvider {
  async send(_options: { to: string; subject: string; html: string }): Promise<void> {
    throw new Error('Nodemailer email provider not yet implemented. Set EMAIL_PROVIDER=console for development.');
  }
}
