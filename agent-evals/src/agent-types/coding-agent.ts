/**
 * Coding Agent Evaluator
 * Specialized evaluation for code generation agents
 */

import type { GraderResult } from '../types';
import { testRunnerGrader, type TestRunnerConfig } from '../graders/code-based/test-runner';
import { stateCheckGrader, type StateCheckConfig } from '../graders/code-based/state-checker';
import { llmRubricGrader, type LLMRubricConfig } from '../graders/model-based/llm-rubric';

// ============================================================================
// Types
// ============================================================================

export interface CodingAgentConfig {
  testCommand?: string;
  testFramework?: 'jest' | 'vitest' | 'pytest' | 'mocha' | 'tap' | 'generic';
  lintCommand?: string;
  typeCheckCommand?: string;
  workingDirectory?: string;
  timeout?: number;
  codeQualityRubric?: string;
  codeQualityModel?: string;
}

export interface CodingAgentResult {
  testResult?: GraderResult;
  lintResult?: GraderResult;
  typeCheckResult?: GraderResult;
  codeQualityResult?: GraderResult;
  overallScore: number;
  passed: boolean;
}

// ============================================================================
// Default Rubric
// ============================================================================

const DEFAULT_CODE_QUALITY_RUBRIC = `Evaluate the generated code for quality on these dimensions:

1. Readability (0-1): Is the code easy to understand? Are variable names clear?
2. Maintainability (0-1): Is the code well-structured? Are functions small and focused?
3. Best Practices (0-1): Does the code follow language idioms and best practices?
4. Error Handling (0-1): Does the code handle edge cases and errors appropriately?

Provide an overall score from 0 to 1.`;

// ============================================================================
// Coding Agent Evaluator
// ============================================================================

export class CodingAgentEvaluator {
  private config: CodingAgentConfig;

  constructor(config: CodingAgentConfig = {}) {
    this.config = {
      testFramework: config.testFramework ?? 'generic',
      timeout: config.timeout ?? 60000,
      codeQualityRubric: config.codeQualityRubric ?? DEFAULT_CODE_QUALITY_RUBRIC,
      ...config,
    };
  }

  /**
   * Run all coding evaluations
   */
  async evaluate(code: string): Promise<CodingAgentResult> {
    const results: CodingAgentResult = {
      overallScore: 0,
      passed: false,
    };

    const graderResults: GraderResult[] = [];

    // Run tests if configured
    if (this.config.testCommand) {
      results.testResult = await this.runTests();
      graderResults.push(results.testResult);
    }

    // Run linter if configured
    if (this.config.lintCommand) {
      results.lintResult = await this.runLint();
      graderResults.push(results.lintResult);
    }

    // Run type checker if configured
    if (this.config.typeCheckCommand) {
      results.typeCheckResult = await this.runTypeCheck();
      graderResults.push(results.typeCheckResult);
    }

    // Run code quality analysis
    results.codeQualityResult = await this.analyzeCodeQuality(code);
    graderResults.push(results.codeQualityResult);

    // Calculate overall score
    if (graderResults.length > 0) {
      const sum = graderResults.reduce((acc, r) => acc + r.score, 0);
      results.overallScore = sum / graderResults.length;
    }

    results.passed = results.overallScore >= 0.5;

    return results;
  }

  /**
   * Run unit tests
   */
  async runTests(): Promise<GraderResult> {
    const config: TestRunnerConfig = {
      command: this.config.testCommand!,
      workingDirectory: this.config.workingDirectory,
      timeout: this.config.timeout,
      testFramework: this.config.testFramework,
    };

    return testRunnerGrader(config, 'test-pass');
  }

  /**
   * Run linter
   */
  async runLint(): Promise<GraderResult> {
    const config: StateCheckConfig = {
      type: 'command',
      command: this.config.lintCommand!,
      workingDirectory: this.config.workingDirectory,
      timeout: this.config.timeout,
    };

    const result = await stateCheckGrader(config, 'static-analysis-lint');

    // Rename for clarity
    return {
      ...result,
      graderId: 'static-analysis-lint',
      details: result.passed
        ? 'Linting passed with no errors'
        : `Linting failed: ${result.details}`,
    };
  }

  /**
   * Run type checker
   */
  async runTypeCheck(): Promise<GraderResult> {
    const config: StateCheckConfig = {
      type: 'command',
      command: this.config.typeCheckCommand!,
      workingDirectory: this.config.workingDirectory,
      timeout: this.config.timeout,
    };

    const result = await stateCheckGrader(config, 'static-analysis-types');

    return {
      ...result,
      graderId: 'static-analysis-types',
      details: result.passed
        ? 'Type checking passed'
        : `Type checking failed: ${result.details}`,
    };
  }

  /**
   * Analyze code quality using LLM
   */
  async analyzeCodeQuality(code: string): Promise<GraderResult> {
    const config: LLMRubricConfig = {
      rubric: this.config.codeQualityRubric!,
      model: this.config.codeQualityModel,
    };

    return llmRubricGrader(code, config, 'code-quality');
  }

  /**
   * Get individual graders
   */
  getGraders(): Array<{
    name: string;
    run: (code: string) => Promise<GraderResult>;
  }> {
    const graders = [];

    if (this.config.testCommand) {
      graders.push({
        name: 'test-pass',
        run: () => this.runTests(),
      });
    }

    if (this.config.lintCommand) {
      graders.push({
        name: 'static-analysis-lint',
        run: () => this.runLint(),
      });
    }

    if (this.config.typeCheckCommand) {
      graders.push({
        name: 'static-analysis-types',
        run: () => this.runTypeCheck(),
      });
    }

    graders.push({
      name: 'code-quality',
      run: (code: string) => this.analyzeCodeQuality(code),
    });

    return graders;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCodingAgentEvaluator(
  config?: CodingAgentConfig
): CodingAgentEvaluator {
  return new CodingAgentEvaluator(config);
}
