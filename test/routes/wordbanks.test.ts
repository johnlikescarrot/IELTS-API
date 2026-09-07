import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type {
  Wordbank,
  WordbankCollocationHeadword,
  WordbankStats,
  WordbankTopicItem,
  WordbankWord,
} from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/wordbanks', () => {
  it('returns provenance and headline statistics', async () => {
    const response = await server.json<{
      meta: { repository: string; note: string; commit: string };
      stats: WordbankStats;
    }>('/v1/wordbanks');
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('Iamdacai/ielts-vocab-system');
    expect(response.data.meta.note).toContain('No definition');
    expect(response.data.stats.rows).toBe(47044);
    expect(response.data.stats.distinctWords).toBe(15930);
    expect(response.data.stats.identicalBankPairs[0]).toEqual({
      a: 'toefl',
      b: 'compilation',
      distinctWords: 9735,
    });
    expect(response.meta.banks).toBe(7);
    expect(response.meta.words).toBe(15930);
  });
});

describe('GET /v1/wordbanks/banks', () => {
  it('lists the seven banks', async () => {
    const response = await server.json<Wordbank[]>('/v1/wordbanks/banks');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(7);
    expect(response.data.map((bank) => bank.id)).toEqual([
      'ielts',
      'cet4',
      'cet6',
      'kaoyan',
      'toefl',
      'gre',
      'compilation',
    ]);
    expect(response.meta.count).toBe(7);
    expect(response.data[0]?.labelZh).toBe('雅思单词表');
  });
});

describe('GET /v1/wordbanks/banks/:id', () => {
  it('returns one bank with its overlap profile', async () => {
    const response = await server.json<
      Wordbank & {
        overlaps: {
          other: string;
          intersection: number;
          jaccard: number;
          shareOfThis: number;
          shareOfOther: number;
        }[];
      }
    >('/v1/wordbanks/banks/ielts');
    expect(response.status).toBe(200);
    expect(response.data.id).toBe('ielts');
    expect(response.data.overlaps).toHaveLength(6);
    const toefl = response.data.overlaps.find((row) => row.other === 'toefl');
    expect(toefl?.intersection).toBe(2898);
    expect(toefl?.shareOfThis).toBeCloseTo(2898 / 4531, 4);
    expect(toefl?.shareOfOther).toBeCloseTo(2898 / 9735, 4);
    expect(response.meta.comparedWith).toBe(6);
  });

  it('reframes overlaps for a bank that only appears second', async () => {
    const response = await server.json<
      Wordbank & {
        overlaps: {
          other: string;
          intersection: number;
          union: number;
          shareOfThis: number;
          shareOfOther: number;
        }[];
      }
    >('/v1/wordbanks/banks/gre');
    expect(response.status).toBe(200);
    expect(response.data.overlaps).toHaveLength(6);
    const ielts = response.data.overlaps.find((row) => row.other === 'ielts');
    expect(ielts?.intersection).toBe(2386);
    expect(ielts?.union).toBe(9641);
    // GRE appears as `b` in every pair with IELTS, so the shares flip.
    expect(ielts?.shareOfThis).toBeCloseTo(2386 / 7496, 4);
    expect(ielts?.shareOfOther).toBeCloseTo(2386 / 4531, 4);
  });

  it('rejects unknown banks with 404', async () => {
    const response = await server.json('/v1/wordbanks/banks/sat');
    expect(response.status).toBe(404);
  });
});

describe('GET /v1/wordbanks/overlaps', () => {
  it('returns the full 21-pair matrix', async () => {
    const response =
      await server.json<{ a: string; b: string; intersection: number; jaccard: number }[]>(
        '/v1/wordbanks/overlaps',
      );
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(21);
    expect(response.meta.count).toBe(21);
    expect(response.meta.bank).toBeNull();
  });

  it('filters to one bank', async () => {
    const response = await server.json<{ a: string; b: string; intersection: number }[]>(
      '/v1/wordbanks/overlaps?bank=gre',
    );
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(6);
    expect(response.data.every((row) => row.a === 'gre' || row.b === 'gre')).toBe(true);
    expect(response.meta.bank).toBe('gre');
  });

  it('rejects unknown bank values', async () => {
    const response = await server.json('/v1/wordbanks/overlaps?bank=duolingo');
    expect(response.status).toBe(400);
  });
});

describe('GET /v1/wordbanks/cambridge', () => {
  it('returns the Cambridge coverage join', async () => {
    const response = await server.json<{
      cambridgeWords: number;
      ielts: { inCambridge: number; shareInCambridge: number };
      banks: { bank: string; words: number }[];
    }>('/v1/wordbanks/cambridge');
    expect(response.status).toBe(200);
    expect(response.data.cambridgeWords).toBe(4174);
    expect(response.data.ielts.inCambridge).toBe(2153);
    expect(response.data.ielts.shareInCambridge).toBeCloseTo(2153 / 4531, 4);
    expect(response.data.banks.find((row) => row.bank === 'cet4')?.words).toBe(2651);
    expect(response.meta.note).toContain('cross-dataset join');
  });
});

describe('GET /v1/wordbanks/words', () => {
  it('paginates with defaults', async () => {
    const response = await server.json<WordbankWord[]>('/v1/wordbanks/words');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(20);
    expect(response.meta.total).toBe(15930);
    expect(response.meta.sort).toBe('word');
    expect(response.meta.order).toBe('asc');
  });

  it('filters by bank with any-of semantics', async () => {
    const response = await server.json<WordbankWord[]>('/v1/wordbanks/words?bank=ielts&limit=100');
    expect(response.meta.total).toBe(4531);
    expect(response.data.every((entry) => entry.banks.includes('ielts'))).toBe(true);

    const multi = await server.json<WordbankWord[]>('/v1/wordbanks/words?bank=ielts,gre&limit=1');
    expect(multi.meta.total).toBe(9641);
  });

  it('filters by Cambridge and collocation status', async () => {
    const cambridge = await server.json<WordbankWord[]>(
      '/v1/wordbanks/words?bank=ielts&cambridge=true&limit=1',
    );
    expect(cambridge.meta.total).toBe(2153);

    const notCambridge = await server.json<WordbankWord[]>(
      '/v1/wordbanks/words?bank=ielts&cambridge=false&limit=1',
    );
    expect(notCambridge.meta.total).toBe(4531 - 2153);

    const collocated = await server.json<WordbankWord[]>('/v1/wordbanks/words?collocated=true&limit=1');
    expect(collocated.meta.total).toBe(403);
  });

  it('searches free text and sorts', async () => {
    const response = await server.json<WordbankWord[]>('/v1/wordbanks/words?q=environment&limit=100');
    expect(response.meta.total).toBe(3);
    expect(response.meta.query).toBe('environment');

    const sorted = await server.json<WordbankWord[]>('/v1/wordbanks/words?sort=banks&order=desc&limit=3');
    expect(sorted.data[0]?.bankCount).toBe(7);

    const byCollocations = await server.json<WordbankWord[]>(
      '/v1/wordbanks/words?sort=collocations&order=desc&limit=1',
    );
    expect(byCollocations.data[0]?.word).toBe('cause');
  });

  it('rejects unknown banks, sorts and boolean values', async () => {
    const bank = await server.json('/v1/wordbanks/words?bank=sat');
    expect(bank.status).toBe(400);
    const sort = await server.json('/v1/wordbanks/words?sort=length');
    expect(sort.status).toBe(400);
    const bool = await server.json('/v1/wordbanks/words?cambridge=maybe');
    expect(bool.status).toBe(400);
  });
});

describe('GET /v1/wordbanks/words/:word', () => {
  it('returns one word, case-insensitively', async () => {
    const response = await server.json<WordbankWord>('/v1/wordbanks/words/Abandon');
    expect(response.status).toBe(200);
    expect(response.data.word).toBe('abandon');
    expect(response.data.banks).toContain('ielts');
    expect(response.data.cambridge).toBe(true);
    expect(response.meta.license).toBe('CC BY 4.0');
  });

  it('rejects unknown words with 404', async () => {
    const response = await server.json('/v1/wordbanks/words/zzzzzznotaword');
    expect(response.status).toBe(404);
  });
});

describe('GET /v1/wordbanks/collocations', () => {
  it('paginates the headword aggregates with stats', async () => {
    const response = await server.json<WordbankCollocationHeadword[]>('/v1/wordbanks/collocations');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(20);
    expect(response.meta.total).toBe(413);
    const stats = response.meta.stats as { pairs: number; headwords: number; note: string };
    expect(stats.pairs).toBe(3099);
    expect(stats.headwords).toBe(413);
    expect(stats.note).toContain('not redistributed');
    expect(response.meta.note).toContain('not redistributed');
  });

  it('filters by category, bank and Cambridge status', async () => {
    const nouns = await server.json<WordbankCollocationHeadword[]>(
      '/v1/wordbanks/collocations?category=noun&limit=100',
    );
    expect(nouns.meta.total).toBe(99);
    expect(nouns.data.every((head) => head.category === 'noun')).toBe(true);

    const cambridge = await server.json<WordbankCollocationHeadword[]>(
      '/v1/wordbanks/collocations?cambridge=true&limit=1',
    );
    expect(cambridge.meta.total).toBe(257);

    const ielts = await server.json<WordbankCollocationHeadword[]>(
      '/v1/wordbanks/collocations?bank=ielts&limit=1',
    );
    expect(ielts.meta.total).toBe(224);
  });

  it('searches and sorts', async () => {
    const searched = await server.json<WordbankCollocationHeadword[]>('/v1/wordbanks/collocations?q=abandon');
    expect(searched.meta.total).toBe(1);
    expect(searched.data[0]?.partners).toBe(9);

    const sorted = await server.json<WordbankCollocationHeadword[]>(
      '/v1/wordbanks/collocations?sort=partners&order=desc&limit=1',
    );
    expect(sorted.data[0]?.partners).toBe(17);
  });

  it('rejects unknown categories', async () => {
    const response = await server.json('/v1/wordbanks/collocations?category=adjective');
    expect(response.status).toBe(400);
  });
});

describe('GET /v1/wordbanks/review', () => {
  it('returns the engine model without parameters', async () => {
    const response = await server.json<{
      model: {
        model: string;
        intervals: { step: number; minutes: number; label: string }[];
        masteryRule: { correctStep: number; incorrectStep: number };
        reviewWindow: { hours: number };
      };
      ladder: { step: number; minutes: number }[];
      schedule?: unknown;
      masteryUpdate?: unknown;
    }>('/v1/wordbanks/review');
    expect(response.status).toBe(200);
    expect(response.data.model.model).toBe('ebbinghaus-ladder');
    expect(response.data.model.intervals).toHaveLength(8);
    expect(response.data.model.intervals[0]).toEqual({ step: 1, minutes: 5, label: '5 minutes' });
    expect(response.data.model.masteryRule.correctStep).toBe(5);
    expect(response.data.model.masteryRule.incorrectStep).toBe(-8);
    expect(response.data.model.reviewWindow.hours).toBe(2);
    expect(response.data.ladder).toHaveLength(8);
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.masteryUpdate).toBeUndefined();
    expect(response.meta.note).toContain('deterministic');
  });

  it('computes the next base interval', async () => {
    const response = await server.json<{
      schedule: {
        reviews: number;
        mastery: number;
        next: { step: number; intervalMinutes: number; dynamic: boolean; description: string };
      };
    }>('/v1/wordbanks/review?reviews=3');
    expect(response.status).toBe(200);
    expect(response.data.schedule.reviews).toBe(3);
    expect(response.data.schedule.mastery).toBe(0);
    expect(response.data.schedule.next).toEqual({
      step: 4,
      intervalMinutes: 1440,
      dynamic: false,
      description: '1 day',
    });
  });

  it('computes the dynamic interval once the ladder is exhausted', async () => {
    const response = await server.json<{
      schedule: {
        next: { intervalMinutes: number; dynamic: boolean; description: string };
      };
    }>('/v1/wordbanks/review?reviews=8&mastery=50');
    expect(response.status).toBe(200);
    expect(response.data.schedule.next.dynamic).toBe(true);
    expect(response.data.schedule.next.intervalMinutes).toBe(32400);
    expect(response.data.schedule.next.description).toBe('21600 minutes x (1 + 50 / 100)');
  });

  it('computes the mastery update', async () => {
    const correct = await server.json<{
      masteryUpdate: {
        before: number;
        correct: boolean;
        confidence: number;
        change: number;
        after: number;
        clamped: boolean;
      };
    }>('/v1/wordbanks/review?mastery=40&correct=true&confidence=3');
    expect(correct.status).toBe(200);
    expect(correct.data.masteryUpdate).toEqual({
      before: 40,
      correct: true,
      confidence: 3,
      change: 15,
      after: 55,
      clamped: false,
    });

    const wrong = await server.json<{ masteryUpdate: { after: number; clamped: boolean } }>(
      '/v1/wordbanks/review?mastery=10&correct=false&confidence=5',
    );
    expect(wrong.data.masteryUpdate.after).toBe(0);
    expect(wrong.data.masteryUpdate.clamped).toBe(true);
  });

  it('validates the parameter combinations', async () => {
    const confidence = await server.json('/v1/wordbanks/review?confidence=3');
    expect(confidence.status).toBe(400);
    const correct = await server.json('/v1/wordbanks/review?correct=true');
    expect(correct.status).toBe(400);
    const correctNoMastery = await server.json('/v1/wordbanks/review?correct=true&confidence=3');
    expect(correctNoMastery.status).toBe(400);
    const mastery = await server.json('/v1/wordbanks/review?mastery=50');
    expect(mastery.status).toBe(400);
    const range = await server.json('/v1/wordbanks/review?reviews=31');
    expect(range.status).toBe(400);
    const bool = await server.json('/v1/wordbanks/review?mastery=40&correct=perhaps&confidence=3');
    expect(bool.status).toBe(400);
  });
});

describe('GET /v1/wordbanks/topics', () => {
  it('lists both prompt banks with facets', async () => {
    const response = await server.json<WordbankTopicItem[]>('/v1/wordbanks/topics?limit=100');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(52);
    expect(response.meta.total).toBe(52);
    const facets = response.meta.facets as Record<string, string[]>;
    expect(facets.skill).toEqual(['speaking', 'writing']);
    expect(facets.part).toEqual(['1', '2', '3']);
    expect(facets.taskType).toEqual(['task1-academic', 'task1-general', 'task2']);
    expect(facets.difficulty).toEqual(['easy', 'hard', 'medium']);
    expect(facets.chartType).toEqual(['bar', 'line', 'map', 'pie', 'process', 'table']);
    expect(response.meta.note).toContain('frequency');
  });

  it('filters by skill, part, task type and difficulty', async () => {
    const speaking = await server.json<WordbankTopicItem[]>('/v1/wordbanks/topics?skill=speaking&limit=100');
    expect(speaking.meta.total).toBe(26);
    expect(speaking.data.every((topic) => topic.skill === 'speaking')).toBe(true);

    const part2 = await server.json<WordbankTopicItem[]>('/v1/wordbanks/topics?part=2&limit=100');
    expect(part2.meta.total).toBe(8);
    expect(part2.data.every((topic) => topic.skill === 'speaking')).toBe(true);

    const task2 = await server.json<WordbankTopicItem[]>('/v1/wordbanks/topics?taskType=task2&limit=100');
    expect(task2.meta.total).toBe(15);

    const hard = await server.json<WordbankTopicItem[]>('/v1/wordbanks/topics?difficulty=hard&limit=100');
    expect(hard.meta.total).toBe(14);
  });

  it('searches free text and sorts by frequency', async () => {
    const searched = await server.json<WordbankTopicItem[]>('/v1/wordbanks/topics?q=hometown&limit=100');
    expect(searched.meta.total).toBe(1);
    expect(searched.data[0]?.skill).toBe('speaking');

    const sorted = await server.json<WordbankTopicItem[]>(
      '/v1/wordbanks/topics?sort=frequency&order=desc&limit=2',
    );
    expect(sorted.data[0]?.frequency).toBe(95);

    const byDifficulty = await server.json<WordbankTopicItem[]>(
      '/v1/wordbanks/topics?sort=difficulty&order=asc&limit=1',
    );
    expect(byDifficulty.data[0]?.difficulty).toBe('easy');
  });

  it('rejects unknown filters', async () => {
    const skill = await server.json('/v1/wordbanks/topics?skill=listening');
    expect(skill.status).toBe(400);
    const part = await server.json('/v1/wordbanks/topics?part=4');
    expect(part.status).toBe(400);
    const difficulty = await server.json('/v1/wordbanks/topics?difficulty=impossible');
    expect(difficulty.status).toBe(400);
    const sort = await server.json('/v1/wordbanks/topics?sort=topic-label');
    expect(sort.status).toBe(400);
  });
});
