/**
 * Transcript
 * Records all messages in an evaluation trial
 */

import type { ToolCall, TokenUsage } from '../types';

// ============================================================================
// Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface TranscriptMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  tokens?: number;
  toolCall?: ToolCallRecord;
  toolResult?: ToolResultRecord;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResultRecord {
  toolCallId: string;
  result?: string;
  error?: string;
  durationMs?: number;
}

export interface TranscriptData {
  id: string;
  messages: TranscriptMessage[];
  startTime: Date;
  endTime?: Date;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalLatencyMs: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Transcript Class
// ============================================================================

export class Transcript {
  private id: string;
  private messages: TranscriptMessage[] = [];
  private startTime: Date;
  private endTime?: Date;
  private totalTokens = 0;
  private promptTokens = 0;
  private completionTokens = 0;
  private totalLatencyMs = 0;
  private metadata?: Record<string, unknown>;
  private messageCounter = 0;

  constructor(id?: string) {
    this.id = id ?? this.generateId();
    this.startTime = new Date();
  }

  /**
   * Add a user message
   */
  addUserMessage(content: string, tokens?: number): TranscriptMessage {
    return this.addMessage('user', content, tokens);
  }

  /**
   * Add an assistant message
   */
  addAssistantMessage(content: string, tokens?: number): TranscriptMessage {
    return this.addMessage('assistant', content, tokens);
  }

  /**
   * Add a system message
   */
  addSystemMessage(content: string, tokens?: number): TranscriptMessage {
    return this.addMessage('system', content, tokens);
  }

  /**
   * Add a tool call message
   */
  addToolCall(toolCall: ToolCall): TranscriptMessage {
    const message: TranscriptMessage = {
      id: this.generateMessageId(),
      role: 'assistant',
      content: `Tool call: ${toolCall.name}`,
      timestamp: new Date(),
      toolCall: {
        id: toolCall.id,
        name: toolCall.name,
        arguments: toolCall.arguments,
      },
    };

    this.messages.push(message);
    return message;
  }

  /**
   * Add a tool result message
   */
  addToolResult(
    toolCallId: string,
    result?: string,
    error?: string,
    durationMs?: number
  ): TranscriptMessage {
    const message: TranscriptMessage = {
      id: this.generateMessageId(),
      role: 'tool',
      content: result ?? error ?? '',
      timestamp: new Date(),
      toolResult: {
        toolCallId,
        result,
        error,
        durationMs,
      },
    };

    this.messages.push(message);
    return message;
  }

  /**
   * Add a generic message
   */
  addMessage(role: MessageRole, content: string, tokens?: number): TranscriptMessage {
    const message: TranscriptMessage = {
      id: this.generateMessageId(),
      role,
      content,
      timestamp: new Date(),
      tokens,
    };

    this.messages.push(message);

    if (tokens) {
      this.totalTokens += tokens;
      if (role === 'user' || role === 'system') {
        this.promptTokens += tokens;
      } else {
        this.completionTokens += tokens;
      }
    }

    return message;
  }

  /**
   * Update token counts
   */
  updateTokens(usage: TokenUsage): void {
    this.promptTokens = usage.prompt;
    this.completionTokens = usage.completion;
    this.totalTokens = usage.total;
  }

  /**
   * Add latency
   */
  addLatency(ms: number): void {
    this.totalLatencyMs += ms;
  }

  /**
   * Mark the transcript as complete
   */
  complete(): void {
    this.endTime = new Date();
  }

  /**
   * Set metadata
   */
  setMetadata(metadata: Record<string, unknown>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  /**
   * Get all messages
   */
  getMessages(): TranscriptMessage[] {
    return [...this.messages];
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * Get total tokens
   */
  getTotalTokens(): number {
    return this.totalTokens;
  }

  /**
   * Get total latency
   */
  getTotalLatencyMs(): number {
    return this.totalLatencyMs;
  }

  /**
   * Get duration (if completed)
   */
  getDurationMs(): number | undefined {
    if (!this.endTime) return undefined;
    return this.endTime.getTime() - this.startTime.getTime();
  }

  /**
   * Convert to JSON-serializable object
   */
  toJSON(): TranscriptData {
    return {
      id: this.id,
      messages: this.messages.map((m) => ({
        ...m,
        timestamp: m.timestamp,
      })),
      startTime: this.startTime,
      endTime: this.endTime,
      totalTokens: this.totalTokens,
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      totalLatencyMs: this.totalLatencyMs,
      metadata: this.metadata,
    };
  }

  /**
   * Serialize to JSON string
   */
  toString(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  /**
   * Create from JSON data
   */
  static fromJSON(data: TranscriptData): Transcript {
    const transcript = new Transcript(data.id);
    transcript.messages = data.messages.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
    transcript.startTime = new Date(data.startTime);
    transcript.endTime = data.endTime ? new Date(data.endTime) : undefined;
    transcript.totalTokens = data.totalTokens;
    transcript.promptTokens = data.promptTokens;
    transcript.completionTokens = data.completionTokens;
    transcript.totalLatencyMs = data.totalLatencyMs;
    transcript.metadata = data.metadata;
    transcript.messageCounter = data.messages.length;
    return transcript;
  }

  /**
   * Create from JSON string
   */
  static fromString(json: string): Transcript {
    const data = JSON.parse(json) as TranscriptData;
    return Transcript.fromJSON(data);
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return `msg_${++this.messageCounter}`;
  }
}
