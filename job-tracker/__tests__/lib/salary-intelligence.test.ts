import {
  parseSalaryString,
  convertToUSD,
  getCostOfLivingData,
  calculateComfortScore,
  getComfortLevel,
  calculateSavingsPotential,
  analyzeSalary,
  formatSalaryRange,
  getComfortColor,
  getComfortIcon,
} from '@/lib/salary-intelligence';

describe('Salary Intelligence', () => {
  describe('parseSalaryString', () => {
    it('should parse USD salary ranges', () => {
      expect(parseSalaryString('$80,000 - $120,000')).toEqual({
        min: 80000,
        max: 120000,
        currency: 'USD'
      });
    });

    it('should parse single USD values', () => {
      expect(parseSalaryString('$100,000')).toEqual({
        min: 100000,
        max: 100000,
        currency: 'USD'
      });
    });

    it('should parse k notation', () => {
      expect(parseSalaryString('80k - 120k USD')).toEqual({
        min: 80000,
        max: 120000,
        currency: 'USD'
      });
    });

    it('should parse hourly rates', () => {
      expect(parseSalaryString('$40/hr')).toEqual({
        min: 83200, // 40 * 2080
        max: 83200,
        currency: 'USD'
      });
    });

    it('should parse monthly rates', () => {
      expect(parseSalaryString('$8,000/month')).toEqual({
        min: 96000, // 8000 * 12
        max: 96000,
        currency: 'USD'
      });
    });

    it('should parse EUR salaries', () => {
      expect(parseSalaryString('€70,000 - €90,000')).toEqual({
        min: 70000,
        max: 90000,
        currency: 'EUR'
      });
    });

    it('should parse GBP salaries', () => {
      expect(parseSalaryString('£50,000 - £70,000')).toEqual({
        min: 50000,
        max: 70000,
        currency: 'GBP'
      });
    });

    it('should handle invalid input', () => {
      expect(parseSalaryString('')).toBeNull();
      expect(parseSalaryString('competitive salary')).toBeNull();
      expect(parseSalaryString('DOE')).toBeNull();
    });
  });

  describe('convertToUSD', () => {
    it('should convert EUR to USD', () => {
      expect(convertToUSD(100000, 'EUR')).toBe(108000);
    });

    it('should convert GBP to USD', () => {
      expect(convertToUSD(100000, 'GBP')).toBe(127000);
    });

    it('should return USD as is', () => {
      expect(convertToUSD(100000, 'USD')).toBe(100000);
    });

    it('should handle unknown currency', () => {
      expect(convertToUSD(100000, 'XYZ')).toBe(100000);
    });
  });

  describe('getCostOfLivingData', () => {
    it('should return NYC data', () => {
      const data = getCostOfLivingData('New York');
      expect(data.city).toBe('New York');
      expect(data.costIndex).toBe(100);
    });

    it('should return SF data', () => {
      const data = getCostOfLivingData('San Francisco');
      expect(data.city).toBe('San Francisco');
      expect(data.costIndex).toBe(95);
    });

    it('should handle partial matches', () => {
      const data = getCostOfLivingData('San Francisco, CA');
      expect(data.city).toBe('San Francisco');
    });

    it('should default to remote for unknown locations', () => {
      const data = getCostOfLivingData('Unknown City');
      expect(data.city).toBe('Remote');
      expect(data.costIndex).toBe(60);
    });

    it('should handle null/undefined location', () => {
      const data = getCostOfLivingData('');
      expect(data.city).toBe('Remote');
    });
  });

  describe('calculateComfortScore', () => {
    it('should calculate struggling score', () => {
      const score = calculateComfortScore(30000, 100); // $30k in NYC
      expect(score).toBeLessThan(20);
      expect(score).toBeGreaterThan(0);
    });

    it('should calculate comfortable score', () => {
      const score = calculateComfortScore(80000, 100); // $80k in NYC
      expect(score).toBeGreaterThan(40);
      expect(score).toBeLessThan(60);
    });

    it('should calculate thriving score', () => {
      const score = calculateComfortScore(130000, 100); // $130k in NYC
      expect(score).toBeGreaterThan(60);
      expect(score).toBeLessThan(80);
    });

    it('should calculate luxurious score', () => {
      const score = calculateComfortScore(200000, 100); // $200k in NYC
      expect(score).toBeGreaterThan(80);
    });

    it('should adjust for cost of living', () => {
      const nycScore = calculateComfortScore(100000, 100);
      const austinScore = calculateComfortScore(100000, 70);
      expect(austinScore).toBeGreaterThan(nycScore);
    });
  });

  describe('getComfortLevel', () => {
    it('should return correct comfort levels', () => {
      expect(getComfortLevel(10)).toBe('struggling');
      expect(getComfortLevel(30)).toBe('tight');
      expect(getComfortLevel(50)).toBe('comfortable');
      expect(getComfortLevel(70)).toBe('thriving');
      expect(getComfortLevel(90)).toBe('luxurious');
    });
  });

  describe('calculateSavingsPotential', () => {
    it('should return zero for low salaries', () => {
      const savings = calculateSavingsPotential(30000, 100);
      expect(savings).toBe(0);
    });

    it('should calculate savings for comfortable salaries', () => {
      const savings = calculateSavingsPotential(80000, 100);
      expect(savings).toBeGreaterThan(0);
      expect(savings).toBeLessThan(50);
    });

    it('should calculate higher savings for high salaries', () => {
      const savings = calculateSavingsPotential(200000, 100);
      expect(savings).toBeGreaterThan(30);
    });

    it('should adjust for cost of living', () => {
      const nycSavings = calculateSavingsPotential(100000, 100);
      const austinSavings = calculateSavingsPotential(100000, 70);
      expect(austinSavings).toBeGreaterThanOrEqual(nycSavings);
    });
  });

  describe('analyzeSalary', () => {
    it('should return full analysis for valid salary', () => {
      const analysis = analyzeSalary('$100,000 - $120,000', 'San Francisco');
      
      expect(analysis).toBeDefined();
      expect(analysis!.originalSalary.currency).toBe('USD');
      expect(analysis!.originalSalary.min).toBe(100000);
      expect(analysis!.originalSalary.max).toBe(120000);
      expect(analysis!.normalizedSalaryUSD.min).toBe(100000);
      expect(analysis!.normalizedSalaryUSD.max).toBe(120000);
      expect(analysis!.costOfLivingAdjusted.min).toBeGreaterThan(100000);
      expect(analysis!.comfortScore).toBeGreaterThan(0);
      expect(analysis!.comfortLevel).toBeDefined();
      expect(analysis!.purchasingPower).toBeGreaterThan(0);
      expect(analysis!.savingsPotential).toBeGreaterThan(0);
      expect(analysis!.betterThanPercent).toBeGreaterThan(0);
    });

    it('should handle EUR salaries', () => {
      const analysis = analyzeSalary('€80,000', 'Berlin');
      
      expect(analysis).toBeDefined();
      expect(analysis!.originalSalary.currency).toBe('EUR');
      expect(analysis!.normalizedSalaryUSD.min).toBe(86400); // 80k * 1.08
    });

    it('should return null for invalid salary', () => {
      const analysis = analyzeSalary('competitive', 'New York');
      expect(analysis).toBeNull();
    });

    it('should return null for undefined salary', () => {
      const analysis = analyzeSalary(undefined, 'New York');
      expect(analysis).toBeNull();
    });

    it('should handle remote location', () => {
      const analysis = analyzeSalary('$100,000', undefined);
      expect(analysis).toBeDefined();
      expect(analysis!.costOfLivingAdjusted.min).toBeGreaterThan(analysis!.normalizedSalaryUSD.min);
    });
  });

  describe('formatSalaryRange', () => {
    it('should format single value', () => {
      expect(formatSalaryRange(100000, 100000, 'USD')).toBe('$100,000');
    });

    it('should format range', () => {
      expect(formatSalaryRange(80000, 120000, 'USD')).toBe('$80,000 - $120,000');
    });

    it('should format EUR', () => {
      expect(formatSalaryRange(80000, 80000, 'EUR')).toBe('€80,000');
    });
  });

  describe('getComfortColor', () => {
    it('should return correct colors', () => {
      expect(getComfortColor('struggling')).toContain('text-red-600');
      expect(getComfortColor('tight')).toContain('text-orange-600');
      expect(getComfortColor('comfortable')).toContain('text-blue-600');
      expect(getComfortColor('thriving')).toContain('text-green-600');
      expect(getComfortColor('luxurious')).toContain('text-purple-600');
    });
  });

  describe('getComfortIcon', () => {
    it('should return correct icons', () => {
      expect(getComfortIcon('struggling')).toBe('😰');
      expect(getComfortIcon('tight')).toBe('😓');
      expect(getComfortIcon('comfortable')).toBe('😊');
      expect(getComfortIcon('thriving')).toBe('😄');
      expect(getComfortIcon('luxurious')).toBe('🤩');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow', () => {
      const testCases = [
        { salary: '$120k', location: 'San Francisco', expectedLevels: ['comfortable', 'thriving'] },
        { salary: '€70,000', location: 'Berlin', expectedLevels: ['comfortable', 'thriving'] },
        { salary: '£60,000', location: 'London', expectedLevels: ['comfortable', 'thriving'] },
        { salary: '$200,000', location: 'New York', expectedLevels: ['luxurious'] },
        { salary: '$40,000', location: 'New York', expectedLevels: ['struggling', 'tight'] },
      ];

      testCases.forEach(({ salary, location, expectedLevels }) => {
        const analysis = analyzeSalary(salary, location);
        expect(analysis).toBeDefined();
        expect(expectedLevels).toContain(analysis!.comfortLevel);
      });
    });

    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        { salary: '$0', location: 'New York' },
        { salary: '$1,000,000', location: 'Remote' },
        { salary: '$50/hr', location: 'Austin' },
        { salary: '₹5,00,000', location: 'Bangalore' },
      ];

      edgeCases.forEach(({ salary, location }) => {
        const analysis = analyzeSalary(salary, location);
        if (analysis) {
          expect(analysis.comfortScore).toBeGreaterThanOrEqual(0);
          expect(analysis.comfortScore).toBeLessThanOrEqual(100);
          expect(analysis.savingsPotential).toBeGreaterThanOrEqual(0);
          expect(analysis.purchasingPower).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });
});