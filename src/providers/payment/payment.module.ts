import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PAYMENT_PROVIDER, IPaymentProvider } from './payment.interface';
import { RazorpayPaymentProvider } from './providers/razorpay.payment.provider';
import { PhonePePaymentProvider } from './providers/phonepe.payment.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (config: ConfigService): IPaymentProvider => {
        const provider = config.get<string>('PAYMENT_PROVIDER', 'razorpay');
        switch (provider) {
          case 'phonepe':
            return new PhonePePaymentProvider();
          case 'razorpay':
          default:
            return new RazorpayPaymentProvider();
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentModule {}
