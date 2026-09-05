import { describe, expect, it } from 'vitest';

import {
  assessEssay,
  COHESIVE_DEVICES,
  countCohesiveDevices,
  DISCLAIMER,
  MINIMUM_WORDS,
  splitParagraphs,
  standardDeviation,
  SUGGESTED_MINUTES,
} from '../../src/lib/essay.js';

import type { EssayCheck, WritingTask } from '../../src/lib/essay.js';

const HEADWORDS: ReadonlySet<string> = new Set(['environment', 'sustainable', 'policy']);

/** Look one check up by id. */
function check(checks: readonly EssayCheck[], id: string): EssayCheck {
  const found = checks.find((entry) => entry.id === id);
  if (found === undefined) {
    throw new Error(`missing check: ${id}`);
  }
  return found;
}

/** Build a response of roughly `count` words spread over `paragraphs`. */
function essay(count: number, paragraphs = 4): string {
  const sentences = [
    'Urban infrastructure investment shapes regional economic development across many decades.',
    'Critics argue that spending crowds out education budgets in poorer districts.',
    'Cities that prioritised transport reported measurable gains in employment participation.',
    'Careful evaluation should therefore precede any large commitment of public money.',
  ];
  const words: string[] = [];
  let index = 0;
  while (words.length < count) {
    words.push(sentences[index % sentences.length] as string);
    index += 1;
  }
  const perParagraph = Math.ceil(words.length / paragraphs);
  const blocks: string[] = [];
  for (let start = 0; start < words.length; start += perParagraph) {
    blocks.push(words.slice(start, start + perParagraph).join(' '));
  }
  return blocks.join('\n\n');
}

describe('constants', () => {
  it('publishes the IELTS minimum word counts', () => {
    expect(MINIMUM_WORDS).toEqual({ 'task-1': 150, 'task-2': 250 });
    expect(SUGGESTED_MINUTES).toEqual({ 'task-1': 20, 'task-2': 40 });
  });

  it('groups cohesive devices by discourse function', () => {
    expect(Object.keys(COHESIVE_DEVICES)).toContain('contrast');
    expect(COHESIVE_DEVICES['contrast']).toContain('however');
  });
});

describe('splitParagraphs', () => {
  it('splits on blank lines and drops empties', () => {
    expect(splitParagraphs('a\n\n b \n\n\n\nc')).toEqual(['a', 'b', 'c']);
  });

  it('returns one paragraph when there is no blank line', () => {
    expect(splitParagraphs('a\nb')).toEqual(['a\nb']);
  });

  it('returns an empty list for blank input', () => {
    expect(splitParagraphs('   ')).toEqual([]);
  });
});

describe('standardDeviation', () => {
  it('is 0 for fewer than two values', () => {
    expect(standardDeviation([])).toBe(0);
    expect(standardDeviation([5])).toBe(0);
  });

  it('is 0 for identical values', () => {
    expect(standardDeviation([4, 4, 4])).toBe(0);
  });

  it('computes the population standard deviation', () => {
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 10);
  });
});

describe('countCohesiveDevices', () => {
  it('counts multi-word devices as one', () => {
    const result = countCohesiveDevices('On the other hand, costs rose.');
    expect(result.byFunction['contrast']).toBe(1);
    expect(result.total).toBe(1);
  });

  it('is case-insensitive', () => {
    expect(countCohesiveDevices('HOWEVER, it failed.').total).toBe(1);
  });

  it('does not match inside longer words', () => {
    expect(countCohesiveDevices('thusly althoughness').total).toBe(0);
  });

  it('reports zero for every function when none are present', () => {
    const result = countCohesiveDevices('The cat sat.');
    expect(result.total).toBe(0);
    expect(Object.values(result.byFunction).every((count) => count === 0)).toBe(true);
  });
});

describe('assessEssay', () => {
  it('fails an under-length response and says how much is missing', () => {
    const report = assessEssay('Too short.', 'task-2', HEADWORDS);
    expect(check(report.checks, 'word-count').status).toBe('fail');
    expect(check(report.checks, 'word-count').detail).toContain('short of the minimum');
    expect(report.suggestions[0]).toContain('more words');
  });

  it('passes a response over the minimum', () => {
    const report = assessEssay(essay(260), 'task-2', HEADWORDS);
    expect(report.words).toBeGreaterThanOrEqual(250);
    expect(check(report.checks, 'word-count').status).toBe('pass');
  });

  it('applies the Task 1 minimum when asked', () => {
    const report = assessEssay(essay(160), 'task-1', HEADWORDS);
    expect(report.minimumWords).toBe(150);
    expect(report.suggestedMinutes).toBe(20);
    expect(check(report.checks, 'word-count').status).toBe('pass');
  });

  it('fails paragraphing for a single block and warns for too few', () => {
    const single = assessEssay(essay(260, 1), 'task-2', HEADWORDS);
    expect(check(single.checks, 'paragraphing').status).toBe('fail');
    const few = assessEssay(essay(260, 3), 'task-2', HEADWORDS);
    expect(check(few.checks, 'paragraphing').status).toBe('warning');
    const enough = assessEssay(essay(260, 4), 'task-2', HEADWORDS);
    expect(check(enough.checks, 'paragraphing').status).toBe('pass');
  });

  it('pluralises the paragraph count correctly', () => {
    expect(
      check(assessEssay('One block only.', 'task-2', HEADWORDS).checks, 'paragraphing').detail,
    ).toContain('1 paragraph ');
  });

  it('warns about run-on sentences', () => {
    const long = `${Array.from({ length: 40 }, () => 'sustainable').join(' ')} policy.`;
    expect(check(assessEssay(long, 'task-2', HEADWORDS).checks, 'sentence-length').status).toBe('warning');
  });

  it('warns about very short sentences in a long-enough response', () => {
    const short = `${Array.from({ length: 60 }, () => 'Cats run fast here.').join(' ')}`;
    const report = assessEssay(short, 'task-1', HEADWORDS);
    expect(report.words).toBeGreaterThanOrEqual(150);
    expect(check(report.checks, 'sentence-length').status).toBe('warning');
  });

  it('warns when sentence length barely varies', () => {
    const uniform = Array.from({ length: 8 }, () => 'Alpha beta gamma delta epsilon.').join(' ');
    expect(check(assessEssay(uniform, 'task-2', HEADWORDS).checks, 'sentence-variety').status).toBe(
      'warning',
    );
  });

  it('passes sentence variety when lengths differ', () => {
    const varied =
      'Short. A somewhat longer sentence follows here now. Tiny. An extended sentence with many additional words appears at the end of this paragraph.';
    expect(check(assessEssay(varied, 'task-2', HEADWORDS).checks, 'sentence-variety').status).toBe('pass');
  });

  it('fails when there are no cohesive devices', () => {
    const report = assessEssay('The cat sat. The dog ran.', 'task-2', HEADWORDS);
    expect(check(report.checks, 'cohesive-devices').status).toBe('fail');
  });

  it('warns when cohesive devices are overused in a long response', () => {
    const dense = Array.from(
      { length: 30 },
      () => 'However, therefore, furthermore, for example, in conclusion, results varied.',
    ).join(' ');
    const report = assessEssay(dense, 'task-2', HEADWORDS);
    expect(report.words).toBeGreaterThanOrEqual(100);
    expect(check(report.checks, 'cohesive-devices').status).toBe('warning');
  });

  it('does not flag device density in a short response', () => {
    const report = assessEssay('However, costs rose. Therefore, plans changed.', 'task-2', HEADWORDS);
    expect(check(report.checks, 'cohesive-devices').status).toBe('pass');
  });

  it('warns when one content word dominates', () => {
    const repetitive = `${Array.from({ length: 20 }, () => 'policy').join(' ')} however the rest differs greatly here now.`;
    const report = assessEssay(repetitive, 'task-2', HEADWORDS);
    expect(check(report.checks, 'lexical-repetition').status).toBe('warning');
    expect(report.suggestions.some((line) => line.includes('Paraphrase'))).toBe(true);
  });

  it('handles a response whose sentences contain no words', () => {
    const report = assessEssay('12. 345. 6789.', 'task-2', HEADWORDS);
    expect(report.words).toBe(0);
    expect(report.sentenceLengthVariation).toBe(0);
    expect(report.cohesiveDeviceCount).toBe(0);
    expect(check(report.checks, 'cohesive-devices').status).toBe('fail');
  });

  it('reports no repeated content words when there are none', () => {
    const report = assessEssay('The and to of. It is the same.', 'task-2', HEADWORDS);
    expect(check(report.checks, 'lexical-repetition').detail).toBe('No repeated content words.');
  });

  it('warns about low diversity only once the response is long enough', () => {
    const dull = `${Array.from({ length: 120 }, () => 'the policy however').join(' ')}.`;
    const report = assessEssay(dull, 'task-2', HEADWORDS);
    expect(report.words).toBeGreaterThanOrEqual(100);
    expect(check(report.checks, 'lexical-diversity').status).toBe('warning');
  });

  it('passes diversity for a short response', () => {
    expect(
      check(assessEssay('However, alpha beta.', 'task-2', HEADWORDS).checks, 'lexical-diversity').status,
    ).toBe('pass');
  });

  it('clamps the indicative band to 4-7 and never calls it a prediction', () => {
    const worst = assessEssay('Bad.', 'task-2', HEADWORDS);
    expect(worst.indicativeBand).toBe(4);
    const best = assessEssay(essay(300), 'task-2', HEADWORDS);
    expect(best.indicativeBand).toBeLessThanOrEqual(7);
    expect(best.indicativeBand).toBeGreaterThanOrEqual(4);
    expect(best.disclaimer).toBe(DISCLAIMER);
    expect(DISCLAIMER).toContain('not a band score');
  });

  it('includes the readability and lexical reports', () => {
    const report = assessEssay(essay(260), 'task-2', HEADWORDS);
    expect(report.readability.scores).toHaveLength(6);
    expect(report.lexical.tokens).toBe(report.words);
  });

  it.each<WritingTask>(['task-1', 'task-2'])('echoes the task (%s)', (task) => {
    expect(assessEssay(essay(300), task, HEADWORDS).task).toBe(task);
  });

  it('is deterministic', () => {
    const text = essay(260);
    expect(assessEssay(text, 'task-2', HEADWORDS)).toEqual(assessEssay(text, 'task-2', HEADWORDS));
  });
});
