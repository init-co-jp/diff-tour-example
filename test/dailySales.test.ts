import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openDatabase } from '../src/db.ts';
import type { OrderStatus } from '../src/orders/order.ts';
import { SqliteOrderRepository } from '../src/orders/sqliteOrderRepository.ts';
import { DailySalesReport, InvalidReportDateError, parseReportDate } from '../src/reports/dailySales.ts';

function setup() {
  const db = openDatabase(':memory:');
  let clock = new Date();
  const orders = new SqliteOrderRepository(db, () => clock);
  let seq = 0;
  async function placeAt(at: string, totalAmount: number, status: OrderStatus = 'PAID') {
    clock = new Date(at);
    seq += 1;
    await orders.save({ id: `o${seq}`, customerId: 'c1', totalAmount, status, updatedAt: clock });
  }
  return { report: new DailySalesReport(db), placeAt };
}

test('totals the count and amount of orders paid that day', async () => {
  const { report, placeAt } = setup();
  await placeAt('2026-10-10T03:00:00Z', 3000);
  await placeAt('2026-10-10T05:30:00Z', 1200);
  assert.deepEqual(report.salesOn('2026-10-10'), { date: '2026-10-10', orderCount: 2, totalAmount: 4200 });
});

test('does not count unpaid orders', async () => {
  const { report, placeAt } = setup();
  await placeAt('2026-10-10T03:00:00Z', 3000);
  await placeAt('2026-10-10T03:10:00Z', 5000, 'CART');
  await placeAt('2026-10-10T03:20:00Z', 5000, 'PENDING_PAYMENT');
  await placeAt('2026-10-10T03:30:00Z', 5000, 'PAYMENT_FAILED');
  assert.deepEqual(report.salesOn('2026-10-10'), { date: '2026-10-10', orderCount: 1, totalAmount: 3000 });
});

test('excludes orders from the previous and next days', async () => {
  const { report, placeAt } = setup();
  await placeAt('2026-10-09T03:00:00Z', 1000);
  await placeAt('2026-10-10T03:00:00Z', 2000);
  await placeAt('2026-10-11T03:00:00Z', 4000);
  assert.equal(report.salesOn('2026-10-10').totalAmount, 2000);
});

test('handles the last day of a month and of a year', async () => {
  const { report, placeAt } = setup();
  await placeAt('2026-12-31T03:00:00Z', 1500);
  await placeAt('2027-01-01T03:00:00Z', 2500);
  assert.equal(report.salesOn('2026-12-31').totalAmount, 1500);
  assert.equal(report.salesOn('2027-01-01').totalAmount, 2500);
});

test('reports 0 orders and 0 yen for a day without orders', () => {
  const { report } = setup();
  assert.deepEqual(report.salesOn('2026-10-10'), { date: '2026-10-10', orderCount: 0, totalAmount: 0 });
});

test('accepts only real dates in YYYY-MM-DD form', () => {
  assert.equal(parseReportDate('2024-02-29'), '2024-02-29');
  for (const input of ['2026/10/10', '2026-10-1', '2026-02-30', '2026-13-01', '', '2026-10-10T00:00:00']) {
    assert.throws(() => parseReportDate(input), InvalidReportDateError, input);
  }
});
