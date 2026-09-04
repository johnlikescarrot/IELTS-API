/**
 * Analytic band descriptors for the productive IELTS papers.
 *
 * The strings below are concise, original paraphrases of the publicly available
 * band descriptors for Writing Task 1, Writing Task 2 and Speaking. They are
 * written to be machine-comparable across bands: each descriptor names the
 * observable behaviour that separates the band from its neighbours. They are a
 * research and tooling aid, not a substitute for examiner training material.
 *
 * @packageDocumentation
 */

import type { Band, Rubric, RubricCriterion } from "../core/types.ts";

/** A descriptor for one criterion at one band. */
export interface BandDescriptor {
  /** The rubric the descriptor belongs to. */
  readonly rubric: Rubric;
  /** The criterion being described. */
  readonly criterion: RubricCriterion;
  /** The whole band being described. */
  readonly band: Band;
  /** A paraphrased description of performance at this band. */
  readonly descriptor: string;
}

/** The four criteria assessed for each rubric, in reporting order. */
export const RUBRIC_CRITERIA_ORDER: Readonly<
  Record<Rubric, readonly RubricCriterion[]>
> = Object.freeze({
  "writing-task-1": [
    "task-achievement",
    "coherence-and-cohesion",
    "lexical-resource",
    "grammatical-range-and-accuracy",
  ],
  "writing-task-2": [
    "task-response",
    "coherence-and-cohesion",
    "lexical-resource",
    "grammatical-range-and-accuracy",
  ],
  speaking: [
    "fluency-and-coherence",
    "lexical-resource",
    "grammatical-range-and-accuracy",
    "pronunciation",
  ],
});

type DescriptorLadder = readonly [
  string, // band 9
  string, // band 8
  string, // band 7
  string, // band 6
  string, // band 5
  string, // band 4
  string, // band 3
  string, // band 2
  string, // band 1
  string, // band 0
];

const TASK_ACHIEVEMENT: DescriptorLadder = [
  "Fully satisfies every requirement of the task and presents a clear, complete and accurate overview of the key information.",
  "Covers all requirements sufficiently, presents and highlights key features clearly, and any omissions are minor.",
  "Covers the requirements, presents a clear overview of the main trends or stages, and highlights key features, though detail may be uneven.",
  "Addresses the requirements and presents an overview, but key features are inadequately covered or details are mechanical or occasionally inaccurate.",
  "Addresses the task only generally, presents no clear overview, and mixes irrelevant, repetitive or inaccurate detail with key features.",
  "Attempts the task but does not cover the key features, and the response may be inappropriate in format or largely inaccurate.",
  "Presents no relevant overview and misunderstands substantial parts of the input data or prompt.",
  "Barely responds to the task; the answer is largely unrelated to the input material.",
  "Provides no more than a handful of isolated words connected to the prompt.",
  "Did not attempt the task, or the response is wholly memorised or not written by the candidate.",
];

const TASK_RESPONSE: DescriptorLadder = [
  "Fully addresses all parts of the prompt and develops a well-supported, consistently relevant position throughout.",
  "Addresses all parts of the prompt with a well-developed response and relevant, extended and supported ideas.",
  "Addresses all parts of the prompt, presents a clear position throughout, and extends main ideas although some may be under-developed.",
  "Addresses all parts of the prompt, though some parts more fully than others, and presents a position with ideas that are not always fully developed.",
  "Addresses the prompt only partially, expresses a position without clear development, and presents main ideas with limited or repetitive support.",
  "Responds to the prompt only tangentially, presents a position that is unclear, and offers few developed ideas.",
  "Does not adequately address any part of the prompt and expresses ideas that are largely undeveloped or irrelevant.",
  "Barely responds to the prompt and expresses no discernible position.",
  "Produces only isolated words with no argument.",
  "Did not attempt the task, or the response is wholly memorised or not written by the candidate.",
];

const WRITING_COHERENCE: DescriptorLadder = [
  "Organises information effortlessly; cohesion attracts no attention and paragraphing is entirely appropriate.",
  "Sequences information logically, manages all aspects of cohesion well, and paragraphs adequately and appropriately.",
  "Organises information with clear progression, uses a range of cohesive devices appropriately although with some over- or under-use, and paragraphs by topic.",
  "Arranges information coherently and shows clear overall progression, but cohesive devices are used mechanically or inaccurately and paragraphing may be illogical.",
  "Presents information with some organisation but no clear progression; cohesive devices are inadequate, repetitive or faulty and paragraphing may be absent.",
  "Presents information without clear arrangement, and relationships between ideas are frequently unclear.",
  "Fails to organise ideas logically; only very basic connectors appear and they are often repeated or misused.",
  "Shows almost no control of organisational features.",
  "Produces no organised message.",
  "Did not attempt the task, or the response is wholly memorised or not written by the candidate.",
];

const WRITING_LEXIS: DescriptorLadder = [
  "Uses a wide range of vocabulary with natural and sophisticated control; rare minor slips occur only as slips of the pen.",
  "Uses a wide range of vocabulary fluently and flexibly to convey precise meanings, with occasional inaccuracy in word choice or collocation.",
  "Uses a sufficient range of vocabulary to allow some flexibility and precision, uses less common items with some awareness of style, and makes occasional errors in word choice, spelling or word formation.",
  "Uses an adequate range of vocabulary for the task and attempts less common vocabulary with some inaccuracy; spelling and word-formation errors do not impede communication.",
  "Uses a limited range of vocabulary that is minimally adequate; noticeable errors in spelling and word formation may cause difficulty for the reader.",
  "Uses only basic vocabulary that is repetitive or inappropriate for the task, and errors in spelling and word formation may strain the reader.",
  "Uses an extremely limited range of words with little control of word formation or spelling.",
  "Uses only isolated words with essentially no control.",
  "Produces no usable lexical resource beyond a few isolated words.",
  "Did not attempt the task, or the response is wholly memorised or not written by the candidate.",
];

const WRITING_GRAMMAR: DescriptorLadder = [
  "Uses a wide range of structures with full flexibility and accuracy; rare minor slips occur only as slips of the pen.",
  "Uses a wide range of structures with the majority of sentences error free and only occasional non-systematic errors.",
  "Uses a variety of complex structures, produces frequent error-free sentences, and controls grammar and punctuation well despite a few errors.",
  "Uses a mix of simple and complex sentence forms; errors in grammar and punctuation occur but rarely reduce communication.",
  "Uses only a limited range of structures, attempts complex sentences that are less accurate than simple ones, and makes frequent errors that may cause difficulty.",
  "Uses very limited structures with rare subordinate clauses; errors predominate and punctuation is often faulty.",
  "Attempts sentence forms but errors in grammar and punctuation predominate and distort meaning.",
  "Shows almost no control of sentence structure.",
  "Produces no evidence of sentence forms.",
  "Did not attempt the task, or the response is wholly memorised or not written by the candidate.",
];

const SPEAKING_FLUENCY: DescriptorLadder = [
  "Speaks fluently with only rare repetition or self-correction; hesitation is content-related and topics are developed fully and coherently.",
  "Speaks fluently with only occasional repetition or self-correction, and develops topics coherently and appropriately.",
  "Speaks at length without noticeable effort, though hesitation may occur while searching for language, and uses a range of connectives flexibly.",
  "Is willing to speak at length although coherence may be lost through repetition, self-correction or hesitation; uses a range of connectives, not always appropriately.",
  "Usually maintains flow of speech but relies on repetition, self-correction or slow speech; over-uses simple connectives with some breakdown in coherence.",
  "Cannot respond without noticeable pauses, speaks slowly with frequent repetition, and links only basic sentences with simple connectives.",
  "Speaks with long pauses, has limited ability to link simple sentences, and often fails to convey the basic message.",
  "Pauses lengthily before most words and produces little communication.",
  "Produces no communication.",
  "Did not attend the interview.",
];

const SPEAKING_LEXIS: DescriptorLadder = [
  "Uses vocabulary with full flexibility and precision in all topics and uses idiomatic language naturally and accurately.",
  "Uses a wide vocabulary resource readily and flexibly to convey precise meaning, uses less common and idiomatic language skilfully, and paraphrases effectively.",
  "Uses a flexible vocabulary resource to discuss a variety of topics, uses less common and idiomatic vocabulary with some inappropriate choices, and paraphrases effectively.",
  "Has a wide enough vocabulary to discuss topics at length and make meaning clear despite inappropriate choices, and paraphrases successfully in general.",
  "Manages to talk about familiar and unfamiliar topics but uses vocabulary with limited flexibility and attempts paraphrase with mixed success.",
  "Is able to talk about familiar topics only, conveying basic meaning on unfamiliar topics, and makes frequent errors in word choice.",
  "Uses simple vocabulary to convey personal information and has insufficient resource for less familiar topics.",
  "Uses only isolated words or memorised utterances.",
  "Produces no communication.",
  "Did not attend the interview.",
];

const SPEAKING_GRAMMAR: DescriptorLadder = [
  "Uses a full range of structures naturally and appropriately with consistently accurate production.",
  "Uses a wide range of structures flexibly and produces the majority of sentences error free with only occasional inappropriacies or basic errors.",
  "Uses a range of complex structures with some flexibility and produces frequent error-free sentences, though some grammatical mistakes persist.",
  "Uses a mix of simple and complex structures with limited flexibility; complex structures contain errors that rarely cause comprehension problems.",
  "Produces basic sentence forms with reasonable accuracy but uses a limited range of complex structures which usually contain errors.",
  "Produces basic sentence forms and some short correct utterances, but subordinate clauses are rare and errors are frequent.",
  "Attempts basic sentence forms with limited success and relies heavily on memorised utterances.",
  "Cannot produce basic sentence forms.",
  "Produces no communication.",
  "Did not attend the interview.",
];

const SPEAKING_PRONUNCIATION: DescriptorLadder = [
  "Uses the full range of pronunciation features with precision and subtlety and is effortless to understand throughout.",
  "Uses a wide range of pronunciation features, sustains flexible use with occasional lapses, and is easy to understand throughout.",
  "Shows all the positive features of band 6 and some of band 8: pronunciation features are used effectively with only occasional lapses.",
  "Uses a range of pronunciation features with mixed control; some effective use is shown but lapses occur and the listener must occasionally make an effort.",
  "Shows all the positive features of band 4 and some of band 6: mispronunciation is frequent and causes some difficulty for the listener.",
  "Uses a limited range of pronunciation features, attempts to control them but lapses are frequent, and mispronunciations frequently strain the listener.",
  "Shows some of the features of band 2 and some of band 4: speech is often unintelligible.",
  "Speech is often unintelligible.",
  "Produces no communication.",
  "Did not attend the interview.",
];

const LADDERS: Readonly<
  Record<Rubric, Readonly<Partial<Record<RubricCriterion, DescriptorLadder>>>>
> = Object.freeze({
  "writing-task-1": {
    "task-achievement": TASK_ACHIEVEMENT,
    "coherence-and-cohesion": WRITING_COHERENCE,
    "lexical-resource": WRITING_LEXIS,
    "grammatical-range-and-accuracy": WRITING_GRAMMAR,
  },
  "writing-task-2": {
    "task-response": TASK_RESPONSE,
    "coherence-and-cohesion": WRITING_COHERENCE,
    "lexical-resource": WRITING_LEXIS,
    "grammatical-range-and-accuracy": WRITING_GRAMMAR,
  },
  speaking: {
    "fluency-and-coherence": SPEAKING_FLUENCY,
    "lexical-resource": SPEAKING_LEXIS,
    "grammatical-range-and-accuracy": SPEAKING_GRAMMAR,
    pronunciation: SPEAKING_PRONUNCIATION,
  },
});

/** Every descriptor, flattened and ordered by rubric, criterion and band. */
export const BAND_DESCRIPTORS: readonly BandDescriptor[] = Object.freeze(
  (Object.keys(LADDERS) as Rubric[]).flatMap((rubric) =>
    RUBRIC_CRITERIA_ORDER[rubric].flatMap((criterion) => {
      const ladder = LADDERS[rubric][criterion]!;
      return ladder.map((descriptor, index) => ({
        rubric,
        criterion,
        band: 9 - index,
        descriptor,
      }));
    }),
  ),
);

/**
 * Returns every descriptor for a rubric, optionally filtered by criterion or
 * band.
 *
 * @param rubric - The rubric to query.
 * @param filter - Optional criterion and whole-band filters.
 */
export function descriptorsFor(
  rubric: Rubric,
  filter: { criterion?: RubricCriterion; band?: Band } = {},
): readonly BandDescriptor[] {
  return BAND_DESCRIPTORS.filter(
    (entry) =>
      entry.rubric === rubric &&
      (filter.criterion === undefined ||
        entry.criterion === filter.criterion) &&
      (filter.band === undefined || entry.band === filter.band),
  );
}
