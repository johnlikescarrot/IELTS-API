import writingData from '../data/writing.json';
import { EssayAnalysisResult } from '../types';

function countSyllablesInWord(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length <= 3) return 1;
  const replaced = clean
    .replace(/(?:[^laeiouy]|ed|es|e)$/, '')
    .replace(/^y/, '')
    .match(/[aeiouy]{1,2}/g);
  return replaced ? replaced.length : 1;
}

export function analyzeEssay(
  essayText: string,
  expectedTask: 'task1' | 'task2' = 'task2'
): EssayAnalysisResult {
  if (!essayText || typeof essayText !== 'string' || essayText.trim().length === 0) {
    throw new Error('Essay text cannot be empty.');
  }

  const rawText = essayText.trim();

  // Paragraphs
  const paragraphs = rawText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const paragraphCount = Math.max(1, paragraphs.length);

  // Words & Sentences
  const rawWords = rawText
    .split(/\s+/)
    .map((w) => w.replace(/^[^\w]+|[^\w]+$/g, ''))
    .filter((w) => w.length > 0);
  const wordCount = rawWords.length;

  const sentences = rawText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  const averageSentenceLength = Math.round((wordCount / sentenceCount) * 10) / 10;
  const totalCharactersInWords = rawWords.reduce((acc, w) => acc + w.length, 0);
  const averageWordLength = Math.round((totalCharactersInWords / wordCount) * 10) / 10;
  const readingTimeMinutes = Math.round((wordCount / 200) * 10) / 10;

  // Syllables calculation for readability
  const totalSyllables = rawWords.reduce((acc, w) => acc + countSyllablesInWord(w), 0);
  const syllablesPerWord = totalSyllables / wordCount;
  const wordsPerSentence = wordCount / sentenceCount;

  // Flesch Reading Ease: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
  let fleschReadingEase = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  fleschReadingEase = Math.round(Math.max(0, Math.min(100, fleschReadingEase)) * 10) / 10;

  // Flesch-Kincaid Grade Level: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
  let fleschKincaidGradeLevel = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
  fleschKincaidGradeLevel = Math.round(Math.max(0, fleschKincaidGradeLevel) * 10) / 10;

  let readabilityLevel = 'Standard';
  if (fleschReadingEase >= 70) readabilityLevel = 'Fairly Easy / Conversational';
  else if (fleschReadingEase >= 50) readabilityLevel = 'Standard / Academic';
  else if (fleschReadingEase >= 30) readabilityLevel = 'Fairly Difficult / Advanced Academic';
  else readabilityLevel = 'Very Difficult / Scholarly';

  // Cohesion & Transition analysis
  const cohesiveMap: Record<string, string[]> = writingData.cohesiveDevices;
  const lowerText = rawText.toLowerCase();
  const detectedDevicesByCategory: Record<string, string[]> = {};
  let totalCohesiveDevicesFound = 0;

  for (const [category, devices] of Object.entries(cohesiveMap)) {
    const found: string[] = [];
    for (const device of devices) {
      const regex = new RegExp(`\\b${device.toLowerCase()}\\b`, 'gi');
      if (regex.test(lowerText)) {
        found.push(device);
        totalCohesiveDevicesFound++;
      }
    }
    if (found.length > 0) {
      detectedDevicesByCategory[category] = found;
    }
  }

  const cohesiveDensityPercentage = Math.round((totalCohesiveDevicesFound / sentenceCount) * 100);

  // Lexical Resource Analysis
  const uniqueWords = new Set(rawWords.map((w) => w.toLowerCase()));
  const uniqueWordsCount = uniqueWords.size;
  const lexicalRichnessRatio = Math.round((uniqueWordsCount / wordCount) * 100) / 100;

  const tiers = writingData.vocabularyTiers;
  const band6WordsFound = tiers.band6.filter((w) => uniqueWords.has(w.toLowerCase()));
  const band7WordsFound = tiers.band7.filter((w) => uniqueWords.has(w.toLowerCase()));
  const band8PlusWordsFound = tiers.band8Plus.filter((w) => uniqueWords.has(w.toLowerCase()));

  // Word count evaluation
  const minRequiredWords = expectedTask === 'task1' ? 150 : 250;
  let wordCountStatus: 'insufficient' | 'adequate' | 'optimal' | 'excessive' = 'adequate';
  if (wordCount < minRequiredWords) {
    wordCountStatus = 'insufficient';
  } else if (wordCount <= minRequiredWords + 80) {
    wordCountStatus = 'optimal';
  } else if (wordCount <= minRequiredWords + 200) {
    wordCountStatus = 'adequate';
  } else {
    wordCountStatus = 'excessive';
  }

  // Band Estimation Heuristics
  let scorePoints = 5.0;

  // Length points
  if (wordCount >= minRequiredWords) scorePoints += 0.5;
  if (wordCount >= minRequiredWords + 30) scorePoints += 0.5;

  // Paragraph structure
  if (paragraphCount >= 3 && paragraphCount <= 5) scorePoints += 0.5;

  // Cohesive devices
  if (totalCohesiveDevicesFound >= 3) scorePoints += 0.5;
  if (totalCohesiveDevicesFound >= 6) scorePoints += 0.5;

  // Lexical richness & advanced vocab
  if (lexicalRichnessRatio >= 0.45) scorePoints += 0.5;
  if (band7WordsFound.length + band8PlusWordsFound.length >= 2) scorePoints += 0.5;
  if (band8PlusWordsFound.length >= 2) scorePoints += 0.5;

  // Sentence complexity
  if (averageSentenceLength >= 15 && averageSentenceLength <= 26) scorePoints += 0.5;

  scorePoints = Math.min(9.0, Math.max(4.0, scorePoints));
  const lowerBand = Math.floor(scorePoints * 2) / 2;
  const upperBand = Math.min(9.0, lowerBand + 0.5);
  const estimatedBandRange =
    lowerBand === upperBand
      ? `Band ${lowerBand.toFixed(1)}`
      : `Band ${lowerBand.toFixed(1)} - ${upperBand.toFixed(1)}`;

  // Constructive feedback points
  const feedback: string[] = [];
  if (wordCount < minRequiredWords) {
    feedback.push(
      `Word count is ${wordCount}, below the recommended minimum of ${minRequiredWords} words for ${expectedTask.toUpperCase()}. Aim to expand ideas.`
    );
  } else {
    feedback.push(`Word count meets the threshold of ${minRequiredWords}+ words.`);
  }

  if (paragraphCount < 3) {
    feedback.push(
      'Your essay needs clearer paragraph segmentation (Introduction, Body Paragraphs, and Conclusion).'
    );
  } else {
    feedback.push(`Effective paragraph structure with ${paragraphCount} distinct sections.`);
  }

  if (totalCohesiveDevicesFound < 3) {
    feedback.push(
      'Incorporate more cohesive linkers (e.g., Furthermore, However, Consequently, In conclusion) to strengthen logical flow.'
    );
  } else {
    feedback.push(
      `Good utilization of cohesive devices across ${Object.keys(detectedDevicesByCategory).length} semantic categories.`
    );
  }

  if (band7WordsFound.length + band8PlusWordsFound.length === 0) {
    feedback.push(
      'Try upgrading basic words with academic synonyms (e.g., change "important" to "crucial/paramount", "help" to "facilitate").'
    );
  } else {
    feedback.push('Good demonstration of sophisticated academic vocabulary.');
  }

  if (averageSentenceLength < 12) {
    feedback.push(
      'Sentences are relatively short; combine ideas using relative clauses, participle clauses, and subordinate conjunctions.'
    );
  } else if (averageSentenceLength > 30) {
    feedback.push(
      'Some sentences are overly convoluted. Keep complex sentences clear and concise to avoid grammatical slips.'
    );
  }

  return {
    metrics: {
      wordCount,
      sentenceCount,
      paragraphCount,
      averageSentenceLength,
      averageWordLength,
      readingTimeMinutes
    },
    cohesionAndTransitions: {
      totalCohesiveDevicesFound,
      cohesiveDensityPercentage,
      detectedDevicesByCategory
    },
    lexicalResource: {
      lexicalRichnessRatio,
      uniqueWordsCount,
      band6WordsFound,
      band7WordsFound,
      band8PlusWordsFound
    },
    readability: {
      fleschReadingEase,
      fleschKincaidGradeLevel,
      readabilityLevel
    },
    bandEstimation: {
      estimatedBandRange,
      taskTypeAssumed: expectedTask,
      wordCountStatus,
      feedback
    }
  };
}
