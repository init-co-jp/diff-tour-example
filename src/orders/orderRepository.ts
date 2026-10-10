import type { Order, OrderStatus } from './order.ts';

export interface OrderRepository {
  get(id: string): Promise<Order | null>;
  save(order: Order): Promise<void>;
  findByStatusUpdatedBefore(status: OrderStatus, before: Date): Promise<Order[]>;
}

export class InMemoryOrderRepository implements OrderRepository {
  #orders = new Map<string, Order>();
  #now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.#now = now;
  }

  async get(id: string): Promise<Order | null> {
    const order = this.#orders.get(id);
    // Return a copy so that callers mutating it without save() cannot change what is stored
    return order ? structuredClone(order) : null;
  }

  async save(order: Order): Promise<void> {
    this.#orders.set(order.id, structuredClone({ ...order, updatedAt: this.#now() }));
  }

  async findByStatusUpdatedBefore(status: OrderStatus, before: Date): Promise<Order[]> {
    return [...this.#orders.values()]
      .filter((o) => o.status === status && o.updatedAt < before)
      .map((o) => structuredClone(o));
  }
}
