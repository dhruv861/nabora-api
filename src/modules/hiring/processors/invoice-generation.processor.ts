import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InvoicesService } from '../../invoices/invoices.service';

/**
 * Invoice Generation Processor — Sprint 7 (real implementation).
 * Replaces the Sprint 3 placeholder stub.
 * Delegates to InvoicesService.generateForHire() which creates real
 * financials, line items, and enqueues PDF generation.
 */
@Processor('invoice-generation')
export class InvoiceGenerationProcessor {
  private readonly logger = new Logger(InvoiceGenerationProcessor.name);

  constructor(private readonly invoicesService: InvoicesService) {}

  @Process('generate')
  async handleGenerate(job: Job<{ hireId: string }>) {
    const { hireId } = job.data;
    this.logger.log(`[invoice-generation] delegating to InvoicesService for hireId=${hireId}`);
    try {
      await this.invoicesService.generateForHire(hireId);
    } catch (err) {
      this.logger.error(`Invoice generation failed for hireId=${hireId}`, err);
      throw err;
    }
  }
}
