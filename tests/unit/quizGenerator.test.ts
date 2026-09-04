import {
  shuffleArray,
  generateVocabularyQuiz,
  generateFlashcards,
  evaluatePracticeAnswers
} from '../../src/utils/quizGenerator';

describe('Quiz Generator Utility', () => {
  describe('shuffleArray', () => {
    it('returns an array with the same elements', () => {
      const original = [1, 2, 3, 4, 5, 6];
      const shuffled = shuffleArray(original);
      expect(shuffled.length).toBe(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
    });
  });

  describe('generateVocabularyQuiz', () => {
    it('generates multipleChoice questions with defaults', () => {
      const quiz = generateVocabularyQuiz();
      expect(quiz.length).toBe(10);
      expect(quiz[0].options.length).toBe(4);
      expect(quiz[0].options).toContain(quiz[0].correctAnswer);
      expect(quiz[0].question).toContain('What is the meaning of the IELTS vocabulary word');
    });

    it('generates definitionMatch quiz questions', () => {
      const quiz = generateVocabularyQuiz(5, 1, 'definitionMatch');
      expect(quiz.length).toBe(5);
      expect(quiz[0].question).toContain('Which word matches the following explanation:');
      expect(quiz[0].options).toContain(quiz[0].correctAnswer);
    });

    it('generates phoneticMatch quiz questions', () => {
      const quiz = generateVocabularyQuiz(5, 2, 'phoneticMatch');
      expect(quiz.length).toBe(5);
      expect(quiz[0].question).toContain('What is the correct IPA phonetic transcription');
      expect(quiz[0].options).toContain(quiz[0].correctAnswer);
    });

    it('handles count bounds and invalid chapter parameters', () => {
      const smallQuiz = generateVocabularyQuiz(-5, 999);
      expect(smallQuiz.length).toBe(10);

      const largeQuiz = generateVocabularyQuiz(100, '5');
      expect(largeQuiz.length).toBe(50);
    });
  });

  describe('generateFlashcards', () => {
    it('generates flashcards with word, phonetic, and hints', () => {
      const cards = generateFlashcards(5, 1);
      expect(cards.length).toBe(5);
      expect(cards[0].word).toBeDefined();
      expect(cards[0].phonetic).toBeDefined();
      expect(cards[0].explanation).toBeDefined();
      expect(cards[0].hint).toBeDefined();
    });

    it('handles bounds and string parameter parsing', () => {
      const cards = generateFlashcards('3', '2');
      expect(cards.length).toBe(3);

      const defaultCards = generateFlashcards(-1, 'invalid');
      expect(defaultCards.length).toBe(10);

      const maxCards = generateFlashcards(200, 1);
      expect(maxCards.length).toBe(50);
    });
  });

  describe('evaluatePracticeAnswers', () => {
    it('evaluates reading test answers with perfect score', () => {
      const result = evaluatePracticeAnswers('reading', 'read-test-001', {
        q1: 'TRUE',
        q2: 'B',
        q3: 'C'
      });
      expect(result.testType).toBe('reading');
      expect(result.correctCount).toBe(3);
      expect(result.scorePercentage).toBe(100);
      expect(result.estimatedBand).toBe(9.0);
    });

    it('evaluates reading test 3 with 4 out of 5 correct (80%, Band 8.0)', () => {
      const result = evaluatePracticeAnswers('reading', 'read-test-003', {
        rq1: 'TRUE',
        rq2: 'TRUE',
        rq3: 'TRUE',
        rq4: 'FALSE',
        rq5: 'WRONG_ANSWER'
      });
      expect(result.correctCount).toBe(4);
      expect(result.scorePercentage).toBe(80);
      expect(result.estimatedBand).toBe(8.0);
    });

    it('evaluates reading test with 2 out of 3 correct (~67%, Band 7.0)', () => {
      const result = evaluatePracticeAnswers('reading', 'read-test-001', {
        q1: 'TRUE',
        q2: 'B',
        q3: 'WRONG'
      });
      expect(result.correctCount).toBe(2);
      expect(result.scorePercentage).toBe(67);
      expect(result.estimatedBand).toBe(7.0);
    });

    it('evaluates reading test 2 with 1 out of 2 correct (50%, Band 6.0)', () => {
      const result = evaluatePracticeAnswers('reading', 'read-test-002', {
        q1: 'FALSE',
        q2: 'WRONG'
      });
      expect(result.correctCount).toBe(1);
      expect(result.scorePercentage).toBe(50);
      expect(result.estimatedBand).toBe(6.0);
    });

    it('evaluates reading test 3 with 2 out of 5 correct (40%, Band 5.0) and missing answers', () => {
      const result = evaluatePracticeAnswers('reading', 'read-test-003', {
        rq1: 'TRUE',
        rq2: 'TRUE'
        // rq3, rq4, rq5 omitted to test undefined lookup in userAnswers
      });
      expect(result.correctCount).toBe(2);
      expect(result.scorePercentage).toBe(40);
      expect(result.estimatedBand).toBe(5.0);
    });

    it('evaluates listening test answers and handles intermediate scores', () => {
      const result = evaluatePracticeAnswers('listening', 'listen-test-001', {
        lq1: '450',
        lq2: 'A' // wrong answer
      });
      expect(result.testType).toBe('listening');
      expect(result.correctCount).toBe(1);
      expect(result.totalQuestions).toBe(2);
      expect(result.scorePercentage).toBe(50);
      expect(result.estimatedBand).toBe(6.0);
      expect(result.results[0].isCorrect).toBe(true);
      expect(result.results[1].isCorrect).toBe(false);
    });

    it('handles lower score brackets', () => {
      const resultLow = evaluatePracticeAnswers('reading', 'read-test-001', {
        q1: 'FALSE',
        q2: 'A',
        q3: 'D'
      });
      expect(resultLow.correctCount).toBe(0);
      expect(resultLow.scorePercentage).toBe(0);
      expect(resultLow.estimatedBand).toBe(4.0);
    });

    it('throws error for non-existent reading or listening tests', () => {
      expect(() => evaluatePracticeAnswers('reading', 'non-existent-id', {})).toThrow(
        "Reading test with id 'non-existent-id' not found."
      );
      expect(() => evaluatePracticeAnswers('listening', 'non-existent-id', {})).toThrow(
        "Listening test with id 'non-existent-id' not found."
      );
    });
  });
});
