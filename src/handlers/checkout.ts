import { InvalidOrderStateError, OrderNotFoundError } from '../orders/orderService.ts';
import type { OrderService } from '../orders/orderService.ts';
import { PaymentDeclinedError, PaymentTimeoutError, PaymentUnavailableError } from '../payment/gateway.ts';

export type HttpResult = {
  status: number;
  body: unknown;
};

export async function handleCheckout(service: OrderService, orderId: string): Promise<HttpResult> {
  try {
    const order = await service.checkout(orderId);
    return { status: 200, body: { orderId: order.id, status: order.status } };
  } catch (e) {
    if (e instanceof OrderNotFoundError) {
      return { status: 404, body: { error: 'order_not_found' } };
    }
    if (e instanceof InvalidOrderStateError) {
      return { status: 409, body: { error: 'invalid_order_state' } };
    }
    if (e instanceof PaymentDeclinedError) {
      return { status: 402, body: { error: 'payment_declined', reason: e.reason } };
    }
    if (e instanceof PaymentUnavailableError || e instanceof PaymentTimeoutError) {
      return {
        status: 502,
        body: {
          error: 'payment_failed',
          message: 'Payment failed. Please try again in a little while.',
        },
      };
    }
    throw e;
  }
}
