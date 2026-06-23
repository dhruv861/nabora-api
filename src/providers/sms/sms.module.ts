import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SMS_PROVIDER, ISmsProvider } from './sms.interface';
import { FirebaseSmsProvider } from './providers/firebase.sms.provider';
import { Msg91SmsProvider } from './providers/msg91.sms.provider';
import { TwilioSmsProvider } from './providers/twilio.sms.provider';
import { ConsoleSmsProvider } from './providers/console.sms.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SMS_PROVIDER,
      useFactory: (config: ConfigService): ISmsProvider => {
        const provider = config.get<string>('SMS_PROVIDER', 'firebase');
        switch (provider) {
          case 'msg91':
            return new Msg91SmsProvider(config);
          case 'twilio':
            return new TwilioSmsProvider(config);
          case 'console':
            return new ConsoleSmsProvider();
          case 'firebase':
          default:
            return new FirebaseSmsProvider();
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [SMS_PROVIDER],
})
export class SmsModule {}
