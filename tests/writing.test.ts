import { describe, expect, it } from "vitest";
import { expectApiError, getJson } from "./helpers/http.ts";

interface WritingPrompt {
  id: string;
  module: string;
  task: number;
  type: string;
  prompt: string;
  recommendedTimeMinutes: number;
  wordTarget: number;
}

interface ListBody {
  data: WritingPrompt[];
  meta: { total: number };
}

describe("GET /v1/writing", () => {
  it("lists all prompts by default", async () => {
    const { status, body } = await getJson<ListBody>("/v1/writing");
    expect(status).toBe(200);
    expect(body.meta.total).toBe(30);
    expect(body.data[0]?.id).toBe("w001");
  });

  it("filters by module and task together", async () => {
    const general1 = await getJson<ListBody>("/v1/writing?module=general&task=1");
    expect(general1.body.meta.total).toBe(5);
    expect(general1.body.data.every((item) => item.module === "general" && item.task === 1)).toBe(
      true,
    );

    const academic2 = await getJson<ListBody>("/v1/writing?module=academic&task=2");
    expect(academic2.body.meta.total).toBe(12);

    const allTask1 = await getJson<ListBody>("/v1/writing?task=1");
    expect(allTask1.body.meta.total).toBe(13);
  });

  it("filters by question type", async () => {
    const letters = await getJson<ListBody>("/v1/writing?type=letter-formal");
    expect(letters.body.meta.total).toBe(2);
    const charts = await getJson<ListBody>("/v1/writing?type=chart");
    expect(charts.body.meta.total).toBe(4);
    expect(charts.body.data.every((item) => item.module === "academic")).toBe(true);
  });

  it("searches prompt text", async () => {
    const { body } = await getJson<ListBody>("/v1/writing?q=space%20exploration");
    expect(body.meta.total).toBe(1);
    expect(body.data[0]?.id).toBe("w003");
  });

  it("rejects invalid filters and pagination", async () => {
    await expectApiError("/v1/writing?module=professional", 400, "invalid_parameter");
    await expectApiError("/v1/writing?task=3", 400, "invalid_parameter");
    await expectApiError("/v1/writing?type=essay", 400, "invalid_parameter");
    await expectApiError("/v1/writing?page=0", 400, "invalid_parameter");
    await expectApiError("/v1/writing?per_page=101", 400, "invalid_parameter");
  });
});

describe("GET /v1/writing/:id", () => {
  it("fetches a single prompt", async () => {
    const { status, body } = await getJson<{ data: WritingPrompt }>("/v1/writing/w013");
    expect(status).toBe(200);
    expect(body.data.task).toBe(1);
    expect(body.data.type).toBe("chart");
    expect(body.data.prompt).toContain("Summarise");
  });

  it("404s for unknown ids", async () => {
    await expectApiError("/v1/writing/w999", 404, "not_found");
  });
});

describe("GET /v1/writing/random", () => {
  it("is deterministic per seed and honours filters", async () => {
    const first = await getJson<{ data: WritingPrompt[]; meta: { available: number } }>(
      "/v1/writing/random?seed=exam&count=2&task=2",
    );
    const second = await getJson<{ data: WritingPrompt[]; meta: { available: number } }>(
      "/v1/writing/random?seed=exam&count=2&task=2",
    );
    expect(first.body.data.map((item) => item.id)).toEqual(second.body.data.map((item) => item.id));
    expect(first.body.data.every((item) => item.task === 2)).toBe(true);
    expect(first.body.meta.available).toBe(17);
  });

  it("defaults the seed to today when none is given", async () => {
    const { body } = await getJson<{ data: WritingPrompt[]; meta: { seed: string } }>(
      "/v1/writing/random?count=2",
    );
    expect(body.meta.seed).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });

  it("validates count", async () => {
    await expectApiError("/v1/writing/random?count=0", 400, "invalid_parameter");
    await expectApiError("/v1/writing/random?count=31", 400, "invalid_parameter");
  });
});
