import { CEFR_LEVELS, CEFR_ORDER, PARTS_OF_SPEECH, TOPICS, VOCABULARY } from "../data/index.ts";
import type { VocabEntry } from "../types.ts";
import { ApiError } from "../lib/errors.ts";
import {
  activeFilters,
  getEnumParam,
  getOptionalEnumParam,
  getRangeParam,
  getStringParam,
} from "../lib/validate.ts";
import { paginate, sortItems } from "../lib/paginate.ts";
import { getParam, type Route } from "../lib/router.ts";
import { sampleSeeded } from "../lib/random.ts";
import { matchesAllTokens } from "../lib/search.ts";

const SORT_FIELDS = ["id", "word", "cefr"] as const;
type SortField = (typeof SORT_FIELDS)[number];

const ORDERS = ["asc", "desc"] as const;

const FILTER_PARAMS = ["topic", "cefr", "part_of_speech", "q"] as const;

const COMPARATORS: Record<SortField, (a: VocabEntry, b: VocabEntry) => number> = {
  id: (a, b) => a.id - b.id,
  word: (a, b) => a.word.localeCompare(b.word),
  cefr: (a, b) => CEFR_ORDER[a.cefr] - CEFR_ORDER[b.cefr],
};

/** Default random seed: today's UTC date, giving a stable "word of the day". */
export function todaySeed(): string {
  return new Date().toISOString().slice(0, 10);
}

function filterVocabulary(query: URLSearchParams): readonly VocabEntry[] {
  let items: readonly VocabEntry[] = VOCABULARY;
  const topic = getOptionalEnumParam(query, "topic", TOPICS);
  if (topic !== undefined) {
    items = items.filter((entry) => entry.topics.includes(topic));
  }
  const cefr = getOptionalEnumParam(query, "cefr", CEFR_LEVELS);
  if (cefr !== undefined) {
    items = items.filter((entry) => entry.cefr === cefr);
  }
  const partOfSpeech = getOptionalEnumParam(query, "part_of_speech", PARTS_OF_SPEECH);
  if (partOfSpeech !== undefined) {
    items = items.filter((entry) => entry.partOfSpeech === partOfSpeech);
  }
  const search = getStringParam(query, "q");
  if (search !== undefined) {
    items = items.filter((entry) =>
      matchesAllTokens([entry.word, entry.definition, ...entry.synonyms, ...entry.topics], search),
    );
  }
  return items;
}

/** List vocabulary entries with filtering, search, sorting and pagination. */
export const vocabularyListRoute: Route = {
  method: "GET",
  path: "/v1/vocabulary",
  summary: "List vocabulary entries with filtering, search, sorting and pagination.",
  handler: (ctx) => {
    const page = getRangeParam(ctx.query, "page", 1, 1, 1_000_000);
    const perPage = getRangeParam(ctx.query, "per_page", 20, 1, 100);
    const sort = getEnumParam(ctx.query, "sort", SORT_FIELDS, "id");
    const order = getEnumParam(ctx.query, "order", ORDERS, "asc");
    const filtered = filterVocabulary(ctx.query);
    const sorted = sortItems(filtered, sort, order, COMPARATORS);
    const { data, meta } = paginate(
      sorted,
      page,
      perPage,
      "/v1/vocabulary",
      activeFilters(ctx.query, FILTER_PARAMS),
    );
    return { status: 200, body: { data, meta }, cacheable: true };
  },
};

/** Deterministic random vocabulary sampling (word of the day without a seed). */
export const vocabularyRandomRoute: Route = {
  method: "GET",
  path: "/v1/vocabulary/random",
  summary:
    "Sample vocabulary deterministically; the seed defaults to today's UTC date (word of the day).",
  handler: (ctx) => {
    const count = getRangeParam(ctx.query, "count", 1, 1, 50);
    const seed = getStringParam(ctx.query, "seed") ?? todaySeed();
    const filtered = filterVocabulary(ctx.query);
    const data = sampleSeeded(filtered, count, seed);
    return {
      status: 200,
      cacheable: true,
      body: { data, meta: { seed, count: data.length, available: filtered.length } },
    };
  },
};

/** Fetch a single entry by numeric id or exact word (case-insensitive). */
export const vocabularyEntryRoute: Route = {
  method: "GET",
  path: "/v1/vocabulary/:idOrWord",
  summary: "Fetch one vocabulary entry by numeric id or exact word.",
  handler: (ctx) => {
    const key = getParam(ctx, "idOrWord");
    const found = /^\d+$/u.test(key)
      ? VOCABULARY.find((entry) => entry.id === Number.parseInt(key, 10))
      : VOCABULARY.find((entry) => entry.word.toLowerCase() === key.toLowerCase());
    if (found === undefined) {
      throw new ApiError(
        404,
        "not_found",
        `No vocabulary entry matches '${key}'. Browse ids and words with GET /v1/vocabulary.`,
      );
    }
    return { status: 200, body: { data: found }, cacheable: true };
  },
};
