import { describe, expect, it } from "vitest";
import { expectApiError, request } from "./helpers/http.ts";
import { VERSION } from "../src/version.ts";

describe("GET /v1/citation", () => {
  it("returns JSON metadata by default", async () => {
    const response = await request("/v1/citation");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    const body = (await response.json()) as { data: { title: string; version: string } };
    expect(body.data.title).toContain("IELTS-API");
    expect(body.data.version).toBe(VERSION);
  });

  it("renders BibTeX", async () => {
    const response = await request("/v1/citation?format=bibtex");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    const text = await response.text();
    expect(text).toContain("@software{ielts_api_2026,");
    expect(text).toContain("url = {https://github.com/johnlikescarrot/IELTS-API}");
  });

  it("renders RIS", async () => {
    const response = await request("/v1/citation?format=ris");
    const text = await response.text();
    expect(text).toContain("TY  - COMP");
    expect(text).toContain("ER  - ");
  });

  it("renders APA 7", async () => {
    const response = await request("/v1/citation?format=apa");
    const text = await response.text();
    expect(text).toContain("IELTS-API Contributors (2026).");
    expect(text).toContain("[Computer software]");
  });

  it("rejects unknown formats", async () => {
    await expectApiError("/v1/citation?format=endnote", 400, "invalid_parameter");
  });

  it("is cacheable in every format", async () => {
    for (const format of ["json", "bibtex", "ris", "apa"]) {
      const response = await request(`/v1/citation?format=${format}`);
      expect(response.headers.get("etag")).not.toBeNull();
    }
  });
});
