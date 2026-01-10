/**
 * Research Agent Evaluator
 * Specialized evaluation for research/information gathering agents
 */

import type { GraderResult } from '../types';
import {
  factualityGrader,
  type FactualityConfig,
} from '../graders/model-based/factuality';
import { llmRubricGrader, type LLMRubricConfig } from '../graders/model-based/llm-rubric';

// ============================================================================
// Types
// ============================================================================

export interface ResearchAgentConfig {
  sourceMaterial?: string;
  keyFacts?: string[];
  expectedAnswer?: string;
  provider?: 'openai' | 'anthropic';
  model?: string;
}

export interface ResearchAgentResult {
  groundednessResult?: GraderResult;
  coverageResult?: GraderResult;
  sourceQualityResult?: GraderResult;
  answerAccuracyResult?: GraderResult;
  overallScore: number;
  passed: boolean;
}

// ============================================================================
// Default Rubrics
// ============================================================================

const COVERAGE_RUBRIC = `Evaluate how well the response covers the key facts:

Given the following key facts that should be mentioned:
{{KEY_FACTS}}

Rate the response on:
1. Completeness (0-1): How many of the key facts are addressed?
2. Accuracy (0-1): Are the key facts presented correctly?
3. Integration (0-1): Are the facts well-integrated into the response?

Provide an overall score from 0 to 1.`;

const SOURCE_QUALITY_RUBRIC = `Evaluate the quality of sources cited or referenced in the response:

1. Authority (0-1): Are sources from authoritative, credible entities?
2. Relevance (0-1): Are sources directly relevant to the topic?
3. Recency (0-1): Are sources reasonably recent for the topic?
4. Diversity (0-1): Are multiple perspectives represented?

Provide an overall score from 0 to 1.`;

const ANSWER_ACCURACY_RUBRIC = `Compare the response to the expected answer:

Expected answer: {{EXPECTED_ANSWER}}

Rate the response on:
1. Correctness (0-1): Is the answer factually correct?
2. Completeness (0-1): Does it cover all aspects of the expected answer?
3. Precision (0-1): Is the answer precise without unnecessary information?

Provide an overall score from 0 to 1.`;

// ============================================================================
// Research Agent Evaluator
// ============================================================================

export class ResearchAgentEvaluator {
  private config: ResearchAgentConfig;

  constructor(config: ResearchAgentConfig = {}) {
    this.config = {
      provider: config.provider ?? 'openai',
      ...config,
    };
  }

  /**
   * Run all research evaluations
   */
  async evaluate(response: string): Promise<ResearchAgentResult> {
    const results: ResearchAgentResult = {
      overallScore: 0,
      passed: false,
    };

    const graderResults: GraderResult[] = [];

    // Check groundedness if source material provided
    if (this.config.sourceMaterial) {
      results.groundednessResult = await this.checkGroundedness(response);
      graderResults.push(results.groundednessResult);
    }

    // Check coverage of key facts
    if (this.config.keyFacts && this.config.keyFacts.length > 0) {
      results.coverageResult = await this.checkCoverage(response);
      graderResults.push(results.coverageResult);
    }

    // Check source quality
    results.sourceQualityResult = await this.checkSourceQuality(response);
    graderResults.push(results.sourceQualityResult);

    // Check answer accuracy if expected answer provided
    if (this.config.expectedAnswer) {
      results.answerAccuracyResult = await this.checkAnswerAccuracy(response);
      graderResults.push(results.answerAccuracyResult);
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
   * Check if claims are grounded in source material
   */
  async checkGroundedness(response: string): Promise<GraderResult> {
    const config: FactualityConfig = {
      source: this.config.sourceMaterial!,
      provider: this.config.provider,
      model: this.config.model,
    };

    const result = await factualityGrader(response, config, 'groundedness');

    return {
      ...result,
      graderId: 'groundedness',
    };
  }

  /**
   * Check coverage of key facts
   */
  async checkCoverage(response: string): Promise<GraderResult> {
    const keyFactsList = this.config.keyFacts!
      .map((fact, i) => `${i + 1}. ${fact}`)
      .join('\n');

    const rubric = COVERAGE_RUBRIC.replace('{{KEY_FACTS}}', keyFactsList);

    const config: LLMRubricConfig = {
      rubric,
      provider: this.config.provider,
      model: this.config.model,
    };

    return llmRubricGrader(response, config, 'coverage');
  }

  /**
   * Check quality of sources cited
   */
  async checkSourceQuality(response: string): Promise<GraderResult> {
    const config: LLMRubricConfig = {
      rubric: SOURCE_QUALITY_RUBRIC,
      provider: this.config.provider,
      model: this.config.model,
    };

    return llmRubricGrader(response, config, 'source-quality');
  }

  /**
   * Check accuracy of answer against expected
   */
  async checkAnswerAccuracy(response: string): Promise<GraderResult> {
    const rubric = ANSWER_ACCURACY_RUBRIC.replace(
      '{{EXPECTED_ANSWER}}',
      this.config.expectedAnswer!
    );

    const config: LLMRubricConfig = {
      rubric,
      provider: this.config.provider,
      model: this.config.model,
    };

    return llmRubricGrader(response, config, 'answer-accuracy');
  }

  /**
   * Get individual graders
   */
  getGraders(): Array<{
    name: string;
    run: (response: string) => Promise<GraderResult>;
    enabled: boolean;
  }> {
    return [
      {
        name: 'groundedness',
        run: (r) => this.checkGroundedness(r),
        enabled: !!this.config.sourceMaterial,
      },
      {
        name: 'coverage',
        run: (r) => this.checkCoverage(r),
        enabled: !!(this.config.keyFacts && this.config.keyFacts.length > 0),
      },
      {
        name: 'source-quality',
        run: (r) => this.checkSourceQuality(r),
        enabled: true,
      },
      {
        name: 'answer-accuracy',
        run: (r) => this.checkAnswerAccuracy(r),
        enabled: !!this.config.expectedAnswer,
      },
    ];
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createResearchAgentEvaluator(
  config?: ResearchAgentConfig
): ResearchAgentEvaluator {
  return new ResearchAgentEvaluator(config);
}
