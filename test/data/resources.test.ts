import { describe, expect, it } from 'vitest';

import { RESOURCES, RESOURCE_TYPES, findResources } from '../../src/data/resources.js';

describe('RESOURCES', () => {
  it('only lists free, https resources with unique ids', () => {
    const ids = new Set<string>();
    for (const resource of RESOURCES) {
      expect(resource.free).toBe(true);
      expect(resource.url.startsWith('https://')).toBe(true);
      expect(resource.name.length).toBeGreaterThan(0);
      expect(resource.provider.length).toBeGreaterThan(0);
      expect(resource.description.length).toBeGreaterThan(10);
      expect(resource.license.length).toBeGreaterThan(0);
      expect(RESOURCE_TYPES).toContain(resource.type);
      ids.add(resource.id);
    }
    expect(ids.size).toBe(RESOURCES.length);
  });
});

describe('findResources', () => {
  it('returns everything without a filter', () => {
    expect(findResources()).toHaveLength(RESOURCES.length);
  });

  it('filters by type', () => {
    const datasets = findResources('dataset');
    expect(datasets.length).toBeGreaterThan(0);
    expect(datasets.every((resource) => resource.type === 'dataset')).toBe(true);
  });

  it('returns an empty list for an unused type', () => {
    expect(findResources('community')).not.toHaveLength(0);
    const counts = RESOURCE_TYPES.map((type) => findResources(type).length);
    expect(counts.reduce((total, count) => total + count, 0)).toBe(RESOURCES.length);
  });
});
