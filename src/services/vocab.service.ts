/**
 * Topic vocabulary pack service: topic listing, pack retrieval and
 * cross-pack search.
 */

import {
  TOPIC_VOCAB,
  TOPIC_INDEX,
  type TopicVocabEntry,
  type TopicVocabPack
} from '../data/vocabulary.js';
import { NotFoundError } from '../lib/errors.js';
import { createRng, sample } from '../lib/random.js';

export interface TopicSummary {
  readonly id: string;
  readonly topic: string;
  readonly wordCount: number;
}

export function listTopics(): readonly TopicSummary[] {
  return TOPIC_VOCAB.map((pack) => ({
    id: pack.id,
    topic: pack.topic,
    wordCount: pack.words.length
  }));
}

export function getTopic(topicId: string): TopicVocabPack {
  const pack = TOPIC_INDEX.get(topicId.toLowerCase());
  if (pack === undefined) {
    throw new NotFoundError('Topic', topicId);
  }
  return pack;
}

export interface VocabSearchHit {
  readonly topicId: string;
  readonly topic: string;
  readonly entry: TopicVocabEntry;
  readonly matchedIn: 'term' | 'meaning' | 'collocation';
}

export function searchVocab(query: string, limit: number): readonly VocabSearchHit[] {
  const needle = query.toLowerCase();
  const hits: VocabSearchHit[] = [];
  for (const pack of TOPIC_VOCAB) {
    for (const entry of pack.words) {
      if (entry.term.toLowerCase().includes(needle)) {
        hits.push({ topicId: pack.id, topic: pack.topic, entry, matchedIn: 'term' });
      } else if (entry.meaning.toLowerCase().includes(needle)) {
        hits.push({ topicId: pack.id, topic: pack.topic, entry, matchedIn: 'meaning' });
      } else if (
        entry.collocations.some((collocation) => collocation.toLowerCase().includes(needle))
      ) {
        hits.push({ topicId: pack.id, topic: pack.topic, entry, matchedIn: 'collocation' });
      }
    }
  }
  return hits.slice(0, limit);
}

export interface RandomVocabOptions {
  readonly count: number;
  readonly topicId?: string | undefined;
  readonly seed?: string | undefined;
}

export interface RandomVocabEntry {
  readonly topicId: string;
  readonly topic: string;
  readonly entry: TopicVocabEntry;
}

export function randomVocab(options: RandomVocabOptions): readonly RandomVocabEntry[] {
  const packs = options.topicId === undefined ? TOPIC_VOCAB : [getTopic(options.topicId)];
  const pool: readonly RandomVocabEntry[] = packs.flatMap((pack) =>
    pack.words.map((entry) => ({ topicId: pack.id, topic: pack.topic, entry }))
  );
  const rng = createRng(options.seed);
  return sample(pool, options.count, rng);
}
