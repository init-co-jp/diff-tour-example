import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CouponExpiredError, CouponUsedUpError } from '../src/coupons/coupon.ts';
import { CouponService } from '../src/coupons/couponService.ts';
import { SqliteCouponRepository } from '../src/coupons/sqliteCouponRepository.ts';
import { openDatabase } from '../src/db.ts';
import { SqliteOrderRepository } from '../src/orders/sqliteOrderRepository.ts';

const now = new Date('2026-10-01T00:00:00Z');

async function setup(coupon: { discount: number; maxUses: number; expiresAt: string }) {
  const db = openDatabase(':memory:');
  db.prepare('INSERT INTO coupons (code, discount_amount, max_uses, expires_at) VALUES (?, ?, ?, ?)').run(
    'WELCOME',
    coupon.discount,
    coupon.maxUses,
    coupon.expiresAt,
  );
  const orders = new SqliteOrderRepository(db);
  for (const id of ['o1', 'o2']) {
    await orders.save({ id, customerId: 'c1', totalAmount: 3000, status: 'CART', discountAmount: 0, updatedAt: now });
  }
  const coupons = new SqliteCouponRepository(db);
  return { orders, coupons, service: new CouponService(coupons, orders, () => now) };
}

test('applying a coupon sets the discount on the order', async () => {
  const { orders, service } = await setup({ discount: 500, maxUses: 10, expiresAt: '2026-12-31T00:00:00Z' });
  await service.apply('o1', 'WELCOME');
  const order = await orders.get('o1');
  assert.equal(order?.couponCode, 'WELCOME');
  assert.equal(order?.discountAmount, 500);
});

test('caps the discount at the order total', async () => {
  const { orders, service } = await setup({ discount: 5000, maxUses: 10, expiresAt: '2026-12-31T00:00:00Z' });
  await service.apply('o1', 'WELCOME');
  assert.equal((await orders.get('o1'))?.discountAmount, 3000);
});

test('rejects an expired coupon', async () => {
  const { service } = await setup({ discount: 500, maxUses: 10, expiresAt: '2026-09-30T00:00:00Z' });
  await assert.rejects(service.apply('o1', 'WELCOME'), CouponExpiredError);
});

test('rejects a coupon that has reached its use limit', async () => {
  const { coupons, service } = await setup({ discount: 500, maxUses: 1, expiresAt: '2026-12-31T00:00:00Z' });
  await service.apply('o1', 'WELCOME');
  await assert.rejects(service.apply('o2', 'WELCOME'), CouponUsedUpError);
  assert.equal((await coupons.get('WELCOME'))?.usedCount, 1);
});
