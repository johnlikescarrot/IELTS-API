import { describe, expect, it } from 'vitest';

import {
  findSample,
  samples,
  samplesFacets,
  samplesItems,
  samplesMeta,
  samplesStats,
  searchSamples,
} from '../../src/data/samples.js';

import type { SampleItem } from '../../src/types.js';

describe('the learner-writing and sample-task index', () => {
  it('loads and caches the dataset', () => {
    expect(samples()).toBe(samples());
    expect(samplesItems().length).toBe(samplesStats().indexedFiles);
  });

  it('publishes provenance metadata', () => {
    const meta = samplesMeta();
    expect(meta.repository).toBe('https://github.com/msneloy/IELTS');
    expect(meta.license).toBe('CC BY 4.0');
    expect(meta.note).toContain('not redistributed');
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('is internally consistent', () => {
    const stats = samplesStats();
    const items = samplesItems();
    const composition = Object.values(stats.repositoryComposition).reduce((sum, count) => sum + count, 0);
    expect(composition).toBe(stats.filesInRepository);
    expect(Object.values(stats.byCollection).reduce((sum, count) => sum + count, 0)).toBe(stats.indexedFiles);
    expect(Object.values(stats.byKind).reduce((sum, count) => sum + count, 0)).toBe(stats.indexedFiles);
    expect(Object.values(stats.byFormat).reduce((sum, count) => sum + count, 0)).toBe(stats.indexedFiles);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    for (const item of items) {
      expect(item.path.replaceAll(' ', '%20')).toSatisfy((path: string) => item.sourceUrl.endsWith(path));
      expect(item.sha1).toMatch(/^[0-9a-f]{40}$/);
      expect(item.sizeBytes).toBeGreaterThan(0);
    }
  });

  it('indexes 45 of the 557 upstream files', () => {
    const stats = samplesStats();
    expect(stats.filesInRepository).toBe(557);
    expect(stats.indexedFiles).toBe(45);
    expect(stats.coverageRatio).toBe(0.0808);
    expect(stats.repositoryComposition['cambridge-ielts-1-17']).toBe(237);
    expect(stats.byCollection).toEqual({ 'learner-writing': 33, 'reading-sample': 12 });
  });

  it('indexes seven sessions of authentic learner writing', () => {
    const writing = samplesStats().learnerWriting;
    expect(writing.sessions).toBe(7);
    expect(writing.firstSession).toBe('2022-08-05');
    expect(writing.lastSession).toBe('2022-08-27');
    expect(writing.essays).toBe(24);
    expect(writing.task1Reports).toBe(20);
    expect(writing.task2Essays).toBe(4);
    expect(writing.task1Reports + writing.task2Essays).toBe(writing.essays);
    const byAuthor = Object.values(writing.essaysByAuthor).reduce((sum, count) => sum + count, 0);
    expect(byAuthor).toBe(writing.essays);
    const byTask = Object.values(writing.essaysByTask).reduce((sum, count) => sum + count, 0);
    expect(byTask).toBe(writing.essays);
  });

  it('covers eight of the thirteen canonical question types', () => {
    const reading = samplesStats().readingSamples;
    expect(reading.files).toBe(12);
    expect(reading.distinctQuestionTypes).toBe(8);
    expect(reading.taxonomyTypes).toBe(13);
    expect(reading.questionTypes).toEqual([...reading.questionTypes].sort());
    expect(reading.questionTypes).toContain('matching-headings');
    expect(reading.questionTypes).toContain('summary-completion');
  });

  it('classifies the known classroom files correctly', () => {
    const byPath = (path: string): SampleItem => {
      const found = samplesItems().find((item) => item.path === path);
      expect(found, path).toBeDefined();
      return found as SampleItem;
    };
    // The exercise sheet and the prompt set are not essays.
    expect(byPath('Assignments/22.08.05/Solution.md').kind).toBe('exercise');
    expect(byPath('Assignments/22.08.05/Solution.md').skill).toBe('grammar');
    expect(byPath('Assignments/22.08.27/WRITING TASK 2.md').kind).toBe('prompt');
    expect(byPath('Assignments/22.08.27/WRITING TASK 2.md').taskFamily).toBe('task-2');
    // Chart visuals are linked to the task family they illustrate.
    expect(byPath('Assignments/22.08.11/Line_Chart.jpg')).toMatchObject({
      kind: 'task-visual',
      taskFamily: 'academic-line-graph',
      session: '2022-08-11',
    });
    expect(byPath('Assignments/22.08.19/MAP.jpeg').taskFamily).toBe('academic-map');
    expect(byPath('Assignments/22.08.21/NATURAL PROCESS.png').taskFamily).toBe('academic-process-diagram');
    // Session defaults and file-name keywords resolve the task families.
    expect(byPath("Assignments/22.08.11/Riad's Assignment.md")).toMatchObject({
      kind: 'essay',
      taskFamily: 'academic-line-graph',
      author: 'riad',
    });
    expect(byPath('Assignments/22.08.12/free time Assignment.md')).toMatchObject({
      taskFamily: 'academic-bar-chart',
      author: null,
    });
    expect(byPath('Assignments/22.08.15/Mahmuda(table).md').taskFamily).toBe('academic-table');
    expect(byPath('Assignments/22.08.19/pranto, MMP,22.08.19.md').taskFamily).toBe(
      'academic-process-diagram',
    );
    // Content-verified override: the file name names the topic, not the chart type.
    expect(byPath('Assignments/22.08.15/household expenditures by riadul.md')).toMatchObject({
      taskFamily: 'academic-pie-chart',
      author: 'riadul',
    });
    // Extension-damaged names still classify as essays in the right format.
    expect(byPath('Assignments/22.08.11/emon')).toMatchObject({ kind: 'essay', format: 'unknown' });
    expect(byPath('Assignments/22.08.11/pranto.md 22.08.11').format).toBe('md');
  });

  it('links every reading sample to a canonical question type', () => {
    const sample = findSample('academic-reading-samples-academic-reading-sample-task-matching-headings-pdf');
    expect(sample).toMatchObject({
      collection: 'reading-sample',
      kind: 'sample-task',
      skill: 'reading',
      questionType: 'matching-headings',
      format: 'pdf',
      session: null,
      author: null,
    });
    const types = samplesItems()
      .filter((item) => item.collection === 'reading-sample')
      .map((item) => item.questionType);
    expect(types.every((type) => type !== null)).toBe(true);
    expect(findSample('no-such-id')).toBeUndefined();
  });

  it('lists sorted facets without nulls', () => {
    expect(samplesFacets('collection')).toEqual(['learner-writing', 'reading-sample']);
    expect(samplesFacets('kind')).toEqual(['essay', 'exercise', 'prompt', 'sample-task', 'task-visual']);
    expect(samplesFacets('session')).toHaveLength(7);
    expect(samplesFacets('author')).toEqual(['emon', 'mahmuda', 'pranto', 'riad', 'riadul']);
    expect(samplesFacets('taskFamily')).toContain('task-2');
    expect(samplesFacets('questionType')).toContain('true-false-not-given');
    expect(samplesFacets('format')).toContain('jpeg');
    expect(samplesFacets('skill')).toEqual(['grammar', 'reading', 'writing']);
  });
});

describe('searchSamples', () => {
  it('returns everything unfiltered, paginated', () => {
    const page = searchSamples({ limit: 10, offset: 40 });
    expect(page.total).toBe(45);
    expect(page.items).toHaveLength(5);
    expect(page.hasMore).toBe(false);
  });

  it('filters by every facet', () => {
    const base = { limit: 100, offset: 0 };
    expect(searchSamples({ ...base, collections: ['reading-sample'] }).total).toBe(12);
    expect(searchSamples({ ...base, kinds: ['essay'] }).total).toBe(24);
    expect(searchSamples({ ...base, skills: ['grammar'] }).total).toBe(1);
    expect(searchSamples({ ...base, formats: ['pdf'] }).total).toBe(12);
    expect(searchSamples({ ...base, sessions: ['2022-08-19'] }).total).toBe(8);
    expect(searchSamples({ ...base, authors: ['pranto'] }).total).toBe(6);
    expect(searchSamples({ ...base, tasks: ['academic-map'] }).total).toBe(4);
    expect(searchSamples({ ...base, types: ['summary-completion'] }).total).toBe(5);
    // Facet filters combine.
    const combined = searchSamples({ ...base, kinds: ['essay'], tasks: ['task-2'], authors: ['emon'] });
    expect(combined.total).toBe(2);
    expect(combined.items.every((item) => item.kind === 'essay' && item.author === 'emon')).toBe(true);
  });

  it('never matches null facet values through filters', () => {
    const page = searchSamples({ limit: 100, offset: 0, authors: ['emon'] });
    expect(page.items.every((item) => item.author === 'emon')).toBe(true);
  });

  it('searches free text across title, path, task, session and author', () => {
    // Two essays and one chart visual name the task literally ("pranto,NP" does not).
    expect(searchSamples({ limit: 100, offset: 0, query: 'natural process' }).total).toBe(3);
    expect(searchSamples({ limit: 100, offset: 0, query: '2022-08-12' }).total).toBe(3);
    expect(searchSamples({ limit: 100, offset: 0, query: 'matching headings' }).total).toBe(1);
    expect(searchSamples({ limit: 100, offset: 0, query: 'definitely-absent-everywhere' }).total).toBe(0);
  });

  it('sorts by session and size in both directions', () => {
    const bySession = searchSamples({ limit: 100, offset: 0, sort: 'session' });
    const dates = bySession.items.map((item) => item.session ?? '');
    expect(dates).toEqual([...dates].sort());
    const last = bySession.items[bySession.items.length - 1]!;
    expect(last.session).toBe('2022-08-27');

    const bySizeDesc = searchSamples({ limit: 2, offset: 0, sort: 'size', order: 'desc' });
    expect(bySizeDesc.items[0]!.sizeBytes).toBeGreaterThanOrEqual(bySizeDesc.items[1]!.sizeBytes);

    const byTitle = searchSamples({ limit: 100, offset: 0, sort: 'title' });
    const titles = byTitle.items.map((item) => item.title.toLowerCase());
    expect(titles).toEqual([...titles].sort());
  });
});
