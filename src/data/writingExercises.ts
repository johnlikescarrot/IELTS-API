/**
 * Original Academic Writing Task 1 practice, not reproduced upstream material.
 *
 * The msneloy/IELTS source review motivated the seven task families and the
 * data-literacy checks; every scenario, number, diagram and explanation below
 * was written for this project. These are fictional teaching stimuli, not
 * authentic exam questions, empirical observations or calibrated test items.
 */

import { matchesQuery, paginate } from '../lib/search.js';

import type { Page } from '../lib/search.js';

/** Task families represented by the original practice bank. */
export const WRITING_EXERCISE_KINDS = [
  'line-graph',
  'bar-chart',
  'pie-chart',
  'table',
  'map',
  'manufacturing-process',
  'natural-process',
] as const;

/** One of the seven practice families. */
export type WritingExerciseKind = (typeof WRITING_EXERCISE_KINDS)[number];

/** Plot-ready data; null means not reported, never zero. */
export type ChartStimulus = {
  kind: 'line-graph' | 'bar-chart' | 'pie-chart';
  title: string;
  categoryLabel: string;
  categories: string[];
  unit: string;
  series: { label: string; values: (number | null)[] }[];
  note: string;
};

/** A table with an explicit unit for each numeric column. */
export type TableStimulus = {
  kind: 'table';
  title: string;
  columns: { label: string; unit: string }[];
  rows: { label: string; values: number[] }[];
  note: string;
};

/** Two schematic, north-up maps; cells run NW, N, NE, W, centre, E, SW, S, SE. */
export type MapStimulus = {
  kind: 'map';
  title: string;
  periods: { label: string; cells: string[] }[];
  note: string;
};

/** Ordered stages; a cyclic diagram also connects the last stage to the first. */
export type ProcessStimulus = {
  kind: 'manufacturing-process' | 'natural-process';
  title: string;
  topology: 'linear' | 'cycle';
  stages: string[];
  note: string;
};

/** Machine-readable alternatives to the SVG figure. */
export type WritingStimulus = ChartStimulus | TableStimulus | MapStimulus | ProcessStimulus;

/** One original multiple-choice data-literacy check. */
export type WritingCheck = {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  correctOption: string;
  explanation: string;
  /** RFC 6901 JSON pointers into the public exercise, making evidence auditable. */
  evidence: string[];
};

/** Internal exercise, including the answer key (omitted from public stimuli). */
export type WritingExercise = {
  id: string;
  kind: WritingExerciseKind;
  title: string;
  taskTypeId: string;
  stimulus: WritingStimulus;
  checklist: string[];
  checks: WritingCheck[];
};

/** Public exercise: data and checks, without correct answers or explanations. */
export type WritingExerciseView = Omit<WritingExercise, 'checks'> & {
  revision: string;
  instructions: string;
  minimumWords: number;
  suggestedMinutes: number;
  figureUrl: string;
  checks: Omit<WritingCheck, 'correctOption' | 'explanation' | 'evidence'>[];
};

/** A versioned stimulus set; changing a figure or answer requires a revision. */
export const WRITING_EXERCISE_REVISION = '1';

/** Provenance and scope shared by all practice responses. */
export const WRITING_EXERCISE_META = {
  license: 'CC BY 4.0',
  attribution: 'Original stimuli and checks by the IELTS API contributors.',
  sourceReview: 'https://github.com/johnlikescarrot/IELTS-API/blob/main/docs/research/MSNELOY.md',
  upstreamCommit: 'db1064c36b6435b8a23adaf8e74c858476c38812',
  specification: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing',
  note: 'Fictional practice data, not official IELTS material. Checks assess reading the figure, not writing quality or an IELTS band. No learner text is collected.',
} as const;

/** Build a three-option check; the letter identifiers stay stable. */
function check(
  id: string,
  question: string,
  choices: [string, string, string],
  correctOption: 'a' | 'b' | 'c',
  explanation: string,
  evidence: string[],
): WritingCheck {
  return {
    id,
    question,
    options: choices.map((text, index) => ({ id: String.fromCharCode(97 + index), text })),
    correctOption,
    explanation,
    evidence,
  };
}

/** The complete original bank. Answer keys are public educational data, not secrets. */
export const WRITING_EXERCISES: readonly WritingExercise[] = [
  {
    id: 'w1-library-visits',
    kind: 'line-graph',
    title: 'Visits to three fictional libraries',
    taskTypeId: 'academic-line-graph',
    stimulus: {
      kind: 'line-graph',
      title: 'Annual library visits, 2015–2023',
      categoryLabel: 'Year',
      categories: ['2015', '2017', '2019', '2021', '2023'],
      unit: 'thousand visits',
      series: [
        { label: 'North', values: [40, 55, 70, 50, 80] },
        { label: 'South', values: [65, 60, 55, 50, 45] },
        { label: 'East', values: [20, 30, 40, 50, 60] },
      ],
      note: 'Invented annual totals. Lines connect observed years; intervening years are not reported.',
    },
    checklist: [
      'Introduce the years and the unit: thousands of visits, not individual visitors.',
      'Contrast the overall directions and identify the library leading at the end.',
      'Do not describe North as rising continuously: its 2021 total is below its 2019 total.',
      'Support selected comparisons with figures; do not invent reasons for the changes.',
    ],
    checks: [
      check(
        'q1',
        'Which library has the most visits in the final reported year?',
        ['North', 'South', 'East'],
        'a',
        'In 2023, North records 80 thousand visits, compared with 45 at South and 60 at East.',
        ['/stimulus/series/0/values/4', '/stimulus/series/1/values/4', '/stimulus/series/2/values/4'],
      ),
      check(
        'q2',
        'Which library increases at every reported interval?',
        ['North', 'East', 'South'],
        'b',
        'East rises from 20 to 30, 40, 50 and 60 thousand. North has a fall; South falls throughout.',
        ['/stimulus/series/2/values'],
      ),
      check(
        'q3',
        'What is the absolute increase in North visits from 2015 to 2023?',
        ['40 visits', '40 percent', '40 thousand visits'],
        'c',
        '80 − 40 = 40 thousand visits. The relative increase would instead be 100 percent.',
        ['/stimulus/unit', '/stimulus/series/0/values/0', '/stimulus/series/0/values/4'],
      ),
    ],
  },
  {
    id: 'w1-cycle-rentals',
    kind: 'bar-chart',
    title: 'Bicycle rentals at four fictional stations',
    taskTypeId: 'academic-bar-chart',
    stimulus: {
      kind: 'bar-chart',
      title: 'Average daily bicycle rentals in a survey week',
      categoryLabel: 'Station',
      categories: ['Central', 'Riverside', 'Hilltop', 'Campus'],
      unit: 'rentals per day',
      series: [
        { label: 'Weekday', values: [120, 80, 0, 100] },
        { label: 'Weekend', values: [90, 110, 40, null] },
      ],
      note: 'Invented averages. NR (null) means not reported; 0 is an observed zero, not missing data.',
    },
    checklist: [
      'Use rentals per day, not percentages or totals for the entire week.',
      'Compare the weekday and weekend values where both are available.',
      'Distinguish the reported zero at Hilltop from the missing weekend value at Campus.',
      'Do not infer opening hours or customer preferences from the bars.',
    ],
    checks: [
      check(
        'q1',
        'What can be concluded about weekend rentals at Campus?',
        ['There were no rentals.', 'The value is not reported.', 'The station was closed.'],
        'b',
        'The value is null (NR). Neither a zero nor a reason for the missing observation is supplied.',
        ['/stimulus/series/1/values/3', '/stimulus/note'],
      ),
      check(
        'q2',
        'How should the weekday value at Hilltop be described?',
        ['A reported average of zero rentals', 'Missing data', 'A percentage of weekday visitors'],
        'a',
        'The weekday value is explicitly 0 rentals per day. A missing observation would be null.',
        ['/stimulus/series/0/values/2', '/stimulus/unit'],
      ),
      check(
        'q3',
        'Among reported weekend values, which station has the most rentals?',
        ['Central', 'Hilltop', 'Riverside'],
        'c',
        'Riverside has 110 rentals per day, Central 90 and Hilltop 40. Campus cannot be ranked.',
        ['/stimulus/series/1/values'],
      ),
    ],
  },
  {
    id: 'w1-arts-income',
    kind: 'pie-chart',
    title: 'Income sources of a fictional arts centre',
    taskTypeId: 'academic-pie-chart',
    stimulus: {
      kind: 'pie-chart',
      title: 'Arts centre income shares in 2016 and 2024',
      categoryLabel: 'Source of income',
      categories: ['Tickets', 'Grants', 'Shop', 'Donations'],
      unit: 'percent of annual income',
      series: [
        { label: '2016', values: [50, 30, 15, 5] },
        { label: '2024', values: [35, 25, 20, 20] },
      ],
      note: 'Each fictional annual distribution sums to 100%. Total income amounts are not supplied.',
    },
    checklist: [
      'State that the diagrams show income shares, not expenditure or absolute amounts.',
      'Identify the largest source in each year and the major shifts in shares.',
      'Distinguish percentage-point changes from relative percentage changes.',
      'Do not infer the size or growth of total income without annual totals.',
    ],
    checks: [
      check(
        'q1',
        'How many percentage points does the donation share increase?',
        ['15', '300', '4'],
        'a',
        '20 − 5 = 15 percentage points. The relative increase in the share is (20 − 5) / 5 × 100 = 300%.',
        ['/stimulus/series/0/values/3', '/stimulus/series/1/values/3'],
      ),
      check(
        'q2',
        'Can the monetary amount received from tickets be compared across years?',
        ['It must have fallen by 15%.', 'It must be unchanged.', 'Not without total income in each year.'],
        'c',
        'Shares of different, unknown totals do not determine which absolute amount is larger.',
        ['/stimulus/note'],
      ),
      check(
        'q3',
        'Which source remains the largest share in both years?',
        ['Grants', 'Tickets', 'Donations'],
        'b',
        'Tickets account for 50% in 2016 and 35% in 2024, exceeding every other share in each year.',
        ['/stimulus/series/0/values', '/stimulus/series/1/values'],
      ),
    ],
  },
  {
    id: 'w1-digital-membership',
    kind: 'table',
    title: 'Membership of three fictional library branches',
    taskTypeId: 'academic-table',
    stimulus: {
      kind: 'table',
      title: 'Registered and digital-only members, 2024',
      columns: [
        { label: 'All members', unit: 'people' },
        { label: 'Digital-only share', unit: 'percent of branch members' },
      ],
      rows: [
        { label: 'Westgate', values: [2400, 25] },
        { label: 'Hillview', values: [1200, 40] },
        { label: 'Lakeside', values: [3000, 18] },
      ],
      note: 'Fictional counts. Each person belongs to exactly one branch; digital-only members are a subset.',
    },
    checklist: [
      'Keep counts of people separate from percentages of each branch population.',
      'Compare both the total membership and the digital-only share.',
      'A larger share of a smaller population need not mean more people.',
      'If combining branches, weight their percentages by branch membership.',
    ],
    checks: [
      check(
        'q1',
        'Which branch has the largest number of digital-only members?',
        ['Hillview', 'Lakeside', 'Westgate'],
        'c',
        'Westgate: 2400 × 25% = 600; Hillview: 1200 × 40% = 480; Lakeside: 3000 × 18% = 540.',
        ['/stimulus/rows'],
      ),
      check(
        'q2',
        'Which branch has the highest digital-only share?',
        ['Hillview', 'Westgate', 'Lakeside'],
        'a',
        'Hillview has the highest share (40%), even though Westgate has more digital-only members.',
        ['/stimulus/rows/0/values/1', '/stimulus/rows/1/values/1', '/stimulus/rows/2/values/1'],
      ),
      check(
        'q3',
        'Approximately what share of all members across the three branches is digital-only?',
        ['27.7%', '24.5%', '83%'],
        'b',
        '(600 + 480 + 540) / (2400 + 1200 + 3000) × 100 = 24.545…%. Averaging the three percentages gives the wrong denominator.',
        ['/stimulus/rows', '/stimulus/note'],
      ),
    ],
  },
  {
    id: 'w1-meadow-square',
    kind: 'map',
    title: 'Changes to fictional Meadow Square',
    taskTypeId: 'academic-map',
    stimulus: {
      kind: 'map',
      title: 'Meadow Square in 2012 and 2024',
      periods: [
        {
          label: '2012',
          cells: [
            'Orchard',
            'Clinic',
            'Field',
            'Footpath',
            'Square',
            'Road',
            'Car park',
            'Library',
            'Garden',
          ],
        },
        {
          label: '2024',
          cells: [
            'Solar farm',
            'Clinic',
            'Playground',
            'Footpath',
            'Square',
            'Road',
            'Housing',
            'Library',
            'Garden',
          ],
        },
      ],
      note: 'Schematic north-up grids, not to scale. Cells run left to right, from the northern row to the southern row.',
    },
    checklist: [
      'Introduce the location and the two years before describing changes.',
      'Group changes spatially and identify features that remain unchanged.',
      'Keep north, south, east and west consistent with the orientation arrow.',
      'The map supports changes of use, not claims about population growth or travel times.',
    ],
    checks: [
      check(
        'q1',
        'What replaced the orchard in the north-west?',
        ['Housing', 'A solar farm', 'A playground'],
        'b',
        'The north-west cell changes from Orchard in 2012 to Solar farm in 2024.',
        ['/stimulus/periods/0/cells/0', '/stimulus/periods/1/cells/0'],
      ),
      check(
        'q2',
        'Which statement about the clinic is supported?',
        ['It moved south.', 'It was demolished.', 'It remains in the northern central cell.'],
        'c',
        'The clinic occupies cell 1 (north, centre column) in both north-up maps.',
        ['/stimulus/periods/0/cells/1', '/stimulus/periods/1/cells/1'],
      ),
      check(
        'q3',
        'How many of the nine cells change their labelled use?',
        ['Three', 'Six', 'Nine'],
        'a',
        'Only Orchard → Solar farm, Field → Playground and Car park → Housing change; six cells retain their labels.',
        ['/stimulus/periods/0/cells', '/stimulus/periods/1/cells'],
      ),
    ],
  },
  {
    id: 'w1-bottle-refill',
    kind: 'manufacturing-process',
    title: 'A fictional bottle-refilling line',
    taskTypeId: 'academic-process-diagram',
    stimulus: {
      kind: 'manufacturing-process',
      title: 'A simplified bottle-refilling process',
      topology: 'linear',
      stages: ['Returned bottles', 'Inspection', 'Washing', 'Refilling', 'Sealing', 'Dispatch'],
      note: 'Simplified fictional linear process. Durations, temperatures and rejected bottles are not shown.',
    },
    checklist: [
      'Give an overview of the linear sequence and its first and final stages.',
      'Follow the arrows and group related stages rather than skipping steps.',
      'Use passive constructions when the diagram does not identify an operator.',
      'Do not add temperatures, timings or rejected-bottle branches that are not supplied.',
    ],
    checks: [
      check(
        'q1',
        'Which stage immediately precedes refilling?',
        ['Washing', 'Inspection', 'Sealing'],
        'a',
        'The sequence is Inspection → Washing → Refilling; Washing directly precedes Refilling.',
        ['/stimulus/stages/2', '/stimulus/stages/3'],
      ),
      check(
        'q2',
        'Which overview matches the diagram?',
        [
          'An endless natural cycle',
          'A linear process from returned bottles to dispatch',
          'Two alternative production routes',
        ],
        'b',
        'Six displayed stages form a single linear route, ending at Dispatch. There is no return arrow or branch.',
        ['/stimulus/topology', '/stimulus/stages'],
      ),
      check(
        'q3',
        'How long does washing take?',
        ['Six minutes', 'One hour', 'The diagram does not specify a duration'],
        'c',
        'Stages show order, not duration. The number of boxes is not a time measurement.',
        ['/stimulus/note'],
      ),
    ],
  },
  {
    id: 'w1-flowering-cycle',
    kind: 'natural-process',
    title: 'A simplified annual flowering-plant cycle',
    taskTypeId: 'academic-process-diagram',
    stimulus: {
      kind: 'natural-process',
      title: 'An illustrative annual flowering-plant life cycle',
      topology: 'cycle',
      stages: ['Seed in soil', 'Germination', 'Seedling', 'Mature plant', 'Flowering', 'Seed release'],
      note: 'Simplified teaching model, not a species-specific biological record. The last stage connects back to the first.',
    },
    checklist: [
      'Describe the repeating nature of the process in the overview.',
      'Use the supplied order, distinguishing plant development from seed production.',
      'Explain the return from seed release to seeds in the soil.',
      'Do not infer a species, a season length or a fixed duration from this simplified model.',
    ],
    checks: [
      check(
        'q1',
        'What follows seed release in the displayed cycle?',
        ['Dispatch', 'Flowering', 'Seed in soil'],
        'c',
        'The return arrow connects the last stage, Seed release, to the first displayed stage, Seed in soil.',
        ['/stimulus/topology', '/stimulus/stages/5', '/stimulus/stages/0'],
      ),
      check(
        'q2',
        'Which displayed stage immediately precedes seed release?',
        ['Flowering', 'Germination', 'Seedling'],
        'a',
        'Flowering is the fifth displayed stage and directly precedes Seed release.',
        ['/stimulus/stages/4', '/stimulus/stages/5'],
      ),
      check(
        'q3',
        'Which statement about the endpoint is supported?',
        [
          'The process stops permanently after seed release.',
          'The model repeats rather than having a permanent endpoint.',
          'The cycle always takes six days.',
        ],
        'b',
        'The cycle has a return arrow, not a terminal stage. Six stages do not imply six days.',
        ['/stimulus/topology', '/stimulus/note'],
      ),
    ],
  },
];

/** Retrieve an exercise by stable, case-insensitive identifier. */
export function findWritingExercise(id: string): WritingExercise | undefined {
  return WRITING_EXERCISES.find((exercise) => exercise.id === id.trim().toLowerCase());
}

/** Remove answer keys and add the practice instructions and relative figure link. */
export function writingExerciseView(exercise: WritingExercise): WritingExerciseView {
  return {
    id: exercise.id,
    kind: exercise.kind,
    title: exercise.title,
    taskTypeId: exercise.taskTypeId,
    stimulus: structuredClone(exercise.stimulus),
    checklist: [...exercise.checklist],
    revision: WRITING_EXERCISE_REVISION,
    instructions:
      'Write a connected report for a general academic reader. Select the main features of the supplied figure and support relevant comparisons with its evidence. Do not invent explanations for the data.',
    minimumWords: 150,
    suggestedMinutes: 20,
    figureUrl: `/v1/practice/writing/${exercise.id}/figure`,
    checks: exercise.checks.map(({ id, question, options }) => ({
      id,
      question,
      options: structuredClone(options),
    })),
  };
}

/** Filter and paginate the original bank without disclosing answer keys. */
export function searchWritingExercises(options: {
  kind?: WritingExerciseKind;
  query?: string;
  limit: number;
  offset: number;
}): Page<WritingExerciseView> {
  const filtered = WRITING_EXERCISES.filter((exercise) => {
    if (options.kind !== undefined && exercise.kind !== options.kind) {
      return false;
    }
    return matchesQuery([exercise.id, exercise.title, exercise.kind], options.query ?? '');
  });
  const page = paginate(filtered, options.limit, options.offset);
  return { ...page, items: page.items.map(writingExerciseView) };
}
