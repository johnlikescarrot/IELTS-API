import { describe, expect, it } from "vitest";
import {
  MINIMUM_WORDS,
  WRITING_TASKS,
  WRITING_TASK_TYPES,
} from "../../src/data/writing-tasks.ts";
import {
  SPEAKING_CUE_CARDS,
  SPEAKING_CUE_CARD_TOPICS,
  SPEAKING_QUESTIONS,
  SPEAKING_TOPICS,
} from "../../src/data/speaking.ts";
import {
  COHESION_DEVICES,
  COHESION_FUNCTIONS,
  cohesionProfile,
} from "../../src/data/cohesion.ts";

describe("writing prompt corpus", () => {
  it("has unique identifiers and valid metadata", () => {
    const ids = WRITING_TASKS.map((task) => task.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const task of WRITING_TASKS) {
      expect(WRITING_TASK_TYPES).toContain(task.type);
      expect(task.prompt.length).toBeGreaterThan(60);
      expect(task.minimumWords).toBe(MINIMUM_WORDS[task.task]);
      expect(task.recommendedMinutes).toBe(task.task === 1 ? 20 : 40);
    }
  });

  it("covers both modules and both tasks", () => {
    expect(WRITING_TASKS.some((task) => task.module === "academic")).toBe(true);
    expect(
      WRITING_TASKS.some((task) => task.module === "general-training"),
    ).toBe(true);
    expect(
      WRITING_TASKS.filter((task) => task.task === 1).length,
    ).toBeGreaterThan(5);
    expect(
      WRITING_TASKS.filter((task) => task.task === 2).length,
    ).toBeGreaterThan(5);
  });
});

describe("speaking corpus", () => {
  it("has unique identifiers", () => {
    const ids = [
      ...SPEAKING_QUESTIONS.map((item) => item.id),
      ...SPEAKING_CUE_CARDS.map((item) => item.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only parts 1 and 3 for questions", () => {
    for (const question of SPEAKING_QUESTIONS) {
      expect([1, 3]).toContain(question.part);
      expect(question.question.endsWith("?")).toBe(true);
    }
  });

  it("gives every cue card three bullets and official timings", () => {
    for (const card of SPEAKING_CUE_CARDS) {
      expect(card.part).toBe(2);
      expect(card.bullets).toHaveLength(3);
      expect(card.preparationSeconds).toBe(60);
      expect(card.minimumSpeakingSeconds).toBe(60);
      expect(card.maximumSpeakingSeconds).toBe(120);
    }
  });

  it("derives sorted topic indexes", () => {
    expect(SPEAKING_TOPICS).toEqual([...SPEAKING_TOPICS].sort());
    expect(SPEAKING_CUE_CARD_TOPICS).toEqual(
      [...SPEAKING_CUE_CARD_TOPICS].sort(),
    );
  });
});

describe("cohesive-device inventory", () => {
  it("covers every rhetorical function exactly once", () => {
    const functions = COHESION_DEVICES.map((group) => group.function);
    expect(new Set(functions).size).toBe(functions.length);
    expect(functions.sort()).toEqual([...COHESION_FUNCTIONS].sort());
  });

  it("uses lower-case device strings", () => {
    for (const group of COHESION_DEVICES) {
      for (const device of group.devices) {
        expect(device).toBe(device.toLowerCase());
      }
    }
  });
});

describe("cohesionProfile", () => {
  it("counts devices and functions", () => {
    const profile = cohesionProfile(
      "However, costs rose. Moreover, demand fell. However, profits held.",
      10,
    );
    const however = profile.devices.find((hit) => hit.device === "however");
    expect(however!.count).toBe(2);
    expect(profile.total).toBe(3);
    expect(profile.distinctFunctions).toBe(2);
    expect(profile.densityPer100Words).toBe(30);
  });

  it("orders by count then alphabetically", () => {
    const profile = cohesionProfile("However therefore however moreover", 4);
    expect(profile.devices.map((hit) => hit.device)).toEqual([
      "however",
      "moreover",
      "therefore",
    ]);
  });

  it("does not match devices inside longer words", () => {
    expect(cohesionProfile("thenceforth thusly", 2).total).toBe(0);
  });

  it("returns zero density for empty text", () => {
    expect(cohesionProfile("", 0)).toMatchObject({
      total: 0,
      distinctFunctions: 0,
      densityPer100Words: 0,
    });
  });
});
