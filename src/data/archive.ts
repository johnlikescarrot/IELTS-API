/**
 * Access to the indexed grey-literature archive.
 *
 * The upstream archive <https://github.com/msneloy/IELTS> is what one study
 * group actually collected in 2022: rips of the Cambridge IELTS 1-18
 * listening audio, the audio of five companion courses, the twelve British
 * Council "Sample Academic Reading" task PDFs, and a teacher's folder of
 * marked student writing. This module exposes the machine-readable index
 * built by `scripts/extract_archive.py`.
 *
 * Only derived, non-substitutive metadata and statistics are published: no
 * audio, PDF content, essay text or image is ever redistributed.
 */

import { loadDataset } from '../lib/dataset.js';
import { paginate, matchesQuery, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { ArchiveItem, ArchiveStats, ArchiveVolume } from '../types.js';

/** Shape of `data/archive.json`. */
export type ArchiveIndex = {
  meta: {
    name: string;
    repository: string;
    commit: string | null;
    license: string;
    attribution: string;
    note: string;
  };
  stats: ArchiveStats;
  volumes: ArchiveVolume[];
  items: ArchiveItem[];
};

let cached: ArchiveIndex | undefined;

/** Return the archive index, loading it on first call. */
export function archive(): ArchiveIndex {
  cached ??= loadDataset<ArchiveIndex>('archive.json');
  return cached;
}

/** Archive-level statistics. */
export function archiveStats(): ArchiveStats {
  return archive().stats;
}

/** Archive-level provenance metadata. */
export function archiveMeta(): ArchiveIndex['meta'] {
  return archive().meta;
}

/** Every indexed archive item. */
export function archiveItems(): readonly ArchiveItem[] {
  return archive().items;
}

/** The Cambridge IELTS volume table (the media-archaeology index). */
export function archiveVolumes(): readonly ArchiveVolume[] {
  return archive().volumes;
}

/** One archive item by id, if present. */
export function findArchiveItem(id: string): ArchiveItem | undefined {
  const needle = id.trim().toLowerCase();
  return archiveItems().find((item) => item.id === needle);
}

/** One Cambridge volume row by volume number, if present. */
export function findArchiveVolume(volume: number): ArchiveVolume | undefined {
  return archiveVolumes().find((row) => row.volume === volume);
}

/** Distinct values of an indexed facet. */
export function archiveFacets(facet: 'collection' | 'format' | 'media' | 'skill'): string[] {
  const values = new Set<string>();
  for (const item of archiveItems()) {
    values.add(item[facet]);
  }
  return [...values].sort();
}

/** Question-type ids that occur among the indexed reading samples. */
export function sampleQuestionTypes(): ArchiveItem['questionType'][] {
  const types = new Set<NonNullable<ArchiveItem['questionType']>>();
  for (const item of archiveItems()) {
    if (item.questionType !== null) {
      types.add(item.questionType);
    }
  }
  return [...types].sort();
}

/** Options accepted by {@link searchArchive}. */
export type ArchiveQuery = {
  /** Free-text search over title and path. */
  query?: string;
  /** Restrict to these collections. */
  collections?: string[];
  /** Restrict to these file formats. */
  formats?: string[];
  /** Restrict to these media classes. */
  media?: string[];
  /** Restrict to these skills. */
  skills?: string[];
  /** Restrict to one Cambridge IELTS volume (1-18). */
  volume?: number;
  /** Sort key. */
  sort?: 'title' | 'collection' | 'volume' | 'date' | 'size';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

const ARCHIVE_SORT_KEYS: Record<NonNullable<ArchiveQuery['sort']>, (item: ArchiveItem) => string | number> = {
  title: (item) => item.title.toLowerCase(),
  collection: (item) => item.collection,
  volume: (item) => item.volume ?? 0,
  date: (item) => item.date ?? '',
  size: (item) => item.sizeBytes,
};

/**
 * Search, filter and paginate the archive index.
 *
 * @param options - Search options.
 * @returns A page of matching items.
 */
export function searchArchive(options: ArchiveQuery): Page<ArchiveItem> {
  const query = options.query ?? '';
  const collections = options.collections;
  const formats = options.formats;
  const media = options.media;
  const skills = options.skills;
  const volume = options.volume;
  const filtered = archiveItems().filter((item) => {
    if (query.length > 0 && !matchesQuery([item.title, item.path, item.collection], query)) {
      return false;
    }
    if (collections !== undefined && collections.length > 0 && !collections.includes(item.collection)) {
      return false;
    }
    if (formats !== undefined && formats.length > 0 && !formats.includes(item.format)) {
      return false;
    }
    if (media !== undefined && media.length > 0 && !media.includes(item.media)) {
      return false;
    }
    if (skills !== undefined && skills.length > 0 && !skills.includes(item.skill)) {
      return false;
    }
    if (volume !== undefined && item.volume !== volume) {
      return false;
    }
    return true;
  });
  const sortKey = ARCHIVE_SORT_KEYS[options.sort ?? 'title'];
  const order = options.order ?? 'asc';
  const sorted = sortBy(filtered, sortKey, order);
  return paginate(sorted, options.limit, options.offset);
}
