import { describe, expect, it } from 'vitest';

import {
  CATALOG_COLLECTIONS,
  CATALOG_LICENSE_NOTE,
  CATALOG_RAW_BASE,
  CATALOG_UPSTREAM_REPOSITORY,
  artifactsForIndex,
  catalogTotals,
  fillTemplate,
  findCollection,
  isPresentInRange,
  levelForIndex,
  resolveEntry,
} from '../../src/data/catalog.js';

import type { CatalogCollection } from '../../src/types.js';

/** Fetch a collection and assert it exists (keeps the tests type-safe). */
function collection(id: string): CatalogCollection {
  const found = findCollection(id);
  if (found === undefined) {
    throw new Error(`Missing test collection ${id}`);
  }
  return found;
}

describe('CATALOG_COLLECTIONS', () => {
  it('indexes the four upstream collections with verified sizes', () => {
    expect(CATALOG_COLLECTIONS.map((entry) => entry.id)).toEqual([
      'listening-102-basic',
      'listening-204-full-test',
      'reading-1232-basic',
      'reading-315-full-test',
    ]);
    const totals = Object.fromEntries(CATALOG_COLLECTIONS.map((entry) => [entry.id, entry.totalEntries]));
    expect(totals).toEqual({
      'listening-102-basic': 102,
      'listening-204-full-test': 204,
      'reading-1232-basic': 1232,
      'reading-315-full-test': 315,
    });
  });

  it('keeps basic collection level counts consistent with totals', () => {
    for (const entry of CATALOG_COLLECTIONS) {
      if (entry.tier === 'basic') {
        const sum = entry.levels.reduce((total, level) => total + level.count, 0);
        expect(sum).toBe(entry.totalEntries);
      }
    }
  });

  it('describes licensing honestly', () => {
    expect(CATALOG_LICENSE_NOTE).toContain('Metadata only');
    expect(CATALOG_RAW_BASE).toContain('raw.githubusercontent.com');
    expect(CATALOG_UPSTREAM_REPOSITORY).toContain('ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS');
  });
});

describe('isPresentInRange', () => {
  it('is inclusive at both edges', () => {
    expect(isPresentInRange([[5, 8]], 5)).toBe(true);
    expect(isPresentInRange([[5, 8]], 8)).toBe(true);
    expect(isPresentInRange([[5, 8]], 4)).toBe(false);
    expect(isPresentInRange([], 7)).toBe(false);
  });
});

describe('fillTemplate', () => {
  it('substitutes all tokens', () => {
    expect(fillTemplate('Test_{test}/Test_{test}.json', { level: '', lesson: 3, test: 3 })).toBe(
      'Test_3/Test_3.json',
    );
    expect(fillTemplate('{level}/Lesson_{lesson}/index.html', { level: 'B1-B2', lesson: 7, test: 7 })).toBe(
      'B1-B2/Lesson_7/index.html',
    );
    expect(fillTemplate('lesson_{pad}.js', { level: 'A1-A2', lesson: 42, test: 42 })).toBe('lesson_042.js');
    expect(fillTemplate('no-tokens', { level: 'x', lesson: 1, test: 1 })).toBe('no-tokens');
  });
});

describe('levelForIndex', () => {
  it('maps global indexes across levels (prefix sums)', () => {
    const basic = collection('reading-1232-basic');
    expect(levelForIndex(basic, 1)).toEqual({ level: 'A1-A2', indexWithinLevel: 1 });
    expect(levelForIndex(basic, 198)).toEqual({ level: 'A1-A2', indexWithinLevel: 198 });
    expect(levelForIndex(basic, 199)).toEqual({ level: 'B1-B2', indexWithinLevel: 1 });
    expect(levelForIndex(basic, 572)).toEqual({ level: 'B1-B2', indexWithinLevel: 374 });
    expect(levelForIndex(basic, 1232)).toEqual({ level: 'C1-C2', indexWithinLevel: 660 });
  });

  it('returns flat positions for full-test collections', () => {
    expect(levelForIndex(collection('reading-315-full-test'), 105)).toEqual({
      level: null,
      indexWithinLevel: 105,
    });
  });
});

describe('artifactsForIndex', () => {
  it('marks gaps from verified upstream availability', () => {
    const listening = collection('listening-204-full-test');
    const artifacts = artifactsForIndex(listening, 3);
    const byName = Object.fromEntries(artifacts.map((artifact) => [artifact.name, artifact]));
    expect(byName.questionsJson?.available).toBe(false);
    expect(byName.questionsJson?.path).toBeNull();
    expect(byName.testPlayer?.available).toBe(true);
    expect(byName.testPlayer?.path).toBe('Listening_204_FullTest/Test_3/Test_3.html');
    expect(byName.testPlayer?.rawUrl).toContain('Listening_204_FullTest');
    expect(byName.testPlayer?.blobUrl).toContain('/blob/main/');
    expect(byName.playerIndex?.available).toBe(true);
    const hundredTwenty = artifactsForIndex(listening, 120).find(
      (artifact) => artifact.name === 'playerIndex',
    );
    expect(hundredTwenty?.available).toBe(false);
  });

  it('resolves padded lesson paths inside the right level', () => {
    const artifacts = artifactsForIndex(collection('reading-1232-basic'), 200);
    const json = artifacts.find((artifact) => artifact.name === 'lessonJson');
    expect(json?.path).toBe('Reading_1232_Basic/frontend/data/B1-B2/lesson_002.json');
  });
});

describe('resolveEntry', () => {
  it('rejects out-of-range and non-integer indexes', () => {
    const basic = collection('listening-102-basic');
    expect(resolveEntry(basic, 0)).toBeUndefined();
    expect(resolveEntry(basic, 103)).toBeUndefined();
    expect(resolveEntry(basic, 1.5)).toBeUndefined();
  });

  it('rejects entries with no upstream artifact at all (reading test 105)', () => {
    expect(resolveEntry(collection('reading-315-full-test'), 105)).toBeUndefined();
  });

  it('builds a complete entry for a lesson', () => {
    const entry = resolveEntry(collection('listening-102-basic'), 70);
    expect(entry).toBeDefined();
    expect(entry?.id).toBe('listening-102-basic-0070');
    expect(entry?.level).toBe('Advanced');
    expect(entry?.indexWithinLevel).toBe(2);
    expect(entry?.number).toBe(2);
    expect(entry?.directory).toBe('Advanced/Lesson_2');
    expect(entry?.treeUrl).toBe(
      `${CATALOG_UPSTREAM_REPOSITORY}/tree/main/Listening_102_Basic/Advanced/Lesson_2`,
    );
    expect(entry?.artifacts.every((artifact) => artifact.available)).toBe(true);
  });

  it('uses the root tree URL for flat file entries', () => {
    const entry = resolveEntry(collection('reading-1232-basic'), 5);
    expect(entry?.directory).toBe('');
    expect(entry?.treeUrl).toBe(`${CATALOG_UPSTREAM_REPOSITORY}/tree/main/Reading_1232_Basic/frontend/data`);
    expect(entry?.level).toBe('A1-A2');
  });

  it('exposes stable schema hints for full tests', () => {
    const listening = collection('listening-204-full-test');
    const strategies = resolveEntry(listening, 7)?.artifacts.find(
      (artifact) => artifact.name === 'strategiesJson',
    );
    expect(strategies?.available).toBe(true);
    expect(strategies?.rawUrl).toBe(`${CATALOG_RAW_BASE}Listening_204_FullTest/Test_7/strategies.json`);
    const late = resolveEntry(listening, 21)?.artifacts.find(
      (artifact) => artifact.name === 'strategiesJson',
    );
    expect(late?.available).toBe(false);
  });
});

describe('findCollection', () => {
  it('resolves ids', () => {
    expect(collection('reading-315-full-test').skill).toBe('reading');
    expect(findCollection('nope')).toBeUndefined();
  });
});

describe('catalogTotals', () => {
  it('aggregates entries and verified file counts', () => {
    const totals = catalogTotals();
    expect(totals.collections).toBe(4);
    expect(totals.entries).toBe(102 + 204 + 1232 + 315);
    expect(totals.artifacts).toBe(15);
    expect(totals.questionSets).toBe(201 + 269);
    expect(totals.strategySets).toBe(40);
    expect(totals.availableFiles).toBe(4606);
  });
});
