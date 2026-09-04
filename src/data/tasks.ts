/**
 * Writing Task 1 task families.
 *
 * Academic candidates describe, summarise or explain visual information;
 * General Training candidates write a letter. Both tasks carry a suggested
 * time budget of 20 minutes and a minimum of 150 words.
 */

import type { TaskType } from '../types.js';

/** Writing Task 1 task families. */
export const TASK_TYPES: readonly TaskType[] = [
  {
    id: 'academic-line-graph',
    module: 'academic',
    name: 'Line graph',
    description: 'Describe trends over time for one or more variables shown as continuous lines.',
    structure: [
      'Paraphrase the chart title and axis labels in the introduction.',
      'Give an overview naming the two or three most important trends.',
      'Group the lines logically (rising, falling, stable) in two detail paragraphs.',
      'Support every statement with data from the graph.',
    ],
    tips: [
      'Use trend language (rise sharply, plateau, fluctuate) rather than repeating "increase".',
      'Do not describe every data point; select the peaks, troughs and crossings.',
      'Keep the overview free of numbers.',
    ],
    suggestedMinutes: 20,
  },
  {
    id: 'academic-bar-chart',
    module: 'academic',
    name: 'Bar chart',
    description: 'Compare quantities across categories, optionally broken down by time or group.',
    structure: [
      'Introduce the chart by paraphrasing the title and units.',
      'State the highest and lowest categories in the overview.',
      'Group similar categories together and compare them with superlatives.',
      'Close with the most notable contrast or exception.',
    ],
    tips: [
      'Rank rather than list: highest, second, lowest.',
      'Use "respectively" correctly when pairing categories with values.',
    ],
    suggestedMinutes: 20,
  },
  {
    id: 'academic-pie-chart',
    module: 'academic',
    name: 'Pie chart',
    description: 'Report proportions of a whole, often comparing two or more pies.',
    structure: [
      'Say what the pies represent and over what period.',
      'Identify the largest and smallest segments in the overview.',
      'Group segments that are similar in size.',
      'Compare the pies explicitly when more than one is given.',
    ],
    tips: [
      'Use fractions and percentages accurately (a third, just over half).',
      'Two pies usually invite comparison, not two separate descriptions.',
    ],
    suggestedMinutes: 20,
  },
  {
    id: 'academic-table',
    module: 'academic',
    name: 'Table',
    description: 'Select and compare figures presented in rows and columns.',
    structure: [
      'Paraphrase the table heading and units.',
      'Name the clearest patterns in the overview (best, worst, biggest change).',
      'Organise the detail by row or column, whichever reveals a pattern.',
      'Reference at least one figure per category.',
    ],
    tips: [
      'Never transcribe the whole table; selection is the assessed skill.',
      'Look for rankings and exceptions rather than reading left to right.',
    ],
    suggestedMinutes: 20,
  },
  {
    id: 'academic-process-diagram',
    module: 'academic',
    name: 'Process diagram',
    description: 'Explain the stages of a natural or manufactured process.',
    structure: [
      'Paraphrase what the process produces and where it begins and ends.',
      'State the number of stages in the overview.',
      'Describe each stage in order using sequencing language.',
      'Use the passive voice where the agent is unknown or unimportant.',
    ],
    tips: [
      'Count the stages carefully before you start writing.',
      'Prefer "firstly, subsequently, finally" to "then, then, then".',
    ],
    suggestedMinutes: 20,
  },
  {
    id: 'academic-map',
    module: 'academic',
    name: 'Map comparison',
    description: 'Compare a location at two points in time, or compare two proposed plans.',
    structure: [
      'State what the maps show and the years or plans involved.',
      'Summarise the main changes or the main difference between plans.',
      'Describe changes area by area, using compass directions.',
      'Highlight what remained unchanged.',
    ],
    tips: [
      'Use locational language (to the north of, adjacent to, in the centre).',
      'Use the passive: "the farmland was replaced by housing".',
    ],
    suggestedMinutes: 20,
  },
  {
    id: 'academic-mixed-charts',
    module: 'academic',
    name: 'Multiple charts',
    description: 'Combine information from two related graphics (for example a pie and a table).',
    structure: [
      'Mention both graphics in the introduction.',
      'Draw the overview from the relationship between the two graphics.',
      'Devote one detail paragraph to each graphic.',
      'Add a sentence linking the two where the data allows.',
    ],
    tips: [
      'Find the link between the graphics; that relationship is the overview.',
      'Do not write two disconnected descriptions.',
    ],
    suggestedMinutes: 20,
  },
  {
    id: 'general-formal-letter',
    module: 'general-training',
    name: 'Formal letter',
    description: 'Write to someone you do not know, for example a manager, landlord or official.',
    structure: [
      'State the purpose of the letter in the first sentence.',
      'Develop each bullet point in its own paragraph.',
      'Use formal register: no contractions, no idioms.',
      'Close with a clear request or expected action and a formal sign-off.',
    ],
    tips: [
      'Use "Dear Sir or Madam" with "Yours faithfully", and a surname with "Yours sincerely".',
      'Invented details are acceptable as long as they are consistent.',
    ],
    suggestedMinutes: 20,
  },
  {
    id: 'general-semi-formal-letter',
    module: 'general-training',
    name: 'Semi-formal letter',
    description: 'Write to someone you know slightly, such as a colleague or a new neighbour.',
    structure: [
      'Open with a friendly but polite greeting.',
      'Explain the situation before making any request.',
      'Keep the tone warm but restrained.',
      'Close with "Best regards" or "Kind regards".',
    ],
    tips: [
      'Contractions are acceptable, slang is not.',
      'Match the register consistently across the whole letter.',
    ],
    suggestedMinutes: 20,
  },
  {
    id: 'general-informal-letter',
    module: 'general-training',
    name: 'Informal letter',
    description: 'Write to a friend or relative to share news, apologise, invite or thank.',
    structure: [
      'Open with a personal greeting and a brief reason for writing.',
      'Answer each bullet point in a separate paragraph.',
      'Use a relaxed register, contractions and everyday vocabulary.',
      'Close with a friendly phrase and your first name.',
    ],
    tips: [
      'Register is assessed: consistency matters more than the number of idioms.',
      'Still plan paragraphing; informal does not mean unorganised.',
    ],
    suggestedMinutes: 20,
  },
];

/** IELTS modules covered by {@link TASK_TYPES}. */
export const TASK_MODULES: readonly ('academic' | 'general-training')[] = ['academic', 'general-training'];

/**
 * Return task families, optionally filtered by module.
 *
 * @param module - Module filter.
 */
export function findTaskTypes(module?: 'academic' | 'general-training'): TaskType[] {
  return TASK_TYPES.filter((task) => module === undefined || task.module === module);
}
