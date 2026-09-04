import { describe, expect, it } from "vitest";
import {
  BAND_DESCRIPTORS,
  CEFR_LEVELS,
  COMMON_MISTAKES,
  MISTAKE_CATEGORIES,
  OVERALL_BAND_SCALE,
  PARTS_OF_SPEECH,
  SPEAKING_TOPICS,
  STUDY_TIPS,
  TIP_SKILLS,
  TOPICS,
  VOCABULARY,
  WRITING_PROMPTS,
  WRITING_TYPES,
} from "../src/data/index.ts";

describe("vocabulary dataset", () => {
  it("has 120 entries with unique sequential ids and unique words", () => {
    expect(VOCABULARY).toHaveLength(120);
    const ids = new Set(VOCABULARY.map((entry) => entry.id));
    const words = new Set(VOCABULARY.map((entry) => entry.word.toLowerCase()));
    expect(ids.size).toBe(120);
    expect(words.size).toBe(120);
    expect([...ids].sort((a, b) => a - b)).toEqual(Array.from({ length: 120 }, (_, i) => i + 1));
  });

  it("fills every field on every entry", () => {
    for (const entry of VOCABULARY) {
      expect(entry.word.length).toBeGreaterThan(0);
      expect(entry.phonetic.startsWith("/")).toBe(true);
      expect(entry.definition.length).toBeGreaterThan(10);
      expect(entry.example.length).toBeGreaterThan(10);
      expect(entry.topics.length).toBeGreaterThan(0);
      expect(entry.synonyms.length).toBeGreaterThan(0);
      expect(entry.collocations.length).toBeGreaterThan(0);
      expect(CEFR_LEVELS).toContain(entry.cefr);
      expect(PARTS_OF_SPEECH).toContain(entry.partOfSpeech);
    }
  });

  it("only references topics that appear in the derived topic list", () => {
    for (const entry of VOCABULARY) {
      for (const topic of entry.topics) {
        expect(TOPICS).toContain(topic);
      }
    }
  });
});

describe("speaking dataset", () => {
  it("has ten topics with unique ids and complete parts", () => {
    expect(SPEAKING_TOPICS).toHaveLength(10);
    expect(new Set(SPEAKING_TOPICS.map((topic) => topic.id)).size).toBe(10);
    for (const topic of SPEAKING_TOPICS) {
      expect(topic.part1.length).toBeGreaterThanOrEqual(4);
      expect(topic.part2.cueCard).toContain("Describe");
      expect(topic.part2.prompts).toHaveLength(4);
      expect(topic.part2.followUp.length).toBeGreaterThanOrEqual(2);
      expect(topic.part3.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("writing dataset", () => {
  it("has 30 prompts with unique ids and sane targets", () => {
    expect(WRITING_PROMPTS).toHaveLength(30);
    expect(new Set(WRITING_PROMPTS.map((prompt) => prompt.id)).size).toBe(30);
    for (const prompt of WRITING_PROMPTS) {
      expect(prompt.prompt.length).toBeGreaterThan(30);
      expect(WRITING_TYPES).toContain(prompt.type);
      expect([1, 2]).toContain(prompt.task);
      expect(["academic", "general"]).toContain(prompt.module);
      expect(prompt.wordTarget).toBeGreaterThanOrEqual(150);
      expect([20, 40]).toContain(prompt.recommendedTimeMinutes);
    }
  });
});

describe("mistakes dataset", () => {
  it("has 40 mistakes with unique ids and distinct corrections", () => {
    expect(COMMON_MISTAKES).toHaveLength(40);
    expect(new Set(COMMON_MISTAKES.map((mistake) => mistake.id)).size).toBe(40);
    for (const mistake of COMMON_MISTAKES) {
      expect(MISTAKE_CATEGORIES).toContain(mistake.category);
      expect(mistake.incorrect).not.toBe(mistake.correct);
      expect(mistake.explanation.length).toBeGreaterThan(15);
    }
  });
});

describe("descriptors and tips datasets", () => {
  it("covers bands 5-9 for writing and speaking", () => {
    expect(BAND_DESCRIPTORS).toHaveLength(10);
    for (const skill of ["writing", "speaking"]) {
      const bands = BAND_DESCRIPTORS.filter((d) => d.skill === skill).map((d) => d.band);
      expect(bands).toEqual([5, 6, 7, 8, 9]);
    }
  });

  it("covers the full nine-band overall scale", () => {
    expect(OVERALL_BAND_SCALE.map((level) => level.band)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    expect(OVERALL_BAND_SCALE[0]?.label).toBe("Expert user");
  });

  it("has 24 tips across all skills", () => {
    expect(STUDY_TIPS).toHaveLength(24);
    expect(new Set(STUDY_TIPS.map((tip) => tip.id)).size).toBe(24);
    expect(TIP_SKILLS).toContain("general");
    for (const tip of STUDY_TIPS) {
      expect(tip.title.length).toBeGreaterThan(3);
      expect(tip.detail.length).toBeGreaterThan(20);
    }
  });
});
