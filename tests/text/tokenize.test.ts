import { describe, expect, it } from "vitest";
import {
  normaliseToken,
  splitParagraphs,
  splitSentences,
  tokenizeWords,
  uniqueTokens,
} from "../../src/text/tokenize.ts";

describe("tokenizeWords", () => {
  it("lower-cases and strips punctuation and digits", () => {
    expect(tokenizeWords("The Cat, 12 dogs; and 3 birds!")).toEqual([
      "the",
      "cat",
      "dogs",
      "and",
      "birds",
    ]);
  });

  it("keeps contractions and hyphenated compounds intact", () => {
    expect(tokenizeWords("well-being isn\u2019t easy")).toEqual([
      "well-being",
      "isn't",
      "easy",
    ]);
  });

  it("returns an empty array for text without letters", () => {
    expect(tokenizeWords("123 --- ???")).toEqual([]);
    expect(tokenizeWords("")).toEqual([]);
  });
});

describe("normaliseToken", () => {
  it("folds typographic apostrophes and trims stray hyphens", () => {
    expect(normaliseToken("don\u2019t")).toBe("don't");
    expect(normaliseToken("-word-")).toBe("word");
  });
});

describe("splitSentences", () => {
  it("splits on terminal punctuation", () => {
    expect(splitSentences("One. Two! Three?")).toEqual([
      "One.",
      "Two!",
      "Three?",
    ]);
  });

  it("keeps a trailing fragment without punctuation", () => {
    expect(splitSentences("First sentence. Trailing fragment")).toEqual([
      "First sentence.",
      "Trailing fragment",
    ]);
  });

  it("does not split after common abbreviations", () => {
    expect(splitSentences("Dr. Smith arrived. He was late.")).toEqual([
      "Dr. Smith arrived.",
      "He was late.",
    ]);
  });

  it("ignores empty input and stray whitespace", () => {
    expect(splitSentences("")).toEqual([]);
    expect(splitSentences("   ")).toEqual([]);
    expect(splitSentences(". Real sentence.")).toEqual([".", "Real sentence."]);
  });
});

describe("splitParagraphs", () => {
  it("splits on blank lines", () => {
    expect(splitParagraphs("One\n\nTwo\r\n\r\nThree")).toEqual([
      "One",
      "Two",
      "Three",
    ]);
  });

  it("drops empty paragraphs", () => {
    expect(splitParagraphs("\n\n   \n\nOnly")).toEqual(["Only"]);
    expect(splitParagraphs("")).toEqual([]);
  });
});

describe("uniqueTokens", () => {
  it("deduplicates", () => {
    expect(uniqueTokens(["a", "b", "a"]).size).toBe(2);
  });
});
