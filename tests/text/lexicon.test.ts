import { describe, expect, it } from "vitest";
import { AWL_FAMILIES } from "../../src/data/awl.ts";
import {
  AWL_FAMILY_COUNT,
  AWL_FORM_COUNT,
  lexicalProfile,
  lookupAwl,
} from "../../src/text/lexicon.ts";

describe("Academic Word List dataset", () => {
  it("contains 570 families across ten sublists", () => {
    expect(AWL_FAMILY_COUNT).toBe(570);
    expect(AWL_FORM_COUNT).toBeGreaterThan(2000);
    const counts = new Map<number, number>();
    for (const family of AWL_FAMILIES) {
      counts.set(family.sublist, (counts.get(family.sublist) ?? 0) + 1);
    }
    expect([...counts.keys()].sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    for (let sublist = 1; sublist <= 9; sublist += 1) {
      expect(counts.get(sublist)).toBe(60);
    }
    expect(counts.get(10)).toBe(30);
  });

  it("has unique, lower-cased headwords", () => {
    const headwords = AWL_FAMILIES.map((family) => family.headword);
    expect(new Set(headwords).size).toBe(headwords.length);
    for (const headword of headwords) {
      expect(headword).toBe(headword.toLowerCase());
    }
  });
});

describe("lookupAwl", () => {
  it("resolves headwords and inflected forms", () => {
    expect(lookupAwl("analyse")?.sublist).toBe(1);
    expect(lookupAwl("ANALYSED")?.headword).toBe("analyse");
    expect(lookupAwl("  significant  ")?.headword).toBe("significant");
  });

  it("returns undefined for non-academic words", () => {
    expect(lookupAwl("banana")).toBeUndefined();
  });
});

describe("lexicalProfile", () => {
  it("measures academic coverage and diversity", () => {
    const profile = lexicalProfile(
      "The analysis of significant economic policy requires a formal approach.",
    );
    expect(profile.tokens).toBe(10);
    expect(profile.types).toBe(10);
    expect(profile.typeTokenRatio).toBe(1);
    expect(profile.academicTokens).toBeGreaterThanOrEqual(5);
    expect(profile.academicHeadwords).toContain("analyse");
    expect(profile.bySublist[0]!.sublist).toBe(1);
    expect(profile.academicCoverage).toBeGreaterThan(0.3);
  });

  it("counts repeated families once", () => {
    const profile = lexicalProfile("analysis analysis analyse");
    expect(profile.academicTokens).toBe(3);
    expect(profile.academicFamilies).toBe(1);
    expect(profile.bySublist).toHaveLength(1);
    expect(profile.bySublist[0]!.tokens).toBe(3);
    expect(profile.bySublist[0]!.families).toBe(1);
  });

  it("returns zeros for empty text", () => {
    const profile = lexicalProfile("");
    expect(profile).toMatchObject({
      tokens: 0,
      types: 0,
      typeTokenRatio: 0,
      rootTypeTokenRatio: 0,
      academicCoverage: 0,
      academicFamilies: 0,
    });
    expect(profile.bySublist).toEqual([]);
  });

  it("orders sublists ascending", () => {
    const profile = lexicalProfile(
      "The analysis assumed a rigid protocol despite the enormous panel.",
    );
    const sublists = profile.bySublist.map((entry) => entry.sublist);
    expect([...sublists].sort((a, b) => a - b)).toEqual(sublists);
    expect(sublists.length).toBeGreaterThan(1);
  });
});
