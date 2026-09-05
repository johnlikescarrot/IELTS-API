/**
 * Learning-strategy cards for the four IELTS skills.
 *
 * IELTS preparation advice is abundant and evidentially uneven. These cards
 * take the opposite approach: every strategy states a concrete action, the
 * mechanism it exploits, and an honest `evidence` label — either a pointer to
 * the research that supports it, or an explicit `practitioner convention`
 * admission where no controlled evidence exists. The band ranges say who the
 * strategy is for; strategies are deliberately excluded from candidates who
 * have outgrown them.
 *
 * The research pointers name well-known published findings (author, year) so
 * that a paper citing this dataset can cite the underlying literature too;
 * no source text is reproduced.
 */

import { matchesQuery, paginate } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { Skill, StrategyCard } from '../types.js';

/** Skills the strategy bank covers, in test order. */
export const STRATEGY_SKILLS: readonly Skill[] = ['listening', 'reading', 'writing', 'speaking'];

/** The strategy bank. */
export const STRATEGIES: readonly StrategyCard[] = [
  /* ------------------------------------------------------------------ listening */
  {
    id: 'st-listening-01',
    skill: 'listening',
    title: 'Read the questions before the audio starts',
    bands: [4, 9],
    action:
      'Use every pause and the initial instructions to underline the question words — name, date, reason — and predict what kind of answer each gap needs.',
    rationale:
      'Prediction narrows attention to the information actually tested, so the first hearing is a check rather than a hunt.',
    evidence:
      'Pre-listening question preview is standard test-taking guidance; aligns with schema theory in listening research (Field, 2008).',
  },
  {
    id: 'st-listening-02',
    skill: 'listening',
    title: 'Practise with transcripts, not just audio',
    bands: [4, 6.5],
    action:
      'After each practice recording, listen again while reading the transcript, marking every word you had heard as a blur; then re-listen without it.',
    rationale:
      'Most comprehension failures at lower bands are form-meaning mismatches — fast, reduced speech you cannot map — and transcripts expose them explicitly.',
    evidence:
      'Consistent with instructed second-language listening research emphasising form-meaning mapping (Field, 2008).',
  },
  {
    id: 'st-listening-03',
    skill: 'listening',
    title: 'Plan, monitor, evaluate each section',
    bands: [6, 9],
    action:
      'Before a section, set one intention (“catch the numbers”); if you lose the thread, note where without panic; after it, spend ten seconds naming what lost you.',
    rationale:
      'Metacognitive procedures measurably improve listening performance because learners allocate attention deliberately instead of reactively.',
    evidence:
      'Metacognitive instruction improved listening in a classroom quasi-experiment (Vandergrift & Tafaghodtari, 2010).',
  },
  {
    id: 'st-listening-04',
    skill: 'listening',
    title: 'Drill the plural -s and the past -ed',
    bands: [4, 6.5],
    action:
      'Keep an error log of missed final consonants during practice and review it weekly; dictate short passages that contrast singular/plural and present/past.',
    rationale:
      'Short-answer scoring depends on exact words; English’s most common dropped endings change the answer key, not just the accent.',
    evidence:
      'Practitioner convention; morphological underspecification is a documented learner-listening error source.',
  },
  {
    id: 'st-listening-05',
    skill: 'listening',
    title: 'Listen to one thing twice at speed, then once at 1.25×',
    bands: [6, 9],
    action:
      'Replay lecture material once at normal speed for comprehension, then a final pass at 1.25×, and answer the questions at normal speed again.',
    rationale:
      'Practising above test speed lowers the perceived rate of the real recording, a task-variance effect rather than “volume” practice.',
    evidence:
      'Overlearning at varied rates draws on desirable-difficulties research (Bjork & Bjork, 2011); speed-up effects are practitioner convention.',
  },
  {
    id: 'st-listening-06',
    skill: 'listening',
    title: 'Protect the answer you already wrote',
    bands: [4, 9],
    action:
      'If you miss an answer, write the best guess from context and move on; never leave a gap to “hear it again in your head”.',
    rationale:
      'Trying to recall a passed segment steals attention from the next two answers, where points are still available.',
    evidence: 'Practitioner convention; test-allocation reasoning, no controlled study specific to IELTS.',
  },
  /* -------------------------------------------------------------------- reading */
  {
    id: 'st-reading-01',
    skill: 'reading',
    title: 'Skim for the map, scan for the address',
    bands: [4, 9],
    action:
      'Give the passage 2–3 minutes to read title, first lines and last lines of paragraphs; only then read closely for the specific detail each question demands.',
    rationale:
      'A structural map lets you skip to the right paragraph instead of re-reading the passage for every question.',
    evidence:
      'Skimming/scanning are the strategies measured in L2 reading process research (Grabe & Stoller, 2011).',
  },
  {
    id: 'st-reading-02',
    skill: 'reading',
    title: 'Answer Not given from the text, not from the world',
    bands: [5.5, 9],
    action:
      'For True/False/Not given, decide “what sentence would make this false?” If you cannot point to a contradicting sentence, the answer is Not given — never “unlikely”.',
    rationale:
      'False means contradicted, Not given means unevidenced; candidates lose marks by importing plausibility judgements.',
    evidence:
      'Item-design principle stated in official preparation guidance; consistent with relevance-based verification accounts.',
  },
  {
    id: 'st-reading-03',
    skill: 'reading',
    title: 'Read the first and last sentence of every paragraph',
    bands: [6, 9],
    action:
      'For heading-matching tasks, first reduce each paragraph to its opening and closing sentence; only read the body when the two ends conflict.',
    rationale:
      'English academic paragraphs are topic-sentence driven, so the ends carry the paragraph’s claim more reliably than its middle.',
    evidence: 'Paragraph-schema research on academic discourse structure (Grabe & Stoller, 2011).',
  },
  {
    id: 'st-reading-04',
    skill: 'reading',
    title: 'Bank vocabulary by topic before you practise',
    bands: [5, 8],
    action:
      'Before a practice test on, say, rivers or museums, write ten topic words with one-line glosses; recycle the list the next day.',
    rationale:
      'Prior topical knowledge is a larger predictor of reading success than general level, and a small primed lexicon changes what you notice.',
    evidence:
      'Background-knowledge effects in L2 comprehension (e.g. Lee & Schallert, 1997); recycling aligns with spacing effects (Cepeda et al., 2006).',
  },
  {
    id: 'st-reading-05',
    skill: 'reading',
    title: 'Train the clock in thirds, then in tenths',
    bands: [5.5, 9],
    action:
      'Practise with a visible timer: 20 minutes per passage for six weeks; then cut to 18 minutes for two weeks before the test.',
    rationale:
      'Time pressure, not comprehension, is the dominant failure mode; rehearsing under slightly tighter time makes test time feel generous.',
    evidence:
      'Desirable-difficulties framing (Bjork & Bjork, 2011); the specific taper is practitioner convention.',
  },
  {
    id: 'st-reading-06',
    skill: 'reading',
    title: 'Read a lot of easy things',
    bands: [4, 7],
    action:
      'Between practice tests, read 20–30 minutes of genuinely easy material daily — graded readers or long magazine pieces — without looking up words.',
    rationale:
      'Fluency is built by volume at high comprehension; test passages stop feeling like foreign terrain when reading is just normal.',
    evidence:
      'Extensive reading meta-analyses report positive effects on reading comprehension (e.g. Jeon & Yamashita, 2014).',
  },
  /* -------------------------------------------------------------------- writing */
  {
    id: 'st-writing-01',
    skill: 'writing',
    title: 'Five minutes of plan, twenty of prose',
    bands: [5, 9],
    action:
      'Spend the first five of forty Task 2 minutes writing a one-line position and one idea per body paragraph; refuse to start prose until the skeleton exists.',
    rationale:
      'Task Response and Coherence are judged at the essay level; an unwritten position is the most common cause of a band-6 ceiling.',
    evidence:
      'Planning-time effects on L2 writing quality are documented in process studies (e.g. Kellogg, 1994, planning-revising framework).',
  },
  {
    id: 'st-writing-02',
    skill: 'writing',
    title: 'One clear position, defended, not balanced away',
    bands: [6, 9],
    action:
      'For opinion essays, choose a side in the introduction and make every body paragraph advance it, conceding only in a subordinate clause.',
    rationale:
      'Examiners reward a consistent position; “on the other hand” essays that never decide plateau at band 6 for Task Response.',
    evidence:
      'Stated in public band-descriptor guidance; paraphrased here — see the official descriptors for authoritative wording.',
  },
  {
    id: 'st-writing-03',
    skill: 'writing',
    title: 'One idea, one paragraph, one topic sentence',
    bands: [5, 9],
    action:
      'Open each body paragraph with the claim, then support it with explanation and one example; if a sentence needs its own paragraph, split.',
    rationale:
      'Coherence and Cohesion bands hinge on visible progression; a topic sentence is the cheapest cohesion device that always works.',
    evidence: 'Rhetorical-structure conventions of academic English (Grabe & Stoller, 2011).',
  },
  {
    id: 'st-writing-04',
    skill: 'writing',
    title: 'Collect collocations, not fancy adjectives',
    bands: [6, 9],
    action:
      'Keep a personal collocation file (heavy rain, raise awareness, pose a threat); when checking a text, upgrade word by word rather than swapping in thesaurus words.',
    rationale:
      'Lexical Resource rewards accurate, unusual *combinations*; single-word thesaurus upgrades typically break register or collocation.',
    evidence: 'The lexical approach: phraseology drives accuracy (Lewis, 1993; Wray, 2002).',
  },
  {
    id: 'st-writing-05',
    skill: 'writing',
    title: 'Book the last three minutes for one check',
    bands: [5, 9],
    action:
      'Reserve three minutes per task and scan for exactly four things: subject-verb agreement, articles, past-tense forms, and unfinished sentences.',
    rationale:
      'Grammatical Range and Accuracy is degraded by a few systematic slips; a scripted proofread catches high-frequency errors, not imagined ones.',
    evidence:
      'Error-frequency profiles in learner corpora; checking routines align with revision-strategy research (Kellogg, 1994).',
  },
  {
    id: 'st-writing-06',
    skill: 'writing',
    title: 'Grade your own essay against the descriptors',
    bands: [5.5, 9],
    action:
      'Once a week, score a past essay against the four criterion rows for your target band and write one sentence of evidence per score; compare with a teacher or a second reader when possible.',
    rationale:
      'Self-assessment against rubrics improves writing because learners internalise the criteria that currently surprise them.',
    evidence: 'Feedback and formative-assessment effects (Hattie & Timperley, 2007).',
  },
  /* ------------------------------------------------------------------- speaking */
  {
    id: 'st-speaking-01',
    skill: 'speaking',
    title: 'Record, listen once, re-answer',
    bands: [5, 9],
    action:
      'Record a Part 1 or Part 3 answer, listen at normal speed marking fluency breaks, then give the same answer again immediately.',
    rationale:
      'The second attempt is measurally better, and the gap between attempts is exactly the rehearsal the examiner rewards.',
    evidence:
      'Recording-based self-monitoring in L2 speaking practice; aligned with output practice effects (Swain, 1995).',
  },
  {
    id: 'st-speaking-02',
    skill: 'speaking',
    title: 'Use the one-minute preparation as notes, not a script',
    bands: [5, 9],
    action:
      'On the Part 2 card, write four nouns or verbs in a cross (who, what, where, why); speak to the four points, glancing down only at transitions.',
    rationale:
      'Four anchors keep long turns coherent while leaving attention free for language; full sentences become a recitation that hurts Fluency.',
    evidence:
      'Planning-time research in L2 speech (Yuan & Felser, 2012, planning-effect review); note format is practitioner convention.',
  },
  {
    id: 'st-speaking-03',
    skill: 'speaking',
    title: 'Extend every answer: reason → example → concession',
    bands: [4, 7],
    action:
      'After any Part 1 answer, add one because-clause, one small example, and one “although…” sentence; drill it until it is invisible.',
    rationale:
      'Length and elaboration are the fastest Fluency and Coherence gains available at Part 1, where short answers plateau the band.',
    evidence:
      'Fluency-band relationships reported in IELTS rating studies (e.g. Davidson, 2005-style analyses); pattern is practitioner convention.',
  },
  {
    id: 'st-speaking-04',
    skill: 'speaking',
    title: 'Work on sentence stress, not on an accent',
    bands: [5.5, 9],
    action:
      'Mark the one or two stress words per answer sentence, exaggerate them out loud, and record before and after; intelligibility, not native-likeness, is the goal.',
    rationale:
      'Pronunciation bands reward stress and chunking that make speech easy to parse; accent imitation wastes the same practice hours.',
    evidence: 'Intelligibility-pronunciation research in L2 phonology (Derwing & Munro, 2015).',
  },
  {
    id: 'st-speaking-05',
    skill: 'speaking',
    title: 'Recycle topic vocabulary with flashcards, spaced',
    bands: [4, 8],
    action:
      'Keep 20–30 speaking-topic chunks in a spaced-repetition app; review daily, and use each new chunk in one recorded answer that week.',
    rationale:
      'Retrieval practice with spacing moves chunks from recognition to speech; production in a real answer is the second retrieval.',
    evidence: 'Spacing and testing effects (Cepeda et al., 2006; Roediger & Karpicke, 2006).',
  },
  {
    id: 'st-speaking-06',
    skill: 'speaking',
    title: 'Buy ten minutes of real conversation a day',
    bands: [4, 7],
    action:
      'Have ten daily minutes of unstructured English — a language partner, a tutor exchange, even narrating your commute aloud — with no correction and no test.',
    rationale:
      'Test conversation skills are conversational first; the interactional reflexes that carry Part 1 are automatized by low-stakes volume.',
    evidence: 'Interaction hypothesis in SLA (Long, 1996); the daily-dose format is practitioner convention.',
  },
];

/**
 * Return every strategy for one skill.
 *
 * @param skill - Optional skill filter.
 */
export function strategiesFor(skill?: Skill): StrategyCard[] {
  if (skill === undefined) {
    return [...STRATEGIES];
  }
  return STRATEGIES.filter((strategy) => strategy.skill === skill);
}

/**
 * Look up one strategy card by identifier.
 *
 * @param id - Strategy identifier.
 */
export function findStrategy(id: string): StrategyCard | undefined {
  const needle = id.trim().toLowerCase();
  return STRATEGIES.find((strategy) => strategy.id.toLowerCase() === needle);
}

/** Aggregate statistics for the strategy bank. */
export type StrategyStats = {
  /** Number of cards. */
  strategies: number;
  /** Cards per skill. */
  bySkill: Record<string, number>;
};

/**
 * Statistics about the strategy bank.
 */
export function strategyStats(): StrategyStats {
  const bySkill: Record<string, number> = {};
  for (const strategy of STRATEGIES) {
    bySkill[strategy.skill] = (bySkill[strategy.skill] ?? 0) + 1;
  }
  return { strategies: STRATEGIES.length, bySkill };
}

/** Options accepted by {@link searchStrategies}. */
export type StrategyQuery = {
  /** Restrict to one skill. */
  skill?: Skill;
  /** Restrict to strategies calibrated for this band. */
  band?: number;
  /** Free-text search over title, action and rationale. */
  query?: string;
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

/**
 * Filter and paginate the strategy bank.
 *
 * @param options - Search options.
 */
export function searchStrategies(options: StrategyQuery): Page<StrategyCard> {
  const { skill, band, query = '' } = options;
  const filtered = STRATEGIES.filter((strategy) => {
    if (skill !== undefined && strategy.skill !== skill) {
      return false;
    }
    if (band !== undefined && (band < strategy.bands[0] || band > strategy.bands[1])) {
      return false;
    }
    if (query.length > 0 && !matchesQuery([strategy.title, strategy.action, strategy.rationale], query)) {
      return false;
    }
    return true;
  });
  return paginate(filtered, options.limit, options.offset);
}
