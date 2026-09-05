/**
 * Access to the listening vocabulary resource.
 *
 * The upstream handouts <https://github.com/Oxidaner/ielts> (the "IELTS
 * Listening Words" sheets compiled by the preparer Sherry) publish two word
 * lists: same-meaning replacement ("paraphrase") groups organised by part of
 * speech and sense, and the scenario vocabulary of the listening paper with
 * its discourse-relation markers. The material is unlicensed third-party
 * teaching content, so `scripts/extract_listening_words.py` derives the lists
 * of words themselves - facts, not expression - and drops the layout,
 * introduction and watermarks. The English sense glosses are original to this
 * project.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesQuery, paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type {
  DiscourseClass,
  ListeningScenario,
  ParaphraseGroup,
  ParaphraseMechanism,
  ParaphrasePos,
  ScenarioCategory,
} from '../types.js';

/** Shape of `data/listening-words.json`. */
export type ListeningWordsIndex = {
  meta: {
    name: string;
    repository: string;
    upstreamFiles: Record<string, string>;
    license: string;
    attribution: string;
    note: string;
    glossCoverage: { groups: number; glossed: number };
    sourceIrregularities: { verbNumberSequenceGaps: number[]; note: string };
  };
  paraphrases: {
    mechanisms: ParaphraseMechanism[];
    groups: ParaphraseGroup[];
    stats: { groups: number; terms: number; byPos: Record<ParaphrasePos, number> };
  };
  scenarios: ListeningScenario[];
  discourseMarkers: DiscourseClass[];
  stats: {
    scenarios: number;
    scenarioTerms: number;
    discourseClasses: number;
    discourseMarkers: number;
  };
};

/** The parsed dataset. */
function index(): ListeningWordsIndex {
  return loadDataset<ListeningWordsIndex>('listening-words.json');
}

/** Part-of-speech values available in the paraphrase dataset. */
export const PARAPHRASE_PARTS_OF_SPEECH: readonly ParaphrasePos[] = ['verb', 'adj/adv', 'noun'];

/** Paraphrase mechanisms the source sheet's introduction describes. */
export function paraphraseMechanisms(): readonly ParaphraseMechanism[] {
  return index().paraphrases.mechanisms;
}

/** Summary statistics of the paraphrase groups. */
export function paraphraseStats(): ListeningWordsIndex['paraphrases']['stats'] {
  return index().paraphrases.stats;
}

/**
 * Return paraphrase groups, optionally filtered.
 *
 * @param options - Part-of-speech and free-text filters.
 */
export function findParaphraseGroups(options: {
  pos?: ParaphrasePos | undefined;
  query?: string | undefined;
}): ParaphraseGroup[] {
  const { pos, query = '' } = options;
  return index().paraphrases.groups.filter((group) => {
    if (pos !== undefined && group.pos !== pos) {
      return false;
    }
    return query.length === 0 || matchesQuery([group.id, group.sense, group.gloss, ...group.terms], query);
  });
}

/**
 * Return one page of the paraphrase groups.
 *
 * @param options - Filter, sort and pagination options.
 */
export function paraphraseGroupsPage(options: {
  pos?: ParaphrasePos | undefined;
  query?: string | undefined;
  sort?: 'id' | 'terms' | undefined;
  order?: 'asc' | 'desc' | undefined;
  limit: number;
  offset: number;
}): Page<ParaphraseGroup> {
  const { sort = 'id', order = 'asc' } = options;
  const filtered = findParaphraseGroups(options);
  const sorted = sortBy(filtered, (group) => (sort === 'terms' ? group.terms.length : group.id), order);
  return paginate(sorted, options.limit, options.offset);
}

/**
 * Find one paraphrase group by identifier.
 *
 * @param id - Group identifier.
 */
export function findParaphraseGroup(id: string): ParaphraseGroup | undefined {
  return index().paraphrases.groups.find((group) => group.id === id);
}

/** Scenario identifiers, in source order. */
export function scenarioIds(): readonly string[] {
  return index().scenarios.map((scenario) => scenario.id);
}

/**
 * Return listening scenarios, optionally filtered by section and free text.
 *
 * @param options - Section and free-text filters.
 */
export function findScenarios(
  options: { section?: number | undefined; query?: string | undefined } = {},
): ListeningScenario[] {
  const { section, query = '' } = options;
  return index().scenarios.filter((scenario) => {
    if (section !== undefined && !scenario.typicalSections.includes(section)) {
      return false;
    }
    if (query.length === 0) {
      return true;
    }
    const terms = scenario.categories.flatMap((category) => category.terms);
    return matchesQuery([scenario.id, scenario.name, scenario.nameZh, ...terms], query);
  });
}

/**
 * Find one listening scenario by identifier.
 *
 * @param id - Scenario identifier.
 */
export function findScenario(id: string): ListeningScenario | undefined {
  return index().scenarios.find((scenario) => scenario.id === id);
}

/**
 * Return the lexical categories of a scenario, optionally searched.
 *
 * @param scenario - The scenario whose categories are returned.
 * @param query - Free-text filter over category names and terms.
 */
export function scenarioCategories(scenario: ListeningScenario, query = ''): ScenarioCategory[] {
  if (query.length === 0) {
    return scenario.categories;
  }
  return scenario.categories.filter((category) =>
    matchesQuery([category.nameZh, category.name, ...category.terms], query),
  );
}

/** The discourse-relation classes and their signal markers. */
export function discourseClasses(): readonly DiscourseClass[] {
  return index().discourseMarkers;
}

/**
 * Find one discourse-relation class by identifier.
 *
 * @param id - Class identifier.
 */
export function findDiscourseClass(id: string): DiscourseClass | undefined {
  return index().discourseMarkers.find((entry) => entry.id === id);
}

/** Summary statistics of the scenario vocabulary and markers. */
export function scenarioStats(): ListeningWordsIndex['stats'] {
  return index().stats;
}

/** Provenance metadata of the whole resource. */
export function listeningWordsMeta(): ListeningWordsIndex['meta'] {
  return index().meta;
}
