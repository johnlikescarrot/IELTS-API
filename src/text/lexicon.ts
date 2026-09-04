/**
 * Lexical profiling against the Academic Word List and general-service
 * vocabulary bands.
 *
 * Academic-vocabulary coverage is one of the few text-internal measures that
 * correlates robustly with IELTS Writing lexical-resource ratings, so it is
 * exposed both as a standalone endpoint and as an input to the transparent band
 * estimator.
 *
 * @packageDocumentation
 */

import { AWL_FAMILIES, type AwlFamily } from "../data/awl.ts";
import { tokenizeWords } from "./tokenize.ts";

/** Index from any AWL word form to the family that contains it. */
const FORM_TO_FAMILY: ReadonlyMap<string, AwlFamily> = (() => {
  const index = new Map<string, AwlFamily>();
  for (const family of AWL_FAMILIES) {
    index.set(family.headword, family);
    for (const form of family.forms) {
      if (!index.has(form)) {
        index.set(form, family);
      }
    }
  }
  return index;
})();

/** Total number of AWL word families. */
export const AWL_FAMILY_COUNT = AWL_FAMILIES.length;

/** Total number of indexed AWL word forms, including headwords. */
export const AWL_FORM_COUNT = FORM_TO_FAMILY.size;

/**
 * Looks up a single word form in the Academic Word List.
 *
 * @param word - A word form; case is ignored.
 * @returns The containing family, or `undefined` when the word is not academic.
 */
export function lookupAwl(word: string): AwlFamily | undefined {
  return FORM_TO_FAMILY.get(word.trim().toLowerCase());
}

/** Per-sublist breakdown of academic vocabulary usage. */
export interface SublistUsage {
  /** Sublist index, 1-10. */
  readonly sublist: number;
  /** Number of running tokens drawn from this sublist. */
  readonly tokens: number;
  /** Number of distinct families from this sublist. */
  readonly families: number;
}

/** The result of profiling a text against the Academic Word List. */
export interface LexicalProfile {
  /** Number of running word tokens in the text. */
  readonly tokens: number;
  /** Number of distinct word types in the text. */
  readonly types: number;
  /** Type-token ratio, `types / tokens`. */
  readonly typeTokenRatio: number;
  /** Root type-token ratio, `types / sqrt(tokens)`, less length-sensitive. */
  readonly rootTypeTokenRatio: number;
  /** Number of tokens belonging to an AWL family. */
  readonly academicTokens: number;
  /** Proportion of tokens belonging to an AWL family. */
  readonly academicCoverage: number;
  /** Distinct AWL families used. */
  readonly academicFamilies: number;
  /** Headwords of the AWL families used, in first-appearance order. */
  readonly academicHeadwords: readonly string[];
  /** Usage broken down by sublist, ascending, omitting unused sublists. */
  readonly bySublist: readonly SublistUsage[];
}

function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Profiles a text against the Academic Word List.
 *
 * @param text - Arbitrary input text.
 */
export function lexicalProfile(text: string): LexicalProfile {
  const tokens = tokenizeWords(text);
  const types = new Set(tokens);

  const headwords: string[] = [];
  const seenFamilies = new Set<string>();
  const tokensBySublist = new Map<number, number>();
  const familiesBySublist = new Map<number, Set<string>>();
  let academicTokens = 0;

  for (const token of tokens) {
    const family = FORM_TO_FAMILY.get(token);
    if (family === undefined) {
      continue;
    }
    academicTokens += 1;
    tokensBySublist.set(
      family.sublist,
      (tokensBySublist.get(family.sublist) ?? 0) + 1,
    );
    let families = familiesBySublist.get(family.sublist);
    if (families === undefined) {
      families = new Set<string>();
      familiesBySublist.set(family.sublist, families);
    }
    families.add(family.headword);
    if (!seenFamilies.has(family.headword)) {
      seenFamilies.add(family.headword);
      headwords.push(family.headword);
    }
  }

  const bySublist = [...tokensBySublist.keys()]
    .sort((left, right) => left - right)
    .map((sublist) => ({
      sublist,
      tokens: tokensBySublist.get(sublist)!,
      families: familiesBySublist.get(sublist)!.size,
    }));

  return {
    tokens: tokens.length,
    types: types.size,
    typeTokenRatio: tokens.length === 0 ? 0 : round(types.size / tokens.length),
    rootTypeTokenRatio:
      tokens.length === 0 ? 0 : round(types.size / Math.sqrt(tokens.length)),
    academicTokens,
    academicCoverage:
      tokens.length === 0 ? 0 : round(academicTokens / tokens.length),
    academicFamilies: seenFamilies.size,
    academicHeadwords: headwords,
    bySublist,
  };
}
