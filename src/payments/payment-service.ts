import { CheckoutEventEmitter } from '../core/event-emitter';
import { BasePaymentProvider } from '../providers/base-provider';
import { StripeProvider } from '../providers/stripe/stripe-provider';
import { PayPalProvider } from '../providers/paypal/paypal-provider';
import { 
  PaymentIntent, 
  PaymentMethod, 
  PaymentResult, 
  PaymentOptions,
  CreatePaymentParams,
  CapturePaymentParams,
  RefundPaymentParams
} from './types';
import { validatePaymentParams } from '../utils/validation';
import { logger } from '../utils/logger';

export class PaymentService {
  private eventEmitter: CheckoutEventEmitter;
  private providers: Map<string, BasePaymentProvider>;

  constructor() {
    this.eventEmitter = CheckoutEventEmitter.getInstance();
    this.providers = new Map();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize payment providers
    this.providers.set('stripe', new StripeProvider());
    this.providers.set('paypal', new PayPalProvider());
  }

  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    try {
      validatePaymentParams(params);

      const provider = this.providers.get(params.provider);
      if (!provider) {
        throw new Error(`Unsupported payment provider: ${params.provider}`);
      }

      const paymentIntent = await provider.createPaymentIntent(params);

      // Emit payment created event
      this.eventEmitter.emitEvent('payment:intent:created', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customerId: params.customerId,
        metadata: params.metadata,
      });

      logger.info(`Payment intent created: ${paymentIntent.id}`);
      return paymentIntent;

    } catch (error) {
      this.eventEmitter.emitEvent('payment:intent:failed', {
        error: error.message,
        params,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async capturePayment(params: CapturePaymentParams): Promise<PaymentResult> {
    try {
      const provider = this.providers.get(params.provider);
      if (!provider) {
        throw new Error(`Unsupported payment provider: ${params.provider}`);
      }

      const result = await provider.capturePayment(params);

      // Emit payment captured event
      this.eventEmitter.emitEvent('payment:captured', {
        paymentId: result.id,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
        metadata: result.metadata,
      });

      logger.info(`Payment captured: ${result.id}`);
      return result;

    } catch (error) {
      this.eventEmitter.emitEvent('payment:capture:failed', {
        error: error.message,
        params,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async refundPayment(params: RefundPaymentParams): Promise<PaymentResult> {
    try {
      const provider = this.providers.get(params.provider);
      if (!provider) {
        throw new Error(`Unsupported payment provider: ${params.provider}`);
      }

      const result = await provider.refundPayment(params);

      // Emit refund event
      this.eventEmitter.emitEvent('payment:refunded', {
        refundId: result.id,
        paymentId: params.paymentId,
        amount: result.amount,
        reason: params.reason,
        metadata: result.metadata,
      });

      logger.info(`Payment refunded: ${result.id}`);
      return result;

    } catch (error) {
      this.eventEmitter.emitEvent('payment:refund:failed', {
        error: error.message,
        params,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async getPaymentMethods(customerId: string, provider: string): Promise<PaymentMethod[]> {
    const paymentProvider = this.providers.get(provider);
    if (!paymentProvider) {
      throw new Error(`Unsupported payment provider: ${provider}`);
    }

    return paymentProvider.getPaymentMethods(customerId);
  }
}
