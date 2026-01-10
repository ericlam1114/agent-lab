/**
 * Configuration Schema
 * Zod schemas for validating YAML configuration files
 */

import { z } from 'zod';

// ============================================================================
// Agent Configuration
// ============================================================================

export const AgentTypeSchema = z.enum([
  'coding',
  'conversational',
  'research',
  'computer-use',
]);

export const AgentConfigSchema = z.object({
  type: z.enum(['http', 'sdk', 'cli']).default('http'),
  endpoint: z.string().url().optional(),
  command: z.string().optional(),
  timeout: z.number().positive().default(30000),
  headers: z.record(z.string()).optional(),
  retries: z.number().int().min(0).default(3),
  retryDelay: z.number().positive().default(1000),
}).refine(
  (data) => {
    if (data.type === 'http' && !data.endpoint) {
      return false;
    }
    if (data.type === 'cli' && !data.command) {
      return false;
    }
    return true;
  },
  {
    message: 'HTTP agents require endpoint, CLI agents require command',
  }
);

// ============================================================================
// Message Configuration
// ============================================================================

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system', 'tool']);

export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
  toolCallId: z.string().optional(),
  toolName: z.string().optional(),
});

// ============================================================================
// Environment Configuration
// ============================================================================

export const EnvironmentConfigSchema = z.object({
  type: z.enum(['browser', 'terminal', 'sandbox']).optional(),
  setup: z.array(z.string()).optional(),
  teardown: z.array(z.string()).optional(),
  workdir: z.string().optional(),
  env: z.record(z.string()).optional(),
});

// ============================================================================
// Task Input Configuration
// ============================================================================

export const TaskInputSchema = z.object({
  messages: z.array(MessageSchema).optional(),
  prompt: z.string().optional(),
  context: z.record(z.unknown()).optional(),
  environment: EnvironmentConfigSchema.optional(),
}).refine(
  (data) => data.messages || data.prompt,
  {
    message: 'Task input must have either messages or prompt',
  }
);

// ============================================================================
// Grader Configuration
// ============================================================================

export const GraderTypeSchema = z.enum([
  // Code-based graders
  'exact-match',
  'contains',
  'regex',
  'fuzzy-match',
  'json-valid',
  'json-schema',
  'state-check',
  'test-runner',
  // Model-based graders
  'llm-rubric',
  'factuality',
  'similarity',
  // Human graders
  'human-review',
]);

export const GraderConfigSchema = z.object({
  type: GraderTypeSchema,
  weight: z.number().min(0).max(1).default(1.0),
  // String match graders
  value: z.string().optional(),
  caseSensitive: z.boolean().default(true),
  // Fuzzy match
  threshold: z.number().min(0).max(1).default(0.8),
  // JSON schema
  schema: z.record(z.unknown()).optional(),
  // State check
  expect: z.record(z.unknown()).optional(),
  query: z.string().optional(),
  path: z.string().optional(),
  url: z.string().optional(),
  // LLM rubric
  rubric: z.string().optional(),
  model: z.string().optional(),
  // Test runner
  command: z.string().optional(),
  pattern: z.string().optional(),
}).refine(
  (data) => {
    // Validate required fields based on grader type
    switch (data.type) {
      case 'exact-match':
      case 'contains':
      case 'regex':
      case 'fuzzy-match':
        return data.value !== undefined;
      case 'json-schema':
        return data.schema !== undefined;
      case 'state-check':
        return data.expect !== undefined;
      case 'llm-rubric':
        return data.rubric !== undefined;
      case 'test-runner':
        return data.command !== undefined;
      default:
        return true;
    }
  },
  {
    message: 'Missing required fields for grader type',
  }
);

// ============================================================================
// Task Configuration
// ============================================================================

export const TaskConfigSchema = z.object({
  id: z.string(),
  type: AgentTypeSchema.optional(),
  description: z.string(),
  input: TaskInputSchema,
  graders: z.array(GraderConfigSchema).min(1),
  trackedMetrics: z.array(z.string()).optional(),
  timeout: z.number().positive().optional(),
  retries: z.number().int().min(0).optional(),
});

// ============================================================================
// Evaluation Settings
// ============================================================================

export const EvalSettingsSchema = z.object({
  trialsPerTask: z.number().int().positive().default(1),
  maxConcurrency: z.number().int().positive().default(5),
  passThreshold: z.number().min(0).max(1).default(0.5),
  timeout: z.number().positive().default(60000),
  retries: z.number().int().min(0).default(3),
  stopOnFailure: z.boolean().default(false),
  randomizeOrder: z.boolean().default(false),
  seed: z.number().int().optional(),
});

// ============================================================================
// Full Evaluation Configuration
// ============================================================================

export const EvalConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().optional(),
  agent: AgentConfigSchema,
  tasks: z.array(TaskConfigSchema).min(1),
  settings: EvalSettingsSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type AgentType = z.infer<typeof AgentTypeSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
export type TaskInput = z.infer<typeof TaskInputSchema>;
export type GraderType = z.infer<typeof GraderTypeSchema>;
export type GraderConfig = z.infer<typeof GraderConfigSchema>;
export type TaskConfig = z.infer<typeof TaskConfigSchema>;
export type EvalSettings = z.infer<typeof EvalSettingsSchema>;
export type EvalConfig = z.infer<typeof EvalConfigSchema>;

// ============================================================================
// Config Parser
// ============================================================================

import * as yaml from 'yaml';

/**
 * Parse a YAML configuration string and validate against schema
 */
export function parseConfig(content: string): EvalConfig {
  // Parse YAML
  const parsed = yaml.parse(content);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid YAML: expected an object');
  }

  // Normalize settings field name (allow both 'settings' and 'concurrency')
  if (parsed.settings?.concurrency && !parsed.settings?.maxConcurrency) {
    parsed.settings.maxConcurrency = parsed.settings.concurrency;
    delete parsed.settings.concurrency;
  }

  // Validate against schema
  const result = EvalConfigSchema.safeParse(parsed);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Configuration validation failed:\n${errors}`);
  }

  // Apply defaults for settings
  const config = result.data;
  config.settings = {
    trialsPerTask: 1,
    maxConcurrency: 5,
    passThreshold: 0.5,
    timeout: 60000,
    retries: 3,
    stopOnFailure: false,
    randomizeOrder: false,
    ...config.settings,
  };

  return config;
}

/**
 * Parse config from a file path
 */
export async function parseConfigFile(filePath: string): Promise<EvalConfig> {
  const fs = await import('fs');
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseConfig(content);
}
