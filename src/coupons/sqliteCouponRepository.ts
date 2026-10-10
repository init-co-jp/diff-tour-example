import type { DatabaseSync } from 'node:sqlite';
import type { Coupon } from './coupon.ts';

type Row = {
  code: string;
  discount_amount: number;
  max_uses: number;
  used_count: number;
  expires_at: string;
};

export class SqliteCouponRepository {
  #db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.#db = db;
  }

  async get(code: string): Promise<Coupon | null> {
    const row = this.#db.prepare('SELECT * FROM coupons WHERE code = ?').get(code) as Row | undefined;
    if (!row) return null;
    return {
      code: row.code,
      discountAmount: row.discount_amount,
      maxUses: row.max_uses,
      usedCount: row.used_count,
      expiresAt: new Date(row.expires_at),
    };
  }

  /**
   * Increments the use count by one. Returns false without incrementing if the limit has been reached.
   * The check and the increment happen in a single UPDATE, so concurrent uses cannot exceed the limit
   */
  async consumeUse(code: string): Promise<boolean> {
    const result = this.#db
      .prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ? AND used_count < max_uses')
      .run(code);
    return result.changes === 1;
  }
}
