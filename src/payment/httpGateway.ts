import type { ChargeRequest, ChargeResult, PaymentGateway } from './gateway.ts';
import { PaymentDeclinedError, PaymentTimeoutError, PaymentUnavailableError } from './gateway.ts';

type Options = {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
};

export class HttpPaymentGateway implements PaymentGateway {
  #baseUrl: string;
  #apiKey: string;
  #timeoutMs: number;

  constructor(options: Options) {
    this.#baseUrl = options.baseUrl;
    this.#apiKey = options.apiKey;
    this.#timeoutMs = options.timeoutMs ?? 10_000;
  }

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const res = await this.#request('/v1/charges', {
      method: 'POST',
      headers: { 'idempotency-key': req.idempotencyKey },
      body: JSON.stringify({ amount: req.amount, currency: req.currency, customer: req.customerId }),
    });

    if (res.status === 402) {
      const body = (await res.json()) as { decline_code?: string };
      throw new PaymentDeclinedError(body.decline_code ?? 'unknown');
    }
    if (res.status >= 500 || res.status === 429) {
      throw new PaymentUnavailableError(res.status);
    }
    if (!res.ok) {
      throw new Error(`unexpected status from payment service: ${res.status}`);
    }
    const body = (await res.json()) as { id: string };
    return { chargeId: body.id };
  }

  async findCharge(idempotencyKey: string): Promise<ChargeResult | null> {
    const res = await this.#request(`/v1/charges?idempotency_key=${encodeURIComponent(idempotencyKey)}`, {
      method: 'GET',
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new PaymentUnavailableError(res.status);
    const body = (await res.json()) as { id: string };
    return { chargeId: body.id };
  }

  async #request(path: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(`${this.#baseUrl}${path}`, {
        ...init,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.#apiKey}`,
          ...init.headers,
        },
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'TimeoutError') {
        throw new PaymentTimeoutError({ cause: e });
      }
      // If the connection itself failed, the request never reached the payment service
      throw new PaymentUnavailableError(0, { cause: e });
    }
  }
}
