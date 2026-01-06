// Core exports
export { CheckoutEventEmitter } from './core/event-emitter';
export type { 
  BaseEvent, 
  PaymentEvent, 
  SubscriptionEvent, 
  WebhookEvent, 
  RetryEvent,
  CheckoutEvent 
} from './core/types';

// Payment exports
export { PaymentService } from './payments/payment-service';
export { PAYMENT_EVENTS } from './payments/payment-events';
export type { 
  PaymentIntent, 
  PaymentResult, 
  PaymentMethod,
  CreatePaymentParams,
  CapturePaymentParams,
  RefundPaymentParams 
} from './payments/types';

// Subscription exports
export { SubscriptionService } from './subscriptions/subscription-service';
export { SUBSCRIPTION_EVENTS } from './subscriptions/subscription-events';
export type { 
  Subscription, 
  SubscriptionPlan,
  CreateSubscriptionParams,
  UpdateSubscriptionParams,
  CancelSubscriptionParams 
} from './subscriptions/types';

// Webhook exports
export { WebhookHandler } from './webhooks/webhook-handler';
export { WEBHOOK_EVENTS } from './webhooks/webhook-events';
export type { 
  WebhookEvent as WebhookEventType,
  WebhookHandlerConfig,
  ProcessWebhookParams 
} from './webhooks/types';

// Retry exports
export { RetryService } from './retry/retry-service';
export { RetryQueue } from './retry/retry-queue';
export { RETRY_EVENTS } from './retry/retry-events';
export type { 
  RetryableOperation, 
  RetryConfig, 
  RetryStrategy,
  RetryResult 
} from './retry/types';

// Main CheckoutCore class
export class GitDigitalCheckoutCore {
  private paymentService: PaymentService;
  private subscriptionService: SubscriptionService;
  private webhookHandler: WebhookHandler;
  private retryService: RetryService;
  private eventEmitter: CheckoutEventEmitter;

  constructor(config?: {
    webhookConfig?: any;
    retryConfig?: any;
  }) {
    this.eventEmitter = CheckoutEventEmitter.getInstance();
    this.paymentService = new PaymentService();
    this.subscriptionService = new SubscriptionService();
    this.webhookHandler = new WebhookHandler(config?.webhookConfig || {});
    this.retryService = new RetryService(config?.retryConfig);
  }

  // Getters for services
  get payments(): PaymentService {
    return this.paymentService;
  }

  get subscriptions(): SubscriptionService {
    return this.subscriptionService;
  }

  get webhooks(): WebhookHandler {
    return this.webhookHandler;
  }

  get retry(): RetryService {
    return this.retryService;
  }

  get events(): CheckoutEventEmitter {
    return this.eventEmitter;
  }

  // Helper method to listen to all events
  onAllEvents(listener: (event: string, data: any) => void): void {
    this.eventEmitter.on('**', listener);
  }
}

// Default export
export default GitDigitalCheckoutCore;
