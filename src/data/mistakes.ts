/**
 * The self-review mistake taxonomy.
 *
 * Stateful vocabulary trainers keep a *mistake book*: every miss is logged
 * with an error type, high-frequency misses are pushed back into review, and a
 * word is eliminated once it survives enough consecutive recalls. The five
 * error types below (`spelling`, `recognition`, `pronunciation`, `usage`,
 * `listening`) are the classification such trainers converge on — see the
 * mistake-book controller of `Iamdacai/ielts-vocab-system` — re-expressed here
 * as a stateless self-review protocol: each type names the observable signals
 * that classify a miss, the correction routine to run after one, and the API
 * endpoints that supply drill material for it.
 *
 * The guidance is original wording written for this project. The elimination
 * rule is deliberately conservative: a word leaves review only after three
 * consecutive correct recalls at Ebbinghaus steps 3-8 (see `/v1/study/srs`),
 * because early-ladder recalls measure working memory rather than retention.
 */

import type { MistakeType } from '../types.js';

/** Mistake types, in the order a learner meets them (receptive first). */
export const MISTAKE_TYPES: readonly MistakeType[] = [
  {
    id: 'recognition',
    name: 'Recognition failure',
    skill: 'reading',
    description:
      'The word looks unfamiliar in context even though it was studied before: meaning cannot be retrieved on sight.',
    signals: [
      'The sentence stalls at the word and the surrounding argument is lost.',
      'The word is confused with a similar-looking headword (precede/proceed, complement/compliment).',
      'A quiz miss on a word-to-definition item for a previously seen headword.',
    ],
    protocol: [
      'Re-learn the headword with its morpheme hints from /v1/vocabulary/:word before re-testing.',
      'Re-sit a word-to-definition quiz seeded for the same Cambridge volume and log the miss again if it recurs.',
      'Schedule the next recall with /v1/study/srs at the current review count instead of restarting the ladder.',
    ],
    drills: [
      { name: 'Seeded vocabulary quiz (word to definition)', url: '/v1/vocabulary/quiz' },
      { name: 'Headword lookup with morpheme hints', url: '/v1/vocabulary/:word' },
    ],
  },
  {
    id: 'listening',
    name: 'Listening mishearing',
    skill: 'listening',
    description:
      'The word is known on paper but missed in connected speech: boundaries, weak forms or stress shift hide it.',
    signals: [
      'A completion-type listening item is left blank although the word is in the learner vocabulary.',
      'The word is heard as a neighbour (affect/effect, price/prize) under exam timing.',
      'Transcription of a phrase succeeds everywhere except the target word.',
    ],
    protocol: [
      'Read the transcription aloud from /v1/vocabulary/:word and mark the stressed syllable before listening again.',
      'Drill the completion question types that punish mishearing: form, note, table and sentence completion.',
      'Keep the word in review until three consecutive correct recalls at ladder steps 3-8.',
    ],
    drills: [
      { name: 'Completion question-type drills', url: '/v1/question-types/sentence-completion' },
      { name: 'Spaced-repetition schedule', url: '/v1/study/srs' },
    ],
  },
  {
    id: 'spelling',
    name: 'Spelling error',
    skill: 'writing',
    description:
      'The word is retrieved with the wrong letters: doubled consonants, silent letters, suffix swaps (-ance/-ence, -ise/-ize).',
    signals: [
      'A listening completion answer is scored wrong solely on spelling.',
      'The same word is misspelled twice in one writing sample.',
      'Uncertainty between two plausible spellings without a rule to decide.',
    ],
    protocol: [
      'Write the word from memory three times, then verify every letter against /v1/vocabulary/:word.',
      'Attach the spelling to a rule or a morpheme boundary rather than to rote repetition.',
      'Re-test with a definition-to-word quiz item so retrieval runs from meaning to letters.',
    ],
    drills: [
      { name: 'Seeded vocabulary quiz (definition to word)', url: '/v1/vocabulary/quiz' },
      { name: 'Headword lookup with morpheme hints', url: '/v1/vocabulary/:word' },
    ],
  },
  {
    id: 'pronunciation',
    name: 'Pronunciation error',
    skill: 'speaking',
    description:
      'The word is stressed, vowelled or consonanted wrongly: wrong syllable stress, L1 vowel substitution, silent-letter voicing.',
    signals: [
      'A listener needs the word repeated or mishears it in a speaking turn.',
      'Stress falls on a different syllable than the transcription shows.',
      'Minimal-pair confusion (sheet/seat, walk/work) in free production.',
    ],
    protocol: [
      'Shadow the transcription syllable by syllable, exaggerating the stressed vowel first.',
      'Produce the word inside a full sentence rather than in isolation, then inside a Part 2 turn.',
      'Pair each speaking drill with its writing form so the spelling-pronunciation link strengthens both.',
    ],
    drills: [
      { name: 'Speaking topics across Parts 1-3', url: '/v1/topics/speaking' },
      { name: 'Response frameworks for Speaking Parts 2-3', url: '/v1/frameworks' },
    ],
  },
  {
    id: 'usage',
    name: 'Usage error',
    skill: 'writing',
    description:
      'The word is spelled and pronounced correctly but used wrongly: wrong collocation, register, preposition or countability.',
    signals: [
      'A sentence is grammatical but no native speaker would write it (make a discussion, according to me).',
      'The essay profiler flags low headword coverage while the vocabulary feels advanced.',
      'Preposition or article errors cluster around otherwise strong topic words.',
    ],
    protocol: [
      'Profile the sentence with /v1/tools/essay-profile and read the lexical-resource hints before rewriting.',
      'Re-learn the word together with its two strongest collocates, never alone.',
      'Rewrite the sentence twice with different collocates and profile both versions.',
    ],
    drills: [
      { name: 'Essay profiler with lexical hints', url: '/v1/tools/essay-profile' },
      { name: 'Recurring exam themes with keyword sets', url: '/v1/topics/themes' },
    ],
  },
];

/**
 * Find a mistake type by id.
 *
 * @param id - Mistake-type identifier.
 */
export function mistakeTypeById(id: string): MistakeType | undefined {
  return MISTAKE_TYPES.find((type) => type.id === id);
}
