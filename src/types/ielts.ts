/**
 * Core domain types for the IELTS API.
 *
 * These types model the IELTS (International English Language Testing System)
 * examination structure: the two objective sections (Listening and Reading),
 * the two subjective sections (Writing and Speaking), band-score descriptors,
 * supporting vocabulary, and common writing mistakes.
 */

/** A raw-score to band conversion is expressed as an inclusive range of correct answers. */
export interface BandRange {
  /** The IELTS band awarded for this range (an integer or a half band, e.g. `6.5`). */
  band: number;
  /** Inclusive minimum number of correct answers. */
  min: number;
  /** Inclusive maximum number of correct answers. */
  max: number;
}

/** The objective (multiple-choice) test sections that are scored from a raw count. */
export type ObjectiveSection = 'listening' | 'reading';

/** The two Reading variants for the Academic and General Training modules. */
export type ReadingModule = 'academic' | 'general-training';

/** The four Writing assessment criteria. */
export type WritingCriterion =
  'task-achievement' | 'coherence-cohesion' | 'lexical-resource' | 'grammatical-range-accuracy';

/** The four Speaking assessment criteria. */
export type SpeakingCriterion =
  'fluency-coherence' | 'lexical-resource' | 'grammatical-range-accuracy' | 'pronunciation';

/** A band-level descriptor for a single assessment criterion. */
export interface CriterionDescriptor {
  /** The IELTS band this descriptor describes. */
  band: number;
  /** Human-readable descriptor text for that band. */
  description: string;
}

/** An assessment criterion together with its band-level descriptors. */
export interface AssessmentCriterion {
  /** Stable machine identifier, e.g. `coherence-cohesion`. */
  id: string;
  /** Human-readable name, e.g. "Coherence and Cohesion". */
  name: string;
  /** Short description of what the criterion measures. */
  description: string;
  /** Descriptors for bands 0 through 9. */
  descriptors: CriterionDescriptor[];
}

/** A band descriptor for the overall band score. */
export interface OverallBandDescriptor {
  /** The IELTS band (integer or half band). */
  band: number;
  /** A description of overall ability at this band. */
  description: string;
}

/** A vocabulary entry. */
export interface VocabularyWord {
  /** Stable machine identifier. */
  id: string;
  /** The word or short phrase. */
  word: string;
  /** Part of speech, e.g. "noun". */
  partOfSpeech: string;
  /** Concise definition. */
  definition: string;
  /** Example sentence demonstrating usage. */
  example: string;
  /** Thematic category, e.g. "education". */
  category: string;
  /** Approximate band level at which the word is typically expected. */
  bandLevel: number;
}

/** A common IELTS writing mistake with its correction. */
export interface WritingMistake {
  /** Stable machine identifier. */
  id: string;
  /** The mistaken usage. */
  incorrect: string;
  /** The corrected usage. */
  correct: string;
  /** Explanation of why the correction is right. */
  explanation: string;
  /** Error category, e.g. "grammar", "academic-style". */
  category: string;
}

/** A study resource. */
export interface StudyResource {
  /** Stable machine identifier. */
  id: string;
  /** Title of the resource. */
  title: string;
  /** Resource type, e.g. "guide". */
  type: 'guide' | 'practice' | 'reference' | 'tool' | 'video';
  /** Skill it targets. */
  skill: 'listening' | 'reading' | 'writing' | 'speaking' | 'vocabulary' | 'general';
  /** Free-text description. */
  description: string;
  /** Optional canonical URL. */
  url?: string;
  /** Searchable tags. */
  tags: string[];
}

/** The four component band scores used to compute an overall band. */
export interface ComponentBandScores {
  /** Listening band (0-9, in half bands). */
  listening: number;
  /** Reading band (0-9, in half bands). */
  reading: number;
  /** Writing band (0-9, in half bands). */
  writing: number;
  /** Speaking band (0-9, in half bands). */
  speaking: number;
}

/** The result of an overall-band computation. */
export interface OverallBandResult {
  /** The rounded overall band (nearest half band). */
  overall: number;
  /** The unrounded average of the four components. */
  average: number;
  /** The four component bands echoed back. */
  components: ComponentBandScores;
  /** Grading advice derived from the result. */
  assessment: string;
}
