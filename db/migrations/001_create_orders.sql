CREATE TABLE orders (
  id           TEXT PRIMARY KEY,
  customer_id  TEXT NOT NULL,
  -- Amounts are stored as integer yen. REAL (floating point) would let in errors like 0.1 + 0.2
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  status       TEXT NOT NULL CHECK (status IN ('CART', 'PENDING_PAYMENT', 'PAID', 'PAYMENT_FAILED')),
  charge_id    TEXT,
  updated_at   TEXT NOT NULL
);

-- Lets the reconcile batch find orders that have been stuck in payment for a while
CREATE INDEX orders_status_updated_at ON orders (status, updated_at);
