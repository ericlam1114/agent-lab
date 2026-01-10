/**
 * Configuration Parser
 * Reads and validates YAML configuration files
 */

import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { ZodError } from 'zod';
import { EvalConfigSchema, type EvalConfig } from './schema';

// ============================================================================
// Custom Errors
// ============================================================================

export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class ConfigValidationError extends ConfigError {
  constructor(
    message: string,
    public readonly zodError: ZodError,
    filePath?: string
  ) {
    super(message, filePath);
    this.name = 'ConfigValidationError';
  }

  /**
   * Get a formatted error message with all validation issues
   */
  getFormattedErrors(): string {
    const issues = this.zodError.issues.map((issue) => {
      const path = issue.path.join('.');
      return `  - ${path}: ${issue.message}`;
    });
    return `Configuration validation failed:\n${issues.join('\n')}`;
  }
}

// ============================================================================
// Parser Functions
// ============================================================================

/**
 * Parse a YAML configuration string
 */
export function parseConfigString(content: string, filePath?: string): EvalConfig {
  let parsed: unknown;

  try {
    parsed = parseYaml(content);
  } catch (error) {
    throw new ConfigError(
      `Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
      filePath,
      error instanceof Error ? error : undefined
    );
  }

  return validateConfig(parsed, filePath);
}

/**
 * Parse a configuration file (YAML or JSON)
 */
export function parseConfigFile(filePath: string): EvalConfig {
  if (!existsSync(filePath)) {
    throw new ConfigError(`Configuration file not found: ${filePath}`, filePath);
  }

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new ConfigError(
      `Failed to read configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      filePath,
      error instanceof Error ? error : undefined
    );
  }

  // Detect format based on extension
  if (filePath.endsWith('.json')) {
    return parseJsonConfig(content, filePath);
  }

  // Default to YAML
  return parseConfigString(content, filePath);
}

/**
 * Parse a JSON configuration string
 */
export function parseJsonConfig(content: string, filePath?: string): EvalConfig {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new ConfigError(
      `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      filePath,
      error instanceof Error ? error : undefined
    );
  }

  return validateConfig(parsed, filePath);
}

/**
 * Validate parsed configuration against schema
 */
export function validateConfig(data: unknown, filePath?: string): EvalConfig {
  const result = EvalConfigSchema.safeParse(data);

  if (!result.success) {
    throw new ConfigValidationError(
      'Configuration validation failed',
      result.error,
      filePath
    );
  }

  return result.data;
}

/**
 * Merge multiple configurations (later configs override earlier ones)
 */
export function mergeConfigs(...configs: Partial<EvalConfig>[]): EvalConfig {
  // Start with empty object and merge each config
  let merged: Record<string, unknown> = {};

  for (const config of configs) {
    merged = {
      ...merged,
      ...config,
      agent: {
        ...(merged.agent as Record<string, unknown> || {}),
        ...(config.agent || {}),
      },
      settings: {
        ...(merged.settings as Record<string, unknown> || {}),
        ...(config.settings || {}),
      },
      tasks: config.tasks ?? merged.tasks,
      metadata: {
        ...(merged.metadata as Record<string, unknown> || {}),
        ...(config.metadata || {}),
      },
    };
  }

  return validateConfig(merged);
}

/**
 * Generate a sample configuration file content
 */
export function generateSampleConfig(agentType: 'http' | 'cli' = 'http'): string {
  const sample = {
    name: 'my-agent-eval',
    description: 'Evaluation suite for my AI agent',
    agent: agentType === 'http'
      ? {
          type: 'http',
          endpoint: 'http://localhost:3001/agent',
          timeout: 30000,
        }
      : {
          type: 'cli',
          command: 'node ./my-agent.js',
          timeout: 30000,
        },
    tasks: [
      {
        id: 'task-1',
        description: 'Test basic question answering',
        input: {
          messages: [
            {
              role: 'user',
              content: 'What is 2 + 2?',
            },
          ],
        },
        graders: [
          {
            type: 'contains',
            value: '4',
          },
          {
            type: 'llm-rubric',
            rubric: 'The response should be mathematically correct and clearly stated.',
          },
        ],
        trackedMetrics: ['latency', 'tokens'],
      },
    ],
    settings: {
      trialsPerTask: 3,
      maxConcurrency: 5,
      passThreshold: 0.8,
    },
  };

  // Convert to YAML with nice formatting
  return stringifyYaml(sample, { lineWidth: 80 });
}
