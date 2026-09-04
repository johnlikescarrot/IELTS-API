import { describe, expect, it } from 'vitest';
import { getOverallBandDescriptor } from '../src/data/band-scores.js';
import { getReadingBandRanges } from '../src/data/reading.js';
import { getWritingCriterion } from '../src/data/writing.js';
import { getSpeakingCriterion } from '../src/data/speaking.js';
import { searchVocabulary } from '../src/data/vocabulary.js';
import { searchMistakes } from '../src/data/mistakes.js';
import { filterResources } from '../src/data/resources.js';

describe('getOverallBandDescriptor', () => {
  it('finds a descriptor for a known band', () => {
    expect(getOverallBandDescriptor(7)?.band).toBe(7);
  });

  it('returns undefined for an unknown band', () => {
    expect(getOverallBandDescriptor(11)).toBeUndefined();
  });
});

describe('getReadingBandRanges', () => {
  it('returns the academic table', () => {
    expect(getReadingBandRanges('academic')[0]?.band).toBe(9);
  });

  it('returns the general-training table', () => {
    expect(getReadingBandRanges('general-training')[0]?.band).toBe(9);
  });

  it('throws on an unknown module', () => {
    expect(() => getReadingBandRanges('unknown' as never)).toThrow(/module/);
  });
});

describe('getWritingCriterion', () => {
  it('finds a known criterion', () => {
    expect(getWritingCriterion('coherence-cohesion')?.name).toBe('Coherence and Cohesion');
  });

  it('returns undefined for an unknown criterion', () => {
    expect(getWritingCriterion('nope' as never)).toBeUndefined();
  });
});

describe('getSpeakingCriterion', () => {
  it('finds a known criterion', () => {
    expect(getSpeakingCriterion('pronunciation')?.name).toBe('Pronunciation');
  });

  it('returns undefined for an unknown criterion', () => {
    expect(getSpeakingCriterion('nope' as never)).toBeUndefined();
  });
});

describe('searchVocabulary', () => {
  it('returns the whole list for an empty query', () => {
    expect(searchVocabulary('')).toHaveLength(24);
    expect(searchVocabulary('   ')).toHaveLength(24);
  });

  it('filters by a matching term', () => {
    const matches = searchVocabulary('education');
    expect(matches.length).toBeGreaterThan(0);
    for (const entry of matches) {
      expect(entry.category).toBe('education');
    }
  });

  it('matches against the definition text', () => {
    expect(searchVocabulary('climate').length).toBeGreaterThan(0);
  });
});

describe('searchMistakes', () => {
  it('returns the whole list for an empty query', () => {
    expect(searchMistakes('')).toHaveLength(12);
  });

  it('filters by category', () => {
    const matches = searchMistakes('grammar');
    expect(matches.length).toBeGreaterThan(0);
    for (const entry of matches) {
      expect(entry.category).toBe('grammar');
    }
  });
});

describe('filterResources', () => {
  it('returns everything with no filters', () => {
    expect(filterResources()).toHaveLength(12);
  });

  it('filters by a matching skill', () => {
    const matches = filterResources('writing');
    expect(matches.length).toBeGreaterThan(0);
    for (const entry of matches) {
      expect(entry.skill).toBe('writing');
    }
  });

  it('returns nothing for a skill that is absent', () => {
    expect(filterResources('unknown-skill')).toHaveLength(0);
  });

  it('filters by a matching query', () => {
    const matches = filterResources(undefined, 'listening');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('ignores a whitespace-only query', () => {
    expect(filterResources(undefined, '   ')).toHaveLength(12);
  });

  it('combines skill and query filters', () => {
    const matches = filterResources('writing', 'grammar');
    expect(matches.length).toBeGreaterThan(0);
  });
});
