import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  API_VERSION,
  CITATION,
  LICENSE,
  REFERENCES,
  REPOSITORY,
  SERVICE_NAME,
  VERSION,
} from "../src/meta.ts";

const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
  version: string;
  license: string;
  name: string;
};

describe("service metadata", () => {
  it("matches package.json", () => {
    expect(VERSION).toBe(manifest.version);
    expect(LICENSE).toBe(manifest.license);
    expect(SERVICE_NAME.toLowerCase()).toBe(
      manifest.name.replace("-api", "-api"),
    );
  });

  it("declares a versioned API prefix", () => {
    expect(API_VERSION).toBe("v1");
    expect(REPOSITORY).toMatch(/^https:\/\/github\.com\//);
  });
});

describe("citation metadata", () => {
  it("provides a complete BibTeX entry", () => {
    expect(CITATION.bibtex).toContain("@software{ielts_api");
    expect(CITATION.bibtex).toContain(VERSION);
    expect(CITATION.bibtex).toContain(REPOSITORY);
    expect(CITATION.version).toBe(VERSION);
    expect(CITATION.citationFile).toContain("CITATION.cff");
  });

  it("lists resolvable references", () => {
    expect(REFERENCES.length).toBeGreaterThanOrEqual(6);
    const keys = REFERENCES.map((reference) => reference.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const reference of REFERENCES) {
      expect(reference.citation.length).toBeGreaterThan(20);
      if (reference.url !== undefined) {
        expect(reference.url).toMatch(/^https:\/\//);
      }
    }
    expect(keys).toContain("coxhead2000");
  });
});

describe("CITATION.cff", () => {
  const cff = readFileSync("CITATION.cff", "utf8");

  it("declares the same version as the package", () => {
    expect(cff).toContain(`version: ${VERSION}`);
    expect(cff).toContain("cff-version: 1.2.0");
    expect(cff).toContain("license: MIT");
  });
});
