/**
 * IELTS band scale and analytic band descriptors.
 *
 * The official IELTS band descriptors (published jointly by the British
 * Council, IDP: IELTS Australia and Cambridge Assessment English) describe
 * performance at each band level across four analytic criteria.  They are
 * reproduced here as **original, condensed paraphrases** written for this
 * project, so that the API can be redistributed under an open licence; the
 * wording is deliberately not the official text.  Researchers who need the
 * authoritative wording should consult the published descriptors and cite
 * them directly.
 *
 * Descriptor scale: whole bands 0-9. IELTS examiners award half bands using
 * the same descriptors, taking the stronger or weaker profile into account.
 */

import type { BandDescriptor, BandScaleEntry, CriteriaSet, Criterion } from '../types.js';

/** Band scale with indicative CEFR levels. */
export const BAND_SCALE: readonly BandScaleEntry[] = [
  {
    band: 0,
    cefr: '-',
    label: 'Did not attempt the test',
    description: 'No assessable information provided.',
  },
  { band: 0.5, cefr: 'A1', label: 'Non-user', description: 'No assessable language beyond isolated words.' },
  {
    band: 1,
    cefr: 'A1',
    label: 'Non-user',
    description: 'Essentially incapable of using the language beyond a few isolated words.',
  },
  {
    band: 1.5,
    cefr: 'A1',
    label: 'Non-user',
    description: 'Communicates only isolated words and memorised fragments.',
  },
  {
    band: 2,
    cefr: 'A1',
    label: 'Intermittent user',
    description: 'Great difficulty understanding spoken and written English.',
  },
  {
    band: 2.5,
    cefr: 'A1',
    label: 'Intermittent user',
    description: 'Conveys only basic meaning in familiar situations.',
  },
  {
    band: 3,
    cefr: 'A2',
    label: 'Extremely limited user',
    description: 'Conveys and understands only general meaning in very familiar situations.',
  },
  {
    band: 3.5,
    cefr: 'A2',
    label: 'Extremely limited user',
    description: 'Frequent breakdowns in communication outside familiar contexts.',
  },
  {
    band: 4,
    cefr: 'B1',
    label: 'Limited user',
    description:
      'Basic competence is limited to familiar situations with frequent problems in understanding.',
  },
  {
    band: 4.5,
    cefr: 'B1',
    label: 'Limited user',
    description: 'Partial control of the language with frequent misunderstandings outside familiar topics.',
  },
  {
    band: 5,
    cefr: 'B2',
    label: 'Modest user',
    description: 'Partial command of the language, coping with overall meaning but making frequent mistakes.',
  },
  {
    band: 5.5,
    cefr: 'B2',
    label: 'Modest user',
    description: 'Partial command coping with most situations, though errors and misuses are common.',
  },
  {
    band: 6,
    cefr: 'B2',
    label: 'Competent user',
    description: 'Generally effective command despite inaccuracies; can use fairly complex language.',
  },
  {
    band: 6.5,
    cefr: 'B2',
    label: 'Competent user',
    description: 'Generally effective command with noticeable inaccuracies in complex language.',
  },
  {
    band: 7,
    cefr: 'C1',
    label: 'Good user',
    description: 'Operational command with occasional inaccuracies; generally handles complex language well.',
  },
  {
    band: 7.5,
    cefr: 'C1',
    label: 'Good user',
    description: 'Operational command with only occasional lapses in accuracy or appropriacy.',
  },
  {
    band: 8,
    cefr: 'C1',
    label: 'Very good user',
    description: 'Fully operational command with only occasional unsystematic inaccuracies.',
  },
  {
    band: 8.5,
    cefr: 'C2',
    label: 'Very good user',
    description: 'Fully operational command; only rare, unsystematic slips remain.',
  },
  {
    band: 9,
    cefr: 'C2',
    label: 'Expert user',
    description: 'Full operational command: appropriate, accurate and fluent with complete understanding.',
  },
];

/** Criteria used for the Speaking test. */
export const SPEAKING_CRITERIA: readonly Criterion[] = [
  'fluencyAndCoherence',
  'lexicalResource',
  'grammaticalRangeAndAccuracy',
  'pronunciation',
];

/** Criteria used for Writing Task 1. */
export const WRITING_TASK1_CRITERIA: readonly Criterion[] = [
  'taskAchievement',
  'coherenceAndCohesion',
  'lexicalResource',
  'grammaticalRangeAndAccuracy',
];

/** Criteria used for Writing Task 2. */
export const WRITING_TASK2_CRITERIA: readonly Criterion[] = [
  'taskResponse',
  'coherenceAndCohesion',
  'lexicalResource',
  'grammaticalRangeAndAccuracy',
];

/** Every criteria set keyed by name. */
export const CRITERIA_BY_SET: Record<CriteriaSet, readonly Criterion[]> = {
  speaking: SPEAKING_CRITERIA,
  'writing-task-1': WRITING_TASK1_CRITERIA,
  'writing-task-2': WRITING_TASK2_CRITERIA,
};

/** Condensed Speaking descriptors, indexed by band 0-9. */
const SPEAKING_DESCRIPTORS = {
  fluencyAndCoherence: [
    'Does not attempt the test or produces no connected speech.',
    'Cannot produce continuous speech; communication relies on isolated words.',
    'Pauses at length before almost every word; cannot link ideas.',
    'Speaks with long pauses; may repeat or self-correct constantly.',
    'Hesitates frequently; can link simple sentences but not sustain longer turns.',
    'Maintains basic flow but repetitively; hesitant and sometimes loses coherence.',
    'Willing to speak at length, though repetition and hesitation reduce coherence.',
    'Keeps going with some hesitation; uses a range of connectives and discourse markers.',
    'Speaks at length with ease; only occasional repetition or self-correction.',
    'Speaks fluently with only rare repetition; fully coherent and well-developed.',
  ],
  lexicalResource: [
    'Does not attempt the test or provides no assessable vocabulary.',
    'Produces only isolated words and memorised fragments.',
    'Uses isolated words and set phrases with no flexibility.',
    'Limited vocabulary for familiar topics; frequent errors and repetition.',
    'Can discuss familiar topics but often cannot paraphrase; errors are noticeable.',
    'Adequate vocabulary for familiar topics; limited flexibility and frequent errors.',
    'Enough vocabulary for familiar topics; attempts paraphrase with mixed success.',
    'Flexible use of vocabulary with some awareness of collocation and style.',
    'Wide, flexible vocabulary used precisely; occasional inaccuracy in word choice.',
    'Full flexibility and precision; idiomatic language used naturally and accurately.',
  ],
  grammaticalRangeAndAccuracy: [
    'Does not attempt the test or provides no assessable grammar.',
    'Produces no grammatical structures beyond isolated words.',
    'Uses only a few basic structures, mostly memorised and frequently wrong.',
    'Uses basic structures with frequent errors; meaning is often confused.',
    'Uses basic structures reasonably but complex grammar is rare and error-prone.',
    'Limited range of grammar; complex sentences are attempted but error-filled.',
    'Mixes simple and complex structures; errors may cause comprehension problems.',
    'Uses a range of structures flexibly; errors are frequent but rarely impede meaning.',
    'Uses a wide range of structures with good control; few errors remain.',
    'Uses a full range of structures with consistent precision and appropriacy.',
  ],
  pronunciation: [
    'Does not attempt the test or produces no assessable pronunciation.',
    'Speech is largely unintelligible; no use of phonological features.',
    'Mostly unintelligible; isolated words may be recognisable.',
    'Frequent phonological problems cause strain for the listener.',
    'Uses a limited range of features; mispronunciation is frequent and distracting.',
    'Some control of basic features; mispronunciation sometimes reduces clarity.',
    'Uses a range of features with mixed control; some words are unclear.',
    'Generally clear with effective use of stress and intonation; some lapses.',
    'Easy to understand throughout; prosodic features support meaning well.',
    'Effortless to understand; subtle, precise control of all phonological features.',
  ],
};

/** Condensed Writing Task 1 (Task Achievement) descriptors, indexed by band 0-9. */
const TASK_ACHIEVEMENT: readonly string[] = [
  'Does not attempt the task or writes nothing assessable.',
  'Copies the input; no original information is conveyed.',
  'Attempts the task but no data is presented; word count is far too low.',
  'Presents some information but selections are unclear and the overview is missing.',
  'Attempts to report detail mechanically with no clear overview and frequent inaccuracy.',
  'Tends to focus on details without an adequate overview; key features may be unclear.',
  'Presents an overview but it may be unclear; key features are selected with some inaccuracy.',
  'Covers the requirements; presents a clear overview and highlights key features.',
  'Presents a clear overview with appropriately selected, well-extended key features.',
  'Fully satisfies the task with a fully developed, accurate and insightful overview.',
];

/** Condensed Writing Task 2 (Task Response) descriptors, indexed by band 0-9. */
const TASK_RESPONSE: readonly string[] = [
  'Does not attempt the task or writes nothing assessable.',
  'Copies the prompt; no position or ideas are presented.',
  'Barely addresses the task; ideas are largely irrelevant or repeated.',
  'Addresses the task only partially; the position is unclear or absent.',
  'Presents a position but ideas are underdeveloped, repetitive or off-topic.',
  'Presents a position with some development but ideas lack clarity or focus.',
  'Addresses all parts of the task, though conclusions may be unclear or repetitive.',
  'Addresses all parts of the task and presents a clear, developed position throughout.',
  'Fully addresses all parts of the task with well-developed, supported ideas.',
  'Fully addresses all parts with a well-developed, justified and insightful position.',
];

/** Condensed Writing descriptors shared by both tasks. */
const WRITING_COHERENCE: readonly string[] = [
  'Does not attempt the task or provides no assessable organisation.',
  'No organisation; uses isolated words rather than sentences.',
  'Minimal control of cohesion; writing consists of unrelated sentences.',
  'Ideas are not organised; cohesion is absent or frequently misused.',
  'Information is not arranged coherently; paragraphing is inadequate or missing.',
  'Some organisation, but progression is not always logical and cohesion is faulty.',
  'Arranges information coherently with some progression, though cohesion is imperfect.',
  'Logically organised with clear progression, though cohesion is occasionally faulty.',
  'Sequences information and ideas logically with effective, mostly accurate cohesion.',
  'Uses cohesion so skilfully that it attracts no attention; fully logical progression.',
];

const WRITING_LEXICAL: readonly string[] = [
  'Does not attempt the task or provides no assessable vocabulary.',
  'Uses only a few isolated words and memorised chunks.',
  'Uses an extremely limited range; spelling and word-form errors predominate.',
  'Uses only basic vocabulary with very limited control of spelling and word formation.',
  'Uses basic vocabulary accurately for familiar topics but cannot paraphrase.',
  'Limited vocabulary used adequately; errors in spelling and word formation are noticeable.',
  'An adequate range with attempts at less common items; some errors but meaning is clear.',
  'A sufficient range used flexibly; occasional errors in spelling or word choice.',
  'A wide range used fluently and flexibly; rare inaccuracies in word choice or collocation.',
  'A wide range used with full flexibility, precision and rare, minor errors only.',
];

const WRITING_GRAMMAR: readonly string[] = [
  'Does not attempt the task or provides no assessable grammar.',
  'Produces no sentences, only isolated words.',
  'Uses only a few basic structures, mostly inaccurate.',
  'Attempts sentence forms but errors predominate and punctuation is absent.',
  'Uses only limited structures; complex sentences are rare and error-filled.',
  'Limited range of sentence structures; errors are frequent and cause strain.',
  'Uses a mix of simple and complex structures; errors may reduce clarity.',
  'Uses a variety of structures with some flexibility; errors rarely impede communication.',
  'Uses a wide range of structures with good control; the great majority of sentences are error-free.',
  'Uses a wide range of structures with full flexibility and consistent accuracy.',
];

/** One criterion of one criteria set, with its ten band summaries. */
interface DescriptorRow {
  set: CriteriaSet;
  criterion: Criterion;
  summaries: readonly string[];
}

/**
 * The descriptor table. Task 1 and Task 2 share the coherence, vocabulary and
 * grammar criteria, mirroring the published IELTS writing descriptors.
 */
const DESCRIPTOR_TABLE: readonly DescriptorRow[] = [
  { set: 'speaking', criterion: 'fluencyAndCoherence', summaries: SPEAKING_DESCRIPTORS.fluencyAndCoherence },
  { set: 'speaking', criterion: 'lexicalResource', summaries: SPEAKING_DESCRIPTORS.lexicalResource },
  {
    set: 'speaking',
    criterion: 'grammaticalRangeAndAccuracy',
    summaries: SPEAKING_DESCRIPTORS.grammaticalRangeAndAccuracy,
  },
  { set: 'speaking', criterion: 'pronunciation', summaries: SPEAKING_DESCRIPTORS.pronunciation },
  { set: 'writing-task-1', criterion: 'taskAchievement', summaries: TASK_ACHIEVEMENT },
  { set: 'writing-task-1', criterion: 'coherenceAndCohesion', summaries: WRITING_COHERENCE },
  { set: 'writing-task-1', criterion: 'lexicalResource', summaries: WRITING_LEXICAL },
  { set: 'writing-task-1', criterion: 'grammaticalRangeAndAccuracy', summaries: WRITING_GRAMMAR },
  { set: 'writing-task-2', criterion: 'taskResponse', summaries: TASK_RESPONSE },
  { set: 'writing-task-2', criterion: 'coherenceAndCohesion', summaries: WRITING_COHERENCE },
  { set: 'writing-task-2', criterion: 'lexicalResource', summaries: WRITING_LEXICAL },
  { set: 'writing-task-2', criterion: 'grammaticalRangeAndAccuracy', summaries: WRITING_GRAMMAR },
];

/** Build the flattened descriptor table. */
function buildDescriptors(): BandDescriptor[] {
  const rows: BandDescriptor[] = [];
  for (const row of DESCRIPTOR_TABLE) {
    row.summaries.forEach((summary, band) => {
      rows.push({ set: row.set, criterion: row.criterion, band, summary });
    });
  }
  return rows;
}

/** Every band descriptor, flattened. */
export const BAND_DESCRIPTORS: readonly BandDescriptor[] = buildDescriptors();

/**
 * Return the descriptors for one criteria set, optionally filtered.
 *
 * @param set - Criteria set.
 * @param criterion - Optional criterion filter.
 * @param band - Optional whole-band filter.
 */
export function findDescriptors(set: CriteriaSet, criterion?: Criterion, band?: number): BandDescriptor[] {
  return BAND_DESCRIPTORS.filter(
    (row) =>
      row.set === set &&
      (criterion === undefined || row.criterion === criterion) &&
      (band === undefined || row.band === band),
  );
}

/**
 * Return the scale entry for a band score.
 *
 * @param band - Band score.
 * @returns The matching entry, or `undefined` for non-reportable bands.
 */
export function bandScaleEntry(band: number): BandScaleEntry | undefined {
  return BAND_SCALE.find((entry) => entry.band === band);
}

/**
 * Return the indicative CEFR level for a band score.
 *
 * @param band - Band score.
 */
export function cefrForBand(band: number): string {
  return bandScaleEntry(band)?.cefr ?? '-';
}
