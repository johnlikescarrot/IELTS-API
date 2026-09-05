import { describe, expect, it } from 'vitest';

import {
  DATASET_IDS,
  clearFingerprintCache,
  datasetRecord,
  datasetRecords,
  fingerprintOf,
} from '../../src/data/provenance.js';

describe('fingerprintOf', () => {
  it('computes a SHA-256 digest and size for a shipped dataset', () => {
    clearFingerprintCache();
    const fingerprint = fingerprintOf('vocabulary.json');
    expect(fingerprint.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(fingerprint.sizeBytes).toBeGreaterThan(0);
  });

  it('caches the digest so the file is hashed once', () => {
    clearFingerprintCache();
    const first = fingerprintOf('corpus.json');
    const second = fingerprintOf('corpus.json');
    expect(second).toBe(first);
  });
});

describe('datasetRecords', () => {
  it('documents every dataset exactly once', () => {
    const records = datasetRecords();
    expect(records).toHaveLength(DATASET_IDS.length);
    expect(new Set(records.map((record) => record.id)).size).toBe(records.length);
    expect(records.map((record) => record.id)).toEqual([...DATASET_IDS]);
  });

  it('gives every record a non-empty description, licence, endpoints and record count', () => {
    for (const record of datasetRecords()) {
      expect(record.name.length).toBeGreaterThan(0);
      expect(record.description.length).toBeGreaterThan(0);
      expect(record.license).toBe('CC BY 4.0');
      expect(record.endpoints.length).toBeGreaterThan(0);
      expect(record.records).toBeGreaterThan(0);
      expect(['extracted', 'original', 'compiled']).toContain(record.derivation);
    }
  });

  it('fingerprints file-backed datasets and leaves in-code datasets without a digest', () => {
    const records = datasetRecords();
    const vocabulary = records.find((record) => record.id === 'vocabulary');
    expect(vocabulary?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(vocabulary?.sizeBytes).toBeGreaterThan(0);
    expect(vocabulary?.script).toBe('scripts/extract_vocabulary.py');

    const themes = records.find((record) => record.id === 'themes');
    expect(themes?.sha256).toBeNull();
    expect(themes?.sizeBytes).toBeNull();
    expect(themes?.script).toBeNull();
    expect(themes?.source).toBeNull();
    expect(themes?.sourceUrl).toBeNull();
  });

  it('names an upstream source for every extracted dataset', () => {
    for (const record of datasetRecords().filter((candidate) => candidate.derivation === 'extracted')) {
      expect(record.source).not.toBeNull();
      expect(record.sourceUrl).toContain('https://');
      expect(record.script).not.toBeNull();
      expect(record.sha256).not.toBeNull();
    }
  });
});

describe('datasetRecord', () => {
  it('looks a dataset up by id', () => {
    expect(datasetRecord('question-types')?.derivation).toBe('original');
  });

  it('returns undefined for an unknown id', () => {
    expect(datasetRecord('nope')).toBeUndefined();
  });
});
