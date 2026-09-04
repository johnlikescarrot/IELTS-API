import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import { collocations, grammarRules, idioms, phrasalVerbs } from './data/language.js';
import { resources } from './data/resources.js';
import {
  listeningPractice,
  listeningQuestionTypes,
  listeningTips,
  readingPractice,
  readingQuestionTypes,
  readingTips,
} from './data/skills.js';
import {
  speakingPart1,
  speakingPart2,
  speakingPart3,
  speakingTips,
} from './data/speaking.js';
import { studyPlans } from './data/studyPlans.js';
import {
  commonMistakes,
  task1Prompts,
  task2Prompts,
  writingSamples,
  writingTips,
} from './data/writing.js';
import { vocabulary } from './data/vocabulary.js';
import { openApiSpec } from './openapi.js';
import type { CefrLevel } from './types.js';
import {
  isValidComponentScore,
  isValidRawScore,
  listeningBand,
  overallBand,
  readingBand,
} from './utils/bands.js';
import {
  matchesQuery,
  normalizeText,
  paginate,
  parseBoundedInt,
  parseOffset,
} from './utils/query.js';
import { API_NAME, API_VERSION } from './version.js';

const CEFR_ORDER: Record<CefrLevel, number> = { A2: 0, B1: 1, B2: 2, C1: 3, C2: 4 };
const CEFR_LEVELS: CefrLevel[] = ['A2', 'B1', 'B2', 'C1', 'C2'];
const FORMALITIES = ['formal', 'neutral', 'informal'];

function searchFilter<T>(
  items: T[],
  query: string,
  pick: (item: T) => (string | string[])[],
): T[] {
  if (query === '') return items;
  return items.filter((item) => matchesQuery(pick(item), query));
}

function sendList<T>(
  req: Request,
  res: Response,
  items: T[],
  pick: (item: T) => (string | string[])[],
  maxLimit = 100,
): void {
  const search = normalizeText(req.query.search);
  const limit = parseBoundedInt(req.query.limit, 20, maxLimit);
  const offset = parseOffset(req.query.offset);
  res.json(paginate(searchFilter(items, search, pick), limit, offset));
}

function sendStatic(res: Response, items: unknown[]): void {
  res.json({ count: items.length, items });
}

function randomSample<T>(items: T[], count: number): T[] {
  return [...items]
    .map((item) => ({ item, key: Math.random() }))
    .sort((a, b) => a.key - b.key)
    .slice(0, Math.min(count, items.length))
    .map((entry) => entry.item);
}

export function createApp(): Express {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.disable('x-powered-by');

  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: API_NAME,
      version: API_VERSION,
      description: 'Free, no-auth IELTS practice API. No API key required.',
      auth: 'none',
      health: '/health',
      docs: '/openapi.json',
      meta: '/api/v1/meta',
      endpoints: [
        '/api/v1/vocabulary',
        '/api/v1/writing/task1',
        '/api/v1/writing/task2',
        '/api/v1/writing/samples',
        '/api/v1/speaking/part1',
        '/api/v1/speaking/part2',
        '/api/v1/speaking/part3',
        '/api/v1/reading/practice',
        '/api/v1/listening/practice',
        '/api/v1/grammar',
        '/api/v1/collocations',
        '/api/v1/idioms',
        '/api/v1/phrasal-verbs',
        '/api/v1/study-plans',
        '/api/v1/resources',
        '/api/v1/calculators/overall',
      ],
    });
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: API_VERSION,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  app.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(openApiSpec);
  });

  app.get('/api/v1/meta', (_req: Request, res: Response) => {
    res.json({
      name: API_NAME,
      version: API_VERSION,
      auth: 'none',
      counts: {
        vocabulary: vocabulary.length,
        writingTask1: task1Prompts.length,
        writingTask2: task2Prompts.length,
        writingSamples: writingSamples.length,
        writingTips: writingTips.length,
        commonMistakes: commonMistakes.length,
        speakingPart1: speakingPart1.length,
        speakingPart2: speakingPart2.length,
        speakingPart3: speakingPart3.length,
        speakingTips: speakingTips.length,
        readingQuestionTypes: readingQuestionTypes.length,
        readingPractice: readingPractice.length,
        listeningQuestionTypes: listeningQuestionTypes.length,
        listeningPractice: listeningPractice.length,
        grammarRules: grammarRules.length,
        collocations: collocations.length,
        idioms: idioms.length,
        phrasalVerbs: phrasalVerbs.length,
        studyPlans: studyPlans.length,
        resources: resources.length,
      },
    });
  });

  // ---- Vocabulary ----
  app.get('/api/v1/vocabulary', (req: Request, res: Response) => {
    const levelRaw = normalizeText(req.query.level).toUpperCase();
    if (levelRaw !== '') {
      const level = CEFR_LEVELS.find((l) => l === levelRaw);
      if (level === undefined) {
        res
          .status(400)
          .json({ error: `Invalid level. Use one of: ${CEFR_LEVELS.join(', ')}` });
        return;
      }
    }
    const category = normalizeText(req.query.category);
    const pos = normalizeText(req.query.pos);
    const sort = normalizeText(req.query.sort);
    let items = vocabulary.filter((entry) => {
      if (levelRaw !== '' && entry.level !== levelRaw) return false;
      if (category !== '' && entry.category.toLowerCase() !== category) return false;
      if (pos !== '' && entry.partOfSpeech.toLowerCase() !== pos) return false;
      return true;
    });
    if (sort === 'word') {
      items = [...items].sort((a, b) => a.word.localeCompare(b.word));
    } else if (sort === 'level') {
      items = [...items].sort(
        (a, b) =>
          CEFR_ORDER[a.level] - CEFR_ORDER[b.level] || a.word.localeCompare(b.word),
      );
    }
    sendList(req, res, items, (e) => [
      e.word,
      e.definition,
      e.example,
      e.synonyms,
      e.category,
    ]);
  });

  app.get('/api/v1/vocabulary/random', (req: Request, res: Response) => {
    const count = parseBoundedInt(req.query.count, 1, 20);
    res.json({ count, items: randomSample(vocabulary, count) });
  });

  app.get('/api/v1/vocabulary/:id', (req: Request, res: Response) => {
    const entry = vocabulary.find((e) => e.id === req.params.id);
    if (entry === undefined) {
      res.status(404).json({ error: `Unknown vocabulary id: ${req.params.id}` });
      return;
    }
    res.json(entry);
  });

  // ---- Writing ----
  app.get('/api/v1/writing/task1', (req: Request, res: Response) => {
    const category = normalizeText(req.query.category);
    const items = task1Prompts.filter(
      (p) => category === '' || p.category.toLowerCase() === category,
    );
    sendList(req, res, items, (p) => [p.prompt, p.category]);
  });

  app.get('/api/v1/writing/task2', (req: Request, res: Response) => {
    const category = normalizeText(req.query.category);
    const items = task2Prompts.filter(
      (p) => category === '' || p.category.toLowerCase() === category,
    );
    sendList(req, res, items, (p) => [p.prompt, p.category]);
  });

  app.get('/api/v1/writing/samples', (req: Request, res: Response) => {
    const taskRaw = normalizeText(req.query.task);
    if (taskRaw !== '' && taskRaw !== '1' && taskRaw !== '2') {
      res.status(400).json({ error: 'Invalid task. Use task=1 or task=2.' });
      return;
    }
    const items = writingSamples.filter(
      (s) => taskRaw === '' || s.task === Number(taskRaw),
    );
    sendList(req, res, items, (s) => [s.title, s.essay]);
  });

  app.get('/api/v1/writing/tips', (_req: Request, res: Response) => {
    sendStatic(res, writingTips);
  });

  app.get('/api/v1/writing/common-mistakes', (req: Request, res: Response) => {
    sendList(req, res, commonMistakes, (m) => [
      m.title,
      m.incorrect,
      m.correct,
      m.explanation,
    ]);
  });

  // ---- Speaking ----
  app.get('/api/v1/speaking/part1', (req: Request, res: Response) => {
    sendList(req, res, speakingPart1, (t) => [t.topic, t.questions]);
  });

  app.get('/api/v1/speaking/part2', (req: Request, res: Response) => {
    sendList(req, res, speakingPart2, (t) => [t.topic, t.questions]);
  });

  app.get('/api/v1/speaking/part3', (req: Request, res: Response) => {
    sendList(req, res, speakingPart3, (t) => [t.topic, t.questions]);
  });

  app.get('/api/v1/speaking/tips', (_req: Request, res: Response) => {
    sendStatic(res, speakingTips);
  });

  // ---- Reading / Listening ----
  app.get('/api/v1/reading/question-types', (_req: Request, res: Response) => {
    sendStatic(res, readingQuestionTypes);
  });

  app.get('/api/v1/reading/tips', (_req: Request, res: Response) => {
    sendStatic(res, readingTips);
  });

  app.get('/api/v1/reading/practice', (_req: Request, res: Response) => {
    sendStatic(res, readingPractice);
  });

  app.get('/api/v1/listening/question-types', (_req: Request, res: Response) => {
    sendStatic(res, listeningQuestionTypes);
  });

  app.get('/api/v1/listening/tips', (_req: Request, res: Response) => {
    sendStatic(res, listeningTips);
  });

  app.get('/api/v1/listening/practice', (_req: Request, res: Response) => {
    sendStatic(res, listeningPractice);
  });

  // ---- Language ----
  app.get('/api/v1/grammar', (req: Request, res: Response) => {
    sendList(req, res, grammarRules, (g) => [g.title, g.explanation, g.correctExample]);
  });

  app.get('/api/v1/grammar/:id', (req: Request, res: Response) => {
    const rule = grammarRules.find((g) => g.id === req.params.id);
    if (rule === undefined) {
      res.status(404).json({ error: `Unknown grammar id: ${req.params.id}` });
      return;
    }
    res.json(rule);
  });

  app.get('/api/v1/collocations', (req: Request, res: Response) => {
    const formality = normalizeText(req.query.formality);
    if (formality !== '' && !FORMALITIES.includes(formality)) {
      res
        .status(400)
        .json({ error: 'Invalid formality. Use one of: formal, neutral, informal.' });
      return;
    }
    const items = collocations.filter(
      (c) => formality === '' || c.formality === formality,
    );
    sendList(req, res, items, (c) => [c.phrase, c.meaning, c.example]);
  });

  app.get('/api/v1/idioms', (req: Request, res: Response) => {
    sendList(req, res, idioms, (c) => [c.phrase, c.meaning, c.example]);
  });

  app.get('/api/v1/phrasal-verbs', (req: Request, res: Response) => {
    sendList(req, res, phrasalVerbs, (c) => [c.phrase, c.meaning, c.example]);
  });

  // ---- Resources (external links, no vendored files) ----
  app.get('/api/v1/resources', (req: Request, res: Response) => {
    const category = normalizeText(req.query.category);
    const items = resources.filter((r) => category === '' || r.category === category);
    sendList(req, res, items, (r) => [r.title, r.description, r.url, r.category]);
  });

  // ---- Study plans ----
  app.get('/api/v1/study-plans', (_req: Request, res: Response) => {
    sendStatic(res, studyPlans);
  });

  app.get('/api/v1/study-plans/:id', (req: Request, res: Response) => {
    const plan = studyPlans.find((p) => p.id === req.params.id);
    if (plan === undefined) {
      res.status(404).json({ error: `Unknown study plan id: ${req.params.id}` });
      return;
    }
    res.json(plan);
  });

  // ---- Calculators ----
  app.get('/api/v1/calculators/overall', (req: Request, res: Response) => {
    const listening = Number(req.query.listening);
    const reading = Number(req.query.reading);
    const writing = Number(req.query.writing);
    const speaking = Number(req.query.speaking);
    const scores = { listening, reading, writing, speaking };
    const invalid = (Object.keys(scores) as (keyof typeof scores)[]).find(
      (key) => !isValidComponentScore(scores[key]),
    );
    if (invalid !== undefined) {
      res.status(400).json({
        error: `Invalid ${invalid} score. Each component must be 0–9 in 0.5 steps.`,
      });
      return;
    }
    const mean = (listening + reading + writing + speaking) / 4;
    res.json({ ...scores, mean, overall: overallBand(scores) });
  });

  app.get('/api/v1/calculators/listening', (req: Request, res: Response) => {
    const raw = Number(req.query.raw);
    if (!isValidRawScore(raw)) {
      res.status(400).json({ error: 'Invalid raw score. Use an integer 0–40.' });
      return;
    }
    res.json({ raw, band: listeningBand(raw) });
  });

  app.get('/api/v1/calculators/reading', (req: Request, res: Response) => {
    const raw = Number(req.query.raw);
    const typeRaw = normalizeText(req.query.type);
    const type: string = typeRaw === '' ? 'academic' : typeRaw;
    if (!isValidRawScore(raw)) {
      res.status(400).json({ error: 'Invalid raw score. Use an integer 0–40.' });
      return;
    }
    if (type !== 'academic' && type !== 'general') {
      res.status(400).json({ error: 'Invalid type. Use type=academic or type=general.' });
      return;
    }
    res.json({
      raw,
      type,
      band: readingBand(raw, type === 'general' ? 'general' : 'academic'),
    });
  });

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found', path: req.path });
  });

  return app;
}
