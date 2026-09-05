import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { API_VERSION, REPOSITORY_URL } from '../src/version.js';
import { PRACTICE_SOURCE } from '../src/data/practice-source.js';
import { SOFTWARE_CITATION_TITLE, RESEARCH_REPORT } from '../src/lib/research.js';
import { openApiDocument } from '../src/lib/openapi.js';
import { ROUTES } from '../src/routes/index.js';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('citation and contract artifacts', () => {
  it('keeps package, CodeMeta and CFF versions and attribution consistent without placeholder DOIs', () => {
    const pkg = JSON.parse(read('package.json')) as {
      version: string;
      engines: { node: string };
      dependencies?: Record<string, string>;
      files: string[];
    };
    const codemeta = JSON.parse(read('codemeta.json')) as {
      version: string;
      runtimePlatform: string;
      codeRepository: string;
      isAccessibleForFree: boolean;
      referencePublication: { name: string }[];
      citation: { url: string }[];
    };
    const cff = read('CITATION.cff');
    expect(pkg.version).toBe(API_VERSION);
    expect(codemeta.version).toBe(API_VERSION);
    expect(codemeta.runtimePlatform).toBe(`Node.js ${pkg.engines.node}`);
    expect(codemeta.codeRepository).toBe(REPOSITORY_URL);
    expect(codemeta.isAccessibleForFree).toBe(true);
    expect(codemeta.referencePublication[0]?.name).toBe(RESEARCH_REPORT.title);
    expect(cff).toContain(`title: '${SOFTWARE_CITATION_TITLE}'`);
    expect(cff).toContain(`version: ${API_VERSION}`);
    expect(cff).toContain(PRACTICE_SOURCE.commit);
    expect(cff).not.toContain('zenodo.0000000');
    expect(cff).not.toContain('related-software:');
    expect(cff).not.toContain('type: dataset');
    expect(codemeta.citation.some((item) => item.url.endsWith(PRACTICE_SOURCE.commit))).toBe(true);
    expect(Object.keys(pkg.dependencies ?? {})).toHaveLength(0);
    expect(pkg.files).toContain('DATA-LICENSE');
  });

  it('describes Zenodo as a future archive, not an already minted identifier', () => {
    const zenodo = JSON.parse(read('.zenodo.json')) as {
      title: string;
      description: string;
      related_identifiers: { identifier: string }[];
    };
    expect(zenodo.title).toBe(SOFTWARE_CITATION_TITLE);
    expect(zenodo.description).toContain('No DOI or completed archive is asserted');
    expect(zenodo.related_identifiers.some((item) => item.identifier.endsWith(PRACTICE_SOURCE.commit))).toBe(
      true,
    );
  });

  it('archives the complete, current OpenAPI document with a portable server URL', () => {
    expect(JSON.parse(read('docs/openapi.json'))).toEqual(openApiDocument(ROUTES, '/', API_VERSION));
  });
});
