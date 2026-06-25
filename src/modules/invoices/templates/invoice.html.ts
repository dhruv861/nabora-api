// Invoice HTML template — Sprint 7
// Produces a clean, professional A4-printable invoice matching the Nabora spec wireframe.

export function renderInvoiceHtml(invoice: {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  status: string;
  employerName: string;
  employerAddress?: string | null;
  employerGstin?: string | null;
  workerName: string;
  workerPhone: string;
  workerUpiId?: string | null;
  workerPan?: string | null;
  jobTitle: string;
  eventName?: string | null;
  workDate: Date;
  checkInTime?: Date | null;
  checkOutTime?: Date | null;
  totalHours?: number | null;
  subtotal: number;
  platformFee: number;
  gstApplicable: boolean;
  gstRate: number;
  gstAmount: number;
  tdsApplicable: boolean;
  tdsRate: number;
  tdsAmount: number;
  totalPayable: number;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  paymentDate?: Date | null;
  notes?: string | null;
  lineItems?: { description: string; quantity: number; unit: string; rate: number; amount: number }[];
}): string {
  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtTime = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtAmount = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

  const lineItemsHtml = (invoice.lineItems ?? []).map((item) => `
    <tr>
      <td style="padding:8px 4px">${item.description}</td>
      <td style="padding:8px 4px;text-align:center">${item.quantity} ${item.unit.toLowerCase()}</td>
      <td style="padding:8px 4px;text-align:right">${fmtAmount(item.rate)}</td>
      <td style="padding:8px 4px;text-align:right;font-weight:600">${fmtAmount(item.amount)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111; background: #fff; }
    .page { max-width: 780px; margin: 0 auto; padding: 48px 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: 900; color: #6c47ff; letter-spacing: -1px; }
    .invoice-meta { text-align: right; }
    .invoice-meta .inv-number { font-size: 22px; font-weight: 800; color: #111; }
    .invoice-meta .status { display: inline-block; margin-top: 6px; padding: 3px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #fff3cd; color: #7d5a00; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
    .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.08em; margin-bottom: 8px; }
    .party-name { font-size: 16px; font-weight: 700; color: #111; margin-bottom: 4px; }
    .party-detail { font-size: 13px; color: #6b7280; line-height: 1.6; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.08em; margin-bottom: 12px; }
    .job-ref { background: #f9fafb; border-radius: 12px; padding: 16px; margin-bottom: 32px; }
    .job-ref-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .job-ref-item label { font-size: 11px; color: #9ca3af; display: block; margin-bottom: 2px; }
    .job-ref-item span { font-size: 13px; font-weight: 600; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.06em; padding: 0 4px 10px; border-bottom: 1px solid #e5e7eb; }
    thead th:not(:first-child) { text-align: right; }
    tbody tr:not(:last-child) td { border-bottom: 1px solid #f3f4f6; }
    .totals { margin-left: auto; width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .totals-row.total { border-top: 2px solid #111; margin-top: 8px; padding-top: 12px; font-size: 17px; font-weight: 800; }
    .totals-row .label { color: #6b7280; }
    .totals-row.total .label { color: #111; }
    .payment-section { background: #f9fafb; border-radius: 12px; padding: 16px; margin-top: 32px; }
    .footer { margin-top: 48px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo">nabora</div>
      <div style="font-size:12px;color:#9ca3af;margin-top:4px">nabora.in</div>
    </div>
    <div class="invoice-meta">
      <div class="inv-number">${invoice.invoiceNumber}</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px">Issued: ${fmt(invoice.invoiceDate)}</div>
      <div style="font-size:13px;color:#6b7280">Due: ${fmt(invoice.dueDate)}</div>
      <div class="status">${invoice.status}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">From (Employer)</div>
      <div class="party-name">${invoice.employerName}</div>
      ${invoice.employerAddress ? `<div class="party-detail">${invoice.employerAddress}</div>` : ''}
      ${invoice.employerGstin ? `<div class="party-detail">GSTIN: ${invoice.employerGstin}</div>` : ''}
    </div>
    <div>
      <div class="party-label">To (Worker)</div>
      <div class="party-name">${invoice.workerName}</div>
      <div class="party-detail">${invoice.workerPhone}</div>
      ${invoice.workerUpiId ? `<div class="party-detail">UPI: ${invoice.workerUpiId}</div>` : ''}
      ${invoice.workerPan ? `<div class="party-detail">PAN: ${invoice.workerPan}</div>` : ''}
    </div>
  </div>

  <hr class="divider">

  <div class="job-ref">
    <div class="section-title">Job Reference</div>
    <div style="font-size:15px;font-weight:700;margin-bottom:12px">${invoice.jobTitle}${invoice.eventName ? ` — ${invoice.eventName}` : ''}</div>
    <div class="job-ref-grid">
      <div class="job-ref-item"><label>Work Date</label><span>${fmt(invoice.workDate)}</span></div>
      <div class="job-ref-item"><label>Check-In</label><span>${fmtTime(invoice.checkInTime)}</span></div>
      <div class="job-ref-item"><label>Check-Out</label><span>${fmtTime(invoice.checkOutTime)}</span></div>
      ${invoice.totalHours != null ? `<div class="job-ref-item"><label>Total Hours</label><span>${invoice.totalHours}h</span></div>` : ''}
    </div>
  </div>

  <div class="section-title">Line Items</div>
  <table>
    <thead><tr><th style="text-align:left">Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
    <tbody>${lineItemsHtml}</tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span class="label">Subtotal</span><span>${fmtAmount(invoice.subtotal)}</span></div>
    <div class="totals-row"><span class="label">Platform Fee</span><span>${fmtAmount(invoice.platformFee)}</span></div>
    ${invoice.gstApplicable ? `<div class="totals-row"><span class="label">GST (${(invoice.gstRate * 100).toFixed(0)}%)</span><span>${fmtAmount(invoice.gstAmount)}</span></div>` : ''}
    ${invoice.tdsApplicable ? `<div class="totals-row"><span class="label">TDS deduction (${(invoice.tdsRate * 100).toFixed(1)}%)</span><span style="color:#dc2626">-${fmtAmount(invoice.tdsAmount)}</span></div>` : ''}
    <div class="totals-row total"><span class="label">Total Payable</span><span>${fmtAmount(invoice.totalPayable)}</span></div>
  </div>

  ${(invoice.paymentMethod || invoice.notes) ? `
  <div class="payment-section">
    ${invoice.paymentMethod ? `
      <div class="section-title">Payment</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        <div class="job-ref-item"><label>Method</label><span>${invoice.paymentMethod}</span></div>
        ${invoice.paymentReference ? `<div class="job-ref-item"><label>Reference</label><span>${invoice.paymentReference}</span></div>` : ''}
        ${invoice.paymentDate ? `<div class="job-ref-item"><label>Date</label><span>${fmt(invoice.paymentDate)}</span></div>` : ''}
      </div>
    ` : ''}
    ${invoice.notes ? `<div style="margin-top:12px;font-size:13px;color:#6b7280"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
  </div>
  ` : ''}

  <div class="footer">Generated by Nabora · nabora.in · This is a computer-generated invoice and does not require a physical signature.</div>
</div>
</body></html>`;
}
