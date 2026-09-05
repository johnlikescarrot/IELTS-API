import { describe, expect, it } from 'vitest';

import { allEntries } from '../../src/data/vocabulary.js';
import {
  ASSESS_BASELINE,
  ASSESS_MAX,
  ASSESS_MIN,
  ASSESSMENT_CRITERIA,
  ASSESSMENT_DISCLAIMER,
  ASSESSMENT_RULES,
  assessWriting,
  COMPLEX_STRENGTH,
  COMPLEX_WATCH,
  complexSentenceShare,
  countDistinctLinkers,
  SUBORDINATORS,
} from '../../src/lib/assess.js';

const GOOD_TASK2 = [
  'Universities charge high tuition fees, and many students now question whether a traditional university degree is still worth the cost.',
  'However, an apprenticeship or a trade school can offer employability without debt, because employers value practical experience over theory.',
  'Furthermore, if governments funded vocational training properly, young people who cannot afford tuition fees would still build strong careers.',
  'For example, Germany has invested in trade school places for decades; consequently, youth unemployment there stays low even during recessions.',
  'Although online courses help, whereas classroom teaching builds discipline, the deepest problem is financial: unless the digital divide closes, self-paced study will stay a privilege.',
  'In conclusion, while degrees keep their prestige, societies should treat every apprenticeship as equally valuable so that opportunity does not depend on wealth.',
].join('\n\n');

const SHORT_FLAT = 'Dogs run fast. Cats sleep a lot. Birds fly high. Fish swim deep.';

const VARIETY = [
  'Yes.',
  'The committee nevertheless published a remarkably thorough, detailed, and persuasive account of the circumstances which had compelled the ministry to postpone the long-promised reform of the national curriculum for a second consecutive year.',
  'It argued well.',
  'Nevertheless the ministry, which had already postponed the reform twice, published a further statement declaring that the committee account, while thorough, could not be implemented before the next election cycle because funding remained uncertain.',
].join('\n\n');

/** Two paragraphs of extremely repetitive text (type-token ratio 0.03). */
const REPETITIVE = Array.from({ length: 2 }, () => `apple banana `.repeat(20).trim()).join('\n\n');

/** Five sentences of exactly ten words: mean sentence length 10. */
const SHORT_SENTENCES = Array.from({ length: 5 }, (_, index) =>
  ['the', 'new', 'policy', 'helps', 'workers', 'in', 'every', 'region', `with`, `aid${index}`].join(' '),
).join('. ');

/** Two sentences of thirty-one words each: mean sentence length 31. */
const RUN_ON = Array.from({ length: 2 }, (_, index) =>
  [
    'the',
    'ministry',
    'published',
    'statement',
    `number${index}`,
    'explaining',
    'that',
    'committee',
    'account',
    'remained',
    'thorough',
    'could',
    'implemented',
    'before',
    'election',
    'cycle',
    'because',
    'funding',
    'uncertain',
    'ministry',
    'promised',
    'further',
    'review',
    'before',
    'spring',
    'although',
    'many',
    'members',
    'objected',
    'firmly',
  ].join(' '),
).join('. ');

/** 160 headword tokens: coverage 1.0, few multi-syllable words. */
const HEADWORD_TEXT = `${allEntries()
  .slice(0, 160)
  .map((entry) => entry.word)
  .join(' ')}.`;

const rules = (text: string, task: 'task1' | 'task2', criterion: string): string[] =>
  assessWriting(text, task)
    .criteria.find((row) => row.criterion === criterion)
    ?.rules.map((rule) => rule.rule) ?? [];

describe('the rule catalogue', () => {
  it('is complete, unique and internally consistent', () => {
    const ids = ASSESSMENT_RULES.map((rule) => rule.rule);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('task-length-below-minimum');
    expect(ids).toContain('task2-theme-match');
    expect(ids).toContain('cc-paragraphs-missing');
    expect(ids).toContain('lr-ttr-low');
    expect(ids).toContain('gra-complex-high');
    for (const rule of ASSESSMENT_RULES) {
      expect(rule.effect / 0.5).toBe(Math.round(rule.effect / 0.5));
      expect(rule.note.length).toBeGreaterThan(10);
    }
  });

  it('publishes its frame: baseline, clamp, criteria and disclaimer', () => {
    expect(ASSESS_BASELINE).toBe(6.5);
    expect(ASSESS_MIN).toBe(4);
    expect(ASSESS_MAX).toBe(8);
    expect(ASSESSMENT_CRITERIA).toEqual([
      'task-achievement',
      'task-response',
      'coherence-and-cohesion',
      'lexical-resource',
      'grammatical-range-and-accuracy',
    ]);
    expect(ASSESSMENT_DISCLAIMER).toContain('not an official score');
    expect(ASSESSMENT_DISCLAIMER).toContain('RESEARCH.md Part V');
  });

  it('publishes the subordination thresholds', () => {
    expect(COMPLEX_STRENGTH).toBe(0.3);
    expect(COMPLEX_WATCH).toBe(0.1);
    expect(SUBORDINATORS).toContain('although');
    expect(SUBORDINATORS).toContain('in order to');
  });
});

describe('countDistinctLinkers', () => {
  it('counts each marker once and handles multi-word markers', () => {
    expect(countDistinctLinkers('No markers at all here.')).toBe(0);
    expect(countDistinctLinkers('however however HOWEVER')).toBe(1);
    expect(countDistinctLinkers('However, in addition, for example, moreover.')).toBe(4);
    expect(countDistinctLinkers('In addition to that, moreover.')).toBe(2);
  });
});

describe('complexSentenceShare', () => {
  it('is zero for an empty sentence list', () => {
    expect(complexSentenceShare([])).toBe(0);
  });

  it('measures the share of sentences with a subordination marker', () => {
    expect(complexSentenceShare(['Dogs run.', 'Cats sleep.'])).toBe(0);
    expect(complexSentenceShare(['Dogs run because they can.', 'Cats sleep.'])).toBe(0.5);
    expect(
      complexSentenceShare([
        'Although dogs run, cats sleep.',
        'If fish swim, birds fly.',
        'Which bird sings?',
      ]),
    ).toBe(1);
  });
});

describe('assessWriting', () => {
  it('spells the task criterion per task and reports exactly four criteria', () => {
    const task1 = assessWriting(GOOD_TASK2, 'task1');
    const task2 = assessWriting(GOOD_TASK2, 'task2');
    expect(task1.criteria.map((row) => row.criterion)).toEqual([
      'task-achievement',
      'coherence-and-cohesion',
      'lexical-resource',
      'grammatical-range-and-accuracy',
    ]);
    expect(task2.criteria.map((row) => row.criterion)).toEqual([
      'task-response',
      'coherence-and-cohesion',
      'lexical-resource',
      'grammatical-range-and-accuracy',
    ]);
  });

  it('scores a fluent on-topic Task 2 essay near the baseline and names its rules', () => {
    const assessment = assessWriting(GOOD_TASK2, 'task2');
    expect(assessment.evidence.themeMatched).toBe('Higher education and vocational training');
    expect(assessment.evidence.meetsMinimum).toBe(false);
    expect(rules(GOOD_TASK2, 'task2', 'task-response')).toEqual([
      'task-length-below-minimum',
      'task2-theme-match',
    ]);
    expect(rules(GOOD_TASK2, 'task2', 'coherence-and-cohesion')).toContain('cc-paragraphs-clear');
    expect(rules(GOOD_TASK2, 'task2', 'lexical-resource')).toContain('lr-ttr-high');
    expect(rules(GOOD_TASK2, 'task2', 'grammatical-range-and-accuracy')).toContain('gra-complex-high');
    expect(assessment.overall.estimate).toBe(6.5);
    expect(assessment.overall.mean).toBe(6.38);
  });

  it('rounds a .75 mean up with the IELTS tie rule', () => {
    const assessment = assessWriting(VARIETY, 'task2');
    expect(assessment.overall.mean).toBe(6.75);
    expect(assessment.overall.estimate).toBe(7);
    expect(assessment.overall.explanation).toContain('rounds a .25/.75 mean up');
    expect(rules(VARIETY, 'task2', 'grammatical-range-and-accuracy')).toContain('gra-variety-high');
  });

  it('clamps a flat, short text at the published floor', () => {
    const assessment = assessWriting(SHORT_FLAT, 'task2');
    for (const criterion of assessment.criteria) {
      expect(criterion.estimate).toBeGreaterThanOrEqual(ASSESS_MIN);
      expect(criterion.baseline).toBe(ASSESS_BASELINE);
    }
    expect(assessment.criteria.find((row) => row.criterion === 'task-response')?.estimate).toBe(4);
    expect(assessment.criteria.find((row) => row.criterion === 'coherence-and-cohesion')?.estimate).toBe(4);
    expect(rules(SHORT_FLAT, 'task2', 'task-response')).toEqual([
      'task-length-below-minimum',
      'task-structure-thin',
    ]);
    expect(rules(SHORT_FLAT, 'task2', 'coherence-and-cohesion')).toEqual([
      'cc-paragraphs-missing',
      'cc-linkers-absent',
    ]);
    expect(rules(SHORT_FLAT, 'task2', 'lexical-resource')).toEqual(['lr-coverage-low']);
    expect(rules(SHORT_FLAT, 'task2', 'grammatical-range-and-accuracy')).toEqual([
      'gra-complex-low',
      'gra-sentence-length-choppy',
      'gra-variety-low',
    ]);
    expect(assessment.overall.estimate).toBe(4.5);
  });

  it('penalises heavy repetition through the type-token rule', () => {
    expect(rules(REPETITIVE, 'task2', 'lexical-resource')).toContain('lr-ttr-low');
    expect(rules(REPETITIVE, 'task2', 'coherence-and-cohesion')).toContain('cc-paragraphs-few');
  });

  it('rewards Cambridge headword coverage and penalises its absence at length', () => {
    const headwordRules = rules(HEADWORD_TEXT, 'task2', 'lexical-resource');
    expect(headwordRules).toContain('lr-coverage-high');
    expect(headwordRules).toContain('lr-longword-high');
    const monosyllabic = `${'the and but she he it was for on with at by from us '.repeat(11)}sat. yes. run.`;
    expect(rules(monosyllabic, 'task2', 'lexical-resource')).toContain('lr-longword-low');
    expect(rules(SHORT_FLAT, 'task2', 'lexical-resource')).toContain('lr-coverage-low');
  });

  it('fires both sentence-length grammar rules at their thresholds', () => {
    expect(rules(SHORT_SENTENCES, 'task2', 'grammatical-range-and-accuracy')).toContain(
      'gra-sentence-length-short',
    );
    expect(rules(RUN_ON, 'task2', 'grammatical-range-and-accuracy')).toContain('gra-sentence-length-runs');
  });

  it('penalises one-marker cohesion at length', () => {
    const oneMarker = `${'word value '.repeat(75)}However. However.`;
    const cohesion = rules(oneMarker, 'task2', 'coherence-and-cohesion');
    expect(cohesion).toContain('cc-linkers-natural');
    expect(cohesion).toContain('cc-linker-variety-low');
    expect(cohesion).not.toContain('cc-linkers-overused');
  });

  it('resolves the Task 1 overview in both directions', () => {
    const missing = assessWriting('The chart shows exports rising in every region.', 'task1');
    expect(rules('The chart shows exports rising in every region.', 'task1', 'task-achievement')).toContain(
      'task1-overview-missing',
    );
    expect(missing.evidence.overviewMarker).toBe(false);

    const present = assessWriting(
      'Overall, exports rose everywhere. The chart shows exports rising steadily.',
      'task1',
    );
    expect(
      rules(
        'Overall, exports rose everywhere. The chart shows exports rising steadily.',
        'task1',
        'task-achievement',
      ),
    ).toContain('task1-overview-present');
    expect(present.evidence.overviewMarker).toBe(true);
    expect(missing.evidence.themeMatched).toBeNull();
  });

  it('never judges the task themes for Task 1 samples', () => {
    const assessment = assessWriting(GOOD_TASK2, 'task1');
    expect(assessment.evidence.themeMatched).toBeNull();
    expect(rules(GOOD_TASK2, 'task1', 'task-achievement')).not.toContain('task2-theme-match');
  });

  it('records the corpus placement of the sample', () => {
    const assessment = assessWriting(GOOD_TASK2, 'task2');
    expect(assessment.corpusContext.group).toBe('B1-B2');
    expect(assessment.evidence.fleschReadingEase).toBeTypeOf('number');
  });

  it('is deterministic: identical text produces identical output', () => {
    expect(JSON.stringify(assessWriting(GOOD_TASK2, 'task2'))).toBe(
      JSON.stringify(assessWriting(GOOD_TASK2, 'task2')),
    );
  });

  it('names every observation with the numbers that triggered it', () => {
    const assessment = assessWriting(GOOD_TASK2, 'task2');
    for (const criterion of assessment.criteria) {
      for (const rule of criterion.rules) {
        expect(rule.observation.length).toBeGreaterThan(0);
        expect(rule.note).toContain(' ');
      }
    }
  });
});
