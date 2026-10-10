import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reconcilePendingPayments } from '../src/jobs/reconcilePendingPayments.ts';
import { InMemoryOrderRepository } from '../src/orders/orderRepository.ts';
import { ScriptedPaymentGateway } from './fakes.ts';

const longAgo = new Date('2026-01-01T00:00:00Z');
const now = new Date('2026-01-01T01:00:00Z');

test('marks orders PAID if a charge exists, PAYMENT_FAILED otherwise', async () => {
  const orders = new InMemoryOrderRepository(() => longAgo);
  await orders.save({ id: 'charged', customerId: 'c1', totalAmount: 1000, status: 'PENDING_PAYMENT', discountAmount: 0, updatedAt: longAgo });
  await orders.save({ id: 'not-charged', customerId: 'c1', totalAmount: 1000, status: 'PENDING_PAYMENT', discountAmount: 0, updatedAt: longAgo });
  const payments = new ScriptedPaymentGateway();
  payments.charges.set('order-charged', { chargeId: 'ch_9' });

  await reconcilePendingPayments(orders, payments, now);

  assert.equal((await orders.get('charged'))?.status, 'PAID');
  assert.equal((await orders.get('charged'))?.chargeId, 'ch_9');
  assert.equal((await orders.get('not-charged'))?.status, 'PAYMENT_FAILED');
});

test('leaves orders updated less than 10 minutes ago alone', async () => {
  const orders = new InMemoryOrderRepository(() => now);
  await orders.save({ id: 'o1', customerId: 'c1', totalAmount: 1000, status: 'PENDING_PAYMENT', discountAmount: 0, updatedAt: now });
  await reconcilePendingPayments(orders, new ScriptedPaymentGateway(), now);
  assert.equal((await orders.get('o1'))?.status, 'PENDING_PAYMENT');
});
