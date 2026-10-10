import { createServer } from 'node:http';
import { createApp } from './app.ts';
import { handleApplyCoupon } from './handlers/applyCoupon.ts';
import { handleCheckout } from './handlers/checkout.ts';
import { reconcilePendingPayments } from './jobs/reconcilePendingPayments.ts';

const app = createApp();

async function readJson(req: import('node:http').IncomingMessage): Promise<unknown> {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

const server = createServer(async (req, res) => {
  const match = req.method === 'POST' && req.url?.match(/^\/orders\/([\w-]+)\/(checkout|coupon)$/);
  if (!match) {
    res.writeHead(404).end();
    return;
  }
  try {
    const result =
      match[2] === 'checkout'
        ? await handleCheckout(app.orderService, match[1])
        : await handleApplyCoupon(app.couponService, match[1], await readJson(req));
    res.writeHead(result.status, { 'content-type': 'application/json' }).end(JSON.stringify(result.body));
  } catch (e) {
    console.error(e);
    res.writeHead(500).end();
  }
});

setInterval(() => {
  reconcilePendingPayments(app.orders, app.payments).catch((e) => console.error('reconcile failed', e));
}, 5 * 60 * 1000);

server.listen(Number(process.env.PORT ?? 3000));
