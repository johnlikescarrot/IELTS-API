/**
 * IELTS Practice Metadata and Curriculum Catalogue.
 *
 * This dataset indexes all 1,852 observed practice units across the four
 * learning collections in the open `UPGRADE-YOUR-IELTS-SKILLS` study set:
 *
 * 1. Reading Basic (1,232 units): A1_A2 (198), B1_B2 (374), C1_C2 (660).
 * 2. Reading Full Tests (314 units): Tests 1 to 315 (skipping missing Test 105).
 * 3. Listening Basic (102 units): Basic (34), Intermediate (34), Advanced (34).
 * 4. Listening Full Tests (204 units): Tests 1 to 204 (audio missing for 83, 85, 88).
 *
 * It also provides 17 comprehensive task-family strategies (11 Academic Reading,
 * 6 Listening) and the 6-step IELTS study framework.
 */

import { paginate, matchesQuery } from '../lib/search.js';
import { seededIndices } from '../lib/rng.js';

import type { Page } from '../lib/search.js';
import type {
  PracticeCollection,
  PracticeLevel,
  PracticeMeta,
  PracticeStats,
  PracticeStrategy,
  PracticeUnit,
  Skill,
  StudyStep,
} from '../types.js';

export const PRACTICE_COLLECTIONS: readonly PracticeCollection[] = [
  'reading-basic',
  'reading-full',
  'listening-basic',
  'listening-full',
];

export const PRACTICE_LEVELS: readonly PracticeLevel[] = [
  'A1_A2',
  'B1_B2',
  'C1_C2',
  'Basic',
  'Intermediate',
  'Advanced',
  'FullTest',
];

export const PRACTICE_SKILLS: readonly ('reading' | 'listening')[] = ['reading', 'listening'];

/** Zero-pad an integer into a fixed-width string. */
function pad(num: number, width = 3): string {
  return String(num).padStart(width, '0');
}

/** Build the deterministic metadata catalogue of all 1,852 practice units. */
function buildPracticeUnits(): readonly PracticeUnit[] {
  const units: PracticeUnit[] = [];

  // 1. Reading Basic (1,232 units)
  // A1_A2: 198 units
  for (let i = 1; i <= 198; i += 1) {
    units.push({
      id: `reading-basic-a1-a2-${pad(i)}`,
      skill: 'reading',
      collection: 'reading-basic',
      unitNumber: i,
      level: 'A1_A2',
      title: `Reading Basic Lesson ${i} (A1-A2)`,
      hasAudio: false,
      hasStrategy: false,
      sourcePath: `Reading_1232_Basic/Reading_A1_A2/lesson_${i}.json`,
    });
  }

  // B1_B2: 374 units
  for (let i = 1; i <= 374; i += 1) {
    units.push({
      id: `reading-basic-b1-b2-${pad(i)}`,
      skill: 'reading',
      collection: 'reading-basic',
      unitNumber: i,
      level: 'B1_B2',
      title: `Reading Basic Lesson ${i} (B1-B2)`,
      hasAudio: false,
      hasStrategy: false,
      sourcePath: `Reading_1232_Basic/Reading_B1_B2/lesson_${i}.json`,
    });
  }

  // C1_C2: 660 units
  for (let i = 1; i <= 660; i += 1) {
    units.push({
      id: `reading-basic-c1-c2-${pad(i)}`,
      skill: 'reading',
      collection: 'reading-basic',
      unitNumber: i,
      level: 'C1_C2',
      title: `Reading Basic Lesson ${i} (C1-C2)`,
      hasAudio: false,
      hasStrategy: false,
      sourcePath: `Reading_1232_Basic/Reading_C1_C2/lesson_${i}.json`,
    });
  }

  // 2. Reading Full Tests (314 units: Tests 1 to 315 excluding missing Test 105)
  for (let i = 1; i <= 315; i += 1) {
    if (i === 105) {
      continue; // Test_105 is absent in upstream repository
    }
    units.push({
      id: `reading-full-${pad(i)}`,
      skill: 'reading',
      collection: 'reading-full',
      unitNumber: i,
      level: 'FullTest',
      title: `Reading Full Test ${i}`,
      hasAudio: false,
      hasStrategy: i <= 20,
      sourcePath: `Reading_315_FullTest/Test_${i}`,
    });
  }

  // 3. Listening Basic (102 units: Basic 34, Intermediate 34, Advanced 34)
  for (let i = 1; i <= 34; i += 1) {
    units.push({
      id: `listening-basic-basic-${pad(i)}`,
      skill: 'listening',
      collection: 'listening-basic',
      unitNumber: i,
      level: 'Basic',
      title: `Listening Basic Lesson ${i} (Basic)`,
      hasAudio: true,
      hasStrategy: false,
      sourcePath: `Listening_102_Basic/Basic/Lesson_${i}`,
    });
  }

  for (let i = 1; i <= 34; i += 1) {
    units.push({
      id: `listening-basic-intermediate-${pad(i)}`,
      skill: 'listening',
      collection: 'listening-basic',
      unitNumber: i,
      level: 'Intermediate',
      title: `Listening Basic Lesson ${i} (Intermediate)`,
      hasAudio: true,
      hasStrategy: false,
      sourcePath: `Listening_102_Basic/Intermediate/Lesson_${i}`,
    });
  }

  for (let i = 1; i <= 34; i += 1) {
    units.push({
      id: `listening-basic-advanced-${pad(i)}`,
      skill: 'listening',
      collection: 'listening-basic',
      unitNumber: i,
      level: 'Advanced',
      title: `Listening Basic Lesson ${i} (Advanced)`,
      hasAudio: true,
      hasStrategy: false,
      sourcePath: `Listening_102_Basic/Advanced/Lesson_${i}`,
    });
  }

  // 4. Listening Full Tests (204 units: Tests 1 to 204)
  // Audio is missing for tests 83, 85, and 88
  const missingAudioTests = new Set([83, 85, 88]);
  for (let i = 1; i <= 204; i += 1) {
    units.push({
      id: `listening-full-${pad(i)}`,
      skill: 'listening',
      collection: 'listening-full',
      unitNumber: i,
      level: 'FullTest',
      title: `Listening Full Test ${i}`,
      hasAudio: !missingAudioTests.has(i),
      hasStrategy: i <= 20,
      sourcePath: `Listening_204_FullTest/Test_${i}`,
    });
  }

  return Object.freeze(units);
}

/** Complete catalog of 1,852 practice units. */
export const PRACTICE_UNITS: readonly PracticeUnit[] = buildPracticeUnits();

/** Provenance metadata for the practice catalogue. */
export const PRACTICE_META: PracticeMeta = {
  name: 'IELTS Practice Metadata and Curriculum Catalogue',
  source: 'UPGRADE YOUR IELTS SKILLS study set',
  sourceUrl: 'https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS',
  totalUnits: PRACTICE_UNITS.length,
  declaredUnits: 1853,
  missingUnits: 1,
  collections: PRACTICE_COLLECTIONS.length,
  license: 'CC BY 4.0',
  attribution:
    'Practice inventory, structure audit and metadata compiled from the open repository; task family strategies are original.',
  note: 'Test_105 is missing in upstream Reading full tests; audio is missing for Listening full tests 83, 85, and 88.',
};

/** Task family strategies for Reading and Listening. */
export const PRACTICE_STRATEGIES: readonly PracticeStrategy[] = [
  // ------------------------------------------------------------- 11 Reading
  {
    id: 'multiple-choice',
    skill: 'reading',
    name: 'Multiple Choice',
    category: 'Global Understanding & Specific Detail',
    description:
      'Candidates choose the single correct answer from four options (A, B, C, D) or select multiple letters from a longer list of options based on the text.',
    officialUrl: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
    recommendedSteps: [
      'Read the question stem carefully and underline key content words and qualifiers.',
      'Locate the relevant section of the passage using keywords from the stem before reading all options.',
      'Read the passage section thoroughly to form your own answer in your mind.',
      'Compare your understanding with the options and eliminate obvious distractors.',
      'Watch for synonyms and paraphrases rather than matching verbatim words.',
    ],
    tips: [
      'Options that repeat exact words from the text are frequently distractors.',
      'Pay close attention to qualifying words such as "always", "rarely", "mostly", "initially".',
    ],
    pitfalls: [
      'Selecting an option because it is a true statement in reality, even though it is not stated in the passage.',
      'Falling for half-true options where the second half contradicts the text.',
    ],
    suggestedMinutes: 1.5,
  },
  {
    id: 'true-false-not-given',
    skill: 'reading',
    name: 'Identifying Information (True / False / Not Given)',
    category: 'Information Verification',
    description:
      'Candidates determine whether statements agree with, contradict, or are not mentioned in the factual information of the passage.',
    officialUrl: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
    recommendedSteps: [
      'Read the statement and identify the central claim and key qualifiers (e.g. all, some, never, increase).',
      'Scan the passage for the specific subject or proper nouns in the statement.',
      'Evaluate the relationship: Agree = TRUE, Contradict/Opposite = FALSE, Cannot be determined = NOT GIVEN.',
      'Verify that you did not make external assumptions beyond what is strictly written.',
    ],
    tips: [
      'Questions generally follow the chronological order of the passage.',
      'FALSE means the text explicitly states the opposite; NOT GIVEN means the text does not contain enough info to confirm or deny.',
    ],
    pitfalls: [
      'Confusing FALSE with NOT GIVEN: if the text does not say the opposite, it is NOT GIVEN.',
      'Bringing personal background knowledge into the decision.',
    ],
    suggestedMinutes: 1.5,
  },
  {
    id: 'yes-no-not-given',
    skill: 'reading',
    name: "Identifying Writer's Views / Claims (Yes / No / Not Given)",
    category: 'Author Perspective & Argumentation',
    description:
      "Candidates evaluate whether statements reflect the writer's opinions, arguments, or claims rather than pure factual statements.",
    officialUrl: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
    recommendedSteps: [
      'Identify whether the statement asserts an opinion, claim, or viewpoint of the author.',
      'Locate where the writer discusses this opinion in the text.',
      'Decide: YES if it matches the writer view, NO if it contradicts the writer view, NOT GIVEN if the writer expresses no view on this point.',
    ],
    tips: [
      'Look for stance markers such as "suggests", "argues", "it seems", "undoubtedly", "regrettably".',
      'Do not write TRUE/FALSE on your answer sheet when the question specifies YES/NO.',
    ],
    pitfalls: [
      'Attributing an interviewed researcher opinion to the author when the author merely reported it.',
    ],
    suggestedMinutes: 1.5,
  },
  {
    id: 'matching-information',
    skill: 'reading',
    name: 'Matching Information to Paragraphs',
    category: 'Scanning & Text Structure',
    description:
      'Candidates match numbered statements (such as explanations, examples, descriptions, or reasons) to specific lettered paragraphs in the text.',
    officialUrl: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
    recommendedSteps: [
      'Read all statements first and identify the type of information required (e.g., a reference to X, a reason for Y, a comparison of Z).',
      'Skim paragraphs to understand their function and thematic content.',
      'Check for "NB: You may use any letter more than once" note.',
    ],
    tips: [
      'This question type does NOT follow paragraph order.',
      'Leave this question type until after other paragraph-based questions if possible, as you will already be familiar with the text.',
    ],
    pitfalls: [
      'Looking for identical words rather than the functional relationship described in the prompt.',
    ],
    suggestedMinutes: 2.0,
  },
  {
    id: 'matching-headings',
    skill: 'reading',
    name: 'Matching Headings',
    category: 'Global Understanding',
    description:
      'Candidates match Roman numeral headings representing main ideas to the appropriate paragraphs or sections of the text.',
    officialUrl: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
    recommendedSteps: [
      'Read the list of headings and underline keywords, noting similarities and differences between them.',
      'Read each paragraph from beginning to end, focusing on the main idea rather than isolated details.',
      'Formulate your own summary of the paragraph and match it with the best heading candidate.',
      'Cross off used headings (each heading is used at most once unless stated otherwise).',
    ],
    tips: [
      'The main idea is often in the first or last sentences of a paragraph, but can be developed throughout.',
      'There are always more headings than paragraphs.',
    ],
    pitfalls: [
      'Matching a heading based on a single supporting word rather than the core topic of the paragraph.',
    ],
    suggestedMinutes: 1.5,
  },
  {
    id: 'matching-features',
    skill: 'reading',
    name: 'Matching Features',
    category: 'Categorisation & Reference',
    description:
      'Candidates match statements or opinions to a list of options (e.g., people, historical periods, scientific theories, places).',
    officialUrl: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
    recommendedSteps: [
      'Scan the whole text first and circle/highlight all occurrences of each feature name (e.g., Dr Smith, Prof Jones).',
      'Read what each person/theory says or discovered in context.',
      'Match the statement to the person who made that specific discovery or expressed that view.',
    ],
    tips: [
      'Some names may be mentioned across multiple paragraphs.',
      'Look for reporting verbs (stated, found, proposed, contended).',
    ],
    pitfalls: [
      'Selecting the first name that appears near a keyword without verifying the syntactic attribution.',
    ],
    suggestedMinutes: 1.5,
  },
  {
    id: 'matching-sentence-endings',
    skill: 'reading',
    name: 'Matching Sentence Endings',
    category: 'Syntactic & Semantic Cohesion',
    description: 'Candidates match sentence beginnings with the correct endings chosen from a provided list.',
    officialUrl: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
    recommendedSteps: [
      'Read the sentence beginning and identify key ideas and grammatical requirements (e.g., singular/plural verb, preposition).',
      'Locate the corresponding section in the text (questions follow chronological order).',
      'Select the ending that is grammatically correct and accurately reflects the passage meaning.',
    ],
    tips: [
      'Eliminate endings that create grammatically invalid English sentences.',
      'Always verify both grammatical compatibility and textual truth.',
    ],
    pitfalls: ['Selecting an ending that is grammatically correct but factually unsupported by the passage.'],
    suggestedMinutes: 1.5,
  },
  {
    id: 'sentence-completion',
    skill: 'reading',
    name: 'Sentence Completion',
    category: 'Detail & Lexical Precision',
    description:
      'Candidates fill in gaps in sentences using exact words taken directly from the passage within a specified word limit.',
    officialUrl: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
    recommendedSteps: [
      'Check the word limit instruction (e.g., "NO MORE THAN TWO WORDS AND/OR A NUMBER").',
      'Read the incomplete sentence and predict the required part of speech (noun, verb, adjective) and semantic role.',
      'Locate the information in the text (follows text order).',
      'Copy the exact word(s) from the text without changing their grammatical form or spelling.',
    ],
    tips: [
      'Never exceed the word limit; hyphenated words count as single words.',
      'Do not alter verb tenses or noun plurality from the passage text.',
    ],
    pitfalls: [
      'Spelling errors or altering the word ending (e.g., writing "adaptation" when the passage says "adapting").',
    ],
    suggestedMinutes: 1.5,
  },
  {
    id: 'summary-completion',
    skill: 'reading',
    name: 'Summary, Note, Table, Flow-chart Completion',
    category: 'Synthesis & Structured Completion',
    description:
      'Candidates complete gaps in a summary or tabular note, choosing either words from a box of options or exact words from the reading passage.',
    officialUrl: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
    recommendedSteps: [
      'Identify whether words must come directly from the passage or from a box of synonyms.',
      'Skim the summary title and headings to locate the corresponding passage section.',
      'Analyse the gap grammatically (subject, object, adjective, prepositional phrase).',
      'Search the passage for the matching ideas and insert the exact word or matching synonym.',
    ],
    tips: [
      'Summaries often condense a specific part (1-3 paragraphs) of the reading passage.',
      'If choosing from a box of options, look for synonyms of the words found in the passage.',
    ],
    pitfalls: ['Failing to check if the chosen word makes the completed sentence grammatically sound.'],
    suggestedMinutes: 1.5,
  },
  {
    id: 'diagram-label-completion',
    skill: 'reading',
    name: 'Diagram Label Completion',
    category: 'Visual & Technical Completion',
    description:
      'Candidates label parts of a diagram, technical drawing, or machine mechanism using words from the text.',
    officialUrl: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
    recommendedSteps: [
      'Examine the diagram, its title, labels, and directional arrows indicating sequences or flows.',
      'Locate the descriptive paragraph in the passage that explains the mechanism or structure.',
      'Follow spatial and directional clues (e.g. top, bottom, inlet, chamber, outer layer).',
      'Extract the exact technical noun phrases complying with the word limit.',
    ],
    tips: ['Diagrams usually describe a physical process or machine explained in a single passage section.'],
    pitfalls: ['Writing full sentences when only a concise noun phrase label is required.'],
    suggestedMinutes: 1.5,
  },
  {
    id: 'short-answer-questions',
    skill: 'reading',
    name: 'Short-Answer Questions',
    category: 'Factual Retrieval',
    description:
      'Candidates answer factual questions about details in the text using words and/or numbers from the passage.',
    officialUrl: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
    recommendedSteps: [
      'Read the question and identify the interrogative focus (What, Who, Where, When, How much, Why).',
      'Locate the answer in the text (questions follow passage order).',
      'Extract the concise factual answer without adding unnecessary filler words.',
    ],
    tips: [
      'Adhere strictly to the word count limit.',
      'Answers are typically concise noun phrases, numbers, or dates.',
    ],
    pitfalls: ['Including auxiliary words that push the answer over the word limit.'],
    suggestedMinutes: 1.5,
  },

  // ------------------------------------------------------------ 6 Listening
  {
    id: 'multiple-choice',
    skill: 'listening',
    name: 'Multiple Choice',
    category: 'Auditory Comprehension',
    description:
      'Candidates select the correct option from 3 choices (A, B, C) or select several answers from a longer list while listening to the recording.',
    officialUrl:
      'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening',
    recommendedSteps: [
      'Use the 30-45 seconds pre-listening time to underline key words in both question stems and options.',
      'Anticipate synonyms and paraphrases for each option.',
      'Listen for transition signposts (e.g., "however", "in fact", "on the other hand").',
      'Be alert for self-corrections where a speaker changes their mind.',
    ],
    tips: [
      'All options are usually mentioned in the recording to distract you; listen for the one that specifically answers the question stem.',
    ],
    pitfalls: [
      'Selecting an option immediately upon hearing a keyword before listening to the whole sentence.',
    ],
    suggestedMinutes: 1.0,
  },
  {
    id: 'matching',
    skill: 'listening',
    name: 'Matching',
    category: 'Auditory Classification',
    description:
      'Candidates match a numbered list of items from the listening text to a set of options in a box.',
    officialUrl:
      'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening',
    recommendedSteps: [
      'Carefully read both the question list and the option list before audio starts.',
      'Focus on the relationship or criteria defined in the question.',
      'Keep your eyes on the options list while listening as questions are heard in order.',
    ],
    tips: ['Options are often paraphrased in the audio using synonyms.'],
    pitfalls: ['Losing track of the current question number when speakers transition quickly.'],
    suggestedMinutes: 1.0,
  },
  {
    id: 'plan-map-diagram-labelling',
    skill: 'listening',
    name: 'Plan, Map, Diagram Labelling',
    category: 'Spatial Orientation',
    description:
      'Candidates complete labels on a building plan, campus map, or mechanical diagram as directed by the speaker.',
    officialUrl:
      'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening',
    recommendedSteps: [
      'Identify the starting point (e.g. entrance, reception, current location marker).',
      'Note compass points (North, South, East, West) or relative orientations (left, right, straight ahead).',
      'Follow the speaker navigation path continuously with a pencil or finger.',
    ],
    tips: [
      'Listen for prepositional phrases: "adjacent to", "opposite", "corridor on your left", "bend in the road".',
    ],
    pitfalls: ['Confusing left and right relative to the speaker orientation on the map.'],
    suggestedMinutes: 1.0,
  },
  {
    id: 'form-note-table-flow-chart-summary-completion',
    skill: 'listening',
    name: 'Form, Note, Table, Flow-chart, Summary Completion',
    category: 'Note-Taking & Specific Information',
    description:
      'Candidates fill in blanks in an outline, customer record form, structured table, or summary using information from the audio.',
    officialUrl:
      'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening',
    recommendedSteps: [
      'Check word limit restrictions.',
      'Predict the type of word needed for each blank: surname, phone number, date, currency, plural noun, measurement.',
      'Listen for spelling prompts when unusual names or addresses are read.',
    ],
    tips: [
      'Double letters and numbers: "double eight", "oh" for zero.',
      'Ensure proper capitalisation for proper nouns (days, months, names).',
    ],
    pitfalls: ['Spelling mistakes or failing to write singular/plural forms accurately.'],
    suggestedMinutes: 1.0,
  },
  {
    id: 'sentence-completion',
    skill: 'listening',
    name: 'Sentence Completion',
    category: 'Grammatical Audio Recall',
    description:
      'Candidates fill in the gaps of sentences that summarise key points from the listening recording.',
    officialUrl:
      'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening',
    recommendedSteps: [
      'Read the sentence and predict grammatical class and meaning.',
      'Listen for synonyms of the sentence keywords leading up to the blank.',
      'Write the exact word heard without alteration.',
    ],
    tips: ['Check that the completed sentence is grammatically correct.'],
    pitfalls: ['Writing more words than allowed by the instruction.'],
    suggestedMinutes: 1.0,
  },
  {
    id: 'short-answer-questions',
    skill: 'listening',
    name: 'Short-Answer Questions',
    category: 'Specific Fact Retrieval',
    description:
      'Candidates write short answers to factual questions based on information heard in the recording.',
    officialUrl:
      'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening',
    recommendedSteps: [
      'Identify question words (What time, How many, Which department).',
      'Focus on the exact piece of requested information.',
      'Keep answers succinct and within the word limit.',
    ],
    tips: ['Numbers can be written as figures (e.g. "15" instead of "fifteen").'],
    pitfalls: ['Including unnecessary filler words that breach the word count limit.'],
    suggestedMinutes: 1.0,
  },
];

/** The 6-step IELTS study methodology. */
export const STUDY_FRAMEWORK_STEPS: readonly StudyStep[] = [
  {
    step: 1,
    name: 'Pre-Reading / Pre-Listening',
    targetTime: '2-3 minutes',
    objective: 'Activate schema and anticipate test items',
    actions: [
      'Skim headings, subheadings, diagrams and question stems',
      'Identify keywords and predict target answer types',
      'Formulate initial mental map of the text/audio structure',
    ],
    output: 'Underlined keywords and semantic expectations',
  },
  {
    step: 2,
    name: 'Timed Execution',
    targetTime: 'Reading: 20 min/passage | Listening: 30 min full',
    objective: 'Simulate official exam conditions',
    actions: [
      'Complete exercise under strict time limits with no pauses',
      'Transfer answers promptly',
      'Avoid looking up definitions during the run',
    ],
    output: 'Completed raw answer sheet',
  },
  {
    step: 3,
    name: 'Scoring & Error Categorisation',
    targetTime: '10-15 minutes',
    objective: 'Diagnose specific failure mechanisms',
    actions: [
      'Compare raw answers against answer keys',
      'Tag each mistake with error taxonomy (distractor trap, vocabulary gap, time pressure, misread prompt, spelling/grammar)',
    ],
    output: 'Error taxonomy breakdown with specific failure tags',
  },
  {
    step: 4,
    name: 'Academic Vocabulary Extraction',
    targetTime: '15-20 minutes',
    objective: 'Expand lexical resource and collocations',
    actions: [
      'Extract 15-25 high-utility academic words, collocations, or topic phrases from the text/transcript',
      'Record part of speech, phonetic transcription, and contextual usage',
    ],
    output: 'Curated vocabulary list with sample sentence contexts',
  },
  {
    step: 5,
    name: 'Deep Paraphrase & Discourse Analysis',
    targetTime: '15-20 minutes',
    objective: 'Master IELTS paraphrase patterns and argumentation',
    actions: [
      'Map each question phrase to its exact paraphrased counterpart in the passage/transcript',
      'Analyse distractors to see why wrong options were plausible',
      'Review text cohesive devices and discourse markers',
    ],
    output: 'Two-column paraphrase mapping table',
  },
  {
    step: 6,
    name: 'Progress Logging & Band Tracking',
    targetTime: '5 minutes',
    objective: 'Maintain empirical learning trajectory',
    actions: [
      'Log raw score, accuracy percentage, time taken, and error breakdown in tracking database',
      'Evaluate score against target band criteria and calibrate upcoming practice focus',
    ],
    output: 'Updated progress record and action item for next session',
  },
];

/** Search options accepted by {@link searchPracticeUnits}. */
export type PracticeQuery = {
  /** Free-text search over title, id, level, collection and sourcePath. */
  query?: string;
  /** Restrict to one skill ('reading' | 'listening'). */
  skill?: 'reading' | 'listening';
  /** Restrict to one collection. */
  collection?: PracticeCollection;
  /** Restrict to one curricular level. */
  level?: PracticeLevel;
  /** Restrict to units with or without audio. */
  hasAudio?: boolean;
  /** Filter by unit number. */
  unitNumber?: number;
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

/**
 * Search, filter and paginate the practice units.
 *
 * @param options - Search options.
 * @returns A page of matching practice units.
 */
export function searchPracticeUnits(options: PracticeQuery): Page<PracticeUnit> {
  const query = options.query ?? '';
  const filtered = PRACTICE_UNITS.filter((unit) => {
    if (
      query.length > 0 &&
      !matchesQuery([unit.title, unit.id, unit.collection, unit.level, unit.sourcePath], query)
    ) {
      return false;
    }
    if (options.skill !== undefined && unit.skill !== options.skill) {
      return false;
    }
    if (options.collection !== undefined && unit.collection !== options.collection) {
      return false;
    }
    if (options.level !== undefined && unit.level !== options.level) {
      return false;
    }
    if (options.hasAudio !== undefined && unit.hasAudio !== options.hasAudio) {
      return false;
    }
    if (options.unitNumber !== undefined && unit.unitNumber !== options.unitNumber) {
      return false;
    }
    return true;
  });
  return paginate(filtered, options.limit, options.offset);
}

/**
 * Look up a single practice unit by identifier (case-insensitive).
 *
 * @param id - Practice unit identifier, e.g. `reading-basic-a1-a2-001`.
 */
export function findPracticeUnit(id: string): PracticeUnit | undefined {
  const needle = id.trim().toLowerCase();
  return PRACTICE_UNITS.find((unit) => unit.id.toLowerCase() === needle);
}

/**
 * Look up a task strategy by skill and strategy identifier.
 *
 * @param skill - 'reading' | 'listening'.
 * @param id - Strategy identifier, e.g. `true-false-not-given`.
 */
export function findPracticeStrategy(skill: Skill, id: string): PracticeStrategy | undefined {
  const needle = id.trim().toLowerCase();
  return PRACTICE_STRATEGIES.find((s) => s.skill === skill && s.id.toLowerCase() === needle);
}

/**
 * Get all strategies for a given skill.
 *
 * @param skill - 'reading' | 'listening'.
 */
export function getStrategiesBySkill(skill: 'reading' | 'listening'): PracticeStrategy[] {
  return PRACTICE_STRATEGIES.filter((s) => s.skill === skill);
}

/**
 * Deterministically choose a sample of practice units for a seed.
 *
 * @param seed - Seed string.
 * @param count - How many units to return.
 * @param skill - Optional skill filter.
 * @param collection - Optional collection filter.
 */
export function randomPracticeUnits(
  seed: string,
  count: number,
  skill?: 'reading' | 'listening',
  collection?: PracticeCollection,
): PracticeUnit[] {
  let pool = PRACTICE_UNITS;
  if (skill !== undefined) {
    pool = pool.filter((u) => u.skill === skill);
  }
  if (collection !== undefined) {
    pool = pool.filter((u) => u.collection === collection);
  }
  return seededIndices(seed, pool.length, count).map((index) => pool[index] as PracticeUnit);
}

/**
 * Compute aggregate statistics over the practice catalogue.
 */
export function practiceStats(): PracticeStats {
  const bySkill: Record<string, number> = {};
  const byCollection: Record<string, number> = {};
  const byLevel: Record<string, number> = {};
  let withAudio = 0;
  let missingAudio = 0;
  let notApplicable = 0;

  for (const unit of PRACTICE_UNITS) {
    bySkill[unit.skill] = (bySkill[unit.skill] ?? 0) + 1;
    byCollection[unit.collection] = (byCollection[unit.collection] ?? 0) + 1;
    byLevel[unit.level] = (byLevel[unit.level] ?? 0) + 1;

    if (unit.skill === 'listening') {
      if (unit.hasAudio) {
        withAudio += 1;
      } else {
        missingAudio += 1;
      }
    } else {
      notApplicable += 1;
    }
  }

  return {
    totalUnits: PRACTICE_UNITS.length,
    declaredUnits: 1853,
    missingUnits: 1,
    bySkill,
    byCollection,
    byLevel,
    audioAvailability: {
      withAudio,
      missingAudio,
      notApplicable,
    },
    strategiesCount: PRACTICE_STRATEGIES.length,
    studyFrameworkSteps: STUDY_FRAMEWORK_STEPS.length,
  };
}
