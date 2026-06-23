import { Injectable } from '@nestjs/common';
import { IPaymentProvider } from '../payment.interface';

/**
 * Razorpay payment provider.
 * TODO: implement with Razorpay SDK in Phase 2.
 */
@Injectable()
export class RazorpayPaymentProvider implements IPaymentProvider {
  async createOrder(
    _options: Parameters<IPaymentProvider['createOrder']>[0],
  ): ReturnType<IPaymentProvider['createOrder']> {
    throw new Error('Razorpay payment provider not yet implemented.');
  }

  async verifyPayment(
    _options: Parameters<IPaymentProvider['verifyPayment']>[0],
  ): Promise<boolean> {
    throw new Error('Razorpay payment provider not yet implemented.');
  }
}
