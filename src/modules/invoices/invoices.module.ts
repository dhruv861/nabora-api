import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePdfProcessor } from './processors/invoice-pdf.processor';
import { NotificationsModule } from '../notifications/notifications.module';

const PDF_QUEUE = 'invoice-pdf';

@Module({
  imports: [
    NotificationsModule,
    BullModule.registerQueue({ name: PDF_QUEUE }),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePdfProcessor],
  exports: [InvoicesService],
})
export class InvoicesModule {}
