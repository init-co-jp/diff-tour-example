export type Coupon = {
  code: string;
  /** In yen */
  discountAmount: number;
  maxUses: number;
  usedCount: number;
  expiresAt: Date;
};

export class CouponNotFoundError extends Error {
  constructor(code: string) {
    super(`coupon not found: ${code}`);
    this.name = 'CouponNotFoundError';
  }
}

export class CouponExpiredError extends Error {
  constructor(code: string) {
    super(`coupon expired: ${code}`);
    this.name = 'CouponExpiredError';
  }
}

export class CouponUsedUpError extends Error {
  constructor(code: string) {
    super(`coupon used up: ${code}`);
    this.name = 'CouponUsedUpError';
  }
}
