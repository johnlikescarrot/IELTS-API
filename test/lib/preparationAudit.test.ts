import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  auditPreparationTree,
  PREPARATION_COMMIT,
  PREPARATION_TREE,
} from '../../src/lib/preparationAudit.js';

const tree = JSON.parse(readFileSync(new URL('../../data/msneloy-tree.json', import.meta.url), 'utf8')) as {
  sha: string;
  truncated: boolean;
  tree: { path: string; sha: string; type: string; size?: number }[];
};
const blob = { path: 'example.txt', type: 'blob', sha: 'a'.repeat(40), size: 10 };
const input = (entries: unknown[] = [blob]) => ({ sha: PREPARATION_TREE, truncated: false, tree: entries });

describe('pinned preparation-source audit', () => {
  it('reproduces the committed report from the entire offline manifest', () => {
    const audit = auditPreparationTree(tree);
    const committed = JSON.parse(
      readFileSync(new URL('../../data/msneloy-audit.json', import.meta.url), 'utf8'),
    );
    expect(audit).toEqual(committed);
    expect(audit).toMatchObject({
      commit: PREPARATION_COMMIT,
      tree: PREPARATION_TREE,
      files: 557,
      bytes: 3115412304,
      uniqueBlobs: 557,
      duplicateFiles: 0,
      byRole: {
        audio: { files: 509 },
        'repository-metadata': { files: 2 },
        'reading-sample': { files: 12 },
        'writing-figure': { files: 7 },
        'collection-image': { files: 1 },
        'grammar-exercise': { files: 1 },
        'writing-prompt-list': { files: 1 },
        'writing-response-file': { files: 24 },
      },
    });
    expect(audit.byFormat['.mp3']?.files).toBe(488);
    expect(audit.byFormat['.wma']?.files).toBe(20);
    expect(audit.byFormat['.wav']?.files).toBe(1);
    expect(audit.byFormat['.11']?.files).toBe(1);
    expect(audit.manifestSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(audit.note).toContain('no audio transcription');
    for (const counts of [audit.byRole, audit.byFormat, audit.bySection]) {
      expect(Object.values(counts).reduce((n, count) => n + count.files, 0)).toBe(audit.files);
      expect(Object.values(counts).reduce((n, count) => n + count.bytes, 0)).toBe(audit.bytes);
      expect(Object.keys(counts)).toEqual(Object.keys(counts).sort());
    }
  });

  it('is insensitive to API entry order and ignores non-content API URLs', () => {
    const reverse = { ...tree, tree: [...tree.tree].reverse() };
    expect(auditPreparationTree(reverse)).toEqual(auditPreparationTree(tree));
    expect(auditPreparationTree({ ...tree, url: 'https://example.com' })).toEqual(auditPreparationTree(tree));
  });

  it('recognises duplicate Git blobs without calling them duplicate recordings', () => {
    const audit = auditPreparationTree(
      input([blob, { ...blob, path: 'other.txt' }, { path: 'folder', type: 'tree', sha: 'b'.repeat(40) }]),
    );
    expect(audit).toMatchObject({ files: 2, bytes: 20, directories: 1, uniqueBlobs: 1, duplicateFiles: 1 });
    expect(audit.note).toContain('need not be semantically distinct');
    expect(audit.byRole.other).toEqual({ files: 2, bytes: 20 });
  });

  it('does not classify arbitrary assignment binaries or other PDFs as learner writing', () => {
    const audit = auditPreparationTree(
      input([
        { ...blob, path: 'Assignments/unknown.bin' },
        { ...blob, path: 'manual.pdf' },
        { ...blob, path: '__proto__/file.txt' },
        { ...blob, path: 'constructor.txt' },
      ]),
    );
    expect(audit.byRole.other?.files).toBe(4);
    expect(Object.hasOwn(audit.bySection, '__proto__')).toBe(true);
    expect(audit.bySection['__proto__']).toEqual({ files: 1, bytes: 10 });
    expect(({} as Record<string, unknown>).files).toBeUndefined();
  });

  it('accounts for an empty, non-truncated tree without inventing files', () => {
    expect(auditPreparationTree(input([]))).toMatchObject({ files: 0, bytes: 0, directories: 0, byRole: {} });
  });

  it('fingerprints changes even if the file/byte counts are unchanged', () => {
    const a = auditPreparationTree(input());
    const b = auditPreparationTree(input([{ ...blob, sha: 'b'.repeat(40) }]));
    expect(a.files).toBe(b.files);
    expect(a.manifestSha256).not.toBe(b.manifestSha256);
  });

  it.each([null, [], 1, 'tree'])('rejects a non-object root %j', (value) => {
    expect(() => auditPreparationTree(value)).toThrow('tree object');
  });

  it.each([
    { ...input(), sha: 'wrong' },
    { ...input(), truncated: true },
    { ...input(), truncated: undefined },
    { ...input(), tree: null },
  ])('rejects a truncated, wrong or missing tree', (value) => {
    expect(() => auditPreparationTree(value)).toThrow('complete, pinned');
  });

  it.each([
    null,
    {},
    { ...blob, path: '' },
    { ...blob, path: 1 },
    { ...blob, path: '/absolute' },
    { ...blob, path: './local' },
    { ...blob, path: 'a/../b' },
    { ...blob, path: 'a//b' },
    { ...blob, type: 'commit' },
    { ...blob, sha: 1 },
    { ...blob, sha: 'bad' },
    { ...blob, size: '10' },
    { ...blob, size: 1.5 },
    { ...blob, size: -1 },
    { ...blob, size: Infinity },
    { ...blob, size: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects malformed entries %j', (entry) => {
    expect(() => auditPreparationTree(input([entry]))).toThrow();
  });

  it('rejects duplicate paths rather than overstating coverage', () => {
    expect(() => auditPreparationTree(input([blob, blob]))).toThrow('Duplicate tree path');
  });

  it('rejects unsafe aggregate byte totals', () => {
    expect(() =>
      auditPreparationTree(
        input([
          { ...blob, size: Number.MAX_SAFE_INTEGER },
          { ...blob, path: 'second.txt', size: 1 },
        ]),
      ),
    ).toThrow('safe integer range');
  });
});
