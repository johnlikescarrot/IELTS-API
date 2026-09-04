import { describe, expect, it } from "vitest";
import { app, call, callJson, request } from "../helpers.ts";
import { renderDocsPage } from "../../src/http/app.ts";
import { MAX_TEXT_LENGTH } from "../../src/http/routes/writing.ts";

const SAMPLE_TEXT =
  "Some people argue that governments should fund space research. " +
  "However, the analysis of domestic priorities suggests otherwise.";

describe("service routes", () => {
  it("serves a discoverable index", () => {
    const { status, data } = callJson("GET", "/");
    expect(status).toBe(200);
    expect(data.authentication).toBe("none");
    expect(data.endpoints.length).toBeGreaterThan(30);
    expect(data.endpoints).toContainEqual(
      expect.objectContaining({ path: "/v1/citation" }),
    );
  });

  it("serves a liveness probe with no timestamps", () => {
    const first = call("GET", "/health");
    const second = call("GET", "/health");
    expect(first.status).toBe(200);
    expect(first.body).toBe(second.body);
  });

  it("describes itself as free and unauthenticated", () => {
    const { data } = callJson("GET", "/v1/meta");
    expect(data.authentication.required).toBe(false);
    expect(data.authentication.scheme).toBeNull();
    expect(data.rateLimit.enforced).toBe(false);
    expect(data.determinism.deterministic).toBe(true);
  });

  it("publishes citation metadata and references", () => {
    const citation = callJson("GET", "/v1/citation");
    expect(citation.data.bibtex).toContain("@software{ielts_api");
    expect(citation.data.references.length).toBeGreaterThan(3);

    const references = callJson("GET", "/v1/references");
    expect(references.meta.count).toBe(citation.data.references.length);
  });

  it("serves an OpenAPI document with no security requirements", () => {
    const response = call("GET", "/openapi.json");
    expect(response.headers["content-type"]).toContain("application/json");
    const document = JSON.parse(response.body) as Record<string, any>;
    expect(document["openapi"]).toBe("3.1.0");
    expect(document["security"]).toEqual([]);
    expect(Object.keys(document["paths"] as object).length).toBeGreaterThan(25);
  });

  it("serves self-contained HTML documentation", () => {
    const response = call("GET", "/docs");
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("No authentication is required");
    expect(response.body).not.toContain("https://cdn");
  });

  it("escapes HTML when rendering the documentation page", () => {
    const html = renderDocsPage([
      {
        method: "GET",
        path: "/<script>",
        operationId: "x",
        summary: 'Quote " & angle <',
        description: "Description",
        tags: [],
        handler: () => ({ kind: "json", data: null }),
      },
    ]);
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;");
    expect(html).toContain("&amp;");
    expect(html).toContain("<h2>other</h2>");
  });
});

describe("scale routes", () => {
  it("lists every band", () => {
    const { data, meta } = callJson("GET", "/v1/bands");
    expect(meta.count).toBe(19);
    expect(data[0]).toMatchObject({ band: 0, cefrAligned: false });
  });

  it("returns a single band", () => {
    const { data } = callJson("GET", "/v1/bands/7");
    expect(data).toMatchObject({ band: 7, whole: 7, cefr: "C1" });
  });

  it("rejects bands that are not multiples of 0.5", () => {
    const { status, error } = callJson("GET", "/v1/bands/6.25");
    expect(status).toBe(400);
    expect(error.code).toBe("invalid_parameter");
  });

  it("rejects out-of-range and non-numeric bands", () => {
    expect(callJson("GET", "/v1/bands/12").status).toBe(400);
    expect(callJson("GET", "/v1/bands/abc").status).toBe(400);
  });

  it("serves the CEFR alignment", () => {
    expect(callJson("GET", "/v1/cefr").meta.count).toBe(5);
    expect(callJson("GET", "/v1/cefr/8").data.level).toBe("C1");
    expect(callJson("GET", "/v1/cefr/99").status).toBe(400);
  });

  it("lists rubrics and their criteria", () => {
    const { data, meta } = callJson("GET", "/v1/descriptors");
    expect(meta.count).toBe(3);
    expect(data[0].criteria).toHaveLength(4);
  });

  it("serves descriptors and filters them", () => {
    expect(callJson("GET", "/v1/descriptors/speaking").meta.count).toBe(40);
    expect(
      callJson("GET", "/v1/descriptors/speaking?criterion=pronunciation").meta
        .count,
    ).toBe(10);
    expect(callJson("GET", "/v1/descriptors/speaking?band=7").meta.count).toBe(
      4,
    );
    expect(
      callJson(
        "GET",
        "/v1/descriptors/writing-task-2?criterion=task-response&band=9",
      ).meta.count,
    ).toBe(1);
  });

  it("reports unknown rubrics and impossible filters", () => {
    expect(callJson("GET", "/v1/descriptors/listening").status).toBe(404);
    expect(
      callJson("GET", "/v1/descriptors/writing-task-1?criterion=pronunciation")
        .status,
    ).toBe(404);
    expect(
      callJson("GET", "/v1/descriptors/speaking?criterion=nonsense").status,
    ).toBe(400);
  });
});

describe("scoring routes", () => {
  it("lists and serves conversion tables", () => {
    expect(callJson("GET", "/v1/conversion").meta.count).toBe(3);
    expect(callJson("GET", "/v1/conversion/listening").data.paper).toBe(
      "listening",
    );
    expect(callJson("GET", "/v1/conversion/unknown-paper").status).toBe(404);
  });

  it("converts raw scores", () => {
    const { data } = callJson("GET", "/v1/conversion/reading-academic/30");
    expect(data).toMatchObject({ band: 7, cefr: "C1", marksToNextBand: 3 });
    expect(callJson("GET", "/v1/conversion/listening/41").status).toBe(400);
    expect(callJson("GET", "/v1/conversion/listening/x").status).toBe(400);
  });

  it("converts raw scores from skill and module", () => {
    expect(
      callJson("GET", "/v1/score/raw?skill=listening&correct=30").data.band,
    ).toBe(7);
    expect(
      callJson("GET", "/v1/score/raw?skill=reading&correct=30").data.paper,
    ).toBe("reading-academic");
    expect(
      callJson(
        "GET",
        "/v1/score/raw?skill=reading&module=general-training&correct=30",
      ).data.band,
    ).toBe(6);
    expect(
      callJson("GET", "/v1/score/raw?skill=reading&module=&correct=30").data
        .module,
    ).toBe("academic");
    expect(
      callJson("GET", "/v1/score/raw?skill=writing&correct=30").status,
    ).toBe(400);
    expect(callJson("GET", "/v1/score/raw?skill=reading").status).toBe(400);
    expect(callJson("GET", "/v1/score/raw?correct=30").status).toBe(400);
  });

  it("reports raw-score requirements", () => {
    const { data, meta } = callJson(
      "GET",
      "/v1/score/requirements?paper=reading-academic",
    );
    expect(meta.count).toBe(11);
    expect(data[0]).toEqual({ band: 9, minimumRaw: 39 });
    expect(callJson("GET", "/v1/score/requirements?paper=nope").status).toBe(
      404,
    );
    expect(callJson("GET", "/v1/score/requirements").status).toBe(404);
  });

  it("computes the overall band from query parameters", () => {
    const { data } = callJson(
      "GET",
      "/v1/score/overall?listening=6.5&reading=6.5&writing=6&speaking=6",
    );
    expect(data).toMatchObject({
      mean: 6.25,
      overall: 6.5,
      rounding: "to-half",
    });
    expect(data.cefr).toBe("B2");
  });

  it("computes the overall band from a JSON body", () => {
    const { data } = callJson("POST", "/v1/score/overall", {
      listening: 7,
      reading: 7,
      writing: 6.5,
      speaking: 6.5,
    });
    expect(data.overall).toBe(7);
  });

  it("validates overall band inputs", () => {
    expect(callJson("GET", "/v1/score/overall?listening=7").status).toBe(400);
    expect(
      callJson(
        "GET",
        "/v1/score/overall?listening=6.25&reading=6&writing=6&speaking=6",
      ).status,
    ).toBe(400);
    expect(callJson("POST", "/v1/score/overall", [1, 2]).status).toBe(400);
    expect(
      callJson("POST", "/v1/score/overall", { listening: 7, reading: 7 })
        .status,
    ).toBe(400);
    expect(call("POST", "/v1/score/overall", "{").status).toBe(400);
  });

  it("averages criterion scores", () => {
    const { data } = callJson("POST", "/v1/score/criteria", {
      scores: [7, 6, 6, 6],
    });
    expect(data).toEqual({ scores: [7, 6, 6, 6], mean: 6.25, band: 6.5 });
    expect(callJson("POST", "/v1/score/criteria", { scores: [] }).status).toBe(
      400,
    );
    expect(callJson("POST", "/v1/score/criteria", { scores: 7 }).status).toBe(
      400,
    );
    expect(
      callJson("POST", "/v1/score/criteria", { scores: ["x"] }).status,
    ).toBe(400);
  });

  it("rounds an arbitrary mean", () => {
    expect(callJson("GET", "/v1/score/round?mean=6.75").data.band).toBe(7);
    expect(callJson("GET", "/v1/score/round").status).toBe(400);
  });

  it("plans the score needed in the remaining skill", () => {
    const { data } = callJson(
      "GET",
      "/v1/score/target?target=7&listening=7&reading=7&writing=6",
    );
    expect(data.missingSkill).toBe("speaking");
    expect(data.requiredBand).toBe(7);

    const impossible = callJson(
      "GET",
      "/v1/score/target?target=9&listening=4&reading=4&writing=4",
    );
    expect(impossible.data.attainable).toBe(false);
  });

  it("validates target planning inputs", () => {
    expect(
      callJson("GET", "/v1/score/target?target=7&listening=7&reading=7").status,
    ).toBe(400);
    expect(
      callJson(
        "GET",
        "/v1/score/target?target=6.25&listening=7&reading=7&writing=6",
      ).status,
    ).toBe(400);
    expect(
      callJson(
        "GET",
        "/v1/score/target?target=7&listening=6.25&reading=7&writing=6",
      ).status,
    ).toBe(400);
  });
});

describe("vocabulary routes", () => {
  it("browses the word list with filters and pagination", () => {
    const all = callJson("GET", "/v1/vocabulary?limit=5");
    expect(all.meta).toMatchObject({ count: 5, total: 570, offset: 0 });

    const sublist = callJson("GET", "/v1/vocabulary?sublist=10&limit=100");
    expect(sublist.meta.total).toBe(30);

    const search = callJson("GET", "/v1/vocabulary?q=analy");
    expect(search.data[0].headword).toBe("analyse");

    const searchForm = callJson("GET", "/v1/vocabulary?q=analysed");
    expect(searchForm.meta.total).toBe(1);

    const offset = callJson("GET", "/v1/vocabulary?limit=1&offset=1");
    expect(offset.data[0].headword).not.toBe(all.data[0].headword);
  });

  it("summarises the sublists", () => {
    const { data, meta } = callJson("GET", "/v1/vocabulary/sublists");
    expect(meta.count).toBe(10);
    expect(meta.total).toBe(570);
    expect(data[0]).toMatchObject({ sublist: 1, families: 60 });
    expect(data[9].families).toBe(30);
  });

  it("draws reproducible samples", () => {
    const first = callJson("GET", "/v1/vocabulary/random?count=5&seed=42");
    const second = callJson("GET", "/v1/vocabulary/random?count=5&seed=42");
    const other = callJson("GET", "/v1/vocabulary/random?count=5&seed=43");
    expect(first.data).toEqual(second.data);
    expect(first.data).not.toEqual(other.data);
    expect(first.meta.seed).toBe(42);

    const defaults = callJson("GET", "/v1/vocabulary/random");
    expect(defaults.meta).toMatchObject({ count: 10, seed: 0 });

    const filtered = callJson("GET", "/v1/vocabulary/random?sublist=3&count=2");
    expect(filtered.meta.total).toBe(60);
  });

  it("looks up individual words", () => {
    const hit = callJson("GET", "/v1/vocabulary/analysed");
    expect(hit.data).toMatchObject({
      inAcademicWordList: true,
      isHeadword: false,
    });
    expect(callJson("GET", "/v1/vocabulary/analyse").data.isHeadword).toBe(
      true,
    );

    const miss = callJson("GET", "/v1/vocabulary/banana");
    expect(miss.data).toMatchObject({
      inAcademicWordList: false,
      family: null,
    });

    expect(callJson("GET", "/v1/vocabulary/%20").status).toBe(400);
  });

  it("reports dataset size", () => {
    const { data } = callJson("GET", "/v1/vocabulary-stats");
    expect(data).toMatchObject({ families: 570, sublists: 10 });
  });
});

describe("writing routes", () => {
  it("browses the prompt corpus", () => {
    const all = callJson("GET", "/v1/writing/tasks");
    expect(all.meta.total).toBeGreaterThan(20);
    expect(
      callJson("GET", "/v1/writing/tasks?module=general-training").meta.total,
    ).toBeGreaterThan(0);
    expect(callJson("GET", "/v1/writing/tasks?task=1").meta.total).toBe(12);
    expect(
      callJson("GET", "/v1/writing/tasks?type=process-diagram").meta.total,
    ).toBe(1);
    expect(
      callJson("GET", "/v1/writing/tasks?topic=EDUCATION").meta.total,
    ).toBe(2);
    expect(
      callJson("GET", "/v1/writing/tasks?limit=2&offset=1").data,
    ).toHaveLength(2);
  });

  it("draws reproducible prompts", () => {
    const first = callJson("GET", "/v1/writing/tasks/random?seed=5&count=2");
    expect(first.data).toEqual(
      callJson("GET", "/v1/writing/tasks/random?seed=5&count=2").data,
    );
    expect(callJson("GET", "/v1/writing/tasks/random").meta.count).toBe(1);
    expect(
      callJson("GET", "/v1/writing/tasks/random?task=1&module=academic").data[0]
        .task,
    ).toBe(1);
  });

  it("serves a prompt by identifier", () => {
    expect(callJson("GET", "/v1/writing/tasks/AC-T1-01").data.id).toBe(
      "ac-t1-01",
    );
    expect(callJson("GET", "/v1/writing/tasks/missing").status).toBe(404);
  });

  it("publishes the mistake rule base", () => {
    const all = callJson("GET", "/v1/writing/mistakes");
    expect(all.meta.count).toBe(all.meta.total);
    expect(
      callJson("GET", "/v1/writing/mistakes?category=spelling").meta.count,
    ).toBe(1);
    expect(
      callJson("GET", "/v1/writing/mistakes?severity=style").meta.count,
    ).toBeGreaterThan(0);
    expect(
      callJson("GET", "/v1/writing/mistakes?category=spelling&severity=style")
        .meta.count,
    ).toBe(0);
  });

  it("checks a response for common mistakes", () => {
    const { data } = callJson("POST", "/v1/writing/check", {
      text: "There is many problems and the goverment don't care.",
    });
    expect(data.counts.total).toBeGreaterThanOrEqual(3);
    expect(data.issues[0].ruleId).toBeTypeOf("string");
  });

  it("analyses a response", () => {
    const { data } = callJson("POST", "/v1/writing/analyse", {
      text: SAMPLE_TEXT,
      task: 1,
      module: "academic",
      issueLimit: 1,
    });
    expect(data.task).toBe(1);
    expect(data.module).toBe("academic");
    expect(data.criteria).toHaveLength(4);
  });

  it("defaults to Task 2 and accepts a numeric string task", () => {
    expect(
      callJson("POST", "/v1/writing/analyse", { text: SAMPLE_TEXT }).data.task,
    ).toBe(2);
    expect(
      callJson("POST", "/v1/writing/analyse", { text: SAMPLE_TEXT, task: "1" })
        .data.task,
    ).toBe(1);
    expect(
      callJson("POST", "/v1/writing/analyse", { text: SAMPLE_TEXT, task: 2 })
        .data.task,
    ).toBe(2);
    expect(
      callJson("POST", "/v1/writing/analyse", { text: SAMPLE_TEXT, task: "2" })
        .data.task,
    ).toBe(2);
  });

  it("validates the analysis payload", () => {
    expect(callJson("POST", "/v1/writing/analyse", {}).status).toBe(400);
    expect(
      callJson("POST", "/v1/writing/analyse", { text: SAMPLE_TEXT, task: 3 })
        .status,
    ).toBe(400);
    expect(
      callJson("POST", "/v1/writing/analyse", {
        text: SAMPLE_TEXT,
        module: "military",
      }).status,
    ).toBe(400);
    expect(
      callJson("POST", "/v1/writing/analyse", {
        text: "x".repeat(MAX_TEXT_LENGTH + 1),
      }).status,
    ).toBe(413);
    expect(
      callJson("POST", "/v1/writing/check", {
        text: "x".repeat(MAX_TEXT_LENGTH + 1),
      }).status,
    ).toBe(413);
  });
});

describe("speaking routes", () => {
  it("lists topics", () => {
    const { data } = callJson("GET", "/v1/speaking/topics");
    expect(data.questionTopics.length).toBeGreaterThan(4);
    expect(data.cueCardTopics.length).toBeGreaterThan(3);
  });

  it("browses questions", () => {
    expect(
      callJson("GET", "/v1/speaking/questions").meta.total,
    ).toBeGreaterThan(20);
    expect(callJson("GET", "/v1/speaking/questions?part=1").data[0].part).toBe(
      1,
    );
    expect(
      callJson("GET", "/v1/speaking/questions?part=3&topic=education").meta
        .total,
    ).toBe(2);
    expect(callJson("GET", "/v1/speaking/questions?limit=2").data).toHaveLength(
      2,
    );
    expect(callJson("GET", "/v1/speaking/questions?part=2").status).toBe(400);
  });

  it("browses cue cards", () => {
    expect(callJson("GET", "/v1/speaking/cue-cards").meta.count).toBe(6);
    expect(
      callJson("GET", "/v1/speaking/cue-cards?topic=places").meta.count,
    ).toBe(1);
  });

  it("assembles a reproducible mock test", () => {
    const first = callJson("GET", "/v1/speaking/mock-test?seed=9");
    const second = callJson("GET", "/v1/speaking/mock-test?seed=9");
    expect(first.data).toEqual(second.data);
    expect(first.data.part1).toHaveLength(4);
    expect(first.data.part2.part).toBe(2);
    expect(first.data.part3).toHaveLength(3);
    expect(callJson("GET", "/v1/speaking/mock-test").data.seed).toBe(0);
  });
});

describe("text routes", () => {
  it("computes readability", () => {
    const { data, meta } = callJson("POST", "/v1/text/readability", {
      text: SAMPLE_TEXT,
    });
    expect(data.statistics.words).toBeGreaterThan(10);
    expect(meta.sources).toContain("flesch1948");
  });

  it("computes a lexical profile", () => {
    const { data } = callJson("POST", "/v1/text/lexical-profile", {
      text: SAMPLE_TEXT,
    });
    expect(data.academicHeadwords).toContain("analyse");
  });

  it("computes a cohesion profile", () => {
    const { data } = callJson("POST", "/v1/text/cohesion", {
      text: SAMPLE_TEXT,
    });
    expect(data.total).toBeGreaterThan(0);
    expect(data.devices[0].device).toBe("however");
  });

  it("segments a text", () => {
    const { data } = callJson("POST", "/v1/text/segment", {
      text: "One two three. Four five.\n\nSecond paragraph here.",
    });
    expect(data.counts).toMatchObject({ paragraphs: 2, sentences: 3 });
    expect(data.words).toContain("paragraph");
  });

  it("lists cohesive devices", () => {
    expect(callJson("GET", "/v1/text/cohesive-devices").meta.count).toBe(10);
  });

  it("rejects oversized and malformed payloads", () => {
    expect(
      callJson("POST", "/v1/text/readability", {
        text: "x".repeat(MAX_TEXT_LENGTH + 1),
      }).status,
    ).toBe(413);
    expect(callJson("POST", "/v1/text/readability", {}).status).toBe(400);
  });
});

describe("protocol behaviour", () => {
  it("answers preflight requests without authentication", () => {
    const response = call("OPTIONS", "/v1/bands");
    expect(response.status).toBe(204);
    expect(response.body).toBe("");
    expect(response.headers["access-control-allow-origin"]).toBe("*");
  });

  it("supports HEAD by returning headers without a body", () => {
    const head = call("HEAD", "/health");
    expect(head.status).toBe(200);
    expect(head.body).toBe("");
    expect(head.headers["content-length"]).not.toBe("0");
  });

  it("reports unsupported methods with an Allow header", () => {
    const response = call("POST", "/health");
    expect(response.status).toBe(405);
    expect(response.headers["allow"]).toBe("GET");
    expect(JSON.parse(response.body).error.code).toBe("method_not_allowed");
  });

  it("reports unknown paths", () => {
    const { status, error } = callJson("GET", "/v1/nope");
    expect(status).toBe(404);
    expect(error.details.documentation).toBe("/docs");
  });

  it("honours the pretty parameter and tolerates an invalid one", () => {
    expect(call("GET", "/health?pretty=false").body).not.toContain("\n");
    expect(call("GET", "/health?pretty=true").body).toContain("\n");
    expect(call("GET", "/health?pretty=banana").body).toContain("\n");
  });

  it("exposes its own route table", () => {
    expect(app.routes.length).toBeGreaterThan(30);
    expect(app.handle(request("GET", "/health")).status).toBe(200);
  });
});
