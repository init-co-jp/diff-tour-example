import { CouponService } from './coupons/couponService.ts';
import { SqliteCouponRepository } from './coupons/sqliteCouponRepository.ts';
import { openDatabase } from './db.ts';
import { OrderService } from './orders/orderService.ts';
import { SqliteOrderRepository } from './orders/sqliteOrderRepository.ts';
import { HttpPaymentGateway } from './payment/httpGateway.ts';

export function createApp(env: NodeJS.ProcessEnv = process.env) {
  const db = openDatabase(env.DATABASE_PATH ?? 'shop.db');
  const orders = new SqliteOrderRepository(db);
  const payments = new HttpPaymentGateway({
    baseUrl: env.PAYMENT_API_URL ?? 'http://localhost:4000',
    apiKey: env.PAYMENT_API_KEY ?? 'test-key',
    timeoutMs: 10_000,
  });
  const orderService = new OrderService(orders, payments);
  const couponService = new CouponService(new SqliteCouponRepository(db), orders);
  return { db, orders, payments, orderService, couponService };
}
