# diff-tour-example

A small example service for trying [diff-tour](https://github.com/init-co-jp/diff-tour): an order and checkout backend written in TypeScript. It has no dependencies (Node.js 23.6 or later runs the TypeScript directly).

```sh
npm test
npm start   # POST /orders/:id/checkout
```

## Branches

- `main`: orders, checkout, a payment service client and a batch that reconciles pending payments
- `feature/payment-retry`: retries transient payment failures at checkout
- `feature/coupons`: coupon codes that discount an order at checkout
- `feature/daily-sales`: a daily sales report and a CLI that prints it

## Layout

- `src/orders/` orders and the checkout business logic
- `src/payment/` client for the external payment service
- `src/handlers/` mapping to and from HTTP requests
- `src/jobs/` scheduled batch jobs
- `src/app.ts` dependency wiring
- `db/migrations/` database schema (applied in numeric order at startup)
