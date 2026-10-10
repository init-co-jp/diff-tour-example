import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ChargeRequest } from '../src/payment/gateway.ts';
import { PaymentDeclinedError, PaymentTimeoutError, PaymentUnavailableError } from '../src/payment/gateway.ts';
import { RetryingPaymentGateway } from '../src/payment/retryingGateway.ts';
import { ScriptedPaymentGateway } from './fakes.ts';

const req: ChargeRequest = { amount: 1000, currency: 'JPY', customerId: 'c1', idempotencyKey: 'order-o1' };

function retrying(inner: ScriptedPaymentGateway) {
  const waits: number[] = [];
  const gateway = new RetryingPaymentGateway(inner, {
    sleep: async (ms) => {
      waits.push(ms);
    },
    random: () => 1,
  });
  return { gateway, waits };
}

test('retries transient failures until the charge succeeds', async () => {
  const inner = new ScriptedPaymentGateway([new PaymentUnavailableError(503), new PaymentTimeoutError(), { chargeId: 'ch_1' }]);
  const { gateway, waits } = retrying(inner);
  assert.deepEqual(await gateway.charge(req), { chargeId: 'ch_1' });
  assert.equal(inner.calls.length, 3);
  assert.deepEqual(waits, [200, 400]);
});

test('sends the same idempotency key on every attempt', async () => {
  const inner = new ScriptedPaymentGateway([new PaymentUnavailableError(503), { chargeId: 'ch_1' }]);
  await retrying(inner).gateway.charge(req);
  assert.deepEqual(inner.calls.map((c) => c.idempotencyKey), ['order-o1', 'order-o1']);
});

test('throws the last error after 3 failed attempts', async () => {
  const inner = new ScriptedPaymentGateway([
    new PaymentUnavailableError(503),
    new PaymentUnavailableError(503),
    new PaymentUnavailableError(502),
  ]);
  await assert.rejects(retrying(inner).gateway.charge(req), (e: PaymentUnavailableError) => e.status === 502);
  assert.equal(inner.calls.length, 3);
});

test('does not retry a declined card', async () => {
  const inner = new ScriptedPaymentGateway([new PaymentDeclinedError('insufficient_funds')]);
  await assert.rejects(retrying(inner).gateway.charge(req), PaymentDeclinedError);
  assert.equal(inner.calls.length, 1);
});

test('refuses to charge without an idempotency key', async () => {
  const inner = new ScriptedPaymentGateway();
  await assert.rejects(retrying(inner).gateway.charge({ ...req, idempotencyKey: '' }));
  assert.equal(inner.calls.length, 0);
});
