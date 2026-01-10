/**
 * JSON Validator Graders
 * Code-based graders for validating JSON output
 */

import { z } from 'zod';
import type { GraderResult, GraderType } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface JsonGraderConfig {
  schema?: z.ZodSchema;
  schemaJson?: Record<string, unknown>; // For serializable schema representation
  fieldPaths?: string[];
  fieldPath?: string;
  expectedValue?: unknown;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Safely parse JSON string
 */
function parseJson(input: string): { success: true; data: unknown } | { success: false; error: string } {
  try {
    const data = JSON.parse(input);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extract JSON from a string that may contain additional text
 * Tries to find JSON object or array in the string
 */
function extractJson(input: string): string | null {
  // Try to parse as-is first
  const direct = parseJson(input);
  if (direct.success) return input;

  // Try to find JSON object
  const objectMatch = input.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    const parsed = parseJson(objectMatch[0]);
    if (parsed.success) return objectMatch[0];
  }

  // Try to find JSON array
  const arrayMatch = input.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const parsed = parseJson(arrayMatch[0]);
    if (parsed.success) return arrayMatch[0];
  }

  return null;
}

/**
 * Get value at nested path like "user.address.city"
 */
function getValueAtPath(obj: unknown, path: string): { found: boolean; value?: unknown } {
  if (typeof obj !== 'object' || obj === null) {
    return { found: false };
  }

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return { found: false };
    }

    // Handle array index notation like "items[0]"
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, indexStr] = arrayMatch;
      const index = parseInt(indexStr, 10);
      const arr = (current as Record<string, unknown>)[key];
      if (!Array.isArray(arr) || index >= arr.length) {
        return { found: false };
      }
      current = arr[index];
    } else {
      if (!(part in (current as Record<string, unknown>))) {
        return { found: false };
      }
      current = (current as Record<string, unknown>)[part];
    }
  }

  return { found: true, value: current };
}

/**
 * Deep equality check
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, i) => deepEqual(item, b[i]));
    }

    if (Array.isArray(a) || Array.isArray(b)) return false;

    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
  }

  return false;
}

// ============================================================================
// Is Valid JSON Grader
// ============================================================================

/**
 * Check if output is valid JSON
 */
export function isValidJson(output: string, extractFromText: boolean = true): GraderResult {
  // Try direct parse
  const direct = parseJson(output);
  if (direct.success) {
    return {
      graderId: 'json-valid',
      graderType: 'json-valid' as GraderType,
      passed: true,
      score: 1,
      details: 'Output is valid JSON',
    };
  }

  // Try extraction if enabled
  if (extractFromText) {
    const extracted = extractJson(output);
    if (extracted) {
      return {
        graderId: 'json-valid',
        graderType: 'json-valid' as GraderType,
        passed: true,
        score: 0.8, // Slightly lower score for extracted JSON
        details: 'Found valid JSON within output',
      };
    }
  }

  return {
    graderId: 'json-valid',
    graderType: 'json-valid' as GraderType,
    passed: false,
    score: 0,
    details: `Invalid JSON: ${direct.error}`,
  };
}

// ============================================================================
// Matches Schema Grader
// ============================================================================

/**
 * Check if JSON output matches a Zod schema
 */
export function matchesSchema(
  output: string,
  schema: z.ZodSchema,
  extractFromText: boolean = true
): GraderResult {
  // Parse JSON
  let jsonStr = output;
  if (extractFromText) {
    const extracted = extractJson(output);
    if (!extracted) {
      return {
        graderId: 'json-schema',
        graderType: 'json-schema' as GraderType,
        passed: false,
        score: 0,
        details: 'Could not extract JSON from output',
      };
    }
    jsonStr = extracted;
  }

  const parsed = parseJson(jsonStr);
  if (!parsed.success) {
    return {
      graderId: 'json-schema',
      graderType: 'json-schema' as GraderType,
      passed: false,
      score: 0,
      details: `Invalid JSON: ${parsed.error}`,
    };
  }

  // Validate against schema
  const validation = schema.safeParse(parsed.data);
  if (validation.success) {
    return {
      graderId: 'json-schema',
      graderType: 'json-schema' as GraderType,
      passed: true,
      score: 1,
      details: 'Output matches schema',
    };
  }

  // Format validation errors
  const errors = validation.error.errors
    .map((e) => `${e.path.join('.')}: ${e.message}`)
    .join('; ');

  return {
    graderId: 'json-schema',
    graderType: 'json-schema' as GraderType,
    passed: false,
    score: 0,
    details: `Schema validation failed: ${errors}`,
  };
}

// ============================================================================
// Has Fields Grader
// ============================================================================

/**
 * Check if JSON output has specific fields (supports nested paths)
 */
export function hasFields(
  output: string,
  fieldPaths: string[],
  extractFromText: boolean = true
): GraderResult {
  // Parse JSON
  let jsonStr = output;
  if (extractFromText) {
    const extracted = extractJson(output);
    if (!extracted) {
      return {
        graderId: 'json-schema',
        graderType: 'json-schema' as GraderType,
        passed: false,
        score: 0,
        details: 'Could not extract JSON from output',
      };
    }
    jsonStr = extracted;
  }

  const parsed = parseJson(jsonStr);
  if (!parsed.success) {
    return {
      graderId: 'json-schema',
      graderType: 'json-schema' as GraderType,
      passed: false,
      score: 0,
      details: `Invalid JSON: ${parsed.error}`,
    };
  }

  // Check each field
  const missingFields: string[] = [];
  const presentFields: string[] = [];

  for (const path of fieldPaths) {
    const result = getValueAtPath(parsed.data, path);
    if (result.found) {
      presentFields.push(path);
    } else {
      missingFields.push(path);
    }
  }

  const score = fieldPaths.length > 0 ? presentFields.length / fieldPaths.length : 1;
  const passed = missingFields.length === 0;

  return {
    graderId: 'json-schema',
    graderType: 'json-schema' as GraderType,
    passed,
    score,
    details: passed
      ? `All required fields present: ${presentFields.join(', ')}`
      : `Missing fields: ${missingFields.join(', ')}`,
  };
}

// ============================================================================
// Field Equals Grader
// ============================================================================

/**
 * Check if a specific field equals an expected value
 */
export function fieldEquals(
  output: string,
  fieldPath: string,
  expectedValue: unknown,
  extractFromText: boolean = true
): GraderResult {
  // Parse JSON
  let jsonStr = output;
  if (extractFromText) {
    const extracted = extractJson(output);
    if (!extracted) {
      return {
        graderId: 'json-schema',
        graderType: 'json-schema' as GraderType,
        passed: false,
        score: 0,
        details: 'Could not extract JSON from output',
      };
    }
    jsonStr = extracted;
  }

  const parsed = parseJson(jsonStr);
  if (!parsed.success) {
    return {
      graderId: 'json-schema',
      graderType: 'json-schema' as GraderType,
      passed: false,
      score: 0,
      details: `Invalid JSON: ${parsed.error}`,
    };
  }

  // Get value at path
  const result = getValueAtPath(parsed.data, fieldPath);
  if (!result.found) {
    return {
      graderId: 'json-schema',
      graderType: 'json-schema' as GraderType,
      passed: false,
      score: 0,
      details: `Field "${fieldPath}" not found`,
    };
  }

  // Compare values
  const isEqual = deepEqual(result.value, expectedValue);

  return {
    graderId: 'json-schema',
    graderType: 'json-schema' as GraderType,
    passed: isEqual,
    score: isEqual ? 1 : 0,
    details: isEqual
      ? `Field "${fieldPath}" equals expected value`
      : `Field "${fieldPath}" = ${JSON.stringify(result.value)}, expected ${JSON.stringify(expectedValue)}`,
  };
}

// ============================================================================
// Create Grader Function
// ============================================================================

/**
 * Create a JSON grader from config
 */
export function createJsonGrader(
  type: 'json-valid' | 'json-schema' | 'has-fields' | 'field-equals',
  config: JsonGraderConfig = {}
): (output: string) => GraderResult {
  switch (type) {
    case 'json-valid':
      return (output: string) => isValidJson(output);
    case 'json-schema':
      if (!config.schema) {
        throw new Error('Schema required for json-schema grader');
      }
      return (output: string) => matchesSchema(output, config.schema!);
    case 'has-fields':
      if (!config.fieldPaths) {
        throw new Error('fieldPaths required for has-fields grader');
      }
      return (output: string) => hasFields(output, config.fieldPaths!);
    case 'field-equals':
      if (!config.fieldPath) {
        throw new Error('fieldPath required for field-equals grader');
      }
      return (output: string) => fieldEquals(output, config.fieldPath!, config.expectedValue);
    default:
      throw new Error(`Unknown JSON grader type: ${type}`);
  }
}

// ============================================================================
// Utility Exports
// ============================================================================

export { parseJson, extractJson, getValueAtPath, deepEqual };
