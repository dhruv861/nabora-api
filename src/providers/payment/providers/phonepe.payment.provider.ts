import { Injectable } from '@nestjs/common';
import { IPaymentProvider } from '../payment.interface';

/**
 * PhonePe payment provider.
 * TODO: implement with PhonePe SDK in Phase 2.
 */
@Injectable()
export class PhonePePaymentProvider implements IPaymentProvider {
  async createOrder(
    _options: Parameters<IPaymentProvider['createOrder']>[0],
  ): ReturnType<IPaymentProvider['createOrder']> {
    throw new Error('PhonePe payment provider not yet implemented.');
  }

  async verifyPayment(
    _options: Parameters<IPaymentProvider['verifyPayment']>[0],
  ): Promise<boolean> {
    throw new Error('PhonePe payment provider not yet implemented.');
  }
}
