import { analyzeEssay } from '../../src/utils/essayAnalyzer';

describe('Essay Analyzer Utility', () => {
  const highScoringEssay = `The swift rise of artificial intelligence and automated systems is reshaping the modern labor landscape. While some critics argue that automation exacerbates unemployment, I firmly believe that the long-term benefits in terms of productivity, safety, and innovation significantly outweigh the immediate drawbacks.

On the one hand, technological displacement undeniably creates short-term friction in the workforce. Routine manual tasks are increasingly delegated to intelligent algorithms, which can lead to redundancy among low-skilled laborers who may struggle to transition into technical industries. Furthermore, the rapid pace of digital transformation can leave educational systems lagging behind. Consequently, governments must invest substantially in retraining programs.

On the other hand, the advantages of artificial intelligence are transformative. Firstly, AI dramatically enhances operational efficiency and eradicates human error in high-precision domains, such as surgical medicine, aeronautics, and manufacturing. Secondly, historical precedents illustrate that technological revolutions inevitably generate entirely new industries and professions. Ultimately, this shifts human employment toward creative problem-solving and interpersonal roles.

In conclusion, although the automation wave introduces legitimate challenges regarding job transition, its capacity to elevate overall human living standards ensures that its advantages are far more substantial than its negative impacts.`;

  it('accurately analyzes a full Band 8+ essay', () => {
    const analysis = analyzeEssay(highScoringEssay, 'task2');

    expect(analysis.metrics.wordCount).toBeGreaterThan(180);
    expect(analysis.metrics.paragraphCount).toBe(4);
    expect(analysis.metrics.sentenceCount).toBeGreaterThan(5);
    expect(analysis.metrics.readingTimeMinutes).toBeGreaterThan(0);

    expect(analysis.cohesionAndTransitions.totalCohesiveDevicesFound).toBeGreaterThan(3);
    expect(analysis.cohesionAndTransitions.detectedDevicesByCategory).toBeDefined();

    expect(analysis.lexicalResource.uniqueWordsCount).toBeGreaterThan(50);
    expect(analysis.lexicalResource.lexicalRichnessRatio).toBeGreaterThan(0.3);

    expect(analysis.readability.fleschReadingEase).toBeGreaterThanOrEqual(0);
    expect(analysis.readability.fleschKincaidGradeLevel).toBeGreaterThanOrEqual(0);
    expect(analysis.readability.readabilityLevel).toBeDefined();

    expect(analysis.bandEstimation.taskTypeAssumed).toBe('task2');
    expect(analysis.bandEstimation.wordCountStatus).toBe('insufficient');
    expect(analysis.bandEstimation.feedback.length).toBeGreaterThan(0);
  });

  it('handles Task 1 essays with optimal word counts', () => {
    const task1Sample = `The line graph illustrates renewable power trends over a decade. Overall, solar power experienced an exponential upward trajectory. In contrast, coal generation declined sharply. Consequently, clean energy dominated the domestic grid by the end of the timeline.`;
    const analysis = analyzeEssay(task1Sample, 'task1');

    expect(analysis.bandEstimation.taskTypeAssumed).toBe('task1');
    expect(analysis.metrics.paragraphCount).toBe(1);
    expect(analysis.bandEstimation.wordCountStatus).toBe('insufficient');
    expect(
      analysis.bandEstimation.feedback.some((f) => f.includes('below the recommended minimum'))
    ).toBe(true);
  });

  it('handles optimal and adequate word count ranges for task 2', () => {
    // Optimal: 270 words (250 <= wordCount <= 330)
    const optimalWords = Array.from({ length: 270 }, (_, i) => `word${i}`).join(' ');
    const essayOptimal = `${optimalWords}.\n\nParagraph two.\n\nParagraph three.`;
    const analysisOpt = analyzeEssay(essayOptimal, 'task2');
    expect(analysisOpt.bandEstimation.wordCountStatus).toBe('optimal');

    // Adequate: 380 words (330 < wordCount <= 450)
    const adequateWords = Array.from({ length: 380 }, (_, i) => `word${i}`).join(' ');
    const essayAdequate = `${adequateWords}.\n\nParagraph two.\n\nParagraph three.`;
    const analysisAdequate = analyzeEssay(essayAdequate, 'task2');
    expect(analysisAdequate.bandEstimation.wordCountStatus).toBe('adequate');
  });

  it('evaluates excessive word counts', () => {
    const longWords = Array.from({ length: 500 }, (_, i) => `word${i}`).join(' ');
    const longEssay = `${longWords}.\n\nSecond paragraph here.\n\nThird paragraph here.`;
    const analysis = analyzeEssay(longEssay, 'task2');
    expect(analysis.bandEstimation.wordCountStatus).toBe('excessive');
  });

  it('handles essays with short average sentence lengths and low cohesion', () => {
    const shortSentences = `I like cat. You like dog. He likes cow. She likes bird. We like zoo. They like park.`;
    const analysis = analyzeEssay(shortSentences, 'task2');
    expect(
      analysis.bandEstimation.feedback.some((f) => f.includes('Sentences are relatively short'))
    ).toBe(true);
    expect(
      analysis.bandEstimation.feedback.some((f) => f.includes('Incorporate more cohesive linkers'))
    ).toBe(true);
  });

  it('handles essays with very long convoluted sentences', () => {
    const longSentence = `Because the unprecedented speed of contemporary industrialization has introduced manifold ecological complications throughout both terrestrial habitats and oceanic biospheres, global policymakers must aggressively enact sweeping legislative mandates that strictly regulate carbon emissions and simultaneously disincentivize unsustainable corporate operations across all multinational manufacturing entities immediately without delay or compromise.`;
    const analysis = analyzeEssay(longSentence, 'task2');
    expect(analysis.bandEstimation.feedback.some((f) => f.includes('overly convoluted'))).toBe(
      true
    );
  });

  it('covers all readability ease levels and syllable counting variations', () => {
    // Level 1: Fairly Easy / Conversational (>= 70)
    const easyText = `The teacher explained the new lesson clearly to all the students in the class today.`;
    const analysisEasy = analyzeEssay(easyText, 'task2');
    expect(analysisEasy.readability.readabilityLevel).toBe('Fairly Easy / Conversational');

    // Level 2: Standard / Academic (50 - 70)
    const standardText = `We went to the grocery market to purchase fresh fruits, vegetables, and milk for breakfast.`;
    const analysisStandard = analyzeEssay(standardText, 'task2');
    expect(analysisStandard.readability.readabilityLevel).toBe('Standard / Academic');

    // Level 3: Fairly Difficult / Advanced Academic (30 - 50)
    const fairlyDiffText = `Children often play games outside after finishing their homework in the afternoon.`;
    const analysisFairlyDiff = analyzeEssay(fairlyDiffText, 'task2');
    expect(analysisFairlyDiff.readability.readabilityLevel).toBe(
      'Fairly Difficult / Advanced Academic'
    );

    // Level 4: Very Difficult / Scholarly (< 30)
    const difficultText = `Epistemological hermeneutics and multi-dimensional socio-behavioral institutionalization necessitate comprehensive structural operationalization methodologies.`;
    const analysisDiff = analyzeEssay(difficultText, 'task2');
    expect(analysisDiff.readability.readabilityLevel).toBe('Very Difficult / Scholarly');

    // Edge words without regular vowels like "nthl" or "rhythms" to test fallback in syllable counter
    const oddWords = `The rhythm of nthl and sync in lynx is advantageous and deleterious.`;
    const oddAnalysis = analyzeEssay(oddWords, 'task2');
    expect(oddAnalysis.metrics.wordCount).toBeGreaterThan(0);

    // Repetitive text testing lexicalRichnessRatio < 0.45 branch
    const repetitiveText = `Good good good good good good good good good good good good good good good good good good good good good good good good good good good good good good.`;
    const repetitiveAnalysis = analyzeEssay(repetitiveText, 'task2');
    expect(repetitiveAnalysis.lexicalResource.lexicalRichnessRatio).toBeLessThan(0.45);
  });

  it('covers Band 9.0 ceiling evaluation with high lexical richness and optimal metrics', () => {
    const perfectTask1 = `The chart shows data about clean energy over three decades, and green power made monumental and paramount gains while coal use saw a deleterious fall across all four major regions.

At first, solar power gave low output, but coal gave most power to cities. Furthermore, leaders chose old fuel for cost reasons. Moreover, high costs diminished early use, but good rules facilitated growth across modern towns and urban centers.

Next, fresh ideas catalyzed substantial gains in solar and wind power. Consequently, clean power grew fast, and this substantiated new grid systems and eradicated bad waste. In addition, green energy became advantageous for all people who generate clean power.

In conclusion, the facts show big shifts to green grids, and clean power is paramount and advantageous for humanity. In summary, green energy flourished, and it provides comprehensive clean air and good jobs for all workers in the country now. Overall, modern systems improve daily lives and boost prosperity.`;

    const analysis = analyzeEssay(perfectTask1, 'task1');
    expect(analysis.bandEstimation.estimatedBandRange).toBe('Band 9.0');
    expect(analysis.bandEstimation.feedback).toContain(
      'Good demonstration of sophisticated academic vocabulary.'
    );
  });

  it('throws an error for empty or invalid inputs', () => {
    expect(() => analyzeEssay('')).toThrow('Essay text cannot be empty.');
    expect(() => analyzeEssay('   \n\t  ')).toThrow('Essay text cannot be empty.');
    // @ts-expect-error testing invalid argument type
    expect(() => analyzeEssay(null)).toThrow('Essay text cannot be empty.');
  });
});
