import {
  rawToBandScore,
  roundIeltsBandScore,
  getCefrMapping,
  getBandDescription,
  calculateOverallBandScore,
  calculateTargetPlanner,
  convertToCLB
} from '../../src/utils/bandCalculator';

describe('Band Calculator Utility', () => {
  describe('rawToBandScore', () => {
    it('converts academic reading raw scores accurately', () => {
      expect(rawToBandScore(40, 'academicReading').bandScore).toBe(9.0);
      expect(rawToBandScore(35, 'academicReading').bandScore).toBe(8.0);
      expect(rawToBandScore(30, 'academicReading').bandScore).toBe(7.0);
      expect(rawToBandScore(23, 'academicReading').bandScore).toBe(6.0);
      expect(rawToBandScore(15, 'academicReading').bandScore).toBe(5.0);
      expect(rawToBandScore(0, 'academicReading').bandScore).toBe(0.0);
    });

    it('converts general training reading raw scores accurately', () => {
      expect(rawToBandScore(40, 'generalTrainingReading').bandScore).toBe(9.0);
      expect(rawToBandScore(37, 'generalTrainingReading').bandScore).toBe(8.0);
      expect(rawToBandScore(34, 'generalTrainingReading').bandScore).toBe(7.0);
      expect(rawToBandScore(30, 'generalTrainingReading').bandScore).toBe(6.0);
      expect(rawToBandScore(0, 'generalTrainingReading').bandScore).toBe(0.0);
    });

    it('converts listening raw scores accurately', () => {
      expect(rawToBandScore(39, 'listening').bandScore).toBe(9.0);
      expect(rawToBandScore(35, 'listening').bandScore).toBe(8.0);
      expect(rawToBandScore(30, 'listening').bandScore).toBe(7.0);
      expect(rawToBandScore(23, 'listening').bandScore).toBe(6.0);
    });

    it('throws an error for invalid raw scores', () => {
      expect(() => rawToBandScore(-1, 'academicReading')).toThrow(
        'Raw score must be a number between 0 and 40.'
      );
      expect(() => rawToBandScore(41, 'academicReading')).toThrow(
        'Raw score must be a number between 0 and 40.'
      );
      expect(() => rawToBandScore(NaN, 'academicReading')).toThrow(
        'Raw score must be a number between 0 and 40.'
      );
      // @ts-expect-error testing invalid type input
      expect(() => rawToBandScore('abc', 'academicReading')).toThrow(
        'Raw score must be a number between 0 and 40.'
      );
    });

    it('handles fallback if testType has no match or custom testType', () => {
      // @ts-expect-error testing unknown test type fallback
      const result = rawToBandScore(20, 'unknownType');
      expect(result.bandScore).toBe(0);
      expect(result.scaleDescription).toBe('unknownType');
    });
  });

  describe('roundIeltsBandScore', () => {
    it('rounds edge values <= 0 and >= 9.0', () => {
      expect(roundIeltsBandScore(-2)).toBe(0.0);
      expect(roundIeltsBandScore(0)).toBe(0.0);
      expect(roundIeltsBandScore(9.0)).toBe(9.0);
      expect(roundIeltsBandScore(9.5)).toBe(9.0);
    });

    it('rounds fractions < 0.25 down to the nearest whole band', () => {
      expect(roundIeltsBandScore(6.125)).toBe(6.0);
      expect(roundIeltsBandScore(7.24)).toBe(7.0);
    });

    it('rounds fractions between 0.25 and 0.74 to 0.5', () => {
      expect(roundIeltsBandScore(6.25)).toBe(6.5);
      expect(roundIeltsBandScore(6.375)).toBe(6.5);
      expect(roundIeltsBandScore(6.5)).toBe(6.5);
      expect(roundIeltsBandScore(6.625)).toBe(6.5);
      expect(roundIeltsBandScore(6.74)).toBe(6.5);
    });

    it('rounds fractions >= 0.75 up to the next whole band', () => {
      expect(roundIeltsBandScore(6.75)).toBe(7.0);
      expect(roundIeltsBandScore(6.875)).toBe(7.0);
    });
  });

  describe('getCefrMapping', () => {
    it('returns correct CEFR level for various bands', () => {
      expect(getCefrMapping(9.0).cefrLevel).toBe('C2');
      expect(getCefrMapping(7.5).cefrLevel).toBe('C1');
      expect(getCefrMapping(6.0).cefrLevel).toBe('B2');
      expect(getCefrMapping(4.5).cefrLevel).toBe('B1');
      expect(getCefrMapping(3.0).cefrLevel).toBe('A1-A2');
      expect(getCefrMapping(-1).cefrLevel).toBe('A1-A2');
    });
  });

  describe('getBandDescription', () => {
    it('returns the appropriate descriptor for each band tier', () => {
      expect(getBandDescription(9.0)).toContain('Expert User');
      expect(getBandDescription(8.5)).toContain('Very Good User');
      expect(getBandDescription(7.0)).toContain('Good User');
      expect(getBandDescription(6.5)).toContain('Competent User');
      expect(getBandDescription(5.0)).toContain('Modest User');
      expect(getBandDescription(4.0)).toContain('Limited User');
      expect(getBandDescription(3.0)).toContain('Extremely Limited User');
      expect(getBandDescription(2.0)).toContain('Intermittent User');
      expect(getBandDescription(1.0)).toContain('Non-User');
      expect(getBandDescription(0.0)).toContain('Did not attempt');
    });
  });

  describe('calculateOverallBandScore', () => {
    it('calculates exact average and rounded overall band', () => {
      const result = calculateOverallBandScore({
        listening: 6.5,
        reading: 6.5,
        writing: 5.0,
        speaking: 7.0
      });
      // (6.5 + 6.5 + 5.0 + 7.0) / 4 = 25.0 / 4 = 6.25 -> rounded to 6.5
      expect(result.exactAverage).toBe(6.25);
      expect(result.overallBandScore).toBe(6.5);
      expect(result.cefrLevel).toBe('B2');
      expect(result.skillBreakdown.length).toBe(4);
    });

    it('throws on out-of-range or invalid subscores', () => {
      expect(() =>
        calculateOverallBandScore({
          listening: 10.0,
          reading: 6.5,
          writing: 5.0,
          speaking: 7.0
        })
      ).toThrow('Score for listening must be a number between 0.0 and 9.0.');

      expect(() =>
        calculateOverallBandScore({
          listening: 6.5,
          reading: -1,
          writing: 5.0,
          speaking: 7.0
        })
      ).toThrow('Score for reading must be a number between 0.0 and 9.0.');

      expect(() =>
        calculateOverallBandScore({
          listening: 6.3,
          reading: 6.5,
          writing: 5.0,
          speaking: 7.0
        })
      ).toThrow('Score for listening must be in increments of 0.5');
    });
  });

  describe('calculateTargetPlanner', () => {
    it('calculates required subscores when partial scores are provided', () => {
      const result = calculateTargetPlanner(7.0, {
        listening: 7.0,
        reading: 7.0
      });
      expect(result.achievable).toBe(true);
      expect(result.remainingSkillsCount).toBe(2);
      expect(result.requiredAverageForRemaining).toBe(6.5);
      expect(result.notes).toContain('You need an average of 6.5');
    });

    it('detects when target is already achieved with 4 skills provided', () => {
      const result = calculateTargetPlanner(7.0, {
        listening: 7.5,
        reading: 7.0,
        writing: 7.0,
        speaking: 6.5
      });
      expect(result.achievable).toBe(true);
      expect(result.remainingSkillsCount).toBe(0);
      expect(result.notes).toContain('Target achieved!');
    });

    it('detects when 4 skills provided fall short of target', () => {
      const result = calculateTargetPlanner(8.0, {
        listening: 6.0,
        reading: 6.0,
        writing: 6.0,
        speaking: 6.0
      });
      expect(result.achievable).toBe(false);
      expect(result.notes).toContain('below target 8');
    });

    it('detects when target is mathematically unachievable', () => {
      const result = calculateTargetPlanner(9.0, {
        listening: 5.0,
        reading: 5.0,
        writing: 5.0
      });
      expect(result.achievable).toBe(false);
      expect(result.notes).toContain('mathematically unachievable');
    });

    it('throws on invalid target overall score', () => {
      expect(() => calculateTargetPlanner(10, {})).toThrow(
        'Target overall score must be a number between 1.0 and 9.0.'
      );
      expect(() => calculateTargetPlanner(NaN, {})).toThrow(
        'Target overall score must be a number between 1.0 and 9.0.'
      );
    });
  });

  describe('convertToCLB', () => {
    it('accurately converts IELTS scores to Canadian Language Benchmark (CLB) levels', () => {
      const result = convertToCLB({
        listening: 8.5,
        reading: 8.0,
        writing: 7.5,
        speaking: 7.5
      });
      expect(result.reading.clbLevel).toBe(10);
      expect(result.listening.clbLevel).toBe(10);
      expect(result.writing.clbLevel).toBe(10);
      expect(result.speaking.clbLevel).toBe(10);
      expect(result.minimumClbLevel).toBe(10);
      expect(result.expressEntryEligible).toBe(true);
    });

    it('handles lower scores and determines non-eligibility for Express Entry (< CLB 7)', () => {
      const result = convertToCLB({
        listening: 5.5,
        reading: 5.0,
        writing: 5.5,
        speaking: 5.5
      });
      expect(result.minimumClbLevel).toBe(6);
      expect(result.expressEntryEligible).toBe(false);
    });

    it('handles scores below CLB 4 threshold', () => {
      const result = convertToCLB({
        listening: 3.0,
        reading: 3.0,
        writing: 3.0,
        speaking: 2.0
      });
      expect(result.speaking.clbLevel).toBe(0);
      expect(result.reading.clbLevel).toBe(3);
      expect(result.minimumClbLevel).toBe(0);
      expect(result.expressEntryEligible).toBe(false);
    });
  });
});
