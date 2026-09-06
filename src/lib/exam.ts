/**
 * Deterministic mock-exam assembly.
 *
 * {@link buildExamPaper} composes every bank the API already publishes into a
 * complete, reproducible mock-exam paper: the Listening paper draws a full
 * listening test from the practice-test index and an official Cambridge audio
 * set from the archive index, the Reading paper draws a full academic reading
 * test and classifies its difficulty against the corpus groups, the Writing
 * paper pairs a Task 1 family with a Task 2 prompt, and the Speaking paper
 * assembles the three parts from the speaking bank. The official test format
 * (sections, timings, word minimums, weighting) comes from
 * {@link ../data/exams.js} constants.
 *
 * A paper is a pure function of its module and canonical seed: identical
 * inputs produce byte-identical papers on every replica, and the addressable
 * identifier encodes both, so any paper can be re-derived from its id alone.
 *
 * {@link buildVocabularyDrill} applies the same contract to self-testing: it
 * turns the Cambridge headword list into multiple-choice items whose
 * distractors are drawn, deterministically, from other published definitions.
 */

import {
  COMPUTER_BASED_NOTE,
  LISTENING_SECTIONS,
  SPEAKING_PARTS,
  SPEAKING_SCHEDULE_NOTE,
  WRITING_WEIGHTING,
  WRITTEN_SCHEDULE,
  WRITTEN_TOTAL_MINUTES,
  paperId,
} from '../data/exams.js';
import { EXAM_THEMES } from '../data/themes.js';
import { TASK_TYPES } from '../data/tasks.js';
import { SPEAKING_TOPICS, WRITING_TOPICS } from '../data/topics.js';
import { archiveItems, archiveVolumes } from '../data/archive.js';
import { practiceItems } from '../data/practiceTests.js';
import { allEntries } from '../data/vocabulary.js';
import { nearestCorpusGroup } from './analysis.js';
import { badRequest } from './errors.js';
import { hashString, mulberry32, seededIndices } from './rng.js';

import type {
  ArchiveItem,
  ArchiveVolume,
  ExamAudioRef,
  ExamDifficulty,
  ExamModule,
  ExamPaper,
  ExamTestRef,
  ExamTheme,
  ListeningPaper,
  PartOfSpeech,
  PracticeItem,
  ReadingPaper,
  SpeakingPaper,
  SpeakingTopic,
  TaskType,
  VocabularyDrill,
  VocabularyDrillAnswer,
  VocabularyDrillItem,
  VocabularyEntry,
  WritingPaper,
  WritingTopic,
} from '../types.js';

/** Datasets a paper is assembled from; injectable so tests can exercise edge cases. */
export interface ExamPools {
  /** Full listening tests from the practice-test index. */
  listeningTests?: readonly PracticeItem[];
  /** Full academic reading tests from the practice-test index. */
  readingTests?: readonly PracticeItem[];
  /** Writing Task 1 task families. */
  taskTypes?: readonly TaskType[];
  /** Writing Task 2 prompts. */
  writingTopics?: readonly WritingTopic[];
  /** Speaking bank, all parts. */
  speakingTopics?: readonly SpeakingTopic[];
  /** Recurring exam themes. */
  themes?: readonly ExamTheme[];
  /** Archive volumes whose listening tests are recoverable from the file names. */
  audioVolumes?: readonly ArchiveVolume[];
  /** Cambridge audio tracks from the archive index. */
  audioItems?: readonly ArchiveItem[];
}

/** Inputs accepted by {@link buildExamPaper}; values are pre-validated. */
export interface ExamPaperOptions {
  /** Test module. */
  module: ExamModule;
  /** Canonical seed (eight lowercase hexadecimal digits). */
  seed: string;
  /** Datasets to assemble from; defaults to the published ones. */
  pools?: ExamPools;
}

/** Reference to an indexed practice test, as published inside a paper. */
function testRef(item: PracticeItem): ExamTestRef {
  return {
    id: item.id,
    title: item.title,
    questions: item.questions,
    passages: item.passages,
    questionTypes: [...item.questionTypes],
    typeCounts: { ...item.typeCounts },
    readability: item.readability === null ? null : { ...item.readability },
    sourceUrl: item.sourceUrl,
    link: `/v1/tests/${item.id}`,
  };
}

/**
 * Pick one index from a population, deterministically.
 *
 * The assembly pools are guaranteed non-empty by the dataset tests, so the
 * pick is always defined; the cast only satisfies `noUncheckedIndexedAccess`.
 *
 * @param seed - Seed string, namespaced by the caller.
 * @param population - Size of the population (must be positive).
 */
function pick(seed: string, population: number): number {
  const [index] = seededIndices(seed, population, 1);
  return index as number;
}

/** Assemble the Listening paper. */
function listeningPaper(seed: string, pools: Required<ExamPools>): ListeningPaper {
  const test = pools.listeningTests[pick(`${seed}:listening`, pools.listeningTests.length)] as PracticeItem;

  const volume = pools.audioVolumes[pick(`${seed}:audio`, pools.audioVolumes.length)];
  let officialAudio: ExamAudioRef | null = null;
  if (volume !== undefined && volume.testNumbers !== null) {
    const testNumber = volume.testNumbers[pick(`${seed}:audio-test`, volume.testNumbers.length)];
    const tracks = pools.audioItems
      .filter((item) => item.volume === volume.volume && item.test === testNumber)
      .map((item) => ({ id: item.id, title: item.title }));
    if (testNumber !== undefined && tracks.length > 0) {
      officialAudio = {
        volume: volume.volume,
        test: testNumber,
        namingScheme: volume.namingScheme,
        media: volume.media,
        complete: volume.complete,
        tracks,
        link: `/v1/archive/volumes/${volume.volume}`,
      };
    }
  }

  return {
    sections: 4,
    questions: 40,
    audioMinutes: 30,
    transferMinutes: 10,
    sectionPlan: LISTENING_SECTIONS.map((section) => ({ ...section })),
    test: testRef(test),
    officialAudio,
  };
}

/** Assemble the Reading paper. */
function readingPaper(seed: string, module: ExamModule, pools: Required<ExamPools>): ReadingPaper {
  const practice =
    module === 'academic'
      ? '/v1/tests/items?collection=reading-full-test'
      : '/v1/tests/items?collection=graded-reading';
  if (module === 'general-training') {
    return {
      passages: 3,
      questions: 40,
      minutes: 60,
      test: null,
      note: 'The indexed full reading tests are Academic papers. The General Training paper uses everyday and work-related texts; the graded-reading collection is the closest indexed practice material.',
      difficulty: null,
      practice,
    };
  }

  const test = pools.readingTests[pick(`${seed}:reading`, pools.readingTests.length)] as PracticeItem;
  let difficulty: ExamDifficulty | null = null;
  if (test.readability !== null) {
    const context = nearestCorpusGroup(test.readability.fleschReadingEase);
    difficulty = {
      fleschReadingEase: test.readability.fleschReadingEase,
      fleschKincaidGrade: test.readability.fleschKincaidGrade,
      nearestGroup: context.group,
      groupMeanReadingEase: context.meanReadingEase,
    };
  }
  return {
    passages: 3,
    questions: 40,
    minutes: 60,
    test: testRef(test),
    note: null,
    difficulty,
    practice,
  };
}

/** Assemble the Writing paper. */
function writingPaper(seed: string, module: ExamModule, pools: Required<ExamPools>): WritingPaper {
  const moduleFamilies = pools.taskTypes.filter((family) => family.module === module);
  const family = moduleFamilies[pick(`${seed}:task1`, moduleFamilies.length)] as TaskType;
  const topic = pools.writingTopics[pick(`${seed}:task2`, pools.writingTopics.length)] as WritingTopic;

  return {
    minutes: 60,
    tasks: [
      {
        task: 1,
        family: family.name,
        prompt: family.description,
        suggestedMinutes: family.suggestedMinutes,
        minimumWords: 150,
        link: `/v1/tasks/writing?module=${module}`,
        guidance: null,
      },
      {
        task: 2,
        family: topic.questionType,
        prompt: topic.prompt,
        suggestedMinutes: 40,
        minimumWords: 250,
        link: `/v1/topics/writing?category=${encodeURIComponent(topic.category)}`,
        guidance: `/v1/frameworks?type=${topic.questionType}`,
      },
    ],
    weighting: WRITING_WEIGHTING,
    descriptors: '/v1/bands/descriptors?skill=writing',
  };
}

/** Assemble the Speaking paper. */
function speakingPaper(seed: string, pools: Required<ExamPools>): SpeakingPaper {
  const part1 = pools.speakingTopics.filter((topic) => topic.part === 1);
  const part2 = pools.speakingTopics.filter((topic) => topic.part === 2);
  const part3 = pools.speakingTopics.filter((topic) => topic.part === 3);
  const part1Picks = seededIndices(`${seed}:part1`, part1.length, 3) as [number, number, number];
  const cueCard = part2[pick(`${seed}:part2`, part2.length)] as SpeakingTopic;
  const discussion = part3[pick(`${seed}:part3`, part3.length)] as SpeakingTopic;
  // The speaking bank guarantees a lead prompt on every Part 2 cue card.
  const leadPrompt = cueCard.questions[0] as string;

  return {
    minutes: '11-14',
    part1: {
      sets: part1Picks
        .map((index) => part1[index] as SpeakingTopic)
        .map((topic) => ({ id: topic.id, topic: topic.topic, questions: [...topic.questions] })),
      minutes: SPEAKING_PARTS[0].minutes,
    },
    part2: {
      id: cueCard.id,
      topic: cueCard.topic,
      prompt: leadPrompt,
      prompts: cueCard.questions.slice(1),
      preparationMinutes: 1,
      speakingMinutes: '1-2',
      minutes: SPEAKING_PARTS[1].minutes,
    },
    part3: {
      id: discussion.id,
      topic: discussion.topic,
      questions: [...discussion.questions],
      minutes: SPEAKING_PARTS[2].minutes,
    },
    descriptors: '/v1/bands/descriptors?skill=speaking',
  };
}

/**
 * Assemble a deterministic mock-exam paper.
 *
 * @param options - Module and canonical seed, plus optional pools.
 * @returns The paper, addressable by its identifier.
 */
export function buildExamPaper(options: ExamPaperOptions): ExamPaper {
  const { module, seed } = options;
  const pools: Required<ExamPools> = {
    listeningTests:
      options.pools?.listeningTests ??
      practiceItems().filter((item) => item.collection === 'listening-full-test'),
    readingTests:
      options.pools?.readingTests ??
      practiceItems().filter((item) => item.collection === 'reading-full-test'),
    taskTypes: options.pools?.taskTypes ?? TASK_TYPES,
    writingTopics: options.pools?.writingTopics ?? WRITING_TOPICS,
    speakingTopics: options.pools?.speakingTopics ?? SPEAKING_TOPICS,
    themes: options.pools?.themes ?? EXAM_THEMES,
    audioVolumes:
      options.pools?.audioVolumes ?? archiveVolumes().filter((volume) => volume.testNumbers !== null),
    audioItems:
      options.pools?.audioItems ?? archiveItems().filter((item) => item.collection === 'cambridge-audio'),
  };

  const theme = pools.themes[pick(`${seed}:theme`, pools.themes.length)] as ExamTheme;
  const readingScale = module === 'academic' ? 'academic-reading-raw' : 'general-training-reading-raw';

  return {
    id: paperId(module, seed),
    module,
    seed,
    pools: {
      listeningTests: pools.listeningTests.length,
      readingTests: pools.readingTests.length,
      taskTypes: pools.taskTypes.filter((family) => family.module === module).length,
      writingTopics: pools.writingTopics.length,
      part1Sets: pools.speakingTopics.filter((topic) => topic.part === 1).length,
      part2CueCards: pools.speakingTopics.filter((topic) => topic.part === 2).length,
      part3Topics: pools.speakingTopics.filter((topic) => topic.part === 3).length,
      themes: pools.themes.length,
      audioVolumes: pools.audioVolumes.length,
    },
    listening: listeningPaper(seed, pools),
    reading: readingPaper(seed, module, pools),
    writing: writingPaper(seed, module, pools),
    speaking: speakingPaper(seed, pools),
    timing: {
      writtenTotalMinutes: WRITTEN_TOTAL_MINUTES,
      schedule: WRITTEN_SCHEDULE.map((row) => ({ ...row })),
      computerBased: COMPUTER_BASED_NOTE,
      speaking: SPEAKING_SCHEDULE_NOTE,
    },
    theme: {
      id: theme.id,
      group: theme.group,
      name: theme.name,
      keywords: [...theme.keywords],
      link: '/v1/topics/themes',
    },
    marking: {
      listening: `/v1/scores/interpret?scale=listening-raw&score=30`,
      reading: `/v1/scores/interpret?scale=${readingScale}&score=30`,
      overall: '/v1/scores/overall?listening=6.5&reading=6&writing=5.5&speaking=6',
    },
  };
}

/** Option letters of a drill item. */
const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

/** Inputs accepted by {@link buildVocabularyDrill}; values are pre-validated. */
export interface VocabularyDrillOptions {
  /** Canonical seed (eight lowercase hexadecimal digits). */
  seed: string;
  /** Number of items (1-50). */
  size: number;
  /** Restrict the tested words to one Cambridge IELTS volume, when given. */
  volume?: number | undefined;
  /** Restrict the tested words to one part of speech, when given. */
  pos?: PartOfSpeech | undefined;
  /** Whether to include the answer key in the response. */
  includeKey: boolean;
  /** Headword list to drill; defaults to the Cambridge IELTS vocabulary. */
  entries?: readonly VocabularyEntry[] | undefined;
}

/**
 * Build a deterministic multiple-choice vocabulary drill.
 *
 * Every item tests one headword against four published definitions: the
 * headword's own and three distractors drawn from other headwords of the same
 * part of speech when the list provides enough, from any part of speech
 * otherwise.
 *
 * @param options - Seed, size, optional filters and headword list.
 * @returns The drill, with the answer key unless hidden.
 */
export function buildVocabularyDrill(options: VocabularyDrillOptions): VocabularyDrill {
  const { seed, size, volume, pos, includeKey } = options;

  // One entry per distinct definition, so distractors can never repeat a text.
  const seen = new Set<string>();
  const unique: VocabularyEntry[] = [];
  for (const entry of options.entries ?? allEntries()) {
    const definition = entry.definition;
    if (definition !== null && !seen.has(definition)) {
      seen.add(definition);
      unique.push(entry);
    }
  }

  const pool = unique.filter(
    (entry) =>
      (volume === undefined || entry.volumes.includes(volume)) &&
      (pos === undefined || entry.partOfSpeech === pos),
  );
  if (pool.length < size) {
    throw badRequest(
      `Only ${pool.length} headwords match the filters; a drill of ${size} items cannot be built.`,
      { matching: String(pool.length), size: String(size) },
    );
  }

  const picks = seededIndices(`${seed}:words`, pool.length, size);
  const items: VocabularyDrillItem[] = [];
  const key: VocabularyDrillAnswer[] = [];

  picks.forEach((poolIndex, itemIndex) => {
    const entry = pool[poolIndex] as VocabularyEntry;
    const samePos = unique.filter(
      (candidate) => candidate.id !== entry.id && candidate.partOfSpeech === entry.partOfSpeech,
    );
    const distractorPool =
      samePos.length >= 3 ? samePos : unique.filter((candidate) => candidate.id !== entry.id);
    if (distractorPool.length < 3) {
      throw badRequest(`Not enough published definitions to build distractors for "${entry.word}".`, {
        word: entry.word,
      });
    }
    const distractorIndices = seededIndices(`${seed}:d${itemIndex}`, distractorPool.length, 3);
    const distractors = distractorIndices.map(
      (index) => (distractorPool[index] as VocabularyEntry).definition as string,
    );
    const slot = Math.floor(mulberry32(hashString(`${seed}:s${itemIndex}`))() * 4);

    const texts: string[] = [];
    let distractorPosition = 0;
    for (let position = 0; position < 4; position += 1) {
      if (position === slot) {
        texts.push(entry.definition as string);
      } else {
        texts.push(distractors[distractorPosition] as string);
        distractorPosition += 1;
      }
    }

    const id = `d${String(itemIndex + 1).padStart(2, '0')}`;
    items.push({
      id,
      word: entry.word,
      phonetic: entry.phonetic,
      partOfSpeech: entry.partOfSpeech,
      options: texts.map((text, position) => ({ letter: OPTION_LETTERS[position] as string, text })),
    });
    key.push({
      id,
      word: entry.word,
      answer: OPTION_LETTERS[slot] as string,
      definition: entry.definition as string,
      link: `/v1/vocabulary/${encodeURIComponent(entry.word)}`,
    });
  });

  return {
    id: `drill-${seed}`,
    seed,
    size,
    items,
    key: includeKey ? key : null,
  };
}
