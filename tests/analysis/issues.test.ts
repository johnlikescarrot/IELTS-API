import { describe, expect, it } from "vitest";
import { countIssues, detectIssues } from "../../src/analysis/issues.ts";
import { MISTAKE_RULES, MISTAKE_RULES_BY_ID } from "../../src/data/mistakes.ts";

describe("mistake rule base", () => {
  it("has unique identifiers and compilable patterns", () => {
    const ids = MISTAKE_RULES.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(MISTAKE_RULES_BY_ID.size).toBe(MISTAKE_RULES.length);
    for (const rule of MISTAKE_RULES) {
      expect(() => new RegExp(rule.pattern, "giu")).not.toThrow();
      expect(rule.message.length).toBeGreaterThan(10);
      expect(rule.suggestion.length).toBeGreaterThan(5);
    }
  });

  it("detects the documented example of every rule", () => {
    for (const rule of MISTAKE_RULES) {
      const issues = detectIssues(rule.example);
      expect(
        issues.map((issue) => issue.ruleId),
        `rule ${rule.id} should match its own example`,
      ).toContain(rule.id);
    }
  });
});

describe("detectIssues", () => {
  it("reports position information", () => {
    const issues = detectIssues("Line one is fine.\nThere is many problems.");
    const issue = issues.find((entry) => entry.ruleId === "there-is-plural");
    expect(issue).toBeDefined();
    expect(issue!.line).toBe(2);
    expect(issue!.column).toBe(1);
    expect(issue!.offset).toBe(18);
    expect(issue!.match.toLowerCase()).toBe("there is many");
  });

  it("orders issues by position", () => {
    const issues = detectIssues(
      "Most of people don't agree. There is many reasons. The goverment recieved it.",
    );
    const offsets = issues.map((issue) => issue.offset);
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
    expect(issues.length).toBeGreaterThanOrEqual(4);
  });

  it("filters by category and severity", () => {
    const text = "The goverment don't discuss about the plan.";
    const spelling = detectIssues(text, { categories: ["spelling"] });
    expect(spelling.every((issue) => issue.category === "spelling")).toBe(true);
    expect(spelling).toHaveLength(1);

    const styleOnly = detectIssues(text, { severities: ["style"] });
    expect(styleOnly.every((issue) => issue.severity === "style")).toBe(true);
    expect(styleOnly.length).toBeGreaterThan(0);

    const both = detectIssues(text, {
      categories: ["spelling"],
      severities: ["style"],
    });
    expect(both).toHaveLength(0);
  });

  it("respects the limit", () => {
    const text =
      "The goverment recieved it. Thier plan is seperate. It occured untill now.";
    expect(detectIssues(text, { limit: 2 })).toHaveLength(2);
    expect(detectIssues(text, { limit: 0 })).toHaveLength(0);
  });

  it("returns nothing for clean academic prose", () => {
    expect(
      detectIssues(
        "The government received the report. Consequently, the committee published a separate analysis.",
      ),
    ).toHaveLength(0);
  });

  it("finds several occurrences of the same rule", () => {
    const issues = detectIssues(
      "There is many issues. There is many problems.",
    );
    expect(
      issues.filter((issue) => issue.ruleId === "there-is-plural"),
    ).toHaveLength(2);
  });
});

describe("countIssues", () => {
  it("aggregates by severity", () => {
    const issues = detectIssues(
      "The goverment don't discuss about people is wrong.",
    );
    const counts = countIssues(issues);
    expect(counts.total).toBe(issues.length);
    expect(counts.error + counts.warning + counts.style).toBe(counts.total);
    expect(counts.error).toBeGreaterThan(0);
    expect(counts.style).toBeGreaterThan(0);
  });

  it("handles an empty list", () => {
    expect(countIssues([])).toEqual({
      error: 0,
      warning: 0,
      style: 0,
      total: 0,
    });
  });
});
