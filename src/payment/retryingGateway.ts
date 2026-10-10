import type { ChargeRequest, ChargeResult, PaymentGateway } from './gateway.ts';
import { PaymentTimeoutError, PaymentUnavailableError } from './gateway.ts';

type Options = {
  maxAttempts?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
};

/**
 * PaymentGateway that retries charges on transient failures.
 * Wraps another PaymentGateway.
 */
export class RetryingPaymentGateway implements PaymentGateway {
  #inner: PaymentGateway;
  #maxAttempts: number;
  #baseDelayMs: number;
  #sleep: (ms: number) => Promise<void>;
  #random: () => number;

  constructor(inner: PaymentGateway, options: Options = {}) {
    this.#inner = inner;
    this.#maxAttempts = options.maxAttempts ?? 3;
    this.#baseDelayMs = options.baseDelayMs ?? 200;
    this.#sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.#random = options.random ?? Math.random;
  }

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    if (!req.idempotencyKey) {
      throw new Error('idempotencyKey is required to retry charges safely');
    }

    for (let attempt = 1; ; attempt++) {
      try {
        return await this.#inner.charge(req);
      } catch (e) {
        if (!isTransient(e) || attempt >= this.#maxAttempts) throw e;
        // Back off exponentially and randomize the wait (full jitter)
        const cap = this.#baseDelayMs * 2 ** (attempt - 1);
        await this.#sleep(Math.floor(this.#random() * cap));
      }
    }
  }

  findCharge(idempotencyKey: string): Promise<ChargeResult | null> {
    return this.#inner.findCharge(idempotencyKey);
  }
}

function isTransient(e: unknown): boolean {
  return e instanceof PaymentUnavailableError || e instanceof PaymentTimeoutError;
}
