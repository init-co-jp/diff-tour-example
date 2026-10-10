import { InMemoryOrderRepository } from './orders/orderRepository.ts';
import { OrderService } from './orders/orderService.ts';
import { HttpPaymentGateway } from './payment/httpGateway.ts';
import { RetryingPaymentGateway } from './payment/retryingGateway.ts';

export function createApp(env: NodeJS.ProcessEnv = process.env) {
  const orders = new InMemoryOrderRepository();
  const payments = new RetryingPaymentGateway(
    new HttpPaymentGateway({
      baseUrl: env.PAYMENT_API_URL ?? 'http://localhost:4000',
      apiKey: env.PAYMENT_API_KEY ?? 'test-key',
      timeoutMs: 10_000,
    }),
  );
  const orderService = new OrderService(orders, payments);
  return { orders, payments, orderService };
}
