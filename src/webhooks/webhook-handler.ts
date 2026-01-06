import { CheckoutEventEmitter } from '../core/event-emitter';
import { 
  WebhookEvent, 
  WebhookVerificationResult,
  ProcessWebhookParams,
  WebhookHandlerConfig
} from './types';
import { validateWebhookSignature } from '../utils/validation';
import { logger } from '../utils/logger';

export class WebhookHandler {
  private eventEmitter: CheckoutEventEmitter;
  private config: WebhookHandlerConfig;

  constructor(config: WebhookHandlerConfig) {
    this.eventEmitter = CheckoutEventEmitter.getInstance();
    this.config = config;
  }

  async processWebhook(params: ProcessWebhookParams): Promise<void> {
    try {
      const { provider, payload, signature, headers } = params;

      // Verify webhook signature
      const verification = await this.verifyWebhook({
        provider,
        payload,
        signature,
        headers,
      });

      if (!verification.valid) {
        this.eventEmitter.emitEvent('webhook:verification:failed', {
          provider,
          error: verification.error,
          timestamp: new Date().toISOString(),
        });
        throw new Error(`Webhook verification failed: ${verification.error}`);
      }

      // Determine event type from provider-specific payload
      const eventType = this.mapProviderEvent(provider, payload);

      // Emit raw webhook received event
      this.eventEmitter.emitEvent('webhook:received', {
        provider,
        eventType,
        payload,
        headers,
        timestamp: new Date().toISOString(),
      });

      // Process based on event type
      await this.routeWebhookEvent(provider, eventType, payload);

      // Emit webhook processed event
      this.eventEmitter.emitEvent('webhook:processed', {
        provider,
        eventType,
        payload,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Webhook processed: ${eventType} from ${provider}`);

    } catch (error) {
      this.eventEmitter.emitEvent('webhook:processing:failed', {
        provider: params.provider,
        error: error.message,
        payload: params.payload,
        timestamp: new Date().toISOString(),
      });
      
      // Re-throw for retry mechanism
      throw error;
    }
  }

  private async verifyWebhook(params: {
    provider: string;
    payload: any;
    signature?: string;
    headers?: Record<string, string>;
  }): Promise<WebhookVerificationResult> {
    try {
      const { provider, payload, signature, headers } = params;

      switch (provider) {
        case 'stripe':
          return await validateWebhookSignature(
            payload,
            signature || '',
            this.config.stripeWebhookSecret
          );
        
        case 'paypal':
          // PayPal verification logic
          return { valid: true, provider };
        
        default:
          // For providers without signature verification
          return { valid: true, provider };
      }
    } catch (error) {
      return {
        valid: false,
        provider: params.provider,
        error: error.message,
      };
    }
  }

  private mapProviderEvent(provider: string, payload: any): string {
    switch (provider) {
      case 'stripe':
        return payload.type || 'unknown';
      
      case 'paypal':
        return payload.event_type || 'unknown';
      
      default:
        return payload.event || payload.type || 'unknown';
    }
  }

  private async routeWebhookEvent(provider: string, eventType: string, payload: any): Promise<void> {
    // Map provider events to internal events
    const eventMap = this.getEventMap(provider);
    const internalEvent = eventMap[eventType] || `webhook:${provider}:${eventType}`;

    // Emit provider-specific event
    this.eventEmitter.emitEvent(internalEvent, {
      provider,
      originalEvent: eventType,
      payload,
      timestamp: new Date().toISOString(),
    });

    // Also emit generic webhook event for general handlers
    this.eventEmitter.emitEvent('webhook:event', {
      provider,
      eventType,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  private getEventMap(provider: string): Record<string, string> {
    const maps: Record<string, Record<string, string>> = {
      stripe: {
        'payment_intent.succeeded': 'payment:captured',
        'payment_intent.payment_failed': 'payment:failed',
        'charge.refunded': 'payment:refunded',
        'customer.subscription.created': 'subscription:created',
        'customer.subscription.updated': 'subscription:updated',
        'customer.subscription.deleted': 'subscription:cancelled',
        'invoice.payment_succeeded': 'subscription:invoice:paid',
        'invoice.payment_failed': 'subscription:invoice:payment:failed',
      },
      paypal: {
        'PAYMENT.CAPTURE.COMPLETED': 'payment:captured',
        'PAYMENT.CAPTURE.DENIED': 'payment:declined',
        'PAYMENT.CAPTURE.REFUNDED': 'payment:refunded',
        'BILLING.SUBSCRIPTION.ACTIVATED': 'subscription:activated',
        'BILLING.SUBSCRIPTION.CANCELLED': 'subscription:cancelled',
        'BILLING.SUBSCRIPTION.EXPIRED': 'subscription:expired',
      },
    };

    return maps[provider] || {};
  }
            }
