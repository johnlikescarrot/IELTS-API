/**
 * Vocabulary endpoints: listing with filters/sorting/pagination, topics,
 * and single-entry lookup.
 */

import type { RequestContext, Route } from "../router.js";
import { route } from "../router.js";
import { sendJson } from "../http.js";
import { notFound } from "../http.js";
import {
  paginate,
  parseOptionalInt,
  parseOrder,
  parsePagination,
} from "../lib/pagination.js";
import { findById, parseEnumOption, textMatches } from "../lib/collections.js";
import type { Word } from "../types.js";
import { PARTS_OF_SPEECH } from "../types.js";
import { wordTopics, words } from "../data/index.js";

const SORT_FIELDS = ["id", "word", "band", "topic"] as const;
type SortField = (typeof SORT_FIELDS)[number];

const COMPARATORS: Readonly<Record<SortField, (a: Word, b: Word) => number>> = {
  id: (a, b) => a.id.localeCompare(b.id),
  word: (a, b) => a.word.localeCompare(b.word),
  band: (a, b) => a.band - b.band,
  topic: (a, b) => a.topic.localeCompare(b.topic),
};

function listWords(ctx: RequestContext): void {
  const { query, res } = ctx;
  const topic = parseEnumOption(query.get("topic"), wordTopics, "topic");
  const pos = parseEnumOption(query.get("pos"), PARTS_OF_SPEECH, "pos");
  const band = parseOptionalInt(query.get("band"), "band", 5, 9);
  const q = query.get("q");
  const sort =
    parseEnumOption(query.get("sort"), SORT_FIELDS, "sort") ?? "word";
  const order = parseOrder(query.get("order"));

  let items: readonly Word[] = words;
  if (topic !== null) {
    items = items.filter((w) => w.topic === topic);
  }
  if (pos !== null) {
    items = items.filter((w) => w.partOfSpeech === pos);
  }
  if (band !== null) {
    items = items.filter((w) => w.band === band);
  }
  if (q !== null) {
    items = items.filter((w) =>
      textMatches(
        [w.word, w.meaning, w.example, ...w.synonyms, ...w.collocations],
        q,
      ),
    );
  }

  const compare = COMPARATORS[sort];
  const direction = order === "asc" ? 1 : -1;
  const sorted = [...items].sort((a, b) => compare(a, b) * direction);
  const { page, limit } = parsePagination(query);
  sendJson(res, 200, paginate<Word>(sorted, page, limit));
}

function listWordTopics({ res }: RequestContext): void {
  sendJson(res, 200, { data: wordTopics, count: wordTopics.length });
}

function getWord({ res, params }: RequestContext): void {
  const word = findById(words, params.id as string);
  if (word === undefined) {
    throw notFound(`Word '${params.id as string}' not found`);
  }
  sendJson(res, 200, { data: word });
}

export const wordRoutes: readonly Route[] = [
  route(
    "GET",
    "/v1/words",
    "List vocabulary with filters, sorting, and pagination",
    listWords,
  ),
  route("GET", "/v1/words/topics", "List vocabulary topics", listWordTopics),
  route("GET", "/v1/words/:id", "Get a single vocabulary entry", getWord),
];
