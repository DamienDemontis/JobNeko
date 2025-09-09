// Test to verify Nancy, France salary intelligence fix
// This should show $80k as "comfortable" or "thriving", not "tight"

import { calculateEnhancedSalary } from '../lib/services/salary-calculator';

describe('Nancy, France Salary Intelligence Fix', () => {
  beforeAll(async () => {
    // Give tests more time as they involve AI API calls
    jest.setTimeout(30000);
  });

  test('$80,000 USD in Nancy, France should show as comfortable/thriving, not tight', async () => {
    console.log('🧪 Testing Nancy, France salary intelligence fix...');
    
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

    console.log('📊 Test Results for $80,000 USD in Nancy, France:');
    console.log(`Cost of Living Index: ${result?.locationData?.costOfLivingIndex}%`);
    console.log(`Salary Range: $${result?.normalizedSalaryUSD?.min?.toLocaleString()} - $${result?.normalizedSalaryUSD?.max?.toLocaleString()}`);
    console.log(`Comfort Score: ${result?.comfortScore}/100`);
    console.log(`Comfort Level: ${result?.comfortLevel}`);
    console.log(`Purchasing Power: ${result?.purchasingPower?.toFixed(2)}x`);
    console.log(`Data Sources: ${result?.locationData?.source || 'N/A'}`);

    expect(result).toBeTruthy();
    expect(result?.comfortLevel).toBeDefined();
    
    // The main fix: $80k should NOT be "tight" in Nancy, France
    expect(result?.comfortLevel).not.toBe('tight');
    
    // It should be one of these reasonable levels for $80k in a smaller French city
    expect(['comfortable', 'thriving', 'luxurious']).toContain(result?.comfortLevel);
    
    // Cost of living should be reasonable for Nancy (not the old hardcoded 105% for all of France)
    // Nancy should be significantly cheaper than NYC (which is 100%)
    expect(result?.locationData?.costOfLivingIndex).toBeLessThan(90);
    expect(result?.locationData?.costOfLivingIndex).toBeGreaterThan(40);
  });

  test('Nancy vs Paris should show different cost levels', async () => {
    console.log('🏙️ Comparing Nancy vs Paris...');
    
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

    console.log(`Nancy Cost Index: ${nancyResult?.locationData?.costOfLivingIndex}%`);
    console.log(`Paris Cost Index: ${parisResult?.locationData?.costOfLivingIndex}%`);
    console.log(`Nancy Comfort Level: ${nancyResult?.comfortLevel}`);
    console.log(`Paris Comfort Level: ${parisResult?.comfortLevel}`);

    // Paris should be more expensive than Nancy
    if (nancyResult?.locationData?.costOfLivingIndex && parisResult?.locationData?.costOfLivingIndex) {
      expect(parisResult.locationData.costOfLivingIndex).toBeGreaterThan(
        nancyResult.locationData.costOfLivingIndex
      );
    }
  });

  test.skip('Remote job should use user location context properly', async () => {
    // Skip this test as it depends on external network calls
    // The core Nancy, France fix is verified by the tests above
  });
});