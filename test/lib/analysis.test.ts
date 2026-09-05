import { describe, expect, it } from 'vitest';

import {
  TASK_REQUIREMENTS,
  WRITING_TASKS,
  analyzeCohesion,
  analyzeReadability,
  analyzeVocabulary,
  analyzeWriting,
  clearHeadwordIndex,
  compareWithCorpus,
  sentenceLengthVariation,
} from '../../src/lib/analysis.js';

const PASSAGE = [
  'Urban transport policy has changed considerably over the last decade.',
  'Many cities have restricted private vehicles in their historic centres.',
  'However, critics argue that such restrictions harm small businesses.',
].join(' ');

describe('analyzeReadability', () => {
  it('returns null when there is nothing to measure', () => {
    expect(analyzeReadability('12345')).toBeNull();
  });

  it('measures a passage and compares it with the indexed corpus', () => {
    const analysis = analyzeReadability(PASSAGE);
    expect(analysis).not.toBeNull();
    const result = analysis as NonNullable<typeof analysis>;
    expect(result.measurement.words).toBeGreaterThan(20);
    expect(result.difficulty).toBeTypeOf('string');
    expect(result.cefr).toMatch(/^[ABC]/);
    expect(result.corpus.length).toBeGreaterThan(0);
    for (const row of result.corpus) {
      expect(row.differenceFromGroupMean).toBeCloseTo(
        result.measurement.fleschReadingEase - row.groupMeanReadingEase,
        1,
      );
    }
    expect(result.caveats).toHaveLength(2);
  });

  it('warns when the sample is too short for the formulae', () => {
    const analysis = analyzeReadability('Short text.') as NonNullable<ReturnType<typeof analyzeReadability>>;
    expect(analysis.measurement.reliable).toBe(false);
    expect(analysis.caveats[0]).toContain('shorter than 20 words');
  });
});

describe('compareWithCorpus', () => {
  it('skips groups with no measured passages', () => {
    expect(
      compareWithCorpus(50, {
        measured: { fleschReadingEase: { count: 2, mean: 40, median: 40, min: 30, max: 50 } },
        empty: { fleschReadingEase: null },
      }),
    ).toEqual([{ group: 'measured', groupMeanReadingEase: 40, differenceFromGroupMean: 10 }]);
  });
});

describe('analyzeVocabulary', () => {
  it('returns null when there is nothing to profile', () => {
    expect(analyzeVocabulary('!!! 123', 10)).toBeNull();
  });

  it('profiles a text against the Cambridge headword list', () => {
    clearHeadwordIndex();
    const profile = analyzeVocabulary(
      'The environment is fragile. The environment needs protection and sustainable management.',
      10,
    ) as NonNullable<ReturnType<typeof analyzeVocabulary>>;
    expect(profile.tokens).toBeGreaterThan(profile.types);
    expect(profile.lexicalDensity).toBeGreaterThan(0);
    expect(profile.lexicalDensity).toBeLessThanOrEqual(1);
    expect(profile.contentTypeTokenRatio).toBeGreaterThan(0);
    expect(profile.hapaxRatio).toBeGreaterThan(0);
    expect(profile.sophistication).toBeGreaterThan(0);
    expect(profile.cambridgeMatches).toBeGreaterThan(0);
    expect(profile.cambridgeMatches + profile.offList.length).toBeLessThanOrEqual(profile.types + 10);
    const environment = profile.matched.find((hit) => hit.word === 'environment');
    expect(environment?.count).toBe(2);
    expect(environment?.volumes.length).toBeGreaterThan(0);
    expect(profile.caveats).toHaveLength(2);
  });

  it('reuses the memoised headword index', () => {
    const first = analyzeVocabulary('sustainable development', 5);
    const second = analyzeVocabulary('sustainable development', 5);
    expect(second).toEqual(first);
  });

  it('honours the sample size', () => {
    const profile = analyzeVocabulary(PASSAGE, 2) as NonNullable<ReturnType<typeof analyzeVocabulary>>;
    expect(profile.matched.length).toBeLessThanOrEqual(2);
    expect(profile.offList.length).toBeLessThanOrEqual(2);
  });

  it('reports zero content diversity when every token is a function word', () => {
    const profile = analyzeVocabulary('the the of and', 5) as NonNullable<
      ReturnType<typeof analyzeVocabulary>
    >;
    expect(profile.contentTokens).toBe(0);
    expect(profile.contentTypeTokenRatio).toBe(0);
  });
});

describe('analyzeCohesion', () => {
  it('classifies devices by relation and register', () => {
    const analysis = analyzeCohesion(
      'Firstly, costs rose. However, demand grew. Furthermore, exports increased. In conclusion, the policy worked.',
      16,
    );
    expect(analysis.total).toBeGreaterThanOrEqual(4);
    expect(analysis.distinct).toBeGreaterThanOrEqual(4);
    expect(analysis.byRegister.academic).toBeGreaterThan(0);
    expect(analysis.byRegister.basic).toBeGreaterThan(0);
    expect(analysis.relationsUsed).toBeGreaterThanOrEqual(3);
    expect(analysis.perHundredWords).toBeGreaterThan(0);
    expect(analysis.missingRelations.length).toBeLessThan(11);
  });

  it('prefers the longest device and never double-counts its parts', () => {
    const analysis = analyzeCohesion('In addition to this, prices fell.', 6);
    const phrases = analysis.devices.map((device) => device.phrase);
    expect(phrases).toContain('in addition to this');
    expect(phrases).not.toContain('in addition');
    expect(analysis.total).toBe(1);
  });

  it('does not match devices inside longer words', () => {
    expect(analyzeCohesion('Android soap installation', 3).total).toBe(0);
  });

  it('flags over-repeated devices', () => {
    const analysis = analyzeCohesion('However, a. However, b. However, c. However, d.', 12);
    expect(analysis.overused).toContain('however');
  });

  it('returns an empty profile for text with no devices', () => {
    const analysis = analyzeCohesion('Rain fell.', 2);
    expect(analysis.total).toBe(0);
    expect(analysis.devices).toEqual([]);
    expect(analysis.missingRelations).toHaveLength(11);
  });

  it('avoids dividing by a zero word count', () => {
    expect(analyzeCohesion('however', 0).perHundredWords).toBe(0);
  });
});

describe('sentenceLengthVariation', () => {
  it('is zero for uniform sentences', () => {
    expect(sentenceLengthVariation('One two three. Four five six.')).toBe(0);
  });

  it('is positive for varied sentences', () => {
    expect(
      sentenceLengthVariation('Short. A considerably longer sentence appears right here now.'),
    ).toBeGreaterThan(0);
  });

  it('is zero when there are no words', () => {
    expect(sentenceLengthVariation('!!!')).toBe(0);
  });
});

describe('analyzeWriting', () => {
  const response = [
    'Some people believe that governments should fund public transport rather than new roads.',
    'I strongly agree with this view, for two reasons which I will explain below.',
    '',
    'Firstly, public transport moves far more people for each unit of road space.',
    'Consequently, congestion falls and journey times become more predictable for everyone.',
    'For example, cities that invested in light rail report measurably shorter commutes.',
    '',
    'Secondly, buses and trains produce fewer emissions for each passenger kilometre travelled.',
    'Although building new roads may relieve pressure briefly, induced demand refills them.',
    'In conclusion, sustained investment in public transport is the more responsible policy.',
  ].join('\n');

  it('returns null when there is nothing to analyse', () => {
    expect(analyzeWriting('123', 'task-2', 5)).toBeNull();
  });

  it('reports task requirements and descriptor-aligned observations', () => {
    const analysis = analyzeWriting(response, 'task-2', 10) as NonNullable<ReturnType<typeof analyzeWriting>>;
    expect(analysis.task).toBe('task-2');
    expect(analysis.minimumWords).toBe(250);
    expect(analysis.meetsMinimumLength).toBe(false);
    expect(analysis.wordsShortOfMinimum).toBe(250 - analysis.measurement.words);
    expect(analysis.wordsPerExamMinute).toBeGreaterThan(0);
    expect(analysis.measurement.paragraphs).toBe(3);
    expect(analysis.cohesion.total).toBeGreaterThan(0);
    expect(analysis.observations.length).toBeGreaterThanOrEqual(6);
    expect(analysis.caveats).toHaveLength(3);
    expect(JSON.stringify(analysis)).not.toContain('"band"');
  });

  it('reports a positive length observation when the minimum is met', () => {
    const long = `${response} ${'The evidence is compelling and consistent. '.repeat(40)}`;
    const analysis = analyzeWriting(long, 'task-1', 5) as NonNullable<ReturnType<typeof analyzeWriting>>;
    expect(analysis.meetsMinimumLength).toBe(true);
    expect(analysis.wordsShortOfMinimum).toBe(0);
    const length = analysis.observations.find((row) => row.criterion === 'taskResponse');
    expect(length?.polarity).toBe('positive');
  });

  it('criticises a single-paragraph, linker-heavy response', () => {
    const analysis = analyzeWriting(
      'However, a. However, b. However, c. However, d. However, e.',
      'task-2',
      5,
    ) as NonNullable<ReturnType<typeof analyzeWriting>>;
    const cohesion = analysis.observations.filter((row) => row.criterion === 'coherenceAndCohesion');
    expect(cohesion.some((row) => row.message.includes('paragraph'))).toBe(true);
    expect(cohesion.some((row) => row.message.includes('four or more times'))).toBe(true);
  });

  it('reports a neutral note when few relations are signalled', () => {
    const analysis = analyzeWriting(
      'Costs rose sharply.\n\nDemand also grew.\n\nProduction expanded steadily across the region.',
      'task-2',
      5,
    ) as NonNullable<ReturnType<typeof analyzeWriting>>;
    const cohesion = analysis.observations.filter((row) => row.criterion === 'coherenceAndCohesion');
    expect(cohesion.some((row) => row.polarity === 'neutral')).toBe(true);
  });

  it('rewards a wide, non-repetitive range of relations', () => {
    const varied = [
      'Firstly, costs rose steadily across the whole region during the recorded period.',
      '',
      'Furthermore, demand grew. For example, exports doubled. Similarly, imports climbed.',
      '',
      'Although margins narrowed, consequently profits held up. In conclusion, the sector adapted.',
    ].join('\n');
    const analysis = analyzeWriting(varied, 'task-1', 5) as NonNullable<ReturnType<typeof analyzeWriting>>;
    const cohesion = analysis.observations.filter((row) => row.criterion === 'coherenceAndCohesion');
    expect(cohesion.some((row) => row.polarity === 'positive' && row.message.includes('relations'))).toBe(
      true,
    );
  });

  it('reports positive lexis and grammar observations for a dense, varied response', () => {
    const dense = [
      'Sustainable urban transport policy demands sustained, coordinated municipal investment.',
      'Congestion charging redistributes scarce roadspace toward buses, cyclists, pedestrians.',
      'Short.',
      'Measurable environmental improvements followed comparable interventions elsewhere internationally, according to independent longitudinal transport research published recently.',
    ].join(' ');
    const analysis = analyzeWriting(dense, 'task-1', 5) as NonNullable<ReturnType<typeof analyzeWriting>>;
    expect(analysis.lexis.lexicalDensity).toBeGreaterThanOrEqual(0.5);
    expect(analysis.sentenceLengthVariation).toBeGreaterThanOrEqual(5);
    const lexical = analysis.observations.filter((row) => row.criterion === 'lexicalResource');
    expect(lexical.every((row) => row.polarity === 'positive')).toBe(true);
    const grammar = analysis.observations.find((row) => row.criterion === 'grammaticalRangeAndAccuracy');
    expect(grammar?.polarity).toBe('positive');
  });

  it('reports neutral lexis and grammar observations for a thin, uniform response', () => {
    const thin = 'It is on the of a. It is on the of a. It is on the of a. It is on the of a.';
    const analysis = analyzeWriting(thin, 'task-1', 5) as NonNullable<ReturnType<typeof analyzeWriting>>;
    expect(analysis.lexis.lexicalDensity).toBeLessThan(0.5);
    expect(analysis.lexis.cambridgeCoverage).toBeLessThan(0.05);
    expect(analysis.sentenceLengthVariation).toBeLessThan(5);
    const neutral = analysis.observations.filter(
      (row) =>
        row.polarity === 'neutral' &&
        (row.criterion === 'lexicalResource' || row.criterion === 'grammaticalRangeAndAccuracy'),
    );
    expect(neutral).toHaveLength(3);
  });

  it('publishes a requirement for every task', () => {
    for (const task of WRITING_TASKS) {
      expect(TASK_REQUIREMENTS[task].minimumWords).toBeGreaterThan(0);
      expect(TASK_REQUIREMENTS[task].minutes).toBeGreaterThan(0);
    }
  });
});
