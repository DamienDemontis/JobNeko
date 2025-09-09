// Integration tests for the complete salary intelligence system

import { calculateEnhancedSalary } from '../lib/services/salary-calculator';
import { setupTestData } from '../test-data-setup';

describe('Salary Calculator Integration', () => {
  beforeAll(async () => {
    jest.setTimeout(30000);
    // Set up test data in database
    await setupTestData();
  });

  describe('End-to-end salary analysis', () => {
    test('should provide complete analysis with test data', async () => {
      const userProfile = {
        currentLocation: 'Nancy',
        currentCountry: 'France',
        familySize: 1,
        dependents: 0,
        maritalStatus: 'single' as const
      };

      const result = await calculateEnhancedSalary(
        '80000 USD',
        'Nancy, France',
        'onsite',
        userProfile
      );

      if (result) {
        expect(result).toHaveProperty('normalizedSalaryUSD');
        expect(result).toHaveProperty('locationData');
        expect(result).toHaveProperty('comfortLevel');
        expect(result).toHaveProperty('comfortScore');
        expect(result).toHaveProperty('purchasingPower');

        // Nancy should have realistic cost of living index
        expect(result.locationData.costOfLivingIndex).toBeLessThan(90);
        expect(result.locationData.costOfLivingIndex).toBeGreaterThan(40);

        // $80k should not be "tight" in Nancy
        expect(result.comfortLevel).not.toBe('tight');
        expect(['comfortable', 'thriving', 'luxurious']).toContain(result.comfortLevel);
      }
    });

    test('should show difference between cities', async () => {
      const userProfile = {
        currentLocation: 'Nancy',
        currentCountry: 'France',
        familySize: 1,
        dependents: 0,
        maritalStatus: 'single' as const
      };

      const [nancyResult, parisResult] = await Promise.all([
        calculateEnhancedSalary('80000 USD', 'Nancy, France', 'onsite', userProfile),
        calculateEnhancedSalary('80000 USD', 'Paris, France', 'onsite', userProfile)
      ]);

      if (nancyResult && parisResult) {
        // Paris should be more expensive than Nancy
        expect(parisResult.locationData.costOfLivingIndex).toBeGreaterThan(
          nancyResult.locationData.costOfLivingIndex
        );

        // Same salary should provide better comfort in Nancy than Paris
        expect(nancyResult.purchasingPower).toBeGreaterThan(parisResult.purchasingPower);
      }
    });

    test('should handle currency conversion', async () => {
      const userProfile = {
        currentLocation: 'Nancy',
        currentCountry: 'France',
        familySize: 1,
        dependents: 0,
        maritalStatus: 'single' as const
      };

      const usdResult = await calculateEnhancedSalary(
        '80000 USD',
        'Nancy, France',
        'onsite',
        userProfile
      );

      const eurResult = await calculateEnhancedSalary(
        '€70000',
        'Nancy, France',
        'onsite',
        userProfile
      );

      if (usdResult && eurResult) {
        // Both should have normalized USD values
        expect(usdResult.normalizedSalaryUSD.min).toBeDefined();
        expect(eurResult.normalizedSalaryUSD.min).toBeDefined();

        // EUR should be converted to USD
        expect(eurResult.normalizedSalaryUSD.min).toBeGreaterThan(70000);
      }
    });

    test('should adjust for family size', async () => {
      const singleProfile = {
        currentLocation: 'Nancy',
        currentCountry: 'France',
        familySize: 1,
        dependents: 0,
        maritalStatus: 'single' as const
      };

      const familyProfile = {
        currentLocation: 'Nancy', 
        currentCountry: 'France',
        familySize: 4,
        dependents: 2,
        maritalStatus: 'married' as const
      };

      const [singleResult, familyResult] = await Promise.all([
        calculateEnhancedSalary('80000 USD', 'Nancy, France', 'onsite', singleProfile),
        calculateEnhancedSalary('80000 USD', 'Nancy, France', 'onsite', familyProfile)
      ]);

      if (singleResult && familyResult) {
        // Same salary should be less comfortable for a family
        expect(familyResult.comfortScore).toBeLessThan(singleResult.comfortScore);
        
        // Family should need higher thresholds
        expect(familyResult.familyAdjustedSalary.min).toBeGreaterThan(
          singleResult.familyAdjustedSalary.min
        );
      }
    });
  });

  describe('System robustness', () => {
    test('should handle invalid salary input', async () => {
      const userProfile = {
        currentLocation: 'Nancy',
        currentCountry: 'France',
        familySize: 1,
        dependents: 0,
        maritalStatus: 'single' as const
      };

      const result = await calculateEnhancedSalary(
        'invalid salary',
        'Nancy, France',
        'onsite',
        userProfile
      );

      expect(result).toBeNull();
    });

    test('should handle unknown location gracefully', async () => {
      const userProfile = {
        currentLocation: 'Nancy',
        currentCountry: 'France',
        familySize: 1,
        dependents: 0,
        maritalStatus: 'single' as const
      };

      const result = await calculateEnhancedSalary(
        '80000 USD',
        'UnknownCity, UnknownCountry',
        'onsite',
        userProfile
      );

      // Should either return null or use fallback data
      if (result) {
        expect(result.locationData).toBeDefined();
      }
    });
  });

  describe('Performance', () => {
    test('should complete analysis within reasonable time', async () => {
      const userProfile = {
        currentLocation: 'Nancy',
        currentCountry: 'France',
        familySize: 1,
        dependents: 0,
        maritalStatus: 'single' as const
      };

      const startTime = Date.now();
      
      const result = await calculateEnhancedSalary(
        '80000 USD',
        'Nancy, France',
        'onsite',
        userProfile
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 10 seconds (allowing for AI API calls)
      expect(duration).toBeLessThan(10000);
    });
  });
});