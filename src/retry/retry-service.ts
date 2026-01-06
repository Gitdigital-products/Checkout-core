import { CheckoutEventEmitter } from '../core/event-emitter';
import { RetryQueue } from './retry-queue';
import { 
  RetryableOperation, 
  RetryConfig, 
  RetryResult,
  RetryStrategy
} from './types';
import { logger } from '../utils/logger';

export class RetryService {
  private eventEmitter: CheckoutEventEmitter;
  private retryQueue: RetryQueue;
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.eventEmitter = CheckoutEventEmitter.getInstance();
    this.retryQueue = new RetryQueue();
    this.config = {
      maxAttempts: config?.maxAttempts || 3,
      initialDelay: config?.initialDelay || 1000,
      maxDelay: config?.maxDelay || 60000,
      backoffFactor: config?.backoffFactor || 2,
      strategy: config?.strategy || 'exponential',
      ...config,
    };
  }

  async executeWithRetry<T>(
    operation: RetryableOperation<T>,
    context: Record<string, any> = {}
  ): Promise<T> {
    let attempt = 0;
    let lastError: Error;

    while (attempt < this.config.maxAttempts) {
      try {
        attempt++;
        
        // Emit retry attempt event
        this.eventEmitter.emitEvent('retry:attempt', {
          operation: operation.name || 'unknown',
          attempt,
          maxAttempts: this.config.maxAttempts,
          context,
          timestamp: new Date().toISOString(),
        });

        const result = await operation.execute();
        
        // Emit retry success event
        this.eventEmitter.emitEvent('retry:success', {
          operation: operation.name || 'unknown',
          attempt,
          result,
          context,
          timestamp: new Date().toISOString(),
        });

        logger.info(`Operation ${operation.name} succeeded on attempt ${attempt}`);
        return result;

      } catch (error) {
        lastError = error;
        
        // Emit retry failure event
        this.eventEmitter.emitEvent('retry:failed', {
          operation: operation.name || 'unknown',
          attempt,
          error: error.message,
          context,
          timestamp: new Date().toISOString(),
        });

        logger.warn(`Operation ${operation.name} failed on attempt ${attempt}: ${error.message}`);

        if (attempt === this.config.maxAttempts) {
          // Emit retry exhausted event
          this.eventEmitter.emitEvent('retry:exhausted', {
            operation: operation.name || 'unknown',
            maxAttempts: this.config.maxAttempts,
            error: error.message,
            context,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        // Calculate delay based on strategy
        const delay = this.calculateDelay(attempt);
        
        // Emit retry scheduled event
        this.eventEmitter.emitEvent('retry:scheduled', {
          operation: operation.name || 'unknown',
          attempt,
          nextAttempt: attempt + 1,
          delay,
          context,
          timestamp: new Date().toISOString(),
        });

        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  async queueForRetry<T>(
    operation: RetryableOperation<T>,
    context: Record<string, any> = {}
  ): Promise<void> {
    const retryItem = {
      operation,
      context,
      config: this.config,
      createdAt: new Date().toISOString(),
    };

    await this.retryQueue.add(retryItem);

    // Emit queued for retry event
    this.eventEmitter.emitEvent('retry:queued', {
      operation: operation.name || 'unknown',
      context,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Operation ${operation.name} queued for retry`);
  }

  async processRetryQueue(): Promise<void> {
    const items = await this.retryQueue.getPending();
    
    for (const item of items) {
      try {
        await this.executeWithRetry(item.operation, item.context);
        
        // Remove from queue on success
        await this.retryQueue.remove(item);
        
      } catch (error) {
        // Update retry count in queue
        item.context.retryCount = (item.context.retryCount || 0) + 1;
        
        if (item.context.retryCount >= item.config.maxAttempts) {
          // Remove from queue after max attempts
          await this.retryQueue.remove(item);
          
          // Emit retry queue failure event
          this.eventEmitter.emitEvent('retry:queue:item:failed', {
            operation: item.operation.name || 'unknown',
            retryCount: item.context.retryCount,
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  private calculateDelay(attempt: number): number {
    switch (this.config.strategy) {
      case 'exponential':
        return Math.min(
          this.config.initialDelay * Math.pow(this.config.backoffFactor, attempt - 1),
          this.config.maxDelay
        );
      
      case 'linear':
        return Math.min(
          this.config.initialDelay * attempt,
          this.config.maxDelay
        );
      
      case 'fixed':
        return this.config.initialDelay;
      
      default:
        return Math.min(
          this.config.initialDelay * Math.pow(2, attempt - 1),
          this.config.maxDelay
        );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
