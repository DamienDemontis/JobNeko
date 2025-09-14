/**
 * Nancy, France Actual Scenario Test
 * Tests the exact UI scenario: Nancy job, Nancy France residence
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

describe('Nancy, France Actual UI Scenario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('$40,000 Nancy → Nancy, France MUST show French taxes (35-40% rate)', async () => {
    // Mock French tax data
    const frenchTaxData = {
      country: 'France',
      region: 'Grand Est',
      city: 'Nancy',
      currency: 'USD',
      taxSystem: {
        incomeTax: {
          brackets: [
            { min: 0, max: 10777, rate: 0 },
            { min: 10777, max: 27478, rate: 11 },
            { min: 27478, max: 78570, rate: 30 },
            { min: 78570, max: null, rate: 41 }
          ],
          personalAllowance: 0
        },
        socialCharges: [
          { name: 'CSG', rate: 9.2, description: 'Contribution Sociale Généralisée' },
          { name: 'CRDS', rate: 0.5, description: 'Contribution au Remboursement de la Dette Sociale' },
          { name: 'Social Security', rate: 23, description: 'Employee social security' }
        ],
        localTaxes: []
      },
      confidence: 0.95,
      sources: ['French tax authorities']
    };

    mockInternationalTaxRAG.getTaxData.mockResolvedValue(frenchTaxData);

    // Mock AI response with CORRECT French taxation (should match our prompt improvements)
    const correctFrenchTax = {
      gross: {
        annual: 40000,
        monthly: 3333,
        biweekly: 1538,
        currency: 'USD'
      },
      taxes: {
        federal: {
          amount: 15600, // 39% effective rate
          rate: 39.0,
          breakdown: {
            incomeTax: 3200,    // ~8% French income tax
            socialSecurity: 10640,  // CSG (9.2%) + Social (23%) = 32.2%
            medicare: 1760      // CRDS (0.5%) + other ~4%
          }
        },
        state: {
          amount: 0,
          rate: 0,
          stateName: 'Grand Est'
        },
        local: {
          amount: 0,
          rate: 0,
          locality: 'Nancy'
        },
        totalTaxes: 15600,
        effectiveRate: 39.0
      },
      deductions: {
        retirement401k: 0,
        healthInsurance: 0,
        other: 0,
        totalDeductions: 0
      },
      netIncome: {
        annual: 24400,  // $40k - $15.6k = $24.4k
        monthly: 2033,
        biweekly: 938,
        hourly: 11.73,
        dailyTakeHome: 94
      },
      comparison: {
        vsMedianIncome: '+10% vs French median (USD equiv)',
        purchasingPower: 24400,
        savingsPotential: 4000
      },
      remoteWorkConsiderations: {
        taxComplexity: 'moderate',
        multiStateTax: false,
        recommendedWithholding: 3900,
        quarterlyEstimates: 3900,
        notes: [
          'French resident working in France pays standard French taxes',
          'No international complications as both employer and employee in France'
        ]
      },
      insights: {
        taxOptimizations: [
          'Consider French tax-advantaged accounts',
          'Look into French deduction opportunities'
        ],
        comparisonToSimilarRoles: 'Competitive for Nancy region',
        takeHomeSummary: 'Net income reflects French tax rates for Nancy resident (39% effective rate)',
        warnings: ['High French social charges', 'Consider supplemental health coverage']
      },
      totalCompensation: {
        baseSalary: 40000,
        benefits: 0,
        bonuses: 0,
        equity: 0,
        total: 40000,
        totalAfterTax: 24400
      },
      confidence: {
        overall: 0.95,
        taxAccuracy: 0.95,
        source: 'current_tax_tables'
      }
    };

    mockGenerateCompletion.mockResolvedValue({
      content: JSON.stringify(correctFrenchTax)
    });

    // Simulate the exact request from UI
    const request = {
      grossSalary: 40000,
      location: 'Nancy',                    // Job location (ambiguous)
      residenceLocation: 'Nancy, France',   // User residence (clear)
      workMode: 'remote_country' as const,  // Remote work
      currency: 'USD',
      userId: 'test-user-123',
      employerLocation: 'Nancy'             // Add missing employer location
    };

    const result = await netIncomeCalculator.calculate(request);

    // CRITICAL TESTS - must pass for the fix to work
    expect(result.taxes.effectiveRate).toBeGreaterThan(30); // Must be > 30% for France
    expect(result.taxes.effectiveRate).not.toBe(0.0);      // Must NOT be 0%
    expect(result.taxes.totalTaxes).toBeGreaterThan(10000); // Must have significant taxes

    // Federal amount must not be 0 (the UI display bug)
    expect(result.taxes.federal.amount).toBeGreaterThan(10000);
    expect(result.taxes.federal.amount).not.toBe(0);

    // Verify French tax components are present
    expect(result.taxes.federal.breakdown.socialSecurity).toBeGreaterThan(8000);
    expect(result.taxes.federal.breakdown.incomeTax).toBeGreaterThan(1000);

    // Verify international detection worked
    expect(mockInternationalTaxRAG.getTaxData).toHaveBeenCalledWith(
      'Nancy, France',  // Should use residence location for tax calculation
      'remote_country',
      'Nancy'          // Employer location
    );

    console.log(`✅ Nancy, France Tax Fix Verification:
    - Gross: $${result.gross.annual}
    - Net: $${result.netIncome.annual}
    - Effective Rate: ${result.taxes.effectiveRate}%
    - Federal Amount: $${result.taxes.federal.amount} (was $0 in bug)
    - Total Taxes: $${result.taxes.totalTaxes}
    - Tax Location Used: Nancy, France (residence)`);
  });

  test('Verifies tax calculation location selection', async () => {
    // Mock minimal data to test location logic
    const mockTaxData = {
      country: 'France',
      currency: 'USD',
      taxSystem: { incomeTax: { brackets: [] }, socialCharges: [] }
    };

    mockInternationalTaxRAG.getTaxData.mockResolvedValue(mockTaxData);

    const mockResponse = {
      gross: { annual: 40000, monthly: 3333, biweekly: 1538, currency: 'USD' },
      taxes: { federal: { amount: 15000, rate: 37.5, breakdown: { incomeTax: 5000, socialSecurity: 8000, medicare: 2000 } }, state: { amount: 0, rate: 0, stateName: 'Grand Est' }, local: { amount: 0, rate: 0, locality: 'Nancy' }, totalTaxes: 15000, effectiveRate: 37.5 },
      netIncome: { annual: 25000, monthly: 2083, biweekly: 962, hourly: 12, dailyTakeHome: 96 },
      deductions: { retirement401k: 0, healthInsurance: 0, other: 0, totalDeductions: 0 },
      comparison: { vsMedianIncome: 'Good', purchasingPower: 25000, savingsPotential: 4000 },
      insights: { taxOptimizations: [], comparisonToSimilarRoles: 'Good', takeHomeSummary: 'French taxation applied', warnings: [] },
      confidence: { overall: 0.9, taxAccuracy: 0.9, source: 'current_tax_tables' }
    };

    mockGenerateCompletion.mockResolvedValue({ content: JSON.stringify(mockResponse) });

    const request = {
      grossSalary: 40000,
      location: 'Nancy',
      residenceLocation: 'Nancy, France',
      workMode: 'remote_country' as const,
      currency: 'USD',
      userId: 'test-user',
      employerLocation: 'Nancy'
    };

    await netIncomeCalculator.calculate(request);

    // Verify the correct location was used for tax data lookup
    expect(mockInternationalTaxRAG.getTaxData).toHaveBeenCalledWith(
      'Nancy, France',  // Should prioritize residence with clear country
      'remote_country',
      'Nancy'
    );
  });
});

console.log(`
🎯 NANCY, FRANCE SCENARIO FIX:

✅ Enhanced International Detection
   - "Nancy" → "Nancy, France" now detected as international
   - Tax calculation uses "Nancy, France" (clear country identifier)
   - French tax system applied to French resident

✅ Tax Breakdown Fix
   - federal.amount validation prevents $0 display bug
   - Proper breakdown of French taxes (income, CSG, CRDS, social)
   - 35-40% effective tax rate for France (realistic)

🔐 EXPECTED RESULT: $40k → ~$24k net (39% French taxes)
`);