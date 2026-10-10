import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InMemoryOrderRepository } from '../src/orders/orderRepository.ts';
import { InvalidOrderStateError, OrderService } from '../src/orders/orderService.ts';
import { PaymentDeclinedError, PaymentTimeoutError } from '../src/payment/gateway.ts';
import { ScriptedPaymentGateway } from './fakes.ts';

async function setup(steps: ConstructorParameters<typeof ScriptedPaymentGateway>[0] = []) {
  const orders = new InMemoryOrderRepository();
  await orders.save({ id: 'o1', customerId: 'c1', totalAmount: 3000, status: 'CART', updatedAt: new Date() });
  const payments = new ScriptedPaymentGateway(steps);
  return { orders, payments, service: new OrderService(orders, payments) };
}

test('marks the order PAID when the payment goes through', async () => {
  const { orders, service } = await setup([{ chargeId: 'ch_1' }]);
  await service.checkout('o1');
  const order = await orders.get('o1');
  assert.equal(order?.status, 'PAID');
  assert.equal(order?.chargeId, 'ch_1');
});

test('builds the idempotency key from the order ID', async () => {
  const { payments, service } = await setup();
  await service.checkout('o1');
  assert.equal(payments.calls[0].idempotencyKey, 'order-o1');
});

test('marks the order PAYMENT_FAILED when the card is declined, and allows a retry', async () => {
  const { orders, service } = await setup([new PaymentDeclinedError('insufficient_funds')]);
  await assert.rejects(service.checkout('o1'), PaymentDeclinedError);
  assert.equal((await orders.get('o1'))?.status, 'PAYMENT_FAILED');
  await service.checkout('o1');
  assert.equal((await orders.get('o1'))?.status, 'PAID');
});

test('marks the order PAYMENT_FAILED on a timeout, and allows a retry', async () => {
  const { orders, service } = await setup([new PaymentTimeoutError()]);
  await assert.rejects(service.checkout('o1'), PaymentTimeoutError);
  assert.equal((await orders.get('o1'))?.status, 'PAYMENT_FAILED');
  await service.checkout('o1');
  assert.equal((await orders.get('o1'))?.status, 'PAID');
});

test('rejects checkout of an order whose payment is pending', async () => {
  const { orders, service } = await setup();
  const order = await orders.get('o1');
  await orders.save({ ...order!, status: 'PENDING_PAYMENT' });
  await assert.rejects(service.checkout('o1'), InvalidOrderStateError);
});
