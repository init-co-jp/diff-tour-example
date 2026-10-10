import { openDatabase } from '../db.ts';
import { DailySalesReport, InvalidReportDateError, parseReportDate } from './dailySales.ts';

/**
 * The date of "yesterday" in Japan time (YYYY-MM-DD).
 * The scheduled morning run omits the argument and reports the previous day
 */
export function yesterdayInTokyo(now: Date = new Date()): string {
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // The sv-SE locale formats dates as YYYY-MM-DD
  return yesterday.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

/** Usage: npm run report:daily [-- YYYY-MM-DD] */
export function main(args: string[], env: NodeJS.ProcessEnv = process.env): number {
  let date: string;
  try {
    date = args[0] === undefined ? yesterdayInTokyo() : parseReportDate(args[0]);
  } catch (e) {
    if (e instanceof InvalidReportDateError) {
      console.error(e.message);
      return 2;
    }
    throw e;
  }
  const db = openDatabase(env.DATABASE_PATH ?? 'shop.db');
  try {
    console.log(JSON.stringify(new DailySalesReport(db).salesOn(date)));
  } finally {
    db.close();
  }
  return 0;
}

if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2));
}
