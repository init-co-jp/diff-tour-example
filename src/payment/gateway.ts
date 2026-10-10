export type ChargeRequest = {
  /** In yen (the smallest currency unit) */
  amount: number;
  currency: 'JPY';
  customerId: string;
  /** Charges sent with the same key are treated as one charge by the payment service (kept for 24 hours) */
  idempotencyKey: string;
};

export type ChargeResult = {
  chargeId: string;
};

export interface PaymentGateway {
  charge(req: ChargeRequest): Promise<ChargeResult>;
  /** Looks up a past charge by idempotency key. Returns null if there is none */
  findCharge(idempotencyKey: string): Promise<ChargeResult | null>;
}

/** The card was declined. Sending the same request again will not change the result */
export class PaymentDeclinedError extends Error {
  reason: string;

  constructor(reason: string) {
    super(`payment declined: ${reason}`);
    this.name = 'PaymentDeclinedError';
    this.reason = reason;
  }
}

/** The payment service could not respond (5xx, 429, connection failure). No charge was made */
export class PaymentUnavailableError extends Error {
  status: number;

  constructor(status: number, options?: ErrorOptions) {
    super(`payment service unavailable (status ${status})`, options);
    this.name = 'PaymentUnavailableError';
    this.status = status;
  }
}

/** Gave up before a response came back. The request may have arrived and the charge may have gone through */
export class PaymentTimeoutError extends Error {
  constructor(options?: ErrorOptions) {
    super('payment request timed out', options);
    this.name = 'PaymentTimeoutError';
  }
}
