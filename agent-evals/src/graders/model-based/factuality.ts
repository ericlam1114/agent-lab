/**
 * Factuality Grader
 * Verifies claims in agent output against source material
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { GraderResult, GraderType } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface FactualityConfig {
  source: string;
  model?: string;
  provider?: 'openai' | 'anthropic';
  strictMode?: boolean; // If true, any unsupported claim fails
  temperature?: number;
}

export interface Claim {
  text: string;
  supported: boolean;
  reasoning: string;
  sourceReference?: string;
}

export interface FactualityResult {
  score: number;
  claims: Claim[];
  supportedCount: number;
  unsupportedCount: number;
  reasoning: string;
}

// ============================================================================
// System Prompts
// ============================================================================

const CLAIM_EXTRACTION_PROMPT = `You are an expert at identifying factual claims in text.

Extract all factual claims from the given text. A factual claim is a statement that can be verified as true or false.

Respond with a JSON array of claims:
{
  "claims": ["claim 1", "claim 2", ...]
}

Only include verifiable factual statements, not opinions or questions.`;

const CLAIM_VERIFICATION_PROMPT = `You are an expert fact-checker. Verify each claim against the provided source material.

For each claim, determine if it is:
- SUPPORTED: The source material contains information that supports this claim
- UNSUPPORTED: The source material does not support this claim or contradicts it

Respond with JSON:
{
  "verifications": [
    {
      "claim": "<the claim>",
      "supported": true/false,
      "reasoning": "<why it is or isn't supported>",
      "sourceReference": "<relevant quote from source, if supported>"
    }
  ]
}

Be strict but fair. A claim is supported only if the source material provides evidence for it.`;

// ============================================================================
// Claim Extraction
// ============================================================================

async function extractClaimsOpenAI(
  output: string,
  model: string = 'gpt-4o-mini'
): Promise<string[]> {
  const openai = new OpenAI();

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: CLAIM_EXTRACTION_PROMPT },
      { role: 'user', content: `Extract factual claims from:\n\n${output}` },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '{}';

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.claims) ? parsed.claims : [];
  } catch {
    return [];
  }
}

async function extractClaimsAnthropic(
  output: string,
  model: string = 'claude-sonnet-4-20250514'
): Promise<string[]> {
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: CLAIM_EXTRACTION_PROMPT,
    messages: [
      { role: 'user', content: `Extract factual claims from:\n\n${output}` },
    ],
  });

  const content = response.content[0];
  const text = content.type === 'text' ? content.text : '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed.claims) ? parsed.claims : [];
    }
  } catch {
    // Fall through
  }

  return [];
}

// ============================================================================
// Claim Verification
// ============================================================================

async function verifyClaimsOpenAI(
  claims: string[],
  source: string,
  model: string = 'gpt-4o-mini'
): Promise<Claim[]> {
  const openai = new OpenAI();

  const prompt = `## Source Material\n\n${source}\n\n## Claims to Verify\n\n${claims.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: CLAIM_VERIFICATION_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '{}';

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.verifications)) {
      return parsed.verifications.map((v: { claim: string; supported: boolean; reasoning: string; sourceReference?: string }) => ({
        text: v.claim,
        supported: Boolean(v.supported),
        reasoning: v.reasoning || '',
        sourceReference: v.sourceReference,
      }));
    }
  } catch {
    // Fall through
  }

  return claims.map((c) => ({
    text: c,
    supported: false,
    reasoning: 'Failed to verify claim',
  }));
}

async function verifyClaimsAnthropic(
  claims: string[],
  source: string,
  model: string = 'claude-sonnet-4-20250514'
): Promise<Claim[]> {
  const anthropic = new Anthropic();

  const prompt = `## Source Material\n\n${source}\n\n## Claims to Verify\n\n${claims.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    system: CLAIM_VERIFICATION_PROMPT,
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  const content = response.content[0];
  const text = content.type === 'text' ? content.text : '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.verifications)) {
        return parsed.verifications.map((v: { claim: string; supported: boolean; reasoning: string; sourceReference?: string }) => ({
          text: v.claim,
          supported: Boolean(v.supported),
          reasoning: v.reasoning || '',
          sourceReference: v.sourceReference,
        }));
      }
    }
  } catch {
    // Fall through
  }

  return claims.map((c) => ({
    text: c,
    supported: false,
    reasoning: 'Failed to verify claim',
  }));
}

// ============================================================================
// Main Evaluation Function
// ============================================================================

/**
 * Check factuality of output against source material
 */
export async function checkFactuality(
  output: string,
  config: FactualityConfig
): Promise<FactualityResult> {
  const provider = config.provider || 'openai';
  const model = config.model;

  // Extract claims
  let claims: string[];
  if (provider === 'anthropic') {
    claims = await extractClaimsAnthropic(output, model);
  } else {
    claims = await extractClaimsOpenAI(output, model);
  }

  if (claims.length === 0) {
    return {
      score: 1, // No claims to verify = no factual errors
      claims: [],
      supportedCount: 0,
      unsupportedCount: 0,
      reasoning: 'No factual claims found in output',
    };
  }

  // Verify claims
  let verifiedClaims: Claim[];
  if (provider === 'anthropic') {
    verifiedClaims = await verifyClaimsAnthropic(claims, config.source, model);
  } else {
    verifiedClaims = await verifyClaimsOpenAI(claims, config.source, model);
  }

  const supportedCount = verifiedClaims.filter((c) => c.supported).length;
  const unsupportedCount = verifiedClaims.filter((c) => !c.supported).length;
  const score = verifiedClaims.length > 0 ? supportedCount / verifiedClaims.length : 1;

  // Build reasoning
  let reasoning = `${supportedCount}/${verifiedClaims.length} claims supported`;
  if (unsupportedCount > 0) {
    const unsupported = verifiedClaims.filter((c) => !c.supported);
    reasoning += `. Unsupported: ${unsupported.map((c) => `"${c.text.slice(0, 50)}..."`).join(', ')}`;
  }

  return {
    score,
    claims: verifiedClaims,
    supportedCount,
    unsupportedCount,
    reasoning,
  };
}

// ============================================================================
// Grader Function
// ============================================================================

/**
 * Factuality grader
 */
export async function factualityGrader(
  output: string,
  config: FactualityConfig,
  graderId?: string
): Promise<GraderResult> {
  const result = await checkFactuality(output, config);

  // In strict mode, any unsupported claim fails
  const passed = config.strictMode
    ? result.unsupportedCount === 0
    : result.score >= 0.5;

  return {
    graderId: graderId ?? 'factuality',
    graderType: 'factuality' as GraderType,
    passed,
    score: result.score,
    details: result.reasoning,
  };
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a factuality grader
 */
export function createFactualityGrader(
  config: FactualityConfig
): (output: string) => Promise<GraderResult> {
  return (output: string) => factualityGrader(output, config);
}
