import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { buildPracticeIndex } from '../../src/lib/practice-index.js';
import { PRACTICE_SOURCE } from '../../src/data/practice-source.js';

const blob = (path: string, overrides: Record<string, unknown> = {}) => ({
  path,
  type: 'blob',
  mode: '100644',
  sha: 'a'.repeat(40),
  size: 42,
  ...overrides,
});
const tree = (entries: unknown[], overrides: Record<string, unknown> = {}) => ({
  sha: PRACTICE_SOURCE.commit,
  truncated: false,
  tree: entries,
  ...overrides,
});
const reading = 'Reading_1232_Basic/frontend/data/A1-A2/lesson_001.json';
const listening = 'Listening_204_FullTest/Test_1/Test_1.html';

const entries = [
  blob(reading),
  blob(reading.replace('.json', '.js'), { mode: '100755' }),
  blob('Reading_1232_Basic/frontend/data/B1-B2/lesson_001.json'),
  blob('Reading_1232_Basic/frontend/data/C1-C2/lesson_001.json'),
  blob('Listening_102_Basic/Basic/Lesson_1/index.html'),
  blob('Listening_102_Basic/Basic/Lesson_1/audio.mp3'),
  blob('Listening_102_Basic/Intermediate/Lesson_1/index.html'),
  blob('Listening_102_Basic/Advanced/Lesson_1/index.html'),
  blob('Reading_315_FullTest/Test_1/Test_1.json'),
  blob('Reading_315_FullTest/Test_1/Test_1_processed.json'),
  blob('Reading_315_FullTest/Test_1/Test_1.docx'),
  blob('Reading_315_FullTest/Test_1/strategies.json'),
  blob(listening),
  blob('Listening_204_FullTest/Test_1/audio_1.mp3'),
  blob('Listening_204_FullTest/Test_1/index.html'),
  blob('Listening_204_FullTest/Test_2/Test_2.html'),
];

describe('buildPracticeIndex', () => {
  it('deduplicates representations while retaining all allowlisted asset metadata', () => {
    const result = buildPracticeIndex(tree(entries));
    expect(result.items).toHaveLength(9);
    expect(result.stats.assets).toBe(entries.length);
    expect(
      result.items
        .find((item) => item.id === 'reading-full-test-0001')
        ?.assets.map((a) => a.kind)
        .sort(),
    ).toEqual(['document', 'json', 'processed-json', 'strategy']);
    expect(result.stats.unitsByAsset.html).toBe(5);
    expect(result.items.find((item) => item.id === 'reading-basic-a1-a2-0001')?.sourceUrl).toBe(
      `${PRACTICE_SOURCE.repository}/tree/${PRACTICE_SOURCE.commit}/Reading_1232_Basic/frontend/data/A1-A2`,
    );
    expect(result.items.find((item) => item.id === 'listening-full-test-0001')?.sourceUrl).toContain(
      '/Listening_204_FullTest/Test_1',
    );
    expect(result.items.find((item) => item.id === 'listening-basic-basic-0001')?.sourceUrl).toContain(
      '/Listening_102_Basic/Basic/Lesson_1',
    );
    expect(result.source).toEqual(PRACTICE_SOURCE);
    expect(result.metadataLicense).toBe('CC-BY-4.0');
    expect(result.source.license).toBeNull();
    expect(result.source.contentIncluded).toBe(false);
  });

  it('reports missing sequences and missing audio without claiming content validity', () => {
    const { stats } = buildPracticeIndex(tree(entries));
    expect(stats.bySkill).toEqual({ reading: 4, listening: 5 });
    expect(stats.byMode).toEqual({ basic: 6, 'full-test': 3 });
    expect(stats.byLevel.unspecified).toBe(3);
    expect(stats.collections.find((c) => c.id === 'reading-basic-a1-a2')?.missingSequences).toEqual(
      Array.from({ length: 197 }, (_, i) => i + 2),
    );
    expect(stats.listeningWithoutAudio).toEqual([
      'listening-basic-advanced-0001',
      'listening-basic-intermediate-0001',
      'listening-full-test-0002',
    ]);
  });

  it('is byte-deterministic under input reordering and fingerprints canonical item JSON', () => {
    const a = buildPracticeIndex(tree(entries));
    const b = buildPracticeIndex(tree([...entries].reverse()));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.items.map((i) => i.id)).toEqual(a.items.map((i) => i.id).sort());
    expect(a.itemsSha256).toBe(createHash('sha256').update(JSON.stringify(a.items)).digest('hex'));
    const changed = buildPracticeIndex(tree([blob(reading, { size: 43 })]));
    expect(changed.itemsSha256).not.toBe(buildPracticeIndex(tree([blob(reading)])).itemsSha256);
  });

  it('preserves numbers and does not renumber gaps or conflate collections', () => {
    const result = buildPracticeIndex(
      tree([
        blob(reading.replace('001', '010')),
        blob(reading),
        blob('Reading_1232_Basic/frontend/data/B1-B2/lesson_001.json'),
      ]),
    );
    expect(result.items.map((i) => i.id)).toEqual([
      'reading-basic-a1-a2-0001',
      'reading-basic-a1-a2-0010',
      'reading-basic-b1-b2-0001',
    ]);
  });

  it('excludes templates, auxiliary files, payloads and non-regular entries by allowlist', () => {
    const excluded = [
      blob('.env'),
      blob('node_modules/lesson_001.json'),
      blob('student.html'),
      blob('Reading_1232_Basic/frontend/data/A1-A2/metadata.json'),
      blob('Reading_1232_Basic/frontend/data/A1-A2/lesson_01.json'),
      blob('Reading_315_FullTest/Test_1/images/image_1.png'),
      blob('Reading_315_FullTest/Test_1/Test_2.json'),
      blob('Listening_204_FullTest/Test_1/Test_{idx_num}.html'),
      blob('Listening_204_FullTest/index.html'),
      blob('Listening_204_FullTest/Test_1/__proto__'),
      blob('Listening_204_FullTest/Test_1/constructor'),
      blob('Listening_204_FullTest/Test_1/json'),
      blob('Listening_204_FullTest/Test_1/audio.mp3'),
      blob('Listening_102_Basic/Basic/Lesson_1/strategies.json'),
      { path: 'Reading_315_FullTest/Test_2', type: 'tree' },
    ];
    expect(buildPracticeIndex(tree([blob(reading), ...excluded])).stats.assets).toBe(1);
    expect(
      JSON.stringify(buildPracticeIndex(tree([blob(reading, { content: 'NEVER COPY THIS' })]))),
    ).not.toContain('NEVER COPY THIS');
  });

  it.each([
    null,
    [],
    5,
    'tree',
    {},
    { sha: 'wrong' },
    tree([], { truncated: true }),
    tree([], { truncated: undefined }),
    tree([], { tree: {} }),
    tree([], { sha: 'b'.repeat(40) }),
  ])('rejects invalid, truncated or unpinned tree input: %j', (input) => {
    expect(() => buildPracticeIndex(input)).toThrow();
  });

  it.each([null, [], 'entry', {}, { path: 1 }])('rejects malformed entries: %j', (entry) => {
    expect(() => buildPracticeIndex(tree([entry]))).toThrow();
  });

  it.each([
    { sha: null },
    { sha: 'invalid' },
    { size: -1 },
    { size: 0.5 },
    { size: '42' },
    { size: Number.POSITIVE_INFINITY },
    { mode: '120000' },
    { mode: undefined },
  ])('rejects invalid selected blob metadata: %j', (overrides) => {
    expect(() => buildPracticeIndex(tree([blob(reading, overrides)]))).toThrow();
  });

  it('rejects duplicate selected paths and out-of-range unit numbers', () => {
    expect(() => buildPracticeIndex(tree([blob(reading), blob(reading)]))).toThrow(/Duplicate/);
    expect(() => buildPracticeIndex(tree([blob(reading.replace('001', '000'))]))).toThrow(/number/);
    expect(() => buildPracticeIndex(tree([blob(reading.replace('001', '999'))]))).toThrow(/number/);
    expect(() =>
      buildPracticeIndex(
        tree([blob('Reading_315_FullTest/Test_9007199254740992/Test_9007199254740992.html')]),
      ),
    ).toThrow(/number/);
  });

  it('rejects empty inventories instead of silently publishing a broken snapshot', () => {
    expect(() => buildPracticeIndex(tree([]))).toThrow(/No practice units/);
  });
});
