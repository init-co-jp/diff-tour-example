import type { PaymentGateway } from '../payment/gateway.ts';
import { PaymentDeclinedError } from '../payment/gateway.ts';
import type { Order } from './order.ts';
import { paymentKeyFor } from './order.ts';
import type { OrderRepository } from './orderRepository.ts';

export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`order not found: ${orderId}`);
    this.name = 'OrderNotFoundError';
  }
}

export class InvalidOrderStateError extends Error {
  constructor(order: Order) {
    super(`order ${order.id} cannot be checked out in status ${order.status}`);
    this.name = 'InvalidOrderStateError';
  }
}

export class OrderService {
  #orders: OrderRepository;
  #payments: PaymentGateway;

  constructor(orders: OrderRepository, payments: PaymentGateway) {
    this.#orders = orders;
    this.#payments = payments;
  }

  async checkout(orderId: string): Promise<Order> {
    const order = await this.#orders.get(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (order.status !== 'CART' && order.status !== 'PAYMENT_FAILED') {
      throw new InvalidOrderStateError(order);
    }

    // Save "payment pending" before charging. If the same order comes in again (e.g. a double-clicked
    // button), the second request is rejected by the status check above. If the process dies midway,
    // the reconcile batch picks the order up
    order.status = 'PENDING_PAYMENT';
    await this.#orders.save(order);

    try {
      const { chargeId } = await this.#payments.charge({
        amount: order.totalAmount,
        currency: 'JPY',
        customerId: order.customerId,
        idempotencyKey: paymentKeyFor(order),
      });
      order.status = 'PAID';
      order.chargeId = chargeId;
    } catch (e) {
      if (e instanceof PaymentDeclinedError) {
        order.status = 'PAYMENT_FAILED';
        await this.#orders.save(order);
      }
      // On a payment service outage or timeout, we cannot tell here whether the charge went through.
      // Leave the order PENDING_PAYMENT and let the reconcile batch (jobs/reconcilePendingPayments) decide
      throw e;
    }

    await this.#orders.save(order);
    return order;
  }
}
