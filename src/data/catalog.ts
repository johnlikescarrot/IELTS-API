/**
 * Open practice content catalog.
 *
 * The community repository [`UPGRADE-YOUR-IELTS-SKILLS`](https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS)
 * publishes one of the largest openly downloadable IELTS practice estates:
 * 102 basic listening lessons (audio + interactive page), 204 full listening
 * tests, 1,232 CEFR-graded reading lessons (198 A1-A2, 374 B1-B2, 660 C1-C2)
 * and 315 full reading tests, each test shipping a machine-readable
 * `Test_N.json` in a stable schema plus per-question `strategies.json` files.
 *
 * The test passages themselves are third-party copyright material, so this
 * catalog publishes **only structural metadata**: collection sizes, the exact
 * per-entry file layout, availability ranges verified against the upstream git
 * tree (several artifact types have gaps: missing audio, missing JSON,
 * strategies only for tests 1-20, and reading test 105 absent entirely), and
 * resolved URLs to the upstream files. Practice apps can replace their
 * hard-coded relative paths with `/v1/catalog/:collection/entries/:n` and gain
 * validation, availability data and one stable indirection point.
 */

import type { CatalogArtifactSpec, CatalogCollection, CatalogEntry, CatalogEntryArtifact } from '../types.js';

/** Upstream repository used by every collection. */
export const CATALOG_UPSTREAM_REPOSITORY = 'https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS';

/** Raw content host prefix for the upstream default branch. */
export const CATALOG_RAW_BASE =
  'https://raw.githubusercontent.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/main/';

/** Legal and practical note shipped with every catalog response. */
export const CATALOG_LICENSE_NOTE =
  'Metadata only: passages, audio and questions are third-party materials hosted upstream and are not redistributed by this API.';

/** Indexed collections. */
export const CATALOG_COLLECTIONS: readonly CatalogCollection[] = [
  {
    id: 'listening-102-basic',
    skill: 'listening',
    tier: 'basic',
    title: 'Listening 102 Basic lessons',
    description:
      'Three CEFR-graded levels with 34 lessons each; every lesson ships an interactive page and a dedicated recording.',
    basePath: 'Listening_102_Basic',
    entryDirectory: '{level}/Lesson_{lesson}',
    levels: [
      { name: 'Basic', count: 34 },
      { name: 'Intermediate', count: 34 },
      { name: 'Advanced', count: 34 },
    ],
    totalEntries: 102,
    artifacts: [
      {
        name: 'lessonPlayer',
        kind: 'player-html',
        pathTemplate: 'Listening_102_Basic/{level}/Lesson_{lesson}/index.html',
        description: 'Interactive lesson page with exercises.',
        present: [[1, 102]],
      },
      {
        name: 'lessonAudio',
        kind: 'audio',
        pathTemplate: 'Listening_102_Basic/{level}/Lesson_{lesson}/audio.mp3',
        description: 'Lesson recording.',
        present: [[1, 102]],
      },
    ],
  },
  {
    id: 'listening-204-full-test',
    skill: 'listening',
    tier: 'full-test',
    title: 'Listening 204 full tests',
    description:
      'Complete four-part tests in a stable JSON schema (sections, instructions, questions, options), each with audio and an interactive player.',
    basePath: 'Listening_204_FullTest',
    entryDirectory: 'Test_{test}',
    levels: [],
    totalEntries: 204,
    artifacts: [
      {
        name: 'questionsJson',
        kind: 'questions-json',
        pathTemplate: 'Listening_204_FullTest/Test_{test}/Test_{test}.json',
        description: 'Structured test data: sections, instructions, questions, options.',
        present: [
          [1, 2],
          [4, 33],
          [35, 50],
          [52, 204],
        ],
      },
      {
        name: 'testPlayer',
        kind: 'player-html',
        pathTemplate: 'Listening_204_FullTest/Test_{test}/Test_{test}.html',
        description: 'Full interactive test application.',
        present: [[1, 204]],
      },
      {
        name: 'playerIndex',
        kind: 'player-index',
        pathTemplate: 'Listening_204_FullTest/Test_{test}/index.html',
        description: 'Directory index page (present for tests 1-100 only).',
        present: [[1, 100]],
      },
      {
        name: 'testAudio',
        kind: 'audio',
        pathTemplate: 'Listening_204_FullTest/Test_{test}/audio_{test}.mp3',
        description: 'Test recording.',
        present: [
          [1, 82],
          [84, 84],
          [86, 87],
          [89, 204],
        ],
      },
      {
        name: 'strategiesJson',
        kind: 'strategies-json',
        pathTemplate: 'Listening_204_FullTest/Test_{test}/strategies.json',
        description: 'Per-question strategy tips, scan targets and answer logic (tests 1-20).',
        present: [[1, 20]],
      },
      {
        name: 'processedJson',
        kind: 'processed-json',
        pathTemplate: 'Listening_204_FullTest/Test_{test}/Test_{test}_processed.json',
        description: 'Derived answer-key representation.',
        present: [
          [1, 1],
          [4, 18],
          [20, 25],
          [29, 33],
          [35, 50],
          [52, 79],
          [81, 94],
          [96, 130],
          [132, 138],
          [140, 148],
          [150, 163],
          [165, 182],
          [184, 184],
          [186, 199],
          [201, 204],
        ],
      },
    ],
  },
  {
    id: 'reading-1232-basic',
    skill: 'reading',
    tier: 'basic',
    title: 'Reading 1232 CEFR-graded lessons',
    description:
      'Graded reading lessons with passages, questions and timings, split across A1-A2, B1-B2 and C1-C2; each lesson is offered as a JS module and as plain JSON.',
    basePath: 'Reading_1232_Basic/frontend/data',
    entryDirectory: null,
    levels: [
      { name: 'A1-A2', count: 198 },
      { name: 'B1-B2', count: 374 },
      { name: 'C1-C2', count: 660 },
    ],
    totalEntries: 1232,
    artifacts: [
      {
        name: 'lessonJson',
        kind: 'lesson-data-json',
        pathTemplate: 'Reading_1232_Basic/frontend/data/{level}/lesson_{pad}.json',
        description: 'Plain lesson data: passage HTML, questions, level and time limit.',
        present: [[1, 1232]],
      },
      {
        name: 'lessonJs',
        kind: 'lesson-data-js',
        pathTemplate: 'Reading_1232_Basic/frontend/data/{level}/lesson_{pad}.js',
        description: 'Same lesson data wrapped as a browser script module.',
        present: [[1, 1232]],
      },
    ],
  },
  {
    id: 'reading-315-full-test',
    skill: 'reading',
    tier: 'full-test',
    title: 'Reading 315 full tests',
    description:
      'Complete academic reading tests in the same JSON schema as the listening tests, with source documents and (for tests 1-20) per-question strategies.',
    basePath: 'Reading_315_FullTest',
    entryDirectory: 'Test_{test}',
    levels: [],
    totalEntries: 315,
    artifacts: [
      {
        name: 'questionsJson',
        kind: 'questions-json',
        pathTemplate: 'Reading_315_FullTest/Test_{test}/Test_{test}.json',
        description: 'Structured test data: passages, instructions, questions, options.',
        present: [
          [1, 2],
          [4, 4],
          [6, 22],
          [24, 30],
          [33, 33],
          [35, 36],
          [39, 43],
          [45, 45],
          [49, 50],
          [52, 52],
          [55, 85],
          [87, 96],
          [99, 99],
          [101, 101],
          [103, 104],
          [106, 136],
          [138, 145],
          [147, 147],
          [150, 228],
          [230, 236],
          [238, 242],
          [244, 244],
          [246, 246],
          [248, 262],
          [264, 272],
          [274, 295],
          [297, 297],
          [302, 302],
          [305, 307],
          [311, 311],
        ],
      },
      {
        name: 'testPlayer',
        kind: 'player-html',
        pathTemplate: 'Reading_315_FullTest/Test_{test}/Test_{test}.html',
        description: 'Full interactive test application.',
        present: [
          [1, 104],
          [106, 315],
        ],
      },
      {
        name: 'sourceDocx',
        kind: 'source-docx',
        pathTemplate: 'Reading_315_FullTest/Test_{test}/Test_{test}.docx',
        description: 'Original test document.',
        present: [
          [1, 104],
          [106, 315],
        ],
      },
      {
        name: 'strategiesJson',
        kind: 'strategies-json',
        pathTemplate: 'Reading_315_FullTest/Test_{test}/strategies.json',
        description: 'Per-question strategy tips, scan targets and answer logic (tests 1-20).',
        present: [[1, 20]],
      },
      {
        name: 'processedJson',
        kind: 'processed-json',
        pathTemplate: 'Reading_315_FullTest/Test_{test}/Test_{test}_processed.json',
        description: 'Derived answer-key representation.',
        present: [
          [2, 2],
          [4, 4],
          [8, 8],
          [10, 10],
          [13, 14],
          [17, 18],
          [20, 20],
          [24, 24],
          [29, 30],
          [33, 33],
          [35, 36],
          [39, 43],
          [45, 45],
          [49, 50],
          [59, 59],
          [61, 61],
          [65, 65],
          [68, 68],
          [71, 71],
          [74, 74],
          [80, 80],
          [83, 83],
          [85, 85],
          [89, 89],
          [91, 92],
          [95, 95],
          [99, 99],
          [101, 101],
          [104, 104],
          [107, 107],
          [111, 111],
          [113, 113],
          [116, 116],
          [118, 118],
          [120, 120],
          [124, 124],
          [126, 126],
          [131, 133],
          [139, 139],
          [142, 143],
          [145, 145],
          [147, 147],
          [151, 153],
          [157, 159],
          [161, 161],
          [163, 164],
          [166, 167],
          [170, 170],
          [173, 173],
          [176, 176],
          [178, 178],
          [180, 180],
          [183, 185],
          [187, 187],
          [192, 195],
          [198, 198],
          [201, 202],
          [204, 204],
          [209, 209],
          [217, 220],
          [222, 223],
          [225, 226],
          [231, 234],
          [236, 236],
          [241, 242],
          [244, 244],
          [264, 264],
          [267, 267],
          [297, 297],
          [302, 302],
          [305, 307],
          [311, 311],
        ],
      },
    ],
  },
];

/**
 * Is a global entry index inside any of the present ranges?
 *
 * @param ranges - `[min, max]` ranges.
 * @param index - One-based entry index.
 */
export function isPresentInRange(ranges: readonly [number, number][], index: number): boolean {
  return ranges.some(([min, max]) => index >= min && index <= max);
}

/**
 * Substitute `{level}`, `{lesson}`, `{pad}` and `{test}` tokens.
 *
 * @param template - Path template.
 * @param values - Concrete values for this entry.
 */
export function fillTemplate(
  template: string,
  values: { level: string; lesson: number; test: number },
): string {
  const pad = String(values.lesson).padStart(3, '0');
  return template
    .replaceAll('{level}', values.level)
    .replaceAll('{lesson}', String(values.lesson))
    .replaceAll('{pad}', pad)
    .replaceAll('{test}', String(values.test));
}

/**
 * Find one collection by identifier.
 *
 * @param id - Collection identifier such as `reading-315-full-test`.
 */
export function findCollection(id: string): CatalogCollection | undefined {
  return CATALOG_COLLECTIONS.find((collection) => collection.id === id);
}

/**
 * Map a global 1-based entry index to a level and a position within it.
 *
 * Full-test collections are flat: the global index *is* the test number.
 *
 * @param collection - Catalog collection.
 * @param index - Global entry index.
 * @returns The level name (`null` for flat collections) and index within level.
 */
export function levelForIndex(
  collection: CatalogCollection,
  index: number,
): { level: string | null; indexWithinLevel: number } {
  let consumed = 0;
  for (const level of collection.levels) {
    if (index <= consumed + level.count) {
      return { level: level.name, indexWithinLevel: index - consumed };
    }
    consumed += level.count;
  }
  return { level: null, indexWithinLevel: index };
}

/**
 * Build the list of artifacts with availability and URLs for one entry.
 *
 * @param collection - Catalog collection.
 * @param index - Global entry index within the collection.
 */
export function artifactsForIndex(collection: CatalogCollection, index: number): CatalogEntryArtifact[] {
  const { level, indexWithinLevel } = levelForIndex(collection, index);
  const values = {
    level: level ?? '',
    lesson: collection.levels.length > 0 ? indexWithinLevel : index,
    test: index,
  };
  return collection.artifacts.map((artifact: CatalogArtifactSpec) => {
    const available = isPresentInRange(artifact.present, index);
    if (!available) {
      return { name: artifact.name, kind: artifact.kind, available, path: null, rawUrl: null, blobUrl: null };
    }
    const path = fillTemplate(artifact.pathTemplate, values);
    return {
      name: artifact.name,
      kind: artifact.kind,
      available,
      path,
      rawUrl: `${CATALOG_RAW_BASE}${path.split('/').map(encodeURIComponent).join('/')}`,
      blobUrl: `${CATALOG_UPSTREAM_REPOSITORY}/blob/main/${path.split('/').map(encodeURIComponent).join('/')}`,
    };
  });
}

/**
 * Resolve one entry of a collection.
 *
 * @param collection - Catalog collection.
 * @param index - Global entry index (1-based).
 * @returns The resolved entry, or `undefined` when the index is out of range
 *   or the entry has no artifact upstream at all (reading test 105).
 */
export function resolveEntry(collection: CatalogCollection, index: number): CatalogEntry | undefined {
  if (!Number.isInteger(index) || index < 1 || index > collection.totalEntries) {
    return undefined;
  }
  const artifacts = artifactsForIndex(collection, index);
  if (!artifacts.some((artifact) => artifact.available)) {
    return undefined;
  }
  const { level, indexWithinLevel } = levelForIndex(collection, index);
  const values = {
    level: level ?? '',
    lesson: collection.levels.length > 0 ? indexWithinLevel : index,
    test: index,
  };
  const directory = collection.entryDirectory === null ? '' : fillTemplate(collection.entryDirectory, values);
  return {
    id: `${collection.id}-${String(index).padStart(4, '0')}`,
    collection: collection.id,
    index,
    level,
    indexWithinLevel: collection.levels.length > 0 ? indexWithinLevel : null,
    number: values.lesson,
    directory,
    treeUrl:
      directory.length === 0
        ? `${CATALOG_UPSTREAM_REPOSITORY}/tree/main/${collection.basePath}`
        : `${CATALOG_UPSTREAM_REPOSITORY}/tree/main/${collection.basePath}/${directory.split('/').map(encodeURIComponent).join('/')}`,
    artifacts,
  };
}

/**
 * Totals across the catalog, for metadata blocks and the docs page.
 *
 * @returns Aggregated counts of collections, entries and available artifacts.
 */
/** Aggregate catalog counts. */
export interface CatalogTotals {
  /** Number of collections. */
  collections: number;
  /** Total entries across collections. */
  entries: number;
  /** Artifact specifications across collections. */
  artifacts: number;
  /** Artifact files that exist upstream. */
  availableFiles: number;
  /** Machine-readable question sets available upstream. */
  questionSets: number;
  /** Per-question strategy files available upstream. */
  strategySets: number;
}

export function catalogTotals(): CatalogTotals {
  let entries = 0;
  let artifacts = 0;
  let availableFiles = 0;
  let questionSets = 0;
  let strategySets = 0;
  for (const collection of CATALOG_COLLECTIONS) {
    entries += collection.totalEntries;
    for (const artifact of collection.artifacts) {
      artifacts += 1;
      const covered = artifact.present.reduce((sum, [min, max]) => sum + (max - min + 1), 0);
      availableFiles += covered;
      if (artifact.kind === 'questions-json') {
        questionSets += covered;
      }
      if (artifact.kind === 'strategies-json') {
        strategySets += covered;
      }
    }
  }
  return {
    collections: CATALOG_COLLECTIONS.length,
    entries,
    artifacts,
    availableFiles,
    questionSets,
    strategySets,
  };
}
