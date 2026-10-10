import { CouponExpiredError, CouponNotFoundError, CouponUsedUpError } from '../coupons/coupon.ts';
import type { CouponService } from '../coupons/couponService.ts';
import { InvalidOrderStateError, OrderNotFoundError } from '../orders/orderService.ts';
import type { HttpResult } from './checkout.ts';

export async function handleApplyCoupon(service: CouponService, orderId: string, body: unknown): Promise<HttpResult> {
  const code = (body as { code?: unknown } | null)?.code;
  if (typeof code !== 'string' || code === '') {
    return { status: 400, body: { error: 'code_required' } };
  }
  try {
    const order = await service.apply(orderId, code);
    return { status: 200, body: { orderId: order.id, discountAmount: order.discountAmount } };
  } catch (e) {
    if (e instanceof OrderNotFoundError) return { status: 404, body: { error: 'order_not_found' } };
    if (e instanceof InvalidOrderStateError) return { status: 409, body: { error: 'invalid_order_state' } };
    if (e instanceof CouponNotFoundError) return { status: 404, body: { error: 'coupon_not_found' } };
    if (e instanceof CouponExpiredError) return { status: 410, body: { error: 'coupon_expired' } };
    if (e instanceof CouponUsedUpError) return { status: 409, body: { error: 'coupon_used_up' } };
    throw e;
  }
}
