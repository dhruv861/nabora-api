import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Invoice Generation Processor — Sprint 3 stub.
 * Logs the payload and creates a placeholder Invoice row with status PENDING.
 * Sprint 7 will UPDATE this row (not INSERT) with the real PDF/GST/TDS data.
 */
@Processor('invoice-generation')
export class InvoiceGenerationProcessor {
  private readonly logger = new Logger(InvoiceGenerationProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('generate')
  async handleGenerate(job: Job<{ hireId: string }>) {
    const { hireId } = job.data;
    this.logger.log(`[invoice-generation] processing hireId=${hireId}`);

    try {
      // Bail out if invoice already exists (idempotency guard)
      const existing = await this.prisma.invoice.findUnique({ where: { hireId } });
      if (existing) {
        this.logger.log(`Invoice already exists for hireId=${hireId}, skipping`);
        return;
      }

      const hire = await this.prisma.hire.findUniqueOrThrow({
        where: { id: hireId },
        include: {
          job: { select: { title: true, eventId: true } },
          worker: { select: { name: true, phone: true, panNumber: true, upiId: true, bankAccount: true, bankIfsc: true } },
          employer: { select: { name: true } },
          attendance: { where: { status: 'CHECKED_OUT' }, orderBy: { workDate: 'asc' }, take: 1 },
        },
      });

      // Generate invoice number: NAB-YYYY-NNNNN
      const year = new Date().getFullYear();
      const count = await this.prisma.invoice.count();
      const invoiceNumber = `NAB-${year}-${String(count + 1).padStart(5, '0')}`;

      await this.prisma.invoice.create({
        data: {
          hireId,
          invoiceNumber,
          status: 'PENDING',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
          // Employer snapshot
          employerName: hire.employer.name ?? '',
          employerAddress: null,
          employerGstin: null,
          employerOrgId: null,
          // Worker snapshot
          workerName: hire.worker.name ?? '',
          workerPhone: hire.worker.phone,
          workerPan: hire.worker.panNumber ?? null,
          workerUpiId: hire.worker.upiId ?? null,
          workerBankAccount: hire.worker.bankAccount ?? null,
          workerIfsc: hire.worker.bankIfsc ?? null,
          // Job reference snapshot
          jobTitle: hire.job.title,
          eventName: null,
          workDate: hire.attendance[0]?.workDate ?? new Date(),
          checkInTime: hire.attendance[0]?.checkInTime ?? null,
          checkOutTime: hire.attendance[0]?.checkOutTime ?? null,
          totalHours: hire.attendance[0]?.totalHours ?? null,
          // Financial (zeroed — Sprint 7 will UPDATE these)
          subtotal: 0,
          platformFee: 99,
          gstApplicable: false,
          gstRate: 0.18,
          gstAmount: 0,
          tdsApplicable: false,
          tdsRate: 0,
          tdsAmount: 0,
          totalPayable: 0,
          generatedBy: 'PLATFORM',
        },
      });

      this.logger.log(`Placeholder invoice ${invoiceNumber} created for hireId=${hireId}`);
    } catch (err) {
      this.logger.error(`Failed to create placeholder invoice for hireId=${hireId}`, err);
      throw err; // re-throw so Bull retries
    }
  }
}
