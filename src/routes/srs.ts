/**
 * Spaced-repetition, quiz, phonetics and retention routes.
 */

import { allEntries } from '../data/vocabulary.js';
import { badRequest } from '../lib/errors.js';
import { analysePhonetics, simulateLearning } from '../lib/phonetics.js';
import { buildFlashcard, quizDeck } from '../lib/quiz.js';
import { getInt, getNumber, getString, toParams } from '../lib/query.js';
import { parseQuality, rankQueue, retentionCurve, scheduleSrs } from '../lib/srs.js';
import { wordsOf } from '../lib/textstats.js';

import type { RouteContext, HandlerResult, RouteDefinition } from '../lib/route.js';

function srsSchedule(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const qualityRaw = getString(params, 'quality');
  const resultRaw = getString(params, 'result');
  let quality: number | undefined;
  if (qualityRaw !== undefined) {
    if (!/^[0-9]+$/.test(qualityRaw)) {
      throw badRequest('Parameter "quality" must be an integer between 0 and 5.', {
        parameter: 'quality',
        received: qualityRaw,
      });
    }
    quality = Number.parseInt(qualityRaw, 10);
  }
  const qualityParsed = parseQuality(quality, resultRaw);
  const ease = getNumber(params, 'ease', 1.3, 3.0) ?? 2.5;
  const interval = getInt(params, 'interval', 0, 36500, 0);
  const repetitions = getInt(params, 'repetitions', 0, 1000, 0);
  const lapses = getInt(params, 'lapses', 0, 1000, 0);
  const schedule = scheduleSrs(qualityParsed, {
    easeFactor: Math.round(ease * 100) / 100,
    intervalDays: interval,
    repetitions,
    lapses,
  });
  return {
    data: schedule,
    meta: {
      method: 'SM-2 (Wozniak 1990) with Leitner box and Ebbinghaus R = e^{-t/S}.',
      provenance: 'Stateless; supply card state and quality to reproduce any schedule.',
      reference: 'Wozniak P. (1990) Optimization of learning. Acta Neurobiologiae Experimentalis.',
    },
  };
}

function srsRetention(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const strengthRaw = getString(params, 'strength');
  const daysRaw = getString(params, 'days');
  if (strengthRaw === undefined) {
    throw badRequest('Parameter "strength" is required.', { parameter: 'strength' });
  }
  const strength = Number.parseFloat(strengthRaw);
  if (!Number.isFinite(strength) || strength < 1 || strength > 365) {
    throw badRequest('Parameter "strength" must be between 1 and 365.', {
      parameter: 'strength',
      received: strengthRaw,
    });
  }
  const days = daysRaw === undefined ? 30 : Number.parseInt(daysRaw, 10);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw badRequest('Parameter "days" must be an integer between 1 and 365.', {
      parameter: 'days',
      received: daysRaw as string,
    });
  }
  const curve = retentionCurve(strength, days);
  return {
    data: curve,
    meta: {
      method: 'Ebbinghaus R(t) = e^{-t/S}; S=strength in days.',
      strength,
      days,
    },
  };
}

function srsQueue(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const limit = getInt(params, 'limit', 1, 100, 20);
  // Demo queue: generate a seeded sample of cards with random due/ease.
  // Clients can also supply `cards` as JSON array via query param for true stateless ranking.
  const cardsRaw = getString(params, 'cards');
  if (cardsRaw !== undefined) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(cardsRaw);
    } catch {
      throw badRequest('Parameter "cards" must be valid JSON.', {
        parameter: 'cards',
        received: cardsRaw.slice(0, 80),
      });
    }
    if (!Array.isArray(parsed)) {
      throw badRequest('Parameter "cards" must be a JSON array.', { parameter: 'cards' });
    }
    const cards = (parsed as unknown[]).map((row, index) => {
      if (typeof row !== 'object' || row === null) {
        throw badRequest(`cards[${String(index)}] must be an object.`, { parameter: 'cards' });
      }
      const record = row as Record<string, unknown>;
      const due = record.nextReviewInDays;
      const ease = record.easeFactor;
      if (typeof due !== 'number' || !Number.isFinite(due)) {
        throw badRequest(`cards[${String(index)}].nextReviewInDays must be a number.`, {
          parameter: 'cards',
        });
      }
      if (typeof ease !== 'number' || !Number.isFinite(ease)) {
        throw badRequest(`cards[${String(index)}].easeFactor must be a number.`, {
          parameter: 'cards',
        });
      }
      return { nextReviewInDays: due, easeFactor: ease, index };
    });
    const ranked = rankQueue(cards);
    return { data: ranked, meta: { total: ranked.length, limit: ranked.length } };
  }
  // Deterministic demo queue when no cards supplied.
  const count = limit;
  const demo = Array.from({ length: count }, (_, index) => ({
    id: `w${String(index + 1).padStart(5, '0')}`,
    nextReviewInDays: index % 7,
    easeFactor: 1.3 + (index % 8) * 0.2,
  }));
  const ranked = rankQueue(demo);
  return {
    data: ranked,
    meta: { total: ranked.length, limit, note: 'Demo queue; supply ?cards=[...] to rank your own.' },
  };
}

function quizRoute(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const count = getInt(params, 'count', 1, 50, 10);
  const seed = getString(params, 'seed') ?? 'ielts-quiz';
  const entries = allEntries();
  const deck = quizDeck(entries, entries, count, seed);
  return {
    data: deck,
    meta: {
      count: deck.length,
      seed,
      method: 'Deterministic distractor sampling within collection and POS.',
    },
  };
}

function flashcardsRoute(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const count = getInt(params, 'count', 1, 50, 10);
  const seed = getString(params, 'seed') ?? 'ielts-flashcards';
  const entries = allEntries();
  const deck = quizDeck(entries, entries, count, seed);
  const cards = deck.map((item) => {
    const entry = entries.find((value) => value.word === item.word) as unknown as NonNullable<
      ReturnType<typeof entries.find>
    >;
    return buildFlashcard(entry);
  });
  return {
    data: cards,
    meta: { count: cards.length, seed },
  };
}

function phoneticsRoute(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const text = getString(params, 'text') ?? getString(params, 'word');
  if (text === undefined) {
    throw badRequest('Parameter "text" (or "word") is required.', { parameter: 'text' });
  }
  if (text.length > 200) {
    throw badRequest('Parameter "text" must be at most 200 characters.', {
      parameter: 'text',
      received: String(text.length),
    });
  }
  if (wordsOf(text).length === 0) {
    throw badRequest('Parameter "text" contains no analysable words.', {
      parameter: 'text',
      received: text.slice(0, 50),
    });
  }
  const report = analysePhonetics(text);
  return {
    data: report,
    meta: {
      method:
        'Heuristic syllable count (vowel groups minus silent e) plus consonant-cluster scan; phonetic transcription from Cambridge headword list.',
    },
  };
}

function simulationRoute(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const newPerDay = getInt(params, 'newPerDay', 1, 50, 10);
  const days = getInt(params, 'days', 1, 120, 30);
  const strength = getNumber(params, 'strength', 1, 365) ?? 7;
  const threshold = getNumber(params, 'threshold', 0, 1) ?? 0.5;
  const points = simulateLearning(newPerDay, days, strength, threshold);
  return {
    data: points,
    meta: {
      newPerDay,
      days,
      strength,
      threshold,
      method: 'Cumulative Ebbinghaus simulation; each cohort decays as R=e^{-t/S}.',
    },
  };
}

/** Learning-science routes. */
export const learningScienceRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/tools/srs',
    versioned: true,
    summary: 'SM-2 schedule for one review (quality or result plus card state to next state).',
    handler: srsSchedule,
  },
  {
    method: 'GET',
    path: '/v1/tools/retention',
    versioned: true,
    summary: 'Ebbinghaus retention curve R(t)=e^{-t/S}.',
    handler: srsRetention,
  },
  {
    method: 'GET',
    path: '/v1/tools/queue',
    versioned: true,
    summary: 'Rank a review queue (due ascending, ease descending) or return a demo queue.',
    handler: srsQueue,
  },
  {
    method: 'GET',
    path: '/v1/tools/quiz',
    versioned: true,
    summary: 'Deterministic vocabulary quiz (multiple-choice with distractors).',
    handler: quizRoute,
  },
  {
    method: 'GET',
    path: '/v1/tools/flashcards',
    versioned: true,
    summary: 'Deterministic flashcards (front/back) sampled from the headword list.',
    handler: flashcardsRoute,
  },
  {
    method: 'GET',
    path: '/v1/tools/phonetics',
    versioned: true,
    summary: 'Phonetic structure of a word or phrase (syllables, clusters, IPA when known).',
    handler: phoneticsRoute,
  },
  {
    method: 'GET',
    path: '/v1/tools/simulation',
    versioned: true,
    summary: 'Simulate cumulative learning and retention over a multi-day schedule.',
    handler: simulationRoute,
  },
];

// Keep alias for backwards compatibility in tests referencing old name.
export const srsRoutes = learningScienceRoutes;
