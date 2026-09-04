import type { OverallBandDescriptor } from '../types/ielts.js';

/**
 * Overall band descriptors covering bands 0 through 9.
 *
 * These are general descriptions of a candidate's ability at each overall band.
 */
export const OVERALL_BAND_DESCRIPTORS: readonly OverallBandDescriptor[] = [
  {
    band: 0,
    description:
      'The candidate did not answer the questions, or was absent; no assessable evidence.',
  },
  {
    band: 1,
    description:
      'The candidate is effectively a non-user. Only isolated words or very simple expressions are produced.',
  },
  {
    band: 2,
    description:
      'The candidate is an intermittent user. Simple communication is possible using isolated words and short formulae.',
  },
  {
    band: 3,
    description:
      'The candidate is an extremely limited user. Only familiar situations are understood and basic messages conveyed.',
  },
  {
    band: 4,
    description:
      'The candidate is a limited user. Familiar situations are handled but complex language and understanding break down.',
  },
  {
    band: 5,
    description:
      'The candidate is a modest user. Partial command of the language is shown and meaning can be understood in most situations.',
  },
  {
    band: 6,
    description:
      'The candidate is a competent user. Effective command is shown despite some inaccuracies and misuses.',
  },
  {
    band: 7,
    description:
      'The candidate is a good user. Operational command is shown, with occasional inaccuracies and misunderstandings.',
  },
  {
    band: 8,
    description:
      'The candidate is a very good user. Fully operational command is shown with only occasional unsystematic inaccuracies.',
  },
  {
    band: 9,
    description:
      'The candidate is an expert user. Full operational command is shown with accurate, fluent, and complete understanding.',
  },
];

/** Slice the band descriptors array so it can be serialised without mutation. */
export function getOverallBandDescriptor(band: number): OverallBandDescriptor | undefined {
  return OVERALL_BAND_DESCRIPTORS.find((entry) => entry.band === band);
}
