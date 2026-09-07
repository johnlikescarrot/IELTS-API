import { describe, expect, it } from 'vitest';

import { COLLECTION_IDS, VOCAB_COLLECTIONS, findCollection } from '../../src/data/collections.js';

describe('VOCAB_COLLECTIONS', () => {
  it('contains 22 collections', () => {
    expect(VOCAB_COLLECTIONS).toHaveLength(22);
    expect(COLLECTION_IDS).toHaveLength(22);
  });

  it('has unique ids and required fields', () => {
    const ids = new Set<string>();
    for (const col of VOCAB_COLLECTIONS) {
      expect(col.id.length).toBeGreaterThan(0);
      expect(col.name.length).toBeGreaterThan(0);
      expect(col.zhName.length).toBeGreaterThan(0);
      expect(col.keywords.length).toBeGreaterThan(0);
      expect(col.themeGroup.length).toBeGreaterThan(0);
      expect(ids.has(col.id)).toBe(false);
      ids.add(col.id);
    }
  });

  it('findCollection is case-insensitive', () => {
    expect(findCollection('Education')).toEqual(findCollection('education'));
    expect(findCollection('NATURAL-GEOGRAPHY')).not.toBeUndefined();
    expect(findCollection('nonexistent')).toBeUndefined();
    expect(findCollection('  education  ')).not.toBeUndefined();
  });

  it('COLLECTION_IDS matches VOCAB_COLLECTIONS ids', () => {
    expect(COLLECTION_IDS).toEqual(VOCAB_COLLECTIONS.map((c) => c.id));
  });
});
