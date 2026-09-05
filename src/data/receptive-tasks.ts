/**
 * Original, concise task-family guidance grounded in official test-format pages.
 * These are strategies, not copied upstream exercises, answer keys or official marking rubrics.
 */

import { matchesQuery } from '../lib/search.js';
import type { ReceptiveSkill, ReceptiveTask } from '../types.js';

/** Authoritative format references, reviewed 2026-09-05. */
export const RECEPTIVE_TASK_SOURCES = {
  reading: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
  listening: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening',
} as const;

function task(
  skill: ReceptiveSkill,
  id: string,
  title: string,
  responseMode: ReceptiveTask['responseMode'],
  focus: string,
  strategy: string[],
  pitfall: string,
): ReceptiveTask {
  return {
    id: `${skill}-${id}`,
    skill,
    title,
    responseMode,
    focus,
    strategy,
    pitfall,
    sourceUrl: RECEPTIVE_TASK_SOURCES[skill],
  };
}

/** The 11 Academic Reading question families; no difficulty labels are inferred. */
export const READING_TASKS: readonly ReceptiveTask[] = [
  task(
    'reading',
    'multiple-choice',
    'Multiple choice',
    'selection',
    'Distinguish a supported interpretation from plausible but unsupported alternatives.',
    [
      'Check whether the instruction asks for one answer or several.',
      'Locate the passage evidence for the question before comparing options.',
      'Test each option against the whole relevant sentence, including qualifications.',
    ],
    'A repeated keyword is not evidence that an option expresses the same meaning.',
  ),
  task(
    'reading',
    'identifying-information',
    'True / False / Not Given',
    'selection',
    'Separate agreement, contradiction and absence of evidence about a factual statement.',
    [
      'Break the statement into its subject, claim and qualifiers.',
      'Find explicit evidence that confirms or contradicts that complete claim.',
      'Choose Not Given when the passage does not settle the claim either way.',
    ],
    'Not finding confirmation does not by itself prove that the statement is false.',
  ),
  task(
    'reading',
    'identifying-views',
    'Yes / No / Not Given',
    'selection',
    'Recognise the writer’s position rather than treating every reported view as their own.',
    [
      'Identify whose opinion or claim the question asks about.',
      'Track reporting verbs, attribution and contrasts in the relevant passage.',
      'Decide whether the writer supports, contradicts or does not resolve the claim.',
    ],
    'Your own knowledge or opinion cannot supply the writer’s missing position.',
  ),
  task(
    'reading',
    'matching-information',
    'Matching information',
    'selection',
    'Locate a particular detail, example or explanation in the correct paragraph.',
    [
      'Identify the kind of information requested, such as a cause or comparison.',
      'Scan for semantic clues, then check the surrounding context.',
      'Check the instructions before using a paragraph label more than once.',
    ],
    'Matching a paragraph’s general topic is not enough when a specific detail is requested.',
  ),
  task(
    'reading',
    'matching-headings',
    'Matching headings',
    'selection',
    'Identify a paragraph’s central purpose and distinguish it from supporting detail.',
    [
      'Summarise the paragraph’s main point in a few words of your own.',
      'Compare that summary with the competing headings.',
      'Check the whole paragraph, including any shift after a contrast marker.',
    ],
    'A vivid example can distract from the main idea; do not reuse a heading.',
  ),
  task(
    'reading',
    'matching-features',
    'Matching features',
    'selection',
    'Connect claims or characteristics to the appropriate person, group or category.',
    [
      'Map each option to its mentions in the passage.',
      'Read the relevant statements carefully, including pronouns and attributed claims.',
      'Verify whether the instructions permit reusing an option.',
    ],
    'Nearby names do not necessarily refer to the person responsible for a claim.',
  ),
  task(
    'reading',
    'matching-sentence-endings',
    'Matching sentence endings',
    'selection',
    'Complete a statement so that its meaning agrees with the passage.',
    [
      'Read the sentence beginnings and identify their location in the text.',
      'Predict the meaning of a suitable ending before inspecting the options.',
      'Verify both grammatical fit and support in the passage.',
    ],
    'A grammatically natural ending can still contradict the source.',
  ),
  task(
    'reading',
    'sentence-completion',
    'Sentence completion',
    'text',
    'Retrieve precise passage wording that completes a sentence within the stated limit.',
    [
      'Read the word and number allowance for this particular task.',
      'Predict the grammatical role of the missing expression.',
      'Copy the supported words accurately and recheck the completed sentence.',
    ],
    'An answer exceeding the stated limit can lose the mark even if its meaning is correct.',
  ),
  task(
    'reading',
    'summary-completion',
    'Summary / note / table / flow-chart completion',
    'mixed',
    'Reconstruct the main ideas or details of one passage section in a compressed format.',
    [
      'Identify whether the task requires passage words or choices from a supplied list.',
      'Use the summary structure to locate the relevant passage section.',
      'Check meaning, grammar and any word limit for each completed gap.',
    ],
    'Do not assume that the gaps follow the same order as the passage.',
  ),
  task(
    'reading',
    'diagram-labelling',
    'Diagram label completion',
    'text',
    'Connect a written description with the correct component of a visual representation.',
    [
      'Inspect the diagram’s orientation, labels and relationships.',
      'Locate the passage section describing those components.',
      'Trace each pointer carefully and check the answer’s spelling and word allowance.',
    ],
    'The order of labels need not match the order of the description.',
  ),
  task(
    'reading',
    'short-answer',
    'Short-answer questions',
    'text',
    'Retrieve a concise factual answer from the passage rather than composing an explanation.',
    [
      'Identify whether the question asks for a person, place, time or other detail.',
      'Find the supporting passage wording.',
      'Give only the requested information within the specified word and number allowance.',
    ],
    'Extra explanation may exceed the answer limit; use evidence from the text.',
  ),
];

/** The 6 Listening question families; the task instructions determine the answer format. */
export const LISTENING_TASKS: readonly ReceptiveTask[] = [
  task(
    'listening',
    'multiple-choice',
    'Multiple choice',
    'selection',
    'Follow a speaker’s intended meaning while distinguishing competing alternatives.',
    [
      'Read the question and the required number of choices before listening.',
      'Listen for paraphrases of the options and changes of mind.',
      'Choose the option supported by the final relevant message, not the first familiar word.',
    ],
    'A speaker may mention an option only to reject or correct it.',
  ),
  task(
    'listening',
    'matching',
    'Matching',
    'selection',
    'Relate people, objects or situations to details expressed in a recording.',
    [
      'Inspect the option list and identify what makes each alternative distinct.',
      'Track which item the speakers are discussing as the recording progresses.',
      'Check the matching instructions before reusing an option.',
    ],
    'A change of speaker or topic can change which item a detail belongs to.',
  ),
  task(
    'listening',
    'map-labelling',
    'Plan / map / diagram labelling',
    'selection',
    'Translate spoken spatial descriptions into positions on a supplied visual.',
    [
      'Locate the starting point and orient yourself using fixed landmarks.',
      'Follow direction changes relative to the speaker’s described route.',
      'Match each destination with the available label rather than guessing by proximity.',
    ],
    'Left and right depend on the described direction of travel, not just the page.',
  ),
  task(
    'listening',
    'form-completion',
    'Form / note / table / flow-chart completion',
    'mixed',
    'Capture key facts in the structured form indicated by the task.',
    [
      'Read the word allowance and inspect headings to predict the missing information.',
      'Listen for the relevant fact, including corrections to names, dates or quantities.',
      'Check spelling, grammatical fit and the permitted answer format.',
    ],
    'Do not retain an earlier value after the speaker explicitly corrects it.',
  ),
  task(
    'listening',
    'sentence-completion',
    'Sentence completion',
    'text',
    'Identify the information needed to complete a summary sentence accurately.',
    [
      'Predict the grammatical type of the missing expression.',
      'Follow the recording’s meaning rather than waiting for identical question wording.',
      'Check the completed sentence against the specified word and number allowance.',
    ],
    'A close paraphrase in the question does not require you to rewrite the recorded answer.',
  ),
  task(
    'listening',
    'short-answer',
    'Short-answer questions',
    'text',
    'Extract the requested facts without adding an unnecessary explanation.',
    [
      'Identify exactly which fact the question requests.',
      'Listen for the answer and for any subsequent correction.',
      'Check how many separate answers are requested and respect the word limit.',
    ],
    'Writing an extra plausible fact is not a substitute for the requested information.',
  ),
];

/** Filter original task guidance by skill, exact task ID and case-insensitive substring. */
export function findReceptiveTasks(skill: ReceptiveSkill, query = '', type?: string): ReceptiveTask[] {
  return [...READING_TASKS, ...LISTENING_TASKS].filter(
    (item) =>
      item.skill === skill &&
      (type === undefined || item.id === type) &&
      matchesQuery([item.id, item.title, item.focus, item.pitfall, ...item.strategy], query),
  );
}
