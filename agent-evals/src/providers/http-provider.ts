/**
 * HTTP Provider
 * Calls external agent endpoints via HTTP API
 */

import type { AgentConfig } from '../config/schema';
import type { AgentResponse, ToolCall, TokenUsage, TaskInput } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface HttpProviderConfig {
  endpoint: string;
  timeout: number;
  headers?: Record<string, string>;
  retries: number;
  retryDelay: number;
}

export interface HttpAgentRequest {
  messages?: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    toolCallId?: string;
    toolName?: string;
  }>;
  prompt?: string;
  context?: Record<string, unknown>;
}

export interface HttpAgentResponse {
  output: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    result?: string;
    error?: string;
  }>;
  reasoning?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  error?: string;
}

// ============================================================================
// Custom Errors
// ============================================================================

export class HttpProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'HttpProviderError';
  }
}

export class TimeoutError extends HttpProviderError {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class RetryExhaustedError extends HttpProviderError {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message, undefined, undefined, lastError);
    this.name = 'RetryExhaustedError';
  }
}

// ============================================================================
// HTTP Provider
// ============================================================================

export class HttpProvider {
  private config: HttpProviderConfig;

  constructor(agentConfig: AgentConfig) {
    if (agentConfig.type !== 'http') {
      throw new Error('HttpProvider requires agent type "http"');
    }

    if (!agentConfig.endpoint) {
      throw new Error('HttpProvider requires endpoint URL');
    }

    this.config = {
      endpoint: agentConfig.endpoint,
      timeout: agentConfig.timeout ?? 30000,
      headers: agentConfig.headers,
      retries: agentConfig.retries ?? 3,
      retryDelay: agentConfig.retryDelay ?? 1000,
    };
  }

  /**
   * Call the agent endpoint with the given input
   */
  async callAgent(input: TaskInput): Promise<AgentResponse> {
    const startTime = Date.now();

    const request: HttpAgentRequest = {
      messages: input.messages,
      prompt: input.prompt,
      context: input.context,
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retries + 1; attempt++) {
      try {
        const response = await this.makeRequest(request);
        const latencyMs = Date.now() - startTime;

        return this.parseResponse(response, latencyMs);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors
        if (error instanceof TimeoutError) {
          throw error;
        }

        if (error instanceof HttpProviderError && error.statusCode) {
          // Don't retry on 4xx client errors (except 429 rate limit)
          if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
            throw error;
          }
        }

        // Wait before retrying
        if (attempt < this.config.retries + 1) {
          await this.delay(this.config.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    throw new RetryExhaustedError(
      `Failed after ${this.config.retries + 1} attempts`,
      this.config.retries + 1,
      lastError!
    );
  }

  /**
   * Make the HTTP request with timeout
   */
  private async makeRequest(request: HttpAgentRequest): Promise<HttpAgentResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new HttpProviderError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          text
        );
      }

      const data = await response.json();
      return data as HttpAgentResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(
          `Request timed out after ${this.config.timeout}ms`,
          this.config.timeout
        );
      }

      if (error instanceof HttpProviderError) {
        throw error;
      }

      throw new HttpProviderError(
        `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Parse the HTTP response into AgentResponse format
   */
  private parseResponse(response: HttpAgentResponse, latencyMs: number): AgentResponse {
    const toolCalls: ToolCall[] = (response.toolCalls || []).map((tc) => ({
      id: tc.id,
      name: tc.name,
      arguments: tc.arguments,
      result: tc.result,
      error: tc.error,
    }));

    const tokens: TokenUsage | undefined = response.usage
      ? {
          prompt: response.usage.promptTokens ?? 0,
          completion: response.usage.completionTokens ?? 0,
          total: response.usage.totalTokens ?? 0,
        }
      : undefined;

    return {
      output: response.output,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      reasoning: response.reasoning,
      latencyMs,
      tokens,
      error: response.error,
    };
  }

  /**
   * Delay helper for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get the endpoint URL (for debugging)
   */
  getEndpoint(): string {
    return this.config.endpoint;
  }

  /**
   * Get the timeout setting
   */
  getTimeout(): number {
    return this.config.timeout;
  }
}

// ============================================================================
// Provider Factory
// ============================================================================

export type Provider = HttpProvider; // Will add more provider types later

export function createProvider(config: AgentConfig): Provider {
  switch (config.type) {
    case 'http':
      return new HttpProvider(config);
    case 'sdk':
    case 'cli':
      throw new Error(`Provider type "${config.type}" not yet implemented`);
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}
