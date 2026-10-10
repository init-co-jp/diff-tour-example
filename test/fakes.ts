import type { ChargeRequest, ChargeResult, PaymentGateway } from '../src/payment/gateway.ts';

type Step = ChargeResult | Error;

/** Fake payment service that returns the given results in order, one per call (throwing any Error) */
export class ScriptedPaymentGateway implements PaymentGateway {
  calls: ChargeRequest[] = [];
  charges = new Map<string, ChargeResult>();
  #steps: Step[];

  constructor(steps: Step[] = []) {
    this.#steps = steps;
  }

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    this.calls.push(req);
    const step = this.#steps.shift() ?? { chargeId: `ch_${this.calls.length}` };
    if (step instanceof Error) throw step;
    this.charges.set(req.idempotencyKey, step);
    return step;
  }

  async findCharge(idempotencyKey: string): Promise<ChargeResult | null> {
    return this.charges.get(idempotencyKey) ?? null;
  }
}
