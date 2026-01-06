import { EventEmitter2 } from 'eventemitter2';

export class CheckoutEventEmitter extends EventEmitter2 {
  private static instance: CheckoutEventEmitter;

  private constructor() {
    super({
      wildcard: true,
      delimiter: ':',
      newListener: false,
      maxListeners: 20,
    });
  }

  static getInstance(): CheckoutEventEmitter {
    if (!CheckoutEventEmitter.instance) {
      CheckoutEventEmitter.instance = new CheckoutEventEmitter();
    }
    return CheckoutEventEmitter.instance;
  }

  emitEvent(event: string, data: any): boolean {
    const timestamp = new Date().toISOString();
    const eventData = {
      ...data,
      _metadata: {
        event,
        timestamp,
        source: 'checkout-core',
      },
    };

    return this.emit(event, eventData);
  }
}
