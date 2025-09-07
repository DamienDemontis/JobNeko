import {
  calculateEnhancedSalary,
  determineEffectiveLocation,
  calculateFamilyMultiplier,
  estimateTaxRate
} from '../lib/services/salary-calculator';

// Mock the Numbeo scraper
jest.mock('../lib/services/numbeo-scraper', () => ({
  getCityData: jest.fn().mockResolvedValue({
    id: 'test-city',
    city: 'Test City',
    country: 'Test Country',
    state: null,
    costOfLivingIndex: 80,
    rentIndex: 75,
    groceriesIndex: 78,
    restaurantIndex: 85,
    transportIndex: 70,
    utilitiesIndex: 82,
    qualityOfLifeIndex: 85,
    safetyIndex: 90,
    healthcareIndex: 88,
    educationIndex: 85,
    trafficTimeIndex: 65,
    pollutionIndex: 45,
    climateIndex: 75,
    avgNetSalaryUSD: 65000,
    medianHousePriceUSD: 450000,
    incomeTaxRate: 25,
    salesTaxRate: 8,
    population: 500000,
    lastUpdated: new Date(),
    source: 'test',
    dataPoints: 1000
  })
}));

// Mock currency conversion
jest.mock('../lib/salary-intelligence', () => ({
  ...jest.requireActual('../lib/salary-intelligence'),
  convertToUSD: jest.fn().mockResolvedValue(100000),
  parseSalaryString: jest.fn().mockReturnValue({
    min: 80000,
    max: 120000,
    currency: 'USD'
  })
}));

describe('Enhanced Salary Calculator', () => {
  const mockUserProfile = {
    currentLocation: 'Test City',
    currentCountry: 'Test Country',
    familySize: 2,
    dependents: 1,
    maritalStatus: 'married',
    expectedSalaryMin: 90000,
    expectedSalaryMax: 130000,
    currentSalary: 85000,
    preferredCurrency: 'USD',
    housingPreference: 'rent',
    openToRelocation: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateEnhancedSalary', () => {
    test('performs comprehensive salary analysis', async () => {
      const result = await calculateEnhancedSalary(
        '$80,000 - $120,000 per year',
        'Test City, Test Country',
        'onsite',
        mockUserProfile
      );

      expect(result).not.toBeNull();
      expect(result!.originalSalary.min).toBe(80000);
      expect(result!.originalSalary.max).toBe(120000);
      expect(result!.normalizedSalaryUSD.min).toBe(100000);
      expect(result!.comfortScore).toBeGreaterThan(0);
      expect(result!.familyComfortScore).toBeGreaterThan(0);
      expect(result!.locationData.city).toBe('Test City');
    });

    test('handles remote work location logic', async () => {
      const result = await calculateEnhancedSalary(
        '$100,000',
        'San Francisco, CA',
        'remote',
        {
          ...mockUserProfile,
          currentLocation: 'Austin',
          currentCountry: 'USA'
        }
      );

      expect(result).not.toBeNull();
      // For remote work, should use user's current location for cost calculations
      expect(result!.locationData.city).toBe('Test City'); // Mocked city data
    });

    test('calculates family adjustments correctly', async () => {
      const singleResult = await calculateEnhancedSalary(
        '$100,000',
        'Test City',
        'onsite',
        { ...mockUserProfile, familySize: 1, dependents: 0 }
      );

      const familyResult = await calculateEnhancedSalary(
        '$100,000',
        'Test City',
        'onsite',
        { ...mockUserProfile, familySize: 3, dependents: 2 }
      );

      expect(familyResult!.familyAdjustedAnalysis.familyMultiplier).toBeGreaterThan(1);
      expect(familyResult!.familyAdjustedAnalysis.dependentsCost).toBeGreaterThan(0);
      expect(familyResult!.familyComfortScore).toBeLessThan(singleResult!.comfortScore);
    });

    test('provides salary comparisons when user expectations are set', async () => {
      const result = await calculateEnhancedSalary(
        '$95,000',
        'Test City',
        'onsite',
        mockUserProfile
      );

      expect(result!.comparisonToExpected).toBeDefined();
      expect(result!.comparisonToExpected!.meetMinExpectation).toBe(true);
      expect(result!.comparisonToExpected!.percentageOfMinExpected).toBeGreaterThan(100);
    });

    test('provides current salary comparison', async () => {
      const result = await calculateEnhancedSalary(
        '$95,000',
        'Test City',
        'onsite',
        mockUserProfile
      );

      expect(result!.comparisonToCurrent).toBeDefined();
      expect(result!.comparisonToCurrent!.isRaise).toBe(true);
      expect(result!.comparisonToCurrent!.increaseUSD).toBeGreaterThan(0);
    });

    test('generates appropriate recommendations', async () => {
      const result = await calculateEnhancedSalary(
        '$150,000',
        'Test City',
        'onsite',
        mockUserProfile
      );

      expect(result!.recommendations).toBeInstanceOf(Array);
      expect(result!.warnings).toBeInstanceOf(Array);
      expect(result!.recommendations.length + result!.warnings.length).toBeGreaterThan(0);
    });

    test('calculates tax estimates', async () => {
      const result = await calculateEnhancedSalary(
        '$100,000',
        'Test City',
        'onsite',
        mockUserProfile
      );

      expect(result!.taxEstimate).toBeGreaterThan(0);
      expect(result!.netSalaryUSD.min).toBeLessThan(result!.normalizedSalaryUSD.min);
      expect(result!.netSalaryUSD.max).toBeLessThan(result!.normalizedSalaryUSD.max);
    });

    test('returns null for invalid salary input', async () => {
      const result = await calculateEnhancedSalary(
        '',
        'Test City',
        'onsite',
        mockUserProfile
      );

      expect(result).toBeNull();
    });
  });

  describe('determineEffectiveLocation', () => {
    test('uses job location for onsite work', () => {
      const location = determineEffectiveLocation(
        'San Francisco, CA, USA',
        'onsite',
        mockUserProfile
      );

      expect(location.city).toBe('San Francisco');
      expect(location.country).toBe('USA');
      expect(location.state).toBe('CA');
    });

    test('uses user location for remote work', () => {
      const location = determineEffectiveLocation(
        'San Francisco, CA, USA',
        'remote',
        mockUserProfile
      );

      expect(location.city).toBe('Test City');
      expect(location.country).toBe('Test Country');
    });

    test('uses job location for hybrid work', () => {
      const location = determineEffectiveLocation(
        'Seattle, WA, USA',
        'hybrid',
        mockUserProfile
      );

      expect(location.city).toBe('Seattle');
      expect(location.country).toBe('USA');
      expect(location.state).toBe('WA');
    });

    test('handles missing job location gracefully', () => {
      const location = determineEffectiveLocation(
        undefined,
        'onsite',
        mockUserProfile
      );

      expect(location.city).toBe('Test City');
      expect(location.country).toBe('Test Country');
    });

    test('handles missing user profile gracefully', () => {
      const location = determineEffectiveLocation(
        'New York, NY',
        'remote',
        undefined
      );

      expect(location.city).toBe('Remote');
      expect(location.country).toBe('USA');
    });
  });

  describe('calculateFamilyMultiplier', () => {
    test('calculates multiplier for single person', () => {
      const multiplier = calculateFamilyMultiplier(1, 0);
      expect(multiplier).toBe(1);
    });

    test('increases multiplier for larger family', () => {
      const couple = calculateFamilyMultiplier(2, 0);
      const family = calculateFamilyMultiplier(4, 0);
      
      expect(couple).toBeGreaterThan(1);
      expect(family).toBeGreaterThan(couple);
    });

    test('increases multiplier for dependents', () => {
      const noDependents = calculateFamilyMultiplier(2, 0);
      const withDependents = calculateFamilyMultiplier(2, 2);
      
      expect(withDependents).toBeGreaterThan(noDependents);
    });

    test('caps multiplier at maximum value', () => {
      const extremeFamily = calculateFamilyMultiplier(10, 5);
      expect(extremeFamily).toBeLessThanOrEqual(3.0);
    });

    test('calculates reasonable multipliers', () => {
      const scenarios = [
        [1, 0], // Single
        [2, 0], // Couple
        [2, 1], // Couple with 1 child
        [4, 2], // Family of 4 with 2 children
      ];

      scenarios.forEach(([familySize, dependents]) => {
        const multiplier = calculateFamilyMultiplier(familySize, dependents);
        expect(multiplier).toBeGreaterThanOrEqual(1);
        expect(multiplier).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('estimateTaxRate', () => {
    test('estimates reasonable tax rates for different countries', () => {
      const countries = ['USA', 'UK', 'Canada', 'Germany', 'Singapore'];
      const salaries = [50000, 100000, 200000];

      countries.forEach(country => {
        salaries.forEach(salary => {
          const taxRate = estimateTaxRate(salary, country);
          expect(taxRate).toBeGreaterThanOrEqual(0);
          expect(taxRate).toBeLessThanOrEqual(60); // Reasonable max tax rate
        });
      });
    });

    test('increases tax rate with higher income', () => {
      const lowRate = estimateTaxRate(40000, 'USA');
      const midRate = estimateTaxRate(100000, 'USA');
      const highRate = estimateTaxRate(200000, 'USA');

      expect(midRate).toBeGreaterThanOrEqual(lowRate);
      expect(highRate).toBeGreaterThanOrEqual(midRate);
    });

    test('defaults to USA rates for unknown country', () => {
      const unknownRate = estimateTaxRate(100000, 'UnknownCountry');
      const usaRate = estimateTaxRate(100000, 'USA');
      
      expect(unknownRate).toBe(usaRate);
    });

    test('handles edge cases', () => {
      expect(estimateTaxRate(0, 'USA')).toBeGreaterThanOrEqual(0);
      expect(estimateTaxRate(1000000, 'USA')).toBeLessThanOrEqual(60);
    });
  });

  describe('salary analysis edge cases', () => {
    test('handles very high cost of living areas', async () => {
      // Mock high cost city
      const numbeoScraper = await import('../lib/services/numbeo-scraper');
      getCityData.mockResolvedValueOnce({
        ...getCityData.mock.results[0].value,
        costOfLivingIndex: 180,
        city: 'Expensive City'
      });

      const result = await calculateEnhancedSalary(
        '$100,000',
        'Expensive City',
        'onsite',
        mockUserProfile
      );

      expect(result!.costOfLivingAdjusted.min).toBeLessThan(result!.normalizedSalaryUSD.min);
      expect(result!.comfortScore).toBeLessThan(60);
    });

    test('handles very low cost of living areas', async () => {
      const numbeoScraper = await import('../lib/services/numbeo-scraper');
      getCityData.mockResolvedValueOnce({
        ...getCityData.mock.results[0].value,
        costOfLivingIndex: 40,
        city: 'Cheap City'
      });

      const result = await calculateEnhancedSalary(
        '$60,000',
        'Cheap City',
        'onsite',
        mockUserProfile
      );

      expect(result!.costOfLivingAdjusted.min).toBeGreaterThan(result!.normalizedSalaryUSD.min);
      expect(result!.comfortScore).toBeGreaterThan(40);
    });

    test('handles missing city data gracefully', async () => {
      const numbeoScraper = await import('../lib/services/numbeo-scraper');
      getCityData.mockResolvedValueOnce(null);

      const result = await calculateEnhancedSalary(
        '$100,000',
        'Unknown City',
        'onsite',
        mockUserProfile
      );

      expect(result).toBeNull();
    });

    test('handles single person vs large family impact', async () => {
      const single = await calculateEnhancedSalary(
        '$80,000',
        'Test City',
        'onsite',
        { ...mockUserProfile, familySize: 1, dependents: 0 }
      );

      const largeFamily = await calculateEnhancedSalary(
        '$80,000',
        'Test City',
        'onsite',
        { ...mockUserProfile, familySize: 5, dependents: 3 }
      );

      expect(single!.familyComfortScore).toBeGreaterThan(largeFamily!.familyComfortScore);
      expect(single!.familySavingsPotential).toBeGreaterThan(largeFamily!.familySavingsPotential);
    });
  });

  describe('recommendation engine', () => {
    test('generates appropriate warnings for low salaries', async () => {
      const result = await calculateEnhancedSalary(
        '$35,000',
        'Test City',
        'onsite',
        { ...mockUserProfile, familySize: 4, dependents: 2 }
      );

      expect(result!.warnings.length).toBeGreaterThan(0);
      expect(result!.warnings.some(w => w.includes('comfortable living'))).toBe(true);
    });

    test('generates recommendations for high-performing salaries', async () => {
      const result = await calculateEnhancedSalary(
        '$200,000',
        'Test City',
        'onsite',
        mockUserProfile
      );

      expect(result!.recommendations.length).toBeGreaterThan(0);
      expect(result!.recommendations.some(r => r.includes('excellent') || r.includes('security'))).toBe(true);
    });

    test('provides relocation advice for remote workers', async () => {
      const result = await calculateEnhancedSalary(
        '$100,000',
        'San Francisco',
        'remote',
        { ...mockUserProfile, openToRelocation: true }
      );

      expect(result!.recommendations.some(r => r.includes('relocating'))).toBe(true);
    });
  });
});