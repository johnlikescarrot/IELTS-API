import { describe, expect, it } from "vitest";
import * as api from "../src/index.ts";

describe("public API surface", () => {
  it("exports the domain, analysis and HTTP entry points", () => {
    for (const name of [
      "overallBandScore",
      "roundToReportedBand",
      "rawScoreToBand",
      "cefrForBand",
      "planForTarget",
      "analyseWriting",
      "detectIssues",
      "lexicalProfile",
      "readability",
      "createApp",
      "createServer",
      "startServer",
      "buildOpenApiDocument",
      "Router",
      "ApiError",
      "CITATION",
    ]) {
      expect(api).toHaveProperty(name);
    }
  });

  it("exports the bundled datasets", () => {
    expect(api.AWL_FAMILIES.length).toBe(570);
    expect(api.WRITING_TASKS.length).toBeGreaterThan(20);
    expect(api.SPEAKING_QUESTIONS.length).toBeGreaterThan(20);
    expect(api.MISTAKE_RULES.length).toBeGreaterThan(25);
  });

  it("works as a library without any HTTP layer", () => {
    expect(api.rawScoreToBand("reading-academic", 30).band).toBe(7);
    expect(
      api.overallBandScore({
        listening: 6.5,
        reading: 6.5,
        writing: 6,
        speaking: 6,
      }).overall,
    ).toBe(6.5);
  });
});
