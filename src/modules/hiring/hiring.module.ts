import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HiringController } from './hiring.controller';
import { HiringService } from './hiring.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvoiceGenerationProcessor } from './processors/invoice-generation.processor';

const INVOICE_QUEUE = 'invoice-generation';

@Module({
  imports: [
    NotificationsModule,
    BullModule.registerQueue({ name: INVOICE_QUEUE }),
  ],
  controllers: [HiringController],
  providers: [HiringService, InvoiceGenerationProcessor],
  exports: [HiringService],
})
export class HiringModule {}
