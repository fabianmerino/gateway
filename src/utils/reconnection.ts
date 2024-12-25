import { logInfo, logError } from './logger/index.js';

interface RetryConfig {
  initialDelay: number;
  maxDelay: number;
  maxAttempts?: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  initialDelay: 1000,
  maxDelay: 30000,
};

export class ReconnectionManager {
  private attempts = 0;
  private currentDelay: number;
  private timeoutId?: NodeJS.Timeout;
  private isConnecting = false;

  constructor(
    private readonly serviceName: string,
    // biome-ignore lint/style/useDefaultParameterLast: Is better the last parameter use a function
    private readonly config: RetryConfig = DEFAULT_CONFIG,
    private readonly connectFn: () => Promise<void>
  ) {
    this.currentDelay = config.initialDelay;
  }

  public async start(): Promise<void> {
    if (this.isConnecting) return;

    this.isConnecting = true;
    await this.connect();
  }

  public stop(): void {
    this.isConnecting = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  private async connect(): Promise<void> {
    if (!this.isConnecting) return;

    try {
      await this.connectFn();
      this.reset();
    } catch (error) {
      this.attempts++;

      if (this.config.maxAttempts && this.attempts >= this.config.maxAttempts) {
        logError(
          this.serviceName,
          `Max reconnection attempts (${this.config.maxAttempts}) reached`,
          error
        );
        this.stop();
        return;
      }

      logError(
        this.serviceName,
        `Connection attempt ${this.attempts} failed. Retrying in ${
          this.currentDelay / 1000
        }s`,
        error
      );

      this.timeoutId = setTimeout(() => {
        this.currentDelay = Math.min(
          this.currentDelay * 2,
          this.config.maxDelay
        );
        void this.connect();
      }, this.currentDelay);
    }
  }

  private reset(): void {
    this.attempts = 0;
    this.currentDelay = this.config.initialDelay;
  }
}
