import type { DatabaseSync } from 'node:sqlite';

export type DailySales = {
  /** YYYY-MM-DD */
  date: string;
  orderCount: number;
  /** In yen */
  totalAmount: number;
};

export class InvalidReportDateError extends Error {
  constructor(input: string) {
    super(`invalid report date: ${input} (expected YYYY-MM-DD)`);
    this.name = 'InvalidReportDateError';
  }
}

/**
 * Takes a YYYY-MM-DD string, checks that it is a real date, and returns it.
 * Date rolls a date like 2026-02-30 over into the next month, so rebuild the date and compare
 */
export function parseReportDate(input: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) throw new InvalidReportDateError(input);
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new InvalidReportDateError(input);
  }
  return input;
}

function nextDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/**
 * Aggregates sales per day.
 *
 * Kept out of order reads and writes (OrderRepository); only the aggregation is done, in SQL.
 * This avoids loading a day's orders into the app, and reuses the (status, updated_at) index built for the reconcile batch.
 * A PAID order is never updated afterwards, so updated_at is treated as the time the payment was confirmed
 */
export class DailySalesReport {
  #db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.#db = db;
  }

  salesOn(date: string): DailySales {
    parseReportDate(date);
    // Applying a function to the column would bypass the index, so filter on the range [00:00 that day, 00:00 the next day)
    const row = this.#db
      .prepare(
        `SELECT COUNT(*) AS order_count, COALESCE(SUM(total_amount), 0) AS total_amount
         FROM orders
         WHERE status = 'PAID' AND updated_at >= ? AND updated_at < ?`,
      )
      .get(`${date}T00:00:00`, `${nextDate(date)}T00:00:00`) as { order_count: number; total_amount: number };
    return { date, orderCount: row.order_count, totalAmount: row.total_amount };
  }
}
