import vocabularyData from '../data/vocabulary.json';
import practiceData from '../data/practice.json';
import {
  VocabularyItem,
  QuizQuestion,
  Flashcard,
  PracticeReadingTest,
  PracticeListeningTest
} from '../types';

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateVocabularyQuiz(
  countInput?: number | string,
  chapterInput?: number | string,
  quizType: 'definitionMatch' | 'phoneticMatch' | 'multipleChoice' = 'multipleChoice'
): QuizQuestion[] {
  let count = typeof countInput === 'string' ? parseInt(countInput, 10) : (countInput ?? 10);
  if (isNaN(count) || count < 1) count = 10;
  if (count > 50) count = 50;

  let pool: VocabularyItem[] = vocabularyData as VocabularyItem[];
  if (chapterInput !== undefined) {
    const chapter = typeof chapterInput === 'string' ? parseInt(chapterInput, 10) : chapterInput;
    if (!isNaN(chapter) && chapter >= 1 && chapter <= 22) {
      pool = pool.filter((v) => v.chapter === chapter);
    }
  }

  const selectedWords = shuffleArray(pool).slice(0, count);
  const allDefinitions = (vocabularyData as VocabularyItem[])
    .map((v) => v.explanation)
    .filter((e) => e.length > 0);
  const allPhonetics = (vocabularyData as VocabularyItem[])
    .map((v) => v.phonetic)
    .filter((p) => p.length > 0);
  const allWordNames = (vocabularyData as VocabularyItem[]).map((v) => v.word);

  const questions: QuizQuestion[] = [];

  for (let i = 0; i < selectedWords.length; i++) {
    const item = selectedWords[i];

    if (quizType === 'phoneticMatch') {
      const wrongPhonetics = shuffleArray(allPhonetics.filter((p) => p !== item.phonetic)).slice(
        0,
        3
      );
      const options = shuffleArray([item.phonetic, ...wrongPhonetics]);

      questions.push({
        id: i + 1,
        word: item.word,
        phonetic: item.phonetic,
        question: `What is the correct IPA phonetic transcription for the word "${item.word}"?`,
        options,
        correctAnswer: item.phonetic,
        explanation: `The IPA phonetic transcription of "${item.word}" is ${item.phonetic}. Definition: ${item.explanation}`,
        notes: item.notes
      });
    } else if (quizType === 'definitionMatch') {
      const wrongWords = shuffleArray(allWordNames.filter((w) => w !== item.word)).slice(0, 3);
      const options = shuffleArray([item.word, ...wrongWords]);

      questions.push({
        id: i + 1,
        word: item.word,
        phonetic: item.phonetic,
        question: `Which word matches the following explanation: "${item.explanation}"?`,
        options,
        correctAnswer: item.word,
        explanation: `"${item.word}" (${item.phonetic}) means: ${item.explanation}`,
        notes: item.notes
      });
    } else {
      // Default: multipleChoice definition choice for word
      const wrongDefs = shuffleArray(allDefinitions.filter((d) => d !== item.explanation)).slice(
        0,
        3
      );
      const options = shuffleArray([item.explanation, ...wrongDefs]);

      questions.push({
        id: i + 1,
        word: item.word,
        phonetic: item.phonetic,
        question: `What is the meaning of the IELTS vocabulary word "${item.word}"?`,
        options,
        correctAnswer: item.explanation,
        explanation: `"${item.word}" (${item.phonetic}): ${item.explanation}`,
        notes: item.notes
      });
    }
  }

  return questions;
}

export function generateFlashcards(
  countInput?: number | string,
  chapterInput?: number | string
): Flashcard[] {
  let count = typeof countInput === 'string' ? parseInt(countInput, 10) : (countInput ?? 10);
  if (isNaN(count) || count < 1) count = 10;
  if (count > 50) count = 50;

  let pool: VocabularyItem[] = vocabularyData as VocabularyItem[];
  if (chapterInput !== undefined) {
    const chapter = typeof chapterInput === 'string' ? parseInt(chapterInput, 10) : chapterInput;
    if (!isNaN(chapter) && chapter >= 1 && chapter <= 22) {
      pool = pool.filter((v) => v.chapter === chapter);
    }
  }

  const selected = shuffleArray(pool).slice(0, count);

  return selected.map((item, idx) => ({
    id: idx + 1,
    chapter: item.chapter,
    word: item.word,
    phonetic: item.phonetic,
    explanation: item.explanation,
    notes: item.notes,
    hint: item.notes ? `Etymology/Root: ${item.notes}` : `Category: ${item.category}`
  }));
}

export interface PracticeEvaluationResult {
  testId: string;
  testType: 'reading' | 'listening';
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  estimatedBand: number;
  results: {
    questionId: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export function evaluatePracticeAnswers(
  testType: 'reading' | 'listening',
  testId: string,
  userAnswers: Record<string, string>
): PracticeEvaluationResult {
  let questions: { id: string; correctAnswer: string; explanation: string }[] = [];

  if (testType === 'reading') {
    const tests: PracticeReadingTest[] = practiceData.readingTests;
    const found = tests.find((t) => t.id === testId);
    if (!found) {
      throw new Error(`Reading test with id '${testId}' not found.`);
    }
    questions = found.questions;
  } else {
    const tests: PracticeListeningTest[] = practiceData.listeningTests;
    const found = tests.find((t) => t.id === testId);
    if (!found) {
      throw new Error(`Listening test with id '${testId}' not found.`);
    }
    questions = found.questions;
  }

  const results = questions.map((q) => {
    const userAns = (userAnswers[q.id] || '').trim().toLowerCase();
    const correctAns = q.correctAnswer.trim().toLowerCase();
    const isCorrect = userAns === correctAns;

    return {
      questionId: q.id,
      userAnswer: userAnswers[q.id] || '',
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation
    };
  });

  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalQuestions = questions.length;
  const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

  // Band conversion mapping for small mock tests
  let estimatedBand = 4.0;
  if (scorePercentage === 100) estimatedBand = 9.0;
  else if (scorePercentage >= 80) estimatedBand = 8.0;
  else if (scorePercentage >= 65) estimatedBand = 7.0;
  else if (scorePercentage >= 50) estimatedBand = 6.0;
  else if (scorePercentage >= 35) estimatedBand = 5.0;

  return {
    testId,
    testType,
    totalQuestions,
    correctCount,
    scorePercentage,
    estimatedBand,
    results
  };
}
