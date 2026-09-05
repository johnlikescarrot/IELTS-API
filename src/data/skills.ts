/**
 * Test format blueprints, question-type strategy guides, indicative raw-score
 * tables and the study-system catalogue.
 *
 * The structure of this layer is informed by the large practice-test projects
 * that self-study communities actually build: full Listening papers of four
 * parts and 40 questions, full Reading papers of three passages and 40
 * questions, leveled lesson banks from CEFR A1 to C2, a stable taxonomy of
 * receptive question families (eleven for Reading, eight for Listening), a
 * fixed multi-step study cycle per passage, and phased plans that move from
 * foundations through timed full tests. All prose here — every blueprint
 * note, approach step, trap and timing tip — is original work written for this
 * project; no third-party test content is reproduced.
 */

import type {
  QuestionType,
  RawScoreRow,
  RawScoreTable,
  RawScoreTableId,
  Skill,
  SkillBlueprint,
  StudyPhase,
} from '../types.js';

/** Skills covered by the format blueprints, in test-report order. */
export const BLUEPRINT_SKILLS: readonly Skill[] = ['listening', 'reading', 'writing', 'speaking'];

/** Public format blueprints of the four IELTS papers. */
export const SKILL_BLUEPRINTS: readonly SkillBlueprint[] = [
  {
    skill: 'listening',
    name: 'Listening',
    sections: [
      {
        name: 'Part 1',
        minutes: 10,
        questions: 10,
        description: 'A conversation between two people in an everyday social context.',
      },
      {
        name: 'Part 2',
        minutes: 10,
        questions: 10,
        description: 'A monologue in an everyday social context, such as a local facility tour.',
      },
      {
        name: 'Part 3',
        minutes: 10,
        questions: 10,
        description: 'A conversation between up to four people in an educational or training context.',
      },
      {
        name: 'Part 4',
        minutes: 10,
        questions: 10,
        description: 'A monologue on an academic subject, such as a university lecture.',
      },
    ],
    totalMinutes: 30,
    totalQuestions: 40,
    notes: [
      'The recording is played once only.',
      'Paper-based candidates receive 10 minutes of transfer time after the recording.',
      'Each correct answer scores one mark; there is no penalty for wrong answers.',
    ],
  },
  {
    skill: 'reading',
    name: 'Reading',
    sections: [
      {
        name: 'Section 1',
        minutes: 20,
        questions: 13,
        description: 'The easiest passage; factual texts in General Training, one long text in Academic.',
      },
      {
        name: 'Section 2',
        minutes: 20,
        questions: 13,
        description: 'Work-related or descriptive texts; the second Academic passage.',
      },
      {
        name: 'Section 3',
        minutes: 20,
        questions: 14,
        description: 'The hardest passage; discursive texts in General Training, the third Academic passage.',
      },
    ],
    totalMinutes: 60,
    totalQuestions: 40,
    notes: [
      'Academic and General Training use different passages but the same timing and question count.',
      'There is no transfer time: answers must go directly onto the answer sheet.',
      'Spend roughly 20 minutes per section and leave the hardest questions for a second pass.',
    ],
  },
  {
    skill: 'writing',
    name: 'Writing',
    sections: [
      {
        name: 'Task 1',
        minutes: 20,
        questions: 0,
        description:
          'Describe visual information (Academic) or write a letter (General Training); at least 150 words.',
      },
      {
        name: 'Task 2',
        minutes: 40,
        questions: 0,
        description:
          'Write an essay in response to a point of view, argument or problem; at least 250 words.',
      },
    ],
    totalMinutes: 60,
    totalQuestions: 0,
    notes: [
      'Task 2 contributes twice as much as Task 1 to the Writing band score.',
      'Both tasks are human-marked against analytic criteria, so there is no raw-score table.',
      'Under-length responses are penalised; plan for at least 150 and 250 words respectively.',
    ],
  },
  {
    skill: 'speaking',
    name: 'Speaking',
    sections: [
      {
        name: 'Part 1',
        minutes: 5,
        questions: 0,
        description: 'Introduction and interview on familiar topics such as home, work and interests.',
      },
      {
        name: 'Part 2',
        minutes: 4,
        questions: 0,
        description:
          'A one-to-two-minute individual long turn on a cue card, after one minute of preparation.',
      },
      {
        name: 'Part 3',
        minutes: 5,
        questions: 0,
        description: 'A two-way discussion of abstract questions thematically linked to the Part 2 topic.',
      },
    ],
    totalMinutes: 14,
    totalQuestions: 0,
    notes: [
      'The interview lasts 11-14 minutes and is recorded.',
      'Part 2 allows one minute of preparation with paper and pencil for notes.',
      'The paper is human-marked, so there is no raw-score table.',
    ],
  },
];

/**
 * Find a format blueprint by skill.
 *
 * @param skill - Skill identifier.
 */
export function findSkillBlueprint(skill: string): SkillBlueprint | undefined {
  return SKILL_BLUEPRINTS.find((blueprint) => blueprint.skill === skill);
}

/* -------------------------------------------------------------------------- */
/* Question-type strategy guides                                              */
/* -------------------------------------------------------------------------- */

/** Compact question-type row: id, skill, name, description, 3 steps, 2 traps, timing tip. */
type QuestionTypeRow = readonly [
  string,
  'listening' | 'reading',
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

/** Receptive question families with original strategy guides. */
const QUESTION_TYPE_ROWS: readonly QuestionTypeRow[] = [
  [
    'listening-form-completion',
    'listening',
    'Form completion',
    'Complete a form with personal details such as names, numbers, dates and addresses, usually in Part 1.',
    'Read the form before the recording starts and predict the kind of information each gap needs.',
    'Listen for spelling: names and postcodes are almost always dictated letter by letter.',
    'Check singular versus plural and the word limit before you transfer the answer.',
    'Numbers read in pairs (double, triple) are easy to mis-split across two gaps.',
    'A corrected detail (no, actually ...) replaces the first one; the correction is the answer.',
    'Use the 30 seconds before the part to read every gap, not just the first few.',
  ],
  [
    'listening-note-completion',
    'listening',
    'Note completion',
    'Complete notes that summarise a talk or conversation, usually following the order of the recording.',
    'Underline keywords in the notes and listen for their paraphrases rather than the exact words.',
    'Track your place: if one gap passes, drop it immediately and rejoin at the next heading.',
    'Fit the answer to the grammar of the sentence around the gap.',
    'Synonyms replace the printed keywords, so waiting for the exact word means missing the answer.',
    'Two candidate answers are often mentioned; the second, qualified one is usually correct.',
    'Keep the question order in mind: note gaps always follow the recording in sequence.',
  ],
  [
    'listening-table-completion',
    'listening',
    'Table completion',
    'Complete a table of connected facts such as times, prices, features or comparisons across rows.',
    'Read the row and column headings so you know which dimension each gap belongs to.',
    'Predict units (currency, distance, time) from the cells that are already filled.',
    'Compare competing figures carefully; approximations mentioned first are distractors.',
    'A figure that belongs to a neighbouring row or column is the most common wrong answer.',
    'Speakers round, estimate and then correct themselves; only the final precise figure counts.',
    'Scan the whole table first: one understood row locates every gap faster than reading gaps alone.',
  ],
  [
    'listening-sentence-completion',
    'listening',
    'Sentence completion',
    'Complete sentences with words taken from the recording, respecting the stated word limit.',
    'Read each sentence and decide which word class (noun, number, adjective) the gap requires.',
    'Listen for the idea of the whole sentence, not for its printed words, which will be paraphrased.',
    'Copy the exact word form heard; changing a plural to a singular breaks the answer.',
    'Answers that exceed the word limit (ONE WORD ONLY) score zero even when the content is right.',
    'Answers beyond the limit are a frequent self-inflicted loss; count hyphenated words as one.',
    'Predict the answer type from grammar before listening, then verify it against what you hear.',
  ],
  [
    'listening-multiple-choice',
    'listening',
    'Multiple choice',
    'Choose one letter (or more) from three or four options, common from Part 2 onwards.',
    'Read the stem and all options first, underlining what distinguishes each option.',
    'Expect every option to be mentioned; listen for agreement, qualification or dismissal.',
    'Choose only on the speaker’s final position, after any hedging or change of mind.',
    'Options are paraphrased, so matching a heard word to a printed word is usually a trap.',
    'The first plausible option is frequently contradicted one sentence later.',
    'Spend pre-listening time on the differences between options, not on memorising them whole.',
  ],
  [
    'listening-matching',
    'listening',
    'Matching',
    'Match a list of items (people, places, features) to a set of options, often in Parts 2 and 3.',
    'Learn the option set by heart before the recording: you cannot re-read it while listening.',
    'Follow the item order strictly and strike through each option as it is used.',
    'Decide on current roles or facts, ignoring past history the speaker mentions in passing.',
    'One option is a distractor describing what someone used to do rather than does now.',
    'Two items can share surface vocabulary with the same option; only the precise match counts.',
    'Memorise the short option list first so your eyes stay on the numbered items during play.',
  ],
  [
    'listening-plan-map-labelling',
    'listening',
    'Plan, map and diagram labelling',
    'Label a plan, map or diagram by following spoken directions around labelled landmarks.',
    'Orient yourself before listening: find the start point, the compass and the labelled landmarks.',
    'Trace the route with your finger and mark each answer on the diagram as it is confirmed.',
    'Write the exact label letter or word; describing the location in your own words scores zero.',
    'Left and right flip when the speaker turns; track the speaker’s facing, not the page’s.',
    'Similar-sounding landmarks (reception versus restaurant) are placed adjacently on purpose.',
    'A ten-second orientation before the audio is worth more than a minute of re-reading after.',
  ],
  [
    'listening-short-answer',
    'listening',
    'Short-answer questions',
    'Answer questions with a short response within the stated word limit, usually in Parts 2 to 4.',
    'Read the question words (who, where, how many) so you know exactly what kind of fact to catch.',
    'Answer with the minimum words that carry the fact; extra words risk breaking the limit.',
    'Respect the limit exactly: an otherwise perfect answer with one word too many is wrong.',
    'The question is paraphrased in the recording, so the answer sits near synonyms, not echoes.',
    'Background explanation before the key fact tempts early answers; wait for the precise point.',
    'Identify the question word first: it tells you whether to listen for a person, place or number.',
  ],
  [
    'reading-multiple-choice',
    'reading',
    'Multiple choice',
    'Choose the best option for questions about detail, inference, opinion or the writer’s purpose.',
    'Read the stem first, then skim the options for the one or two words that separate them.',
    'Locate the relevant paragraph by scanning for names, numbers or rare content words.',
    'Match meaning, not words: the correct option paraphrases the passage, never copies it.',
    'An option that repeats passage wording exactly but changes one qualifier is the classic trap.',
    'Options that are true in general but do not answer this stem are planted deliberately.',
    'Eliminate two options on meaning before choosing; guessing between four is a last resort.',
  ],
  [
    'reading-true-false-not-given',
    'reading',
    'True / False / Not Given',
    'Decide whether statements agree with the passage (True/False) or are absent from it (Not Given).',
    'Break each statement into checkable parts: every part must match for True.',
    'Treat a single contradicting qualifier (some versus all, often versus always) as False.',
    'Choose Not Given only when the passage never addresses the claim, not when you are unsure.',
    'Near-synonym swaps that shift meaning slightly (reduce versus eliminate) signal False.',
    'Plausible real-world knowledge that the passage never states is Not Given, never True.',
    'Judge the statement against the passage alone; outside knowledge is the main source of errors.',
  ],
  [
    'reading-yes-no-not-given',
    'reading',
    'Yes / No / Not Given',
    'Decide whether statements agree with the writer’s opinions or claims rather than with facts.',
    'First locate the writer’s claim, separating it from facts or other people’s views quoted nearby.',
    'Answer against the writer’s position: a true fact the writer disputes is still No.',
    'Reserve Not Given for claims the writer never takes a position on.',
    'Quoted experts often disagree with the writer; attributing their view to the writer is the trap.',
    'Tentative language (may, suggests, appears) weakens a strong statement into No or Not Given.',
    'Ask whose view is tested in every statement before you compare it with the passage.',
  ],
  [
    'reading-matching-information',
    'reading',
    'Matching information',
    'Match statements or features to the paragraph (A-G) that contains them.',
    'Skim all paragraphs for their function first so each statement has a shortlist of homes.',
    'Scan for distinctive nouns and numbers from the statement rather than reading every line.',
    'Confirm the full statement in the paragraph; one matching phrase is not enough.',
    'The same detail echoed in two paragraphs must be resolved by the complete statement.',
    'Paraphrase-heavy statements hide behind synonyms; exact-word scanning alone misses them.',
    'Map paragraph functions first: most statements then have only one plausible home.',
  ],
  [
    'reading-matching-headings',
    'reading',
    'Matching headings',
    'Choose the heading that expresses the main idea of each paragraph or section.',
    'Read each paragraph fully before looking at the heading list to avoid option-led reading.',
    'Select the heading that covers the whole paragraph, not the one matching its example.',
    'Discard headings that match a striking detail but miss the paragraph’s overall point.',
    'Two headings often share vocabulary with the paragraph; only one captures its argument.',
    'Examples and anecdotes illustrate the idea but never define it; do not head a paragraph by them.',
    'Summarise each paragraph in five words of your own, then find the heading closest to that.',
  ],
  [
    'reading-matching-features',
    'reading',
    'Matching features',
    'Match items such as researchers, theories or discoveries to a set of options.',
    'Collect every named item first, noting the paragraph where each one appears.',
    'Read around each name: the tested feature usually sits in the same sentence or the next.',
    'Keep attributions exact when two names share one paragraph.',
    'A feature mentioned next to a name as background, not as their claim, is the standard trap.',
    'Similar achievements by different people must be separated by verbs (proposed versus proved).',
    'Index names to paragraphs before reading options; the matching then becomes mechanical.',
  ],
  [
    'reading-matching-sentence-endings',
    'reading',
    'Matching sentence endings',
    'Complete sentence stems with the correct ending from a list, testing logical relations.',
    'Read all stems and endings first, underlining the logical connectors (because, although, by).',
    'Match grammar first: tense, articles and prepositions eliminate half the endings.',
    'Verify the full completed sentence against the passage before committing.',
    'Endings that complete the sentence grammatically but contradict the passage fool hasty readers.',
    'Extra endings guarantee that elimination alone cannot finish the set; verify each choice.',
    'Grammar eliminates, the passage decides: apply the two filters in that order.',
  ],
  [
    'reading-sentence-completion',
    'reading',
    'Sentence completion',
    'Complete sentences with words taken from the passage, respecting the stated word limit.',
    'Predict the word class of each gap from the surrounding grammar before scanning.',
    'Locate the source sentence by its rare content words, then copy the exact span.',
    'Copy words unchanged: the gap’s grammar already constrains the correct form.',
    'A grammatically smooth answer drawn from the wrong sentence is the most frequent error.',
    'Changing a plural, tense or article to fit your own phrasing breaks an otherwise right answer.',
    'Find the source sentence first; the gap almost answers itself once the sentence is located.',
  ],
  [
    'reading-summary-completion',
    'reading',
    'Summary, note, table and flow-chart completion',
    'Complete a summary or structured note that condenses a section of the passage.',
    'Read the summary first: its narrative tells you which part of the passage to search.',
    'Follow the summary order, which mirrors the passage order, and track your place strictly.',
    'Choose words that preserve the summary’s logic, not just words from nearby sentences.',
    'Word-bank options that fit the gap grammatically but distort the summary’s argument are traps.',
    'Without a word bank, the exact passage wording is required; synonyms score zero.',
    'Understand the summary’s story before scanning: it halves the search space.',
  ],
  [
    'reading-diagram-labelling',
    'reading',
    'Diagram label completion',
    'Label a diagram of a device, process or structure using words from the passage.',
    'Study the diagram first so each label has a spatial anchor before you read.',
    'Find the passage paragraph that describes the labelled part by its function, not its name.',
    'Respect the word limit and copy technical terms exactly as printed.',
    'Labels for adjacent parts swap easily; confirm each label against its arrow, not its neighbour.',
    'A correct term placed on the wrong label scores zero, however well understood.',
    'Anchor every label to the diagram before reading: location disambiguates similar terms.',
  ],
  [
    'reading-short-answer',
    'reading',
    'Short-answer questions',
    'Answer questions with words from the passage inside the stated word limit.',
    'Parse the question word to fix the answer type: who, where, when, how many.',
    'Scan for the question’s content words, then read the enclosing sentences closely.',
    'Answer with the shortest exact span that carries the fact.',
    'Padding the answer with context words breaks the word limit and the mark.',
    'The answer sits in the sentence that paraphrases the question, not the one echoing it.',
    'One question, one fact: stop copying as soon as the asked-for information is complete.',
  ],
];

/** Receptive question families with original strategy guides. */
export const QUESTION_TYPES: readonly QuestionType[] = QUESTION_TYPE_ROWS.map(
  ([id, skill, name, description, step1, step2, step3, trap1, trap2, timingTip]) => ({
    id,
    skill,
    name,
    description,
    approach: [step1, step2, step3],
    traps: [trap1, trap2],
    timingTip,
  }),
);

/** Question-type skills available as a filter. */
export const QUESTION_TYPE_SKILLS: readonly string[] = ['listening', 'reading'];

/**
 * Find question types, optionally restricted to one skill.
 *
 * @param skill - Skill filter; `undefined` returns every family.
 */
export function findQuestionTypes(skill: string | undefined): readonly QuestionType[] {
  if (skill === undefined) {
    return QUESTION_TYPES;
  }
  return QUESTION_TYPES.filter((family) => family.skill === skill);
}

/**
 * Find one question-type family by identifier.
 *
 * @param id - Family identifier.
 */
export function findQuestionType(id: string): QuestionType | undefined {
  return QUESTION_TYPES.find((family) => family.id === id);
}

/* -------------------------------------------------------------------------- */
/* Indicative raw-score tables                                                */
/* -------------------------------------------------------------------------- */

/** Build rows from `[min, max, band]` triples. */
function rawRows(triples: readonly (readonly [number, number, number])[]): RawScoreRow[] {
  return triples.map(([min, max, band]) => ({ min, max, band }));
}

const RAW_NOTE =
  'Indicative mapping compiled from the IELTS partners’ published band-score guidance. ' +
  'Test versions vary in difficulty and institutions apply their own rules; do not use this ' +
  'as an admissions decision rule.';

/** Indicative raw-score to band-score tables for the machine-marked papers. */
export const RAW_SCORE_TABLES: readonly RawScoreTable[] = [
  {
    id: 'listening',
    name: 'Listening raw-score to band-score mapping',
    questions: 40,
    provider: 'IELTS partners (British Council, IDP, Cambridge)',
    sourceUrl: 'https://www.ielts.org/for-test-takers/how-ielts-is-scored',
    provenance: 'indicative',
    note: RAW_NOTE,
    rows: rawRows([
      [39, 40, 9],
      [37, 38, 8.5],
      [35, 36, 8],
      [32, 34, 7.5],
      [30, 31, 7],
      [26, 29, 6.5],
      [23, 25, 6],
      [18, 22, 5.5],
      [16, 17, 5],
      [13, 15, 4.5],
      [11, 12, 4],
      [8, 10, 3.5],
      [6, 7, 3],
      [4, 5, 2.5],
    ]),
  },
  {
    id: 'reading-academic',
    name: 'Academic Reading raw-score to band-score mapping',
    questions: 40,
    provider: 'IELTS partners (British Council, IDP, Cambridge)',
    sourceUrl: 'https://www.ielts.org/for-test-takers/how-ielts-is-scored',
    provenance: 'indicative',
    note: RAW_NOTE,
    rows: rawRows([
      [39, 40, 9],
      [37, 38, 8.5],
      [35, 36, 8],
      [33, 34, 7.5],
      [30, 32, 7],
      [27, 29, 6.5],
      [23, 26, 6],
      [19, 22, 5.5],
      [15, 18, 5],
      [13, 14, 4.5],
      [10, 12, 4],
      [8, 9, 3.5],
      [6, 7, 3],
      [4, 5, 2.5],
    ]),
  },
  {
    id: 'reading-general',
    name: 'General Training Reading raw-score to band-score mapping',
    questions: 40,
    provider: 'IELTS partners (British Council, IDP, Cambridge)',
    sourceUrl: 'https://www.ielts.org/for-test-takers/how-ielts-is-scored',
    provenance: 'indicative',
    note: RAW_NOTE,
    rows: rawRows([
      [40, 40, 9],
      [39, 39, 8.5],
      [37, 38, 8],
      [36, 36, 7.5],
      [34, 35, 7],
      [32, 33, 6.5],
      [30, 31, 6],
      [27, 29, 5.5],
      [23, 26, 5],
      [19, 22, 4.5],
      [15, 18, 4],
      [12, 14, 3.5],
      [9, 11, 3],
      [6, 8, 2.5],
    ]),
  },
];

/** Raw-score table identifiers accepted by `/v1/scores/raw`. */
export const RAW_SCORE_TABLE_IDS: readonly RawScoreTableId[] = [
  'listening',
  'reading-academic',
  'reading-general',
];

/**
 * Find a raw-score table by identifier.
 *
 * @param id - Table identifier.
 */
export function findRawScoreTable(id: string): RawScoreTable | undefined {
  return RAW_SCORE_TABLES.find((table) => table.id === id);
}

/* -------------------------------------------------------------------------- */
/* Study system: cycle, phases and CEFR ladder                                */
/* -------------------------------------------------------------------------- */

/**
 * The six-step study cycle applied to every practice passage or paper: prime
 * the material, attempt it under time, analyse errors, extract vocabulary,
 * review deeply and log progress.
 */
export const STUDY_CYCLE_STEPS: readonly string[] = [
  'Preview: skim titles, headings and questions to predict the topic and the information you must find.',
  'Timed attempt: complete the material under real test timing without pausing the clock.',
  'Error analysis: mark every wrong answer and write down in one sentence why each one was wrong.',
  'Vocabulary extraction: collect 15-25 important words and collocations with their source sentences.',
  'Deep review: re-read the material, analyse its structure and note how key ideas are paraphrased.',
  'Progress log: record the date, score, error causes and next focus so trends stay visible.',
];

/** Phases of a generated study plan, with the share of weeks each one takes. */
export const STUDY_PHASES: readonly StudyPhase[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    share: 0.25,
    focus: [
      'Core grammar and high-frequency academic vocabulary.',
      'Untimed practice to learn every question family.',
      'One skill per session with the six-step study cycle.',
    ],
    exit: 'You can complete any question family untimed with at most one error per set.',
  },
  {
    id: 'skill-building',
    name: 'Skill building',
    share: 0.3,
    focus: [
      'Timed single sections with error-cause logging.',
      'Targeted drills on your two weakest question families.',
      'Weekly vocabulary review from your extraction log.',
    ],
    exit: 'Single sections finish inside their time budget at your current band plus 0.5.',
  },
  {
    id: 'test-readiness',
    name: 'Test readiness',
    share: 0.25,
    focus: [
      'Full timed papers under test-day conditions.',
      'Answer-sheet discipline, including transfer time for Listening.',
      'Review of every full paper with the six-step study cycle.',
    ],
    exit: 'Two consecutive full papers score within 0.5 of your target band.',
  },
  {
    id: 'polish',
    name: 'Polish',
    share: 0.2,
    focus: [
      'Light timed practice to hold form without fatigue.',
      'Revision of logged error causes and vocabulary only.',
      'Test-day routine: sleep, timing plan and question order.',
    ],
    exit: 'You trust your timing plan and your error log shows no repeated cause.',
  },
];

/** CEFR levels with their indicative IELTS range and study focus. */
export const CEFR_LADDER: readonly { level: string; ielts: [number, number]; focus: string }[] = [
  { level: 'A1', ielts: [2.5, 3.5], focus: 'Everyday vocabulary and simple sentences.' },
  { level: 'A2', ielts: [3.5, 4.5], focus: 'Short texts and routine listening with familiar topics.' },
  { level: 'B1', ielts: [4, 5.5], focus: 'Independent handling of straightforward academic material.' },
  { level: 'B2', ielts: [5.5, 6.5], focus: 'The most common university entry range; argue and paraphrase.' },
  { level: 'C1', ielts: [6.5, 8], focus: 'Fast, accurate reading and precise academic writing.' },
  { level: 'C2', ielts: [8, 9], focus: 'Near-native precision and full timing discipline.' },
];
