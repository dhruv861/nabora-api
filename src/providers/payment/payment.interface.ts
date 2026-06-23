export interface IPaymentProvider {
  createOrder(options: {
    amount: number;       // in paise (₹1 = 100 paise)
    currency: string;     // 'INR'
    receiptId: string;
    notes?: Record<string, string>;
  }): Promise<{ orderId: string; amount: number; currency: string }>;

  verifyPayment(options: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): Promise<boolean>;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
