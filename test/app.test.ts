import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
const get = (path: string) => app.request(path);
describe('IELTS API', () => {
  it('describes itself and reports health', async () => { expect((await (await get('/')).json()).free).toBe(true); expect((await (await get('/health')).json()).status).toBe('ok'); });
  it('lists documentation and skills', async () => { expect((await (await get('/docs')).json()).endpoints).toHaveLength(3); expect((await (await get('/skills')).json()).skills).toHaveLength(4); });
  it('filters exercises', async () => { const response = await get('/exercises?skill=reading&difficulty=beginner&tag=paraphrase'); const body = await response.json(); expect(body.count).toBe(1); });
  it('returns an exercise and a useful 404', async () => { expect((await (await get('/exercises/reading-paraphrase-001')).json()).skill).toBe('reading'); const missing = await get('/exercises/nope'); expect(missing.status).toBe(404); expect((await missing.json()).error).toBe('Exercise not found'); });
  it('handles unknown routes', async () => { const response = await get('/unknown'); expect(response.status).toBe(404); });
});
