import { describe, expect, it } from "vitest";
import { EXAM_OVERVIEW, getPaper, OVERALL_BAND_NOTE } from "../src/data/exam.js";
import {
  CUE_CARDS,
  CUE_CARD_CATEGORIES,
  SPEAKING_PARTS,
  getCueCard,
} from "../src/data/speaking.js";
import {
  WRITING_PROMPTS,
  WRITING_CATEGORIES,
  WRITING_TASK_GUIDE,
  getWritingPrompt,
} from "../src/data/writing.js";
import { QUESTION_TYPES, getQuestionType } from "../src/data/reading.js";
import { VOCABULARY, VOCAB_CATEGORY_IDS, getVocabCategory } from "../src/data/vocabulary.js";

describe("exam data", () => {
  it("provides a non-empty overview covering all four papers", () => {
    expect(EXAM_OVERVIEW.papers).toHaveLength(4);
    expect(EXAM_OVERVIEW.variants.length).toBeGreaterThan(0);
    expect(OVERALL_BAND_NOTE).toMatch(/6\.75/);
  });
  it("returns a defensive copy of a paper by id", () => {
    const paper = getPaper("writing");
    expect(paper?.id).toBe("writing");
    expect(paper?.parts.length).toBeGreaterThan(0);
  });
  it("returns undefined for an unknown paper id", () => {
    expect(getPaper("nope" as never)).toBeUndefined();
  });
});

describe("writing data", () => {
  it("contains prompts across several categories and tasks", () => {
    expect(WRITING_PROMPTS.length).toBeGreaterThan(10);
    expect(WRITING_CATEGORIES.length).toBeGreaterThan(3);
    expect(WRITING_PROMPTS.some((p) => p.task === 1)).toBe(true);
    expect(WRITING_PROMPTS.some((p) => p.task === 2)).toBe(true);
  });
  it("has a task guide with word and time goals", () => {
    expect(WRITING_TASK_GUIDE).toHaveLength(3);
    expect(WRITING_TASK_GUIDE[0]).toMatchObject({ task: 1, wordGoal: 150 });
  });
  it("looks up a prompt by id", () => {
    const first = WRITING_PROMPTS[0];
    expect(getWritingPrompt(first.id)).toEqual(first);
  });
  it("returns undefined for an unknown prompt id", () => {
    expect(getWritingPrompt("missing")).toBeUndefined();
  });
});

describe("speaking data", () => {
  it("contains cue cards and part guides", () => {
    expect(CUE_CARDS.length).toBeGreaterThan(5);
    expect(SPEAKING_PARTS).toHaveLength(3);
    expect(CUE_CARD_CATEGORIES.length).toBeGreaterThan(1);
  });
  it("looks up a cue card by id", () => {
    const card = CUE_CARDS[0];
    expect(getCueCard(card.id)).toEqual(card);
  });
  it("returns undefined for an unknown cue card id", () => {
    expect(getCueCard("missing")).toBeUndefined();
  });
});

describe("reading data", () => {
  it("lists several question types", () => {
    expect(QUESTION_TYPES.length).toBeGreaterThan(5);
  });
  it("looks up a question type by id", () => {
    expect(getQuestionType("tfng")).toBeDefined();
  });
  it("returns undefined for an unknown question type", () => {
    expect(getQuestionType("missing")).toBeUndefined();
  });
});

describe("vocabulary data", () => {
  it("exposes several categories each with words", () => {
    expect(VOCABULARY.length).toBeGreaterThan(3);
    for (const category of VOCABULARY) {
      expect(category.words.length).toBeGreaterThan(0);
      expect(category.words[0].meaning.length).toBeGreaterThan(0);
      expect(category.words[0].example.length).toBeGreaterThan(0);
    }
  });
  it("looks up a category by id", () => {
    expect(getVocabCategory("environment")).toBeDefined();
  });
  it("returns undefined for an unknown category", () => {
    expect(getVocabCategory("missing")).toBeUndefined();
  });
  it("flat category ids match the category list", () => {
    expect(VOCAB_CATEGORY_IDS).toEqual(VOCABULARY.map((c) => c.id));
  });
});
