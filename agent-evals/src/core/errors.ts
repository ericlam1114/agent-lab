/**
 * Custom Error Classes (Task 33)
 * Typed errors for better error handling
 */

// ============================================================================
// Base Error
// ============================================================================

export class AgentEvalError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AgentEvalError';
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
    };
  }
}

// ============================================================================
// Provider Errors
// ============================================================================

export class ProviderError extends AgentEvalError {
  constructor(
    message: string,
    public endpoint?: string,
    public statusCode?: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'PROVIDER_ERROR', { ...context, endpoint, statusCode });
    this.name = 'ProviderError';
  }
}

export class TimeoutError extends AgentEvalError {
  constructor(
    message: string,
    public timeoutMs: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'TIMEOUT_ERROR', { ...context, timeoutMs });
    this.name = 'TimeoutError';
  }
}

export class NetworkError extends AgentEvalError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

// ============================================================================
// Config Errors
// ============================================================================

export class ConfigError extends AgentEvalError {
  constructor(
    message: string,
    public path?: string,
    public validationErrors?: string[],
    context?: Record<string, unknown>
  ) {
    super(message, 'CONFIG_ERROR', { ...context, path, validationErrors });
    this.name = 'ConfigError';
  }
}

// ============================================================================
// Grader Errors
// ============================================================================

export class GraderError extends AgentEvalError {
  constructor(
    message: string,
    public graderType: string,
    public graderId?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'GRADER_ERROR', { ...context, graderType, graderId });
    this.name = 'GraderError';
  }
}

// ============================================================================
// Task Errors
// ============================================================================

export class TaskError extends AgentEvalError {
  constructor(
    message: string,
    public taskId: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'TASK_ERROR', { ...context, taskId });
    this.name = 'TaskError';
  }
}

// ============================================================================
// Circuit Breaker
// ============================================================================

export class CircuitBreakerOpen extends AgentEvalError {
  constructor(
    message: string,
    public failureCount: number,
    public resetAfterMs: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'CIRCUIT_BREAKER_OPEN', { ...context, failureCount, resetAfterMs });
    this.name = 'CircuitBreakerOpen';
  }
}

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeMs: number;
}

type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private lastFailureTime = 0;
  private config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      resetTimeMs: config?.resetTimeMs ?? 30000,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.config.resetTimeMs) {
        this.state = 'half-open';
      } else {
        throw new CircuitBreakerOpen(
          'Circuit breaker is open',
          this.failures,
          this.config.resetTimeMs - timeSinceFailure
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}

// ============================================================================
// Retry with Exponential Backoff
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'PROVIDER_ERROR'],
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let delay = retryConfig.initialDelayMs;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const isRetryable =
        error instanceof AgentEvalError &&
        retryConfig.retryableErrors?.includes(error.code);

      if (!isRetryable || attempt === retryConfig.maxRetries) {
        throw lastError;
      }

      // Wait with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelayMs);
    }
  }

  throw lastError;
}

// ============================================================================
// Error Logger
// ============================================================================

export interface ErrorLogEntry {
  timestamp: Date;
  error: AgentEvalError;
  context?: Record<string, unknown>;
}

export class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs: number;

  constructor(maxLogs = 1000) {
    this.maxLogs = maxLogs;
  }

  log(error: Error, context?: Record<string, unknown>): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date(),
      error:
        error instanceof AgentEvalError
          ? error
          : new AgentEvalError(error.message, 'UNKNOWN_ERROR', { stack: error.stack }),
      context,
    };

    this.logs.push(entry);

    // Trim old logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output
    console.error(
      `[${entry.timestamp.toISOString()}] ${entry.error.name}: ${entry.error.message}`,
      entry.context
    );
  }

  getRecentErrors(count = 10): ErrorLogEntry[] {
    return this.logs.slice(-count);
  }

  getErrorsByCode(code: string): ErrorLogEntry[] {
    return this.logs.filter((l) => l.error.code === code);
  }

  clear(): void {
    this.logs = [];
  }
}

// Singleton error logger
export const errorLogger = new ErrorLogger();
