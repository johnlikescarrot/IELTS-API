import type { BandDescriptor, IeltsSkill } from "../types.js";

/**
 * Summarised public band descriptors for the four IELTS skills. These are
 * high-level summaries for study purposes and always note the official source.
 */
export const bandDescriptors: BandDescriptor[] = [
  // Writing
  {
    id: "band-writing-9",
    skill: "writing",
    band: 9,
    levelLabel: "Expert user",
    criteria: [
      "Fully addresses all parts of the task",
      "Uses a wide range of vocabulary with precise meaning",
      "Uses a wide range of grammatical structures with no errors",
      "Organises ideas coherently and cohesively",
    ],
  },
  {
    id: "band-writing-7",
    skill: "writing",
    band: 7,
    levelLabel: "Good user",
    criteria: [
      "Addresses all parts of the task",
      "Uses a range of less common vocabulary",
      "Uses a variety of complex structures with only occasional errors",
      "Uses cohesive devices effectively",
    ],
  },
  {
    id: "band-writing-6",
    skill: "writing",
    band: 6,
    levelLabel: "Competent user",
    criteria: [
      "Addresses the task, though some parts may be underdeveloped",
      "Uses an adequate range of vocabulary",
      "Uses a mix of simple and complex sentences",
      "Errors do not impede communication",
    ],
  },
  {
    id: "band-writing-5",
    skill: "writing",
    band: 5,
    levelLabel: "Modest user",
    criteria: [
      "Addresses the task only partially",
      "Uses limited vocabulary",
      "Frequent grammatical errors",
      "Weak organisation",
    ],
  },
  // Speaking
  {
    id: "band-speaking-9",
    skill: "speaking",
    band: 9,
    levelLabel: "Expert user",
    criteria: [
      "Speaks fluently with little hesitation",
      "Uses idiomatic language naturally",
      "Pronounces clearly, with effective intonation",
      "Develops topics fully and coherently",
    ],
  },
  {
    id: "band-speaking-7",
    skill: "speaking",
    band: 7,
    levelLabel: "Good user",
    criteria: [
      "Speaks at length without noticeable effort",
      "Uses a range of connectives and discourse markers",
      "Uses a range of vocabulary, including some idioms",
      "Minor errors that do not affect meaning",
    ],
  },
  {
    id: "band-speaking-6",
    skill: "speaking",
    band: 6,
    levelLabel: "Competent user",
    criteria: [
      "Willing to speak at length, though with some hesitation",
      "Uses a sufficient range of vocabulary",
      "Uses a mix of simple and complex structures",
      "Pronounces clearly, with occasional slips",
    ],
  },
  {
    id: "band-speaking-5",
    skill: "speaking",
    band: 5,
    levelLabel: "Modest user",
    criteria: [
      "Speaks with noticeable hesitation",
      "Uses limited range of vocabulary",
      "Frequent grammatical errors",
      "Pronunciation may cause difficulty",
    ],
  },
  // Reading
  {
    id: "band-reading-9",
    skill: "reading",
    band: 9,
    levelLabel: "Expert user",
    criteria: [],
  },
  {
    id: "band-reading-7",
    skill: "reading",
    band: 7,
    levelLabel: "Good user",
    criteria: [],
  },
  // Listening
  {
    id: "band-listening-9",
    skill: "listening",
    band: 9,
    levelLabel: "Expert user",
    criteria: [],
  },
  {
    id: "band-listening-7",
    skill: "listening",
    band: 7,
    levelLabel: "Good user",
    criteria: [],
  },
];

/** Return band descriptors filtered by skill, optionally by exact band. */
export function getBandDescriptors(skill?: IeltsSkill, band?: number): BandDescriptor[] {
  return bandDescriptors.filter((descriptor) => {
    const skillMatch = skill === undefined || descriptor.skill === skill;
    const bandMatch = band === undefined || descriptor.band === band;
    return skillMatch && bandMatch;
  });
}

/** Find a single band descriptor by id. */
export function getBandDescriptorById(id: string): BandDescriptor | undefined {
  return bandDescriptors.find((descriptor) => descriptor.id === id);
}
