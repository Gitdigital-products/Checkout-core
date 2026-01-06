export const SUBSCRIPTION_EVENTS = {
  // Subscription Lifecycle Events
  CREATED: 'subscription:created',
  CREATION_FAILED: 'subscription:creation:failed',
  UPDATED: 'subscription:updated',
  UPDATE_FAILED: 'subscription:update:failed',
  CANCELLING: 'subscription:cancelling',
  CANCELLED: 'subscription:cancelled',
  CANCEL_FAILED: 'subscription:cancel:failed',
  
  // Billing Events
  RENEWAL_SCHEDULED: 'subscription:renewal:scheduled',
  RENEWAL_COMPLETED: 'subscription:renewal:completed',
  RENEWAL_FAILED: 'subscription:renewal:failed',
  
  // Payment Events
  RECURRING_PAYMENT_STARTED: 'subscription:recurring:payment:started',
  RECURRING_PAYMENT_COMPLETED: 'subscription:recurring:payment:completed',
  RECURRING_PAYMENT_FAILED: 'subscription:recurring:payment:failed',
  
  // Status Change Events
  ACTIVATED: 'subscription:activated',
  SUSPENDED: 'subscription:suspended',
  EXPIRED: 'subscription:expired',
  TRIAL_ENDING: 'subscription:trial:ending',
  TRIAL_ENDED: 'subscription:trial:ended',
  
  // Invoice Events
  INVOICE_CREATED: 'subscription:invoice:created',
  INVOICE_PAID: 'subscription:invoice:paid',
  INVOICE_PAYMENT_FAILED: 'subscription:invoice:payment:failed',
} as const;

export interface SubscriptionEventData {
  subscriptionId: string;
  customerId: string;
  planId: string;
  status: string;
  amount?: number;
  currency?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, any>;
  error?: string;
  timestamp: string;
}
