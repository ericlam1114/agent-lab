/**
 * Task Runner
 * Executes a single task against a provider and captures metrics
 */

import type { Provider } from '../providers';
import type { TaskConfig } from '../config/schema';
import type { AgentResponse, TaskInput, GraderResult } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface TaskResult {
  taskId: string;
  success: boolean;
  response?: AgentResponse;
  error?: TaskErrorInfo;
  metrics: TaskMetrics;
  graderResults?: GraderResult[];
}

export interface TaskMetrics {
  startTime: Date;
  endTime: Date;
  durationMs: number;
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface TaskErrorInfo {
  name: string;
  message: string;
  code?: string;
  stack?: string;
}

// ============================================================================
// Task Runner
// ============================================================================

export class TaskRunner {
  private provider: Provider;
  private timeout: number;

  constructor(provider: Provider, timeout: number = 60000) {
    this.provider = provider;
    this.timeout = timeout;
  }

  /**
   * Execute a single task
   */
  async run(task: TaskConfig): Promise<TaskResult> {
    const startTime = new Date();

    try {
      // Execute with timeout
      const response = await this.executeWithTimeout(task);
      const endTime = new Date();

      return {
        taskId: task.id,
        success: true,
        response,
        metrics: this.createMetrics(startTime, endTime, response),
      };
    } catch (error) {
      const endTime = new Date();

      return {
        taskId: task.id,
        success: false,
        error: this.createError(error),
        metrics: this.createMetrics(startTime, endTime),
      };
    }
  }

  /**
   * Execute task with timeout wrapper
   */
  private async executeWithTimeout(task: TaskConfig): Promise<AgentResponse> {
    const taskTimeout = task.timeout ?? this.timeout;

    return Promise.race([
      this.provider.callAgent(task.input as TaskInput),
      this.createTimeoutPromise(taskTimeout),
    ]);
  }

  /**
   * Create a promise that rejects after timeout
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new TaskTimeoutError(`Task timed out after ${timeoutMs}ms`, timeoutMs));
      }, timeoutMs);
    });
  }

  /**
   * Create metrics object from execution times
   */
  private createMetrics(
    startTime: Date,
    endTime: Date,
    response?: AgentResponse
  ): TaskMetrics {
    return {
      startTime,
      endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      latencyMs: response?.latencyMs,
      promptTokens: response?.tokens?.prompt,
      completionTokens: response?.tokens?.completion,
      totalTokens: response?.tokens?.total,
    };
  }

  /**
   * Create error object from exception
   */
  private createError(error: unknown): TaskErrorInfo {
    if (error instanceof Error) {
      const taskError = error as TaskError;
      return {
        name: error.name,
        message: error.message,
        code: taskError.code,
        stack: error.stack,
      };
    }

    return {
      name: 'UnknownError',
      message: String(error),
    };
  }

  /**
   * Get the provider (for testing/debugging)
   */
  getProvider(): Provider {
    return this.provider;
  }

  /**
   * Get the timeout setting
   */
  getTimeout(): number {
    return this.timeout;
  }
}

// ============================================================================
// Custom Errors
// ============================================================================

export class TaskError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'TaskError';
  }
}

export class TaskTimeoutError extends TaskError {
  constructor(
    message: string,
    public readonly timeoutMs: number
  ) {
    super(message, 'TIMEOUT');
    this.name = 'TaskTimeoutError';
  }
}

export class TaskExecutionError extends TaskError {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message, 'EXECUTION_ERROR');
    this.name = 'TaskExecutionError';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTaskRunner(
  provider: Provider,
  timeout?: number
): TaskRunner {
  return new TaskRunner(provider, timeout);
}
