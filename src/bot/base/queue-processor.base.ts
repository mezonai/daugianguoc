import { Logger } from '@nestjs/common';

export abstract class BaseQueueProcessor<T> {
  protected readonly logger: Logger;
  protected queue: T[] = [];
  protected processing = false;
  protected readonly maxConcurrentProcessing: number;
  protected readonly processingTimeout: number;

  constructor(
    loggerContext: string,
    maxConcurrentProcessing: number = 1,
    processingTimeout: number = 30000,
  ) {
    this.logger = new Logger(loggerContext);
    this.maxConcurrentProcessing = maxConcurrentProcessing;
    this.processingTimeout = processingTimeout;
  }

  protected async addToQueue(item: T): Promise<void> {
    this.queue.push(item);
    if (!this.processing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      if (this.maxConcurrentProcessing === 1) {
        while (this.queue.length > 0) {
          const item = this.queue.shift();
          if (item) {
            try {
              await this.processItem(item);
            } catch (error) {
              this.logger.error('Error processing queue item:', error);
              await this.handleProcessingError(item, error);
            }
          }
        }
      } else {
        const promises: Promise<void>[] = [];
        const processing: T[] = [];

        while (
          this.queue.length > 0 &&
          processing.length < this.maxConcurrentProcessing
        ) {
          const item = this.queue.shift();
          if (item) {
            processing.push(item);
            promises.push(
              this.processItemWithTimeout(item).catch(async (error) => {
                this.logger.error('Error processing queue item:', error);
                await this.handleProcessingError(item, error);
              }),
            );
          }
        }

        if (promises.length > 0) {
          await Promise.all(promises);
        }
      }
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        setImmediate(() => this.processQueue()); // ?
      }
    }
  }

  private async processItemWithTimeout(item: T): Promise<void> {
    return Promise.race([
      this.processItem(item),
      new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(`Processing timeout after ${this.processingTimeout}ms`),
          );
        }, this.processingTimeout);
      }),
    ]);
  }

  protected abstract processItem(item: T): Promise<void>;

  protected async handleProcessingError(item: T, error: any): Promise<void> {
    this.logger.error(`Failed to process item:`, {
      item,
      error: error.message,
    });
  }

  public getQueueStats(): {
    queueLength: number;
    isProcessing: boolean;
    maxConcurrentProcessing: number;
  } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.processing,
      maxConcurrentProcessing: this.maxConcurrentProcessing,
    };
  }

  public clearQueue(): void {
    const clearedCount = this.queue.length;
    this.queue = [];
    this.logger.log(`Cleared ${clearedCount} items from queue`);
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public isProcessing(): boolean {
    return this.processing;
  }

  public forceStop(): void {
    this.processing = false;
    this.logger.warn('Queue processing force stopped');
  }

  protected async addBatchToQueue(items: T[]): Promise<void> {
    this.queue.push(...items);
    if (!this.processing) {
      await this.processQueue();
    }
  }
}
