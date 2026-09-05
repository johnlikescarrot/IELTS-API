import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { extractPractice, practiceDigest, PRACTICE_SOURCE } from '../../src/data/practice-extract.js';

const blob = (path: string, overrides: Record<string, unknown> = {}) => ({
  path,
  type: 'blob',
  mode: '100644',
  sha: createHash('sha1').update(path).digest('hex'),
  size: 100,
  ...overrides,
});
const tree = (entries: unknown[] = []) => ({ sha: PRACTICE_SOURCE.commit, truncated: false, tree: entries });

const fixtures = [
  blob('Listening_102_Basic/Basic/Lesson_1/index.html'),
  blob('Listening_102_Basic/Basic/Lesson_1/audio.mp3'),
  blob('Listening_102_Basic/Advanced/Lesson_34/index.html'),
  blob('Listening_102_Basic/Intermediate/Lesson_2/audio.mp3'),
  blob('Listening_204_FullTest/Test_1/Test_1.html'),
  blob('Listening_204_FullTest/Test_1/index.html'),
  blob('Listening_204_FullTest/Test_1/Test_1.json'),
  blob('Listening_204_FullTest/Test_1/Test_1_processed.json'),
  blob('Listening_204_FullTest/Test_1/audio_1.mp3'),
  blob('Listening_204_FullTest/Test_1/strategies.json'),
  blob('Reading_1232_Basic/frontend/data/A1-A2/lesson_001.json'),
  blob('Reading_1232_Basic/frontend/data/A1-A2/lesson_001.js'),
  blob('Reading_1232_Basic/frontend/data/B1-B2/lesson_100.json'),
  blob('Reading_1232_Basic/frontend/data/C1-C2/lesson_660.js'),
  blob('Reading_315_FullTest/Test_1/Test_1.html'),
  blob('Reading_315_FullTest/Test_1/Test_1.json'),
  blob('Reading_315_FullTest/Test_1/Test_1.docx'),
  blob('Reading_315_FullTest/Test_1/Test_1_processed.json'),
  blob('Reading_315_FullTest/Test_1/strategies.json'),
  blob('Reading_315_FullTest/Test_1/images/image_1.png'),
  blob('Reading_315_FullTest/Test_1/images/image_2.webp'),
  blob('Reading_315_FullTest/Test_1/images/image_3.png '),
  blob('Reading_315_FullTest/Test_2/Test_2.docx'),
];

// Synthetic metadata only: no upstream passages, answers, code or media are fixtures.
describe('extractPractice', () => {
  it('groups supported assets into units, retaining provenance and structural gaps', () => {
    const result = extractPractice(tree(fixtures));
    expect(result.items).toHaveLength(9);
    expect(result.collections.map((collection) => collection.id)).toEqual([
      'listening-basic',
      'listening-tests',
      'reading-basic',
      'reading-tests',
    ]);
    const lesson = result.items.find((item) => item.id === 'listening-basic-basic-0001')!;
    expect(lesson).toMatchObject({
      collection: 'listening-basic',
      skill: 'listening',
      mode: 'lesson',
      level: 'basic',
      sequence: 1,
      sourcePath: 'Listening_102_Basic/Basic/Lesson_1',
      structurallyComplete: true,
      missingRoles: [],
    });
    expect(lesson.assets.map((asset) => asset.role)).toEqual(['audio', 'page']);
    expect(lesson.assets[0]).toEqual({
      path: fixtures[1]!.path,
      role: 'audio',
      sizeBytes: 100,
      sha1: fixtures[1]!.sha,
    });
    expect(result.items.find((item) => item.id === 'reading-basic-c1-c2-0660')).toMatchObject({
      structurallyComplete: false,
      missingRoles: ['questions'],
    });
    expect(result.items.find((item) => item.id === 'reading-tests-0002')).toMatchObject({
      level: 'unspecified',
      structurallyComplete: false,
      missingRoles: ['page', 'questions'],
    });
    expect(result.stats).toMatchObject({
      repositoryFiles: fixtures.length,
      repositoryBytes: fixtures.length * 100,
      indexedAssets: fixtures.length,
      indexedBytes: fixtures.length * 100,
      excludedFiles: 0,
      units: 9,
      completeUnits: 5,
      incompleteUnits: 4,
      bySkill: { listening: 4, reading: 5 },
      byCollection: { 'listening-basic': 3, 'listening-tests': 1, 'reading-basic': 3, 'reading-tests': 2 },
      duplicateBlobGroups: 0,
      repeatedBlobReferences: 0,
    });
    expect(result.meta.source).toEqual(PRACTICE_SOURCE);
    expect(result.meta.metadataLicense).toBe('CC-BY-4.0');
    expect(result.meta.note).toContain('not redistributed');
    expect(result.meta.contentSha256).toBe(practiceDigest(result));
  });

  it('is independent of GitHub entry order, URLs and whether the tree or commit was requested', () => {
    const first = extractPractice(tree(fixtures));
    const reversed = { ...tree([...fixtures].reverse()), sha: PRACTICE_SOURCE.tree, url: 'ignored' };
    expect(extractPractice(reversed)).toEqual(first);
    expect(first.items.map((item) => item.id)).toEqual(first.items.map((item) => item.id).sort());
  });

  it('sorts numeric sequences rather than lexicographic directory names', () => {
    const result = extractPractice(
      tree([
        blob('Reading_315_FullTest/Test_10/Test_10.html'),
        blob('Reading_315_FullTest/Test_2/Test_2.html'),
      ]),
    );
    expect(result.items.map((item) => item.sequence)).toEqual([2, 10]);
  });

  it('does not renumber existing IDs when a new unit is inserted', () => {
    const a = blob('Reading_315_FullTest/Test_2/Test_2.html');
    const original = extractPractice(tree([a])).items[0];
    expect(extractPractice(tree([blob('Reading_315_FullTest/Test_1/Test_1.html'), a])).items[1]).toEqual(
      original,
    );
  });

  it('ignores infrastructure, secrets, logs, templates, unknown paths and symlinks', () => {
    const excluded = [
      '.env',
      'Tools/crawler/session.json',
      'Docs/debug.log',
      'node_modules/library/index.js',
      'UPGRADE YOUR ILETS SKILLS.xlsx',
      'Listening_102_Basic/Basic/Lesson_1/debug.log',
      'Listening_102_Basic/Unknown/Lesson_1/audio.mp3',
      'Listening_204_FullTest/Test_1/Test_{idx_num}.html',
      'Listening_204_FullTest/Test_1/Test_2.json',
      'Reading_315_FullTest/Test_2/Test_1.html',
      'Reading_315_FullTest/Test_1/images/private.txt',
      'Reading_1232_Basic/frontend/data/A1/lesson_001.json',
      'Reading_1232_Basic/frontend/data/A1-A2/lesson_000.json',
    ].map((path) => blob(path));
    const result = extractPractice(
      tree([
        ...excluded,
        blob('Listening_102_Basic/Basic/Lesson_1/audio.mp3', { mode: '120000' }),
        { path: 'folder', type: 'tree', sha: 'a'.repeat(40), mode: '040000' },
        { path: 'submodule', type: 'commit', sha: 'b'.repeat(40), mode: '160000' },
      ]),
    );
    expect(result.items).toEqual([]);
    expect(result.stats.repositoryFiles).toBe(excluded.length + 1);
    expect(result.stats.excludedFiles).toBe(excluded.length + 1);
    expect(result.stats.byCollection).toEqual({
      'listening-basic': 0,
      'listening-tests': 0,
      'reading-basic': 0,
      'reading-tests': 0,
    });
    expect(result.stats.repositoryBytes).toBe((excluded.length + 1) * 100);
  });

  it('counts repeated blob references without claiming semantic duplicates or merging units', () => {
    const result = extractPractice(
      tree([
        blob('Reading_315_FullTest/Test_1/Test_1.json'),
        blob('Reading_315_FullTest/Test_2/Test_2.json', {
          sha: createHash('sha1').update('Reading_315_FullTest/Test_1/Test_1.json').digest('hex'),
        }),
        blob('Reading_315_FullTest/Test_3/Test_3.json', {
          sha: createHash('sha1').update('Reading_315_FullTest/Test_1/Test_1.json').digest('hex'),
        }),
      ]),
    );
    expect(result.stats).toMatchObject({ units: 3, duplicateBlobGroups: 1, repeatedBlobReferences: 2 });
  });

  it.each([
    null,
    [],
    1,
    {},
    { ...tree(), truncated: true },
    { ...tree(), truncated: undefined },
    { ...tree(), sha: 'wrong' },
    { ...tree(), tree: {} },
  ])('fails closed on an invalid or unpinned tree: %j', (value) => {
    expect(() => extractPractice(value)).toThrow();
  });

  it.each([
    null,
    [],
    1,
    {},
    blob('x', { type: 'unknown' }),
    blob('x', { mode: 'other' }),
    blob('x', { sha: 'bad' }),
    blob('x', { sha: 1 }),
    blob('x', { size: -1 }),
    blob('x', { size: 0.5 }),
    blob('x', { size: Number.MAX_SAFE_INTEGER + 1 }),
    blob('x', { size: '100' }),
    blob('x', { path: 1 }),
    blob(''),
    blob('/absolute'),
    blob('../escape'),
    blob('a/../b'),
    blob('a/./b'),
    blob('a//b'),
    blob('a\\b'),
  ])('rejects malformed tree entries: %j', (entry) => {
    expect(() => extractPractice(tree([entry]))).toThrow();
  });

  it('rejects unsafe numeric sequences before creating ambiguous IDs', () => {
    expect(() =>
      extractPractice(tree([blob('Listening_102_Basic/Basic/Lesson_9007199254740992/audio.mp3')])),
    ).toThrow(/Unsafe unit sequence/);
  });

  it('rejects duplicate paths instead of silently replacing provenance', () => {
    expect(() => extractPractice(tree([fixtures[0], fixtures[0]]))).toThrow(/duplicate/i);
  });

  it('changes its digest when an asset changes, and accepts zero-byte regular files', () => {
    const original = extractPractice(tree([fixtures[0]]));
    const changed = extractPractice(tree([blob(fixtures[0]!.path, { size: 0, mode: '100755' })]));
    expect(changed.meta.contentSha256).not.toBe(original.meta.contentSha256);
    expect(changed.stats.indexedBytes).toBe(0);
  });
});
