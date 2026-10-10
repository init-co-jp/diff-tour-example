import type { DatabaseSync } from 'node:sqlite';
import type { Order, OrderStatus } from './order.ts';
import type { OrderRepository } from './orderRepository.ts';

type Row = {
  id: string;
  customer_id: string;
  total_amount: number;
  status: OrderStatus;
  charge_id: string | null;
  coupon_code: string | null;
  discount_amount: number;
  updated_at: string;
};

function toOrder(row: Row): Order {
  return {
    id: row.id,
    customerId: row.customer_id,
    totalAmount: row.total_amount,
    status: row.status,
    chargeId: row.charge_id ?? undefined,
    couponCode: row.coupon_code ?? undefined,
    discountAmount: row.discount_amount,
    updatedAt: new Date(row.updated_at),
  };
}

export class SqliteOrderRepository implements OrderRepository {
  #db: DatabaseSync;
  #now: () => Date;

  constructor(db: DatabaseSync, now: () => Date = () => new Date()) {
    this.#db = db;
    this.#now = now;
  }

  async get(id: string): Promise<Order | null> {
    const row = this.#db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Row | undefined;
    return row ? toOrder(row) : null;
  }

  async save(order: Order): Promise<void> {
    this.#db
      .prepare(
        `INSERT INTO orders (id, customer_id, total_amount, status, charge_id, coupon_code, discount_amount, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           customer_id = excluded.customer_id,
           total_amount = excluded.total_amount,
           status = excluded.status,
           charge_id = excluded.charge_id,
           coupon_code = excluded.coupon_code,
           discount_amount = excluded.discount_amount,
           updated_at = excluded.updated_at`,
      )
      .run(
        order.id,
        order.customerId,
        order.totalAmount,
        order.status,
        order.chargeId ?? null,
        order.couponCode ?? null,
        order.discountAmount,
        this.#now().toISOString(),
      );
  }

  async findByStatusUpdatedBefore(status: OrderStatus, before: Date): Promise<Order[]> {
    const rows = this.#db
      .prepare('SELECT * FROM orders WHERE status = ? AND updated_at < ? ORDER BY updated_at')
      .all(status, before.toISOString()) as Row[];
    return rows.map(toOrder);
  }
}
