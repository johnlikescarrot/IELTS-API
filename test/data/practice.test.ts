import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  exportPractice,
  findPracticeUnit,
  practiceIndex,
  samplePractice,
  searchPractice,
} from '../../src/data/practice.js';
import { PRACTICE_ASSETS, PRACTICE_LEVELS, PRACTICE_SOURCE } from '../../src/data/practice-source.js';
import type { PracticeIndex, PracticeUnit } from '../../src/types.js';

const page = (options: Partial<Parameters<typeof searchPractice>[0]> = {}) =>
  searchPractice({ limit: 20, offset: 0, ...options });

describe('the pinned practice metadata index', () => {
  it('reports measured counts, missing units, and unknown upstream rights', () => {
    const index = practiceIndex();
    expect(practiceIndex()).toBe(index);
    expect(index.source).toEqual(PRACTICE_SOURCE);
    expect(index.stats.units).toBe(1852);
    expect(index.stats.assets).toBe(4606);
    expect(index.stats.bySkill).toEqual({ reading: 1546, listening: 306 });
    expect(index.stats.collections.find((c) => c.id === 'reading-full-test')?.missingSequences).toEqual([
      105,
    ]);
    expect(index.stats.listeningWithoutAudio).toEqual([
      'listening-full-test-0083',
      'listening-full-test-0085',
      'listening-full-test-0088',
    ]);
    expect(index.stats.byLevel['a1-a2']).toBe(198);
  });

  it('has a verifiable checksum, unique stable IDs, and pinned references for every asset', () => {
    const index = practiceIndex();
    expect(index.itemsSha256).toBe(createHash('sha256').update(JSON.stringify(index.items)).digest('hex'));
    expect(new Set(index.items.map((i) => i.id)).size).toBe(index.stats.units);
    const paths = index.items.flatMap((i) => i.assets.map((a) => a.path));
    expect(new Set(paths).size).toBe(index.stats.assets);
    for (const unit of index.items) {
      expect(unit.sourceUrl).toContain(`/tree/${PRACTICE_SOURCE.commit}/`);
      expect(unit.id).toBe(`${unit.collection}-${String(unit.sequence).padStart(4, '0')}`);
      expect(unit.assets.length).toBeGreaterThan(0);
      for (const asset of unit.assets) {
        expect(asset.gitBlobSha).toMatch(/^[a-f0-9]{40}$/);
        expect(Number.isSafeInteger(asset.sizeBytes)).toBe(true);
        expect(asset.sizeBytes).toBeGreaterThanOrEqual(0);
        expect(asset.path).not.toMatch(/node_modules|\.env|\{idx_num\}|student|manager/);
      }
    }
  });

  it('recomputes every advertised total from the canonical units', () => {
    const { items, stats } = practiceIndex();
    for (const level of PRACTICE_LEVELS)
      expect(stats.byLevel[level]).toBe(items.filter((i) => i.level === level).length);
    for (const kind of PRACTICE_ASSETS) {
      expect(stats.unitsByAsset[kind]).toBe(
        items.filter((i) => i.assets.some((a) => a.kind === kind)).length,
      );
    }
    expect(items.reduce((n, item) => n + item.assets.length, 0)).toBe(stats.assets);
  });
});

describe('practice queries', () => {
  it('paginates the entire inventory in canonical order, including offsets beyond 1000', () => {
    expect(page().items).toHaveLength(20);
    expect(page().total).toBe(1852);
    expect(page().hasMore).toBe(true);
    const last = page({ offset: 1850, limit: 100 });
    expect(last.items).toHaveLength(2);
    expect(last.hasMore).toBe(false);
    expect(page({ offset: 2000 }).items).toEqual([]);
  });

  it('filters by each supported facet and combines filters with AND semantics', () => {
    expect(page({ skill: 'reading' }).total).toBe(1546);
    expect(page({ mode: 'full-test' }).total).toBe(518);
    expect(page({ level: 'advanced' }).total).toBe(34);
    expect(page({ asset: 'audio' }).total).toBe(303);
    expect(page({ skill: 'listening', mode: 'full-test', level: 'unspecified', asset: 'audio' }).total).toBe(
      201,
    );
    expect(page({ skill: 'reading', level: 'advanced' }).items).toEqual([]);
  });

  it('searches IDs, original paths and labels without changing stored data', () => {
    const before = JSON.stringify(practiceIndex());
    expect(page({ query: 'A1-A2/lesson_010' }).items.map((i) => i.id)).toEqual(['reading-basic-a1-a2-0010']);
    expect(page({ query: 'reading-full-test-0105' }).items).toEqual([]);
    expect(page({ query: 'not-a-real-unit' }).total).toBe(0);
    expect(JSON.stringify(practiceIndex())).toBe(before);
  });

  it('looks up exact IDs and preserves missing units', () => {
    expect(findPracticeUnit('reading-full-test-0104')?.sequence).toBe(104);
    expect(findPracticeUnit('reading-full-test-0105')).toBeUndefined();
    expect(findPracticeUnit('constructor')).toBeUndefined();
  });

  it('samples without replacement, deterministically, from the filtered population', () => {
    const options = { skill: 'listening', mode: 'full-test' } as const;
    const first = samplePractice(options, 'replication-2026', 10);
    expect(first).toEqual(samplePractice(options, 'replication-2026', 10));
    expect(first).not.toEqual(samplePractice(options, 'different-seed', 10));
    expect(new Set(first.map((i) => i.id)).size).toBe(10);
    expect(first.every((i) => i.skill === 'listening' && i.mode === 'full-test')).toBe(true);
    expect(samplePractice({ query: 'nonexistent' }, 's', 10)).toEqual([]);
    expect(samplePractice({ query: 'reading-full-test-0001' }, 's', 50)).toHaveLength(1);
  });

  it('freezes the versioned sampling algorithm with a Unicode-seed golden fixture', () => {
    expect(
      samplePractice({ skill: 'listening', mode: 'full-test', asset: 'audio' }, 'nghiên-cứu-2026', 5).map(
        (item) => item.id,
      ),
    ).toEqual([
      'listening-full-test-0004',
      'listening-full-test-0036',
      'listening-full-test-0066',
      'listening-full-test-0074',
      'listening-full-test-0179',
    ]);
  });

  it('exports portable JSON Lines with provenance, not exercise contents', () => {
    const text = exportPractice({ level: 'a1-a2' });
    expect(text.endsWith('\n')).toBe(true);
    const rows = text
      .trimEnd()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            schemaVersion: number;
            source: PracticeIndex['source'];
            indexSha256: string;
            metadataLicense: string;
            unit: PracticeUnit;
          },
      );
    expect(rows).toHaveLength(198);
    expect(rows.map((r) => r.unit)).toEqual(practiceIndex().items.filter((i) => i.level === 'a1-a2'));
    for (const row of rows) {
      expect(row.source).toEqual(PRACTICE_SOURCE);
      expect(row.metadataLicense).toBe('CC-BY-4.0');
      expect(row.indexSha256).toBe(practiceIndex().itemsSha256);
      expect(row.schemaVersion).toBe(1);
    }
    expect(exportPractice().trimEnd().split('\n')).toHaveLength(1852);
    expect(exportPractice({ query: 'nonexistent' })).toBe('');
  });
});
