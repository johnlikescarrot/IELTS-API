import { describe, expect, it } from "vitest";
import { expectApiError, getJson, request } from "./helpers/http.ts";
import { todaySeed } from "../src/routes/vocabulary.ts";

interface VocabEntry {
  id: number;
  word: string;
  cefr: string;
  partOfSpeech: string;
  topics: string[];
  definition: string;
}

interface ListBody {
  data: VocabEntry[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    links: { self: string; prev: string | null; next: string | null };
  };
}

describe("GET /v1/vocabulary", () => {
  it("returns paginated entries by default", async () => {
    const { status, body } = await getJson<ListBody>("/v1/vocabulary");
    expect(status).toBe(200);
    expect(body.data).toHaveLength(20);
    expect(body.meta.total).toBe(120);
    expect(body.meta.page).toBe(1);
    expect(body.meta.links.next).toBe("/v1/vocabulary?per_page=20&page=2");
    expect(body.data[0]?.word).toBe("curriculum");
  });

  it("honours page and per_page and echoes filters in links", async () => {
    const { body } = await getJson<ListBody>("/v1/vocabulary?topic=crime&per_page=3&page=2");
    expect(body.data).toHaveLength(3);
    expect(body.meta.total).toBe(11);
    expect(body.meta.totalPages).toBe(4);
    expect(body.meta.links.self).toBe("/v1/vocabulary?topic=crime&per_page=3&page=2");
    expect(body.meta.links.prev).toBe("/v1/vocabulary?topic=crime&per_page=3&page=1");
    expect(body.meta.links.next).toBe("/v1/vocabulary?topic=crime&per_page=3&page=3");
    for (const entry of body.data) {
      expect(entry.topics).toContain("crime");
    }
  });

  it("filters by cefr and part_of_speech", async () => {
    const cefr = await getJson<ListBody>("/v1/vocabulary?cefr=C2&per_page=100");
    expect(cefr.body.meta.total).toBe(4);
    expect(cefr.body.data.every((entry) => entry.cefr === "C2")).toBe(true);

    const pos = await getJson<ListBody>("/v1/vocabulary?part_of_speech=verb&per_page=100");
    expect(pos.body.meta.total).toBeGreaterThan(5);
    expect(pos.body.data.every((entry) => entry.partOfSpeech === "verb")).toBe(true);

    const combined = await getJson<ListBody>(
      "/v1/vocabulary?cefr=B2&part_of_speech=adjective&per_page=100",
    );
    expect(combined.body.data.length).toBeGreaterThan(0);
    expect(
      combined.body.data.every(
        (entry) => entry.cefr === "B2" && entry.partOfSpeech === "adjective",
      ),
    ).toBe(true);
  });

  it("searches across word, definition, synonyms and topics with AND semantics", async () => {
    const single = await getJson<ListBody>("/v1/vocabulary?q=sustainable&per_page=100");
    expect(single.body.meta.total).toBeGreaterThanOrEqual(1);

    const multi = await getJson<ListBody>("/v1/vocabulary?q=urban%20city&per_page=100");
    expect(multi.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(multi.body.data.every((entry) => entry.topics.includes("society"))).toBe(true);

    const none = await getJson<ListBody>("/v1/vocabulary?q=quantum%20bananas");
    expect(none.body.data).toEqual([]);
    expect(none.body.meta.total).toBe(0);
    expect(none.body.meta.totalPages).toBe(1);
  });

  it("treats an empty q as absent", async () => {
    const { body } = await getJson<ListBody>("/v1/vocabulary?q=");
    expect(body.meta.total).toBe(120);
  });

  it("sorts by word and cefr in both directions", async () => {
    const byWord = await getJson<ListBody>("/v1/vocabulary?sort=word&per_page=5");
    const words = byWord.body.data.map((entry) => entry.word);
    expect(words[0]).toBe("accommodation");

    const byWordDesc = await getJson<ListBody>("/v1/vocabulary?sort=word&order=desc&per_page=5");
    expect(byWordDesc.body.data[0]?.word).toBe("workload");

    const byCefr = await getJson<ListBody>("/v1/vocabulary?sort=cefr&per_page=5");
    expect(new Set(byCefr.body.data.map((entry) => entry.cefr)).has("A2")).toBe(true);

    const byCefrDesc = await getJson<ListBody>("/v1/vocabulary?sort=cefr&order=desc&per_page=3");
    expect(byCefrDesc.body.data.every((entry) => entry.cefr === "C2")).toBe(true);
  });

  it("rejects invalid pagination, enum and integer parameters", async () => {
    await expectApiError("/v1/vocabulary?page=0", 400, "invalid_parameter");
    await expectApiError("/v1/vocabulary?per_page=101", 400, "invalid_parameter");
    await expectApiError("/v1/vocabulary?per_page=0", 400, "invalid_parameter");
    await expectApiError("/v1/vocabulary?page=abc", 400, "invalid_parameter");
    await expectApiError("/v1/vocabulary?per_page=10x", 400, "invalid_parameter");
    await expectApiError("/v1/vocabulary?topic=weather", 400, "invalid_parameter");
    await expectApiError("/v1/vocabulary?cefr=C9", 400, "invalid_parameter");
    await expectApiError("/v1/vocabulary?part_of_speech=preposition", 400, "invalid_parameter");
    await expectApiError("/v1/vocabulary?sort=length", 400, "invalid_parameter");
    await expectApiError("/v1/vocabulary?order=random", 400, "invalid_parameter");
  });
});

describe("GET /v1/vocabulary/:idOrWord", () => {
  it("fetches by numeric id", async () => {
    const { status, body } = await getJson<{ data: VocabEntry }>("/v1/vocabulary/1");
    expect(status).toBe(200);
    expect(body.data.word).toBe("curriculum");
  });

  it("fetches by exact word, case-insensitively", async () => {
    const { body } = await getJson<{ data: VocabEntry }>("/v1/vocabulary/Curriculum");
    expect(body.data.id).toBe(1);
  });

  it("404s for unknown ids and words", async () => {
    await expectApiError("/v1/vocabulary/9999", 404, "not_found");
    await expectApiError("/v1/vocabulary/notaword", 404, "not_found");
  });
});

describe("GET /v1/vocabulary/random", () => {
  it("is deterministic for a given seed", async () => {
    const first = await getJson<{ data: VocabEntry[]; meta: { seed: string } }>(
      "/v1/vocabulary/random?seed=ielts&count=5",
    );
    const second = await getJson<{ data: VocabEntry[]; meta: { seed: string } }>(
      "/v1/vocabulary/random?seed=ielts&count=5",
    );
    expect(first.body.data.map((entry) => entry.id)).toEqual(
      second.body.data.map((entry) => entry.id),
    );
    expect(first.body.meta.seed).toBe("ielts");
    expect(first.body.data).toHaveLength(5);
  });

  it("defaults to today's date as the seed (word of the day)", async () => {
    const { body } = await getJson<{ data: VocabEntry[]; meta: { seed: string } }>(
      "/v1/vocabulary/random",
    );
    expect(body.meta.seed).toBe(todaySeed());
    expect(body.meta.seed).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });

  it("applies filters before sampling", async () => {
    const { body } = await getJson<{ data: VocabEntry[]; meta: { available: number } }>(
      "/v1/vocabulary/random?topic=education&count=4&seed=abc",
    );
    expect(body.meta.available).toBe(12);
    expect(body.data).toHaveLength(4);
    expect(body.data.every((entry) => entry.topics.includes("education"))).toBe(true);
  });

  it("returns an empty sample for filters that match nothing", async () => {
    const { body } = await getJson<{ data: VocabEntry[]; meta: { available: number } }>(
      "/v1/vocabulary/random?q=zzzznothing",
    );
    expect(body.data).toEqual([]);
    expect(body.meta.available).toBe(0);
  });

  it("validates count", async () => {
    await expectApiError("/v1/vocabulary/random?count=0", 400, "invalid_parameter");
    await expectApiError("/v1/vocabulary/random?count=51", 400, "invalid_parameter");
  });

  it("is cacheable", async () => {
    const response = await request("/v1/vocabulary/random?seed=abc");
    expect(response.headers.get("etag")).not.toBeNull();
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
  });
});

describe("GET /v1/topics", () => {
  it("lists topics with counts derived from the corpus", async () => {
    const { body } = await getJson<{
      data: { topic: string; vocabularyCount: number }[];
      meta: { total: number };
    }>("/v1/topics");
    expect(body.meta.total).toBe(body.data.length);
    expect(body.data.length).toBeGreaterThanOrEqual(12);
    const crime = body.data.find((entry) => entry.topic === "crime");
    expect(crime?.vocabularyCount).toBe(11);
    const education = body.data.find((entry) => entry.topic === "education");
    expect(education?.vocabularyCount).toBe(12);
  });
});
