import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PDF_PROVIDER } from '../../../providers/pdf/pdf.interface';
import type { IPdfProvider } from '../../../providers/pdf/pdf.interface';
import { STORAGE_PROVIDER } from '../../../providers/storage/storage.interface';
import type { IStorageProvider } from '../../../providers/storage/storage.interface';
import { renderInvoiceHtml } from '../templates/invoice.html';

@Processor('invoice-pdf')
export class InvoicePdfProcessor {
  private readonly logger = new Logger(InvoicePdfProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PDF_PROVIDER) private readonly pdf: IPdfProvider,
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
  ) {}

  @Process('generate-pdf')
  async handleGeneratePdf(job: Job<{ invoiceId: string }>) {
    const { invoiceId } = job.data;
    this.logger.log(`Generating PDF for invoice ${invoiceId}`);

    try {
      const invoice = await this.prisma.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
        include: { lineItems: true },
      });

      const html = renderInvoiceHtml(invoice as any);
      const pdfBuffer = await this.pdf.generateFromHtml(html);

      const key = `invoices/${invoice.invoiceNumber}.pdf`;
      const pdfUrl = await this.storage.upload(key, pdfBuffer, 'application/pdf');

      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { pdfUrl },
      });

      this.logger.log(`PDF generated for invoice ${invoice.invoiceNumber} → ${pdfUrl}`);
    } catch (err) {
      this.logger.error(`PDF generation failed for invoice ${invoiceId}`, err);
      throw err; // Bull retries
    }
  }
}
