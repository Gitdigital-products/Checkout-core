import { CheckoutEventEmitter } from '../core/event-emitter';
import { 
  Subscription, 
  SubscriptionPlan, 
  CreateSubscriptionParams,
  UpdateSubscriptionParams,
  CancelSubscriptionParams,
  SubscriptionStatus
} from './types';
import { validateSubscriptionParams } from '../utils/validation';
import { logger } from '../utils/logger';

export class SubscriptionService {
  private eventEmitter: CheckoutEventEmitter;

  constructor() {
    this.eventEmitter = CheckoutEventEmitter.getInstance();
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<Subscription> {
    try {
      validateSubscriptionParams(params);

      // In a real implementation, this would integrate with Stripe/other providers
      const subscription: Subscription = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerId: params.customerId,
        planId: params.planId,
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: this.calculatePeriodEnd(params.billingCycle),
        cancelAtPeriodEnd: false,
        metadata: params.metadata || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Emit subscription created event
      this.eventEmitter.emitEvent('subscription:created', {
        subscriptionId: subscription.id,
        customerId: subscription.customerId,
        planId: subscription.planId,
        status: subscription.status,
        metadata: subscription.metadata,
      });

      logger.info(`Subscription created: ${subscription.id}`);
      return subscription;

    } catch (error) {
      this.eventEmitter.emitEvent('subscription:creation:failed', {
        error: error.message,
        params,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async updateSubscription(params: UpdateSubscriptionParams): Promise<Subscription> {
    try {
      // Emit subscription updating event
      this.eventEmitter.emitEvent('subscription:updating', {
        subscriptionId: params.subscriptionId,
        updates: params.updates,
        timestamp: new Date().toISOString(),
      });

      // In real implementation, update in database/provider
      const updatedSubscription: Subscription = {
        id: params.subscriptionId,
        customerId: 'customer_123', // Would fetch from DB
        planId: params.updates.planId || 'plan_123',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Emit subscription updated event
      this.eventEmitter.emitEvent('subscription:updated', {
        subscriptionId: updatedSubscription.id,
        customerId: updatedSubscription.customerId,
        planId: updatedSubscription.planId,
        status: updatedSubscription.status,
        metadata: updatedSubscription.metadata,
      });

      logger.info(`Subscription updated: ${updatedSubscription.id}`);
      return updatedSubscription;

    } catch (error) {
      this.eventEmitter.emitEvent('subscription:update:failed', {
        error: error.message,
        params,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async cancelSubscription(params: CancelSubscriptionParams): Promise<Subscription> {
    try {
      // Emit subscription cancelling event
      this.eventEmitter.emitEvent('subscription:cancelling', {
        subscriptionId: params.subscriptionId,
        reason: params.reason,
        immediate: params.immediate,
        timestamp: new Date().toISOString(),
      });

      // In real implementation, cancel with provider
      const cancelledSubscription: Subscription = {
        id: params.subscriptionId,
        customerId: 'customer_123',
        planId: 'plan_123',
        status: params.immediate ? 'canceled' : 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: !params.immediate,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Emit subscription cancelled event
      this.eventEmitter.emitEvent('subscription:cancelled', {
        subscriptionId: cancelledSubscription.id,
        customerId: cancelledSubscription.customerId,
        status: cancelledSubscription.status,
        cancelAtPeriodEnd: cancelledSubscription.cancelAtPeriodEnd,
        reason: params.reason,
      });

      logger.info(`Subscription cancelled: ${cancelledSubscription.id}`);
      return cancelledSubscription;

    } catch (error) {
      this.eventEmitter.emitEvent('subscription:cancel:failed', {
        error: error.message,
        params,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async handleRecurringPayment(subscriptionId: string, paymentData: any): Promise<void> {
    try {
      // Emit recurring payment started event
      this.eventEmitter.emitEvent('subscription:recurring:payment:started', {
        subscriptionId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        timestamp: new Date().toISOString(),
      });

      // Process payment (would integrate with payment service)
      // ...

      // Emit recurring payment completed event
      this.eventEmitter.emitEvent('subscription:recurring:payment:completed', {
        subscriptionId,
        paymentId: `pay_${Date.now()}`,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: 'succeeded',
        timestamp: new Date().toISOString(),
      });

      logger.info(`Recurring payment processed for subscription: ${subscriptionId}`);

    } catch (error) {
      this.eventEmitter.emitEvent('subscription:recurring:payment:failed', {
        subscriptionId,
        error: error.message,
        amount: paymentData.amount,
        currency: paymentData.currency,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  private calculatePeriodEnd(billingCycle: 'monthly' | 'yearly' | 'weekly'): string {
    const now = new Date();
    switch (billingCycle) {
      case 'weekly':
        return new Date(now.setDate(now.getDate() + 7)).toISOString();
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1)).toISOString();
      case 'yearly':
        return new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
      default:
        return new Date(now.setMonth(now.getMonth() + 1)).toISOString();
    }
  }
  }
