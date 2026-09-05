/**
 * Receptive-skills practice layer: Listening and Reading question families,
 * the four Listening sections, and CEFR-graded study plans.
 *
 * The taxonomy mirrors the task shapes that recur across published IELTS
 * Listening and Reading tests: completion families, multiple choice,
 * matching, labelling and short answers for Listening; the eleven standard
 * Reading families from Multiple Choice to Short-answer Questions. The shape
 * of this layer was informed by a structural analysis of the open practice
 * platform `ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS` (102 graded listening
 * lessons, 204 listening full tests, 315 reading full tests and 1,232 graded
 * reading lessons): its scale confirms that receptive-skills practice
 * dominates self-study material, and its organisation by question family and
 * CEFR level is reflected here. No passages, items, answers, audio or
 * third-party guidance text are reproduced — every description, strategy and
 * plan in this file is original work written for this project. The public
 * test format itself (four Listening sections, 40 questions, 60-minute
 * Reading test) follows the test descriptions published by the IELTS
 * partners.
 */

import type { ListeningSection, PracticeQuestionType, StudyLevel, StudyPlan } from '../types.js';

/** Receptive skills covered by {@link PRACTICE_TYPES}. */
export const PRACTICE_SKILLS: readonly ('listening' | 'reading')[] = ['listening', 'reading'];

/** CEFR levels covered by {@link STUDY_PLANS}, in order. */
export const STUDY_LEVELS: readonly StudyLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * Receptive-skills question families.
 *
 * Listening families come first, in the order candidates usually meet them;
 * Reading families follow in the order of the eleven standard Reading types.
 */
export const PRACTICE_TYPES: readonly PracticeQuestionType[] = [
  {
    id: 'listening-form-completion',
    skill: 'listening',
    name: 'Form completion',
    description:
      'Complete a form with personal or factual details heard in a Section 1 conversation, such as a booking, an enquiry or a registration.',
    skillsAssessed: [
      'listening for specific information',
      'spelling of names and places',
      'number recognition',
    ],
    strategy: [
      'Read the form before the recording starts and predict the kind of word each gap needs.',
      'Listen for spelling: names and postcodes are almost always dictated letter by letter.',
      'Write the answer while listening and check singular/plural agreement at the transfer stage.',
    ],
    pitfalls: [
      'Distractor details are corrected mid-conversation; the corrected version is the answer.',
      'Word limits apply: an answer that needs two words when one is allowed scores nothing.',
    ],
    timingNote: 'Section 1 allows time to preview; answers are short (a number, a name, one or two words).',
  },
  {
    id: 'listening-note-table-completion',
    skill: 'listening',
    name: 'Note and table completion',
    description:
      'Complete structured notes or a table with missing facts, figures or short phrases from a monologue or discussion.',
    skillsAssessed: [
      'listening for specific information',
      'following a structured talk',
      'paraphrase recognition',
    ],
    strategy: [
      'Use the headings and row labels to follow where the speaker is in the structure.',
      'Underline keywords in the question; the recording paraphrases them rather than repeating them.',
      'Note the word limit first: it decides whether articles and prepositions fit in the answer.',
    ],
    pitfalls: [
      'Options that match the question wording exactly are usually distractors.',
      'Units and time expressions must match the table: minutes are not hours, percent is not a fraction.',
    ],
    timingNote: 'Common in Sections 2 and 3; gaps usually need no more than three words or a number.',
  },
  {
    id: 'listening-sentence-summary-completion',
    skill: 'listening',
    name: 'Sentence and summary completion',
    description:
      'Complete sentences or a short summary so that the finished text reports what the recording said.',
    skillsAssessed: ['listening for gist and detail', 'grammatical fit', 'paraphrase recognition'],
    strategy: [
      'Read the incomplete sentences first so you know which idea each gap belongs to.',
      'Predict the grammar of each gap (noun, verb, adjective) before listening.',
      'After choosing words from the recording, re-read the sentence to confirm it is grammatical.',
    ],
    pitfalls: [
      'Copying a phrase that breaks the sentence grammar loses the mark even when the idea is right.',
      'Summaries compress the recording: the answer is a paraphrase, rarely the exact words heard.',
    ],
    timingNote: 'Gaps usually allow one to three words; grammatical fit is part of the task.',
  },
  {
    id: 'listening-flowchart-completion',
    skill: 'listening',
    name: 'Flow-chart completion',
    description:
      'Complete the stages of a process or procedure described in the recording, in the order things happen.',
    skillsAssessed: ['following a sequence', 'listening for specific information', 'sequencing language'],
    strategy: [
      'Study the chart direction first so you know whether it flows down, across or in a cycle.',
      'Listen for sequencing markers (first, next, after that, finally) to track the current stage.',
      'Match each gap to exactly one stage; a stage never supplies two answers.',
    ],
    pitfalls: [
      'Stages sound similar when the same vocabulary repeats; the sequence marker decides the gap.',
      'Passive constructions hide the agent: listen for what is done, not who does it.',
    ],
    timingNote: 'Typical of Sections 2 and 4; answers are short noun phrases within the word limit.',
  },
  {
    id: 'listening-multiple-choice',
    skill: 'listening',
    name: 'Multiple choice',
    description:
      'Choose one correct option, or two or three correct options from a longer list, for questions about a conversation or talk.',
    skillsAssessed: ['listening for gist', 'distinguishing similar options', 'following an argument'],
    strategy: [
      'Read the stem and all options before listening; underline what makes each option different.',
      'Expect every option to be mentioned: the recording discusses and then eliminates distractors.',
      'For choose-two/choose-three variants, keep listening after the first answer; options arrive in order.',
    ],
    pitfalls: [
      'An option that repeats the recording word-for-word is usually the distractor.',
      'Agreement words (yes, exactly) may refer to the previous speaker’s point, not the answer.',
    ],
    timingNote: 'Common in Sections 2 and 3; option order follows recording order.',
  },
  {
    id: 'listening-matching',
    skill: 'listening',
    name: 'Matching',
    description:
      'Match a set of items (people, places, features) to a set of options (opinions, uses, characteristics).',
    skillsAssessed: ['listening for detail', 'tracking multiple referents', 'paraphrase recognition'],
    strategy: [
      'Memorise the option list before listening; you must recognise options by meaning, not wording.',
      'Track the items in order and assign each option the first time its idea is clearly expressed.',
      'Cross out used options immediately so the remaining set shrinks as you listen.',
    ],
    pitfalls: [
      'One option is a spare and is never the answer; forcing every option to fit guarantees an error.',
      'Opinions change hands mid-discussion: attribute each view to the right speaker.',
    ],
    timingNote: 'Typical of Section 3 discussions; there are always more options than items.',
  },
  {
    id: 'listening-labelling',
    skill: 'listening',
    name: 'Plan, map and diagram labelling',
    description:
      'Label numbered parts of a plan, map or diagram with words from a box or from the recording.',
    skillsAssessed: ['spatial listening', 'direction and location language', 'following a guided tour'],
    strategy: [
      'Orient yourself first: find the start point, the compass directions and the numbered labels.',
      'Follow the speaker’s route label by label rather than jumping ahead on the diagram.',
      'Learn the location vocabulary cold: opposite, adjacent to, in the corner, on the left.',
    ],
    pitfalls: [
      'Left and right follow the speaker’s route, not the viewer’s page.',
      'Similar buildings are distinguished by one feature; the first noun heard is often the distractor.',
    ],
    timingNote: 'A Section 2 classic; labels arrive in the order the speaker walks the route.',
  },
  {
    id: 'listening-short-answer',
    skill: 'listening',
    name: 'Short-answer questions',
    description: 'Answer Wh-questions with a short factual response drawn directly from the recording.',
    skillsAssessed: ['listening for specific information', 'concise answering', 'word-limit discipline'],
    strategy: [
      'Read each question stem and predict the answer type: a place, a time, a reason, a number.',
      'Answer with the minimum words that still answer the question.',
      'Respect the word limit exactly; articles and numbers each count as one word.',
    ],
    pitfalls: [
      'Full sentences waste time and risk breaking the word limit.',
      'The question word decides the answer: a “where” question is never answered with a time.',
    ],
    timingNote: 'Word limits are strict (often three words and/or a number); answers are factual.',
  },
  {
    id: 'reading-multiple-choice',
    skill: 'reading',
    name: 'Multiple choice',
    description:
      'Choose one correct option (or two/three from a longer list) for questions about the passage.',
    skillsAssessed: ['reading for detail', 'distinguishing similar statements', 'inference'],
    strategy: [
      'Read the stem first, then skim for the relevant paragraph before reading the options closely.',
      'Eliminate options that contradict the passage or add information the passage never gives.',
      'Verify the surviving option against the exact passage sentence before committing.',
    ],
    pitfalls: [
      'Options often reuse passage vocabulary with a changed meaning; match ideas, not words.',
      '“Mostly true” is not true: one wrong detail disqualifies the whole option.',
    ],
    timingNote: 'Allow about a minute per question; questions follow passage order.',
  },
  {
    id: 'reading-true-false-not-given',
    skill: 'reading',
    name: 'True / False / Not Given',
    description:
      'Decide whether each statement agrees with the passage (True), contradicts it (False), or is absent (Not Given).',
    skillsAssessed: ['reading for detail', 'recognising paraphrase', 'withholding judgement'],
    strategy: [
      'Locate the exact passage sentence for each statement before deciding.',
      'Choose False only when the passage directly contradicts the statement.',
      'Choose Not Given when the statement’s key term never appears, even in paraphrase.',
    ],
    pitfalls: [
      'Real-world knowledge must not decide: only the passage counts.',
      'Absolute words (all, never, only) usually signal False or Not Given, not True.',
    ],
    timingNote: 'The hardest Reading family per mark; budget extra time and never leave blanks.',
  },
  {
    id: 'reading-yes-no-not-given',
    skill: 'reading',
    name: 'Yes / No / Not Given',
    description:
      'Decide whether each statement agrees with the author’s views or claims (Yes), contradicts them (No), or is absent (Not Given).',
    skillsAssessed: ['reading for attitude and opinion', 'distinguishing fact from claim', 'inference'],
    strategy: [
      'Ask first: is this the author’s view, or a fact the author merely reports?',
      'Match the statement against the claim, not against the surrounding facts.',
      'Treat hedging (suggests, may, appears) as part of the claim being tested.',
    ],
    pitfalls: [
      'Confusing this family with True/False/Not Given: here the author’s position is what matters.',
      'A true fact can still be “Not Given” if the author never endorses it.',
    ],
    timingNote: 'Appears with opinion-heavy passages; locate the author’s evaluative language first.',
  },
  {
    id: 'reading-matching-information',
    skill: 'reading',
    name: 'Matching information',
    description: 'Match each statement to the paragraph (or section) that contains the information.',
    skillsAssessed: ['skimming and scanning', 'paragraph-level gist', 'paraphrase recognition'],
    strategy: [
      'Skim the whole passage for paragraph topics before attempting any item.',
      'Match the easiest statements first; each paragraph is usually used once.',
      'Confirm by finding the paraphrased detail, not just a shared keyword.',
    ],
    pitfalls: [
      'Keywords repeat across paragraphs; the full statement must fit, not one word.',
      'An example in a paragraph does not mean the paragraph is about that example.',
    ],
    timingNote: 'Questions do not follow passage order; skim first, then scan per item.',
  },
  {
    id: 'reading-matching-headings',
    skill: 'reading',
    name: 'Matching headings',
    description: 'Choose the heading that best expresses the main idea of each paragraph or section.',
    skillsAssessed: ['reading for gist', 'distinguishing main idea from detail', 'summarising'],
    strategy: [
      'Read the first and last sentence of each paragraph; the main idea usually lives there.',
      'Cross out headings as you use them and keep the spare headings in mind.',
      'Decide from the whole paragraph: a heading that fits one sentence but not the rest is wrong.',
    ],
    pitfalls: [
      'Detail-matching headings describe an example, not the paragraph’s point.',
      'There are always spare headings; every heading will not be used.',
    ],
    timingNote: 'Do this family first for a passage: it maps the text for the later families.',
  },
  {
    id: 'reading-matching-features',
    skill: 'reading',
    name: 'Matching features',
    description:
      'Match people, dates, places or theories to the statements, findings or characteristics linked to them.',
    skillsAssessed: ['scanning for names and terms', 'attributing claims', 'detail reading'],
    strategy: [
      'Scan for the capitalised names first; they are the fastest anchors in the text.',
      'Read around each name to attribute exactly one statement to it.',
      'Note when a person is merely cited versus when they endorse the claim.',
    ],
    pitfalls: [
      'Two people can hold similar views; the statement must match the right name.',
      'A name in a paragraph does not mean every statement in that paragraph belongs to them.',
    ],
    timingNote: 'Scan-driven and quick once names are located; verify each attribution.',
  },
  {
    id: 'reading-matching-sentence-endings',
    skill: 'reading',
    name: 'Matching sentence endings',
    description:
      'Complete sentence stems with the correct endings chosen from a list, so each finished sentence matches the passage.',
    skillsAssessed: ['reading for detail', 'grammatical fit', 'paraphrase recognition'],
    strategy: [
      'Read the stems and predict the missing idea before looking at the endings.',
      'Shortlist endings that are grammatically possible, then test each against the passage.',
      'Re-read each finished sentence: grammar and meaning must both hold.',
    ],
    pitfalls: [
      'Endings that fit grammatically but contradict the passage are the designed distractors.',
      'One ending is spare; using every ending guarantees at least one error.',
    ],
    timingNote: 'Stems follow passage order; endings do not. Test grammar first, meaning second.',
  },
  {
    id: 'reading-sentence-completion',
    skill: 'reading',
    name: 'Sentence completion',
    description: 'Complete sentences with words taken from the passage, within a stated word limit.',
    skillsAssessed: ['scanning for detail', 'grammatical fit', 'word-limit discipline'],
    strategy: [
      'Use the words around the gap to locate the passage sentence, then lift the exact words.',
      'Never change the passage words: the answer must be quoted, not paraphrased.',
      'Count every word against the limit before writing the answer down.',
    ],
    pitfalls: [
      'Synonyms from your own vocabulary score nothing; only passage words count.',
      'Hyphenated compounds and numbers each count as one word toward the limit.',
    ],
    timingNote: 'Questions follow passage order; answers are literal quotations within the limit.',
  },
  {
    id: 'reading-summary-completion',
    skill: 'reading',
    name: 'Summary, note, table and flow-chart completion',
    description:
      'Complete a summary, notes, a table or a flow chart with words from the passage (or from a box), within a word limit.',
    skillsAssessed: ['reading for gist and detail', 'following a structure', 'condensing information'],
    strategy: [
      'Read the whole summary first: its structure tells you where in the passage to look.',
      'Decide whether the instructions allow any words or passage-only words before you start.',
      'Check each answer against both the word limit and the grammar of its sentence.',
    ],
    pitfalls: [
      'With a word box, each option is used once and one option is spare.',
      'Without a box, invented words score nothing even when the meaning is correct.',
    ],
    timingNote: 'The summary compresses a passage section; work through it in order.',
  },
  {
    id: 'reading-diagram-labelling',
    skill: 'reading',
    name: 'Diagram label completion',
    description: 'Label numbered parts of a diagram with words from the passage, within a word limit.',
    skillsAssessed: ['reading for detail', 'linking text to visuals', 'technical vocabulary'],
    strategy: [
      'Study the diagram first so you know what each label points at.',
      'Find the paragraph that describes the diagrammed object or process.',
      'Work label by label through the description in the order the text presents it.',
    ],
    pitfalls: [
      'Labels need the passage term, not an everyday synonym for the pictured part.',
      'Descriptions often name parts in a different order than the label numbers.',
    ],
    timingNote: 'The relevant description is usually one or two paragraphs; answers are short.',
  },
  {
    id: 'reading-short-answer',
    skill: 'reading',
    name: 'Short-answer questions',
    description: 'Answer Wh-questions with a short response of passage words, within a stated word limit.',
    skillsAssessed: ['scanning for detail', 'concise answering', 'word-limit discipline'],
    strategy: [
      'Let the question word (who, where, how many) define exactly what to scan for.',
      'Answer with the fewest passage words that still answer the question.',
      'Check the word limit last: a correct idea over the limit scores nothing.',
    ],
    pitfalls: [
      'Full sentences almost always break the word limit.',
      'Questions follow passage order — if an answer comes before the previous one, re-check.',
    ],
    timingNote: 'Usually “no more than three words and/or a number”; the limit is strict.',
  },
];

/** The four sections of the IELTS Listening test, in order. */
export const LISTENING_SECTIONS: readonly ListeningSection[] = [
  {
    section: 1,
    setting: 'An everyday social conversation',
    voices: 'Two speakers',
    questionRange: [1, 10],
    description:
      'A conversation with an everyday purpose — a booking, an order, an enquiry — with form, note or table completion.',
  },
  {
    section: 2,
    setting: 'An everyday monologue',
    voices: 'One speaker',
    questionRange: [11, 20],
    description:
      'A single speaker on a practical topic — a tour, a facility guide, a local talk — with completion, labelling or multiple choice.',
  },
  {
    section: 3,
    setting: 'An educational discussion',
    voices: 'Two to four speakers',
    questionRange: [21, 30],
    description:
      'Students or colleagues discussing coursework — an assignment, a presentation, a project — with matching and multiple choice.',
  },
  {
    section: 4,
    setting: 'An academic lecture',
    voices: 'One speaker',
    questionRange: [31, 40],
    description:
      'A university-style lecture on an academic topic, with note, sentence, summary or flow-chart completion.',
  },
];

/** Total questions in the Listening test, derived from the section ranges. */
export const LISTENING_QUESTION_COUNT = 40;

/** Minutes of Listening audio, excluding the answer-transfer time. */
export const LISTENING_MINUTES = 30;

/** Answer-transfer minutes added for the paper-based Listening test. */
export const LISTENING_TRANSFER_MINUTES = 10;

/** Minutes of the Reading test (three passages, 40 questions). */
export const READING_MINUTES = 60;

/** CEFR-graded study plans for the receptive skills. */
export const STUDY_PLANS: readonly StudyPlan[] = [
  {
    level: 'A1',
    label: 'Beginner',
    readingFocus:
      'Short everyday texts of 100-200 words: notices, adverts, simple emails. Learn to find names, numbers and single facts.',
    listeningFocus:
      'Slow, clearly enunciated dialogues about personal details: spellings, numbers, dates and prices.',
    weeklyPassages: [3, 5],
    sessionRoutine: [
      'Preview the questions and underline the key words.',
      'Attempt the passage without stopping, inside a generous time limit.',
      'Check answers and translate every unknown word in the correct sentences.',
      'Listen to or re-read the passage once more with the answers known.',
      'Copy five useful words or phrases into a notebook with an example.',
      'Log the date, the material and the score.',
    ],
    exitSignal: 'You find explicit facts in short texts without translating every word.',
  },
  {
    level: 'A2',
    label: 'Elementary',
    readingFocus:
      'Simple connected texts of 200-350 words: short stories, basic news items, routine letters. Practise following the order of events.',
    listeningFocus:
      'Everyday conversations and announcements at slow-to-natural speed; form and note completion with short answers.',
    weeklyPassages: [3, 5],
    sessionRoutine: [
      'Preview the questions and predict the kind of answer each gap needs.',
      'Attempt the passage under time, answering in order.',
      'Analyse every error: was the word unknown, misheard, or misread?',
      'Extract ten useful words or phrases with their sentence context.',
      'Re-attempt the same material after two days and compare scores.',
      'Log the date, the material, the score and the main error type.',
    ],
    exitSignal: 'You follow the sequence of a simple text and answer completion tasks within the word limit.',
  },
  {
    level: 'B1',
    label: 'Intermediate',
    readingFocus:
      'Longer factual texts of 400-700 words: magazine articles, guides, workplace documents. Learn to skim for the main idea first.',
    listeningFocus:
      'Natural-speed monologues and discussions; multiple choice and short answers on concrete topics.',
    weeklyPassages: [4, 6],
    sessionRoutine: [
      'Skim the passage for its structure before reading any question closely.',
      'Attempt the items under realistic timing, one passage at a time.',
      'Classify each error: vocabulary, paraphrase missed, distractor chosen, or time pressure.',
      'Extract fifteen words or collocations and group them by topic.',
      'Re-read the passage to see how each answer is paraphrased.',
      'Log the date, the material, the score and the error classes.',
    ],
    exitSignal:
      'You finish a 700-word factual text in 20 minutes and can name why each wrong answer was wrong.',
  },
  {
    level: 'B2',
    label: 'Upper-intermediate',
    readingFocus:
      'Authentic articles of 700-900 words with argument and attitude: opinion pieces, reports, reviews. Practise True/False/Not Given discipline.',
    listeningFocus:
      'Full four-section practice with all question families; Section 3 discussions with several speakers.',
    weeklyPassages: [4, 6],
    sessionRoutine: [
      'Preview the question family and recall its strategy before starting.',
      'Attempt full sections under exact timing, including answer transfer for listening.',
      'For each error, write the passage evidence that supports the correct answer.',
      'Extract fifteen to twenty-five topic words and their paraphrases.',
      'Review the whole passage for structure: how introductions and conclusions frame the argument.',
      'Log the date, the material, the score and the recurring weak family.',
    ],
    exitSignal:
      'You distinguish stated fact from author opinion reliably and finish sections inside the time limit.',
  },
  {
    level: 'C1',
    label: 'Advanced',
    readingFocus:
      'Dense academic-style passages of 900+ words: journals, essays, technical reports. Practise matching headings and information under pressure.',
    listeningFocus:
      'Academic lectures and fast multi-speaker discussions; matching, labelling and flow-chart completion.',
    weeklyPassages: [5, 7],
    sessionRoutine: [
      'Set a target band for the session and choose material at or above it.',
      'Attempt complete tests under examination conditions in one sitting.',
      'Analyse errors by family and rewrite the reasoning for each in your own words.',
      'Extract twenty-five academic collocations and note their grammatical patterns.',
      'Study the paraphrase chains: how the same idea is expressed three different ways.',
      'Log the date, the material, the score and the trend across the last five sessions.',
    ],
    exitSignal: 'You hold band 7+ across five consecutive full practices with stable timing.',
  },
  {
    level: 'C2',
    label: 'Proficient',
    readingFocus:
      'Anything a native reader meets: editorials, research abstracts, literary essays. Polish speed and precision on the hardest families.',
    listeningFocus:
      'Unscripted speech with accents, hesitation and overlap; full tests at native speed with no replays.',
    weeklyPassages: [5, 7],
    sessionRoutine: [
      'Practise at or above test difficulty with tightened timing.',
      'Attempt complete tests without pausing, exactly as on test day.',
      'Investigate every residual error: usually a fine distinction, not a gap in understanding.',
      'Maintain vocabulary by theme, retiring words you now use productively.',
      'Review by teaching: explain each answer’s reasoning aloud as if tutoring someone.',
      'Log the date, the material, the score and the single focus for the next session.',
    ],
    exitSignal: 'You consistently reach band 8+ and your remaining errors are isolated slips, not patterns.',
  },
];

/**
 * Return question families, optionally filtered by skill.
 *
 * @param skill - Skill filter.
 */
export function findPracticeTypes(skill?: 'listening' | 'reading'): PracticeQuestionType[] {
  return PRACTICE_TYPES.filter((type) => skill === undefined || type.skill === skill);
}

/**
 * Return study plans, optionally filtered by CEFR level.
 *
 * @param level - Level filter.
 */
export function findStudyPlans(level?: StudyLevel): StudyPlan[] {
  return STUDY_PLANS.filter((plan) => level === undefined || plan.level === level);
}
