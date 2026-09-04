/**
 * Band descriptor service: nine-band overview plus Writing and Speaking
 * criterion descriptors.
 */

import { BAND_DATA, type BandOverview, type CriterionDescriptors } from '../data/bands.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

export function listBandOverviews(): readonly BandOverview[] {
  return BAND_DATA.overviews;
}

export function getBandOverview(band: number): BandOverview {
  if (!Number.isInteger(band) || band < 1 || band > 9) {
    throw new ValidationError('Band must be an integer between 1 and 9', { band });
  }
  // bands 1-9 are guaranteed present by the data-integrity tests; the array
  // is ordered by band so a direct index lookup is safe.
  return BAND_DATA.overviews[band - 1] as BandOverview;
}

export type WritingTask = 1 | 2;

export function writingCriteria(task: WritingTask): readonly CriterionDescriptors[] {
  return task === 1 ? BAND_DATA.writingTask1 : BAND_DATA.writingTask2;
}

export function speakingCriteria(): readonly CriterionDescriptors[] {
  return BAND_DATA.speaking;
}

/** 'Lexical Resource' / 'lexical-resource' / 'LEXICAL_RESOURCE' all match. */
function normaliseCriterion(criterion: string): string {
  return criterion.toLowerCase().replace(/[\s_]+/g, '-');
}

export function getWritingCriterion(task: WritingTask, criterion: string): CriterionDescriptors {
  const target = normaliseCriterion(criterion);
  const found = writingCriteria(task).find(
    (candidate) => normaliseCriterion(candidate.criterion) === target
  );
  if (found === undefined) {
    const known = writingCriteria(task)
      .map((candidate) => candidate.criterion)
      .join(', ');
    throw new NotFoundError(
      `Writing Task ${task} criterion`,
      `${criterion} (use one of: ${known})`
    );
  }
  return found;
}

export function getSpeakingCriterion(criterion: string): CriterionDescriptors {
  const target = normaliseCriterion(criterion);
  const found = speakingCriteria().find(
    (candidate) => normaliseCriterion(candidate.criterion) === target
  );
  if (found === undefined) {
    const known = speakingCriteria()
      .map((candidate) => candidate.criterion)
      .join(', ');
    throw new NotFoundError('Speaking criterion', `${criterion} (use one of: ${known})`);
  }
  return found;
}
