/** Seeded, non-overlapping vocabulary pages with revealable answers and client-owned review states. */
import { allEntries, PARTS_OF_SPEECH } from '../data/vocabulary.js';
import { badRequest } from './errors.js';
import { readDate, readNumber, readString } from './input.js';
import { createReviewCard } from './review.js';
import { shuffled } from './rng.js';
import type { PartOfSpeech, VocabularyDeck } from '../types.js';

/** Filters and pagination for a reproducible vocabulary deck. */
export type VocabularyDeckOptions = {
  seed: string;
  on: string;
  limit?: number;
  offset?: number;
  volumes?: readonly number[];
  partsOfSpeech?: readonly PartOfSpeech[];
};

/**
 * Shuffle the entire eligible population before pagination, so different pages
 * of the same seed/filters never repeat an entry. Every returned object is a
 * copy: saving or changing local progress cannot change the shared dataset.
 */
export function createVocabularyDeck(options: VocabularyDeckOptions): VocabularyDeck {
  const { seed, on, volumes, partsOfSpeech, limit = 10, offset = 0 } = options;
  readString(seed, 'seed', 128);
  readDate(on, 'on');
  readNumber(limit, 'limit', 1, 50);
  readNumber(offset, 'offset', 0, 100000);
  if (volumes !== undefined) {
    if (!Array.isArray(volumes) || volumes.length > 22) {
      throw badRequest('The volume filter must contain at most 22 volume numbers.', { field: 'volume' });
    }
    for (const volume of volumes) readNumber(volume, 'volume', 1, 22);
  }
  if (
    partsOfSpeech !== undefined &&
    (!Array.isArray(partsOfSpeech) || partsOfSpeech.some((pos) => !PARTS_OF_SPEECH.includes(pos)))
  ) {
    throw badRequest('The part-of-speech filter contains an unsupported value.', { field: 'pos' });
  }
  const entries = allEntries().filter(
    (entry) =>
      (volumes === undefined ||
        volumes.length === 0 ||
        entry.volumes.some((volume) => volumes.includes(volume))) &&
      (partsOfSpeech === undefined ||
        partsOfSpeech.length === 0 ||
        partsOfSpeech.includes(entry.partOfSpeech)),
  );
  // Canonical IDs, rather than platform-dependent collation, define the input order.
  entries.sort((a, b) => (a.id < b.id ? -1 : 1));
  const page = shuffled(`ielts-api:deck:v1:${seed}`, entries).slice(offset, offset + limit);
  const cards = page.map((entry) => ({
    prompt: { id: entry.id, word: entry.word, phonetic: entry.phonetic, partOfSpeech: entry.partOfSpeech },
    answer: {
      definition: entry.definition,
      senses: entry.senses.map((sense) => ({ ...sense })),
      morphemes: entry.morphemes,
      volumes: [...entry.volumes],
    },
    state: createReviewCard(entry.id, on),
  }));
  return { seed, on, total: entries.length, limit, offset, hasMore: offset + limit < entries.length, cards };
}
