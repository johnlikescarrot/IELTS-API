/**
 * Rhetorical move structures for the writing paper.
 *
 * The macro-structures below formalise what the most widely used Chinese
 * preparatory framesheets teach: Task 1 answers split into static
 * (comparison) and dynamic (trend) moves, and Task 2 answers built on a
 * concession-rebuttal skeleton reusable across the opinion, discussion and
 * advantage/disadvantage families. The structural analysis is inspired by the
 * framesheets distributed through <https://github.com/Oxidaner/ielts>; every
 * description here is original wording written for this project, and the
 * lexical inventories are standard pedagogical word lists.
 *
 * Move analysis of this kind connects the API to genre-analysis research
 * (Swales' move-step tradition), giving citation-minded consumers a stable
 * vocabulary for the rhetorical structure of high-stakes writing answers.
 */

import type { MoveStructure, MoveStructureId } from '../types.js';

/** The canonical move structures, in teaching order. */
export const MOVE_STRUCTURES: readonly MoveStructure[] = [
  {
    id: 'writing-task-1-static',
    name: 'Static chart: comparison by size',
    appliesTo: ['bar chart without a time axis', 'pie chart', 'table of proportions', 'comparative diagram'],
    description:
      'For visuals with no time dimension the assessed skill is selection and ranking: ' +
      'group the data by magnitude, describe the larger group first, and keep every ' +
      'sentence comparative. Tense follows the chart (no years means general present).',
    moves: [
      {
        label: 'Introduction',
        purpose: 'Paraphrase the rubric: what the visual shows, where and when.',
        guidance: [
          'Name the chart type (the line graph, the bar chart, the pie chart, the table) with a reporting verb such as illustrate or compare.',
          'Quantify the variables with the number of, the amount of or the proportion of, choosing the phrase that matches countability.',
          'Close the sentence with the location and time given in the rubric, or with a clause beginning how many or how much.',
        ],
      },
      {
        label: 'Overview',
        purpose: 'State the headline contrast and any shared pattern in two sentences.',
        guidance: [
          'Name the dimensions that differ most between the compared groups.',
          'Name the dimension on which the groups agree, or the single most striking value.',
          'Keep the overview free of exact figures; open it with Overall.',
        ],
      },
      {
        label: 'Detail: the larger values',
        purpose: 'Describe the higher side of the comparison in descending order.',
        guidance: [
          'Paragraph by the group with fewer members so each paragraph stays comparable, and contrast across paragraphs.',
          'Rank from the largest value down; with several large values, range them and single out the highest.',
          'With exactly two leaders, rank first with the figure, then follow with the runner-up in a relative clause.',
          'Where one value dwarfs the rest, contrast the maximum with the smallest explicitly.',
        ],
      },
      {
        label: 'Detail: the smaller values',
        purpose: 'Describe the lower side relative to the first paragraph.',
        guidance: [
          'Signal how much lower: much or significantly lower, slightly lower, or a fraction such as roughly half as high.',
          'Range several small values from lowest to highest, or give paired values respectively.',
          'If the remaining values barely differ, say so and give their average.',
        ],
      },
      {
        label: 'Conclusion',
        purpose: 'Restate the central contrast and the shared feature in two sentences.',
        guidance: [
          'Summarise how the compared groups differ, allowing for exceptions.',
          'Add the common pattern or the most notable single value.',
        ],
      },
    ],
    lexicon: [
      {
        category: 'comparison openers',
        items: [
          'In comparison',
          'By contrast',
          'In terms of',
          'With respect to',
          'What is also worth mentioning is that',
        ],
      },
      {
        category: 'ranking frames',
        items: [
          'rank first in terms of',
          'followed by',
          'the highest is',
          'as opposed to merely',
          'ranging from ... to ...',
        ],
      },
      {
        category: 'magnitude adverbs',
        items: ['much', 'significantly', 'slightly', 'roughly half as high as'],
      },
    ],
  },
  {
    id: 'writing-task-1-dynamic',
    name: 'Dynamic chart: trends over time',
    appliesTo: ['line graph', 'bar chart across years', 'table across periods'],
    description:
      'When a time axis is present the assessed skill is trend narration: group items ' +
      'that share a trajectory, lead with the item that starts highest, and support ' +
      'every movement with verb, degree and endpoints.',
    moves: [
      {
        label: 'Introduction',
        purpose: 'Paraphrase the rubric as for a static chart.',
        guidance: [
          'Use the same paraphrase skeleton as the static structure; the time span belongs in the sentence.',
        ],
      },
      {
        label: 'Overview',
        purpose: 'Name the overall trajectories, not individual years.',
        guidance: [
          'State which items rose and which fell, or which dominated throughout.',
          'Keep figures out of the overview.',
        ],
      },
      {
        label: 'Paragraphing',
        purpose: 'Group the lines or bars into narrative paragraphs.',
        guidance: [
          'In a single chart, group items by shared trend (rising together, falling together) or by magnitude.',
          'With several charts, give each chart its own paragraph.',
          'Start with the item that begins the period highest.',
        ],
      },
      {
        label: 'Trend narration',
        purpose: 'Describe each movement with verb, degree and endpoints.',
        guidance: [
          'Attach a degree adverb or adjective to every ordinary movement.',
          'Reserve the dramatic verbs (surge, rocket, plunge, halve) for movements that need no degree modifier, and quantify them by percentage.',
          'Mark special values: peak at, bottom out at, overtake, remain stable at, fluctuate between.',
          'Prefer noun phrases (a sharp increase, a slight decline) when sentences would otherwise repeat the same verb.',
        ],
      },
    ],
    lexicon: [
      {
        category: 'rise verbs',
        items: ['grow', 'rise', 'increase', 'surge', 'rocket', 'double by'],
      },
      {
        category: 'fall verbs',
        items: ['decrease', 'fall', 'decline', 'plunge', 'halve by'],
      },
      {
        category: 'special values',
        items: [
          'peak at',
          'bottom out at',
          'exceed',
          'overtake',
          'remain stable at',
          'stay flat at',
          'fluctuate between',
        ],
      },
      {
        category: 'degree adverbs',
        items: [
          'dramatically',
          'significantly',
          'sharply',
          'slightly',
          'marginally',
          'modestly',
          'moderately',
          'steadily',
          'continuously',
        ],
      },
      {
        category: 'degree adjectives',
        items: [
          'dramatic',
          'significant',
          'sharp',
          'slight',
          'marginal',
          'modest',
          'moderate',
          'steady',
          'continuous',
        ],
      },
      {
        category: 'trend nouns',
        items: [
          'an increase',
          'a rise',
          'a growth',
          'a surge',
          'a decrease',
          'a decline',
          'a fall',
          'a plunge',
          'a fluctuation between',
        ],
      },
    ],
  },
  {
    id: 'writing-task-2-concession-rebuttal',
    name: 'Concession-rebuttal essay',
    appliesTo: ['agree/disagree', 'advantages outweigh disadvantages', 'discuss both views'],
    description:
      'One skeleton serves the three most frequent Task 2 families: concede the ' +
      "strongest form of the opposing view, rebut it, then argue the writer's own " +
      "position through two developed reasons. The structure makes the writer's " +
      'stance explicit from the introduction, which examiners reward under task response.',
    moves: [
      {
        label: 'Background and thesis',
        purpose: 'Paraphrase the prompt and commit to a position in two sentences.',
        guidance: [
          'Rewrite the topic with synonyms, changed word classes or a new sentence pattern; a background clause with whether ... or ... frames a debate neutrally.',
          'State the position explicitly (a positive or negative development, advantages outweighing disadvantages, or a direct statement of the view held).',
        ],
      },
      {
        label: 'Concession',
        purpose: 'Present the opposing view at its strongest, with one developed illustration.',
        guidance: [
          'Open with an acknowledgement marker (It is understandable that, Admittedly, Undeniably) and name the fear or hope behind the opposing view.',
          'Develop the concession with a concrete example so the paragraph is not a straw man.',
        ],
      },
      {
        label: 'Rebuttal',
        purpose: 'Turn against the conceded view.',
        guidance: [
          'To rebut a claimed benefit, argue the benefit may not materialise as expected.',
          'To rebut a claimed harm, argue the harm can be solved or avoided, giving who acts, how, and to what purpose (so that ...).',
        ],
      },
      {
        label: 'Position: first reason',
        purpose: "Argue the writer's view through its strongest reason.",
        guidance: [
          "Re-anchor the paragraph on the writer's side (In actual fact, ...).",
          'Open with the most significant reason and develop it with explanation and example.',
        ],
      },
      {
        label: 'Position: second reason',
        purpose: 'Add an independent supporting reason.',
        guidance: [
          'Introduce it as a point that cannot be ignored, then develop it fully.',
          'Keep the two reasons logically independent; an example is not a second reason.',
        ],
      },
      {
        label: 'Conclusion',
        purpose: 'Summarise the reasons and restate the stance.',
        guidance: [
          'Open with In conclusion, compress the two reasons, and repeat the position in fresh words.',
        ],
      },
    ],
    lexicon: [
      {
        category: 'concession markers',
        items: ['It is understandable that', 'Admittedly', 'Undeniably', 'While it is true that'],
      },
      {
        category: 'rebuttal markers',
        items: [
          'However, the result may not be as satisfying as expected because',
          'However, the issue can be addressed through some measures',
          'For instance',
          'so that',
        ],
      },
      {
        category: 'benefit vocabulary',
        items: [
          'advantage',
          'benefit',
          'merit',
          'positive effect',
          'be beneficial to',
          'contribute to',
          'play an important role in',
        ],
      },
      {
        category: 'harm vocabulary',
        items: [
          'disadvantage',
          'drawback',
          'demerit',
          'negative effect',
          'be detrimental to',
          'have adverse effects on',
          'pose risks of',
          'lead to',
        ],
      },
    ],
  },
];

/** Identifiers of the canonical move structures. */
export const MOVE_STRUCTURE_IDS: readonly MoveStructureId[] = MOVE_STRUCTURES.map(
  (structure) => structure.id,
);

/**
 * Find one move structure by identifier.
 *
 * @param id - Structure identifier (any string; unknown ids yield `undefined`).
 */
export function findMoveStructure(id: string): MoveStructure | undefined {
  return MOVE_STRUCTURES.find((structure) => structure.id === id);
}

/**
 * Return move structures that apply to a given question family.
 *
 * @param family - An essay family or Task 1 visual, matched against `appliesTo`.
 */
export function findMoveStructuresByAppliesTo(family: string): MoveStructure[] {
  const needle = family.toLowerCase();
  return MOVE_STRUCTURES.filter((structure) =>
    structure.appliesTo.some((target) => target.toLowerCase().includes(needle)),
  );
}
