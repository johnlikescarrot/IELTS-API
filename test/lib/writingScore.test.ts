import { describe, expect, it } from 'vitest';

import {
  bandForScore,
  CONCLUSION_MARKERS,
  countSubordinators,
  hasMarker,
  INTRO_MARKERS,
  scoreCoherenceCohesion,
  scoreGrammaticalRange,
  scoreLexicalResource,
  scoreTaskResponse,
  scoreWriting,
  SCORE_IMPROVE_BELOW,
  SCORE_STRENGTH_AT,
  writingFeedback,
} from '../../src/lib/writingScore.js';

describe('hasMarker', () => {
  it('detects introduction and conclusion markers', () => {
    expect(hasMarker('i think cities should invest more', INTRO_MARKERS)).toBe(true);
    expect(hasMarker('overall, the benefits outweigh the costs', CONCLUSION_MARKERS)).toBe(true);
  });

  it('reports absence when no marker appears', () => {
    expect(hasMarker('cities should invest more in transport', INTRO_MARKERS)).toBe(false);
    expect(hasMarker('cities should invest more in transport', CONCLUSION_MARKERS)).toBe(false);
  });
});

describe('countSubordinators', () => {
  it('counts whole-word subordination markers', () => {
    expect(countSubordinators('The policy, which voters support because costs fall when demand rises.')).toBe(
      3,
    );
    expect(countSubordinators('Dogs run fast. Cats sleep a lot.')).toBe(0);
  });
});

describe('scoreTaskResponse', () => {
  it('rewards full length and complete framing', () => {
    expect(scoreTaskResponse(300, 250, true, true)).toBe(100);
  });

  it('scales partial length and partial framing', () => {
    expect(scoreTaskResponse(210, 250, true, false)).toBe(80);
    expect(scoreTaskResponse(160, 250, false, false)).toBe(60);
    expect(scoreTaskResponse(100, 250, false, true)).toBe(60);
    expect(scoreTaskResponse(100, 250, false, false)).toBe(50);
  });
});

describe('scoreCoherenceCohesion', () => {
  it('rewards dense signposting and full paragraphing', () => {
    expect(scoreCoherenceCohesion(12, 5)).toBe(100);
  });

  it('scales partial signposting and paragraphing', () => {
    expect(scoreCoherenceCohesion(7, 3)).toBe(85);
    expect(scoreCoherenceCohesion(4, 2)).toBe(70);
    expect(scoreCoherenceCohesion(1, 1)).toBe(50);
  });
});

describe('scoreLexicalResource', () => {
  it('rewards diverse vocabulary with headword coverage', () => {
    expect(scoreLexicalResource(0.8, 0.35)).toBe(100);
  });

  it('scales partial diversity and coverage', () => {
    expect(scoreLexicalResource(0.6, 0.25)).toBe(85);
    expect(scoreLexicalResource(0.4, 0.15)).toBe(70);
    expect(scoreLexicalResource(0.2, 0.05)).toBe(50);
  });
});

describe('scoreGrammaticalRange', () => {
  it('rewards controlled, varied, subordinated sentences', () => {
    expect(scoreGrammaticalRange(20, 20, 6)).toBe(100);
  });

  it('scales sentence control, variation and subordination', () => {
    expect(scoreGrammaticalRange(12, 10, 4)).toBe(95);
    expect(scoreGrammaticalRange(8, 5, 2)).toBe(60);
    expect(scoreGrammaticalRange(35, 2, 0)).toBe(50);
  });

  it('honours the sentence-length boundaries', () => {
    expect(scoreGrammaticalRange(15, 0, 0)).toBe(75);
    expect(scoreGrammaticalRange(10, 0, 0)).toBe(65);
    expect(scoreGrammaticalRange(30, 0, 0)).toBe(65);
    expect(scoreGrammaticalRange(31, 0, 0)).toBe(50);
  });

  it('honours the variation boundaries', () => {
    expect(scoreGrammaticalRange(0, 15, 0)).toBe(75);
    expect(scoreGrammaticalRange(0, 8, 0)).toBe(65);
    expect(scoreGrammaticalRange(0, 7, 0)).toBe(50);
  });
});

describe('bandForScore', () => {
  it('maps overalls onto indicative band ranges', () => {
    expect(bandForScore(95)).toEqual({ min: 8.5, max: 9, label: '8.5-9.0' });
    expect(bandForScore(85)).toEqual({ min: 7.5, max: 8, label: '7.5-8.0' });
    expect(bandForScore(75)).toEqual({ min: 6.5, max: 7, label: '6.5-7.0' });
    expect(bandForScore(65)).toEqual({ min: 5.5, max: 6, label: '5.5-6.0' });
    expect(bandForScore(55)).toEqual({ min: 4.5, max: 5, label: '4.5-5.0' });
    expect(bandForScore(45)).toEqual({ min: 3.5, max: 4, label: '3.5-4.0' });
    expect(bandForScore(30)).toEqual({ min: null, max: 3, label: '3.0 or below' });
  });

  it('honours the range boundaries', () => {
    expect(bandForScore(90).label).toBe('8.5-9.0');
    expect(bandForScore(80).label).toBe('7.5-8.0');
    expect(bandForScore(70).label).toBe('6.5-7.0');
    expect(bandForScore(60).label).toBe('5.5-6.0');
    expect(bandForScore(50).label).toBe('4.5-5.0');
    expect(bandForScore(40).label).toBe('3.5-4.0');
    expect(bandForScore(39).label).toBe('3.0 or below');
  });
});

describe('writingFeedback', () => {
  it('praises criteria at the strength threshold', () => {
    expect(SCORE_STRENGTH_AT).toBe(70);
    const feedback = writingFeedback([90, 90, 90, 90]);
    expect(feedback.strengths).toHaveLength(4);
    expect(feedback.improvements).toHaveLength(1);
  });

  it('flags criteria below the improvement threshold', () => {
    expect(SCORE_IMPROVE_BELOW).toBe(60);
    const feedback = writingFeedback([50, 50, 50, 50]);
    expect(feedback.strengths).toHaveLength(1);
    expect(feedback.improvements).toHaveLength(4);
  });

  it('falls back on both lists for middling subscores', () => {
    const feedback = writingFeedback([65, 65, 65, 65]);
    expect(feedback.strengths).toHaveLength(1);
    expect(feedback.improvements).toHaveLength(1);
  });
});

describe('scoreWriting', () => {
  const FRAMED = [
    'I think governments should invest in public transport because congestion harms economic growth, which affects everyone.',
    'Furthermore, reliable buses and trains reduce emissions. However, some argue that cars offer flexibility that public options lack.',
    'For example, commuters who live far from stations depend on vehicles when services are infrequent or delayed.',
    'In conclusion, investment which prioritises coverage and frequency will persuade drivers to switch. Overall, the benefits outweigh the costs.',
  ].join('\n\n');

  it('scores a framed multi-paragraph essay', () => {
    const score = scoreWriting(FRAMED, 'task2');
    expect(score.task).toBe('task2');
    expect(score.minimumWords).toBe(250);
    expect(score.meetsMinimum).toBe(false);
    expect(score.criteria.map((row) => row.criterion)).toEqual([
      'task-response',
      'coherence-and-cohesion',
      'lexical-resource',
      'grammatical-range',
    ]);
    expect(score.criteria[0]?.evidence).toMatchObject({
      introductionFraming: true,
      conclusionFraming: true,
    });
    expect(score.criteria[1]?.evidence.paragraphs).toBe(4);
    expect(score.criteria[3]?.evidence.subordinators).toBeGreaterThan(0);
    expect(score.overall).toBe(
      Math.round(score.criteria.reduce((sum, row) => sum + row.score, 0) / score.criteria.length),
    );
    expect(score.indicativeBand).toEqual(bandForScore(score.overall));
    expect(score.strengths.length).toBeGreaterThan(0);
    expect(score.improvements.length).toBeGreaterThan(0);
  });

  it('scores a short unframed sample without subordinators', () => {
    const score = scoreWriting('Dogs run fast. Cats sleep a lot.', 'task1');
    expect(score.task).toBe('task1');
    expect(score.minimumWords).toBe(150);
    expect(score.meetsMinimum).toBe(false);
    expect(score.criteria[0]?.evidence).toMatchObject({
      introductionFraming: false,
      conclusionFraming: false,
    });
    expect(score.criteria[3]?.evidence.subordinators).toBe(0);
  });
});
