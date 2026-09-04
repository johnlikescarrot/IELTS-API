import { describe, expect, it } from "vitest";
import { planForTarget } from "../../src/domain/planning.ts";
import { overallBandScore } from "../../src/domain/band.ts";

describe("planForTarget", () => {
  it("finds the lowest sufficient band", () => {
    const plan = planForTarget({ listening: 7, reading: 7, writing: 6 }, 7);
    expect(plan.missingSkill).toBe("speaking");
    expect(plan.attainable).toBe(true);
    expect(plan.requiredBand).toBe(7);
    expect(
      overallBandScore({
        listening: 7,
        reading: 7,
        writing: 6,
        speaking: plan.requiredBand!,
      }).overall,
    ).toBeGreaterThanOrEqual(7);
  });

  it("reports unattainable targets", () => {
    const plan = planForTarget({ listening: 4, reading: 4, writing: 4 }, 8);
    expect(plan.attainable).toBe(false);
    expect(plan.requiredBand).toBeNull();
    expect(plan.resultingOverall).toBeNull();
  });

  it("treats a target that is already met as requiring band 0", () => {
    const plan = planForTarget({ listening: 9, reading: 9, writing: 9 }, 6);
    expect(plan.requiredBand).toBe(0);
  });

  it("identifies whichever skill is missing", () => {
    expect(
      planForTarget({ reading: 6, writing: 6, speaking: 6 }, 6).missingSkill,
    ).toBe("listening");
    expect(
      planForTarget({ listening: 6, writing: 6, speaking: 6 }, 6).missingSkill,
    ).toBe("reading");
    expect(
      planForTarget({ listening: 6, reading: 6, speaking: 6 }, 6).missingSkill,
    ).toBe("writing");
  });

  it("requires exactly three known scores", () => {
    expect(() => planForTarget({ listening: 6, reading: 6 }, 6)).toThrow(
      RangeError,
    );
    expect(() =>
      planForTarget({ listening: 6, reading: 6, writing: 6, speaking: 6 }, 6),
    ).toThrow(RangeError);
  });
});
