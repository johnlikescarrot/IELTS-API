import type { AssessmentCriterion, SpeakingCriterion } from '../types/ielts.js';

/**
 * Band descriptors for the four Speaking assessment criteria (Fluency and
 * Coherence, Lexical Resource, Grammatical Range and Accuracy, and
 * Pronunciation) for bands 0 through 9.
 */
export const SPEAKING_CRITERIA: readonly AssessmentCriterion[] = [
  {
    id: 'fluency-coherence',
    name: 'Fluency and Coherence',
    description:
      'The smoothness of speech, the ability to speak at length without undue hesitation, and how ideas are linked.',
    descriptors: [
      { band: 0, description: 'No assessable speech; the candidate does not respond.' },
      { band: 1, description: 'Speech consists of isolated words with no connected flow.' },
      {
        band: 2,
        description: 'Very limited hesitation-free speech; only short, disjointed utterances.',
      },
      {
        band: 3,
        description: 'Speech is halting with frequent pausing and minimal linking of ideas.',
      },
      {
        band: 4,
        description: 'Speech is hesitant and slow; ideas are linked only with basic connectors.',
      },
      {
        band: 5,
        description: 'Speech is marked by noticeable hesitation and limited cohesive devices.',
      },
      {
        band: 6,
        description: 'Speech is generally fluent with some hesitation and adequate coherence.',
      },
      {
        band: 7,
        description: 'Speech is fluent with only occasional hesitation and effective linking.',
      },
      {
        band: 8,
        description: 'Speech is smooth and coherent with only rare hesitation or repetition.',
      },
      { band: 9, description: 'Speech is fully fluent, spontaneous, and coherent throughout.' },
    ],
  },
  {
    id: 'lexical-resource',
    name: 'Lexical Resource',
    description:
      'The range, precision, and appropriateness of vocabulary used during the Speaking test.',
    descriptors: [
      { band: 0, description: 'No assessable vocabulary is produced.' },
      { band: 1, description: 'Only isolated words and very short basic expressions are used.' },
      {
        band: 2,
        description: 'A basic set of words is used with frequent errors and poor precision.',
      },
      {
        band: 3,
        description: 'A narrow vocabulary is used with frequent errors and little flexibility.',
      },
      {
        band: 4,
        description: 'Limited vocabulary is used with errors in word choice and meaning.',
      },
      {
        band: 5,
        description: 'A modest vocabulary is used; errors occur when discussing unfamiliar topics.',
      },
      {
        band: 6,
        description:
          'An adequate vocabulary is used with some errors and attempts at less common items.',
      },
      {
        band: 7,
        description: 'A good vocabulary range is used flexibly with occasional inaccuracies.',
      },
      { band: 8, description: 'A wide and precise vocabulary is used naturally with few errors.' },
      {
        band: 9,
        description: 'A wide, precise, and idiomatic vocabulary is used with complete control.',
      },
    ],
  },
  {
    id: 'grammatical-range-accuracy',
    name: 'Grammatical Range and Accuracy',
    description:
      'The variety and accuracy of grammatical structures used during the Speaking test.',
    descriptors: [
      { band: 0, description: 'No assessable grammar is produced.' },
      { band: 1, description: 'Only isolated words are produced with no grammatical control.' },
      {
        band: 2,
        description: 'Simple structures are attempted but errors frequently obscure meaning.',
      },
      {
        band: 3,
        description:
          'Simple structures are used; errors are frequent and meaning is often unclear.',
      },
      { band: 4, description: 'A limited range of structures is used with frequent errors.' },
      {
        band: 5,
        description:
          'A limited range of structures is used; errors are common but meaning is usually clear.',
      },
      { band: 6, description: 'A mix of simple and complex structures is used with some errors.' },
      { band: 7, description: 'A variety of structures is used with a good level of accuracy.' },
      { band: 8, description: 'A wide range of structures is used with only rare, minor errors.' },
      { band: 9, description: 'A full range of structures is used accurately and flexibly.' },
    ],
  },
  {
    id: 'pronunciation',
    name: 'Pronunciation',
    description:
      "The clarity, stress, intonation, and overall intelligibility of the candidate's speech.",
    descriptors: [
      { band: 0, description: 'No assessable pronunciation is produced.' },
      { band: 1, description: 'Speech is largely unintelligible.' },
      {
        band: 2,
        description:
          'Speech is hard to understand; significant effort is required of the listener.',
      },
      {
        band: 3,
        description: 'Pronunciation is poor; meaning is often obscured and stress is misplaced.',
      },
      {
        band: 4,
        description: 'Pronunciation is limited; meaning is sometimes obscured by mispronunciation.',
      },
      {
        band: 5,
        description:
          'Pronunciation is understandable but with noticeable faults in stress and intonation.',
      },
      {
        band: 6,
        description:
          'Pronunciation is generally clear with some obvious lapses in stress and intonation.',
      },
      {
        band: 7,
        description: 'Pronunciation is clear and intelligible with good stress and intonation.',
      },
      {
        band: 8,
        description: 'Pronunciation is highly intelligible with only minor, infrequent faults.',
      },
      {
        band: 9,
        description:
          'Pronunciation is completely intelligible and features natural stress and intonation.',
      },
    ],
  },
];

/** Retrieve a single Speaking criterion by identifier. */
export function getSpeakingCriterion(id: SpeakingCriterion): AssessmentCriterion | undefined {
  return SPEAKING_CRITERIA.find((criterion) => criterion.id === id);
}
