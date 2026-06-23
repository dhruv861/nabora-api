import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER, IEmailProvider } from './email.interface';
import { ConsoleEmailProvider } from './providers/console.email.provider';
import { ResendEmailProvider } from './providers/resend.email.provider';
import { NodemailerEmailProvider } from './providers/nodemailer.email.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useFactory: (config: ConfigService): IEmailProvider => {
        const provider = config.get<string>('EMAIL_PROVIDER', 'console');
        switch (provider) {
          case 'resend':
            return new ResendEmailProvider();
          case 'nodemailer':
            return new NodemailerEmailProvider();
          case 'console':
          default:
            return new ConsoleEmailProvider();
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
