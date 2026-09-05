import { describe, expect, it } from 'vitest';

import { MANIFEST_DATASETS, RESEARCH_MANIFEST, getManifest, sha256OfFile } from '../../src/lib/manifest.js';

describe('research provenance manifest', () => {
  it('exposes deterministic manifest structure and checksums', () => {
    const manifest = getManifest();
    expect(manifest.manifestVersion).toBe(1);
    expect(manifest.api.name).toBe('ielts-api');
    expect(manifest.api.version).toBe('1.0.0');
    expect(manifest.review.upstream).toContain('UPGRADE-YOUR-IELTS-SKILLS');
    expect(manifest.review.commit).toBe('ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c');
    expect(manifest.review.unitsObserved).toBe(1852);
    expect(manifest.review.unitsDeclared).toBe(1853);
    expect(manifest.review.notes.length).toBeGreaterThan(0);
  });

  it('exposes manifest datasets with sha256 checksums', () => {
    expect(MANIFEST_DATASETS.vocabulary).toBeDefined();
    expect(MANIFEST_DATASETS.vocabulary?.records).toBe(4174);
    expect(MANIFEST_DATASETS.vocabulary?.sha256).toHaveLength(64);

    expect(MANIFEST_DATASETS.corpus).toBeDefined();
    expect(MANIFEST_DATASETS.corpus?.records).toBe(76);
    expect(MANIFEST_DATASETS.corpus?.sha256).toHaveLength(64);

    expect(MANIFEST_DATASETS.themes).toBeDefined();
    expect(MANIFEST_DATASETS.themes?.records).toBe(50);

    expect(MANIFEST_DATASETS.practice).toBeDefined();
    expect(MANIFEST_DATASETS.practice?.records).toBe(1852);

    expect(RESEARCH_MANIFEST).toEqual(getManifest());
  });

  it('handles missing files gracefully in sha256 calculation', () => {
    const hash = sha256OfFile('nonexistent/file.json');
    expect(hash).toBe('0'.repeat(64));
  });
});
