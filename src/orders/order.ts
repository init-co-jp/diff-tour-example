export type OrderStatus = 'CART' | 'PENDING_PAYMENT' | 'PAID' | 'PAYMENT_FAILED';

export type Order = {
  id: string;
  customerId: string;
  /** In yen */
  totalAmount: number;
  status: OrderStatus;
  chargeId?: string;
  updatedAt: Date;
};

/**
 * Idempotency key for charging an order.
 * Checkout and the reconcile batch both query the payment service with this key, so always build it here.
 */
export function paymentKeyFor(order: Pick<Order, 'id'>): string {
  return `order-${order.id}`;
}
