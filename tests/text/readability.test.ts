import { describe, expect, it } from "vitest";
import { readability, textStatistics } from "../../src/text/readability.ts";

const PASSAGE =
  "The chart shows a steady increase in renewable generation. " +
  "Coal declined sharply after 2010, while gas remained stable.";

describe("textStatistics", () => {
  it("counts words, sentences and syllables", () => {
    const stats = textStatistics(PASSAGE);
    expect(stats.words).toBe(17);
    expect(stats.sentences).toBe(2);
    expect(stats.syllables).toBeGreaterThan(stats.words);
    expect(stats.characters).toBeGreaterThan(0);
    expect(stats.meanSentenceLength).toBeCloseTo(8.5, 5);
    expect(stats.meanSyllablesPerWord).toBeGreaterThan(1);
  });

  it("returns zero-valued means for empty text instead of NaN", () => {
    const stats = textStatistics("");
    expect(stats.words).toBe(0);
    expect(stats.sentences).toBe(0);
    expect(stats.meanSentenceLength).toBe(0);
    expect(stats.meanSyllablesPerWord).toBe(0);
  });

  it("handles text with sentences but no words", () => {
    const stats = textStatistics("!!! ???");
    expect(stats.words).toBe(0);
    expect(stats.meanSyllablesPerWord).toBe(0);
  });
});

describe("readability", () => {
  it("computes the four indices", () => {
    const report = readability(PASSAGE);
    expect(report.fleschReadingEase).toBeGreaterThan(0);
    expect(report.fleschKincaidGrade).toBeGreaterThan(0);
    expect(report.gunningFog).toBeGreaterThan(0);
    expect(report.automatedReadabilityIndex).toBeGreaterThan(0);
    expect(report.statistics.words).toBe(17);
  });

  it("returns zeros for empty input", () => {
    const report = readability("   ");
    expect(report).toMatchObject({
      fleschReadingEase: 0,
      fleschKincaidGrade: 0,
      gunningFog: 0,
      automatedReadabilityIndex: 0,
    });
  });

  it("returns zeros when there are sentences but no words", () => {
    expect(readability("...").fleschReadingEase).toBe(0);
  });

  it("rates simple prose as easier than complex prose", () => {
    const simple = readability("The cat sat. The dog ran. We went home.");
    const complex = readability(
      "The multifaceted implementation of environmental legislation necessitates " +
        "unprecedented interdisciplinary collaboration between governmental institutions.",
    );
    expect(simple.fleschReadingEase).toBeGreaterThan(complex.fleschReadingEase);
    expect(simple.fleschKincaidGrade).toBeLessThan(complex.fleschKincaidGrade);
  });

  it("is deterministic", () => {
    expect(readability(PASSAGE)).toEqual(readability(PASSAGE));
  });
});
