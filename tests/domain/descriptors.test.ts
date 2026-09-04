import { describe, expect, it } from "vitest";
import { RUBRICS } from "../../src/core/types.ts";
import {
  BAND_DESCRIPTORS,
  RUBRIC_CRITERIA_ORDER,
  descriptorsFor,
} from "../../src/domain/descriptors.ts";

describe("band descriptors", () => {
  it("provides ten bands for four criteria in each rubric", () => {
    expect(BAND_DESCRIPTORS).toHaveLength(RUBRICS.length * 4 * 10);
    for (const rubric of RUBRICS) {
      expect(RUBRIC_CRITERIA_ORDER[rubric]).toHaveLength(4);
      expect(descriptorsFor(rubric)).toHaveLength(40);
    }
  });

  it("descends from band 9 to band 0 without gaps", () => {
    for (const rubric of RUBRICS) {
      for (const criterion of RUBRIC_CRITERIA_ORDER[rubric]) {
        const ladder = descriptorsFor(rubric, { criterion });
        expect(ladder.map((entry) => entry.band)).toEqual([
          9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
        ]);
        for (const entry of ladder) {
          expect(entry.descriptor.length).toBeGreaterThan(20);
        }
      }
    }
  });

  it("filters by criterion and band", () => {
    const filtered = descriptorsFor("writing-task-2", {
      criterion: "task-response",
      band: 7,
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.descriptor.toLowerCase()).toContain(
      "addresses all parts",
    );
  });

  it("returns nothing for a criterion that does not belong to the rubric", () => {
    expect(
      descriptorsFor("writing-task-1", { criterion: "pronunciation" }),
    ).toHaveLength(0);
  });
});
