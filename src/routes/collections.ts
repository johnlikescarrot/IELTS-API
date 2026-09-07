/**
 * Vocabulary collection routes (Zhenjing-inspired thematic index).
 */

import { COLLECTION_IDS, VOCAB_COLLECTIONS, findCollection } from '../data/collections.js';
import { findWord } from '../data/vocabulary.js';
import { notFound } from '../lib/errors.js';
import { collectionForEntry, collectionStats, entriesForCollection } from '../lib/collections.js';

import type { RouteContext, HandlerResult, RouteDefinition } from '../lib/route.js';

/** List the 22 thematic collections. */
function listCollections(): HandlerResult {
  const stats = collectionStats();
  const items = VOCAB_COLLECTIONS.map((collection) => ({
    ...collection,
    size: stats.byCollection[collection.id] as number,
  }));
  return { data: items, meta: { total: items.length, stats } };
}

/** One collection by id. */
function getCollection(context: RouteContext): HandlerResult {
  const id = context.params.id as string;
  const collection = findCollection(id);
  if (collection === undefined) {
    throw notFound(`No vocabulary collection "${id}".`, {
      collection: id,
      allowed: COLLECTION_IDS.join(','),
    });
  }
  const entries = entriesForCollection(collection.id);
  const assigned = entries.slice(0, 5).map((entry) => ({ id: entry.id, word: entry.word }));
  return {
    data: { ...collection, size: entries.length, sample: assigned },
    meta: { collection: collection.id },
  };
}

/** Entries for one collection. */
function collectionItems(context: RouteContext): HandlerResult {
  const id = context.params.id as string;
  const collection = findCollection(id);
  if (collection === undefined) {
    throw notFound(`No vocabulary collection "${id}".`, {
      collection: id,
      allowed: COLLECTION_IDS.join(','),
    });
  }
  const entries = entriesForCollection(collection.id);
  return {
    data: entries,
    meta: { collection: collection.id, total: entries.length },
  };
}

/** Which collection a headword belongs to, when any. */
function wordCollection(context: RouteContext): HandlerResult {
  const word = context.params.word as string;
  const entry = findWord(word);
  if (entry === undefined) {
    throw notFound(`No vocabulary entry for "${word}".`, { word });
  }
  const collectionId = collectionForEntry(entry.id);
  const collection = collectionId === null ? null : findCollection(collectionId)!;
  return {
    data: { word: entry.word, id: entry.id, collection },
    meta: { word: entry.word },
  };
}

/** Collection routes. */
export const collectionRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/vocabulary/collections',
    versioned: true,
    summary: 'The 22 Zhenjing-inspired thematic vocabulary collections with sizes.',
    handler: listCollections,
  },
  {
    method: 'GET',
    path: '/v1/vocabulary/collections/:id',
    versioned: true,
    summary: 'One thematic collection with a sample of assigned headwords.',
    handler: getCollection,
  },
  {
    method: 'GET',
    path: '/v1/vocabulary/collections/:id/entries',
    versioned: true,
    summary: 'All headwords assigned to one thematic collection.',
    handler: collectionItems,
  },
  {
    method: 'GET',
    path: '/v1/vocabulary/:word/collection',
    versioned: true,
    summary: 'Which thematic collection a headword belongs to, if any.',
    handler: wordCollection,
  },
];
