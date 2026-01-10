/**
 * Computer Use Agent Evaluator
 * Specialized evaluation for computer/browser automation agents
 */

import type { GraderResult } from '../types';
import { stateCheckGrader, type StateCheckConfig } from '../graders/code-based/state-checker';
import { llmRubricGrader, type LLMRubricConfig } from '../graders/model-based/llm-rubric';

// ============================================================================
// Types
// ============================================================================

export interface ComputerUseAgentConfig {
  expectedActions?: ExpectedAction[];
  stateChecks?: StateCheckConfig[];
  screenshotPath?: string;
  expectedScreenshotPath?: string;
  provider?: 'openai' | 'anthropic';
  model?: string;
}

export interface ExpectedAction {
  type: 'click' | 'type' | 'scroll' | 'navigate' | 'key' | 'wait' | 'custom';
  target?: string;
  value?: string;
  optional?: boolean;
}

export interface ActionLog {
  type: string;
  target?: string;
  value?: string;
  timestamp: Date;
  success: boolean;
}

export interface ComputerUseAgentResult {
  screenshotResult?: GraderResult;
  stateResults?: GraderResult[];
  actionSequenceResult?: GraderResult;
  overallScore: number;
  passed: boolean;
}

// ============================================================================
// Computer Use Agent Evaluator
// ============================================================================

export class ComputerUseAgentEvaluator {
  private config: ComputerUseAgentConfig;

  constructor(config: ComputerUseAgentConfig = {}) {
    this.config = {
      provider: config.provider ?? 'openai',
      ...config,
    };
  }

  /**
   * Run all computer use evaluations
   */
  async evaluate(actionLog: ActionLog[]): Promise<ComputerUseAgentResult> {
    const results: ComputerUseAgentResult = {
      overallScore: 0,
      passed: false,
    };

    const graderResults: GraderResult[] = [];

    // Compare screenshots if configured
    if (this.config.screenshotPath && this.config.expectedScreenshotPath) {
      results.screenshotResult = await this.compareScreenshots();
      graderResults.push(results.screenshotResult);
    }

    // Run state checks
    if (this.config.stateChecks && this.config.stateChecks.length > 0) {
      results.stateResults = await this.runStateChecks();
      graderResults.push(...results.stateResults);
    }

    // Check action sequence
    if (this.config.expectedActions && this.config.expectedActions.length > 0) {
      results.actionSequenceResult = await this.checkActionSequence(actionLog);
      graderResults.push(results.actionSequenceResult);
    }

    // Calculate overall score
    if (graderResults.length > 0) {
      const sum = graderResults.reduce((acc, r) => acc + r.score, 0);
      results.overallScore = sum / graderResults.length;
    }

    results.passed = results.overallScore >= 0.5;

    return results;
  }

  /**
   * Compare screenshots using visual diff
   * Note: This is a placeholder - real implementation would use image comparison
   */
  async compareScreenshots(): Promise<GraderResult> {
    // Check if both files exist
    const actualConfig: StateCheckConfig = {
      type: 'file',
      path: this.config.screenshotPath!,
      fileExists: true,
    };

    const actualExists = await stateCheckGrader(actualConfig, 'screenshot-actual');
    if (!actualExists.passed) {
      return {
        graderId: 'screenshot-compare',
        graderType: 'state-check',
        passed: false,
        score: 0,
        details: 'Actual screenshot not found',
      };
    }

    const expectedConfig: StateCheckConfig = {
      type: 'file',
      path: this.config.expectedScreenshotPath!,
      fileExists: true,
    };

    const expectedExists = await stateCheckGrader(expectedConfig, 'screenshot-expected');
    if (!expectedExists.passed) {
      return {
        graderId: 'screenshot-compare',
        graderType: 'state-check',
        passed: false,
        score: 0,
        details: 'Expected screenshot not found',
      };
    }

    // For now, use LLM to compare descriptions
    // In production, use image comparison libraries like pixelmatch
    const rubric = `Compare the screenshots at these paths:
    Actual: ${this.config.screenshotPath}
    Expected: ${this.config.expectedScreenshotPath}

    Based on the file paths, determine if they likely represent the same UI state.
    Score 1 if identical, 0-1 based on similarity.`;

    const config: LLMRubricConfig = {
      rubric,
      provider: this.config.provider,
      model: this.config.model,
    };

    const result = await llmRubricGrader(
      `Actual: ${this.config.screenshotPath}\nExpected: ${this.config.expectedScreenshotPath}`,
      config,
      'screenshot-compare'
    );

    return {
      ...result,
      details: 'Screenshot comparison (file-based check)',
    };
  }

  /**
   * Run all state checks
   */
  async runStateChecks(): Promise<GraderResult[]> {
    const results: GraderResult[] = [];

    for (let i = 0; i < this.config.stateChecks!.length; i++) {
      const check = this.config.stateChecks![i];
      const result = await stateCheckGrader(check, `state-check-${i}`);
      results.push(result);
    }

    return results;
  }

  /**
   * Check if expected actions were performed in sequence
   */
  async checkActionSequence(actionLog: ActionLog[]): Promise<GraderResult> {
    const expectedActions = this.config.expectedActions!;
    const requiredActions = expectedActions.filter((a) => !a.optional);

    let matchedCount = 0;
    let currentLogIndex = 0;

    for (const expected of expectedActions) {
      // Find matching action in log (from current position forward)
      let found = false;
      for (let i = currentLogIndex; i < actionLog.length; i++) {
        const actual = actionLog[i];
        if (this.actionsMatch(expected, actual)) {
          matchedCount++;
          currentLogIndex = i + 1;
          found = true;
          break;
        }
      }

      // If required action not found, note it
      if (!found && !expected.optional) {
        // Continue checking other actions
      }
    }

    const requiredMatched = matchedCount;
    const score = requiredActions.length > 0
      ? requiredMatched / requiredActions.length
      : 1;

    return {
      graderId: 'action-sequence',
      graderType: 'state-check',
      passed: score >= 0.8, // Allow some flexibility
      score,
      details: `${matchedCount}/${expectedActions.length} expected actions found`,
    };
  }

  /**
   * Check if two actions match
   */
  private actionsMatch(expected: ExpectedAction, actual: ActionLog): boolean {
    // Type must match
    if (expected.type !== actual.type) return false;

    // Target must match if specified
    if (expected.target && actual.target) {
      // Fuzzy match - check if target contains expected
      if (!actual.target.toLowerCase().includes(expected.target.toLowerCase())) {
        return false;
      }
    }

    // Value must match if specified
    if (expected.value && actual.value) {
      if (expected.value !== actual.value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get individual graders
   */
  getGraders(): Array<{
    name: string;
    run: (actionLog: ActionLog[]) => Promise<GraderResult>;
    enabled: boolean;
  }> {
    return [
      {
        name: 'screenshot-compare',
        run: () => this.compareScreenshots(),
        enabled: !!(this.config.screenshotPath && this.config.expectedScreenshotPath),
      },
      {
        name: 'action-sequence',
        run: (log) => this.checkActionSequence(log),
        enabled: !!(this.config.expectedActions && this.config.expectedActions.length > 0),
      },
    ];
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createComputerUseAgentEvaluator(
  config?: ComputerUseAgentConfig
): ComputerUseAgentEvaluator {
  return new ComputerUseAgentEvaluator(config);
}
