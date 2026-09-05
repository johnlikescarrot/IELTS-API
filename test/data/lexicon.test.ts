import { describe, expect, it } from 'vitest';

import {
  COHESION_RELATIONS,
  COHESIVE_DEVICES,
  COHESIVE_DEVICES_BY_LENGTH,
  FUNCTION_WORDS,
  isFunctionWord,
} from '../../src/data/lexicon.js';

describe('the cohesive-device inventory', () => {
  it('covers every relation in both registers', () => {
    for (const relation of COHESION_RELATIONS) {
      const forRelation = COHESIVE_DEVICES.filter((device) => device.relation === relation);
      expect(forRelation.length).toBeGreaterThan(0);
      expect(forRelation.some((device) => device.register === 'basic')).toBe(true);
      expect(forRelation.some((device) => device.register === 'academic')).toBe(true);
    }
  });

  it('holds lower-cased, trimmed, unique phrases', () => {
    const seen = new Set<string>();
    for (const device of COHESIVE_DEVICES) {
      expect(device.phrase).toBe(device.phrase.toLowerCase().trim());
      expect(device.phrase.length).toBeGreaterThan(0);
      expect(seen.has(device.phrase)).toBe(false);
      seen.add(device.phrase);
    }
  });

  it('orders the length-sorted view longest first', () => {
    expect(COHESIVE_DEVICES_BY_LENGTH).toHaveLength(COHESIVE_DEVICES.length);
    for (let index = 1; index < COHESIVE_DEVICES_BY_LENGTH.length; index += 1) {
      const previous = COHESIVE_DEVICES_BY_LENGTH[index - 1] as { phrase: string };
      const current = COHESIVE_DEVICES_BY_LENGTH[index] as { phrase: string };
      expect(previous.phrase.length).toBeGreaterThanOrEqual(current.phrase.length);
    }
  });

  it('breaks length ties alphabetically', () => {
    const sameLength = COHESIVE_DEVICES_BY_LENGTH.filter((device) => device.phrase.length === 3).map(
      (device) => device.phrase,
    );
    expect(sameLength).toEqual([...sameLength].sort());
  });
});

describe('the function-word list', () => {
  it('recognises closed-class words case-insensitively', () => {
    expect(isFunctionWord('The')).toBe(true);
    expect(isFunctionWord('WOULD')).toBe(true);
    expect(isFunctionWord('sustainability')).toBe(false);
  });

  it('is non-trivial', () => {
    expect(FUNCTION_WORDS.size).toBeGreaterThan(150);
  });
});
