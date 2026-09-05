/**
 * The canonical IELTS question-type taxonomy.
 *
 * The Reading and Listening papers are built from a small, stable set of task
 * families, but every corpus annotates them differently: the practice corpus
 * indexed by `/v1/tests` alone uses 65 distinct free-text labels for the 13
 * families below. This module is the canonical taxonomy those labels are
 * normalised onto (`scripts/extract_practice_tests.py` performs the mapping),
 * enriched with the strategy guidance that makes the taxonomy usable in
 * teaching and in item-difficulty research.
 *
 * The guidance is original wording written for this project; the task families
 * themselves follow the public task descriptions published by the IELTS
 * partners. Each family also carries its Chinese labels (`aliasesZh`), aligned
 * with the annotation vocabulary of Chinese-language mock-exam platforms (see
 * RESEARCH.md Part VI), so the taxonomy is searchable in both languages.
 */

import { practiceStats } from './practiceTests.js';

import type { QuestionType, QuestionTypeId, RawLabelMapping } from '../types.js';

/** Canonical question types, in report order. */
export const QUESTION_TYPES: readonly QuestionType[] = [
  {
    id: 'multiple-choice',
    name: 'Multiple choice',
    skills: ['reading', 'listening'],
    family: 'selection',
    description:
      'Choose the single best answer, usually from four options, for a question or an unfinished sentence.',
    assesses: 'Detailed understanding of a specific point, and the ability to reject near-miss distractors.',
    strategy: [
      'Read the stem before the options so the options cannot frame your expectations.',
      'Underline the qualifier in the stem (only, mainly, first, most) — it decides the answer.',
      'Locate the relevant part of the text or recording, then eliminate options that are true but do not answer the stem.',
      'Confirm the surviving option against the exact wording; do not choose on word overlap alone.',
    ],
    traps: [
      'Distractors repeat vocabulary from the text while changing the relationship between the ideas.',
      'In listening, a speaker states an option and then corrects or rejects it.',
      'Two options are partly right; only one satisfies every element of the stem.',
    ],
    answerFormat: 'One letter (A, B, C or D).',
    followsTextOrder: true,
    aliasesZh: ['单选题'],
  },
  {
    id: 'multiple-choice-multiple-answer',
    name: 'Multiple choice (more than one answer)',
    skills: ['reading', 'listening'],
    family: 'selection',
    description: 'Choose two or three correct options from a longer list, usually of five to eight.',
    assesses: 'Selective listening or reading across a stretch of text where several facts compete.',
    strategy: [
      'Note how many answers are required; extra answers are marked wrong even when correct.',
      'Paraphrase every option before you read or listen, so you recognise them when reworded.',
      'Track all options in parallel rather than deciding after each one.',
      'Both or all answers usually come from the same passage or the same speaker turn.',
    ],
    traps: [
      'Options mentioned only as possibilities, plans that were cancelled, or other people’s opinions.',
      'The mark scheme awards one mark per correct option, so a rushed guess costs more than it gains.',
    ],
    answerFormat: 'Two or three letters, in any order.',
    followsTextOrder: false,
    aliasesZh: ['多选题'],
  },
  {
    id: 'true-false-not-given',
    name: 'Identifying information (True / False / Not Given)',
    skills: ['reading'],
    family: 'identification',
    description:
      'Decide whether a statement of fact agrees with, contradicts, or is absent from the passage.',
    assesses: 'The ability to separate what a text states from what a reader assumes.',
    strategy: [
      'Treat the passage as the only universe of facts: outside knowledge is irrelevant.',
      'Find the sentence that addresses the same fact, not merely the same topic.',
      'Ask two questions in order: does the passage say this? does the passage say the opposite?',
      'If the first answer is no, the item is Not Given, however plausible the statement is.',
    ],
    traps: [
      'A statement that is generally true but never stated in the passage is Not Given, not True.',
      'Quantifiers (all, some, never, often) flip a True into a False without changing the topic.',
      'Comparative claims are frequently Not Given: the passage describes both items but never compares them.',
    ],
    answerFormat: 'TRUE, FALSE or NOT GIVEN.',
    followsTextOrder: true,
    aliasesZh: ['判断题'],
  },
  {
    id: 'yes-no-not-given',
    name: "Identifying the writer's views or claims (Yes / No / Not Given)",
    skills: ['reading'],
    family: 'identification',
    description:
      "Decide whether a statement matches the writer's opinion, contradicts it, or is not expressed.",
    assesses: 'Recognition of stance, hedging and attribution in argumentative prose.',
    strategy: [
      'Distinguish the writer’s voice from views the writer reports or attributes to others.',
      'Read hedges (may, appears, is widely assumed) as part of the claim, not as decoration.',
      'Check the strength of the claim as carefully as its content.',
    ],
    traps: [
      'Views the writer cites in order to reject are commonly turned into Yes/No items.',
      'A strong statement matched to a hedged claim is No, not Yes.',
    ],
    answerFormat: 'YES, NO or NOT GIVEN.',
    followsTextOrder: true,
    aliasesZh: ['判断题'],
  },
  {
    id: 'matching',
    name: 'Matching',
    skills: ['listening'],
    family: 'matching',
    description: 'Match a list of numbered items to a short list of lettered options, which may be reused.',
    assesses: 'Following a conversation in which several items are discussed in turn.',
    strategy: [
      'Read the option list first and group options that are close in meaning.',
      'The items are discussed in order; keep your place and never stop to reconsider.',
      'Check whether the rubric allows an option to be used more than once.',
    ],
    traps: [
      'The first option a speaker mentions for an item is frequently revised a few seconds later.',
      'Options are paraphrased, not quoted, in the recording.',
    ],
    answerFormat: 'One letter per item.',
    followsTextOrder: true,
    aliasesZh: ['配对题'],
  },
  {
    id: 'matching-information',
    name: 'Matching information to paragraphs',
    skills: ['reading'],
    family: 'matching',
    description:
      'Find the paragraph or section that contains a particular piece of information (an example, a reason, a comparison).',
    assesses: 'Scanning a long text for a function rather than a topic.',
    strategy: [
      'Do this task after the tasks that follow the order of the text; by then you know where things are.',
      'Convert each item into a function (a definition, a criticism, a date) and scan for that function.',
      'Note that a paragraph may hold more than one answer, and some paragraphs hold none.',
    ],
    traps: [
      'Topic words appear in several paragraphs; only one paragraph performs the function asked for.',
      'Items are not in text order, so a linear search wastes time.',
    ],
    answerFormat: 'A paragraph letter.',
    followsTextOrder: false,
    aliasesZh: ['段落匹配题'],
  },
  {
    id: 'matching-headings',
    name: 'Matching headings',
    skills: ['reading'],
    family: 'matching',
    description: 'Choose the heading that best summarises each paragraph or section.',
    assesses: 'Distinguishing the main idea of a paragraph from its supporting detail.',
    strategy: [
      'Read the headings first and pair off the ones that differ by a single idea.',
      'Read the first and last sentence of the paragraph, then skim the middle for the recurring idea.',
      'Answer the paragraphs you are sure of first and reduce the heading list as you go.',
    ],
    traps: [
      'A heading that names a detail mentioned once in the paragraph is the standard distractor.',
      'There are always more headings than paragraphs.',
    ],
    answerFormat: 'A roman numeral.',
    followsTextOrder: false,
    aliasesZh: ['选段意题', '标题对应题'],
  },
  {
    id: 'matching-features',
    name: 'Matching features (including classification)',
    skills: ['reading', 'listening'],
    family: 'matching',
    description:
      'Match statements, findings or opinions to the people, studies, places or categories they belong to.',
    assesses: 'Tracking attribution across a text with several named sources.',
    strategy: [
      'Highlight every occurrence of each name or category before reading the statements.',
      'Work name by name rather than statement by statement.',
      'Watch for pronouns and role nouns (the researcher, her team) that continue an attribution.',
    ],
    traps: [
      'Two sources agree about a topic but only one makes the specific claim.',
      'An option may be used more than once, or not at all.',
    ],
    answerFormat: 'One letter per statement.',
    followsTextOrder: false,
    aliasesZh: ['细节匹配题', '配对题'],
  },
  {
    id: 'matching-sentence-endings',
    name: 'Matching sentence endings',
    skills: ['reading'],
    family: 'matching',
    description: 'Complete each sentence beginning with the ending that fits the passage.',
    assesses: 'Grammatical and logical control of complex sentences.',
    strategy: [
      'Eliminate endings that cannot follow the beginning grammatically before checking the text.',
      'Find the part of the passage the beginning refers to and read the whole sentence there.',
      'The sentence beginnings follow the order of the passage even though the endings do not.',
    ],
    traps: [
      'Several endings are grammatically possible but only one is factually supported.',
      'Endings recycle vocabulary from a neighbouring sentence.',
    ],
    answerFormat: 'One letter per sentence.',
    followsTextOrder: true,
    aliasesZh: [],
  },
  {
    id: 'sentence-completion',
    name: 'Sentence completion',
    skills: ['reading', 'listening'],
    family: 'completion',
    description: 'Complete sentences with words taken from the text or the recording.',
    assesses: 'Locating a precise detail and transcribing it accurately.',
    strategy: [
      'Obey the word limit exactly; a correct answer written in four words scores zero under a three-word limit.',
      'Predict the part of speech and, where possible, the kind of word (a number, a place, a material).',
      'Copy the word exactly as it appears; do not change its form unless the sentence forces it.',
    ],
    traps: [
      'Hyphenated words count as one word; numbers written as digits count as one word.',
      'The gap is often filled by a paraphrase target that appears near, but not in, the obvious sentence.',
    ],
    answerFormat: 'Words from the text, within the stated word limit.',
    followsTextOrder: true,
    aliasesZh: ['填空题', '句子完成题'],
  },
  {
    id: 'summary-completion',
    name: 'Form, note, table, flow-chart and summary completion',
    skills: ['reading', 'listening'],
    family: 'completion',
    description:
      'Fill gaps in a summary, a set of notes, a form, a table or a flow-chart, either with words from the text or from a supplied list.',
    assesses: 'Following the structure of an argument or a procedure while listening or reading for detail.',
    strategy: [
      'Read the whole frame first: headings, column labels and arrows tell you what kind of word each gap needs.',
      'When a word list is supplied, the answers are paraphrases, not the words used in the text.',
      'In listening, the gaps are completed in the order they are spoken; keep moving after a missed gap.',
    ],
    traps: [
      'Spelling and singular/plural errors are marked wrong even when the word is right.',
      'A summary may cover only part of the passage, so scanning the whole text wastes time.',
    ],
    answerFormat: 'Words from the text (within the word limit) or letters from a supplied list.',
    followsTextOrder: true,
    aliasesZh: ['总结题', '填空题', '流程题'],
  },
  {
    id: 'diagram-label-completion',
    name: 'Plan, map and diagram labelling',
    skills: ['reading', 'listening'],
    family: 'labelling',
    description: 'Label the parts of a plan, a map, a machine or a natural process.',
    assesses: 'Relating language to a visual representation, including spatial and sequential language.',
    strategy: [
      'Orient yourself first: find the starting point, the compass or the direction of flow.',
      'Predict the vocabulary of position (opposite, adjacent to, beyond) or of process (once, after that).',
      'Follow the labels in the order the description moves through the figure.',
    ],
    traps: [
      'Directions are given relative to a speaker or a viewer, not to the page.',
      'Several unlabelled features are described before the one that is actually asked about.',
    ],
    answerFormat: 'Words from the text, or letters marked on the figure.',
    followsTextOrder: true,
    aliasesZh: ['地图题', '图表标签题'],
  },
  {
    id: 'short-answer',
    name: 'Short-answer questions',
    skills: ['reading', 'listening'],
    family: 'completion',
    description: 'Answer factual questions in a few words taken from the text or the recording.',
    assesses: 'Retrieval of concrete facts: names, numbers, dates, places and quantities.',
    strategy: [
      'Identify the question word: it fixes the category of the answer.',
      'Answer with the fewest words that are grammatically complete; articles are rarely needed.',
      'Answers appear in the order of the text, so the next answer follows the previous one.',
    ],
    traps: [
      'Two plausible facts are present and only the one that matches the question word is correct.',
      'Exceeding the word limit is the most common cause of lost marks.',
    ],
    answerFormat: 'Words from the text, within the stated word limit.',
    followsTextOrder: true,
    aliasesZh: ['简答题'],
  },
];

/** Canonical question-type identifiers, in taxonomy order. */
export const QUESTION_TYPE_IDS: readonly QuestionTypeId[] = QUESTION_TYPES.map((type) => type.id);

/** Task families used by the taxonomy. */
export const QUESTION_TYPE_FAMILIES: readonly QuestionType['family'][] = [
  ...new Set(QUESTION_TYPES.map((type) => type.family)),
];

/** A question type with the frequencies observed in the indexed corpus. */
export type QuestionTypeWithFrequency = QuestionType & {
  /** Observed frequency in the indexed practice corpus. */
  observed: {
    /** Number of indexed questions of this type. */
    questions: number;
    /** Share of all indexed questions, rounded to four decimals. */
    share: number;
    /** Question count per skill. */
    bySkill: Record<string, number>;
    /** Upstream free-text labels normalised onto this type, most frequent first. */
    rawLabels: string[];
  };
};

/**
 * Join the taxonomy with the frequencies observed in the practice-test index.
 *
 * @param skill - Optional skill filter.
 * @returns The taxonomy, ordered by observed frequency (descending).
 */
export function questionTypesWithFrequency(skill?: 'reading' | 'listening'): QuestionTypeWithFrequency[] {
  const stats = practiceStats();
  const total = stats.questions;
  const entries = Object.entries(stats.rawLabels) as [string, RawLabelMapping][];
  const selected =
    skill === undefined ? QUESTION_TYPES : QUESTION_TYPES.filter((type) => type.skills.includes(skill));
  const joined = selected.map((type) => {
    const bySkill: Record<string, number> = {};
    for (const [name, counts] of Object.entries(stats.questionTypesBySkill)) {
      bySkill[name] = counts[type.id] ?? 0;
    }
    const questions = Object.entries(bySkill)
      .filter(([name]) => skill === undefined || name === skill)
      .reduce((sum, [, count]) => sum + count, 0);
    const rawLabels = entries
      .filter(([, mapping]) => mapping.canonical === type.id)
      .sort((left, right) => right[1].occurrences - left[1].occurrences)
      .map(([label]) => label);
    return {
      ...type,
      observed: {
        questions,
        share: Math.round((questions / total) * 10000) / 10000,
        bySkill,
        rawLabels,
      },
    };
  });
  return joined.sort((left, right) => right.observed.questions - left.observed.questions);
}

/**
 * Look up one question type by identifier.
 *
 * @param id - Case-insensitive canonical identifier.
 */
export function findQuestionType(id: string): QuestionTypeWithFrequency | undefined {
  const needle = id.trim().toLowerCase();
  return questionTypesWithFrequency().find((type) => type.id === needle);
}
