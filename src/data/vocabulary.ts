/**
 * A compact academic vocabulary resource composed for this project. The
 * project-specific sublist field groups common academic headwords; definitions,
 * examples, and collocations are written for this repository.
 */

/** A vocabulary entry. */
export interface VocabularyEntry {
  readonly headword: string;
  readonly sublist: number;
  readonly partOfSpeech: string;
  readonly cefr: 'B1' | 'B2' | 'C1' | 'C2';
  readonly definition: string;
  readonly example: string;
  readonly collocations: readonly string[];
}

/** Academic vocabulary entries served by `/v1/vocabulary`. */
export const VOCABULARY: readonly VocabularyEntry[] = [
  {
    headword: 'analyse',
    sublist: 1,
    partOfSpeech: 'verb',
    cefr: 'B2',
    definition: 'To examine something in detail in order to understand it.',
    example: 'The report analyses employment trends across three decades.',
    collocations: ['analyse data', 'analyse the results', 'critically analyse'],
  },
  {
    headword: 'significant',
    sublist: 1,
    partOfSpeech: 'adjective',
    cefr: 'B2',
    definition: 'Large or important enough to have an effect or to be noticed.',
    example: 'There was a significant increase in urban populations after 1990.',
    collocations: ['significant increase', 'statistically significant', 'significant impact'],
  },
  {
    headword: 'consequently',
    sublist: 2,
    partOfSpeech: 'adverb',
    cefr: 'B2',
    definition: 'As a result of something that has just been mentioned.',
    example: 'Fuel prices rose and consequently demand for public transport grew.',
    collocations: ['and consequently', 'consequently, therefore'],
  },
  {
    headword: 'sustainable',
    sublist: 3,
    partOfSpeech: 'adjective',
    cefr: 'C1',
    definition: 'Able to continue over a long period without damaging resources.',
    example: 'Cities are searching for sustainable transport solutions.',
    collocations: ['sustainable development', 'economically sustainable', 'sustainable growth'],
  },
  {
    headword: 'infrastructure',
    sublist: 4,
    partOfSpeech: 'noun',
    cefr: 'C1',
    definition: 'The basic physical systems a country or organisation needs to function.',
    example: 'Investment in digital infrastructure has doubled since 2015.',
    collocations: ['public infrastructure', 'invest in infrastructure', 'transport infrastructure'],
  },
  {
    headword: 'mitigate',
    sublist: 5,
    partOfSpeech: 'verb',
    cefr: 'C2',
    definition: 'To make something bad less severe or harmful.',
    example: 'Planting trees can mitigate the effects of urban heat.',
    collocations: ['mitigate risk', 'mitigate the impact', 'mitigate against'],
  },
  {
    headword: 'phenomenon',
    sublist: 5,
    partOfSpeech: 'noun',
    cefr: 'C1',
    definition: 'A fact or situation that exists and can be observed.',
    example: 'Remote working is a phenomenon that accelerated after 2020.',
    collocations: ['a global phenomenon', 'a recent phenomenon', 'explain the phenomenon'],
  },
  {
    headword: 'advocate',
    sublist: 6,
    partOfSpeech: 'verb',
    cefr: 'C1',
    definition: 'To publicly support a particular policy or way of doing things.',
    example: 'Many economists advocate higher taxes on carbon emissions.',
    collocations: ['strongly advocate', 'advocate for change', 'advocate a policy'],
  },
  {
    headword: 'inevitable',
    sublist: 7,
    partOfSpeech: 'adjective',
    cefr: 'C1',
    definition: 'Certain to happen and impossible to avoid.',
    example: 'Some degree of automation in manufacturing is inevitable.',
    collocations: ['almost inevitable', 'an inevitable consequence'],
  },
  {
    headword: 'nevertheless',
    sublist: 6,
    partOfSpeech: 'adverb',
    cefr: 'B2',
    definition: 'Despite what has just been said.',
    example: 'The policy is expensive; nevertheless, it is widely supported.',
    collocations: ['nevertheless, however', 'but nevertheless'],
  },
];

/** Discourse markers rewarded under the Coherence and Cohesion criterion. */
export const COHESIVE_DEVICES: readonly string[] = [
  'however',
  'moreover',
  'furthermore',
  'therefore',
  'consequently',
  'nevertheless',
  'in addition',
  'for instance',
  'for example',
  'in contrast',
  'on the other hand',
  'as a result',
  'in conclusion',
  'to summarise',
  'firstly',
  'secondly',
  'finally',
  'although',
  'whereas',
  'despite',
];
