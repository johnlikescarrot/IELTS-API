import { describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '../../src/lib/errors.js';
import {
  getBandOverview,
  getSpeakingCriterion,
  getWritingCriterion,
  listBandOverviews,
  speakingCriteria,
  writingCriteria
} from '../../src/services/bands.service.js';

describe('listBandOverviews', () => {
  it('returns all nine bands in order', () => {
    const overviews = listBandOverviews();
    expect(overviews.map((overview) => overview.band)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(overviews[8]?.name).toBe('Expert user');
  });
});

describe('getBandOverview', () => {
  it('returns each band 1-9', () => {
    for (let band = 1; band <= 9; band++) {
      expect(getBandOverview(band).band).toBe(band);
    }
  });

  it('rejects invalid bands', () => {
    expect(() => getBandOverview(0)).toThrow(ValidationError);
    expect(() => getBandOverview(10)).toThrow(ValidationError);
    expect(() => getBandOverview(6.5)).toThrow(ValidationError);
  });
});

describe('writingCriteria', () => {
  it('uses Task Achievement for Task 1', () => {
    const criteria = writingCriteria(1);
    expect(criteria[0]?.criterion).toBe('Task Achievement');
    expect(criteria).toHaveLength(4);
  });

  it('uses Task Response for Task 2', () => {
    const criteria = writingCriteria(2);
    expect(criteria[0]?.criterion).toBe('Task Response');
  });

  it('provides descriptors for bands 9 down to 5', () => {
    for (const criteria of [writingCriteria(1), writingCriteria(2)]) {
      for (const criterion of criteria) {
        expect(criterion.descriptors.map((descriptor) => descriptor.band)).toEqual([9, 8, 7, 6, 5]);
      }
    }
  });
});

describe('speakingCriteria', () => {
  it('lists the four assessed criteria', () => {
    const criteria = speakingCriteria();
    expect(criteria.map((criterion) => criterion.criterion)).toEqual([
      'Fluency and Coherence',
      'Lexical Resource',
      'Grammatical Range and Accuracy',
      'Pronunciation'
    ]);
  });
});

describe('getWritingCriterion', () => {
  it('finds criteria with kebab-case and any casing', () => {
    expect(getWritingCriterion(2, 'task-response').criterion).toBe('Task Response');
    expect(getWritingCriterion(1, 'TASK-ACHIEVEMENT').criterion).toBe('Task Achievement');
    expect(getWritingCriterion(2, 'lexical-resource').descriptors).toHaveLength(5);
  });

  it('throws NotFoundError with the known criteria for unknown names', () => {
    try {
      getWritingCriterion(1, 'not-a-criterion');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundError);
      expect((error as NotFoundError).message).toContain('Task Achievement');
    }
  });
});

describe('getSpeakingCriterion', () => {
  it('finds criteria case-insensitively', () => {
    expect(getSpeakingCriterion('fluency-and-coherence').criterion).toBe('Fluency and Coherence');
    expect(getSpeakingCriterion('PRONUNCIATION').criterion).toBe('Pronunciation');
  });

  it('throws NotFoundError for unknown criteria', () => {
    expect(() => getSpeakingCriterion('charisma')).toThrow(NotFoundError);
  });
});
