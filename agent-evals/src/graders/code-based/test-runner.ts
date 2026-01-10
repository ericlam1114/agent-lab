/**
 * Test Runner Grader
 * Executes test commands and parses results
 */

import { execSync, type ExecSyncOptions } from 'child_process';
import type { GraderResult, GraderType } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface TestRunnerConfig {
  command: string;
  workingDirectory?: string;
  timeout?: number;
  passThreshold?: number;
  parseOutput?: boolean;
  testFramework?: 'jest' | 'vitest' | 'pytest' | 'mocha' | 'tap' | 'generic';
}

export interface TestRunResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration?: number;
  output: string;
  error?: string;
}

// ============================================================================
// Output Parsers
// ============================================================================

/**
 * Parse Jest/Vitest output
 */
function parseJestOutput(output: string): Partial<TestRunResult> {
  const result: Partial<TestRunResult> = {};

  // Try to parse "Tests: X passed, Y failed, Z total"
  const testsMatch = output.match(/Tests:\s*(?:(\d+)\s*passed)?(?:,\s*)?(?:(\d+)\s*failed)?(?:,\s*)?(?:(\d+)\s*skipped)?(?:,\s*)?(\d+)\s*total/i);
  if (testsMatch) {
    result.passed = parseInt(testsMatch[1] || '0', 10);
    result.failed = parseInt(testsMatch[2] || '0', 10);
    result.skipped = parseInt(testsMatch[3] || '0', 10);
    result.total = parseInt(testsMatch[4], 10);
    return result;
  }

  // Try "X passing" format
  const passingMatch = output.match(/(\d+)\s*pass(?:ing|ed)?/i);
  const failingMatch = output.match(/(\d+)\s*fail(?:ing|ed)?/i);
  const skippedMatch = output.match(/(\d+)\s*(?:skip(?:ped)?|pending)/i);

  if (passingMatch || failingMatch) {
    result.passed = passingMatch ? parseInt(passingMatch[1], 10) : 0;
    result.failed = failingMatch ? parseInt(failingMatch[1], 10) : 0;
    result.skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
    result.total = result.passed + result.failed + (result.skipped || 0);
    return result;
  }

  return result;
}

/**
 * Parse pytest output
 */
function parsePytestOutput(output: string): Partial<TestRunResult> {
  const result: Partial<TestRunResult> = {};

  // Try to parse "X passed, Y failed, Z skipped in Xs"
  const summaryMatch = output.match(/(?:(\d+)\s*passed)?(?:,?\s*)?(?:(\d+)\s*failed)?(?:,?\s*)?(?:(\d+)\s*(?:skipped|deselected))?/i);
  if (summaryMatch) {
    result.passed = parseInt(summaryMatch[1] || '0', 10);
    result.failed = parseInt(summaryMatch[2] || '0', 10);
    result.skipped = parseInt(summaryMatch[3] || '0', 10);
    result.total = result.passed + result.failed + result.skipped;
  }

  // Parse duration
  const durationMatch = output.match(/in\s+([\d.]+)s/);
  if (durationMatch) {
    result.duration = parseFloat(durationMatch[1]) * 1000;
  }

  return result;
}

/**
 * Parse Mocha output
 */
function parseMochaOutput(output: string): Partial<TestRunResult> {
  const result: Partial<TestRunResult> = {};

  // "X passing (Xs)"
  const passingMatch = output.match(/(\d+)\s*passing/i);
  const failingMatch = output.match(/(\d+)\s*failing/i);
  const pendingMatch = output.match(/(\d+)\s*pending/i);

  result.passed = passingMatch ? parseInt(passingMatch[1], 10) : 0;
  result.failed = failingMatch ? parseInt(failingMatch[1], 10) : 0;
  result.skipped = pendingMatch ? parseInt(pendingMatch[1], 10) : 0;
  result.total = result.passed + result.failed + result.skipped;

  // Parse duration
  const durationMatch = output.match(/\((\d+(?:\.\d+)?)\s*(?:ms|s)\)/);
  if (durationMatch) {
    const value = parseFloat(durationMatch[1]);
    result.duration = output.includes('ms') ? value : value * 1000;
  }

  return result;
}

/**
 * Parse TAP (Test Anything Protocol) output
 */
function parseTapOutput(output: string): Partial<TestRunResult> {
  const result: Partial<TestRunResult> = { passed: 0, failed: 0, skipped: 0, total: 0 };

  const lines = output.split('\n');

  for (const line of lines) {
    // "1..N" declares total tests
    const planMatch = line.match(/^1\.\.(\d+)/);
    if (planMatch) {
      result.total = parseInt(planMatch[1], 10);
      continue;
    }

    // "ok N" = passed
    if (/^ok\s+\d+/.test(line)) {
      if (line.includes('# SKIP') || line.includes('# skip')) {
        result.skipped!++;
      } else {
        result.passed!++;
      }
      continue;
    }

    // "not ok N" = failed
    if (/^not ok\s+\d+/.test(line)) {
      result.failed!++;
    }
  }

  // If no plan line, calculate total
  if (result.total === 0) {
    result.total = result.passed! + result.failed! + result.skipped!;
  }

  return result;
}

/**
 * Generic output parser - tries multiple formats
 */
function parseGenericOutput(output: string): Partial<TestRunResult> {
  // Try each parser in sequence
  let result = parseJestOutput(output);
  if (result.total) return result;

  result = parsePytestOutput(output);
  if (result.total) return result;

  result = parseMochaOutput(output);
  if (result.total) return result;

  result = parseTapOutput(output);
  if (result.total) return result;

  // Last resort: count lines with "pass" or "fail"
  const passLines = (output.match(/✓|✔|pass|ok /gi) || []).length;
  const failLines = (output.match(/✗|✘|fail|not ok /gi) || []).length;

  if (passLines || failLines) {
    return {
      passed: passLines,
      failed: failLines,
      skipped: 0,
      total: passLines + failLines,
    };
  }

  return {};
}

/**
 * Parse test output based on framework
 */
function parseTestOutput(output: string, framework?: string): Partial<TestRunResult> {
  switch (framework) {
    case 'jest':
    case 'vitest':
      return parseJestOutput(output);
    case 'pytest':
      return parsePytestOutput(output);
    case 'mocha':
      return parseMochaOutput(output);
    case 'tap':
      return parseTapOutput(output);
    default:
      return parseGenericOutput(output);
  }
}

// ============================================================================
// Test Runner
// ============================================================================

/**
 * Run tests and parse output
 */
export async function runTests(config: TestRunnerConfig): Promise<TestRunResult> {
  const {
    command,
    workingDirectory,
    timeout = 300000, // 5 minutes default
    parseOutput = true,
    testFramework = 'generic',
  } = config;

  const execOptions: ExecSyncOptions = {
    cwd: workingDirectory,
    encoding: 'utf-8',
    timeout,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      // Force color output for better parsing
      FORCE_COLOR: '1',
    },
  };

  let output = '';
  let error: string | undefined;
  let exitCode = 0;

  try {
    output = execSync(command, execOptions) as string;
  } catch (err) {
    // Test failures often cause non-zero exit
    if (err && typeof err === 'object' && 'stdout' in err) {
      const execError = err as { stdout: Buffer | string; stderr: Buffer | string; status?: number };
      output = String(execError.stdout || '') + String(execError.stderr || '');
      exitCode = execError.status || 1;
    } else {
      error = err instanceof Error ? err.message : String(err);
      output = error;
    }
  }

  // Parse output if enabled
  if (parseOutput) {
    const parsed = parseTestOutput(output, testFramework);

    return {
      total: parsed.total || 0,
      passed: parsed.passed || 0,
      failed: parsed.failed || (exitCode !== 0 ? 1 : 0),
      skipped: parsed.skipped || 0,
      duration: parsed.duration,
      output,
      error,
    };
  }

  // Without parsing, just report success/failure
  const success = exitCode === 0;
  return {
    total: 1,
    passed: success ? 1 : 0,
    failed: success ? 0 : 1,
    skipped: 0,
    output,
    error,
  };
}

// ============================================================================
// Grader Function
// ============================================================================

/**
 * Run tests and return grader result
 */
export async function testRunnerGrader(
  config: TestRunnerConfig,
  graderId?: string
): Promise<GraderResult> {
  const { passThreshold = 1.0 } = config;

  const result = await runTests(config);

  const passRate = result.total > 0 ? result.passed / result.total : 0;
  const passed = passRate >= passThreshold;

  return {
    graderId: graderId ?? 'test-runner',
    graderType: 'test-runner' as GraderType,
    passed,
    score: passRate,
    details: `${result.passed}/${result.total} tests passed (${(passRate * 100).toFixed(1)}%)${
      result.failed > 0 ? ` - ${result.failed} failed` : ''
    }${result.skipped > 0 ? ` - ${result.skipped} skipped` : ''}`,
    error: result.error,
  };
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a test runner grader function
 */
export function createTestRunner(
  config: TestRunnerConfig
): () => Promise<GraderResult> {
  return () => testRunnerGrader(config);
}

// ============================================================================
// Utility Exports
// ============================================================================

export {
  parseJestOutput,
  parsePytestOutput,
  parseMochaOutput,
  parseTapOutput,
  parseGenericOutput,
  parseTestOutput,
};
