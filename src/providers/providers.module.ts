import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmsModule } from './sms/sms.module';
import { StorageModule } from './storage/storage.module';
import { MapsModule } from './maps/maps.module';
import { CacheModule } from './cache/cache.module';
import { PdfModule } from './pdf/pdf.module';
import { EmailModule } from './email/email.module';
import { PaymentModule } from './payment/payment.module';

/**
 * Global providers module — imported once in AppModule.
 * All feature modules inject provider tokens directly via @Inject(TOKEN).
 *
 * Switching any provider:
 *   1. Change the relevant env variable (SMS_PROVIDER, STORAGE_PROVIDER, etc.)
 *   2. Add one new concrete class implementing the interface (if adding a new provider)
 *   3. Zero changes to business logic in feature modules
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    SmsModule,
    StorageModule,
    MapsModule,
    CacheModule,
    PdfModule,
    EmailModule,
    PaymentModule,
  ],
  exports: [
    SmsModule,
    StorageModule,
    MapsModule,
    CacheModule,
    PdfModule,
    EmailModule,
    PaymentModule,
  ],
})
export class ProvidersModule {}
