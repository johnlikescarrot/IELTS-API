/**
 * Curated, compact reference facts and original prompt metadata. This module
 * deliberately contains neither official test material nor third-party books.
 */
export const skillIds = [
  "listening",
  "reading",
  "writing",
  "speaking",
] as const;

export type SkillId = (typeof skillIds)[number];
export type ModuleId = "academic" | "general_training";
export type RawScoreTest =
  "listening" | "reading_academic" | "reading_general_training";
export type RawScoreTarget = 4 | 5 | 6 | 7 | 8;

export interface Source {
  id: string;
  publisher: string;
  title: string;
  url: string;
  accessedOn: string;
  supports: string[];
}

export interface Skill {
  id: SkillId;
  name: string;
  commonTo: "both" | "different";
  duration: string;
  parts: number;
  questionsOrTasks: number;
  summary: string;
  sourceIds: string[];
}

export interface PracticePrompt {
  id: string;
  skill: "speaking" | "writing";
  module: "both" | ModuleId;
  format: string;
  title: string;
  prompt: string;
  selfCheck: string[];
  license: "CC0-1.0";
}

export const sources: readonly Source[] = [
  {
    id: "ielts-scoring-detail",
    publisher: "IELTS",
    title: "IELTS scoring in detail",
    url: "https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail",
    accessedOn: "2026-09-04",
    supports: [
      "overall band calculation",
      "raw-score guidance",
      "writing weighting",
    ],
  },
  {
    id: "british-council-test-format",
    publisher: "British Council",
    title: "IELTS test format",
    url: "https://takeielts.britishcouncil.org/take-ielts/prepare/test-format",
    accessedOn: "2026-09-04",
    supports: ["section format", "timings", "question and task counts"],
  },
  {
    id: "british-council-scores",
    publisher: "British Council",
    title: "Understanding and explaining IELTS scores",
    url: "https://takeielts.britishcouncil.org/teach-ielts/test-information/ielts-scores-explained",
    accessedOn: "2026-09-04",
    supports: ["band scale", "score reporting"],
  },
] as const;

export const skills: readonly Skill[] = [
  {
    id: "listening",
    name: "Listening",
    commonTo: "both",
    duration:
      "About 30 minutes; paper delivery adds 10 minutes for answer transfer.",
    parts: 4,
    questionsOrTasks: 40,
    summary:
      "Four recorded parts with one mark available for each correct answer.",
    sourceIds: ["british-council-test-format", "ielts-scoring-detail"],
  },
  {
    id: "reading",
    name: "Reading",
    commonTo: "different",
    duration: "60 minutes",
    parts: 3,
    questionsOrTasks: 40,
    summary:
      "Academic and General Training use different reading material and raw-score conversions.",
    sourceIds: ["british-council-test-format", "ielts-scoring-detail"],
  },
  {
    id: "writing",
    name: "Writing",
    commonTo: "different",
    duration: "60 minutes",
    parts: 2,
    questionsOrTasks: 2,
    summary:
      "Academic Task 1 and General Training Task 1 differ; Task 2 receives more weight in marking.",
    sourceIds: ["british-council-test-format", "ielts-scoring-detail"],
  },
  {
    id: "speaking",
    name: "Speaking",
    commonTo: "both",
    duration: "11 to 14 minutes",
    parts: 3,
    questionsOrTasks: 3,
    summary: "A face-to-face assessment structured in three parts.",
    sourceIds: ["british-council-test-format"],
  },
] as const;

/**
 * Published indicative marks. Exact marks can vary slightly by test version,
 * so this table is intentionally not represented as a score converter.
 */
export const rawScoreThresholds: Readonly<
  Record<RawScoreTest, Readonly<Partial<Record<RawScoreTarget, number>>>>
> = {
  listening: { 5: 16, 6: 23, 7: 30, 8: 35 },
  reading_academic: { 5: 15, 6: 23, 7: 30, 8: 35 },
  reading_general_training: { 4: 15, 5: 23, 6: 30, 7: 35 },
};

export const practicePrompts: readonly PracticePrompt[] = [
  {
    id: "writing-academic-bicycle-data",
    skill: "writing",
    module: "academic",
    format: "Task 1-style data summary",
    title: "Bicycle use in a fictional city",
    prompt:
      "A fictional city tracked weekday bicycle trips from 2018 to 2025. Describe the main trends you would report if trips rose from 18,000 to 41,000, dipped briefly in 2021, and commuter trips grew faster than leisure trips.",
    selfCheck: [
      "Select and compare the most important features.",
      "Use a clear overview before detailed comparisons.",
      "Avoid adding reasons that are not shown by the data.",
    ],
    license: "CC0-1.0",
  },
  {
    id: "writing-general-library-letter",
    skill: "writing",
    module: "general_training",
    format: "Task 1-style letter",
    title: "A community library proposal",
    prompt:
      "Write to the manager of a community library about a proposed weekend study space. Explain why it would help, describe two practical features it should include, and say how local residents could support the project.",
    selfCheck: [
      "Use a purpose-appropriate greeting and closing.",
      "Cover all three requested points.",
      "Make the register consistently formal or semi-formal.",
    ],
    license: "CC0-1.0",
  },
  {
    id: "writing-both-public-green-space",
    skill: "writing",
    module: "both",
    format: "Task 2-style discussion",
    title: "Access to green space",
    prompt:
      "Some people think every new housing development should reserve land for public green space. Discuss both the benefits and possible drawbacks of this policy, then give your own view.",
    selfCheck: [
      "Answer every part of the question.",
      "Develop reasons with relevant examples.",
      "State a position that remains clear throughout.",
    ],
    license: "CC0-1.0",
  },
  {
    id: "speaking-both-neighbourhood-change",
    skill: "speaking",
    module: "both",
    format: "Part 2-style long turn",
    title: "A positive local change",
    prompt:
      "Describe a positive change in your neighbourhood. You should say what changed, who benefited, how people responded, and explain why the change mattered to you.",
    selfCheck: [
      "Speak continuously for one to two minutes.",
      "Use specific details instead of a memorised list.",
      "Explain the significance as well as the events.",
    ],
    license: "CC0-1.0",
  },
  {
    id: "speaking-both-technology-trust",
    skill: "speaking",
    module: "both",
    format: "Part 3-style discussion",
    title: "Trust in automated advice",
    prompt:
      "When should people trust automated advice, and when should they seek a human opinion instead? Discuss examples from education, travel, or healthcare.",
    selfCheck: [
      "Compare more than one context.",
      "Qualify claims where appropriate.",
      "Give reasons for each view you express.",
    ],
    license: "CC0-1.0",
  },
] as const;

export function findSkill(skillId: SkillId): Skill {
  const skill = skills.find((candidate) => candidate.id === skillId);

  if (skill === undefined) {
    throw new Error(`Unknown skill in catalog: ${skillId}`);
  }

  return skill;
}

export function findPracticePrompt(
  promptId: string,
): PracticePrompt | undefined {
  return practicePrompts.find((prompt) => prompt.id === promptId);
}
