/**
 * The study-activity catalogue behind `/v1/plan`.
 *
 * The catalogue models the four tested skills plus a general "exam
 * experience" category — the organising scheme found in open learner
 * notebooks such as the study-notes collection at
 * <https://github.com/Oxidaner/ielts> (听力, 阅读, 作文, 口语 and 经验). No
 * content from that repository is redistributed; every activity below is an
 * original description of a widely used preparation technique, written for
 * this project, and each session points at this API's own datasets so a plan
 * can be executed against reproducible material.
 */

import type { PlanPhase, StudyActivity } from '../types.js';

const ALL4: readonly PlanPhase[] = ['foundation', 'skill-build', 'exam-practice', 'assessment-taper'];
const EARLY: readonly PlanPhase[] = ['foundation', 'skill-build'];
const PRACTICE: readonly PlanPhase[] = ['skill-build', 'exam-practice'];
const LATE: readonly PlanPhase[] = ['exam-practice', 'assessment-taper'];

/**
 * Compact catalogue row: id, skill, category, title, recommended minutes,
 * suitable band range, phases, optional endpoint template, steps.
 */
type ActivityRow = readonly [
  id: string,
  skill: StudyActivity['skill'],
  category: StudyActivity['category'],
  title: string,
  minutes: number,
  bandRange: readonly [number, number],
  phases: readonly PlanPhase[],
  endpoint: string | null,
  summary: string,
  steps: readonly string[],
];

const ROWS: readonly ActivityRow[] = [
  // ---------------------------------------------------------------- listening
  [
    'listening-quiz-drill',
    'listening',
    'drill',
    'Word-recognition quiz (seeded)',
    20,
    [0, 9],
    ALL4,
    '/v1/quiz?mode=definition-to-word&count=12&seed={seed}',
    'Hear-and-recall practice built on meaning: recognise the headword a definition describes, which trains the speed of word retrieval that listening sections reward.',
    [
      'Answer the seeded quiz in definition-to-word mode in one pass, without looking words up.',
      'Mark your own answers with the returned answer key.',
      'Re-quiz on the missed words using the same seed to verify retention.',
    ],
  ],
  [
    'listening-extensive',
    'listening',
    'technique',
    'Extensive listening for gist',
    30,
    [0, 5],
    EARLY,
    '/v1/tests/items?skill=listening&audio=true&limit=5',
    'Build endurance and top-down comprehension by listening to whole sections once, without pausing, focusing on the situation and speakers rather than every word.',
    [
      'Choose an indexed listening test that advertises audio assets.',
      'Listen once and write a two-sentence gist summary per section.',
      'Listen again and compare your summary with the answer key themes.',
    ],
  ],
  [
    'listening-dictation',
    'listening',
    'drill',
    'Short-passage dictation',
    25,
    [0, 7.5],
    ALL4,
    '/v1/quiz?mode=spelling&count=15&seed={seed}',
    'Accuracy training: transcribing short stretches exposes weak forms, plural -s and past -ed that cost marks even at high levels, and the spelling quiz reinforces the same failure mode.',
    [
      'Dictate a 60-second excerpt sentence by sentence.',
      'Compare with the transcript and underline every morphological miss.',
      'Complete the seeded spelling quiz to consolidate the words you missed.',
    ],
  ],
  [
    'listening-prediction',
    'listening',
    'technique',
    'Pre-reading and gap prediction',
    20,
    [4.5, 7.5],
    PRACTICE,
    '/v1/question-types?skill=listening',
    'Use the instruction time to predict the kind of answer each gap requires — number, noun, date — so the recording can be heard looking for one thing, not everything.',
    [
      'Review the question types that carry gap-filling formats.',
      'Before listening, annotate every gap with a predicted word class.',
      'After checking, log predictions that misled you (grammar, not the recording).',
    ],
  ],
  [
    'listening-section-timed',
    'listening',
    'drill',
    'Full timed section set',
    40,
    [4.5, 9],
    ALL4,
    '/v1/tests/items?skill=listening&minQuestions=40&limit=5',
    'Simulated pressure: run all four listening sections back to back with only the transfer time the paper test allows, so concentration is trained at exam length.',
    [
      'Pick a full 40-question listening test from the index.',
      'Play continuously; no pausing, no replay.',
      'Score strictly: word limits and spelling both count.',
    ],
  ],
  [
    'listening-transcript-analysis',
    'listening',
    'technique',
    'Post-test transcript dissection',
    30,
    [7, 9],
    LATE,
    null,
    'The gap between bands 7 and 9 is mostly analysis, not exposure: read the transcript of every missed answer and name the mechanism that defeated you.',
    [
      'For each error, quote the transcript span and label it: paraphrase, distractor, accent, vocabulary, attention.',
      'Collect the labels into the weekly error log.',
      'Rewrite one trap question as a study flashcard.',
    ],
  ],
  // ------------------------------------------------------------------ reading
  [
    'reading-quiz-drill',
    'reading',
    'drill',
    'Vocabulary-in-context quiz (seeded)',
    20,
    [0, 9],
    ALL4,
    '/v1/quiz?mode=word-to-definition&count=12&seed={seed}',
    'Reading speed is bounded by lexical access: a timed pass over the day’s seeded vocabulary quiz keeps headword-to-sense mapping automatic.',
    [
      'Answer the seeded word-to-definition quiz under a 4-minute limit.',
      'Add every miss to the error log with the sentence that confused you.',
      'Read two Cambridge-volume words of the day entries for context.',
    ],
  ],
  [
    'reading-graded-reading',
    'reading',
    'technique',
    'Graded-reading ladder',
    30,
    [0, 5],
    EARLY,
    '/v1/tests/items?skill=reading&sort=reading-ease&order=desc&limit=8',
    'Comfort precedes speed: read the most accessible indexed passages until 80+ Flesch Reading Ease material feels easy, then step up one difficulty band.',
    [
      'Start from the easiest graded lessons reported by the index.',
      'Read for summary, not questions; one paragraph, one sentence of notes.',
      'Move to the next difficulty band when comprehension stays above 90%.',
    ],
  ],
  [
    'reading-timed-passages',
    'reading',
    'drill',
    'Three-passage timing drill',
    60,
    [4.5, 7.5],
    PRACTICE,
    '/v1/tests/items?skill=reading&minQuestions=40&limit=5',
    'Train the 20-minute wall: three academic passages, one per block, with a hard cut at 20 minutes so pacing becomes a habit instead of a hope.',
    [
      'Select a full 40-question academic test from the index.',
      'Set three 20-minute timers; stop at every alarm, mid-sentence.',
      'Score block by block and note which clock position you were at.',
    ],
  ],
  [
    'reading-question-type-mastery',
    'reading',
    'technique',
    'Question-type strategy pass',
    30,
    [0, 7.5],
    PRACTICE,
    '/v1/question-types',
    'Work the taxonomy: take the question families that historically cost you marks, read their strategies and traps, then answer only that type until the trap is visible before it springs.',
    [
      'Filter the taxonomy by your weakest skill and study the listed traps.',
      'Answer ten questions of one type only, untimed, with reasons for each.',
      'Repeat timed, on the next type.',
    ],
  ],
  [
    'reading-vocabulary-in-context',
    'reading',
    'technique',
    'Words-of-the-day in sentences',
    15,
    [0, 7.5],
    ALL4,
    '/v1/vocabulary/daily?date={date}&count=5',
    'Five deterministic words of the day, each used in an original sentence of your own before the definition is opened, so form and meaning anchor at the same time.',
    [
      'Fetch the daily vocabulary list for the session date.',
      'Write your own sentence for each word before reading its definition.',
      'Compare your guessed sense with the dataset definition and adjust.',
    ],
  ],
  [
    'reading-argument-mapping',
    'reading',
    'technique',
    'Paragraph function mapping',
    30,
    [7, 9],
    ALL4,
    '/v1/topics/themes?skill=reading',
    'At band 7+ the hard questions are about moves, not meanings: label every paragraph of a difficult passage by its function (claim, concession, evidence, example, reversal).',
    [
      'Choose a topic theme you are unfamiliar with and one dense passage on it.',
      'Label each paragraph’s rhetorical function in the margin.',
      'Reconstruct the argument in five bullet points, then check matching-headings answers.',
    ],
  ],
  // ------------------------------------------------------------------ writing
  [
    'writing-collocation-drill',
    'writing',
    'drill',
    'Collocation harvesting (seeded)',
    20,
    [0, 9],
    ALL4,
    '/v1/vocabulary/random?count=15&seed={seed}',
    'Lexical resource is graded on combinations, not single words: sample the day’s seeded vocabulary page and record which verbs, nouns and adjectives each headword naturally partners.',
    [
      'Draw the seeded random vocabulary sample for the session.',
      'For every headword, write two plausible collocations and check the definition fits.',
      'Bank the best ten into the error log for reuse this week.',
    ],
  ],
  [
    'writing-task1-structure',
    'writing',
    'technique',
    'Task 1 paragraph scaffolds',
    30,
    [0, 5],
    EARLY,
    '/v1/tasks/writing?module=academic',
    'Internalise the four-paragraph shape of an academic Task 1 answer (introduction, overview, two body paragraphs) for each visual type until the plan is automatic.',
    [
      'Read the structure and tips for one task family from the task catalogue.',
      'Write only the introduction and overview for two sample visuals of that type.',
      'Check that the overview names trends, not numbers.',
    ],
  ],
  [
    'writing-task2-outline',
    'writing',
    'technique',
    'Ten-line essay outlines',
    25,
    [4.5, 7.5],
    PRACTICE,
    '/v1/topics/writing?limit=3',
    'Outline-only volume: three prompts, ten lines each — position, two body topics with examples, concession, conclusion — so planning stops being the thing that runs out of time.',
    [
      'Fetch three prompts from the task-2 bank.',
      'Spend eight minutes outlining each; do not write the essay.',
      'Compare your two positions with the bank’s contrasting positions.',
    ],
  ],
  [
    'writing-timed-essay',
    'writing',
    'drill',
    'Full timed Task 2',
    40,
    [4.5, 9],
    LATE,
    '/v1/topics/writing?limit=2',
    'Simulate the real constraint: one Task 2 essay, 40 minutes, no dictionary, no pauses, handwriting if the exam is on paper.',
    [
      'Pick a prompt and write the whole essay against a 40-minute timer.',
      'Count words only at the end; never while drafting.',
      'Self-assess against the published band descriptors, criterion by criterion.',
    ],
  ],
  [
    'writing-accuracy-check',
    'writing',
    'technique',
    'The 4-minute accuracy pass',
    15,
    [6.5, 9],
    ALL4,
    null,
    'Grammar is graded on error density, so the last four minutes have one job: hunt articles, subject-verb agreement, tense and plural -s backwards, sentence by sentence.',
    [
      'Reserve the final four minutes of every timed essay for checking.',
      'Proofread the last clause of each sentence first.',
      'Log which error class recurred; make it the focus of the next session.',
    ],
  ],
  [
    'writing-descriptor-alignment',
    'writing',
    'technique',
    'Band-descriptor calibration',
    20,
    [0, 7.5],
    ALL4,
    '/v1/bands/descriptors?set=writing-task-2',
    'Score your own recent essay honestly by reading the analytic descriptors for the two criteria you most need, sentence by sentence, before asking anyone else.',
    [
      'Load the Writing Task 2 descriptors for the band you are at and the band you want.',
      'Highlight every place your writing matches the higher band’s wording.',
      'Add one deliberate instance of each missing feature to the next essay.',
    ],
  ],
  // ----------------------------------------------------------------- speaking
  [
    'speaking-part1-fluency',
    'speaking',
    'drill',
    'Part 1 rapid-fire',
    15,
    [0, 9],
    ALL4,
    '/v1/topics/speaking?part=1&limit=6',
    'Six Part 1 questions answered cold, two sentences each, no notes: the first minute of the test sets the examiner’s expectation, and it is the easiest band to move.',
    [
      'Draw six part-1 questions from the speaking bank.',
      'Answer aloud within 30 seconds each, twice.',
      'Record; count hesitation-fillers on the second playback.',
    ],
  ],
  [
    'speaking-pronunciation-focus',
    'speaking',
    'technique',
    'Transcription shadowing',
    20,
    [0, 5],
    EARLY,
    '/v1/vocabulary/daily?date={date}',
    'Use the phonetic transcriptions in the dataset to shadow five words a day: stress first, segmentals second, because examiner intelligibility tracks word stress.',
    [
      'Open the daily entry and read its IPA transcription aloud.',
      'Shadow the stress pattern five times, slowly then at speed.',
      'Use the word in one spontaneous sentence on the same intonation.',
    ],
  ],
  [
    'speaking-cue-card',
    'speaking',
    'drill',
    'Two-minute monologue with prep',
    25,
    [4.5, 7.5],
    PRACTICE,
    '/v1/topics/speaking?part=2&limit=1',
    'The cue-card algorithm: one minute of notes with four anchors, two minutes of speech without stopping, then the same card cold a second time.',
    [
      'Take one part-2 cue card from the bank.',
      'Use the one minute to write four anchors, not sentences.',
      'Speak twice; the second take should be more fluent, not identical.',
    ],
  ],
  [
    'speaking-part3-discussion',
    'speaking',
    'drill',
    'Part 3 extend-and-justify',
    25,
    [4.5, 9],
    ALL4,
    '/v1/topics/speaking?part=3&limit=3',
    'Abstract questions need written-shaped answers: state, reason, example, concession. Practise the four-move answer on Part 3 prompts drawn from the bank.',
    [
      'Answer three part-3 questions aloud, following the four-move frame.',
      'Ban the phrases “I think” and “maybe” from your first sentence.',
      'Re-record until each answer lasts 35-45 seconds.',
    ],
  ],
  [
    'speaking-self-review',
    'speaking',
    'technique',
    'Playback against the descriptors',
    20,
    [0, 7.5],
    ALL4,
    '/v1/bands/descriptors?set=speaking',
    'One recording, judged once per criterion: fluency, lexis, grammar, pronunciation — with the descriptor summaries open, writing the evidence sentence that decides the band.',
    [
      'Load the speaking criterion descriptors for your two candidate bands.',
      'Listen to the recording once per criterion only.',
      'Write one evidence quote per criterion; that is your self-band.',
    ],
  ],
  [
    'speaking-idiomatic-lexis',
    'speaking',
    'technique',
    'Natural collocation upgrade',
    20,
    [7, 9],
    LATE,
    '/v1/vocabulary/random?count=10&seed={seed}',
    'Band 8 lexical resource is about idiomaticness, not rarity: take today’s sample words and only use them in answers when they fall out naturally under time pressure.',
    [
      'Draw the seeded sample and shortlist three headwords.',
      'Answer two Part 3 questions, using all three without pausing to fit them.',
      'Keep the sentence only if the word was not forced.',
    ],
  ],
  // ------------------------------------------------------------------ general
  [
    'error-log-review',
    'general',
    'experience',
    'Weekly error-log review',
    15,
    [0, 9],
    ALL4,
    null,
    'The habit that separates efficient candidates from busy ones: every wrong answer, every hesitation, every run-on sentence is logged with its cause and reviewed once a week, exam-experience style.',
    [
      'Re-read the week’s logged errors, grouped by cause.',
      'Promote the two most frequent causes into next week’s session mix.',
      'Retire causes that have not reappeared for two weeks.',
    ],
  ],
  [
    'full-mock-test',
    'general',
    'experience',
    'Full four-module mock',
    180,
    [0, 9],
    LATE,
    null,
    'One Saturday, no breaks between modules except the official ones: Listening, Reading and Writing back to back, under exactly exam conditions, to rehearse stamina as well as English.',
    [
      'Assemble materials in advance; no pausing or replays during the test.',
      'Transfer answers in the official time windows only.',
      'Score within 48 hours while the memory of each trap is fresh.',
    ],
  ],
];

/**
 * The full activity catalogue, ordered by skill and id.
 */
export const STUDY_ACTIVITIES: readonly StudyActivity[] = ROWS.map(
  ([id, skill, category, title, minutes, [minBand, maxBand], phases, endpoint, summary, steps]) => ({
    id,
    skill,
    category,
    title,
    summary,
    minutes,
    minBand,
    maxBand,
    phases: [...phases],
    steps: [...steps],
    endpoint,
  }),
);

/** Skills a catalogue row can be tagged with (the four tested skills plus general exam experience). */
export const ACTIVITY_SKILLS: readonly StudyActivity['skill'][] = [
  'listening',
  'reading',
  'writing',
  'speaking',
  'general',
];

/** Plan phases a catalogue row can be tagged with, in execution order. */
export const ACTIVITY_PHASES: readonly PlanPhase[] = ALL4;

/**
 * Find one activity by id.
 *
 * @param id - Stable activity identifier.
 */
export function findActivity(id: string): StudyActivity | undefined {
  return STUDY_ACTIVITIES.find((activity) => activity.id === id);
}

/**
 * Activities for one skill whose band range covers `band`.
 *
 * @param skill - Skill (or `general`); `general` is excluded from skill pools.
 * @param band - Current band score in that skill.
 * @param phase - Week phase to remain inside.
 */
export function activitiesFor(
  skill: StudyActivity['skill'],
  band: number,
  phase: PlanPhase,
): StudyActivity[] {
  return STUDY_ACTIVITIES.filter(
    (activity) =>
      activity.skill === skill &&
      activity.phases.includes(phase) &&
      band >= activity.minBand &&
      band <= activity.maxBand,
  );
}

/**
 * Aggregate facts about the catalogue.
 */
export function activityStats(): {
  activities: number;
  bySkill: Record<string, number>;
  byCategory: Record<string, number>;
  withEndpoint: number;
} {
  const bySkill: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let withEndpoint = 0;
  for (const activity of STUDY_ACTIVITIES) {
    bySkill[activity.skill] = (bySkill[activity.skill] ?? 0) + 1;
    byCategory[activity.category] = (byCategory[activity.category] ?? 0) + 1;
    if (activity.endpoint !== null) {
      withEndpoint += 1;
    }
  }
  return { activities: STUDY_ACTIVITIES.length, bySkill, byCategory, withEndpoint };
}
