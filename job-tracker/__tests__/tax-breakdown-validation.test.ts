/**
 * Tax Breakdown Validation Test
 * Ensures federal.amount is not 0 when totalTaxes > 0
 */

import { netIncomeCalculator } from '@/lib/services/net-income-calculator';
import { internationalTaxRAG } from '@/lib/services/international-tax-rag';
import { generateCompletion } from '@/lib/ai-service';

jest.mock('@/lib/ai-service');
jest.mock('@/lib/services/international-tax-rag');

const mockGenerateCompletion = generateCompletion as jest.MockedFunction<typeof generateCompletion>;
const mockInternationalTaxRAG = {
  getTaxData: jest.fn()
} as any;

jest.mocked(internationalTaxRAG).getTaxData = mockInternationalTaxRAG.getTaxData;

describe('Tax Breakdown Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('MUST fail when federal.amount is 0 but totalTaxes > 0', async () => {
    const frenchTaxData = {
      country: 'France',
      currency: 'USD',
      taxSystem: {
        incomeTax: { brackets: [], personalAllowance: 0 },
        socialCharges: []
      },
      confidence: 0.95
    };

    mockInternationalTaxRAG.getTaxData.mockResolvedValue(frenchTaxData);

    // Mock BROKEN AI response - total taxes > 0 but federal amount = 0 (the bug)
    const brokenResponse = {
      gross: { annual: 45000, monthly: 3750, biweekly: 1730, currency: 'USD' },
      taxes: {
        federal: {
          amount: 0, // BUG: This should not be 0 when totalTaxes > 0
          rate: 0.0,
          breakdown: {
            incomeTax: 0,
            socialSecurity: 0,
            medicare: 0
          }
        },
        state: { amount: 0, rate: 0, stateName: 'Grand Est' },
        local: { amount: 0, rate: 0, locality: 'Nancy' },
        totalTaxes: 18000, // Total is correct but not distributed
        effectiveRate: 40.0 // Correct rate
      },
      netIncome: { annual: 27000, monthly: 2250, biweekly: 1038, hourly: 13, dailyTakeHome: 104 },
      deductions: { retirement401k: 0, healthInsurance: 0, other: 0, totalDeductions: 0 },
      comparison: { vsMedianIncome: 'Above median', purchasingPower: 27000, savingsPotential: 5000 },
      insights: { taxOptimizations: [], comparisonToSimilarRoles: 'Good', takeHomeSummary: 'Good', warnings: [] },
      confidence: { overall: 0.8, taxAccuracy: 0.8, source: 'current_tax_tables' }
    };

    mockGenerateCompletion.mockResolvedValue({ content: JSON.stringify(brokenResponse) });

    const request = {
      grossSalary: 45000,
      location: 'South Korea (Remote)',
      residenceLocation: 'Nancy, France',
      workMode: 'remote_global' as const,
      currency: 'USD',
      userId: 'test-user-123'
    };

    // This should now FAIL due to our validation
    await expect(
      netIncomeCalculator.calculate(request)
    ).rejects.toThrow('Federal tax amount cannot be 0 when total taxes > 0');

    console.log('✅ Validation correctly catches federal.amount = 0 bug');
  });

  test('MUST succeed when federal.amount properly reflects totalTaxes', async () => {
    const frenchTaxData = {
      country: 'France',
      currency: 'USD',
      taxSystem: {
        incomeTax: { brackets: [], personalAllowance: 0 },
        socialCharges: []
      },
      confidence: 0.95
    };

    mockInternationalTaxRAG.getTaxData.mockResolvedValue(frenchTaxData);

    // Mock CORRECT AI response - federal amount properly reflects totalTaxes
    const correctResponse = {
      gross: { annual: 45000, monthly: 3750, biweekly: 1730, currency: 'USD' },
      taxes: {
        federal: {
          amount: 18000, // CORRECT: Matches totalTaxes
          rate: 40.0,
          breakdown: {
            incomeTax: 4000,    // French income tax
            socialSecurity: 12000,  // CSG + Social Security
            medicare: 2000      // CRDS + other
          }
        },
        state: { amount: 0, rate: 0, stateName: 'Grand Est' },
        local: { amount: 0, rate: 0, locality: 'Nancy' },
        totalTaxes: 18000, // Matches federal amount
        effectiveRate: 40.0
      },
      netIncome: { annual: 27000, monthly: 2250, biweekly: 1038, hourly: 13, dailyTakeHome: 104 },
      deductions: { retirement401k: 0, healthInsurance: 0, other: 0, totalDeductions: 0 },
      comparison: { vsMedianIncome: 'Above median', purchasingPower: 27000, savingsPotential: 5000 },
      insights: { taxOptimizations: [], comparisonToSimilarRoles: 'Good', takeHomeSummary: 'Proper tax breakdown', warnings: [] },
      confidence: { overall: 0.9, taxAccuracy: 0.9, source: 'current_tax_tables' }
    };

    mockGenerateCompletion.mockResolvedValue({ content: JSON.stringify(correctResponse) });

    const request = {
      grossSalary: 45000,
      location: 'South Korea (Remote)',
      residenceLocation: 'Nancy, France',
      workMode: 'remote_global' as const,
      currency: 'USD',
      userId: 'test-user-123'
    };

    const result = await netIncomeCalculator.calculate(request);

    // Validate proper tax breakdown
    expect(result.taxes.federal.amount).toBe(18000);
    expect(result.taxes.totalTaxes).toBe(18000);
    expect(result.taxes.federal.amount).toEqual(result.taxes.totalTaxes);
    expect(result.taxes.effectiveRate).toBe(40.0);

    // Verify breakdown sums correctly
    const breakdownSum = result.taxes.federal.breakdown.incomeTax +
                        result.taxes.federal.breakdown.socialSecurity +
                        result.taxes.federal.breakdown.medicare;
    expect(breakdownSum).toBe(18000); // Should equal federal amount

    console.log(`✅ Proper tax breakdown validation:
    - Federal Amount: $${result.taxes.federal.amount}
    - Total Taxes: $${result.taxes.totalTaxes}
    - Breakdown Sum: $${breakdownSum}
    - All values match correctly`);
  });
});

console.log(`
🔧 TAX BREAKDOWN VALIDATION:

✅ Enhanced Validation System
   - Prevents federal.amount = 0 when totalTaxes > 0
   - Ensures proper tax distribution across breakdown
   - Validates breakdown components sum to federal amount
   - Provides clear error messages for debugging

🔐 CONCLUSION: Tax breakdown validation prevents UI display bugs
`);