import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { PRACTICE_SOURCE } from '../../src/data/practice-source.js';
import { buildPracticeIndex } from '../../src/lib/practice-index.js';

const blob = (path: string, overrides: Record<string, unknown> = {}) => ({
  path,
  type: 'blob',
  mode: '100644',
  size: 123,
  sha: 'a'.repeat(40),
  ...overrides,
});
const tree = (entries: unknown[] = []) => ({
  sha: PRACTICE_SOURCE.treeSha,
  truncated: false,
  tree: entries,
});
const reading = 'Reading_1232_Basic/frontend/data/A1-A2/lesson_001.json';
const listening = 'Listening_102_Basic/Basic/Lesson_1/index.html';

const entries = [
  blob(reading),
  blob('Reading_1232_Basic/frontend/data/A1-A2/lesson_002.json'),
  blob('Reading_1232_Basic/frontend/data/B1-B2/lesson_010.json'),
  blob('Reading_1232_Basic/frontend/data/C1-C2/lesson_660.json'),
  blob(listening),
  blob('Listening_102_Basic/Basic/Lesson_1/audio.mp3'),
  blob('Listening_102_Basic/Intermediate/Lesson_2/index.html'),
  blob('Listening_102_Basic/Advanced/Lesson_34/index.html'),
  blob('Listening_204_FullTest/Test_2/Test_2.html'),
  blob('Listening_204_FullTest/Test_2/audio_2.mp3'),
  blob('Listening_204_FullTest/Test_83/Test_83.html'),
  blob('Reading_315_FullTest/Test_314/Test_314.html'),
];

describe('buildPracticeIndex', () => {
  it('normalises canonical entries without reading or redistributing their contents', () => {
    const index = buildPracticeIndex(tree(entries));
    expect(index.schemaVersion).toBe(1);
    expect(index.source).toEqual(PRACTICE_SOURCE);
    expect(index.rights).toEqual({ metadataLicense: 'CC-BY-4.0', contentIncluded: false });
    expect(index.items).toHaveLength(10);
    expect(index.items.find((item) => item.id === 'reading-basic-a1-a2-001')).toEqual({
      id: 'reading-basic-a1-a2-001',
      collection: 'reading-basic',
      skill: 'reading',
      mode: 'exercise',
      level: 'a1-a2',
      number: 1,
      title: 'Reading A1-A2 lesson 1',
      path: reading,
      format: 'json',
      sizeBytes: 123,
      sha1: 'a'.repeat(40),
      sourceUrl: `${PRACTICE_SOURCE.repository}/blob/${PRACTICE_SOURCE.commit}/${reading}`,
      audio: 'not-applicable',
    });
    expect(index.items.find((item) => item.id === 'listening-basic-basic-001')).toMatchObject({
      skill: 'listening',
      mode: 'exercise',
      level: 'basic',
      number: 1,
      audio: 'present',
    });
    expect(index.items.find((item) => item.id === 'listening-full-083')).toMatchObject({
      level: 'unspecified',
      mode: 'full-test',
      number: 83,
      audio: 'missing',
    });
    expect(index.items.find((item) => item.id === 'reading-full-314')).toMatchObject({
      title: 'Reading full test 314',
      format: 'html',
      audio: 'not-applicable',
    });
  });

  it('distinguishes observed counts from upstream directory labels and CEFR claims', () => {
    const index = buildPracticeIndex(tree(entries));
    expect(index.stats).toEqual({
      repositoryFiles: 12,
      indexedItems: 10,
      byCollection: { 'listening-basic': 3, 'listening-full': 2, 'reading-basic': 4, 'reading-full': 1 },
      bySkill: { listening: 5, reading: 5 },
      byLevel: { advanced: 1, basic: 1, intermediate: 1, unspecified: 3, 'a1-a2': 2, 'b1-b2': 1, 'c1-c2': 1 },
      byAudio: { missing: 3, present: 2, 'not-applicable': 5 },
    });
    expect(index.collections).toHaveLength(4);
    expect(index.collections.find((collection) => collection.id === 'reading-basic')).toMatchObject({
      declaredItems: 1232,
      indexedItems: 4,
      levels: ['a1-a2', 'b1-b2', 'c1-c2'],
    });
    expect(index.collections.find((collection) => collection.id === 'reading-full')).toMatchObject({
      declaredItems: 315,
      indexedItems: 1,
      levels: ['unspecified'],
    });
    expect(index.source.contentLicense).toBe('not-specified');
    expect(index.source.access).toBe('may-require-login-or-payment');
  });

  it('ignores aliases, processed copies, strategies, media, code, and sensitive paths', () => {
    const excluded = [
      '.env',
      'Tools/crawler/session.json',
      'node_modules/example/index.html',
      'Reading_1232_Basic/frontend/data/index.json',
      'Reading_1232_Basic/frontend/data/A1-A2/lesson_001.js',
      'Reading_1232_Basic/frontend/sample_data.json',
      'Reading_1232_Basic/frontend/data/A1-A2/lesson_001.json.bak',
      'Listening_204_FullTest/Test_1/index.html',
      'Listening_204_FullTest/Test_1/Test_1_processed.json',
      'Listening_204_FullTest/Test_1/Test_{idx_num}.html',
      'Listening_204_FullTest/Test_1/Test_2.html',
      'Reading_315_FullTest/Test_1/Test_1.docx',
      'Reading_315_FullTest/Test_1/strategies.json',
    ];
    const index = buildPracticeIndex(
      tree([
        ...excluded.map((path) => blob(path, { sha: 'not inspected', size: null })),
        { path: 'Reading_1232_Basic', type: 'tree' },
        { path: 'submodule', type: 'commit' },
        blob(reading),
      ]),
    );
    expect(index.items.map((item) => item.path)).toEqual([reading]);
    expect(index.stats.repositoryFiles).toBe(excluded.length + 1);
    expect(JSON.stringify(index)).not.toContain('session.json');
  });

  it('is byte-deterministic under tree reordering and fingerprints the canonical items', () => {
    const first = buildPracticeIndex(tree(entries));
    const reversed = buildPracticeIndex(tree([...entries].reverse()));
    expect(JSON.stringify(first)).toBe(JSON.stringify(reversed));
    expect(first.items.map((item) => item.id)).toEqual(first.items.map((item) => item.id).sort());
    expect(first.integrity).toEqual({
      algorithm: 'sha256',
      scope: 'JSON.stringify(items)',
      value: createHash('sha256').update(JSON.stringify(first.items)).digest('hex'),
    });
    const changed = buildPracticeIndex(tree([blob(reading, { sha: 'b'.repeat(40) })]));
    expect(changed.integrity.value).not.toBe(buildPracticeIndex(tree([blob(reading)])).integrity.value);
    const inserted = buildPracticeIndex(tree([...entries, blob('Reading_315_FullTest/Test_1/Test_1.html')]));
    expect(inserted.items.find((item) => item.path === reading)?.id).toBe('reading-basic-a1-a2-001');
  });

  it('supports empty collections without inventing missing lessons', () => {
    const index = buildPracticeIndex(tree());
    expect(index.items).toEqual([]);
    expect(index.stats.indexedItems).toBe(0);
    expect(index.collections.every((collection) => collection.indexedItems === 0)).toBe(true);
    expect(index.collections.every((collection) => collection.levels.length === 0)).toBe(true);
  });

  it.each([
    null,
    [],
    'tree',
    {},
    { ...tree(), sha: 'wrong' },
    { ...tree(), truncated: true },
    { ...tree(), truncated: undefined },
    { ...tree(), tree: {} },
  ])('rejects an invalid or unpinned tree: %j', (input) => {
    expect(() => buildPracticeIndex(input)).toThrow(/complete.*pinned/i);
  });

  it.each([null, [], {}, { path: 1, type: 'blob' }, { path: reading }])(
    'rejects malformed entries: %j',
    (entry) => {
      expect(() => buildPracticeIndex(tree([entry]))).toThrow(/tree entry/i);
    },
  );

  it('rejects duplicate paths rather than allowing input order to decide provenance', () => {
    expect(() => buildPracticeIndex(tree([blob(reading), blob(reading)]))).toThrow(/duplicate path/i);
  });

  it.each([
    { sha: null },
    { sha: 'bad' },
    { size: -1 },
    { size: 1.5 },
    { size: Infinity },
    { size: Number.MAX_SAFE_INTEGER + 1 },
    { size: '123' },
    { mode: '120000' },
  ])('rejects invalid canonical blob metadata: %j', (overrides) => {
    expect(() => buildPracticeIndex(tree([blob(reading, overrides)]))).toThrow(/regular blob/i);
  });

  it('accepts executable regular files, but never treats symlinks as companion audio', () => {
    const index = buildPracticeIndex(
      tree([
        blob(listening, { mode: '100755' }),
        blob('Listening_102_Basic/Basic/Lesson_1/audio.mp3', { mode: '120000' }),
      ]),
    );
    expect(index.items[0]?.audio).toBe('missing');
  });

  it.each([
    'Reading_1232_Basic/frontend/data/A1-A2/lesson_000.json',
    `Listening_204_FullTest/Test_${'9'.repeat(310)}/Test_${'9'.repeat(310)}.html`,
  ])('rejects invalid lesson numbers: %s', (path) => {
    expect(() => buildPracticeIndex(tree([blob(path)]))).toThrow(/lesson number/i);
  });
});
