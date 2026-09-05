/** Public contracts for the original, openly licensed reading practice collection. */

/** Editorial difficulty labels, not measured CEFR levels or IELTS bands. */
export type ReadingLevel = 'foundation' | 'intermediate' | 'advanced';

/** Automatically checkable question families supported by the reading collection. */
export type ReadingQuestionType = 'single-choice' | 'true-false-not-given' | 'short-answer';

/** A question without its solution; option identifiers, not option text, are submitted. */
export type ReadingQuestion = {
  id: string;
  prompt: string;
} & (
  | { type: 'single-choice'; options: { id: string; text: string }[] }
  | { type: 'true-false-not-given' }
  | { type: 'short-answer'; maxWords: number }
);

/** Feedback released after grading; evidence uses one-based paragraph numbers. */
export type ReadingSolution = {
  questionId: string;
  acceptedAnswers: string[];
  explanation: string;
  evidenceParagraphs: number[];
};

/** An original exercise. No answer key is present in this public view. */
export type ReadingExercise = {
  id: string;
  title: string;
  level: ReadingLevel;
  topic: string;
  suggestedMinutes: number;
  paragraphs: string[];
  questions: ReadingQuestion[];
};

/** Authored source record, kept separate from the public exercise representation. */
export type ReadingEntry = {
  exercise: ReadingExercise;
  solutions: ReadingSolution[];
};

/** One submitted response; omitting a question leaves it unanswered. */
export type ReadingAnswer = {
  questionId: string;
  answer: string;
};

/** A bounded, stateless grading request. No learner identifier is accepted. */
export type ReadingSubmission = {
  answers: ReadingAnswer[];
};

/** Per-question grading outcome, without echoing the learner's submitted text. */
export type ReadingFeedback = ReadingSolution & {
  outcome: 'correct' | 'incorrect' | 'unanswered' | 'word-limit-exceeded';
};

/** Practice marks only: no inference about an official IELTS band is made. */
export type ReadingGrade = {
  exerciseId: string;
  correct: number;
  incorrect: number;
  unanswered: number;
  total: number;
  percentage: number;
  feedback: ReadingFeedback[];
};
