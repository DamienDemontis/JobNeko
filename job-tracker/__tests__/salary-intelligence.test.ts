import { 
  parseSalaryString, 
  convertToUSDSync, 
  analyzeSalarySync, 
  getCostOfLivingData,
  calculateComfortScore,
  getComfortLevel,
  formatSalaryRange
} from '../lib/salary-intelligence';

// Mock fetch for currency API tests
global.fetch = jest.fn();

describe('Salary Intelligence Core Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseSalaryString', () => {
    test('parses USD salary range correctly', () => {
      const result = parseSalaryString('$80,000 - $120,000 per year');
      expect(result).toEqual({
        min: 80000,
        max: 120000,
        currency: 'USD'
      });
    });

    test('parses single salary value', () => {
      const result = parseSalaryString('$100,000 annually');
      expect(result).toEqual({
        min: 100000,
        max: 100000,
        currency: 'USD'
      });
    });

    test('parses hourly rate and converts to annual', () => {
      const result = parseSalaryString('$50 per hour');
      expect(result).toEqual({
        min: 104000, // 50 * 2080
        max: 104000,
        currency: 'USD'
      });
    });

    test('parses monthly salary and converts to annual', () => {
      const result = parseSalaryString('$8,000 per month');
      expect(result).toEqual({
        min: 96000, // 8000 * 12
        max: 96000,
        currency: 'USD'
      });
    });

    test('parses different currencies', () => {
      const eurResult = parseSalaryString('€60,000 - €80,000');
      expect(eurResult?.currency).toBe('EUR');

      const gbpResult = parseSalaryString('£45,000 - £55,000');
      expect(gbpResult?.currency).toBe('GBP');

      const jpyResult = parseSalaryString('¥5,000,000 - ¥7,000,000');
      expect(jpyResult?.currency).toBe('JPY');
    });

    test('handles k notation', () => {
      const result = parseSalaryString('$80k - $120k');
      expect(result).toEqual({
        min: 80000,
        max: 120000,
        currency: 'USD'
      });
    });

    test('returns null for invalid input', () => {
      expect(parseSalaryString('')).toBeNull();
      expect(parseSalaryString('Competitive salary')).toBeNull();
      expect(parseSalaryString('TBD')).toBeNull();
    });

    test('handles currency codes', () => {
      const result = parseSalaryString('USD 70000 - USD 90000');
      expect(result?.currency).toBe('USD');

      const cadResult = parseSalaryString('CAD 85,000 - CAD 110,000');
      expect(cadResult?.currency).toBe('CAD');
    });
  });

  describe('convertToUSDSync', () => {
    test('converts USD to USD (no change)', () => {
      const result = convertToUSDSync(100000, 'USD');
      expect(result).toBe(100000);
    });

    test('converts EUR to USD using fallback rates', () => {
      const result = convertToUSDSync(100000, 'EUR');
      expect(result).toBe(108000); // 100000 * 1.08
    });

    test('converts GBP to USD using fallback rates', () => {
      const result = convertToUSDSync(100000, 'GBP');
      expect(result).toBe(127000); // 100000 * 1.27
    });

    test('handles unknown currency with fallback to 1.0', () => {
      const result = convertToUSDSync(100000, 'XYZ');
      expect(result).toBe(100000);
    });
  });

  describe('getCostOfLivingData', () => {
    test('returns NYC data for "new york"', () => {
      const result = getCostOfLivingData('New York');
      expect(result.city).toBe('New York');
      expect(result.costIndex).toBe(100);
    });

    test('returns San Francisco data for "san francisco"', () => {
      const result = getCostOfLivingData('San Francisco, CA');
      expect(result.city).toBe('San Francisco');
      expect(result.costIndex).toBe(95);
    });

    test('returns remote data for unrecognized location', () => {
      const result = getCostOfLivingData('Unknown City');
      expect(result.city).toBe('Remote');
      expect(result.costIndex).toBe(60);
    });

    test('handles partial matches', () => {
      const result = getCostOfLivingData('Austin, Texas, USA');
      expect(result.city).toBe('Austin');
    });

    test('defaults to remote when location is empty', () => {
      const result = getCostOfLivingData('');
      expect(result.city).toBe('Remote');
    });
  });

  describe('calculateComfortScore', () => {
    test('calculates struggling score for low salary', () => {
      const score = calculateComfortScore(35000, 100); // Low salary in NYC
      expect(score).toBeLessThan(20);
      expect(score).toBeGreaterThan(0);
    });

    test('calculates comfortable score for middle salary', () => {
      const score = calculateComfortScore(80000, 100); // Middle salary in NYC
      expect(score).toBeGreaterThanOrEqual(40);
      expect(score).toBeLessThan(60);
    });

    test('calculates thriving score for high salary', () => {
      const score = calculateComfortScore(140000, 100); // High salary in NYC
      expect(score).toBeGreaterThanOrEqual(60);
      expect(score).toBeLessThan(80);
    });

    test('adjusts for low cost of living areas', () => {
      const nycScore = calculateComfortScore(80000, 100);
      const lowCostScore = calculateComfortScore(80000, 60); // Lower cost area
      expect(lowCostScore).toBeGreaterThan(nycScore);
    });

    test('adjusts for high cost of living areas', () => {
      const nycScore = calculateComfortScore(80000, 100);
      const highCostScore = calculateComfortScore(80000, 150); // Higher cost area
      expect(highCostScore).toBeLessThan(nycScore);
    });

    test('caps score at 100', () => {
      const score = calculateComfortScore(500000, 100);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('getComfortLevel', () => {
    test('returns correct levels for different scores', () => {
      expect(getComfortLevel(10)).toBe('struggling');
      expect(getComfortLevel(30)).toBe('tight');
      expect(getComfortLevel(50)).toBe('comfortable');
      expect(getComfortLevel(70)).toBe('thriving');
      expect(getComfortLevel(90)).toBe('luxurious');
    });

    test('handles boundary values correctly', () => {
      expect(getComfortLevel(19.9)).toBe('struggling');
      expect(getComfortLevel(20)).toBe('tight');
      expect(getComfortLevel(39.9)).toBe('tight');
      expect(getComfortLevel(40)).toBe('comfortable');
    });
  });

  describe('formatSalaryRange', () => {
    test('formats salary range with different currencies', () => {
      const usdRange = formatSalaryRange(80000, 120000, 'USD');
      expect(usdRange).toBe('$80,000 - $120,000');

      const eurRange = formatSalaryRange(70000, 90000, 'EUR');
      expect(eurRange).toBe('€70,000 - €90,000');
    });

    test('formats single salary value', () => {
      const single = formatSalaryRange(100000, 100000, 'USD');
      expect(single).toBe('$100,000');
    });

    test('defaults to USD when no currency specified', () => {
      const result = formatSalaryRange(80000, 120000);
      expect(result).toContain('$');
    });
  });

  describe('analyzeSalarySync integration', () => {
    test('performs complete salary analysis', () => {
      const result = analyzeSalarySync('$80,000 - $120,000 per year', 'San Francisco, CA');
      
      expect(result).not.toBeNull();
      expect(result!.originalSalary.min).toBe(80000);
      expect(result!.originalSalary.max).toBe(120000);
      expect(result!.originalSalary.currency).toBe('USD');
      expect(result!.comfortLevel).toBeDefined();
      expect(result!.comfortScore).toBeGreaterThan(0);
      expect(result!.savingsPotential).toBeGreaterThanOrEqual(0);
    });

    test('handles remote location correctly', () => {
      const result = analyzeSalarySync('$100,000', 'remote');
      
      expect(result).not.toBeNull();
      expect(result!.costOfLivingAdjusted.min).toBeGreaterThan(result!.normalizedSalaryUSD.min);
    });

    test('returns null for invalid salary', () => {
      const result = analyzeSalarySync('', 'New York');
      expect(result).toBeNull();
    });

    test('returns null for unparseable salary', () => {
      const result = analyzeSalarySync('Competitive', 'New York');
      expect(result).toBeNull();
    });
  });

  describe('edge cases and error handling', () => {
    test('handles extremely high salaries', () => {
      const result = analyzeSalarySync('$1,000,000 - $2,000,000', 'New York');
      expect(result).not.toBeNull();
      expect(result!.comfortLevel).toBe('luxurious');
    });

    test('handles extremely low salaries', () => {
      const result = analyzeSalarySync('$20,000', 'New York');
      expect(result).not.toBeNull();
      expect(result!.comfortLevel).toBe('struggling');
    });

    test('handles unusual location formats', () => {
      const result1 = analyzeSalarySync('$80,000', 'NYC');
      const result2 = analyzeSalarySync('$80,000', 'New York City, NY, USA');
      
      // Both should work, though may default to remote
      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
    });

    test('calculates savings potential correctly', () => {
      const highSalaryResult = analyzeSalarySync('$150,000', 'Austin');
      const lowSalaryResult = analyzeSalarySync('$40,000', 'Austin');
      
      expect(highSalaryResult!.savingsPotential).toBeGreaterThan(lowSalaryResult!.savingsPotential);
    });
  });
});

describe('Cost of Living Data Accuracy', () => {
  test('major cities have expected relative costs', () => {
    const nyc = getCostOfLivingData('New York');
    const sf = getCostOfLivingData('San Francisco');
    const austin = getCostOfLivingData('Austin');
    const berlin = getCostOfLivingData('Berlin');
    
    // NYC should be baseline (100)
    expect(nyc.costIndex).toBe(100);
    
    // Austin should be cheaper than NYC
    expect(austin.costIndex).toBeLessThan(nyc.costIndex);
    
    // Berlin should be cheaper than SF
    expect(berlin.costIndex).toBeLessThan(sf.costIndex);
  });

  test('purchasing power indices are reasonable', () => {
    const cities = ['New York', 'San Francisco', 'Austin', 'Berlin', 'Singapore'];
    
    cities.forEach(cityName => {
      const cityData = getCostOfLivingData(cityName);
      expect(cityData.purchasingPowerIndex).toBeGreaterThan(50);
      expect(cityData.purchasingPowerIndex).toBeLessThan(150);
    });
  });
});