import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openDatabase } from '../src/db.ts';
import { SqliteOrderRepository } from '../src/orders/sqliteOrderRepository.ts';

test('reads back a saved order', async () => {
  const orders = new SqliteOrderRepository(openDatabase(':memory:'));
  await orders.save({ id: 'o1', customerId: 'c1', totalAmount: 3000, status: 'CART', updatedAt: new Date() });
  const order = await orders.get('o1');
  assert.equal(order?.totalAmount, 3000);
  assert.equal(order?.status, 'CART');
});

test('rejects an order with a negative amount', async () => {
  const orders = new SqliteOrderRepository(openDatabase(':memory:'));
  await assert.rejects(
    orders.save({ id: 'o1', customerId: 'c1', totalAmount: -1, status: 'CART', updatedAt: new Date() }),
    /CHECK constraint failed/,
  );
});
