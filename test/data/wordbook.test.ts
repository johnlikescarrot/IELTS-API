import { describe, expect, it } from 'vitest';

import {
  searchWordbook,
  wordbook,
  wordbookAudit,
  wordbookBooks,
  wordbookItems,
  wordbookMeta,
  wordbookStats,
} from '../../src/data/wordbook.js';

const page = (overrides: Partial<Parameters<typeof searchWordbook>[0]> = {}) =>
  searchWordbook({ limit: 10, offset: 0, ...overrides });

describe('the community-wordbook index', () => {
  it('documents its provenance and its limits', () => {
    const meta = wordbookMeta();
    expect(meta.repository).toBe('https://github.com/Iamdacai/ielts-vocab-system');
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(meta.sourceSha1).toMatch(/^[0-9a-f]{40}$/);
    expect(meta.license).toBe('none published');
    expect(meta.note).toContain('not redistributed');
    expect(meta.note).toContain('cambridge_book');
    expect(meta.sourceUrl).toContain(meta.commit);
    expect(wordbook().meta).toBe(meta);
  });

  it('reports statistics that agree with the items', () => {
    const stats = wordbookStats();
    const items = wordbookItems();
    expect(stats.rows).toBe(items.length);
    expect(stats.uniqueWords).toBe(new Set(items.map((item) => item.word)).size);
    expect(stats.books).toBe(new Set(items.map((item) => item.book)).size);
    expect(stats.completeness.definitions).toBe(stats.rows);
    expect(stats.completeness.phonetic).toBe(0);
    expect(stats.completeness.partOfSpeech).toBe(0);
    expect(stats.completeness.exampleSentences).toBe(0);
    expect(Object.values(stats.frequencyLevels).reduce((sum, count) => sum + count, 0)).toBe(stats.rows);
    expect(stats.longestWords.every((word) => word.length === 17)).toBe(true);
  });

  it('cross-validates against the Cambridge 1-22 list', () => {
    const cross = wordbookStats().crossCambridge;
    const items = wordbookItems();
    expect(cross.shared).toBe(items.filter((item) => item.shared).length);
    expect(cross.volumeAssignmentAgreement).toBe(items.filter((item) => item.volumeAgrees).length);
    expect(cross.shared).toBe(2315);
    expect(cross.volumeAssignmentAgreement).toBe(110);
    expect(cross.shared + cross.onlyWordbook).toBe(wordbookStats().uniqueWords);
    expect(cross.jaccard).toBeGreaterThan(0.3);
    expect(cross.jaccard).toBeLessThan(0.5);
    expect(
      wordbookItems()
        .slice(0, 500)
        .every((item) => item.word >= wordbookItems()[0]!.word),
    ).toBe(true);
  });

  it('carries a per-volume table that sums to the index', () => {
    const books = wordbookBooks();
    expect(books).toHaveLength(18);
    expect(books.reduce((sum, row) => sum + row.wordbookWords, 0)).toBe(wordbookStats().rows);
    expect(books.reduce((sum, row) => sum + row.agreesWithVolume, 0)).toBe(
      wordbookStats().crossCambridge.volumeAssignmentAgreement,
    );
    // Each word carries exactly one claimed volume, so the per-volume shared
    // counts sum to the whole-list shared count.
    expect(books.reduce((sum, row) => sum + row.sharedInBook, 0)).toBe(wordbookStats().crossCambridge.shared);
    const volume7 = books[6]!;
    expect(volume7.book).toBe(7);
    expect(volume7.agreesWithVolume).toBe(0);
    expect(volume7.sharedInBook).toBeGreaterThan(0);
    expect(books.every((row, index) => row.book === index + 1)).toBe(true);
  });

  it('records audit findings with evidence and pinned sources', () => {
    const audit = wordbookAudit();
    expect(audit.findings.length).toBeGreaterThan(8);
    for (const finding of audit.findings) {
      expect(finding.id).toMatch(/^[a-z0-9-]+$/);
      expect(['low', 'medium', 'high']).toContain(finding.severity);
      expect(finding.title.length).toBeGreaterThan(4);
      expect(finding.detail.length).toBeGreaterThan(20);
    }
    const ids = audit.findings.map((finding) => finding.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('unlicensed-distribution');
    expect(audit.sources.schema?.sha1).toMatch(/^[0-9a-f]{40}$/);
    expect(audit.sources.schema?.sourceUrl).toContain('database-schema.sql');
    const collocations = audit.findings.find((finding) => finding.id === 'synthetic-collocations');
    expect(collocations?.evidence.rows).toBe(202);
  });

  it('exposes the full index through wordbook()', () => {
    const index = wordbook();
    expect(index.items).toHaveLength(wordbookStats().rows);
    expect(index.books).toHaveLength(18);
    expect(index.audit.findings.every((finding) => 'evidence' in finding)).toBe(true);
  });
});

describe('searchWordbook', () => {
  it('filters by free text', () => {
    const result = page({ query: 'abandon' });
    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.word)).toEqual(['abandon', 'abandonment']);
  });

  it('filters by claimed volume', () => {
    const result = page({ books: [7], limit: 100, offset: 0 });
    expect(result.items.every((item) => item.book === 7)).toBe(true);
    expect(result.total).toBe(220);
  });

  it('treats an empty book filter as no filter', () => {
    expect(page({ books: [] }).total).toBe(wordbookStats().rows);
  });

  it('filters by cross-list membership and attribution agreement', () => {
    expect(page({ shared: true }).total).toBe(wordbookStats().crossCambridge.shared);
    expect(page({ shared: false }).total).toBe(wordbookStats().crossCambridge.onlyWordbook);
    expect(page({ agrees: true }).total).toBe(wordbookStats().crossCambridge.volumeAssignmentAgreement);
    expect(page({ agrees: false }).total).toBe(
      wordbookStats().rows - wordbookStats().crossCambridge.volumeAssignmentAgreement,
    );
  });

  it('defaults to the stored headword order', () => {
    const first = page({ limit: 3 }).items.map((item) => item.word);
    expect(first).toEqual([...first].sort());
  });

  it('sorts by claimed volume, ascending and descending', () => {
    const ascending = page({ sort: 'word', order: 'asc' }).items;
    expect(ascending[0]?.word).toBe('abandon');
    const descending = page({ sort: 'word', order: 'desc', limit: 1 }).items;
    expect(descending[0]?.word).toBe('zoology');
    const byBook = page({ sort: 'book', limit: 500 }).items;
    expect(byBook[0]?.book).toBeLessThanOrEqual(byBook[499]?.book ?? 0);
    const byBookDescending = page({ sort: 'book', order: 'desc', limit: 1 }).items;
    expect(byBookDescending[0]?.book).toBeGreaterThan(0);
  });

  it('applies the default sort key when only the order is given', () => {
    const descending = page({ order: 'desc', limit: 1 }).items;
    expect(descending[0]?.word).toBe('zoology');
  });

  it('returns no rows for an unseen query', () => {
    expect(page({ query: 'zzzqqqxxx' }).total).toBe(0);
  });

  it('paginates past the end with an empty page', () => {
    const result = page({ offset: 5000 });
    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });
});
