/**
 * Debug Country Extraction Logic
 * Tests why Nancy, France scenario is failing
 */

import { NetIncomeCalculatorService } from '@/lib/services/net-income-calculator';

// Access private methods for testing
class TestableNetIncomeCalculator extends NetIncomeCalculatorService {
  public testExtractCountry(location: string): string {
    return (this as any).extractCountry(location);
  }

  public testIsInternationalRemoteWork(employerLocation: string, residenceLocation: string): boolean {
    return (this as any).isInternationalRemoteWork(employerLocation, residenceLocation);
  }
}

describe('Country Extraction Debug', () => {
  const calculator = new TestableNetIncomeCalculator();

  test('extractCountry function behavior', () => {
    // Test cases that might be causing the issue
    expect(calculator.testExtractCountry('Nancy, France')).toBe('France');
    expect(calculator.testExtractCountry('Nancy')).toBe('Unknown'); // This might be the issue!
    expect(calculator.testExtractCountry('South Korea (Remote)')).toBe('South Korea');
    expect(calculator.testExtractCountry('Seoul, South Korea')).toBe('South Korea');

    console.log('Country extraction results:');
    console.log('- "Nancy, France" →', calculator.testExtractCountry('Nancy, France'));
    console.log('- "Nancy" →', calculator.testExtractCountry('Nancy'));
    console.log('- "South Korea (Remote)" →', calculator.testExtractCountry('South Korea (Remote)'));
  });

  test('isInternationalRemoteWork detection', () => {
    // Test the actual scenario from the UI
    const result1 = calculator.testIsInternationalRemoteWork('Nancy', 'Nancy, France');
    console.log('Nancy → Nancy, France (international?):', result1);

    const result2 = calculator.testIsInternationalRemoteWork('South Korea (Remote)', 'Nancy, France');
    console.log('South Korea (Remote) → Nancy, France (international?):', result2);

    // This should detect as international remote work
    expect(result2).toBe(true);

    // This should NOW work with our fix - Nancy (unknown) vs Nancy, France should be international
    // because "Nancy" doesn't contain "France" so it's treated as different country
    expect(result1).toBe(true);
  });

  test('debug the actual UI scenario', () => {
    // From your UI screenshot:
    const employerLocation = 'Nancy'; // Job location
    const residenceLocation = 'Nancy, France'; // User residence

    const employerCountry = calculator.testExtractCountry(employerLocation);
    const residenceCountry = calculator.testExtractCountry(residenceLocation);
    const isInternational = calculator.testIsInternationalRemoteWork(employerLocation, residenceLocation);

    console.log(`
🔍 UI SCENARIO DEBUG:
- Employer Location: "${employerLocation}"
- Residence Location: "${residenceLocation}"
- Employer Country: "${employerCountry}"
- Residence Country: "${residenceCountry}"
- Is International: ${isInternational}
- Expected: Should be international (France resident)
    `);

    // If employer country is "Unknown" and residence is "France",
    // the system might not detect this as international
    if (employerCountry === 'Unknown' && residenceCountry === 'France') {
      console.log('❌ PROBLEM FOUND: Employer location "Nancy" not detected as France!');
    }
  });
});

console.log(`
🐛 DEBUGGING COUNTRY EXTRACTION:

The issue might be that "Nancy" alone doesn't contain "France"
so it's detected as "Unknown" country, while "Nancy, France"
is correctly detected as "France".

This could cause the international detection to fail.
`);