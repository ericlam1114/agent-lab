/**
 * Semantic Similarity Grader
 * Compares output to expected using embeddings
 */

import OpenAI from 'openai';
import type { GraderResult, GraderType } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface SimilarityConfig {
  expected: string;
  model?: string;
  threshold?: number;
  provider?: 'openai';
}

export interface SimilarityResult {
  similarity: number;
  passed: boolean;
  threshold: number;
}

// ============================================================================
// Embedding Cache
// ============================================================================

const embeddingCache = new Map<string, number[]>();

function getCacheKey(text: string, model: string): string {
  return `${model}:${text.slice(0, 500)}`;
}

function getFromCache(key: string): number[] | undefined {
  return embeddingCache.get(key);
}

function setInCache(key: string, embedding: number[]): void {
  // Limit cache size
  if (embeddingCache.size > 500) {
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey) embeddingCache.delete(firstKey);
  }
  embeddingCache.set(key, embedding);
}

export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

// ============================================================================
// Embedding Functions
// ============================================================================

/**
 * Get embeddings for multiple texts (batched)
 */
async function getBatchEmbeddings(
  texts: string[],
  model: string = 'text-embedding-3-small'
): Promise<number[][]> {
  const results: number[][] = [];
  const uncached: { index: number; text: string }[] = [];

  // Check cache first
  for (let i = 0; i < texts.length; i++) {
    const cacheKey = getCacheKey(texts[i], model);
    const cached = getFromCache(cacheKey);
    if (cached) {
      results[i] = cached;
    } else {
      uncached.push({ index: i, text: texts[i] });
    }
  }

  // Fetch uncached embeddings
  if (uncached.length > 0) {
    const openai = new OpenAI();

    const response = await openai.embeddings.create({
      model,
      input: uncached.map((u) => u.text),
    });

    for (let i = 0; i < uncached.length; i++) {
      const embedding = response.data[i]?.embedding || [];
      const item = uncached[i];
      results[item.index] = embedding;
      setInCache(getCacheKey(item.text, model), embedding);
    }
  }

  return results;
}

// ============================================================================
// Similarity Calculations
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Convert Euclidean distance to similarity score (0-1)
 */
export function distanceToSimilarity(distance: number, maxDistance: number = 2): number {
  return Math.max(0, 1 - distance / maxDistance);
}

// ============================================================================
// Main Similarity Function
// ============================================================================

/**
 * Calculate semantic similarity between output and expected
 */
export async function calculateSemanticSimilarity(
  output: string,
  config: SimilarityConfig
): Promise<SimilarityResult> {
  const model = config.model || 'text-embedding-3-small';
  const threshold = config.threshold ?? 0.8;

  try {
    // Get embeddings for both texts
    const [outputEmbedding, expectedEmbedding] = await getBatchEmbeddings(
      [output, config.expected],
      model
    );

    // Calculate cosine similarity
    const similarity = cosineSimilarity(outputEmbedding, expectedEmbedding);

    return {
      similarity,
      passed: similarity >= threshold,
      threshold,
    };
  } catch {
    // Return zero similarity on error
    return {
      similarity: 0,
      passed: false,
      threshold,
    };
  }
}

// ============================================================================
// Grader Function
// ============================================================================

/**
 * Semantic similarity grader
 */
export async function similarityGrader(
  output: string,
  config: SimilarityConfig,
  graderId?: string
): Promise<GraderResult> {
  const result = await calculateSemanticSimilarity(output, config);

  return {
    graderId: graderId ?? 'similarity',
    graderType: 'similarity' as GraderType,
    passed: result.passed,
    score: result.similarity,
    details: `Similarity: ${(result.similarity * 100).toFixed(1)}% (threshold: ${(result.threshold * 100).toFixed(1)}%)`,
  };
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a similarity grader
 */
export function createSimilarityGrader(
  config: SimilarityConfig
): (output: string) => Promise<GraderResult> {
  return (output: string) => similarityGrader(output, config);
}

// ============================================================================
// Batch Similarity
// ============================================================================

/**
 * Calculate similarity between output and multiple expected strings
 * Returns the highest similarity
 */
export async function calculateBestSimilarity(
  output: string,
  expectedList: string[],
  model: string = 'text-embedding-3-small'
): Promise<{ similarity: number; bestMatch: string; bestIndex: number }> {
  const allTexts = [output, ...expectedList];
  const embeddings = await getBatchEmbeddings(allTexts, model);

  const outputEmbedding = embeddings[0];
  let bestSimilarity = -1;
  let bestMatch = '';
  let bestIndex = -1;

  for (let i = 1; i < embeddings.length; i++) {
    const similarity = cosineSimilarity(outputEmbedding, embeddings[i]);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = expectedList[i - 1];
      bestIndex = i - 1;
    }
  }

  return {
    similarity: bestSimilarity,
    bestMatch,
    bestIndex,
  };
}
