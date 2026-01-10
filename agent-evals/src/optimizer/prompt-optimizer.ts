/**
 * Prompt Optimizer (Task 69)
 * DSPy-inspired prompt optimization system that iteratively improves prompts
 * based on evaluation metrics.
 *
 * Supports:
 * - Bootstrap few-shot: Collect successful examples and add to prompt
 * - MIPRO-style: Generate candidate prompts, evaluate, select best
 * - Random search: Random perturbations to find improvements
 */

import Anthropic from '@anthropic-ai/sdk';

export type OptimizationStrategy = 'bootstrap' | 'mipro' | 'random';
export type OptimizationMetric = 'pass_rate' | 'pass_at_1' | 'pass_at_k' | 'avg_score';

export interface OptimizationConfig {
  /** Optimization strategy */
  strategy: OptimizationStrategy;
  /** Metric to optimize */
  metric: OptimizationMetric;
  /** Number of optimization iterations */
  iterations: number;
  /** Number of candidate prompts per round */
  candidatesPerRound: number;
  /** For pass@k, the value of k */
  kValue?: number;
  /** Maximum few-shot examples to bootstrap */
  maxFewShotExamples?: number;
  /** Temperature for prompt generation */
  temperature?: number;
  /** Early stopping threshold (stop if metric exceeds this) */
  earlyStopThreshold?: number;
}

export interface PromptCandidate {
  id: string;
  prompt: string;
  variables: string[];
  generation: number;
  parentId?: string;
  strategy: OptimizationStrategy;
}

export interface CandidateResult {
  candidate: PromptCandidate;
  score: number;
  passRate: number;
  passAtK: Record<number, number>;
  avgLatency: number;
  trialResults: TrialSummary[];
}

export interface TrialSummary {
  taskId: string;
  passed: boolean;
  score: number;
  input: string;
  output: string;
}

export interface OptimizationResult {
  bestCandidate: PromptCandidate;
  bestScore: number;
  history: CandidateResult[];
  generations: GenerationSummary[];
  improvementPercent: number;
  totalEvaluations: number;
  stoppedEarly: boolean;
}

export interface GenerationSummary {
  generation: number;
  candidates: number;
  bestScore: number;
  avgScore: number;
  improvement: number;
}

export interface OptimizationProgress {
  currentGeneration: number;
  totalGenerations: number;
  currentCandidate: number;
  totalCandidates: number;
  bestScoreSoFar: number;
  status: 'running' | 'completed' | 'stopped';
}

type ProgressCallback = (progress: OptimizationProgress) => void;
type EvaluateFunction = (prompt: string, variables: Record<string, string>[]) => Promise<{
  passRate: number;
  passAtK: Record<number, number>;
  avgScore: number;
  avgLatency: number;
  trials: TrialSummary[];
}>;

/**
 * DSPy-inspired Prompt Optimizer
 */
export class PromptOptimizer {
  private config: OptimizationConfig;
  private anthropic: Anthropic | null = null;
  private progressCallback?: ProgressCallback;

  constructor(config: OptimizationConfig) {
    this.config = {
      iterations: 5,
      candidatesPerRound: 3,
      kValue: 1,
      maxFewShotExamples: 5,
      temperature: 0.7,
      ...config,
    };

    // Initialize Anthropic client if API key available
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  /**
   * Set progress callback for real-time updates
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Run optimization to find the best prompt
   */
  async optimize(
    originalPrompt: string,
    testData: Record<string, string>[],
    evaluate: EvaluateFunction
  ): Promise<OptimizationResult> {
    const history: CandidateResult[] = [];
    const generations: GenerationSummary[] = [];

    // Initial candidate
    const initialCandidate: PromptCandidate = {
      id: this.generateId(),
      prompt: originalPrompt,
      variables: this.extractVariables(originalPrompt),
      generation: 0,
      strategy: this.config.strategy,
    };

    // Evaluate initial prompt
    const initialResult = await this.evaluateCandidate(initialCandidate, testData, evaluate);
    history.push(initialResult);

    let bestResult = initialResult;
    let currentBest = initialCandidate;
    let stoppedEarly = false;

    this.reportProgress({
      currentGeneration: 0,
      totalGenerations: this.config.iterations,
      currentCandidate: 1,
      totalCandidates: 1,
      bestScoreSoFar: bestResult.score,
      status: 'running',
    });

    // Main optimization loop
    for (let gen = 1; gen <= this.config.iterations; gen++) {
      // Check early stopping
      if (this.config.earlyStopThreshold && bestResult.score >= this.config.earlyStopThreshold) {
        stoppedEarly = true;
        break;
      }

      // Generate candidates based on strategy
      const candidates = await this.generateCandidates(
        currentBest,
        history,
        gen
      );

      let genBestScore = bestResult.score;
      let genTotalScore = 0;

      // Evaluate each candidate
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];

        this.reportProgress({
          currentGeneration: gen,
          totalGenerations: this.config.iterations,
          currentCandidate: i + 1,
          totalCandidates: candidates.length,
          bestScoreSoFar: bestResult.score,
          status: 'running',
        });

        const result = await this.evaluateCandidate(candidate, testData, evaluate);
        history.push(result);
        genTotalScore += result.score;

        if (result.score > bestResult.score) {
          bestResult = result;
          currentBest = candidate;
          genBestScore = result.score;
        }
      }

      generations.push({
        generation: gen,
        candidates: candidates.length,
        bestScore: genBestScore,
        avgScore: candidates.length > 0 ? genTotalScore / candidates.length : 0,
        improvement: genBestScore - (generations[gen - 2]?.bestScore || initialResult.score),
      });
    }

    this.reportProgress({
      currentGeneration: this.config.iterations,
      totalGenerations: this.config.iterations,
      currentCandidate: 0,
      totalCandidates: 0,
      bestScoreSoFar: bestResult.score,
      status: stoppedEarly ? 'stopped' : 'completed',
    });

    const improvementPercent = initialResult.score > 0
      ? ((bestResult.score - initialResult.score) / initialResult.score) * 100
      : bestResult.score * 100;

    return {
      bestCandidate: currentBest,
      bestScore: bestResult.score,
      history,
      generations,
      improvementPercent,
      totalEvaluations: history.length,
      stoppedEarly,
    };
  }

  /**
   * Generate candidate prompts based on strategy
   */
  private async generateCandidates(
    currentBest: PromptCandidate,
    history: CandidateResult[],
    generation: number
  ): Promise<PromptCandidate[]> {
    switch (this.config.strategy) {
      case 'bootstrap':
        return this.generateBootstrapCandidates(currentBest, history, generation);
      case 'mipro':
        return this.generateMiproCandidates(currentBest, history, generation);
      case 'random':
        return this.generateRandomCandidates(currentBest, generation);
      default:
        return this.generateRandomCandidates(currentBest, generation);
    }
  }

  /**
   * Bootstrap few-shot: Add successful examples to prompt
   */
  private async generateBootstrapCandidates(
    currentBest: PromptCandidate,
    history: CandidateResult[],
    generation: number
  ): Promise<PromptCandidate[]> {
    // Collect successful trials
    const successfulTrials = history
      .flatMap(r => r.trialResults)
      .filter(t => t.passed)
      .slice(0, this.config.maxFewShotExamples || 5);

    if (successfulTrials.length === 0) {
      return this.generateRandomCandidates(currentBest, generation);
    }

    const candidates: PromptCandidate[] = [];

    // Generate prompts with different numbers of few-shot examples
    for (let numExamples = 1; numExamples <= Math.min(successfulTrials.length, this.config.candidatesPerRound); numExamples++) {
      const examples = successfulTrials.slice(0, numExamples);
      const fewShotSection = examples
        .map((t, i) => `Example ${i + 1}:\nInput: ${t.input}\nOutput: ${t.output}`)
        .join('\n\n');

      const newPrompt = `${currentBest.prompt}\n\nHere are some successful examples:\n\n${fewShotSection}`;

      candidates.push({
        id: this.generateId(),
        prompt: newPrompt,
        variables: currentBest.variables,
        generation,
        parentId: currentBest.id,
        strategy: 'bootstrap',
      });
    }

    return candidates;
  }

  /**
   * MIPRO-style: Use LLM to generate improved prompt candidates
   */
  private async generateMiproCandidates(
    currentBest: PromptCandidate,
    history: CandidateResult[],
    generation: number
  ): Promise<PromptCandidate[]> {
    if (!this.anthropic) {
      // Fallback to random if no LLM available
      return this.generateRandomCandidates(currentBest, generation);
    }

    // Get recent results for context
    const recentResults = history.slice(-5);
    const failedExamples = recentResults
      .flatMap(r => r.trialResults)
      .filter(t => !t.passed)
      .slice(0, 3);

    const systemPrompt = `You are a prompt engineering expert. Your task is to improve prompts for better performance on evaluation tasks. Analyze the current prompt and failed examples, then generate improved versions.`;

    const userPrompt = `Current prompt:
"""
${currentBest.prompt}
"""

Current pass rate: ${(recentResults[recentResults.length - 1]?.passRate || 0) * 100}%

${failedExamples.length > 0 ? `Examples that failed:
${failedExamples.map((t, i) => `
Failed Example ${i + 1}:
Input: ${t.input}
Output: ${t.output}
`).join('\n')}` : ''}

Generate ${this.config.candidatesPerRound} improved versions of this prompt. Each version should:
1. Be clearer and more specific
2. Address potential failure modes
3. Maintain the same variable placeholders: ${currentBest.variables.join(', ')}

Format your response as:
VERSION 1:
[improved prompt here]

VERSION 2:
[improved prompt here]

etc.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: this.config.temperature || 0.7,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        system: systemPrompt,
      });

      // Parse response
      const content = response.content[0];
      if (content.type !== 'text') {
        return this.generateRandomCandidates(currentBest, generation);
      }

      const versions = this.parseVersions(content.text);
      return versions.map((prompt, i) => ({
        id: this.generateId(),
        prompt,
        variables: this.extractVariables(prompt),
        generation,
        parentId: currentBest.id,
        strategy: 'mipro' as OptimizationStrategy,
      }));
    } catch (error) {
      console.error('MIPRO generation failed:', error);
      return this.generateRandomCandidates(currentBest, generation);
    }
  }

  /**
   * Random: Apply random perturbations to prompt
   */
  private generateRandomCandidates(
    currentBest: PromptCandidate,
    generation: number
  ): PromptCandidate[] {
    const perturbations = [
      // Add clarifying instructions
      (p: string) => `${p}\n\nBe precise and thorough in your response.`,
      (p: string) => `${p}\n\nThink step by step before responding.`,
      (p: string) => `${p}\n\nDouble-check your work before finalizing.`,
      // Add format instructions
      (p: string) => `${p}\n\nFormat your response clearly.`,
      (p: string) => `${p}\n\nProvide a structured response.`,
      // Add context
      (p: string) => `You are an expert assistant. ${p}`,
      (p: string) => `Important task: ${p}`,
      // Simplify
      (p: string) => p.replace(/\s+/g, ' ').trim(),
    ];

    const candidates: PromptCandidate[] = [];

    for (let i = 0; i < this.config.candidatesPerRound; i++) {
      const perturbation = perturbations[i % perturbations.length];
      const newPrompt = perturbation(currentBest.prompt);

      candidates.push({
        id: this.generateId(),
        prompt: newPrompt,
        variables: this.extractVariables(newPrompt),
        generation,
        parentId: currentBest.id,
        strategy: 'random',
      });
    }

    return candidates;
  }

  /**
   * Evaluate a candidate prompt
   */
  private async evaluateCandidate(
    candidate: PromptCandidate,
    testData: Record<string, string>[],
    evaluate: EvaluateFunction
  ): Promise<CandidateResult> {
    const result = await evaluate(candidate.prompt, testData);

    let score: number;
    switch (this.config.metric) {
      case 'pass_rate':
        score = result.passRate;
        break;
      case 'pass_at_1':
        score = result.passAtK[1] || result.passRate;
        break;
      case 'pass_at_k':
        score = result.passAtK[this.config.kValue || 1] || result.passRate;
        break;
      case 'avg_score':
        score = result.avgScore;
        break;
      default:
        score = result.passRate;
    }

    return {
      candidate,
      score,
      passRate: result.passRate,
      passAtK: result.passAtK,
      avgLatency: result.avgLatency,
      trialResults: result.trials,
    };
  }

  /**
   * Parse MIPRO response into versions
   */
  private parseVersions(text: string): string[] {
    const versions: string[] = [];
    const regex = /VERSION \d+:\s*([\s\S]*?)(?=VERSION \d+:|$)/gi;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const version = match[1].trim();
      if (version) {
        versions.push(version);
      }
    }

    return versions.slice(0, this.config.candidatesPerRound);
  }

  /**
   * Extract variable placeholders from prompt
   */
  private extractVariables(prompt: string): string[] {
    const matches = prompt.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.slice(2, -2)))];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Report progress to callback
   */
  private reportProgress(progress: OptimizationProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }
}

/**
 * Create a new prompt optimizer
 */
export function createOptimizer(config: OptimizationConfig): PromptOptimizer {
  return new PromptOptimizer(config);
}

/**
 * Quick optimize with default settings
 */
export async function quickOptimize(
  prompt: string,
  testData: Record<string, string>[],
  evaluate: EvaluateFunction,
  options?: Partial<OptimizationConfig>
): Promise<OptimizationResult> {
  const optimizer = new PromptOptimizer({
    strategy: 'mipro',
    metric: 'pass_rate',
    iterations: 3,
    candidatesPerRound: 3,
    ...options,
  });

  return optimizer.optimize(prompt, testData, evaluate);
}
