import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  findPracticeItem,
  practiceCatalog,
  practiceCollections,
  practiceMeta,
  practiceStats,
  samplePractice,
  searchPractice,
} from '../../src/data/practice.js';
import { practiceDigest } from '../../src/data/practice-extract.js';

const all = () => searchPractice({ limit: 10000, offset: 0 });

describe('the committed practice inventory', () => {
  it('has the independently measured counts and a verified payload digest', () => {
    const catalog = practiceCatalog();
    expect(catalog.stats).toMatchObject({
      repositoryFiles: 5545,
      repositoryBytes: 3876514725,
      indexedAssets: 4707,
      indexedBytes: 3823735950,
      excludedFiles: 838,
      units: 1852,
      completeUnits: 1801,
      incompleteUnits: 51,
      bySkill: { listening: 306, reading: 1546 },
      byCollection: {
        'listening-basic': 102,
        'listening-tests': 204,
        'reading-basic': 1232,
        'reading-tests': 314,
      },
      duplicateBlobGroups: 68,
      repeatedBlobReferences: 68,
    });
    expect(catalog.meta.contentSha256).toBe(practiceDigest(catalog));
    expect(catalog.meta.contentSha256).toBe(
      'aa3d43627d0a1264292ff14a019e03ffcb9a4a0c63b748e3d213259da0588b2b',
    );
    expect(JSON.stringify(catalog, null, 2) + '\n').toBe(
      readFileSync(new URL('../../data/practice.json', import.meta.url), 'utf8'),
    );
    expect(new Set(catalog.items.map((item) => item.id)).size).toBe(1852);
  });

  it('keeps missing units distinct from units with missing required assets', () => {
    expect(findPracticeItem('reading-tests-0105')).toBeUndefined();
    expect(findPracticeItem('listening-tests-0083')?.missingRoles).toEqual(['audio']);
    expect(findPracticeItem('listening-tests-0003')?.missingRoles).toEqual(['questions']);
    expect(findPracticeItem('reading-tests-0003')?.missingRoles).toEqual(['questions']);
    expect(practiceCollections().find((collection) => collection.id === 'reading-tests')?.expectedUnits).toBe(
      315,
    );
  });

  it('reconciles every asset, role, byte and completeness total', () => {
    const catalog = practiceCatalog();
    const assets = catalog.items.flatMap((item) => item.assets);
    const uniquePaths = new Set(assets.map((asset) => asset.path));
    expect(uniquePaths.size).toBe(assets.length);
    expect(assets.length).toBe(catalog.stats.indexedAssets);
    expect(assets.reduce((sum, asset) => sum + asset.sizeBytes, 0)).toBe(catalog.stats.indexedBytes);
    for (const item of catalog.items) {
      const collection = catalog.collections.find((candidate) => candidate.id === item.collection)!;
      expect(item.missingRoles).toEqual(
        collection.requiredRoles.filter((role) => !item.assets.some((asset) => asset.role === role)),
      );
      expect(item.structurallyComplete).toBe(item.missingRoles.length === 0);
      expect(item.assets.every((asset) => /^[0-9a-f]{40}$/.test(asset.sha1))).toBe(true);
    }
    const serialized = JSON.stringify(catalog);
    for (const forbidden of [
      'passage',
      '"answer":',
      '"content":',
      '.env',
      'session.json',
      'raw.githubusercontent.com',
      'script.google.com',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('paginates in stable ID order without mutating the inventory', () => {
    const page = searchPractice({ limit: 2, offset: 1 });
    expect(page).toMatchObject({ total: 1852, limit: 2, offset: 1, hasMore: true });
    expect(page.items).toEqual(all().items.slice(1, 3));
    expect(all().items.map((item) => item.id)).toEqual(
      all()
        .items.map((item) => item.id)
        .sort(),
    );
    expect(searchPractice({ limit: 1, offset: 1852 }).items).toEqual([]);
    expect(searchPractice({ limit: 1, offset: 1851 }).hasMore).toBe(false);
  });

  it('applies individual and combined filters including empty results', () => {
    expect(searchPractice({ collection: 'listening-tests', limit: 1000, offset: 0 }).total).toBe(204);
    expect(searchPractice({ skill: 'reading', limit: 1000, offset: 0 }).total).toBe(1546);
    expect(searchPractice({ level: 'a1-a2', limit: 1000, offset: 0 }).total).toBe(198);
    expect(searchPractice({ complete: false, limit: 1000, offset: 0 }).total).toBe(51);
    expect(searchPractice({ complete: true, limit: 1000, offset: 0 }).total).toBe(1801);
    expect(searchPractice({ query: 'LISTENING-TESTS-0083', limit: 5, offset: 0 }).items[0]?.id).toBe(
      'listening-tests-0083',
    );
    expect(searchPractice({ query: '', limit: 1, offset: 0 }).total).toBe(1852);
    expect(searchPractice({ skill: 'listening', level: 'a1-a2', limit: 5, offset: 0 }).total).toBe(0);
    const combined = searchPractice({
      collection: 'listening-tests',
      skill: 'listening',
      level: 'unspecified',
      complete: false,
      query: '0083',
      limit: 5,
      offset: 0,
    });
    expect(combined.items.map((item) => item.id)).toEqual(['listening-tests-0083']);
  });

  it('samples reproducibly, without replacement, with population capping', () => {
    const a = samplePractice('study-2026', 10);
    expect(a).toEqual(samplePractice('study-2026', 10));
    expect(a.map((item) => item.id)).toEqual([
      'listening-basic-intermediate-0029',
      'listening-tests-0142',
      'reading-basic-a1-a2-0118',
      'reading-basic-b1-b2-0156',
      'reading-basic-c1-c2-0478',
      'reading-basic-c1-c2-0579',
      'reading-tests-0161',
      'reading-tests-0188',
      'reading-tests-0225',
      'reading-tests-0259',
    ]);
    expect(a).not.toEqual(samplePractice('another-study', 10));
    expect(new Set(a.map((item) => item.id)).size).toBe(10);
    expect(a.map((item) => item.id)).toEqual(a.map((item) => item.id).sort());
    expect(samplePractice('study', 100, { level: 'basic' })).toHaveLength(34);
    expect(samplePractice('study', 10, { skill: 'listening', level: 'a1-a2' })).toEqual([]);
    expect(samplePractice('study', 0)).toEqual([]);
    expect(
      samplePractice('study', 10, { collection: 'reading-tests', complete: false }).every((item) =>
        item.missingRoles.includes('questions'),
      ),
    ).toBe(true);
  });

  it('isolates all library returns from mutation', () => {
    const original = practiceCatalog();
    practiceCatalog().items.splice(0);
    practiceMeta().source.commit = 'changed';
    practiceStats().bySkill.listening = -1;
    practiceCollections()[0]!.requiredRoles.splice(0);
    all().items[0]!.assets[0]!.sha1 = 'changed';
    findPracticeItem('reading-tests-0001')!.assets.splice(0);
    samplePractice('study', 1)[0]!.missingRoles.push('audio');
    expect(practiceCatalog()).toEqual(original);
  });
});
