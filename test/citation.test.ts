import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { API_VERSION } from '../src/version.js';
import { PREPARATION_COMMIT } from '../src/lib/preparationAudit.js';

const read = (name: string) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

describe('honest, consistent research metadata', () => {
  it('does not publish a placeholder DOI or unsupported CFF fields', () => {
    const cff = read('CITATION.cff');
    expect(cff).not.toMatch(/zenodo\.0{7}|related-software:|type: dataset/);
    expect(cff).toContain('cff-version: 1.2.0');
    expect(cff).toContain(PREPARATION_COMMIT);
    expect(cff).toContain(`version: ${API_VERSION}`);
  });

  it('aligns package and CodeMeta versions, engines and shipped data rights', () => {
    const pkg = JSON.parse(read('package.json')) as {
      version: string;
      engines: { node: string };
      files: string[];
      dependencies?: Record<string, unknown>;
    };
    const meta = JSON.parse(read('codemeta.json')) as { version: string; runtimePlatform: string };
    expect(pkg.version).toBe(API_VERSION);
    expect(meta.version).toBe(API_VERSION);
    expect(meta.runtimePlatform).toBe(`Node.js ${pkg.engines.node}`);
    expect(pkg.files).toContain('DATA-LICENSE');
    expect(pkg.dependencies ?? {}).toEqual({});
    expect(read('DATA-LICENSE')).toContain('No licence is\nasserted or granted over its learner writing');
  });

  it('does not equate Zenodo configuration with a completed deposit', () => {
    const meta = JSON.parse(read('.zenodo.json')) as {
      description: string;
      related_identifiers: { identifier: string }[];
    };
    expect(meta.description).toContain('not evidence of a completed deposit or a minted DOI');
    expect(meta.related_identifiers.some((ref) => ref.identifier.includes(PREPARATION_COMMIT))).toBe(true);
  });
});
