/**
 * Unit Tests for Graders (Task 37)
 */

import { describe, it, expect } from 'vitest';
import {
  exactMatch,
  containsString,
  regexMatch,
  fuzzyMatch,
} from '../src/graders/code-based/string-match';
import {
  isValidJson,
  hasFields,
  fieldEquals,
} from '../src/graders/code-based/json-validator';

// ============================================================================
// String Match Graders
// ============================================================================

describe('exactMatch', () => {
  it('should pass on exact match', () => {
    const result = exactMatch('hello world', { expected: 'hello world' });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('should fail on mismatch', () => {
    const result = exactMatch('hello world', { expected: 'hello' });
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  it('should be case sensitive by default', () => {
    const result = exactMatch('Hello', { expected: 'hello' });
    expect(result.passed).toBe(false);
  });

  it('should support case insensitive matching', () => {
    const result = exactMatch('Hello', { expected: 'hello', caseSensitive: false });
    expect(result.passed).toBe(true);
  });
});

describe('containsString', () => {
  it('should pass when substring is present', () => {
    const result = containsString('hello world', { substring: 'world' });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('should fail when substring is absent', () => {
    const result = containsString('hello world', { substring: 'foo' });
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  it('should support case insensitive search', () => {
    const result = containsString('Hello World', { substring: 'WORLD', caseSensitive: false });
    expect(result.passed).toBe(true);
  });
});

describe('regexMatch', () => {
  it('should pass on pattern match', () => {
    const result = regexMatch('hello world 123', { pattern: '\\d+' });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('should fail on no match', () => {
    const result = regexMatch('hello world', { pattern: '\\d+' });
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  it('should handle complex patterns', () => {
    const result = regexMatch('user@example.com', { pattern: '[a-zA-Z0-9]+@[a-zA-Z0-9]+\\.[a-z]+' });
    expect(result.passed).toBe(true);
  });

  it('should handle invalid regex gracefully', () => {
    const result = regexMatch('test', { pattern: '[invalid(regex' });
    expect(result.passed).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('fuzzyMatch', () => {
  it('should pass on exact match', () => {
    const result = fuzzyMatch('hello', { expected: 'hello' });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('should pass on similar strings above threshold', () => {
    const result = fuzzyMatch('hello', { expected: 'hallo', threshold: 0.7 });
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThan(0.7);
  });

  it('should fail on dissimilar strings', () => {
    const result = fuzzyMatch('hello', { expected: 'world', threshold: 0.8 });
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(0.8);
  });

  it('should handle empty strings', () => {
    const result = fuzzyMatch('', { expected: '' });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });
});

// ============================================================================
// JSON Validator Graders
// ============================================================================

describe('isValidJson', () => {
  it('should pass for valid JSON object', () => {
    const result = isValidJson('{"name": "test", "value": 123}');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('should pass for valid JSON array', () => {
    const result = isValidJson('[1, 2, 3]');
    expect(result.passed).toBe(true);
  });

  it('should fail for invalid JSON', () => {
    const result = isValidJson('not json');
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  it('should fail for partial JSON', () => {
    const result = isValidJson('{"incomplete":');
    expect(result.passed).toBe(false);
  });
});

describe('hasFields', () => {
  it('should pass when all fields exist', () => {
    const json = '{"name": "test", "age": 25, "email": "test@example.com"}';
    const result = hasFields(json, ['name', 'age', 'email']);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('should fail when fields are missing', () => {
    const json = '{"name": "test"}';
    const result = hasFields(json, ['name', 'age']);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0.5);
  });

  it('should handle nested paths', () => {
    const json = '{"user": {"address": {"city": "NYC"}}}';
    const result = hasFields(json, ['user.address.city']);
    expect(result.passed).toBe(true);
  });

  it('should fail on invalid JSON', () => {
    const result = hasFields('invalid', ['name']);
    expect(result.passed).toBe(false);
  });
});

describe('fieldEquals', () => {
  it('should pass when field matches value', () => {
    const json = '{"status": "success", "code": 200}';
    const result = fieldEquals(json, 'status', 'success');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('should fail when field does not match', () => {
    const json = '{"status": "error"}';
    const result = fieldEquals(json, 'status', 'success');
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  it('should handle numeric values', () => {
    const json = '{"count": 42}';
    const result = fieldEquals(json, 'count', 42);
    expect(result.passed).toBe(true);
  });

  it('should handle nested paths', () => {
    const json = '{"data": {"result": "ok"}}';
    const result = fieldEquals(json, 'data.result', 'ok');
    expect(result.passed).toBe(true);
  });

  it('should fail when path does not exist', () => {
    const json = '{"a": 1}';
    const result = fieldEquals(json, 'b.c', 'value');
    expect(result.passed).toBe(false);
  });
});
