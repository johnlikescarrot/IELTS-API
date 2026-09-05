import { describe, expect, it } from 'vitest';

import {
  archiveFacets,
  archiveItems,
  archiveMeta,
  archiveStats,
  archiveVolumes,
  findArchiveItem,
  findArchiveVolume,
  sampleQuestionTypes,
  searchArchive,
} from '../../src/data/archive.js';

const page = (overrides: Partial<Parameters<typeof searchArchive>[0]> = {}) =>
  searchArchive({ limit: 10, offset: 0, ...overrides });

describe('the archive index', () => {
  it('documents its provenance and its limitations', () => {
    const meta = archiveMeta();
    expect(meta.repository).toBe('https://github.com/msneloy/IELTS');
    expect(meta.license).toContain('None declared');
    expect(meta.note).toContain('non-substitutive');
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('reports statistics for the whole upstream collection', () => {
    const stats = archiveStats();
    expect(stats.filesInRepository).toBe(557);
    expect(stats.indexedFiles).toBe(555);
    expect(stats.excludedFiles).toBe(2);
    expect(stats.indexedFiles + stats.excludedFiles).toBe(stats.filesInRepository);
    expect(stats.audioTracks).toBe(509);
    expect(stats.byMedia.audio).toBe(509);
    expect(Object.values(stats.byCollection).reduce((a, b) => a + b, 0)).toBe(555);
  });

  it('summarises the Cambridge listening archive', () => {
    const cambridge = archiveStats().cambridge;
    expect(cambridge.volumesIndexed).toBe(18);
    expect(cambridge.volumesWithAudio).toBe(17);
    expect(cambridge.completeVolumes).toBe(14);
    expect(cambridge.volumesWithTestStructure).toBe(7);
    expect(cambridge.audioTracks).toBe(236);
    expect(cambridge.namingSchemes['test-section']).toBe(6);
    expect(cambridge.watermarkedVolumes).toEqual([4, 5, 16]);
  });

  it('summarises the reading samples and the learner essays', () => {
    const stats = archiveStats();
    expect(stats.readingSamples).toEqual({ files: 12, distinctQuestionTypes: 8, withAnswerKey: 3 });
    expect(stats.assignments.files).toBe(33);
    expect(stats.assignments.essays).toBe(24);
    expect(stats.assignments.learners).toBe(5);
    expect(stats.assignments.essayWords).toBeGreaterThan(7_000);
    expect(stats.assignments.firstDate).toBe('2022-08-05');
    expect(stats.assignments.lastDate).toBe('2022-08-27');
    expect(stats.assignments.essaysByTaskType['line-chart']).toBe(4);
  });

  it('indexes only metadata with unique, resolvable identifiers', () => {
    const items = archiveItems();
    expect(items.length).toBe(archiveStats().indexedFiles);
    const ids = new Set(items.map((item) => item.id));
    expect(ids.size).toBe(items.length);
    for (const item of items) {
      expect(item.sourceUrl.startsWith('https://github.com/msneloy/IELTS/blob/')).toBe(true);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.sizeBytes).toBeGreaterThanOrEqual(0);
      expect(item.sha1).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it('derives test and section structure only where naming encodes it', () => {
    const structured = archiveItems().filter((item) => item.volume === 17);
    expect(structured).toHaveLength(16);
    expect(structured.every((item) => item.test !== null && item.section !== null)).toBe(true);
    const plain = archiveItems().filter((item) => item.volume === 4);
    expect(plain.every((item) => item.test === null && item.section === null)).toBe(true);
  });

  it('profiles the reading samples and the essays but never publishes text', () => {
    const samples = archiveItems().filter((item) => item.collection === 'reading-samples');
    expect(samples).toHaveLength(12);
    for (const sample of samples) {
      expect(sample.questionType).not.toBeNull();
      expect(sample.readability?.fleschReadingEase).toBeGreaterThan(20);
      expect('text' in sample).toBe(false);
    }
    const essays = archiveItems().filter((item) => item.role === 'essay');
    expect(essays).toHaveLength(24);
    expect(essays.every((item) => item.readability !== null && item.date !== null)).toBe(true);
    const essayFields = essays[0] as unknown as Record<string, unknown>;
    expect(Object.keys(essayFields)).not.toContain('body');
  });
});

describe('archiveVolumes', () => {
  it('catalogues every Cambridge volume with its naming era', () => {
    const volumes = archiveVolumes();
    expect(volumes).toHaveLength(18);
    expect(volumes.map((row) => row.volume)).toEqual([...Array(18)].map((_, i) => i + 1));
    const first = findArchiveVolume(1);
    expect(first?.namingScheme).toBe('cassette-side');
    expect(first?.media).toBe('cassette');
    expect(first?.complete).toBe(false);
    const twelfth = findArchiveVolume(12);
    expect(twelfth?.namingScheme).toBe('test-section');
    expect(twelfth?.testNumbers).toEqual([5, 6, 7, 8]);
    const eighteenth = findArchiveVolume(18);
    expect(eighteenth?.audioTracks).toBe(0);
    expect(eighteenth?.namingScheme).toBe('none');
  });

  it('finds and misses single volumes', () => {
    expect(findArchiveVolume(13)?.volume).toBe(13);
    expect(findArchiveVolume(19)).toBeUndefined();
  });
});

describe('archiveFacets', () => {
  it('lists sorted, distinct values per facet', () => {
    for (const facet of ['collection', 'format', 'media', 'skill'] as const) {
      const values = archiveFacets(facet);
      expect(values.length).toBeGreaterThan(2);
      expect([...values]).toEqual([...values].sort());
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('covers the expected collections and skills', () => {
    const collections = archiveFacets('collection');
    for (const expected of [
      'assignments',
      'cambridge-audio',
      'grammar-for-ielts',
      'ielts-trainer',
      'instant-practice',
      'official-materials',
      'practice-test-plus',
      'reading-samples',
      'vocabulary-for-ielts',
    ]) {
      expect(collections).toContain(expected);
    }
    expect(archiveFacets('skill')).toContain('listening');
    expect(archiveFacets('skill')).toContain('writing');
    expect(archiveFacets('format')).toContain('mp3');
    expect(archiveFacets('media')).toContain('audio');
  });
});

describe('findArchiveItem', () => {
  it('resolves a known id and rejects unknown ids', () => {
    const found = findArchiveItem(
      'academic-reading-samples-academic-reading-sample-task-matching-features-pdf',
    );
    expect(found?.questionType).toBe('matching-features');
    expect(found?.readingPart).toBeNull();
    expect(findArchiveItem('no-such-item')).toBeUndefined();
  });
});

describe('sampleQuestionTypes', () => {
  it('lists the canonical types covered by the samples', () => {
    const types = sampleQuestionTypes();
    expect(types).toContain('summary-completion');
    expect(types).toContain('true-false-not-given');
    expect(types).toHaveLength(8);
  });
});

describe('searchArchive', () => {
  it('paginates without filters', () => {
    const result = page({ limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(archiveStats().indexedFiles);
    expect(result.hasMore).toBe(true);
  });

  it('searches by free text across paths and titles', () => {
    const result = page({ query: 'cambridge', limit: 100 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThan(archiveStats().indexedFiles);
  });

  it('filters by collection, format, media and skill', () => {
    const collection = page({ collections: ['reading-samples'] });
    expect(collection.total).toBe(12);
    expect(collection.items.every((item) => item.collection === 'reading-samples')).toBe(true);

    const format = page({ formats: ['wma'], limit: 100 });
    expect(format.items.every((item) => item.format === 'wma')).toBe(true);
    expect(format.total).toBe(20);

    const media = page({ media: ['document'] });
    expect(media.total).toBe(12);

    const skill = page({ skills: ['writing'], limit: 100 });
    expect(skill.items.every((item) => item.skill === 'writing')).toBe(true);

    const empty = page({ skills: ['writing'], media: ['audio'] });
    expect(empty.total).toBe(0);
  });

  it('filters by Cambridge volume', () => {
    const volume = page({ volume: 17 });
    expect(volume.total).toBe(16);
    expect(volume.items.every((item) => item.volume === 17)).toBe(true);
    expect(page({ volume: 18 }).total).toBe(1);
  });

  it('sorts by every key in both directions', () => {
    const bySize = page({ sort: 'size', order: 'desc', limit: 5 });
    for (let index = 1; index < bySize.items.length; index += 1) {
      expect(bySize.items[index - 1]!.sizeBytes).toBeGreaterThanOrEqual(bySize.items[index]!.sizeBytes);
    }

    const byTitle = page({ sort: 'title', limit: 5 });
    expect([...byTitle.items].map((item) => item.title.toLowerCase())).toEqual(
      [...byTitle.items].map((item) => item.title.toLowerCase()).sort(),
    );

    const byCollection = page({ sort: 'collection', limit: 10 });
    expect(byCollection.items[0]!.collection <= byCollection.items[9]!.collection).toBe(true);

    const byVolume = page({ sort: 'volume', order: 'desc', limit: 5 });
    expect(byVolume.items[0]!.volume).not.toBeNull();
    // Volume-less items sort as volume 0 on the ascending side.
    const byVolumeAsc = page({ sort: 'volume', limit: 3 });
    expect(byVolumeAsc.items.every((item) => item.volume === null)).toBe(true);

    const byDate = page({ sort: 'date', collections: ['assignments'], limit: 24 });
    expect(byDate.items.at(-1)!.date).not.toBeNull();
    // Date-less items (everything outside the assignments folder) sort as ''.
    const byDateAsc = page({ sort: 'date', limit: 3 });
    expect(byDateAsc.items.every((item) => item.date === null)).toBe(true);

    expect(page({ sort: 'title', order: 'desc', limit: 3 }).items).toHaveLength(3);
  });

  it('applies filters conjunctively', () => {
    const combined = page({ collections: ['cambridge-audio'], volume: 6 });
    expect(combined.total).toBe(16);
    for (const item of combined.items) {
      expect(item.collection).toBe('cambridge-audio');
      expect(item.test).not.toBeNull();
    }
  });
});
