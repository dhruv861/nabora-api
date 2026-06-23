import { Injectable, Logger } from '@nestjs/common';
import { IEmailProvider } from '../email.interface';

/**
 * Prints email to console in development. Zero setup.
 */
@Injectable()
export class ConsoleEmailProvider implements IEmailProvider {
  private readonly logger = new Logger('ConsoleEmailProvider');

  async send(options: { to: string; subject: string; html: string }): Promise<void> {
    this.logger.log(`[DEV EMAIL] To: ${options.to} | Subject: ${options.subject}`);
  }
}
