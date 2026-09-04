import { Hono } from 'hono';
import { exercises, type Difficulty, type Skill } from './data.js';

export const app = new Hono();
app.get('/', (c) => c.json({ name: 'IELTS API', version: '1.0.0', free: true, authentication: false, docs: '/docs' }));
app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/docs', (c) => c.json({ endpoints: [{ method: 'GET', path: '/exercises?skill=reading&difficulty=beginner&tag=paraphrase' }, { method: 'GET', path: '/exercises/:id' }, { method: 'GET', path: '/skills' }], note: 'No API key is required.' }));
app.get('/skills', (c) => c.json({ skills: ['listening', 'reading', 'writing', 'speaking'] satisfies Skill[] }));
app.get('/exercises', (c) => { const skill = c.req.query('skill') as Skill | undefined; const difficulty = c.req.query('difficulty') as Difficulty | undefined; const tag = c.req.query('tag'); const result = exercises.filter((e) => (!skill || e.skill === skill) && (!difficulty || e.difficulty === difficulty) && (!tag || e.tags.includes(tag))); return c.json({ count: result.length, data: result }); });
app.get('/exercises/:id', (c) => { const exercise = exercises.find((e) => e.id === c.req.param('id')); return exercise ? c.json(exercise) : c.json({ error: 'Exercise not found' }, 404); });
app.notFound((c) => c.json({ error: 'Not found' }, 404));
