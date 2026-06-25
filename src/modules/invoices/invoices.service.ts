import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { STORAGE_PROVIDER, IStorageProvider } from '../../providers/storage/storage.interface';
import { UpdateInvoiceDto, MarkPaidDto, ListInvoicesQueryDto } from './dto/invoices.dto';
import { renderInvoiceHtml } from './templates/invoice.html';

const PDF_QUEUE = 'invoice-pdf';

async function generateInvoiceNumber(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({
    where: { invoiceNumber: { startsWith: `NAB-${year}-` } },
  });
  return `NAB-${year}-${String(count + 1).padStart(5, '0')}`;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @InjectQueue(PDF_QUEUE) private readonly pdfQueue: Queue,
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
  ) {}

  // ── generateForHire (called by Bull processor, replaces Sprint 3 stub) ─────
  async generateForHire(hireId: string): Promise<void> {
    const hire = await this.prisma.hire.findUnique({
      where: { id: hireId },
      include: {
        job: { select: { title: true, organizationId: true, eventId: true, event: { select: { title: true } } } },
        worker: { select: { id: true, name: true, phone: true, panNumber: true, upiId: true } },
        employer: { select: { id: true, name: true, gstin: true } },
        attendance: {
          where: { status: 'CHECKED_OUT' },
          orderBy: { workDate: 'asc' },
          take: 1,
        },
      },
    });
    if (!hire) { this.logger.error(`Hire ${hireId} not found`); return; }

    const existing = await this.prisma.invoice.findUnique({ where: { hireId } });

    // Skip if already finalized
    if (existing && existing.subtotal > 0) {
      this.logger.log(`Invoice for hire ${hireId} already generated — skipping`);
      return;
    }

    const attendance = hire.attendance[0];
    const totalHours = attendance?.totalHours ?? 0;
    const quantity = hire.agreedUnit === 'HOUR' ? totalHours : 1;
    const subtotal = quantity * hire.agreedRate;
    const platformFee = 99;
    const gstApplicable = !!(hire.employer as any).gstin;
    const gstRate = 0.18;
    const gstAmount = gstApplicable ? +(subtotal * gstRate).toFixed(2) : 0;
    const tdsApplicable = !!(hire.worker.panNumber) && subtotal > 30000;
    const tdsRate = tdsApplicable ? 0.01 : 0;
    const tdsAmount = tdsApplicable ? +(subtotal * tdsRate).toFixed(2) : 0;
    const totalPayable = +(subtotal + platformFee + gstAmount - tdsAmount).toFixed(2);
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invoiceNumber = existing?.invoiceNumber ?? await generateInvoiceNumber(this.prisma);

    const invoiceData = {
      invoiceNumber,
      hireId,
      status: 'PENDING',
      dueDate,
      employerName: hire.employer.name ?? 'Employer',
      employerGstin: (hire.employer as any).gstin ?? null,
      employerOrgId: hire.job.organizationId ?? null,
      workerName: hire.worker.name ?? 'Worker',
      workerPhone: hire.worker.phone,
      workerPan: hire.worker.panNumber ?? null,
      workerUpiId: hire.worker.upiId ?? null,
      jobTitle: hire.job.title,
      eventName: hire.job.event?.title ?? null,
      workDate: attendance?.workDate ?? new Date(),
      checkInTime: attendance?.checkInTime ?? null,
      checkOutTime: attendance?.checkOutTime ?? null,
      totalHours: attendance?.totalHours ?? null,
      subtotal,
      platformFee,
      gstApplicable,
      gstRate,
      gstAmount,
      tdsApplicable,
      tdsRate,
      tdsAmount,
      totalPayable,
      generatedBy: 'PLATFORM',
    };

    const invoice = await this.prisma.invoice.upsert({
      where: { hireId },
      create: {
        ...invoiceData,
        lineItems: {
          create: [{
            description: `${hire.job.title}${hire.job.event ? ` — ${hire.job.event.title}` : ''}`,
            quantity,
            unit: hire.agreedUnit,
            rate: hire.agreedRate,
            amount: subtotal,
          }],
        },
      },
      update: {
        ...invoiceData,
        lineItems: { deleteMany: {}, create: [{
          description: `${hire.job.title}`,
          quantity,
          unit: hire.agreedUnit,
          rate: hire.agreedRate,
          amount: subtotal,
        }] },
      },
    });

    // Enqueue PDF generation
    await this.pdfQueue.add('generate-pdf', { invoiceId: invoice.id }, { attempts: 3, backoff: 10000 });

    // Notify both parties
    this.notifications.notify(
      hire.worker.id, 'INVOICE_GENERATED', 'Invoice Generated',
      `Invoice ${invoiceNumber} for \u20b9${totalPayable} is ready.`,
      { invoiceId: invoice.id, hireId },
    ).catch(() => {});
    this.notifications.notify(
      hire.employer.id, 'INVOICE_GENERATED', 'Invoice Ready',
      `Invoice ${invoiceNumber} for ${hire.worker.name ?? 'worker'} is ready to review.`,
      { invoiceId: invoice.id, hireId },
    ).catch(() => {});
  }

  // ── REST endpoints ────────────────────────────────────────────────────

  private async assertAccess(invoiceId: string, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        hire: { select: { workerId: true, employerId: true } },
        lineItems: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.hire.workerId !== userId && invoice.hire.employerId !== userId)
      throw new ForbiddenException('Access denied');
    return invoice;
  }

  async list(userId: string, query: ListInvoicesQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const roleFilter = query.role === 'WORKER'
      ? { hire: { workerId: userId } }
      : query.role === 'EMPLOYER'
      ? { hire: { employerId: userId } }
      : { hire: { OR: [{ workerId: userId }, { employerId: userId }] } };

    const where = {
      ...roleFilter,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          hire: {
            select: {
              workerId: true, employerId: true,
              worker: { select: { id: true, name: true } },
              employer: { select: { id: true, name: true } },
              job: { select: { title: true } },
            },
          },
        },
      }),
    ]);

    return { data: invoices, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(invoiceId: string, userId: string) {
    return this.assertAccess(invoiceId, userId);
  }

  async update(invoiceId: string, userId: string, dto: UpdateInvoiceDto) {
    const invoice = await this.assertAccess(invoiceId, userId);
    if (invoice.hire.employerId !== userId)
      throw new ForbiddenException('Only the employer can edit the invoice');
    if (!['DRAFT', 'PENDING'].includes(invoice.status))
      throw new ConflictException('Invoice can only be edited in DRAFT or PENDING status');

    // Recompute totals if GST changed
    let gstAmount = invoice.gstAmount;
    let totalPayable = invoice.totalPayable;
    if (dto.gstApplicable !== undefined || dto.gstRate !== undefined) {
      const gstApplicable = dto.gstApplicable ?? invoice.gstApplicable;
      const gstRate = dto.gstRate ?? invoice.gstRate;
      gstAmount = gstApplicable ? +(invoice.subtotal * gstRate).toFixed(2) : 0;
      totalPayable = +(invoice.subtotal + invoice.platformFee + gstAmount - invoice.tdsAmount).toFixed(2);
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        notes: dto.notes,
        gstApplicable: dto.gstApplicable,
        gstRate: dto.gstRate,
        gstAmount,
        totalPayable,
      },
    });
  }

  async send(invoiceId: string, userId: string) {
    const invoice = await this.assertAccess(invoiceId, userId);
    if (invoice.hire.employerId !== userId)
      throw new ForbiddenException('Only the employer can send the invoice');

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'SENT' },
    });

    this.notifications.notify(
      invoice.hire.workerId, 'INVOICE_GENERATED', 'Invoice Sent',
      `Your invoice ${invoice.invoiceNumber} has been sent by the employer.`,
      { invoiceId },
    ).catch(() => {});

    return updated;
  }

  async markPaid(invoiceId: string, userId: string, dto: MarkPaidDto) {
    const invoice = await this.assertAccess(invoiceId, userId);
    if (invoice.hire.employerId !== userId)
      throw new ForbiddenException('Only the employer can mark as paid');
    if (!['PENDING', 'SENT'].includes(invoice.status))
      throw new ConflictException('Invoice must be in PENDING or SENT status to mark as paid');

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        paymentProofUrl: dto.paymentProofUrl,
      },
    });
  }

  async getPdfUrl(invoiceId: string, userId: string): Promise<{ url?: string; generating?: boolean }> {
    const invoice = await this.assertAccess(invoiceId, userId);

    if (invoice.pdfUrl) {
      // Extract key from URL (stored as full URL or just key)
      const key = invoice.pdfUrl.startsWith('http')
        ? `invoices/${invoice.invoiceNumber}.pdf`
        : invoice.pdfUrl;
      const url = await this.storage.getSignedUrl(key, 3600);
      return { url };
    }

    // PDF not yet generated — trigger generation
    await this.pdfQueue.add('generate-pdf', { invoiceId }, { attempts: 3, backoff: 10000 });
    return { generating: true };
  }
}
