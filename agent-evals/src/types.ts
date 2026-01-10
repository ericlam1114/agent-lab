/**
 * Core types for the Agent Evals Framework
 * Based on Anthropic's agent evaluation concepts
 */

// ============================================================================
// Agent Configuration
// ============================================================================

export type AgentType = 'coding' | 'conversational' | 'research' | 'computer-use';

export interface AgentConfig {
  type: 'http' | 'sdk' | 'cli';
  endpoint?: string;
  command?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// ============================================================================
// Task Configuration
// ============================================================================

export interface TaskConfig {
  id: string;
  type: AgentType;
  description: string;
  input: TaskInput;
  graders: GraderConfig[];
  trackedMetrics?: string[];
}

export interface TaskInput {
  messages?: Message[];
  prompt?: string;
  context?: Record<string, unknown>;
  environment?: EnvironmentConfig;
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
}

export interface EnvironmentConfig {
  type: 'browser' | 'terminal' | 'sandbox';
  setup?: string[];
  teardown?: string[];
}

// ============================================================================
// Grader Configuration
// ============================================================================

export type GraderType =
  // Code-based graders
  | 'exact-match'
  | 'contains'
  | 'regex'
  | 'fuzzy-match'
  | 'json-valid'
  | 'json-schema'
  | 'state-check'
  | 'test-runner'
  // Model-based graders
  | 'llm-rubric'
  | 'factuality'
  | 'similarity'
  // Human graders
  | 'human-review';

export interface GraderConfig {
  type: GraderType;
  weight?: number;
  // Type-specific config
  value?: string;
  rubric?: string;
  schema?: Record<string, unknown>;
  expect?: Record<string, unknown>;
  threshold?: number;
  model?: string;
}

// ============================================================================
// Evaluation Configuration
// ============================================================================

export interface EvalConfig {
  name: string;
  description?: string;
  agent: AgentConfig;
  tasks: TaskConfig[];
  settings?: EvalSettings;
}

export interface EvalSettings {
  trialsPerTask?: number;
  maxConcurrency?: number;
  passThreshold?: number;
  timeout?: number;
  retries?: number;
}

// ============================================================================
// Execution Results
// ============================================================================

export interface AgentResponse {
  output: string;
  toolCalls?: ToolCall[];
  reasoning?: string;
  latencyMs: number;
  tokens?: TokenUsage;
  error?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
  error?: string;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

// ============================================================================
// Trial & Results
// ============================================================================

export interface Trial {
  id: string;
  taskId: string;
  attempt: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  transcript: Transcript;
  outcome?: Outcome;
  score?: number;
  graderResults: GraderResult[];
  startedAt: Date;
  completedAt?: Date;
}

export interface Transcript {
  messages: TranscriptMessage[];
  totalTokens: number;
  totalLatencyMs: number;
}

export interface TranscriptMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  tokens?: number;
  toolCall?: ToolCall;
}

export interface Outcome {
  success: boolean;
  state?: Record<string, unknown>;
  artifacts?: string[];
}

export interface GraderResult {
  graderId: string;
  graderType: GraderType;
  passed: boolean;
  score: number;
  details?: string;
  error?: string;
}

// ============================================================================
// Evaluation Results
// ============================================================================

export interface EvalResult {
  id: string;
  evalId: string;
  taskId: string;
  trials: Trial[];
  passAtK: Record<number, number>;
  passToTheK: Record<number, number>;
  avgScore: number;
  avgLatency: number;
  totalTokens: number;
}

export interface EvalSummary {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalTasks: number;
  completedTasks: number;
  passRate: number;
  avgScore: number;
  totalTrials: number;
  passedTrials: number;
  startedAt: Date;
  completedAt?: Date;
  config: EvalConfig;
  results: EvalResult[];
}

// ============================================================================
// Metrics
// ============================================================================

export interface EvalMetrics {
  passAtK: Record<number, number>;
  passToTheK: Record<number, number>;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  tokenUsage: TokenUsage;
  estimatedCost?: number;
}

// ============================================================================
// Progress & Events
// ============================================================================

export interface EvalProgress {
  evalId: string;
  currentTask: number;
  totalTasks: number;
  currentTrial: number;
  trialsPerTask: number;
  status: string;
  elapsedMs: number;
  estimatedRemainingMs?: number;
}

export type EvalEvent =
  | { type: 'eval-started'; evalId: string; config: EvalConfig }
  | { type: 'task-started'; evalId: string; taskId: string }
  | { type: 'trial-started'; evalId: string; taskId: string; trialId: string; attempt: number }
  | { type: 'trial-completed'; evalId: string; taskId: string; trialId: string; result: Trial }
  | { type: 'task-completed'; evalId: string; taskId: string; result: EvalResult }
  | { type: 'eval-completed'; evalId: string; summary: EvalSummary }
  | { type: 'eval-failed'; evalId: string; error: string };
