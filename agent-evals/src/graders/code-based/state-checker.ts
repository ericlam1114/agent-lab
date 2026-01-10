/**
 * State Checker Grader
 * Verifies environment state after agent execution
 */

import { readFileSync, existsSync, statSync } from 'fs';
import * as path from 'path';
import { URL } from 'url';
import type { GraderResult, GraderType } from '../../types';
import { deepEqual } from './json-validator';

// ============================================================================
// Security: URL Validation (SSRF Protection)
// ============================================================================

/**
 * Blocked IP ranges for SSRF protection
 */
const BLOCKED_IP_PATTERNS = [
  /^127\./, // 127.0.0.0/8 (loopback)
  /^10\./, // 10.0.0.0/8 (private)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (private)
  /^192\.168\./, // 192.168.0.0/16 (private)
  /^169\.254\./, // 169.254.0.0/16 (link-local, AWS metadata)
  /^0\./, // 0.0.0.0/8
  /^::1$/, // IPv6 loopback
  /^fc00:/, // IPv6 private
  /^fe80:/, // IPv6 link-local
];

/**
 * Blocked hostnames for SSRF protection
 */
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata',
  '169.254.169.254', // AWS/GCP metadata endpoint
];

/**
 * Check if SSRF protection should be skipped (for testing)
 */
function shouldAllowLocalhost(): boolean {
  return process.env.ALLOW_LOCALHOST === 'true' || process.env.NODE_ENV === 'test';
}

/**
 * Validate URL to prevent SSRF attacks
 */
function validateUrl(urlString: string): void {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(`Invalid URL: ${urlString}`);
  }

  // Only allow HTTP/HTTPS
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Invalid protocol: ${url.protocol}. Only http and https are allowed.`);
  }

  // Allow localhost in test environments
  if (shouldAllowLocalhost()) {
    return;
  }

  // Check blocked hostnames
  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new Error(`Blocked hostname: ${hostname}`);
  }

  // Check if hostname is an IP address and block private ranges
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new Error(`Blocked IP address: ${hostname}. Private and internal IPs are not allowed.`);
    }
  }
}

// ============================================================================
// Security: Command Validation
// ============================================================================

/**
 * Allowed command executables for state checking (whitelist)
 */
const ALLOWED_STATE_CHECK_COMMANDS = [
  'ls', 'cat', 'head', 'tail', 'wc', 'grep', 'find', 'test',
  'echo', 'stat', 'file', 'diff', 'md5sum', 'sha256sum',
  'git', 'node', 'npm', 'npx',
];

/**
 * Validate command for safe execution
 */
function validateStateCommand(command: string): { executable: string; args: string[] } {
  if (!command || typeof command !== 'string') {
    throw new Error('Command must be a non-empty string');
  }

  const parts = command.trim().split(/\s+/);
  const executable = parts[0];
  const args = parts.slice(1);

  const baseName = path.basename(executable);
  if (!ALLOWED_STATE_CHECK_COMMANDS.includes(baseName) && !ALLOWED_STATE_CHECK_COMMANDS.includes(executable)) {
    throw new Error(
      `Command executable "${executable}" is not allowed for state checks. ` +
      `Allowed: ${ALLOWED_STATE_CHECK_COMMANDS.join(', ')}`
    );
  }

  // Block dangerous shell metacharacters
  const dangerousChars = /[;&|`$(){}[\]<>\\]/;
  for (const arg of args) {
    if (dangerousChars.test(arg)) {
      throw new Error(`Argument "${arg}" contains potentially dangerous characters.`);
    }
  }

  return { executable, args };
}

// ============================================================================
// Security: Path Validation
// ============================================================================

/**
 * Validate file path to prevent path traversal
 */
function validateFilePath(filePath: string, baseDir?: string): string {
  const resolved = path.resolve(filePath);

  if (baseDir) {
    const resolvedBase = path.resolve(baseDir);
    if (!resolved.startsWith(resolvedBase)) {
      throw new Error(`Path traversal detected: path must be within ${baseDir}`);
    }
  }

  // Block common sensitive paths
  const blockedPaths = ['/etc/shadow', '/etc/passwd', '~/.ssh', '~/.aws'];
  for (const blocked of blockedPaths) {
    if (resolved.includes(blocked) || filePath.includes(blocked)) {
      throw new Error(`Access to ${blocked} is not allowed`);
    }
  }

  return resolved;
}

// ============================================================================
// Types
// ============================================================================

export type StateCheckType = 'file' | 'api' | 'db' | 'command';

export interface StateCheckConfig {
  type: StateCheckType;
  // For file checks
  path?: string;
  fileContent?: string;
  fileExists?: boolean;
  filePattern?: string;
  // For API checks
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  // For command checks
  command?: string;
  workingDirectory?: string;
  // Expected result
  expect?: unknown;
  expectStatus?: number;
  expectMatch?: string | RegExp;
  // Timeout
  timeout?: number;
}

export interface StateCheckResult {
  type: StateCheckType;
  passed: boolean;
  actual?: unknown;
  expected?: unknown;
  details: string;
  error?: string;
}

// ============================================================================
// File State Checker
// ============================================================================

/**
 * Check file system state
 */
async function checkFileState(config: StateCheckConfig): Promise<StateCheckResult> {
  const { path: filePath, fileContent, fileExists, filePattern } = config;

  if (!filePath) {
    return {
      type: 'file',
      passed: false,
      details: 'File path not provided',
      error: 'Configuration error: path required',
    };
  }

  // Validate path to prevent traversal (security)
  let safePath: string;
  try {
    safePath = validateFilePath(filePath);
  } catch (validationError) {
    return {
      type: 'file',
      passed: false,
      details: 'Path validation failed',
      error: validationError instanceof Error ? validationError.message : String(validationError),
    };
  }

  // Check file existence
  const exists = existsSync(safePath);

  if (fileExists !== undefined) {
    const passed = exists === fileExists;
    return {
      type: 'file',
      passed,
      actual: exists,
      expected: fileExists,
      details: passed
        ? `File ${fileExists ? 'exists' : 'does not exist'} as expected: ${safePath}`
        : `File ${exists ? 'exists' : 'does not exist'}, expected ${fileExists ? 'to exist' : 'not to exist'}`,
    };
  }

  if (!exists) {
    return {
      type: 'file',
      passed: false,
      details: `File not found: ${safePath}`,
    };
  }

  // Read file content
  try {
    const stats = statSync(safePath);
    if (stats.isDirectory()) {
      return {
        type: 'file',
        passed: false,
        details: `Path is a directory, not a file: ${safePath}`,
      };
    }

    const content = readFileSync(safePath, 'utf-8');

    // Check exact content match
    if (fileContent !== undefined) {
      const passed = content === fileContent;
      return {
        type: 'file',
        passed,
        actual: content.slice(0, 200) + (content.length > 200 ? '...' : ''),
        expected: fileContent.slice(0, 200) + (fileContent.length > 200 ? '...' : ''),
        details: passed
          ? 'File content matches expected'
          : 'File content does not match expected',
      };
    }

    // Check pattern match
    if (filePattern !== undefined) {
      const regex = new RegExp(filePattern);
      const passed = regex.test(content);
      return {
        type: 'file',
        passed,
        details: passed
          ? `File content matches pattern: ${filePattern}`
          : `File content does not match pattern: ${filePattern}`,
      };
    }

    // Default: just verify file is readable
    return {
      type: 'file',
      passed: true,
      details: `File exists and is readable: ${safePath} (${content.length} bytes)`,
    };
  } catch (error) {
    return {
      type: 'file',
      passed: false,
      details: `Error reading file: ${safePath}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// API State Checker
// ============================================================================

/**
 * Check API state via HTTP call
 */
async function checkApiState(config: StateCheckConfig): Promise<StateCheckResult> {
  const {
    url,
    method = 'GET',
    headers = {},
    body,
    expect,
    expectStatus,
    expectMatch,
    timeout = 10000,
  } = config;

  if (!url) {
    return {
      type: 'api',
      passed: false,
      details: 'URL not provided',
      error: 'Configuration error: url required',
    };
  }

  // Validate URL to prevent SSRF (security)
  try {
    validateUrl(url);
  } catch (validationError) {
    return {
      type: 'api',
      passed: false,
      details: 'URL validation failed',
      error: validationError instanceof Error ? validationError.message : String(validationError),
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Check status code
    if (expectStatus !== undefined && response.status !== expectStatus) {
      return {
        type: 'api',
        passed: false,
        actual: response.status,
        expected: expectStatus,
        details: `Expected status ${expectStatus}, got ${response.status}`,
      };
    }

    // Get response body
    const responseText = await response.text();
    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Check exact value match
    if (expect !== undefined) {
      const passed = deepEqual(responseData, expect);
      return {
        type: 'api',
        passed,
        actual: responseData,
        expected: expect,
        details: passed
          ? 'API response matches expected value'
          : 'API response does not match expected value',
      };
    }

    // Check pattern match
    if (expectMatch !== undefined) {
      const regex = expectMatch instanceof RegExp ? expectMatch : new RegExp(expectMatch);
      const passed = regex.test(responseText);
      return {
        type: 'api',
        passed,
        details: passed
          ? `API response matches pattern`
          : `API response does not match pattern`,
      };
    }

    // Default: just verify successful response
    const passed = response.ok;
    return {
      type: 'api',
      passed,
      actual: response.status,
      details: passed
        ? `API call successful: ${method} ${url} (${response.status})`
        : `API call failed: ${method} ${url} (${response.status})`,
    };
  } catch (error) {
    return {
      type: 'api',
      passed: false,
      details: `API call failed: ${url}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Command State Checker
// ============================================================================

/**
 * Check state via command execution
 * Uses spawn with shell: false to prevent command injection
 */
async function checkCommandState(config: StateCheckConfig): Promise<StateCheckResult> {
  const { command, workingDirectory, expect, expectMatch, timeout = 30000 } = config;

  if (!command) {
    return {
      type: 'command',
      passed: false,
      details: 'Command not provided',
      error: 'Configuration error: command required',
    };
  }

  // Validate command (security)
  let executable: string;
  let args: string[];
  try {
    const validated = validateStateCommand(command);
    executable = validated.executable;
    args = validated.args;
  } catch (validationError) {
    return {
      type: 'command',
      passed: false,
      details: 'Command validation failed',
      error: validationError instanceof Error ? validationError.message : String(validationError),
    };
  }

  try {
    const { spawnSync } = await import('child_process');

    // Use spawnSync with shell: false for security
    const result = spawnSync(executable, args, {
      cwd: workingDirectory,
      encoding: 'utf-8',
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false, // SECURITY: Prevent command injection
    });

    if (result.error) {
      throw result.error;
    }

    const output = (result.stdout || '') + (result.stderr || '');

    // Check exact output match
    if (expect !== undefined) {
      const passed = output.trim() === String(expect).trim();
      return {
        type: 'command',
        passed,
        actual: output.trim(),
        expected: String(expect).trim(),
        details: passed
          ? 'Command output matches expected'
          : 'Command output does not match expected',
      };
    }

    // Check pattern match
    if (expectMatch !== undefined) {
      const regex = expectMatch instanceof RegExp ? expectMatch : new RegExp(expectMatch);
      const passed = regex.test(output);
      return {
        type: 'command',
        passed,
        details: passed
          ? `Command output matches pattern`
          : `Command output does not match pattern`,
      };
    }

    // Default: command executed successfully
    return {
      type: 'command',
      passed: true,
      actual: output.slice(0, 200) + (output.length > 200 ? '...' : ''),
      details: `Command executed successfully: ${command}`,
    };
  } catch (error) {
    return {
      type: 'command',
      passed: false,
      details: `Command execution failed: ${command}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Main State Checker
// ============================================================================

/**
 * Check environment state based on config
 */
export async function checkState(config: StateCheckConfig): Promise<StateCheckResult> {
  switch (config.type) {
    case 'file':
      return checkFileState(config);
    case 'api':
      return checkApiState(config);
    case 'command':
      return checkCommandState(config);
    case 'db':
      // DB checks would need a database connection
      // For now, return a placeholder
      return {
        type: 'db',
        passed: false,
        details: 'Database state checking not yet implemented',
        error: 'Use command-based SQL queries for database checks',
      };
    default:
      return {
        type: config.type,
        passed: false,
        details: `Unknown state check type: ${config.type}`,
        error: 'Invalid configuration',
      };
  }
}

/**
 * Create a grader result from state check result
 */
export function stateCheckToGraderResult(
  checkResult: StateCheckResult,
  graderId?: string
): GraderResult {
  return {
    graderId: graderId ?? `state-check-${checkResult.type}`,
    graderType: 'state-check' as GraderType,
    passed: checkResult.passed,
    score: checkResult.passed ? 1 : 0,
    details: checkResult.details,
    error: checkResult.error,
  };
}

/**
 * Run state check and return grader result
 */
export async function stateCheckGrader(
  config: StateCheckConfig,
  graderId?: string
): Promise<GraderResult> {
  const result = await checkState(config);
  return stateCheckToGraderResult(result, graderId);
}

// ============================================================================
// Multiple State Checks
// ============================================================================

/**
 * Run multiple state checks
 */
export async function runStateChecks(
  configs: StateCheckConfig[]
): Promise<StateCheckResult[]> {
  return Promise.all(configs.map((config) => checkState(config)));
}

/**
 * Run multiple state checks and return grader results
 */
export async function runStateCheckGraders(
  configs: Array<StateCheckConfig & { id?: string }>
): Promise<GraderResult[]> {
  const results: GraderResult[] = [];

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const result = await stateCheckGrader(config, config.id ?? `state-check-${i}`);
    results.push(result);
  }

  return results;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a state checker grader function
 */
export function createStateChecker(
  config: StateCheckConfig
): () => Promise<GraderResult> {
  return () => stateCheckGrader(config);
}
