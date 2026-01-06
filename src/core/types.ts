export interface BaseEvent {
  eventId: string;
  type: string;
  timestamp: string;
  source: 'checkout-core';
  correlationId?: string;
  metadata?: Record<string, any>;
}

export interface PaymentEvent extends BaseEvent {
  type: 'payment';
  data: PaymentEventData;
}

export interface SubscriptionEvent extends BaseEvent {
  type: 'subscription';
  data: SubscriptionEventData;
}

export interface WebhookEvent extends BaseEvent {
  type: 'webhook';
  data: WebhookEventData;
}

export interface RetryEvent extends BaseEvent {
  type: 'retry';
  data: RetryEventData;
}

export type CheckoutEvent = PaymentEvent | SubscriptionEvent | WebhookEvent | RetryEvent;

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank_transfer';
  lastFour?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface Currency {
  code: string;
  symbol: string;
  decimals: number;
}
