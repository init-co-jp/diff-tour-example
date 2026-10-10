import assert from 'node:assert/strict';
import { test } from 'node:test';
import { yesterdayInTokyo } from '../src/reports/printDailySales.ts';

test('"yesterday" is the previous calendar day in Japan time', () => {
  // 2026-10-11 01:00 in Japan time (still the 10th in UTC)
  assert.equal(yesterdayInTokyo(new Date('2026-10-10T16:00:00Z')), '2026-10-10');
  // 2026-10-10 23:00 in Japan time
  assert.equal(yesterdayInTokyo(new Date('2026-10-10T14:00:00Z')), '2026-10-09');
});

test('"yesterday" across a month boundary', () => {
  // 2026-11-01 08:00 in Japan time
  assert.equal(yesterdayInTokyo(new Date('2026-10-31T23:00:00Z')), '2026-10-31');
});
