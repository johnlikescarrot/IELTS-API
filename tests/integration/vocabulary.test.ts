import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Vocabulary Endpoints (/api/v1/vocabulary)', () => {
  it('GET /api/v1/vocabulary returns paginated vocabulary list with default parameters', async () => {
    const res = await request(app).get('/api/v1/vocabulary');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(20);
    expect(res.body.meta.totalItems).toBe(4310);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(20);
  });

  it('GET /api/v1/vocabulary supports chapter filtering and pagination', async () => {
    const res = await request(app).get('/api/v1/vocabulary?chapter=1&limit=5&page=2');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(5);
    expect(res.body.data[0].chapter).toBe(1);
    expect(res.body.meta.page).toBe(2);
  });

  it('GET /api/v1/vocabulary supports search query, prefix, and category', async () => {
    const resSearch = await request(app).get('/api/v1/vocabulary?search=atmosphere');
    expect(resSearch.status).toBe(200);
    expect(resSearch.body.data.some((item: { word: string }) => item.word === 'atmosphere')).toBe(
      true
    );

    const resPrefix = await request(app).get('/api/v1/vocabulary?prefix=photo');
    expect(resPrefix.status).toBe(200);
    expect(
      resPrefix.body.data.every((item: { word: string }) =>
        item.word.toLowerCase().startsWith('photo')
      )
    ).toBe(true);

    const resCategory = await request(app).get('/api/v1/vocabulary?category=Science');
    expect(resCategory.status).toBe(200);
    expect(resCategory.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/vocabulary supports all sorting options', async () => {
    const sorts = ['word_asc', 'word_desc', 'chapter_asc', 'chapter_desc', 'id_desc', 'id_asc'];
    for (const sort of sorts) {
      const res = await request(app).get(`/api/v1/vocabulary?sort=${sort}&limit=5`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(5);
    }
  });

  it('GET /api/v1/vocabulary returns error for invalid chapter numbers', async () => {
    const res = await request(app).get('/api/v1/vocabulary?chapter=99');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CHAPTER');
  });

  it('GET /api/v1/vocabulary/chapters returns all chapter metadata and sample words', async () => {
    const res = await request(app).get('/api/v1/vocabulary/chapters');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(22);
    expect(res.body.data[0].chapter).toBe(1);
    expect(res.body.data[0].sampleWords.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/vocabulary/random returns random word(s)', async () => {
    const resSingle = await request(app).get('/api/v1/vocabulary/random');
    expect(resSingle.status).toBe(200);
    expect(resSingle.body.data.word).toBeDefined();

    const resMulti = await request(app).get('/api/v1/vocabulary/random?count=3&chapter=2');
    expect(resMulti.status).toBe(200);
    expect(resMulti.body.data.length).toBe(3);
    expect(resMulti.body.data[0].chapter).toBe(2);

    const resInvalidChapter = await request(app).get('/api/v1/vocabulary/random?chapter=50');
    expect(resInvalidChapter.status).toBe(400);
    expect(resInvalidChapter.body.error.code).toBe('INVALID_CHAPTER');
  });

  it('GET /api/v1/vocabulary/quiz generates quiz questions for all types', async () => {
    const types = ['multipleChoice', 'definitionMatch', 'phoneticMatch'];
    for (const t of types) {
      const res = await request(app).get(`/api/v1/vocabulary/quiz?count=3&chapter=1&type=${t}`);
      expect(res.status).toBe(200);
      expect(res.body.data.questions.length).toBe(3);
      expect(res.body.data.quizType).toBe(t);
    }
  });

  it('GET /api/v1/vocabulary/flashcards generates study flashcards', async () => {
    const res = await request(app).get('/api/v1/vocabulary/flashcards?count=4&chapter=3');
    expect(res.status).toBe(200);
    expect(res.body.data.flashcards.length).toBe(4);
    expect(res.body.data.flashcards[0].word).toBeDefined();
    expect(res.body.data.flashcards[0].hint).toBeDefined();
  });

  it('GET /api/v1/vocabulary/word/:word retrieves a word by name', async () => {
    const res = await request(app).get('/api/v1/vocabulary/word/atmosphere');
    expect(res.status).toBe(200);
    expect(res.body.data.word).toBe('atmosphere');

    const resNotFound = await request(app).get('/api/v1/vocabulary/word/nonexistentxyz123');
    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body.error.code).toBe('WORD_NOT_FOUND');
  });

  it('GET /api/v1/vocabulary/:id retrieves a word by numeric ID', async () => {
    const res = await request(app).get('/api/v1/vocabulary/1');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(1);

    const resNotFound = await request(app).get('/api/v1/vocabulary/999999');
    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body.error.code).toBe('WORD_NOT_FOUND');

    const resInvalid = await request(app).get('/api/v1/vocabulary/abc');
    expect(resInvalid.status).toBe(400);
    expect(resInvalid.body.error.code).toBe('INVALID_WORD_ID');
  });
});
