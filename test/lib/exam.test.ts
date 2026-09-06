import { describe, expect, it } from 'vitest';

import { buildExamPaper, buildVocabularyDrill } from '../../src/lib/exam.js';
import { canonicalSeed } from '../../src/data/exams.js';

import type {
  ArchiveItem,
  ArchiveVolume,
  ExamPaper,
  PracticeItem,
  SpeakingTopic,
  TaskType,
  VocabularyEntry,
  WritingTopic,
} from '../../src/types.js';

/** Minimal valid practice-test row. */
function practiceItem(overrides: Partial<PracticeItem> = {}): PracticeItem {
  return {
    id: 'rft-001',
    collection: 'reading-full-test',
    skill: 'reading',
    number: 1,
    title: 'A synthetic reading test',
    level: null,
    sections: 3,
    passages: 3,
    questions: 40,
    questionTypes: ['multiple-choice', 'sentence-completion'],
    typeCounts: { 'multiple-choice': 20, 'sentence-completion': 20 },
    vocabularyCount: 0,
    timeLimitSeconds: null,
    readability: {
      words: 900,
      sentences: 45,
      distinctWords: 420,
      avgSentenceLength: 20,
      avgSyllablesPerWord: 1.6,
      avgWordLength: 5.1,
      typeTokenRatio: 0.47,
      fleschReadingEase: 44.2,
      fleschKincaidGrade: 11.5,
    },
    assets: { audio: false, images: 0, strategies: false, documents: false },
    sourcePath: 'synthetic/test.json',
    sha1: 'a'.repeat(40),
    sizeBytes: 1000,
    sourceUrl: 'https://example.org/test.json',
    ...overrides,
  };
}

/** Minimal valid archive volume row. */
function archiveVolume(overrides: Partial<ArchiveVolume> = {}): ArchiveVolume {
  return {
    volume: 12,
    folder: 'CAMBRIDGE 12',
    namingScheme: 'test-section',
    media: 'download',
    audioTracks: 16,
    bytes: 100,
    testsInferred: 4,
    testNumbers: [1, 2, 3, 4],
    complete: true,
    watermarked: false,
    ...overrides,
  };
}

/** Minimal valid archive item row. */
function archiveItem(overrides: Partial<ArchiveItem> = {}): ArchiveItem {
  return {
    id: 'track-1',
    path: 'CAMBRIDGE 12/12-1-1.mp3',
    collection: 'cambridge-audio',
    title: 'Cambridge IELTS 12 audio, test 1, section 1',
    skill: 'listening',
    format: 'mp3',
    media: 'audio',
    sizeBytes: 100,
    sha1: 'b'.repeat(40),
    sourceUrl: 'https://example.org/12-1-1.mp3',
    volume: 12,
    test: 1,
    section: 1,
    questionType: null,
    hasAnswerKey: false,
    readingPart: null,
    topic: null,
    pages: null,
    readability: null,
    learner: null,
    role: null,
    taskType: null,
    date: null,
    ...overrides,
  };
}

/** Minimal valid writing task family. */
function taskType(overrides: Partial<TaskType> = {}): TaskType {
  return {
    id: 'academic-line-graph',
    module: 'academic',
    name: 'Line graph',
    description: 'Describe trends over time.',
    structure: ['Paraphrase.', 'Overview.', 'Detail.'],
    tips: ['Use trend language.'],
    suggestedMinutes: 20,
    ...overrides,
  };
}

/** Minimal valid writing topic. */
function writingTopic(overrides: Partial<WritingTopic> = {}): WritingTopic {
  return {
    id: 'wt-001',
    category: 'education',
    questionType: 'opinion',
    prompt: 'Some people think that languages should be compulsory.',
    positions: ['For.', 'Against.'],
    ...overrides,
  };
}

/** Minimal valid speaking topic. */
function speakingTopic(part: 1 | 2 | 3, index: number): SpeakingTopic {
  const questions =
    part === 2
      ? ['Describe a place you know well.', 'You should say:', 'where it is', 'why it matters']
      : [`Question ${index + 1}a`, `Question ${index + 1}b`];
  return {
    id: `sp${part}-${String(index + 1).padStart(3, '0')}`,
    part,
    topic: `Topic ${index + 1}`,
    questions,
  };
}

/** Minimal valid vocabulary entry. */
function entry(
  id: string,
  word: string,
  definition: string,
  partOfSpeech: VocabularyEntry['partOfSpeech'] = 'noun',
  volumes: number[] = [1],
): VocabularyEntry {
  return {
    id,
    word,
    phonetic: null,
    partOfSpeech,
    definition,
    senses: [{ pos: partOfSpeech, text: definition }],
    morphemes: null,
    volumes,
  };
}

/** A tiny but complete pool set, so injected runs exercise real code paths. */
function syntheticPools() {
  return {
    listeningTests: [practiceItem({ id: 'lft-001', skill: 'listening', collection: 'listening-full-test' })],
    readingTests: [practiceItem()],
    taskTypes: [
      taskType(),
      taskType({ id: 'general-formal-letter', module: 'general-training', name: 'Formal letter' }),
    ],
    writingTopics: [writingTopic()],
    speakingTopics: [
      ...Array.from({ length: 3 }, (_unused, index) => speakingTopic(1, index)),
      speakingTopic(2, 0),
      speakingTopic(3, 0),
    ],
    themes: [
      {
        id: 'th-01',
        group: 'Society',
        name: 'Education',
        keywords: ['school'],
        skills: ['writing' as const],
      },
    ],
    audioVolumes: [archiveVolume()],
    audioItems: [archiveItem()],
  };
}

const SEED = canonicalSeed('synthetic');

describe('buildExamPaper', () => {
  it('assembles a complete academic paper from the published datasets', () => {
    const paper = buildExamPaper({ module: 'academic', seed: canonicalSeed('demo') });
    expect(paper.id).toBe(`mock-academic-${canonicalSeed('demo')}`);
    expect(paper.pools).toEqual({
      listeningTests: 201,
      readingTests: 269,
      taskTypes: 7,
      writingTopics: 111,
      part1Sets: 26,
      part2CueCards: 30,
      part3Topics: 24,
      themes: 50,
      audioVolumes: 7,
    });
    expect(paper.listening.sections).toBe(4);
    expect(paper.listening.questions).toBe(40);
    expect(paper.listening.test.id).toMatch(/^lft-\d+$/);
    expect(paper.listening.test.link).toBe(`/v1/tests/${paper.listening.test.id}`);
    expect(paper.listening.officialAudio?.link).toMatch(/^\/v1\/archive\/volumes\/\d+$/);
    expect(paper.listening.sectionPlan).toHaveLength(4);
    expect(paper.reading.test?.id).toMatch(/^rft-\d+$/);
    expect(paper.reading.difficulty?.nearestGroup).toBe('reading-full-test');
    expect(paper.writing.tasks).toHaveLength(2);
    expect(paper.speaking.part1.sets).toHaveLength(3);
    expect(paper.timing.writtenTotalMinutes).toBe(160);
    expect(paper.theme.id).toMatch(/^th-\d+$/);
    expect(paper.marking.listening).toContain('listening-raw');
    expect(paper.marking.reading).toContain('academic-reading-raw');
  });

  it('is a pure function of its module and seed', () => {
    const first = buildExamPaper({ module: 'academic', seed: SEED });
    const second = buildExamPaper({ module: 'academic', seed: SEED });
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));

    const other = buildExamPaper({ module: 'academic', seed: canonicalSeed('other') });
    expect(other.id).not.toBe(first.id);
  });

  it('assembles the general-training paper with a letter task and an honest reading note', () => {
    const paper = buildExamPaper({ module: 'general-training', seed: SEED, pools: syntheticPools() });
    expect(paper.reading.test).toBeNull();
    expect(paper.reading.note).toContain('General Training');
    expect(paper.reading.difficulty).toBeNull();
    expect(paper.reading.practice).toContain('graded-reading');
    expect(paper.writing.tasks[0].family).toBe('Formal letter');
    expect(paper.marking.reading).toContain('general-training-reading-raw');
  });

  it('classifies reading difficulty against the corpus groups', () => {
    const pools = syntheticPools();
    const paper = buildExamPaper({ module: 'academic', seed: SEED, pools });
    expect(paper.reading.difficulty).toEqual({
      fleschReadingEase: 44.2,
      fleschKincaidGrade: 11.5,
      nearestGroup: 'reading-full-test',
      groupMeanReadingEase: 43.49,
    });
  });

  it('reports no difficulty when the drawn reading test is unmeasured', () => {
    const pools = syntheticPools();
    pools.readingTests = [practiceItem({ readability: null })];
    const paper = buildExamPaper({ module: 'academic', seed: SEED, pools });
    expect(paper.reading.test).not.toBeNull();
    expect(paper.reading.difficulty).toBeNull();
  });

  it('omits the official audio pointer when no volume carries test numbers', () => {
    const pools = syntheticPools();
    pools.audioVolumes = [archiveVolume({ testNumbers: null, testsInferred: null })];
    const paper = buildExamPaper({ module: 'academic', seed: SEED, pools });
    expect(paper.listening.officialAudio).toBeNull();
  });

  it('omits the official audio pointer when the volume holds no tests', () => {
    const pools = syntheticPools();
    pools.audioVolumes = [archiveVolume({ testNumbers: [], testsInferred: 0 })];
    const paper = buildExamPaper({ module: 'academic', seed: SEED, pools });
    expect(paper.listening.officialAudio).toBeNull();
  });

  it('omits the official audio pointer when no tracks match the drawn test', () => {
    const pools = syntheticPools();
    pools.audioItems = [archiveItem({ volume: 9, test: 2 })];
    const paper = buildExamPaper({ module: 'academic', seed: SEED, pools });
    expect(paper.listening.officialAudio).toBeNull();
  });

  it('references the official audio set that carries the drawn test', () => {
    const pools = syntheticPools();
    pools.audioVolumes = [archiveVolume({ testNumbers: [7], testsInferred: 1 })];
    pools.audioItems = [
      archiveItem({ id: 'track-a', title: 'Test 7 section 1', test: 7 }),
      archiveItem({ id: 'track-b', title: 'Test 7 section 2', test: 7, section: 2 }),
    ];
    const paper: ExamPaper = buildExamPaper({ module: 'academic', seed: SEED, pools });
    expect(paper.listening.officialAudio).toEqual({
      volume: 12,
      test: 7,
      namingScheme: 'test-section',
      media: 'download',
      complete: true,
      tracks: [
        { id: 'track-a', title: 'Test 7 section 1' },
        { id: 'track-b', title: 'Test 7 section 2' },
      ],
      link: '/v1/archive/volumes/12',
    });
  });

  it('assembles the speaking paper from the three parts of the bank', () => {
    const pools = syntheticPools();
    const paper = buildExamPaper({ module: 'academic', seed: SEED, pools });
    expect(paper.speaking.minutes).toBe('11-14');
    expect(paper.speaking.part1.sets.map((set) => set.id)).toEqual(['sp1-001', 'sp1-002', 'sp1-003']);
    expect(paper.speaking.part1.sets[0]?.questions).toHaveLength(2);
    expect(paper.speaking.part2.prompt).toBe('Describe a place you know well.');
    expect(paper.speaking.part2.prompts).toEqual(['You should say:', 'where it is', 'why it matters']);
    expect(paper.speaking.part2.preparationMinutes).toBe(1);
    expect(paper.speaking.part3.questions).toHaveLength(2);
    expect(paper.speaking.descriptors).toBe('/v1/bands/descriptors?skill=speaking');
  });

  it('plans the writing paper with the official minimums and weighting', () => {
    const pools = syntheticPools();
    const paper = buildExamPaper({ module: 'academic', seed: SEED, pools });
    const [task1, task2] = paper.writing.tasks;
    expect(task1.task).toBe(1);
    expect(task1.minimumWords).toBe(150);
    expect(task1.suggestedMinutes).toBe(20);
    expect(task1.link).toBe('/v1/tasks/writing?module=academic');
    expect(task2.task).toBe(2);
    expect(task2.minimumWords).toBe(250);
    expect(task2.suggestedMinutes).toBe(40);
    expect(task2.guidance).toBe('/v1/frameworks?type=opinion');
    expect(paper.writing.weighting).toContain('twice');
    expect(paper.writing.descriptors).toBe('/v1/bands/descriptors?skill=writing');
  });

  it('publishes the timing plan of the written papers', () => {
    const paper = buildExamPaper({ module: 'academic', seed: SEED, pools: syntheticPools() });
    expect(paper.timing.schedule.map((row) => row.at)).toEqual([0, 40, 100]);
    expect(paper.timing.schedule.map((row) => row.paper)).toEqual(['listening', 'reading', 'writing']);
    expect(paper.timing.computerBased).toContain('computer-based');
    expect(paper.timing.speaking).toContain('seven days');
  });

  it('echoes the sizes of the pools the paper was drawn from', () => {
    const paper = buildExamPaper({ module: 'general-training', seed: SEED, pools: syntheticPools() });
    expect(paper.pools).toEqual({
      listeningTests: 1,
      readingTests: 1,
      taskTypes: 1,
      writingTopics: 1,
      part1Sets: 3,
      part2CueCards: 1,
      part3Topics: 1,
      themes: 1,
      audioVolumes: 1,
    });
  });
});

describe('buildVocabularyDrill', () => {
  it('builds a drill whose key matches its own items', () => {
    const drill = buildVocabularyDrill({ seed: SEED, size: 5, includeKey: true });
    expect(drill.id).toBe(`drill-${SEED}`);
    expect(drill.items).toHaveLength(5);
    expect(drill.key).toHaveLength(5);
    for (const answer of drill.key ?? []) {
      const item = drill.items.find((candidate) => candidate.id === answer.id);
      expect(item).toBeDefined();
      const option = item?.options.find((candidate) => candidate.letter === answer.answer);
      expect(option?.text).toBe(answer.definition);
    }
  });

  it('offers four distinct options per item, lettered A to D', () => {
    const drill = buildVocabularyDrill({ seed: SEED, size: 10, includeKey: false });
    expect(drill.key).toBeNull();
    for (const item of drill.items) {
      expect(item.options.map((option) => option.letter)).toEqual(['A', 'B', 'C', 'D']);
      expect(new Set(item.options.map((option) => option.text)).size).toBe(4);
    }
  });

  it('is a pure function of its seed', () => {
    const first = buildVocabularyDrill({ seed: SEED, size: 3, includeKey: true });
    const second = buildVocabularyDrill({ seed: SEED, size: 3, includeKey: true });
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    const other = buildVocabularyDrill({ seed: canonicalSeed('other'), size: 3, includeKey: true });
    expect(JSON.stringify(other)).not.toBe(JSON.stringify(first));
  });

  it('restricts the tested words to a volume and a part of speech', () => {
    const drill = buildVocabularyDrill({ seed: SEED, size: 8, volume: 5, pos: 'verb', includeKey: true });
    for (const item of drill.items) {
      expect(item.partOfSpeech).toBe('verb');
    }
  });

  it('prefers same-part-of-speech distractors but falls back to the whole list', () => {
    const entries = [
      entry('w1', 'noun-one', 'definition one', 'noun'),
      entry('w2', 'noun-two', 'definition two', 'noun'),
      entry('w3', 'verb-one', 'definition three', 'verb'),
      entry('w4', 'verb-two', 'definition four', 'verb'),
      entry('w5', 'verb-three', 'definition five', 'verb'),
      entry('w6', 'verb-four', 'definition six', 'verb'),
    ];
    const drill = buildVocabularyDrill({ seed: SEED, size: 6, includeKey: true, entries });
    expect(drill.items).toHaveLength(6);
    // Every entry is drilled once, so the lone noun item must have fallen back
    // to verb distractors, while the verb items used same-part-of-speech ones.
    const nounItem = drill.items.find((item) => item.word === 'noun-one');
    expect(nounItem?.options.map((option) => option.text)).toContain('definition three');
  });

  it('uses each published definition at most once', () => {
    const entries = [
      entry('w1', 'first', 'shared definition'),
      entry('w2', 'second', 'shared definition'),
      entry('w3', 'third', 'definition three'),
      entry('w4', 'fourth', 'definition four'),
      entry('w5', 'fifth', 'definition five'),
      entry('w6', 'sixth', 'definition six'),
    ];
    const drill = buildVocabularyDrill({ seed: SEED, size: 5, includeKey: true, entries });
    expect(drill.items).toHaveLength(5);
    expect(drill.items.some((item) => item.word === 'second')).toBe(false);
    for (const item of drill.items) {
      expect(new Set(item.options.map((option) => option.text)).size).toBe(4);
    }
  });

  it('refuses to build a drill larger than the matching pool', () => {
    const entries = [entry('w1', 'one', 'definition one'), entry('w2', 'two', 'definition two')];
    expect(() => buildVocabularyDrill({ seed: SEED, size: 3, includeKey: true, entries })).toThrowError(
      /cannot be built/,
    );
  });

  it('refuses to build distractors from a list that is too small', () => {
    const entries = [entry('w1', 'one', 'definition one'), entry('w2', 'two', 'definition two')];
    expect(() => buildVocabularyDrill({ seed: SEED, size: 1, includeKey: true, entries })).toThrowError(
      /distractors/,
    );
  });
});
