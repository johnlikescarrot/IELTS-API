import { describe, expect, it } from 'vitest';

import {
  analyseEssay,
  analyseReadability,
  COVERAGE_STRENGTH,
  COVERAGE_WATCH,
  countLinkers,
  essayHints,
  headwordCoverage,
  LINKERS,
  LINKER_OVERUSE,
  matchThemes,
  nearestCorpusGroup,
  readingEaseLabel,
  TASK_MINIMUM_WORDS,
  TTR_MIN_TOKENS,
  TTR_STRENGTH,
  TTR_WATCH,
} from '../../src/lib/analysis.js';
import { sentencesOf, wordsOf } from '../../src/lib/textstats.js';

import type { HintMetrics } from '../../src/lib/analysis.js';

describe('readingEaseLabel', () => {
  it('labels every band of the Flesch scale', () => {
    expect(readingEaseLabel(95).label).toBe('very easy');
    expect(readingEaseLabel(85).label).toBe('easy');
    expect(readingEaseLabel(75).label).toBe('fairly easy');
    expect(readingEaseLabel(65).label).toBe('plain English');
    expect(readingEaseLabel(55).label).toBe('fairly difficult');
    expect(readingEaseLabel(35).label).toBe('difficult');
    expect(readingEaseLabel(5).label).toBe('very confusing');
    expect(readingEaseLabel(-20).label).toBe('very confusing');
  });

  it('returns a description alongside the label', () => {
    expect(readingEaseLabel(65).description).toContain('Plain English');
  });
});

describe('nearestCorpusGroup', () => {
  it('matches easy text to the A1-A2 graded lessons', () => {
    const context = nearestCorpusGroup(70);
    expect(context.group).toBe('A1-A2');
    expect(context.meanReadingEase).toBe(70.18);
    expect(context.distance).toBe(0.18);
    expect(context.meanGrade).toBe(5.83);
  });

  it('matches mid-range text to the full reading tests', () => {
    expect(nearestCorpusGroup(43).group).toBe('reading-full-test');
  });

  it('matches hard text to the C1-C2 graded lessons', () => {
    expect(nearestCorpusGroup(5).group).toBe('C1-C2');
  });

  it('matches upper-intermediate text to the B1-B2 graded lessons', () => {
    expect(nearestCorpusGroup(26).group).toBe('B1-B2');
  });
});

describe('analyseReadability', () => {
  it('reproduces hand-computed statistics', () => {
    const report = analyseReadability('Dogs run fast. Cats sleep a lot.');
    expect(report.profile.characters).toBe('Dogs run fast. Cats sleep a lot.'.length);
    expect(report.profile.words).toBe(7);
    expect(report.profile.sentences).toBe(2);
    expect(report.profile.paragraphs).toBe(1);
    expect(report.profile.avgWordsPerSentence).toBe(3.5);
    expect(report.fleschReadingEase).toBe(118.68);
    expect(report.fleschKincaidGrade).toBe(-2.42);
    expect(report.level.label).toBe('very easy');
    expect(report.corpusContext.group).toBe('A1-A2');
  });

  it('labels academic prose as difficult', () => {
    const report = analyseReadability(
      'Researchers documented unprecedented environmental deterioration across industrialized civilizations.',
    );
    expect(report.fleschReadingEase).toBeLessThan(0);
    expect(report.level.label).toBe('very confusing');
  });
});

describe('countLinkers', () => {
  it('counts single- and multi-word markers once each', () => {
    expect(countLinkers('However, this essay will argue. For example, X. Moreover, Y.')).toBe(3);
  });

  it('matches markers split across line breaks', () => {
    expect(countLinkers('in\naddition')).toBe(1);
  });

  it('does not count markers inside longer words', () => {
    expect(countLinkers('nonetheless')).toBe(0);
    expect(countLinkers('nevertheless')).toBe(1);
  });

  it('counts repeated markers', () => {
    expect(countLinkers('however however however')).toBe(3);
  });

  it('exposes the marker list it counts', () => {
    expect(LINKERS).toContain('however');
    expect(LINKERS.length).toBeGreaterThanOrEqual(10);
  });
});

describe('headwordCoverage', () => {
  it('counts tokens found in the Cambridge headword list', () => {
    const { headwordTokens, coverage } = headwordCoverage(['environment', 'zzzqqq', 'economy']);
    expect(headwordTokens).toBe(2);
    expect(coverage).toBe(0.67);
  });

  it('strips possessives before comparison', () => {
    expect(headwordCoverage(["government's"]).headwordTokens).toBe(1);
  });

  it('counts hyphenated tokens when either half is a headword', () => {
    expect(headwordCoverage(['economy-wide']).headwordTokens).toBe(1);
    expect(headwordCoverage(['zzzqqq-wide']).headwordTokens).toBe(0);
  });
});

describe('matchThemes', () => {
  const text = 'The carbon footprint of cities keeps growing. Greenhouse gas emissions rise every year.';

  it('ranks the climate theme first with its matched keywords', () => {
    const themes = matchThemes(text, 5);
    expect(themes[0]?.group).toBe('environment');
    expect(themes[0]?.matchedKeywords).toEqual(['greenhouse gas', 'carbon footprint']);
    expect(themes[0]?.occurrences).toBe(2);
  });

  it('respects the limit', () => {
    expect(matchThemes(text, 1)).toHaveLength(1);
  });

  it('returns nothing when no keyword matches', () => {
    expect(matchThemes('Completely unrelated text about xylophones.', 5)).toEqual([]);
  });

  it('breaks ranking ties by occurrences and then dataset order', () => {
    const ranked = matchThemes('carbon footprint microplastic carbon footprint', 5);
    expect(ranked[0]?.matchedKeywords).toEqual(['carbon footprint']);
    expect(ranked[0]?.occurrences).toBe(2);
    expect(ranked[1]?.matchedKeywords).toEqual(['microplastic']);
    expect(ranked[1]?.occurrences).toBe(1);

    const tied = matchThemes('carbon footprint microplastic', 5);
    expect(tied.map((theme) => theme.matchedKeywords[0])).toEqual(['carbon footprint', 'microplastic']);
  });
});

/** Baseline metrics that trigger no lexical warning and every strength rule. */
function metrics(overrides: Partial<HintMetrics> = {}): HintMetrics {
  return {
    task: 'task2',
    words: 300,
    minimumWords: 250,
    sentences: 12,
    paragraphs: 4,
    avgWordsPerSentence: 25,
    sentenceLengthStdDev: 5,
    typeTokenRatio: 0.5,
    headwordCoverage: 0.2,
    linkersPer100Words: 1.5,
    ...overrides,
  };
}

describe('essayHints', () => {
  it('reports four strengths for a well-formed sample in the neutral middle bands', () => {
    const hints = essayHints(metrics());
    expect(hints).toHaveLength(4);
    expect(hints.every((hint) => hint.level === 'strength')).toBe(true);
    expect(hints.map((hint) => hint.criterion)).toEqual([
      'task-response',
      'coherence-and-cohesion',
      'coherence-and-cohesion',
      'grammatical-range-and-accuracy',
    ]);
  });

  it('fires every watch rule for a weak sample, sorted watch-first', () => {
    const hints = essayHints(
      metrics({
        words: 100,
        minimumWords: 250,
        paragraphs: 1,
        linkersPer100Words: 0,
        typeTokenRatio: 0.3,
        headwordCoverage: 0.05,
        avgWordsPerSentence: 9,
        sentenceLengthStdDev: 1.2,
        sentences: 8,
      }),
    );
    expect(hints).toHaveLength(7);
    expect(hints.every((hint) => hint.level === 'watch')).toBe(true);
    expect(hints[0]?.message).toContain('under the 250-word minimum');
    expect(hints[1]?.message).toContain('No paragraph breaks');
    expect(hints[2]?.message).toContain('No discourse markers');
    expect(hints[3]?.message).toContain('Type-token ratio of 0.3');
    expect(hints[4]?.message).toContain('Only 5% of words');
    expect(hints[5]?.message).toContain('average 9 words');
    expect(hints[6]?.message).toContain('vary by only 1.2 words');
  });

  it('warns about formulaic signposting above the over-use threshold', () => {
    const hints = essayHints(metrics({ linkersPer100Words: 4 }));
    const linker = hints.find((hint) => hint.message.includes('formulaic'));
    expect(linker?.level).toBe('watch');
  });

  it('praises wide lexical range above the diversity threshold', () => {
    const hints = essayHints(metrics({ typeTokenRatio: 0.6 }));
    const diversity = hints.find((hint) => hint.message.includes('wide vocabulary range'));
    expect(diversity?.level).toBe('strength');
    expect(diversity?.criterion).toBe('lexical-resource');
  });

  it('praises strong headword coverage above the coverage threshold', () => {
    const hints = essayHints(metrics({ headwordCoverage: 0.35 }));
    const coverage = hints.find((hint) => hint.message.includes('Cambridge IELTS headwords'));
    expect(coverage?.level).toBe('strength');
  });

  it('warns about run-on tendencies above the sentence-length ceiling', () => {
    const hints = essayHints(metrics({ avgWordsPerSentence: 35 }));
    const runOn = hints.find((hint) => hint.message.includes('run-ons'));
    expect(runOn?.level).toBe('watch');
  });

  it('praises sentence-length variety above the spread threshold', () => {
    const hints = essayHints(metrics({ sentenceLengthStdDev: 9.5 }));
    const variety = hints.find((hint) => hint.message.includes('complex structures'));
    expect(variety?.level).toBe('strength');
  });

  it('skips the diversity rule for samples below the minimum token count', () => {
    const hints = essayHints(metrics({ words: 40, typeTokenRatio: 0.1 }));
    expect(hints.filter((hint) => hint.criterion === 'lexical-resource')).toHaveLength(0);
  });

  it('skips the variety rule for samples with fewer than four sentences', () => {
    const hints = essayHints(metrics({ sentences: 3, sentenceLengthStdDev: 0.5 }));
    const grammar = hints.filter((hint) => hint.criterion === 'grammatical-range-and-accuracy');
    expect(grammar).toHaveLength(1);
    expect(grammar[0]?.message).toContain('controlled academic range');
  });
});

describe('thresholds and task minima', () => {
  it('publishes the constants the hints are built on', () => {
    expect(TASK_MINIMUM_WORDS.task1).toBe(150);
    expect(TASK_MINIMUM_WORDS.task2).toBe(250);
    expect(TTR_STRENGTH).toBe(0.55);
    expect(TTR_WATCH).toBe(0.42);
    expect(TTR_MIN_TOKENS).toBe(60);
    expect(COVERAGE_STRENGTH).toBe(0.3);
    expect(COVERAGE_WATCH).toBe(0.12);
    expect(LINKER_OVERUSE).toBe(3);
  });
});

describe('analyseEssay', () => {
  const text = [
    'Governments should invest in public transport. For example, cities with good networks cut their carbon footprint quickly.',
    '',
    'Moreover, greenhouse gas emissions fall when commuters switch to trains. In conclusion, extreme weather events become less damaging.',
  ].join('\n');

  it('profiles length, lexical range and sentences together', () => {
    const profile = analyseEssay(text, 'task2', 5);
    expect(profile.task).toBe('task2');
    expect(profile.length.words).toBe(wordsOf(text).length);
    expect(profile.length.sentences).toBe(sentencesOf(text).length);
    expect(profile.length.paragraphs).toBe(2);
    expect(profile.length.minimumWords).toBe(250);
    expect(profile.length.meetsMinimum).toBe(false);
    expect(profile.lexical.tokens).toBe(profile.length.words);
    expect(profile.lexical.rootTtr).toBeGreaterThan(0);
    expect(profile.sentences.shortest).toBeGreaterThan(0);
    expect(profile.sentences.longest).toBeGreaterThanOrEqual(profile.sentences.shortest);
    expect(profile.strengths + profile.watches).toBe(profile.hints.length);
    expect(profile.watches).toBeGreaterThan(0);
  });

  it('detects the climate theme through its keyword set', () => {
    const profile = analyseEssay(text, 'task2', 5);
    const climate = profile.themes.find((theme) => theme.group === 'environment');
    expect(climate?.matchedKeywords).toContain('carbon footprint');
  });

  it('applies the task-1 minimum when task1 is requested', () => {
    const profile = analyseEssay(text, 'task1', 5);
    expect(profile.length.minimumWords).toBe(150);
    expect(profile.length.meetsMinimum).toBe(false);
    expect(profile.task).toBe('task1');
  });

  it('respects the theme limit', () => {
    expect(analyseEssay(text, 'task2', 1).themes).toHaveLength(1);
  });
});
