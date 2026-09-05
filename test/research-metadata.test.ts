import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { PRACTICE_SOURCE } from '../src/data/practice-source.js';
import { API_VERSION } from '../src/version.js';

const text = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

describe('research and distribution metadata', () => {
  it('keeps the package and CodeMeta versions and runtime requirements consistent', () => {
    const pkg = JSON.parse(text('package.json')) as {
      version: string;
      engines: { node: string };
      dependencies?: object;
    };
    const code = JSON.parse(text('codemeta.json')) as { version: string; runtimePlatform: string };
    expect(pkg.version).toBe(API_VERSION);
    expect(code.version).toBe(API_VERSION);
    expect(code.runtimePlatform.replace(/\s+/g, '')).toBe(`Node.js${pkg.engines.node}`);
    expect(pkg.dependencies ?? {}).toEqual({});
  });

  it('does not reintroduce an unissued DOI or mislabel the paper as published', () => {
    const cff = text('CITATION.cff');
    expect(cff).not.toContain('zenodo.0000000');
    expect(cff).not.toContain('related-software:');
    expect(cff).toContain(PRACTICE_SOURCE.commit);
    const code = JSON.parse(text('codemeta.json')) as {
      referencePublication: { creativeWorkStatus: string }[];
    };
    expect(code.referencePublication[0]?.creativeWorkStatus).toBe('Draft');
    expect(text('paper/paper.md')).toContain('not peer reviewed');
  });

  it('credits the pinned source and ships data rights documentation', () => {
    for (const file of ['CITATION.cff', 'codemeta.json', '.zenodo.json', 'DATA-LICENSE']) {
      expect(text(file)).toContain(PRACTICE_SOURCE.commit);
    }
    const pkg = JSON.parse(text('package.json')) as { files: string[] };
    expect(pkg.files).toEqual(
      expect.arrayContaining([
        'LICENSE',
        'DATA-LICENSE',
        'data',
        'docs/openapi.json',
        'docs/PRACTICE.md',
        'docs/RESEARCH-WORKFLOW.md',
      ]),
    );
  });
});
