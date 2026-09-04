import { describe, expect, it } from 'vitest';
import * as api from '../src/index.ts';

describe('package entry point', () => {
  it('re-exports the public surface', () => {
    expect(api.API_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(typeof api.createApp).toBe('function');
    expect(typeof api.createServer).toBe('function');
    expect(typeof api.requestListener).toBe('function');
    expect(typeof api.roundToBand).toBe('function');
    expect(typeof api.estimateWriting).toBe('function');
    expect(api.VOCABULARY.length).toBeGreaterThan(0);
    expect(api.WRITING_PROMPTS.length).toBeGreaterThan(0);
    expect(api.CEFR_LEVELS).toContain('B2');
  });
});
