import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/tools/srs', () => {
  it('schedules with quality', async () => {
    const response = await server.json('/v1/tools/srs?quality=4&ease=2.5&interval=0&repetitions=0');
    expect(response.status).toBe(200);
    expect((response.data as { nextIntervalDays: number }).nextIntervalDays).toBe(1);
    expect((response.data as { quality: number }).quality).toBe(4);
  });

  it('schedules with result shorthand', async () => {
    const response = await server.json('/v1/tools/srs?result=good&ease=2.5');
    expect(response.status).toBe(200);
    expect((response.data as { quality: number }).quality).toBe(4);
  });

  it('schedules with again (failure)', async () => {
    const response = await server.json('/v1/tools/srs?result=again');
    expect(response.status).toBe(200);
    expect((response.data as { success: boolean }).success).toBe(false);
  });

  it('schedules hard and easy', async () => {
    const hard = await server.json('/v1/tools/srs?result=hard');
    expect(hard.status).toBe(200);
    const easy = await server.json('/v1/tools/srs?result=easy');
    expect(easy.status).toBe(200);
  });

  it('rejects missing quality/result', async () => {
    const response = await server.json('/v1/tools/srs?ease=2.5');
    expect(response.status).toBe(400);
  });

  it('rejects both quality and result', async () => {
    const response = await server.json('/v1/tools/srs?quality=4&result=good');
    expect(response.status).toBe(400);
  });

  it('rejects invalid quality', async () => {
    const bad = await server.json('/v1/tools/srs?quality=9');
    expect(bad.status).toBe(400);
    const nonInt = await server.json('/v1/tools/srs?quality=2.5');
    expect(nonInt.status).toBe(400);
    const nan = await server.json('/v1/tools/srs?quality=abc');
    expect(nan.status).toBe(400);
  });

  it('rejects invalid result', async () => {
    const response = await server.json('/v1/tools/srs?result=unknown');
    expect(response.status).toBe(400);
  });

  it('rejects invalid ease', async () => {
    const response = await server.json('/v1/tools/srs?quality=4&ease=5');
    expect(response.status).toBe(400);
  });

  it('rejects invalid interval', async () => {
    const response = await server.json('/v1/tools/srs?quality=4&interval=-1');
    expect(response.status).toBe(400);
  });

  it('rejects invalid repetitions', async () => {
    const response = await server.json('/v1/tools/srs?quality=4&repetitions=-1');
    expect(response.status).toBe(400);
  });

  it('rejects invalid lapses', async () => {
    const response = await server.json('/v1/tools/srs?quality=4&lapses=-1');
    expect(response.status).toBe(400);
  });

  it('handles all quality levels', async () => {
    for (let q = 0; q <= 5; q += 1) {
      const res = await server.json(`/v1/tools/srs?quality=${String(q)}`);
      expect(res.status).toBe(200);
    }
  });

  it('handles high repetitions and interval', async () => {
    const response = await server.json('/v1/tools/srs?quality=5&interval=6&repetitions=2&ease=2.5');
    expect(response.status).toBe(200);
    expect((response.data as { nextIntervalDays: number }).nextIntervalDays).toBeGreaterThan(6);
  });
});

describe('GET /v1/tools/retention', () => {
  it('returns retention curve', async () => {
    const response = await server.json('/v1/tools/retention?strength=7&days=5');
    expect(response.status).toBe(200);
    expect(response.data as unknown[]).toHaveLength(5);
  });

  it('defaults days to 30', async () => {
    const response = await server.json('/v1/tools/retention?strength=7');
    expect(response.status).toBe(200);
    expect(response.data as unknown[]).toHaveLength(30);
  });

  it('rejects missing strength', async () => {
    const response = await server.json('/v1/tools/retention?days=5');
    expect(response.status).toBe(400);
  });

  it('rejects invalid strength', async () => {
    expect((await server.json('/v1/tools/retention?strength=0')).status).toBe(400);
    expect((await server.json('/v1/tools/retention?strength=400')).status).toBe(400);
    expect((await server.json('/v1/tools/retention?strength=abc')).status).toBe(400);
  });

  it('rejects invalid days', async () => {
    expect((await server.json('/v1/tools/retention?strength=7&days=0')).status).toBe(400);
    expect((await server.json('/v1/tools/retention?strength=7&days=400')).status).toBe(400);
    expect((await server.json('/v1/tools/retention?strength=7&days=abc')).status).toBe(400);
  });
});

describe('GET /v1/tools/queue', () => {
  it('returns demo queue', async () => {
    const response = await server.json('/v1/tools/queue?limit=5');
    expect(response.status).toBe(200);
    expect(response.data as unknown[]).toHaveLength(5);
  });

  it('ranks supplied cards', async () => {
    const cards = encodeURIComponent(
      JSON.stringify([
        { nextReviewInDays: 2, easeFactor: 2.5 },
        { nextReviewInDays: 1, easeFactor: 2.5 },
      ]),
    );
    const response = await server.json(`/v1/tools/queue?cards=${cards}`);
    expect(response.status).toBe(200);
    const data = response.data as { nextReviewInDays: number }[];
    expect(data[0]?.nextReviewInDays).toBe(1);
  });

  it('rejects invalid cards JSON', async () => {
    const response = await server.json('/v1/tools/queue?cards=notjson');
    expect(response.status).toBe(400);
  });

  it('rejects non-array cards', async () => {
    const cards = encodeURIComponent(JSON.stringify({ nextReviewInDays: 1 }));
    const response = await server.json(`/v1/tools/queue?cards=${cards}`);
    expect(response.status).toBe(400);
  });

  it('rejects invalid card entries', async () => {
    const bad = encodeURIComponent(JSON.stringify([{ nextReviewInDays: 'bad', easeFactor: 2.5 }]));
    const response = await server.json(`/v1/tools/queue?cards=${bad}`);
    expect(response.status).toBe(400);
    const bad2 = encodeURIComponent(JSON.stringify([{ nextReviewInDays: 1, easeFactor: 'bad' }]));
    expect((await server.json(`/v1/tools/queue?cards=${bad2}`)).status).toBe(400);
    const bad3 = encodeURIComponent(JSON.stringify(['string']));
    expect((await server.json(`/v1/tools/queue?cards=${bad3}`)).status).toBe(400);
  });
});

describe('GET /v1/tools/quiz', () => {
  it('returns quiz deck', async () => {
    const response = await server.json('/v1/tools/quiz?count=3&seed=test123');
    expect(response.status).toBe(200);
    const data = response.data as { word: string; options: string[]; answerIndex: number }[];
    expect(data).toHaveLength(3);
    expect(data[0]?.options).toHaveLength(4);
    expect(data[0]?.answerIndex).toBeGreaterThanOrEqual(0);
  });

  it('is deterministic', async () => {
    const first = await server.json('/v1/tools/quiz?count=3&seed=same');
    const second = await server.json('/v1/tools/quiz?count=3&seed=same');
    expect(first.data).toEqual(second.data);
  });

  it('defaults count and seed', async () => {
    const response = await server.json('/v1/tools/quiz');
    expect(response.status).toBe(200);
    expect((response.data as unknown[]).length).toBe(10);
  });

  it('rejects invalid count', async () => {
    expect((await server.json('/v1/tools/quiz?count=0')).status).toBe(400);
    expect((await server.json('/v1/tools/quiz?count=100')).status).toBe(400);
  });
});

describe('GET /v1/tools/flashcards', () => {
  it('returns flashcards', async () => {
    const response = await server.json('/v1/tools/flashcards?count=3&seed=test');
    expect(response.status).toBe(200);
    const data = response.data as { front: string; back: string }[];
    expect(data.length).toBe(3);
    expect(data[0]?.front.length).toBeGreaterThan(0);
  });

  it('returns flashcards with defaults', async () => {
    const response = await server.json('/v1/tools/flashcards');
    expect(response.status).toBe(200);
    expect((response.data as unknown[]).length).toBe(10);
    expect((response.meta as { seed: string }).seed).toBe('ielts-flashcards');
  });

  it('returns flashcards with count only (default seed)', async () => {
    const response = await server.json('/v1/tools/flashcards?count=5');
    expect(response.status).toBe(200);
    expect((response.meta as { seed: string }).seed).toBe('ielts-flashcards');
  });

  it('rejects invalid count', async () => {
    expect((await server.json('/v1/tools/flashcards?count=0')).status).toBe(400);
  });
});

describe('GET /v1/tools/phonetics', () => {
  it('analyses phonetics', async () => {
    const response = await server.json('/v1/tools/phonetics?text=atmosphere');
    expect(response.status).toBe(200);
    expect((response.data as { totalSyllables: number }).totalSyllables).toBeGreaterThan(0);
  });

  it('aliases word param', async () => {
    const response = await server.json('/v1/tools/phonetics?word=hello');
    expect(response.status).toBe(200);
  });

  it('rejects missing text', async () => {
    const response = await server.json('/v1/tools/phonetics');
    expect(response.status).toBe(400);
  });

  it('rejects empty text', async () => {
    const response = await server.json('/v1/tools/phonetics?text=123');
    expect(response.status).toBe(400);
  });

  it('rejects too long text', async () => {
    const long = 'a'.repeat(201);
    const response = await server.json(`/v1/tools/phonetics?text=${long}`);
    expect(response.status).toBe(400);
  });
});

describe('GET /v1/tools/simulation', () => {
  it('simulates learning', async () => {
    const response = await server.json('/v1/tools/simulation?newPerDay=10&days=5&strength=7&threshold=0.5');
    expect(response.status).toBe(200);
    const data = response.data as { day: number }[];
    expect(data).toHaveLength(6);
    expect(data[0]?.day).toBe(0);
  });

  it('uses defaults', async () => {
    const response = await server.json('/v1/tools/simulation');
    expect(response.status).toBe(200);
  });

  it('rejects invalid params', async () => {
    expect((await server.json('/v1/tools/simulation?newPerDay=0')).status).toBe(400);
    expect((await server.json('/v1/tools/simulation?days=0')).status).toBe(400);
    expect((await server.json('/v1/tools/simulation?strength=500')).status).toBe(400);
    expect((await server.json('/v1/tools/simulation?threshold=2')).status).toBe(400);
  });
});
