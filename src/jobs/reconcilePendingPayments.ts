import type { PaymentGateway } from '../payment/gateway.ts';
import { paymentKeyFor } from '../orders/order.ts';
import type { OrderRepository } from '../orders/orderRepository.ts';

/** PENDING_PAYMENT orders newer than this may still be mid-checkout, so leave them alone */
const SETTLE_AFTER_MS = 10 * 60 * 1000;

/**
 * Settles orders stuck in payment by checking them against the payment service's records.
 * Runs every 5 minutes.
 */
export async function reconcilePendingPayments(
  orders: OrderRepository,
  payments: PaymentGateway,
  now: Date = new Date(),
): Promise<void> {
  const stale = await orders.findByStatusUpdatedBefore(
    'PENDING_PAYMENT',
    new Date(now.getTime() - SETTLE_AFTER_MS),
  );

  for (const order of stale) {
    const charge = await payments.findCharge(paymentKeyFor(order));
    if (charge) {
      order.status = 'PAID';
      order.chargeId = charge.chargeId;
    } else {
      // No charge on record, so checking out again cannot double-charge the customer
      order.status = 'PAYMENT_FAILED';
    }
    await orders.save(order);
  }
}
