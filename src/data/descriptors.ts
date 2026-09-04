import type { BandDescriptor, OverallBandLevel } from "../types.ts";

/**
 * Unofficial, paraphrased summaries of the public IELTS band scales for the
 * two productively assessed skills, written for this project. They are study
 * aids, not reproductions of the official descriptors.
 */
export const BAND_DESCRIPTORS: readonly BandDescriptor[] = [
  {
    skill: "writing",
    band: 5,
    summary:
      "A partial response: ideas are relevant but thin, organisation is loose and frequent errors sometimes obscure meaning.",
    keyFeatures: [
      "addresses the task only partially; the format may suit the question imperfectly",
      "presents information with some organisation but links between ideas are faulty",
      "uses a limited vocabulary with noticeable repetition",
      "attempts basic sentences; grammatical errors are frequent",
    ],
  },
  {
    skill: "writing",
    band: 6,
    summary:
      "An adequate response: the task is addressed with relevant ideas, though development is uneven and errors are noticeable.",
    keyFeatures: [
      "addresses the task, although some parts are covered more fully than others",
      "arranges information and ideas coherently with a clear overall progression",
      "uses an adequate range of vocabulary and attempts less common words",
      "mixes simple and complex sentence forms with some control",
    ],
  },
  {
    skill: "writing",
    band: 7,
    summary:
      "A good response: the task is well covered, positions are clear and errors rarely get in the way of communication.",
    keyFeatures: [
      "covers all parts of the task and presents a clear position throughout",
      "logically sequences information and ideas with a range of cohesive devices",
      "uses a sufficient range of vocabulary with some flexibility and precision",
      "uses a variety of complex structures with good control of grammar",
    ],
  },
  {
    skill: "writing",
    band: 8,
    summary:
      "A very good response: the task is handled thoroughly, ideas flow naturally and errors are rare and minor.",
    keyFeatures: [
      "addresses all parts of the task with well-developed ideas",
      "sequences information skilfully and manages paragraphing well",
      "uses a wide vocabulary naturally, with only rare slips",
      "produces frequent error-free sentences with flexible complex structures",
    ],
  },
  {
    skill: "writing",
    band: 9,
    summary:
      "An expert response: the question is fully answered with sophisticated, precise language and near-total control.",
    keyFeatures: [
      "fully satisfies all requirements of the task",
      "uses cohesion so effortlessly that it attracts no attention",
      "commands a wide range of vocabulary with skilful and natural use",
      "maintains full range and accuracy of complex structures throughout",
    ],
  },
  {
    skill: "speaking",
    band: 5,
    summary:
      "Speech is usually maintained but relies on repetition, slow delivery and self-correction; frequent errors and pronunciation lapses strain the listener.",
    keyFeatures: [
      "usually keeps going but hesitates and repeats while searching for language",
      "can talk about familiar topics using simple vocabulary",
      "produces basic sentence forms with reasonable accuracy",
      "frequent mispronunciation can cause strain for the listener",
    ],
  },
  {
    skill: "speaking",
    band: 6,
    summary:
      "Willing to speak at length despite some hesitation; vocabulary is adequate and errors occur but meaning stays clear.",
    keyFeatures: [
      "speaks at length, though with occasional loss of coherence",
      "has enough vocabulary to discuss topics at length with some paraphrasing",
      "combines simple and complex forms with flexible use",
      "pronunciation is generally clear despite some effortful sounds",
    ],
  },
  {
    skill: "speaking",
    band: 7,
    summary:
      "Speaks at length without noticeable effort; language is used flexibly and errors, while present, are occasional.",
    keyFeatures: [
      "speaks at length with no real loss of coherence",
      "uses vocabulary flexibly to discuss a range of topics, with some idiomatic language",
      "shows good control of a range of grammatical structures",
      "clear pronunciation throughout with only rare lapses",
    ],
  },
  {
    skill: "speaking",
    band: 8,
    summary:
      "Fluent and mostly effortless speech with a broad vocabulary; rare hesitation and mostly accurate complex language.",
    keyFeatures: [
      "develops topics coherently and appropriately with smooth linking",
      "uses a wide vocabulary, including idiomatic and less common items",
      "produces mostly error-free sentences of varied complexity",
      "uses a full range of pronunciation features flexibly",
    ],
  },
  {
    skill: "speaking",
    band: 9,
    summary:
      "Expert speech: fluent, precise and effortless, with full flexibility of language and pronunciation that is easy to follow.",
    keyFeatures: [
      "speaks fluently with only rare, natural hesitation",
      "uses vocabulary with complete flexibility and precision in all contexts",
      "produces consistent, accurate complex speech",
      "pronunciation is effortless to understand throughout",
    ],
  },
];

/** The overall nine-band scale with its standard labels. */
export const OVERALL_BAND_SCALE: readonly OverallBandLevel[] = [
  { band: 9, label: "Expert user", meaning: "Has fully operational command of the language: appropriate, accurate and fluent with complete understanding." },
  { band: 8, label: "Very good user", meaning: "Has full command with only occasional unsystematic inaccuracies; handles complex argument well." },
  { band: 7, label: "Good user", meaning: "Has operational command of the language, with occasional inaccuracies and misunderstandings in familiar situations." },
  { band: 6, label: "Competent user", meaning: "Has generally effective command despite some errors; can use fairly complex language, especially in familiar contexts." },
  { band: 5, label: "Modest user", meaning: "Has partial command of the language, coping with overall meaning in most situations, though mistakes are likely." },
  { band: 4, label: "Limited user", meaning: "Basic competence is limited to familiar situations; frequent problems with understanding and expression." },
  { band: 3, label: "Extremely limited user", meaning: "Conveys and understands only general meaning in very familiar situations; breakdowns occur often." },
  { band: 2, label: "Intermittent user", meaning: "Has great difficulty understanding spoken and written English." },
  { band: 1, label: "Non-user", meaning: "Has essentially no ability to use the language beyond isolated words." },
  { band: 0, label: "Did not attempt", meaning: "Did not answer any questions; no assessable information." },
];
