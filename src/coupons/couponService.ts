import type { Order } from '../orders/order.ts';
import type { OrderRepository } from '../orders/orderRepository.ts';
import { InvalidOrderStateError, OrderNotFoundError } from '../orders/orderService.ts';
import { CouponExpiredError, CouponNotFoundError, CouponUsedUpError } from './coupon.ts';
import type { SqliteCouponRepository } from './sqliteCouponRepository.ts';

export class CouponService {
  #coupons: SqliteCouponRepository;
  #orders: OrderRepository;
  #now: () => Date;

  constructor(coupons: SqliteCouponRepository, orders: OrderRepository, now: () => Date = () => new Date()) {
    this.#coupons = coupons;
    this.#orders = orders;
    this.#now = now;
  }

  async apply(orderId: string, code: string): Promise<Order> {
    const order = await this.#orders.get(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (order.status !== 'CART' && order.status !== 'PAYMENT_FAILED') {
      throw new InvalidOrderStateError(order);
    }

    const coupon = await this.#coupons.get(code);
    if (!coupon) throw new CouponNotFoundError(code);
    if (coupon.expiresAt <= this.#now()) throw new CouponExpiredError(code);
    if (!(await this.#coupons.consumeUse(code))) throw new CouponUsedUpError(code);

    order.couponCode = code;
    // Keep the amount charged from going negative when the discount exceeds the order total
    order.discountAmount = Math.min(coupon.discountAmount, order.totalAmount);
    await this.#orders.save(order);
    return order;
  }
}
