import { describe, expect, it } from "vitest";
import { expectApiError, getJson, postJson } from "./helpers/http.ts";

interface Descriptor {
  skill: string;
  band: number;
  summary: string;
  keyFeatures: string[];
}

interface DescriptorsBody {
  data: Descriptor[];
  overallScale: { band: number; label: string; meaning: string }[];
  meta: { total: number };
}

describe("GET /v1/band-descriptors", () => {
  it("returns descriptors for both skills plus the overall scale", async () => {
    const { status, body } = await getJson<DescriptorsBody>("/v1/band-descriptors");
    expect(status).toBe(200);
    expect(body.meta.total).toBe(10);
    expect(body.data.filter((item) => item.skill === "writing")).toHaveLength(5);
    expect(body.data.filter((item) => item.skill === "speaking")).toHaveLength(5);
    expect(body.overallScale).toHaveLength(10);
    expect(body.overallScale[0]?.label).toBe("Expert user");
  });

  it("filters by skill, band, and both", async () => {
    const writing = await getJson<DescriptorsBody>("/v1/band-descriptors?skill=writing");
    expect(writing.body.meta.total).toBe(5);

    const band7 = await getJson<DescriptorsBody>("/v1/band-descriptors?band=7");
    expect(band7.body.meta.total).toBe(2);

    const both = await getJson<DescriptorsBody>("/v1/band-descriptors?skill=speaking&band=9");
    expect(both.body.meta.total).toBe(1);
    expect(both.body.data[0]?.keyFeatures.length).toBeGreaterThan(2);
  });

  it("rejects invalid skill and band values", async () => {
    await expectApiError("/v1/band-descriptors?skill=reading", 400, "invalid_parameter");
    await expectApiError("/v1/band-descriptors?band=4", 400, "invalid_parameter");
    await expectApiError("/v1/band-descriptors?band=10", 400, "invalid_parameter");
    await expectApiError("/v1/band-descriptors?band=seven", 400, "invalid_parameter");
  });
});

describe("GET /v1/band-score", () => {
  it("documents the rounding rules", async () => {
    const { status, body } = await getJson<{
      data: { rules: string[]; example: Record<string, number> };
    }>("/v1/band-score");
    expect(status).toBe(200);
    expect(body.data.rules).toHaveLength(3);
    expect(body.data.example.overall).toBe(6.5);
  });
});

describe("POST /v1/band-score", () => {
  it("computes overall bands with the official rounding", async () => {
    const flat = await postJson<{ data: Record<string, number> }>("/v1/band-score", {
      listening: 6,
      reading: 6,
      writing: 6,
      speaking: 6,
    });
    expect(flat.status).toBe(200);
    expect(flat.body.data.overall).toBe(6);

    const roundDown = await postJson<{ data: Record<string, number> }>("/v1/band-score", {
      listening: 6.5,
      reading: 6,
      writing: 6,
      speaking: 6,
    });
    expect(roundDown.body.data.overall).toBe(6);

    const quarterUp = await postJson<{ data: Record<string, number> }>("/v1/band-score", {
      listening: 6.5,
      reading: 6.5,
      writing: 6,
      speaking: 6,
    });
    expect(quarterUp.body.data.overall).toBe(6.5);

    const threeQuarterUp = await postJson<{ data: Record<string, number> }>("/v1/band-score", {
      listening: 7,
      reading: 7,
      writing: 7,
      speaking: 6,
    });
    expect(threeQuarterUp.body.data.overall).toBe(7);

    const edges = await postJson<{ data: Record<string, number> }>("/v1/band-score", {
      listening: 0,
      reading: 9,
      writing: 9,
      speaking: 9,
    });
    expect(edges.status).toBe(200);
    // (0 + 9 + 9 + 9) / 4 = 6.75, which rounds up to 7.0.
    expect(edges.body.data.overall).toBe(7);
  });

  it("echoes the four skill scores in the result", async () => {
    const { body } = await postJson<{ data: Record<string, number> }>("/v1/band-score", {
      listening: 7.5,
      reading: 7,
      writing: 8,
      speaking: 7,
    });
    expect(body.data).toEqual({
      listening: 7.5,
      reading: 7,
      writing: 8,
      speaking: 7,
      overall: 7.5,
    });
  });

  it("rejects missing, non-numeric, out-of-range and quarter-band scores", async () => {
    await expectApiError("/v1/band-score", 400, "invalid_parameter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listening: 6, reading: 6, writing: 6 }),
    });
    await expectApiError("/v1/band-score", 400, "invalid_parameter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listening: "6", reading: 6, writing: 6, speaking: 6 }),
    });
    await expectApiError("/v1/band-score", 400, "invalid_parameter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listening: 9.5, reading: 6, writing: 6, speaking: 6 }),
    });
    await expectApiError("/v1/band-score", 400, "invalid_parameter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listening: 6.25, reading: 6, writing: 6, speaking: 6 }),
    });
  });

  it("rejects non-object bodies", async () => {
    await expectApiError("/v1/band-score", 400, "invalid_body", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "[]",
    });
    await expectApiError("/v1/band-score", 400, "invalid_body", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "null",
    });
    await expectApiError("/v1/band-score", 400, "invalid_body", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "42",
    });
  });

  it("rejects empty, invalid and oversized bodies with the right codes", async () => {
    await expectApiError("/v1/band-score", 400, "invalid_body", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    await expectApiError("/v1/band-score", 400, "invalid_json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    await expectApiError("/v1/band-score", 415, "unsupported_media_type", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "listening=6",
    });
    await expectApiError("/v1/band-score", 415, "unsupported_media_type", {
      method: "POST",
      body: JSON.stringify({ listening: 6, reading: 6, writing: 6, speaking: 6 }),
    });
    const big = "x".repeat(1_048_576 + 100);
    await expectApiError("/v1/band-score", 413, "payload_too_large", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: big,
    });
  });
});
