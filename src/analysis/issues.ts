/**
 * The detection engine that applies the {@link MISTAKE_RULES} rule base to a
 * candidate response.
 *
 * The engine is deliberately thin: it compiles each rule once, scans the text,
 * and reports positions. All linguistic knowledge lives in the data module, so
 * the engine itself can be verified exhaustively.
 *
 * @packageDocumentation
 */

import {
  MISTAKE_RULES,
  type MistakeCategory,
  type MistakeRule,
  type MistakeSeverity,
} from "../data/mistakes.ts";

/** A rule match located in the source text. */
export interface DetectedIssue {
  /** Identifier of the rule that matched. */
  readonly ruleId: string;
  /** Category of the rule. */
  readonly category: MistakeCategory;
  /** Severity of the rule. */
  readonly severity: MistakeSeverity;
  /** Explanation of the problem. */
  readonly message: string;
  /** Corrective advice. */
  readonly suggestion: string;
  /** The exact substring that matched, trimmed of surrounding whitespace. */
  readonly match: string;
  /** Zero-based character offset of the match. */
  readonly offset: number;
  /** One-based line number of the match. */
  readonly line: number;
  /** One-based column number of the match. */
  readonly column: number;
}

/** Options accepted by {@link detectIssues}. */
export interface DetectIssuesOptions {
  /** Restrict detection to these categories. */
  readonly categories?: readonly MistakeCategory[];
  /** Restrict detection to these severities. */
  readonly severities?: readonly MistakeSeverity[];
  /** Hard cap on the number of issues returned. */
  readonly limit?: number;
}

const COMPILED: ReadonlyMap<string, RegExp> = new Map(
  MISTAKE_RULES.map((rule) => [rule.id, new RegExp(rule.pattern, "giu")]),
);

function positionOf(
  text: string,
  offset: number,
): { line: number; column: number } {
  let line = 1;
  let lastBreak = -1;
  for (let index = 0; index < offset; index += 1) {
    if (text[index] === "\n") {
      line += 1;
      lastBreak = index;
    }
  }
  return { line, column: offset - lastBreak };
}

function applies(rule: MistakeRule, options: DetectIssuesOptions): boolean {
  if (
    options.categories !== undefined &&
    !options.categories.includes(rule.category)
  ) {
    return false;
  }
  if (
    options.severities !== undefined &&
    !options.severities.includes(rule.severity)
  ) {
    return false;
  }
  return true;
}

/**
 * Scans a text with the rule base and returns every match, ordered by position.
 *
 * @param text - The candidate response.
 * @param options - Optional category, severity and count filters.
 */
export function detectIssues(
  text: string,
  options: DetectIssuesOptions = {},
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  for (const rule of MISTAKE_RULES) {
    if (!applies(rule, options)) {
      continue;
    }
    const pattern = COMPILED.get(rule.id)!;
    pattern.lastIndex = 0;

    for (
      let match = pattern.exec(text);
      match !== null;
      match = pattern.exec(text)
    ) {
      /* c8 ignore start -- defensive guard: no rule in the base is zero-width,
         but a future rule could be, and a zero-width match would loop forever. */
      if (match[0].length === 0) {
        pattern.lastIndex += 1;
        continue;
      }
      /* c8 ignore stop */
      const { line, column } = positionOf(text, match.index);
      issues.push({
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        message: rule.message,
        suggestion: rule.suggestion,
        match: match[0].trim(),
        offset: match.index,
        line,
        column,
      });
    }
  }

  issues.sort((left, right) => left.offset - right.offset);
  return options.limit === undefined ? issues : issues.slice(0, options.limit);
}

/** Counts of issues grouped by severity. */
export interface IssueCounts {
  /** Number of `error` issues. */
  readonly error: number;
  /** Number of `warning` issues. */
  readonly warning: number;
  /** Number of `style` issues. */
  readonly style: number;
  /** Total number of issues. */
  readonly total: number;
}

/**
 * Aggregates issues by severity.
 *
 * @param issues - Issues produced by {@link detectIssues}.
 */
export function countIssues(issues: readonly DetectedIssue[]): IssueCounts {
  const counts = { error: 0, warning: 0, style: 0 };
  for (const issue of issues) {
    counts[issue.severity] += 1;
  }
  return { ...counts, total: issues.length };
}
