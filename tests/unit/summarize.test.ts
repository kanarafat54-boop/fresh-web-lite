import { describe, it, expect } from 'vitest';
import { chunk } from '../../ai/pipeline/summarize';

describe('chunk', () => {
  it('returns a single chunk for short text', () => {
    expect(chunk('hello world', 4000)).toEqual(['hello world']);
  });

  it('splits long text with overlap', () => {
    const text = 'a'.repeat(9000);
    const parts = chunk(text, 4000, 200);
    expect(parts.length).toBeGreaterThan(2);
    expect(parts[0].length).toBe(4000);
  });

  it('covers the whole input', () => {
    const text = 'abcdefghij'.repeat(500);
    const parts = chunk(text, 1000, 100);
    expect(parts.join('').length).toBeGreaterThanOrEqual(text.length);
  });
});
