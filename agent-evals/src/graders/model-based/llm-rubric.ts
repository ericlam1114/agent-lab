/**
 * LLM Rubric Grader
 * Uses LLM to evaluate agent output against a rubric
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { GraderResult, GraderType } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface LLMRubricConfig {
  rubric: string;
  model?: string;
  provider?: 'openai' | 'anthropic';
  dimensions?: RubricDimension[];
  systemPrompt?: string;
  temperature?: number;
  cacheResults?: boolean;
}

export interface RubricDimension {
  name: string;
  description: string;
  weight?: number;
}

export interface LLMRubricResult {
  score: number;
  reasoning: string;
  dimensionScores?: Record<string, { score: number; reasoning: string }>;
  rawResponse?: string;
}

// ============================================================================
// Cache
// ============================================================================

const resultCache = new Map<string, LLMRubricResult>();

function getCacheKey(output: string, config: LLMRubricConfig): string {
  return `${config.model || 'default'}-${config.rubric}-${output}`.slice(0, 1000);
}

function getFromCache(key: string): LLMRubricResult | undefined {
  return resultCache.get(key);
}

function setInCache(key: string, result: LLMRubricResult): void {
  // Limit cache size
  if (resultCache.size > 1000) {
    const firstKey = resultCache.keys().next().value;
    if (firstKey) resultCache.delete(firstKey);
  }
  resultCache.set(key, result);
}

export function clearCache(): void {
  resultCache.clear();
}

// ============================================================================
// System Prompts
// ============================================================================

const DEFAULT_SYSTEM_PROMPT = `You are an expert evaluator. Evaluate the given output against the provided rubric.

Respond with a JSON object in this exact format:
{
  "score": <number between 0 and 1>,
  "reasoning": "<brief explanation of your evaluation>"
}

Be objective and consistent in your evaluations. Score 1.0 means perfect, 0.0 means completely failed.`;

const MULTI_DIMENSION_SYSTEM_PROMPT = `You are an expert evaluator. Evaluate the given output against each dimension in the rubric.

Respond with a JSON object in this exact format:
{
  "dimensions": {
    "<dimension_name>": {
      "score": <number between 0 and 1>,
      "reasoning": "<brief explanation>"
    }
  },
  "overall_score": <number between 0 and 1>,
  "overall_reasoning": "<summary of evaluation>"
}

Be objective and consistent in your evaluations. Score 1.0 means perfect, 0.0 means completely failed.`;

// ============================================================================
// Build Evaluation Prompt
// ============================================================================

function buildPrompt(
  output: string,
  rubric: string,
  dimensions?: RubricDimension[]
): string {
  let prompt = `## Agent Output to Evaluate\n\n${output}\n\n`;

  if (dimensions && dimensions.length > 0) {
    prompt += `## Evaluation Dimensions\n\n`;
    for (const dim of dimensions) {
      prompt += `### ${dim.name}${dim.weight ? ` (weight: ${dim.weight})` : ''}\n`;
      prompt += `${dim.description}\n\n`;
    }
  } else {
    prompt += `## Evaluation Rubric\n\n${rubric}\n\n`;
  }

  prompt += `## Instructions\n\nEvaluate the agent output according to the rubric above. Provide your evaluation as JSON.`;

  return prompt;
}

// ============================================================================
// Parse LLM Response
// ============================================================================

function parseResponse(
  response: string,
  dimensions?: RubricDimension[]
): LLMRubricResult {
  // Try to extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      score: 0,
      reasoning: 'Failed to parse LLM response as JSON',
      rawResponse: response,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    if (dimensions && parsed.dimensions) {
      // Multi-dimension response
      const dimensionScores: Record<string, { score: number; reasoning: string }> = {};
      let weightedSum = 0;
      let totalWeight = 0;

      for (const dim of dimensions) {
        const dimResult = parsed.dimensions[dim.name];
        if (dimResult) {
          dimensionScores[dim.name] = {
            score: Math.max(0, Math.min(1, Number(dimResult.score) || 0)),
            reasoning: String(dimResult.reasoning || ''),
          };
          const weight = dim.weight || 1;
          weightedSum += dimensionScores[dim.name].score * weight;
          totalWeight += weight;
        }
      }

      return {
        score: totalWeight > 0 ? weightedSum / totalWeight : (parsed.overall_score || 0),
        reasoning: parsed.overall_reasoning || 'Multi-dimension evaluation',
        dimensionScores,
        rawResponse: response,
      };
    }

    // Single dimension response
    return {
      score: Math.max(0, Math.min(1, Number(parsed.score) || 0)),
      reasoning: String(parsed.reasoning || 'No reasoning provided'),
      rawResponse: response,
    };
  } catch {
    return {
      score: 0,
      reasoning: 'Failed to parse LLM response JSON',
      rawResponse: response,
    };
  }
}

// ============================================================================
// OpenAI Provider
// ============================================================================

async function evaluateWithOpenAI(
  output: string,
  config: LLMRubricConfig
): Promise<LLMRubricResult> {
  const openai = new OpenAI();

  const systemPrompt = config.systemPrompt ||
    (config.dimensions ? MULTI_DIMENSION_SYSTEM_PROMPT : DEFAULT_SYSTEM_PROMPT);

  const prompt = buildPrompt(output, config.rubric, config.dimensions);

  const response = await openai.chat.completions.create({
    model: config.model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: config.temperature ?? 0.1,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '';
  return parseResponse(content, config.dimensions);
}

// ============================================================================
// Anthropic Provider
// ============================================================================

async function evaluateWithAnthropic(
  output: string,
  config: LLMRubricConfig
): Promise<LLMRubricResult> {
  const anthropic = new Anthropic();

  const systemPrompt = config.systemPrompt ||
    (config.dimensions ? MULTI_DIMENSION_SYSTEM_PROMPT : DEFAULT_SYSTEM_PROMPT);

  const prompt = buildPrompt(output, config.rubric, config.dimensions);

  const response = await anthropic.messages.create({
    model: config.model || 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  const content = response.content[0];
  const text = content.type === 'text' ? content.text : '';
  return parseResponse(text, config.dimensions);
}

// ============================================================================
// Main Evaluation Function
// ============================================================================

/**
 * Evaluate output using LLM rubric
 */
export async function evaluateWithRubric(
  output: string,
  config: LLMRubricConfig
): Promise<LLMRubricResult> {
  // Check cache
  if (config.cacheResults !== false) {
    const cacheKey = getCacheKey(output, config);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;
  }

  // Determine provider
  const provider = config.provider || 'openai';

  let result: LLMRubricResult;

  try {
    if (provider === 'anthropic') {
      result = await evaluateWithAnthropic(output, config);
    } else {
      result = await evaluateWithOpenAI(output, config);
    }
  } catch (error) {
    result = {
      score: 0,
      reasoning: `LLM evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // Cache result
  if (config.cacheResults !== false) {
    const cacheKey = getCacheKey(output, config);
    setInCache(cacheKey, result);
  }

  return result;
}

// ============================================================================
// Grader Function
// ============================================================================

/**
 * LLM rubric grader
 */
export async function llmRubricGrader(
  output: string,
  config: LLMRubricConfig,
  graderId?: string
): Promise<GraderResult> {
  const result = await evaluateWithRubric(output, config);

  const passed = result.score >= 0.5;

  return {
    graderId: graderId ?? 'llm-rubric',
    graderType: 'llm-rubric' as GraderType,
    passed,
    score: result.score,
    details: result.reasoning,
  };
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an LLM rubric grader
 */
export function createLLMRubricGrader(
  config: LLMRubricConfig
): (output: string) => Promise<GraderResult> {
  return (output: string) => llmRubricGrader(output, config);
}
