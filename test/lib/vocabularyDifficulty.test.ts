import { describe, expect, it } from 'vitest';

import { allEntries } from '../../src/data/vocabulary.js';
import { estimateDifficulty, levelForDifficultyScore } from '../../src/lib/vocabularyDifficulty.js';

describe('estimateDifficulty', () => {
  it('scores a common short word lower than a rare long word', () => {
    const shortCommon = {
      id: 'w00000',
      word: 'time',
      phonetic: '/taɪm/',
      partOfSpeech: 'noun' as const,
      definition: 'the indefinite continued progress of existence',
      senses: [{ pos: 'noun' as const, text: 'the indefinite continued progress' }],
      morphemes: 'time(test)',
      volumes: [1, 2, 3, 4, 5],
    };
    const longRare = {
      id: 'w99999',
      word: 'antidisestablishmentarianism',
      phonetic: null,
      partOfSpeech: 'noun' as const,
      definition: 'opposition to the disestablishment of the Church of England',
      senses: [
        { pos: 'noun' as const, text: 'opposition' },
        { pos: 'noun' as const, text: 'second sense' },
        { pos: 'noun' as const, text: 'third' },
      ],
      morphemes: null,
      volumes: [1],
    };
    const shortScore = estimateDifficulty(shortCommon).score;
    const longScore = estimateDifficulty(longRare).score;
    expect(shortScore).toBeLessThan(longScore);
  });

  it('maps scores to CEFR levels', () => {
    expect(levelForDifficultyScore(10).level).toBe('A1');
    expect(levelForDifficultyScore(25).level).toBe('A2');
    expect(levelForDifficultyScore(45).level).toBe('B1');
    expect(levelForDifficultyScore(70).level).toBe('B2');
    expect(levelForDifficultyScore(85).level).toBe('C1');
    expect(levelForDifficultyScore(95).level).toBe('C2');
    expect(levelForDifficultyScore(-5).level).toBe('A1');
    expect(levelForDifficultyScore(150).level).toBe('C2');
  });

  it('produces components that sum near the total', () => {
    const entry = allEntries()[0] as typeof allEntries extends () => readonly (infer U)[] ? U : never;
    const result = estimateDifficulty(entry);
    const sum =
      result.components.scarcity +
      result.components.length +
      result.components.senses +
      result.components.phonetic +
      result.components.morphology;
    expect(Math.abs(sum - result.score)).toBeLessThan(0.5);
    expect(result.signals.volumes).toBe(entry.volumes.length);
    expect(result.signals.length).toBe(entry.word.length);
    expect(result.signals.senses).toBe(entry.senses.length);
    expect(result.signals.hasPhonetic).toBe(entry.phonetic !== null);
    expect(result.signals.hasMorphemes).toBe(entry.morphemes !== null);
    expect(result.signals.syllables).toBeGreaterThanOrEqual(1);
  });

  it('handles missing phonetic and morphemes', () => {
    const entry = allEntries().find((e) => e.phonetic === null || e.morphemes === null);
    if (entry !== undefined) {
      const result = estimateDifficulty(entry);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).toContain(result.level);
    }
  });

  it('caps score at 100', () => {
    const synthetic = {
      id: 'w99999',
      word: 'antidisestablishmentarianism',
      phonetic: null,
      partOfSpeech: 'noun' as const,
      definition: 'test',
      senses: [
        { pos: 'noun' as const, text: 'test' },
        { pos: 'noun' as const, text: 't2' },
        { pos: 'noun' as const, text: 't3' },
        { pos: 'noun' as const, text: 't4' },
        { pos: 'noun' as const, text: 't5' },
      ],
      morphemes: null,
      volumes: [1],
    };
    const result = estimateDifficulty(synthetic);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.level).toBeTruthy();
    expect(result.label).toBeTruthy();
  });

  it('assigns B1-B2 for mid difficulty', () => {
    expect(levelForDifficultyScore(40).label).toBe('Elementary');
    expect(levelForDifficultyScore(50).label).toBe('Intermediate');
  });
});
