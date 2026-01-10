/**
 * String Match Graders
 * Code-based graders for string matching and comparison
 */

import type { GraderResult, GraderType } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface StringGraderConfig {
  expected?: string;
  substring?: string;
  pattern?: string;
  threshold?: number;
  caseSensitive?: boolean;
}

export interface StringGraderFn {
  (output: string, config: StringGraderConfig): GraderResult;
}

// ============================================================================
// Exact Match Grader
// ============================================================================

/**
 * Check if output exactly matches expected string
 */
export function exactMatch(output: string, config: StringGraderConfig): GraderResult {
  const { expected, caseSensitive = true } = config;

  if (!expected) {
    return {
      graderId: 'exact-match',
      graderType: 'exact-match' as GraderType,
      passed: false,
      score: 0,
      error: 'Expected value not provided',
    };
  }

  const outputCompare = caseSensitive ? output : output.toLowerCase();
  const expectedCompare = caseSensitive ? expected : expected.toLowerCase();

  const passed = outputCompare === expectedCompare;

  return {
    graderId: 'exact-match',
    graderType: 'exact-match' as GraderType,
    passed,
    score: passed ? 1 : 0,
    details: passed
      ? 'Output exactly matches expected value'
      : `Output does not match. Expected: "${expected.slice(0, 100)}${expected.length > 100 ? '...' : ''}"`,
  };
}

// ============================================================================
// Contains String Grader
// ============================================================================

/**
 * Check if output contains a substring
 */
export function containsString(output: string, config: StringGraderConfig): GraderResult {
  const { substring, caseSensitive = true } = config;

  if (!substring) {
    return {
      graderId: 'contains',
      graderType: 'contains' as GraderType,
      passed: false,
      score: 0,
      error: 'Substring not provided',
    };
  }

  const outputCompare = caseSensitive ? output : output.toLowerCase();
  const substringCompare = caseSensitive ? substring : substring.toLowerCase();

  const passed = outputCompare.includes(substringCompare);

  return {
    graderId: 'contains',
    graderType: 'contains' as GraderType,
    passed,
    score: passed ? 1 : 0,
    details: passed
      ? `Output contains "${substring.slice(0, 50)}${substring.length > 50 ? '...' : ''}"`
      : `Output does not contain "${substring.slice(0, 50)}${substring.length > 50 ? '...' : ''}"`,
  };
}

// ============================================================================
// Regex Grader
// ============================================================================

/**
 * Check if output matches a regular expression pattern
 */
export function regexMatch(output: string, config: StringGraderConfig): GraderResult {
  const { pattern, caseSensitive = true } = config;

  if (!pattern) {
    return {
      graderId: 'regex',
      graderType: 'regex' as GraderType,
      passed: false,
      score: 0,
      error: 'Pattern not provided',
    };
  }

  try {
    const flags = caseSensitive ? '' : 'i';
    const regex = new RegExp(pattern, flags);
    const match = regex.test(output);

    return {
      graderId: 'regex',
      graderType: 'regex' as GraderType,
      passed: match,
      score: match ? 1 : 0,
      details: match
        ? `Output matches pattern: /${pattern}/`
        : `Output does not match pattern: /${pattern}/`,
    };
  } catch (error) {
    return {
      graderId: 'regex',
      graderType: 'regex' as GraderType,
      passed: false,
      score: 0,
      error: `Invalid regex pattern: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// Fuzzy Match Grader (Levenshtein Distance)
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-1) based on Levenshtein distance
 */
function calculateSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1; // Both strings are empty
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

/**
 * Check if output fuzzy matches expected string within threshold
 */
export function fuzzyMatch(output: string, config: StringGraderConfig): GraderResult {
  const { expected, threshold = 0.8, caseSensitive = false } = config;

  if (!expected) {
    return {
      graderId: 'fuzzy-match',
      graderType: 'fuzzy-match' as GraderType,
      passed: false,
      score: 0,
      error: 'Expected value not provided',
    };
  }

  const outputCompare = caseSensitive ? output : output.toLowerCase();
  const expectedCompare = caseSensitive ? expected : expected.toLowerCase();

  const similarity = calculateSimilarity(outputCompare, expectedCompare);
  const passed = similarity >= threshold;

  return {
    graderId: 'fuzzy-match',
    graderType: 'fuzzy-match' as GraderType,
    passed,
    score: similarity,
    details: `Similarity: ${(similarity * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(1)}%)`,
  };
}

// ============================================================================
// Create Grader Function
// ============================================================================

/**
 * Create a string grader from config
 */
export function createStringGrader(
  type: 'exact-match' | 'contains' | 'regex' | 'fuzzy-match',
  config: StringGraderConfig
): (output: string) => GraderResult {
  switch (type) {
    case 'exact-match':
      return (output: string) => exactMatch(output, config);
    case 'contains':
      return (output: string) => containsString(output, config);
    case 'regex':
      return (output: string) => regexMatch(output, config);
    case 'fuzzy-match':
      return (output: string) => fuzzyMatch(output, config);
    default:
      throw new Error(`Unknown string grader type: ${type}`);
  }
}

// ============================================================================
// Batch Grading
// ============================================================================

/**
 * Run multiple string graders on output
 */
export function runStringGraders(
  output: string,
  graders: Array<{
    type: 'exact-match' | 'contains' | 'regex' | 'fuzzy-match';
    config: StringGraderConfig;
    id?: string;
  }>
): GraderResult[] {
  return graders.map((grader, index) => {
    const result = createStringGrader(grader.type, grader.config)(output);
    return {
      ...result,
      graderId: grader.id ?? `${grader.type}-${index}`,
    };
  });
}

// ============================================================================
// Utility Exports
// ============================================================================

export { levenshteinDistance, calculateSimilarity };
