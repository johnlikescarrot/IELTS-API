import { describe, expect, it } from 'vitest';

import { MISTAKE_TYPES, mistakeTypeById } from '../../src/data/mistakes.js';

describe('MISTAKE_TYPES', () => {
  it('publishes the five self-review mistake types', () => {
    expect(MISTAKE_TYPES.map((row) => row.id)).toEqual([
      'recognition',
      'listening',
      'spelling',
      'pronunciation',
      'usage',
    ]);
  });

  it('gives every type signals, a protocol and drills', () => {
    for (const row of MISTAKE_TYPES) {
      expect(row.name.length).toBeGreaterThan(0);
      expect(['listening', 'reading', 'writing', 'speaking']).toContain(row.skill);
      expect(row.description.length).toBeGreaterThan(0);
      expect(row.signals.length).toBeGreaterThanOrEqual(3);
      expect(row.protocol.length).toBeGreaterThanOrEqual(3);
      expect(row.drills.length).toBeGreaterThanOrEqual(2);
      for (const drill of row.drills) {
        expect(drill.url.startsWith('/v1/')).toBe(true);
      }
    }
  });
});

describe('mistakeTypeById', () => {
  it('finds a mistake type by id', () => {
    expect(mistakeTypeById('spelling')?.name).toBe('Spelling error');
  });

  it('returns undefined for unknown ids', () => {
    expect(mistakeTypeById('grammar')).toBeUndefined();
  });
});
