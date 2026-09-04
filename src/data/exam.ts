/**
 * Reference material describing the structure of the IELTS test. Content is
 * factual overview information about how the test is organised.
 */
import type { TestModule } from "../lib/types.js";

export interface VariantDescription {
  id: TestModule;
  name: string;
  audience: string;
  purpose: string;
}

export const VARIANTS: readonly VariantDescription[] = [
  {
    id: "academic",
    name: "IELTS Academic",
    audience: "People applying for higher education or professional registration.",
    purpose:
      "Assesses whether a candidate is ready to study or train in an English-medium environment.",
  },
  {
    id: "general",
    name: "IELTS General Training",
    audience: "People migrating to English-speaking countries or studying below degree level.",
    purpose:
      "Assesses everyday English skills needed for work and social situations in an English-speaking country.",
  },
];

export interface PaperPart {
  name: string;
  duration: string;
  questionCount: number;
  description: string;
  bandScale: string;
}

export interface PaperDescription {
  id: "listening" | "reading" | "writing" | "speaking";
  name: string;
  summary: string;
  bandScale: string;
  parts: readonly PaperPart[];
}

const BASE_PAPERS: readonly PaperDescription[] = [
  {
    id: "listening",
    name: "Listening",
    summary:
      "Four recorded monologues and conversations, each of increasing difficulty, with 40 questions in total.",
    bandScale: "0–40 raw marks converted to a band.",
    parts: [
      {
        name: "Section 1",
        duration: "approx. 30 minutes total for all sections",
        questionCount: 10,
        description: "A conversation in an everyday social context, such as booking accommodation.",
        bandScale: "",
      },
      {
        name: "Section 2",
        duration: "approx. 30 minutes total for all sections",
        questionCount: 10,
        description:
          "A monologue set in an everyday social context, such as a talk about local facilities.",
        bandScale: "",
      },
      {
        name: "Section 3",
        duration: "approx. 30 minutes total for all sections",
        questionCount: 10,
        description:
          "A conversation between up to four people in an educational or training context.",
        bandScale: "",
      },
      {
        name: "Section 4",
        duration: "approx. 30 minutes total for all sections",
        questionCount: 10,
        description: "A monologue on an academic subject, such as a university lecture.",
        bandScale: "",
      },
    ],
  },
  {
    id: "reading",
    name: "Reading",
    summary:
      "Three long passages with 40 questions. Passages are drawn from books, journals, magazines and newspapers.",
    bandScale: "0–40 raw marks converted to a band.",
    parts: [
      {
        name: "Passage 1",
        duration: "60 minutes for all three passages",
        questionCount: 13,
        description: "Often the most accessible text; topics may be descriptive or factual.",
        bandScale: "",
      },
      {
        name: "Passage 2",
        duration: "60 minutes for all three passages",
        questionCount: 13,
        description: "A mid-level passage; questions begin to test inference and attitude.",
        bandScale: "",
      },
      {
        name: "Passage 3",
        duration: "60 minutes for all three passages",
        questionCount: 14,
        description:
          "The most challenging passage; Academic passages may be argumentative or analytical.",
        bandScale: "",
      },
    ],
  },
  {
    id: "writing",
    name: "Writing",
    summary:
      "Two tasks completed in one hour. Task 1 differs by variant; Task 2 is an essay for both.",
    bandScale:
      "Each task scored 1–9 by examiners; Task 2 contributes roughly twice as much to the Writing band.",
    parts: [
      {
        name: "Task 1",
        duration: "60 minutes for both tasks (recommend ~20 minutes on Task 1)",
        questionCount: 1,
        description:
          "Academic: describe and summarise a graph, chart, table or diagram. General: write a letter.",
        bandScale: "One-third of the Writing mark.",
      },
      {
        name: "Task 2",
        duration: "60 minutes for both tasks (recommend ~40 minutes on Task 2)",
        questionCount: 1,
        description:
          "Write a discursive essay in response to a point of view, argument or problem.",
        bandScale: "Two-thirds of the Writing mark.",
      },
    ],
  },
  {
    id: "speaking",
    name: "Speaking",
    summary:
      "A face-to-face interview with a certified examiner in three parts, recorded for moderation.",
    bandScale: "Assessed 1–9 directly by the examiner.",
    parts: [
      {
        name: "Part 1",
        duration: "4–5 minutes",
        questionCount: 0,
        description:
          "Introduction and interview on familiar topics such as home, family, work or hobbies.",
        bandScale: "",
      },
      {
        name: "Part 2",
        duration: "1 minute preparation, then 1–2 minutes speaking",
        questionCount: 0,
        description: "A long turn: speak about a topic on a cue card, with prompts to guide you.",
        bandScale: "",
      },
      {
        name: "Part 3",
        duration: "4–5 minutes",
        questionCount: 0,
        description:
          "A two-way discussion connecting the Part 2 topic to broader, more abstract ideas.",
        bandScale: "",
      },
    ],
  },
];

export interface ExamOverview {
  name: string;
  ownerStatement: string;
  variants: readonly VariantDescription[];
  papers: readonly PaperDescription[];
  overallBandNote: string;
}

/** A note describing how the four components combine into an overall band. */
export const OVERALL_BAND_NOTE =
  "The four component bands are averaged and the result is rounded to the " +
  "nearest half band. A mean ending exactly in .25 is rounded up to the next " +
  "half band, and one ending in .75 is rounded up to the next whole band. " +
  "For example, 6.5, 7.0, 6.5 and 7.0 average to 6.75, which is reported as 7.0.";

/** Immutable, deep-frozen overview of the IELTS exam structure. */
export const EXAM_OVERVIEW: ExamOverview = Object.freeze({
  name: "IELTS (International English Language Testing System)",
  ownerStatement:
    "IELTS is jointly owned by the British Council, IDP: IELTS Australia and Cambridge Assessment English.",
  variants: VARIANTS,
  papers: BASE_PAPERS,
  overallBandNote: OVERALL_BAND_NOTE,
});

/** Return a defensive copy of a single paper by id. */
export function getPaper(
  id: "listening" | "reading" | "writing" | "speaking",
): PaperDescription | undefined {
  const paper = BASE_PAPERS.find((candidate) => candidate.id === id);
  return paper ? { ...paper, parts: paper.parts.map((part) => ({ ...part })) } : undefined;
}
