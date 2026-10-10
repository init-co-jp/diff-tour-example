CREATE TABLE coupons (
  code            TEXT PRIMARY KEY,
  discount_amount INTEGER NOT NULL CHECK (discount_amount > 0),
  max_uses        INTEGER NOT NULL CHECK (max_uses > 0),
  used_count      INTEGER NOT NULL DEFAULT 0,
  expires_at      TEXT NOT NULL
);

ALTER TABLE orders ADD COLUMN coupon_code TEXT REFERENCES coupons (code);
ALTER TABLE orders ADD COLUMN discount_amount INTEGER NOT NULL DEFAULT 0;
