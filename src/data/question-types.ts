/**
 * A machine-readable taxonomy of IELTS Listening and Reading question types
 * with strategy playbooks.
 *
 * Every entry describes one official question type: what the candidate has to
 * produce, how the type is worded across past papers (`alsoCalledAs`), the
 * answer-sheet rules, a three-phase playbook (anticipate, during, check), the
 * distractor mechanisms that make the type hard, and the mistakes candidates
 * most often make. All prose is original to this project.
 *
 * The per-question strategy files published by the community practice
 * repository indexed at `/v1/catalog` use the fields `type_tip`,
 * `scan_target` and `analysis_logic`; {@link UPSTREAM_STRATEGY_FIELDS} records
 * the mapping so tooling can attach question-number strategies to the type-level
 * playbook served here.
 */

import type { QuestionTypeData } from '../types.js';

/** Question types per skill. */
export const QUESTION_TYPE_SKILLS = ['listening', 'reading'] as const;

/** Response formats. */
export const QUESTION_RESPONSE_FORMATS = ['selection', 'written'] as const;

/** Union of the skills used by the taxonomy. */
export type TaxonomySkill = (typeof QUESTION_TYPE_SKILLS)[number];

/** Mapping from this taxonomy to the upstream per-question strategy fields. */
export const UPSTREAM_STRATEGY_FIELDS = {
  playbookPhaseTip: 'type_tip',
  scanTarget: 'scan_target',
  analysisLogic: 'analysis_logic',
  note:
    'The strategies.json files in the upstream practice repository carry these three fields per question ' +
    'number; join them to the type-level playbook here by question type.',
} as const;

/** The question-type taxonomy. */
export const QUESTION_TYPES: readonly QuestionTypeData[] = [
  {
    id: 'multiple-choice',
    name: 'Multiple choice',
    alsoCalledAs: ['Choose the correct letter A, B or C', 'Choose the correct letters'],
    skills: ['listening', 'reading'],
    responseFormat: 'selection',
    answerRules: [
      'Write the letter(s), not the words of the option, unless the instruction says otherwise.',
      'When more than one answer is required, the number of boxes matches the number of answers exactly.',
    ],
    playbook: {
      anticipate: [
        'Read stem and options before listening or scanning; underline the difference-bearing words in each option.',
        'Predict which option paraphrases the text rather than repeating its words.',
      ],
      during: [
        'Track meaning, not vocabulary: speakers and writers reuse option words to set traps.',
        'For listening, keep following the talk after a possible answer; the correct option is often settled by the final remark.',
      ],
      check: [
        'Reject any option only partially covered by the statement or text.',
        'Confirm the chosen option answers the exact question asked, not a related fact.',
      ],
    },
    distractorPatterns: [
      'An option quoting the text verbatim while expressing a different claim.',
      'Two options fused into one statement that is never actually said.',
      'An option that is true in general but not supported by this text.',
    ],
    pitfalls: [
      'Writing the full option text on the answer sheet and losing the mark on transcription errors.',
      'Abandoning an early correct option after hearing a later distractor.',
    ],
  },
  {
    id: 'short-answer-questions',
    name: 'Short-answer questions',
    alsoCalledAs: ['Answer the questions using words from the text', 'Answer in NO MORE THAN ... WORDS'],
    skills: ['listening', 'reading'],
    responseFormat: 'written',
    answerRules: [
      'Obey the word limit exactly, including compound nouns; "NO MORE THAN TWO WORDS AND/OR A NUMBER".',
      'Use words from the text where allowed, but change nothing that breaks grammar.',
    ],
    playbook: {
      anticipate: [
        'Parse each question for its answer type: person, place, amount, reason, time.',
        'Decide what a violation of the word limit would look like and prepare a shorter phrasing.',
      ],
      during: [
        'Locate the answer zone via names, numbers and synonyms in the stem.',
        'In listening, write the whole phrase in shorthand and complete it in the check time.',
      ],
      check: [
        'Count the words in the written answer.',
        'Re-read question and answer together: they must form a grammatical, factually exact pair.',
      ],
    },
    distractorPatterns: [
      'A second, more prominent number or name that belongs to a different question.',
      'A hedged statement ("mostly", "as far as possible") that contradicts the absolute claim in the question.',
    ],
    pitfalls: [
      'Answering the question you expected (topic recall) instead of the question printed.',
      'Copying two adjacent text words and tripping the word limit.',
    ],
  },
  {
    id: 'form-completion',
    name: 'Form completion',
    alsoCalledAs: ['Complete the form', 'Complete the notes below with ONE WORD AND/OR A NUMBER'],
    skills: ['listening', 'reading'],
    responseFormat: 'written',
    answerRules: [
      'Fill each gap with the stated maximum of words and numbers; a hyphenated compound counts as one word.',
      'Transcribe exactly; do not correct the form\u2019s own spelling or your own.',
    ],
    playbook: {
      anticipate: [
        'Read the whole form; label each gap with its expected data type (name, date, price, quantity).',
        'For names, emails and postcodes, rehearse letter-by-letter spelling strategies.',
      ],
      during: [
        'Follow the conversation order: form gaps appear in recording order, so a missed gap means moving on immediately.',
        'Note digits and letters in the blocks speakers give them in.',
      ],
      check: [
        'Check each gap forms a natural phrase with the surrounding form text.',
        'Verify numbers twice against the unit requested (dollars, weeks, per cent).',
      ],
    },
    distractorPatterns: [
      'Self-corrections: "around 50 — no, let\u2019s say 45".',
      'The same noun appearing with different attributes in adjacent rows of the form.',
    ],
    pitfalls: [
      'Freezing at a missed gap and losing the following three as well.',
      'Writing the first value heard instead of the final, confirmed one.',
    ],
  },
  {
    id: 'notes-completion',
    name: 'Notes completion',
    alsoCalledAs: ['Complete the notes below', 'Complete the speaker\u2019s notes'],
    skills: ['listening', 'reading'],
    responseFormat: 'written',
    answerRules: [
      'Words must satisfy both the notes\u2019 grammar and the word limit.',
      'Do not change the given structure; only the gaps are yours.',
    ],
    playbook: {
      anticipate: [
        'Predict what each bullet heading implies and which gaps share one speaker turn.',
        'Mark gaps needing exact quantities against gaps needing content words.',
      ],
      during: [
        'Notes usually follow the talk\u2019s section order; use the headings as paragraph signposts.',
        'Listen for paraphrase bridges: the notes compress clauses into noun phrases.',
      ],
      check: [
        'Read each completed bullet as one sentence.',
        'Confirm nothing exceeds the word limit once compound headings are ignored.',
      ],
    },
    distractorPatterns: [
      'Extra examples that fit the heading but belong to a different bullet.',
      'A word heard near the gap that matches the notes\u2019 wording verbatim while being the wrong detail.',
    ],
    pitfalls: ['Treating note completion like multiple choice and selecting rather than writing.'],
  },
  {
    id: 'table-completion',
    name: 'Table completion',
    alsoCalledAs: ['Complete the table below', 'Write ONE WORD OR A NUMBER'],
    skills: ['listening', 'reading'],
    responseFormat: 'written',
    answerRules: [
      'The table\u2019s row and column headers constrain the answer type; ignore cells that are already filled.',
      'One number may fill a gap even in a word-heavy table; do not pad it with units.',
    ],
    playbook: {
      anticipate: [
        'Scan the header row and column; know which axis the recording will traverse.',
        'Predict every empty cell\u2019s type (noun, adjective, date, amount) before you hear anything.',
      ],
      during: [
        'Move along the row the speaker is discussing, not the visual order of the table.',
        'When the speaker jumps rows, park partial answers and keep tracking signposts.',
      ],
      check: [
        'Verify each value against its row and column intersection.',
        'Check units: the header may already carry "USD", "kg" or "in years".',
      ],
    },
    distractorPatterns: [
      'Adjacent cells sharing one sentence, so the wrong value lands in the neighbouring gap.',
      'Approximations ("about", "roughly") versus the exact figure the table demands.',
    ],
    pitfalls: ['Filling a gap with the value of a completed cell that looks identical in the recording.'],
  },
  {
    id: 'flow-chart-completion',
    name: 'Flow-chart completion',
    alsoCalledAs: ['Complete the flow chart', 'Complete the process diagram'],
    skills: ['listening', 'reading'],
    responseFormat: 'written',
    answerRules: [
      'Arrows and boxes fix the sequence; answers must be steps, not outcomes.',
      'Where a box lists two linked stages, each gap takes one component only.',
    ],
    playbook: {
      anticipate: [
        'Trace the whole chart, including branches and loops, and guess the vocabulary set of each stage.',
        'Identify connectors that signal stage boundaries (first, then, once, after which).',
      ],
      during: [
        'Map sequencing language onto arrows: a new arrow almost always starts a new sentence in the talk or text.',
        'Watch for passive process wording and convert to the flow chart\u2019s voice.',
      ],
      check: [
        'Re-trace the chart top to bottom: every gap should sit on the spoken path, and the sequence should not skip.',
        'Verify no answer belongs to the step above or below.',
      ],
    },
    distractorPatterns: [
      'Optional branches ("in some cases") that the flow chart never entered.',
      'The same object appearing at two stages in different states.',
    ],
    pitfalls: ['Filling a gap with the final result because it is the most memorable number.'],
  },
  {
    id: 'sentence-completion',
    name: 'Sentence completion',
    alsoCalledAs: ['Complete the sentences below', 'Write ONE WORD ONLY'],
    skills: ['listening', 'reading'],
    responseFormat: 'written',
    answerRules: [
      'The completed sentence must be true according to the recording or text, not merely plausible.',
      'One-word limits force head nouns and main verbs: strip articles, adjectives and extra nouns.',
    ],
    playbook: {
      anticipate: [
        'Underline the grammatical slot the gap requires (noun after "due to ...", verb after "can ...").',
        'Rank the sentences by predicted difficulty and start with the anchored ones (names, numbers).',
      ],
      during: [
        'Sentences paraphrase the source heavily: track synonyms and word-class shifts (protect → protection).',
        'In reading, the answer is usually a verbatim word from the located sentence.',
      ],
      check: [
        'Read the full sentence aloud mentally: grammar violations expose wrong word class.',
        'Re-check spelling, which is marked strictly for written answers.',
      ],
    },
    distractorPatterns: [
      'A sentence that can be completed by two different words, only one of which the source supports.',
      'A negated source sentence that still contains the key noun from the gap.',
    ],
    pitfalls: [
      'Answering with a word that matches the source text but breaks the question sentence\u2019s grammar.',
    ],
  },
  {
    id: 'summary-completion',
    name: 'Summary completion',
    alsoCalledAs: [
      'Complete the summary using a list of words',
      'Complete the summary using words from the text',
    ],
    skills: ['reading'],
    responseFormat: 'written',
    answerRules: [
      'With a word box, letters are the required response; without one, copy exact words from the passage within the limit.',
      'The summary paraphrases a portion of the text — usually one or two paragraphs — so locate that zone first.',
    ],
    playbook: {
      anticipate: [
        'Read the whole summary to fix its topic and each gap\u2019s word class.',
        'Decide whether the summary covers the whole passage (common when a box is given) or a named section.',
      ],
      during: [
        'For boxed options, eliminate by grammar first, then by meaning; a distractor word often belongs to a different gap.',
        'For free completion, find the source sentence and test each candidate word against the summary\u2019s grammar.',
      ],
      check: [
        'The summary must still read as a faithful abstract: re-read it as continuous prose.',
        'Cross out eliminated box letters to keep the remaining pool honest.',
      ],
    },
    distractorPatterns: [
      'Box options that are synonyms of each other with different collocations.',
      'A paragraph of the passage that the summary deliberately skips, carrying a tempting word.',
    ],
    pitfalls: ['Using the same box letter twice unless the instruction explicitly allows it.'],
  },
  {
    id: 'plan-map-diagram-labelling',
    name: 'Plan, map or diagram labelling',
    alsoCalledAs: ['Label the map below', 'Which room is closest to ...?'],
    skills: ['listening', 'reading'],
    responseFormat: 'selection',
    answerRules: [
      'Labels are letters or names from the figure; read the orientation markers before answering.',
      'Prepositions of place define the answer: north of, opposite, adjacent to, past the bridge.',
    ],
    playbook: {
      anticipate: [
        'Study the figure: entrance, compass rose, legend and named landmarks become the coordinate system.',
        'Rehearse directional language (on your left, straight on, at the far end).',
      ],
      during: [
        'In listening, put your cursor or pen on the described landmark and move as the speaker moves; follow their path, not the shortest path.',
        'For reading maps, re-verify each relation against the caption text rather than your mental picture.',
      ],
      check: [
        'Trace the chosen location from the entrance along the described route.',
        'Swap-adjacent answers are common errors: re-check "next to" against "opposite".',
      ],
    },
    distractorPatterns: [
      'The speaker describing two candidate locations before settling on one.',
      'A legend entry never mentioned, making the count of answers mismatch the count of labels.',
    ],
    pitfalls: ['Answering from the map\u2019s visual layout when the task demands the described route.'],
  },
  {
    id: 'matching-listening',
    name: 'Matching (Listening)',
    alsoCalledAs: ['What does each person say about ...?', 'Choose FIVE answers from the box'],
    skills: ['listening'],
    responseFormat: 'selection',
    answerRules: [
      'Options can often be used more than once when the box says so; read that instruction first.',
      'The speaker list, not the option list, sets the order: answers follow the recording.',
    ],
    playbook: {
      anticipate: [
        'Group the options into a personal vocabulary of attitudes (enthusiasm, doubt, practicality).',
        'Note the number of speakers; expect roughly one match each plus repeats if allowed.',
      ],
      during: [
        'Listen for the second or third remark per speaker: the first is frequently revised ("but then again...").',
        'Mark tentative matches beside speaker names to survive option reuse.',
      ],
      check: [
        'Every speaker must map to a stated opinion, and every letter used must satisfy the "may be used more than once" rule.',
        'Reject matches that only echo an option\u2019s noun without its attitude.',
      ],
    },
    distractorPatterns: [
      'Two speakers rejecting the same option, leaving it as a global distractor.',
      'An option worded like a speaker\u2019s example rather than their view.',
    ],
    pitfalls: ['Spending all attention on speaker A and panicking at speaker D.'],
  },
  {
    id: 'matching-headings',
    name: 'Matching headings',
    alsoCalledAs: ['Choose the correct heading for each paragraph', 'List of headings'],
    skills: ['reading'],
    responseFormat: 'selection',
    answerRules: [
      'One heading per labelled paragraph; extra headings remain unused.',
      'Write Roman numerals exactly as printed in the heading list.',
    ],
    playbook: {
      anticipate: [
        'Skim headings first and rewrite each as a two-word theme; watch near-duplicate headings.',
        'Plan to leave the hardest paragraph (often the first) until last.',
      ],
      during: [
        'Read topic and concluding sentences; the heading must cover the paragraph\u2019s main point, not one detail.',
        'If a heading matches only one sentence, it is a distractor.',
      ],
      check: [
        'Cross out used headings; verify no heading was stretched to cover two paragraphs.',
        'State each paragraph\u2019s gist in your own words once more and compare.',
      ],
    },
    distractorPatterns: [
      'A heading naming a detail that the paragraph mentions in one clause.',
      'A heading that fits the previous paragraph\u2019s example, not the target.',
    ],
    pitfalls: ['Choosing vocabulary-overlap headings: matching words flag location, not the main idea.'],
  },
  {
    id: 'matching-information',
    name: 'Matching information (which paragraph)',
    alsoCalledAs: [
      'In which paragraph does the writer mention ...',
      'Which paragraph contains the following information?',
    ],
    skills: ['reading'],
    responseFormat: 'selection',
    answerRules: [
      'Paragraph letters (A, B, C...) — a paragraph may be used more than once if the instruction says so.',
      'Search for the information, not the keyword: prompts are heavily paraphrased.',
    ],
    playbook: {
      anticipate: [
        'Convert each prompt into a question you can spot ("a number of hours", "a reason for delay").',
        'Note prompts with superlatives or causal claims: those need the text to make the claim, not just imply it.',
      ],
      during: [
        'Scan paragraph by paragraph with the shortest prompts first; mark likely candidates in the margin.',
        'Expect "NOT GIVEN" traps only in mixed sets; in pure matching, every prompt has a home.',
      ],
      check: [
        'Verify the located sentence actually states the information, e.g. an example is not the claim itself.',
        'Confirm paragraph-letter format, not numbers.',
      ],
    },
    distractorPatterns: [
      'The same concept mentioned in three paragraphs, but stated precisely in one.',
      'A prompt paraphrasing a sentence that sits one paragraph away from its lookalike.',
    ],
    pitfalls: ['Searching the whole passage repeatedly for one stubborn prompt instead of parking it.'],
  },
  {
    id: 'matching-features',
    name: 'Matching features',
    alsoCalledAs: ['Look at the following statements and the list of researchers', 'Which explorer ...?'],
    skills: ['reading'],
    responseFormat: 'selection',
    answerRules: [
      'Names or terms from the given list are the answers; each may be used once or more as specified.',
      'The statement must be attributable to the named person or item, not merely adjacent to them.',
    ],
    playbook: {
      anticipate: [
        'Circle all mention sites of each name in the text before reading any statement.',
        'Expect dense claim clusters: most matches live in one or two paragraphs.',
      ],
      during: [
        'For each statement, reread the sentence that contains the attributed claim; verify verbs of saying (argued, denied, predicted).',
        'Distinguish a researcher\u2019s own view from the view they describe or reject.',
      ],
      check: [
        'Recheck names against spelling on the list; a transposed letter voids nothing in selection tasks — do not write names at all.',
        'If reuse is forbidden, ensure no name carries two answers.',
      ],
    },
    distractorPatterns: [
      'Two researchers credited in the same sentence with opposite claims.',
      'A statement that matches what a researcher criticised.',
    ],
    pitfalls: ['Matching on proximity: the statement was made near the name, but by someone else.'],
  },
  {
    id: 'matching-sentence-endings',
    name: 'Matching sentence endings',
    alsoCalledAs: ['Complete each sentence with the correct ending'],
    skills: ['reading'],
    responseFormat: 'selection',
    answerRules: [
      'Letters of the ending options; the combined sentence must be both grammatical and true of the text.',
      'Stems appear in text order, which narrows the search zone for each item.',
    ],
    playbook: {
      anticipate: [
        'Read stems and endings as pairs first; sort endings by the meaning they complete.',
        'Predict a plausible ending for each stem from your skim of the passage.',
      ],
      during: [
        'Locate the stem in the passage; the correct ending paraphrases what actually follows there.',
        'Reject endings that are grammatically smooth but textually wrong.',
      ],
      check: ['Read the full combined sentence; one half must not silently change the source claim.'],
    },
    distractorPatterns: [
      'An ending completed by the stem two questions later.',
      'Absolute endings ("always", "the only") attached to hedged source claims.',
    ],
    pitfalls: ['Deciding from grammar alone without re-reading the text zone.'],
  },
  {
    id: 'true-false-notgiven',
    name: 'TRUE / FALSE / NOT GIVEN',
    alsoCalledAs: ['Do the following statements agree with the information in the passage?'],
    skills: ['reading'],
    responseFormat: 'selection',
    answerRules: [
      'FALSE means the passage states the opposite of the claim; merely lacking support is NOT GIVEN.',
      'Write the words exactly as the instruction prints them (TRUE/FALSE/NOT GIVEN, not T/F/NG) when instructed.',
    ],
    playbook: {
      anticipate: [
        'Isolate the factual assertion of each statement: quantity, frequency, comparison, cause.',
        'Flag absolute qualifiers ("all", "never", "first") — they decide many items.',
      ],
      during: [
        'Find the claim\u2019s location, then judge the sentence set only against what the passage states.',
        'Do not import outside knowledge; the passage is the universe.',
      ],
      check: [
        'FALSE requires a contradiction you can point at; if you cannot, reconsider NOT GIVEN.',
        'NOT GIVEN is not "unclear wording" — it is "no answer in the text".',
      ],
    },
    distractorPatterns: [
      'The statement keeping the passage\u2019s words while inverting polarity (unusually small → unusually large).',
      'A comparison absent from the text ("more expensive than") inserted into an otherwise copied sentence.',
      'A single example dressed as an exclusive case ("only").',
    ],
    pitfalls: [
      'Choosing NOT GIVEN after a shallow scan because the synonyms were hard.',
      'Reading "not mentioned anywhere in the text" while the text did contradict it.',
    ],
  },
  {
    id: 'yes-no-notgiven',
    name: 'YES / NO / NOT GIVEN',
    alsoCalledAs: ['Do the following statements agree with the claims of the writer?'],
    skills: ['reading'],
    responseFormat: 'selection',
    answerRules: [
      'Judge against the writer\u2019s opinions and stance, which may be stated in another paragraph from the keyword.',
      'YES does not mean "mentioned" — it means "the writer agrees".',
    ],
    playbook: {
      anticipate: [
        'Identify each statement\u2019s attitude word (essential, unjustified, inevitable).',
        'Decide where the writer\u2019s own voice lives: conclusions, hedging adverbs, evaluative adjectives.',
      ],
      during: [
        'Separate cited opinions the writer reports from views the writer endorses.',
        'Track stance shifts: "It is often claimed that X. In fact, X misleads" reverses the answer.',
      ],
      check: [
        'NO: the writer explicitly counters the claim. NOT GIVEN: the writer never takes a position on it.',
        'Re-read the strongest passage sentence about the claim before deciding YES.',
      ],
    },
    distractorPatterns: [
      'A reported view that reads like the writer\u2019s endorsement.',
      'A hedged concession ("may help, though proof is thin") mistaken for full agreement.',
    ],
    pitfalls: [
      'Applying factual TRUE/FALSE logic to a claims question and hunting for data instead of stance.',
    ],
  },
];

/**
 * Aggregate counts of the taxonomy.
 *
 * @returns totals per skill and per response format.
 */
export interface QuestionTypeStats {
  /** Total question types. */
  types: number;
  /** Types that appear in Listening. */
  listening: number;
  /** Types that appear in Reading. */
  reading: number;
  /** Selection-response types. */
  selection: number;
  /** Written-response types. */
  written: number;
}

export function questionTypeStats(): QuestionTypeStats {
  return {
    types: QUESTION_TYPES.length,
    listening: QUESTION_TYPES.filter((type) => type.skills.includes('listening')).length,
    reading: QUESTION_TYPES.filter((type) => type.skills.includes('reading')).length,
    selection: QUESTION_TYPES.filter((type) => type.responseFormat === 'selection').length,
    written: QUESTION_TYPES.filter((type) => type.responseFormat === 'written').length,
  };
}

/**
 * Find one question type by identifier.
 *
 * @param id - Slug identifier such as `true-false-notgiven`.
 */
export function findQuestionType(id: string): QuestionTypeData | undefined {
  return QUESTION_TYPES.find((type) => type.id === id);
}
