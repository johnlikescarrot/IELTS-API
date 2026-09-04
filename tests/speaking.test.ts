import { describe, expect, it } from "vitest";
import { expectApiError, getJson, request } from "./helpers/http.ts";

interface SpeakingTopic {
  id: string;
  topic: string;
  part1: string[];
  part2: { cueCard: string; prompts: string[]; followUp: string[] };
  part3: string[];
}

interface ListBody {
  data: SpeakingTopic[];
  meta: { total: number; page: number; totalPages: number };
}

describe("GET /v1/speaking", () => {
  it("lists all topics by default", async () => {
    const { status, body } = await getJson<ListBody>("/v1/speaking");
    expect(status).toBe(200);
    expect(body.meta.total).toBe(10);
    expect(body.data).toHaveLength(10);
    expect(body.data[0]?.id).toBe("work-and-career");
  });

  it("paginates with links", async () => {
    const { body } = await getJson<ListBody>("/v1/speaking?per_page=3&page=2");
    expect(body.data).toHaveLength(3);
    expect(body.meta.totalPages).toBe(4);
  });

  it("rejects bad pagination", async () => {
    await expectApiError("/v1/speaking?page=-1", 400, "invalid_parameter");
    await expectApiError("/v1/speaking?per_page=101", 400, "invalid_parameter");
  });
});

describe("GET /v1/speaking/:id", () => {
  it("returns a full topic with all three parts", async () => {
    const { status, body } = await getJson<{ data: SpeakingTopic }>(
      "/v1/speaking/technology-and-gadgets",
    );
    expect(status).toBe(200);
    expect(body.data.topic).toBe("Technology and gadgets");
    expect(body.data.part1.length).toBeGreaterThanOrEqual(4);
    expect(body.data.part2.cueCard).toContain("Describe");
    expect(body.data.part2.prompts.length).toBe(4);
    expect(body.data.part3.length).toBeGreaterThanOrEqual(3);
  });

  it("404s for unknown topics", async () => {
    await expectApiError("/v1/speaking/unknown-topic", 404, "not_found");
  });
});

describe("GET /v1/speaking/random", () => {
  it("is deterministic per seed and can return several topics", async () => {
    const first = await getJson<{
      data: SpeakingTopic[];
      meta: { count: number; available: number };
    }>("/v1/speaking/random?seed=monday&count=3");
    const second = await getJson<{
      data: SpeakingTopic[];
      meta: { count: number; available: number };
    }>("/v1/speaking/random?seed=monday&count=3");
    expect(first.body.data.map((topic) => topic.id)).toEqual(
      second.body.data.map((topic) => topic.id),
    );
    expect(first.body.meta).toEqual({ seed: "monday", count: 3, available: 10 });
  });

  it("clamps counts larger than the dataset", async () => {
    const { body } = await getJson<{ data: SpeakingTopic[]; meta: { count: number } }>(
      "/v1/speaking/random?count=10",
    );
    expect(body.data).toHaveLength(10);
    expect(body.meta.count).toBe(10);
  });

  it("validates count", async () => {
    await expectApiError("/v1/speaking/random?count=0", 400, "invalid_parameter");
    await expectApiError("/v1/speaking/random?count=11", 400, "invalid_parameter");
  });

  it("sends an ETag", async () => {
    const response = await request("/v1/speaking/random?seed=fixed");
    expect(response.headers.get("etag")).not.toBeNull();
  });
});
