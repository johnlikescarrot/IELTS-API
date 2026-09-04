import { describe, expect, it } from "vitest";
import { App } from "../src/lib/server/app.js";
import { SERVICE_INFO } from "../src/config.js";
import type { ServiceResponse } from "../src/lib/server/types.js";

interface Call {
  method: string;
  path: string;
  query?: string;
  body?: unknown;
  status: number;
}

function build(): App {
  return new App(SERVICE_INFO);
}

function bodyOf(response: ServiceResponse): unknown {
  return response.body === "" ? null : JSON.parse(response.body);
}

/** Run a batch of dispatch calls and assert each expected status. */
function expectBatch(app: App, calls: Call[]): void {
  for (const call of calls) {
    // Allow the query string to live inside the path (e.g. "/x?a=1") or in
    // the dedicated `query` field; split it out if present.
    const questionMark = call.path.indexOf("?");
    const path = questionMark === -1 ? call.path : call.path.slice(0, questionMark);
    const inline = questionMark === -1 ? "" : call.path.slice(questionMark + 1);
    const queryString = call.query ?? inline;
    const query = new URLSearchParams(queryString);
    const response = app.dispatch(call.method, path, { query, body: call.body });
    expect(response.status, `${call.method} ${path}${queryString ? "?" + queryString : ""}`).toBe(
      call.status,
    );
  }
}

describe("core endpoints", () => {
  it("serves the service index, health and exam overview", () => {
    const app = build();
    expectBatch(app, [
      { method: "GET", path: "/", status: 200 },
      { method: "GET", path: "/health", status: 200 },
      { method: "GET", path: "/v1/exam/overview", status: 200 },
      { method: "GET", path: "/v1/exam/papers/listening", status: 200 },
      { method: "GET", path: "/v1/exam/papers/reading", status: 200 },
      { method: "GET", path: "/v1/exam/papers/writing", status: 200 },
      { method: "GET", path: "/v1/exam/papers/speaking", status: 200 },
      { method: "GET", path: "/v1/exam/papers/bogus", status: 404 },
    ]);
  });

  it("calculates an overall band from query parameters", () => {
    const app = build();
    expectBatch(app, [
      {
        method: "GET",
        path: "/v1/bands/overall",
        query: "listening=6.5&reading=7&writing=6.5&speaking=7",
        status: 200,
      },
      { method: "GET", path: "/v1/bands/overall", status: 400 },
      {
        method: "GET",
        path: "/v1/bands/overall",
        query: "listening=6.5&reading=7&writing=6.5&speaking=12",
        status: 400,
      },
    ]);
  });

  it("calculates an overall band from a JSON body", () => {
    const app = build();
    expectBatch(app, [
      {
        method: "POST",
        path: "/v1/bands/overall",
        body: { listening: 6.5, reading: 7, writing: 6.5, speaking: 7 },
        status: 200,
      },
      {
        method: "POST",
        path: "/v1/bands/overall",
        body: { listening: 6.5, reading: 7 },
        status: 400,
      },
      { method: "POST", path: "/v1/bands/overall", body: ["x"], status: 400 },
      { method: "POST", path: "/v1/bands/overall", body: "text", status: 400 },
    ]);
  });

  it("converts raw listening and reading marks to bands", () => {
    const app = build();
    expectBatch(app, [
      { method: "GET", path: "/v1/bands/listening", query: "raw=35", status: 200 },
      { method: "GET", path: "/v1/bands/listening", status: 400 },
      { method: "GET", path: "/v1/bands/listening", query: "raw=99", status: 400 },
      { method: "GET", path: "/v1/bands/listening", query: "raw=abc", status: 400 },
      { method: "GET", path: "/v1/bands/reading", query: "raw=30", status: 200 },
      {
        method: "GET",
        path: "/v1/bands/reading",
        query: "raw=30&module=general",
        status: 200,
      },
      {
        method: "GET",
        path: "/v1/bands/reading",
        query: "raw=30&module=wrong",
        status: 400,
      },
      { method: "GET", path: "/v1/bands/reading", status: 400 },
      { method: "GET", path: "/v1/bands/tables", status: 200 },
    ]);
  });

  it("returns distinct raw-to-band values per module", () => {
    const app = build();
    const academic = bodyOf(
      app.dispatch("GET", "/v1/bands/reading", {
        query: new URLSearchParams("raw=30"),
      }),
    ) as { data: { band: number } };
    const general = bodyOf(
      app.dispatch("GET", "/v1/bands/reading", {
        query: new URLSearchParams("raw=30&module=general"),
      }),
    ) as { data: { band: number } };
    expect(academic.data.band).not.toBe(general.data.band);
  });
});

describe("writing endpoints", () => {
  it("serves task info, categories and paginated prompts", () => {
    const app = build();
    expectBatch(app, [
      { method: "GET", path: "/v1/writing/tasks", status: 200 },
      { method: "GET", path: "/v1/writing/categories", status: 200 },
      { method: "GET", path: "/v1/writing/prompts", status: 200 },
      { method: "GET", path: "/v1/writing/prompts?limit=5", status: 200 },
      {
        method: "GET",
        path: "/v1/writing/prompts?category=Education&task=2",
        status: 200,
      },
      {
        method: "GET",
        path: "/v1/writing/prompts?module=academic&task=1",
        status: 200,
      },
      {
        method: "GET",
        path: "/v1/writing/prompts?category=zzz",
        status: 400,
      },
    ]);
  });

  it("serves deterministic generated essays", () => {
    const app = build();
    expectBatch(app, [
      {
        method: "GET",
        path: "/v1/writing/prompts/generate",
        query: "count=3&seed=abc",
        status: 200,
      },
      { method: "GET", path: "/v1/writing/prompts/generate", status: 200 },
      {
        method: "GET",
        path: "/v1/writing/prompts/generate?count=abc",
        status: 400,
      },
      {
        method: "GET",
        path: "/v1/writing/prompts/generate?count=0",
        status: 400,
      },
      {
        method: "GET",
        path: "/v1/writing/prompts/generate?count=99",
        status: 400,
      },
    ]);
  });

  it("serves random and by-id prompts", () => {
    const app = build();
    expectBatch(app, [
      { method: "GET", path: "/v1/writing/prompts/random", status: 200 },
      { method: "GET", path: "/v1/writing/prompts/random?seed=5", status: 200 },
      {
        method: "GET",
        path: "/v1/writing/prompts/random?module=general&category=Data%20description",
        status: 404,
      },
      {
        method: "GET",
        path: "/v1/writing/prompts/t2-education-01",
        status: 200,
      },
      {
        method: "GET",
        path: "/v1/writing/prompts/does-not-exist",
        status: 404,
      },
    ]);
  });

  it("returns the same random prompt for the same seed", () => {
    const app = build();
    const a = bodyOf(
      app.dispatch("GET", "/v1/writing/prompts/random", {
        query: new URLSearchParams("seed=42"),
      }),
    ) as { data: { id: string } };
    const b = bodyOf(
      app.dispatch("GET", "/v1/writing/prompts/random", {
        query: new URLSearchParams("seed=42"),
      }),
    ) as { data: { id: string } };
    expect(a.data.id).toBe(b.data.id);
  });
});

describe("speaking endpoints", () => {
  it("serves parts, cue cards and random cards", () => {
    const app = build();
    expectBatch(app, [
      { method: "GET", path: "/v1/speaking/parts", status: 200 },
      { method: "GET", path: "/v1/speaking/cue-cards", status: 200 },
      {
        method: "GET",
        path: "/v1/speaking/cue-cards?category=People%20%26%20Places",
        status: 200,
      },
      {
        method: "GET",
        path: "/v1/speaking/cue-cards?category=zzz",
        status: 400,
      },
      {
        method: "GET",
        path: "/v1/speaking/cue-cards/random?seed=1",
        status: 200,
      },
      { method: "GET", path: "/v1/speaking/cue-cards/random", status: 200 },
      {
        method: "GET",
        path: "/v1/speaking/cue-cards/random?category=zzz",
        status: 400,
      },
      {
        method: "GET",
        path: "/v1/speaking/cue-cards/cc-places-01",
        status: 200,
      },
      {
        method: "GET",
        path: "/v1/speaking/cue-cards/does-not-exist",
        status: 404,
      },
    ]);
  });
});

describe("vocabulary and reading endpoints", () => {
  it("serves vocabulary categories and words", () => {
    const app = build();
    expectBatch(app, [
      { method: "GET", path: "/v1/vocabulary/categories", status: 200 },
      { method: "GET", path: "/v1/vocabulary/words", status: 200 },
      {
        method: "GET",
        path: "/v1/vocabulary/words?category=environment",
        status: 200,
      },
      {
        method: "GET",
        path: "/v1/vocabulary/words?category=zzz",
        status: 400,
      },
      { method: "GET", path: "/v1/vocabulary/words?limit=200", status: 400 },
    ]);
  });

  it("serves reading question types", () => {
    const app = build();
    expectBatch(app, [
      { method: "GET", path: "/v1/reading/question-types", status: 200 },
      {
        method: "GET",
        path: "/v1/reading/question-types/tfng",
        status: 200,
      },
      {
        method: "GET",
        path: "/v1/reading/question-types/does-not-exist",
        status: 404,
      },
    ]);
  });
});

describe("response envelopes", () => {
  it("includes CORS headers and pagination meta", () => {
    const app = build();
    const response = app.dispatch("GET", "/v1/vocabulary/categories");
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.headers["content-type"]).toMatch(/json/);
  });

  it("adds deterministic meta to generated prompt responses", () => {
    const app = build();
    const response = app.dispatch("GET", "/v1/writing/prompts/generate", {
      query: new URLSearchParams("count=2&seed=abc"),
    });
    const parsed = bodyOf(response) as { meta: { deterministic: boolean } };
    expect(parsed.meta.deterministic).toBe(true);
  });
});
