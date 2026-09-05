/**
 * The IELTS Listening and Reading question-type taxonomy.
 *
 * The two receptive papers are built from a closed set of question types: six
 * in Listening and eleven in Reading. Every published practice test is a
 * permutation of them, which makes the taxonomy the natural unit of analysis
 * for item-difficulty work, for tagging a corpus of practice material, and for
 * generating balanced practice sets.
 *
 * The type names and answer rules follow the IELTS partners' own published test
 * format; the strategy and pitfall prose is original to this project.
 */

import type { QuestionType, QuestionTypeSkill } from '../types.js';

/** Skills that use the question-type taxonomy. */
export const QUESTION_SKILLS: readonly QuestionTypeSkill[] = ['listening', 'reading'];

/** Answer formats used across the taxonomy. */
export const ANSWER_FORMATS = [
  'letter',
  'letters',
  'words-from-text',
  'number',
  'true-false-not-given',
  'yes-no-not-given',
] as const;

/** The six Listening question types. */
const LISTENING_QUESTIONS: readonly QuestionType[] = [
  {
    id: 'listening-multiple-choice',
    skill: 'listening',
    name: 'Multiple choice',
    description:
      'A question or unfinished sentence followed by three options (choose one) or five to seven options (choose two or three).',
    tests: 'Detailed understanding of specific points, or the gist of the speaker s overall position.',
    answerFormat: 'letter',
    ordered: true,
    appearsIn: [1, 2, 3, 4],
    strategy: [
      'Read the stem and underline the difference between the options before the audio starts.',
      'Expect every option to be mentioned; only one answers the stem as written.',
      'Listen for the speaker correcting or retracting an earlier statement — the final version is the answer.',
    ],
    pitfalls: [
      'Choosing an option because you heard the words, rather than because it answers the stem.',
      'Losing the next question while still deliberating over the previous one.',
    ],
  },
  {
    id: 'listening-matching',
    skill: 'listening',
    name: 'Matching',
    description:
      'Match a numbered list of items from the recording to a lettered set of options, which may be reused unless stated otherwise.',
    tests: 'Following a conversation in which several items are compared or categorised.',
    answerFormat: 'letter',
    ordered: true,
    appearsIn: [2, 3],
    strategy: [
      'Paraphrase each lettered option in your own words before listening.',
      'Check whether options can be used more than once; the rubric always says.',
      'Track the speaker moving from item to item — the order of the numbered list is the order of the audio.',
    ],
    pitfalls: [
      'Assuming each option is used exactly once.',
      'Matching on a repeated keyword instead of on meaning.',
    ],
  },
  {
    id: 'listening-plan-map-diagram-labelling',
    skill: 'listening',
    name: 'Plan, map or diagram labelling',
    description:
      'Label a visual — a building plan, a map or a technical diagram — from a set of options or with words from the recording.',
    tests: 'Understanding a spatial description and relating language to a visual representation.',
    answerFormat: 'letter',
    ordered: true,
    appearsIn: [1, 2],
    strategy: [
      'Orient yourself first: find the entrance, the compass rose and any labelled landmark.',
      'Pre-learn direction language — opposite, adjacent to, at the far end, clockwise from.',
      'Follow the speaker s route with your pen; the labels are given in the order they are walked.',
    ],
    pitfalls: [
      'Mixing up left and right when the described route reverses direction.',
      'Writing a label that is already printed on the diagram.',
    ],
  },
  {
    id: 'listening-form-note-table-flowchart-summary-completion',
    skill: 'listening',
    name: 'Form, note, table, flow-chart or summary completion',
    description:
      'Fill gaps in a structured summary of the recording, within a stated word limit (typically one, two or three words and/or a number).',
    tests: 'Recording concrete factual detail: names, dates, prices, quantities and defining features.',
    answerFormat: 'words-from-text',
    ordered: true,
    appearsIn: [1, 2, 3, 4],
    strategy: [
      'Predict the part of speech and the likely category of each gap before the audio starts.',
      'Copy the word exactly as heard; you are never asked to change its form.',
      'Obey the word limit literally — a hyphenated word counts as one, a number counts as one.',
    ],
    pitfalls: [
      'Exceeding the word limit, which scores zero even when the meaning is right.',
      'Misspelling a word that was spelled out letter by letter in the audio.',
      'Adding a currency symbol or unit that is already printed next to the gap.',
    ],
  },
  {
    id: 'listening-sentence-completion',
    skill: 'listening',
    name: 'Sentence completion',
    description:
      'Complete sentences that summarise key information from the recording, within a stated word limit.',
    tests: 'Identifying the key functional relationships in what is said: cause, contrast, purpose, result.',
    answerFormat: 'words-from-text',
    ordered: true,
    appearsIn: [2, 3, 4],
    strategy: [
      'Read the whole sentence so the grammar of the gap constrains what can fill it.',
      'Watch the connector before the gap — because, although, in order to — and listen for its spoken equivalent.',
    ],
    pitfalls: [
      'Producing a grammatically impossible sentence because only the gap was read.',
      'Paraphrasing the answer instead of transcribing it.',
    ],
  },
  {
    id: 'listening-short-answer',
    skill: 'listening',
    name: 'Short-answer questions',
    description:
      'Answer direct questions about factual detail, within a stated word limit; sometimes two answers are required to one question.',
    tests: 'Retrieving concrete facts — who, where, how much, how many.',
    answerFormat: 'words-from-text',
    ordered: true,
    appearsIn: [1, 4],
    strategy: [
      'Turn the question word into a listening target: How much means listen for a figure.',
      'When two answers are required they are usually adjacent in the audio.',
    ],
    pitfalls: [
      'Answering in a full sentence and breaking the word limit.',
      'Giving only one answer when the rubric asks for two.',
    ],
  },
];

/** The eleven Reading question types. */
const READING_QUESTIONS: readonly QuestionType[] = [
  {
    id: 'reading-multiple-choice',
    skill: 'reading',
    name: 'Multiple choice',
    description:
      'A question or unfinished sentence with four options (choose one), or a longer option list from which several answers are chosen.',
    tests: 'Detailed understanding of specific points, or of the main idea of a passage.',
    answerFormat: 'letter',
    ordered: true,
    appearsIn: [1, 2, 3],
    strategy: [
      'Locate the relevant paragraph first, then read the options; never the reverse.',
      'Eliminate options that are true but do not answer the stem.',
    ],
    pitfalls: [
      'Selecting a distractor that reproduces the passage s wording but reverses its meaning.',
      'Bringing in outside knowledge that the passage does not state.',
    ],
  },
  {
    id: 'reading-identifying-information',
    skill: 'reading',
    name: 'Identifying information (True / False / Not Given)',
    description:
      'Decide whether each statement agrees with the factual information in the passage, contradicts it, or is not addressed.',
    tests:
      'Recognising the boundary between what a text asserts, what it denies, and what it is silent about.',
    answerFormat: 'true-false-not-given',
    ordered: true,
    appearsIn: [1, 2, 3],
    strategy: [
      'Decide what evidence would make the statement false; if the passage supplies none either way, the answer is Not Given.',
      'Treat quantifiers and qualifiers — all, only, always, the first — as the load-bearing words.',
      'Answer from the passage alone, even where the statement is true in the world.',
    ],
    pitfalls: [
      'Marking False when the passage simply does not mention the point.',
      'Using Yes/No labels, which belong to the views-and-claims type and score zero here.',
    ],
  },
  {
    id: 'reading-identifying-views-claims',
    skill: 'reading',
    name: "Identifying the writer's views or claims (Yes / No / Not Given)",
    description:
      "Decide whether each statement agrees with the writer's opinions or claims, contradicts them, or is not expressed.",
    tests: 'Separating the writer s stance from the views the writer merely reports.',
    answerFormat: 'yes-no-not-given',
    ordered: true,
    appearsIn: [2, 3],
    strategy: [
      'Track attribution: a view introduced with "critics argue" is not the writer s view.',
      'Read hedging — may, appears to, arguably — as part of the claim, not as decoration.',
    ],
    pitfalls: [
      'Confusing a reported opinion with the writer s own position.',
      'Using True/False labels, which belong to the information type.',
    ],
  },
  {
    id: 'reading-matching-information',
    skill: 'reading',
    name: 'Matching information',
    description:
      'Find the paragraph or section that contains a given piece of information; paragraphs may be used more than once.',
    tests: 'Scanning a long text for specific information rather than for its overall argument.',
    answerFormat: 'letter',
    ordered: false,
    appearsIn: [1, 2, 3],
    strategy: [
      'Do these last: the answers are unordered, so they reward a text you already know.',
      'Scan for the concrete anchor in the prompt — a number, a name, a place.',
    ],
    pitfalls: [
      'Assuming each paragraph is used exactly once.',
      'Stopping at the first paragraph that mentions the topic rather than the one containing the information.',
    ],
  },
  {
    id: 'reading-matching-headings',
    skill: 'reading',
    name: 'Matching headings',
    description:
      'Choose the heading that best captures each paragraph or section from a numbered list, which always contains more headings than paragraphs.',
    tests: 'Distinguishing the main idea of a paragraph from its supporting detail.',
    answerFormat: 'letter',
    ordered: true,
    appearsIn: [1, 2, 3],
    strategy: [
      'Summarise each paragraph in three or four words of your own before reading the headings.',
      'Group the headings that differ only in emphasis and resolve them against the paragraph together.',
      'Do the paragraphs you are sure of first and let elimination narrow the rest.',
    ],
    pitfalls: [
      'Choosing a heading that matches one vivid detail rather than the paragraph as a whole.',
      'Forgetting that several headings are deliberately unused.',
    ],
  },
  {
    id: 'reading-matching-features',
    skill: 'reading',
    name: 'Matching features',
    description:
      'Match a list of statements to a set of features — researchers, countries, periods, theories — listed by letter.',
    tests: 'Attributing findings and claims to the right source in a text with several actors.',
    answerFormat: 'letter',
    ordered: false,
    appearsIn: [2, 3],
    strategy: [
      'Underline every occurrence of each feature in the passage before reading the statements.',
      'Work feature by feature rather than statement by statement.',
    ],
    pitfalls: [
      'Attributing a claim to the wrong researcher where two are discussed in one sentence.',
      'Assuming every listed feature is used.',
    ],
  },
  {
    id: 'reading-matching-sentence-endings',
    skill: 'reading',
    name: 'Matching sentence endings',
    description:
      'Complete each sentence stem with one of a longer list of endings, so that the result reflects the passage.',
    tests: 'Combining grammatical fit with faithfulness to the text.',
    answerFormat: 'letter',
    ordered: true,
    appearsIn: [1, 2, 3],
    strategy: [
      'Filter the endings on grammar first, then decide between the survivors on meaning.',
      'The stems follow the order of the passage; use a solved stem to bracket the next.',
    ],
    pitfalls: ['Picking an ending that reads well but is not supported by the passage.'],
  },
  {
    id: 'reading-sentence-completion',
    skill: 'reading',
    name: 'Sentence completion',
    description: 'Complete sentences with words taken from the passage, within a stated word limit.',
    tests: 'Locating precise detail and reproducing it without alteration.',
    answerFormat: 'words-from-text',
    ordered: true,
    appearsIn: [1, 2, 3],
    strategy: [
      'Predict the grammatical class of the missing word before scanning.',
      'Copy from the passage exactly; changed forms are marked wrong.',
    ],
    pitfalls: ['Breaking the word limit.', 'Rewriting a plural as a singular to fit the sentence.'],
  },
  {
    id: 'reading-summary-note-table-flowchart-completion',
    skill: 'reading',
    name: 'Summary, note, table or flow-chart completion',
    description:
      'Fill gaps in a summary of part of the passage, either with words from the text or from a supplied option box.',
    tests: 'Following the development of an argument or a process and holding it in a condensed form.',
    answerFormat: 'words-from-text',
    ordered: true,
    appearsIn: [1, 2, 3],
    strategy: [
      'Read the whole summary once so its shape tells you which part of the passage it covers.',
      'Where an option box is supplied the answers are paraphrases, not literal matches.',
    ],
    pitfalls: [
      'Taking words from the passage when an option box was provided.',
      'Answering the gaps out of order and losing the thread.',
    ],
  },
  {
    id: 'reading-diagram-label-completion',
    skill: 'reading',
    name: 'Diagram label completion',
    description:
      'Label a diagram of a mechanism, structure or process using words from the passage, within a stated word limit.',
    tests: 'Mapping a technical description in prose onto a visual representation.',
    answerFormat: 'words-from-text',
    ordered: false,
    appearsIn: [1, 2, 3],
    strategy: [
      'Find the single paragraph the diagram is drawn from; every label comes from it.',
      'Use the existing labels to fix the orientation and the direction of the process.',
    ],
    pitfalls: ['Searching the whole passage when the answers are concentrated in one paragraph.'],
  },
  {
    id: 'reading-short-answer',
    skill: 'reading',
    name: 'Short-answer questions',
    description: 'Answer questions about factual detail in the passage, within a stated word limit.',
    tests: 'Retrieving explicit facts quickly and accurately.',
    answerFormat: 'words-from-text',
    ordered: true,
    appearsIn: [1, 2, 3],
    strategy: [
      'The questions follow the order of the passage, so each answer narrows the search for the next.',
      'Answer with the minimum number of words that is still grammatical.',
    ],
    pitfalls: ['Writing a full sentence and breaking the word limit.'],
  },
];

/** Every question type, Listening first. */
export const QUESTION_TYPES: readonly QuestionType[] = [...LISTENING_QUESTIONS, ...READING_QUESTIONS];

/**
 * Look up one question type by identifier.
 *
 * @param id - Question-type identifier, e.g. `reading-matching-headings`.
 */
export function findQuestionType(id: string): QuestionType | undefined {
  const needle = id.toLowerCase();
  return QUESTION_TYPES.find((type) => type.id === needle);
}

/**
 * Count the question types per skill.
 *
 * @returns A record keyed by skill.
 */
export function questionTypeCounts(): Record<QuestionTypeSkill, number> {
  return {
    listening: LISTENING_QUESTIONS.length,
    reading: READING_QUESTIONS.length,
  };
}
