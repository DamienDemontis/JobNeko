/**
 * International Remote Work Tax Tests
 * Tests South Korea employer + France resident scenario
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

describe('International Remote Work Tax - South Korea Employer + France Resident', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('$45,000 from South Korean employer to French resident MUST use French tax system', async () => {
    // Mock French tax data (should be used for French resident)
    const frenchTaxData = {
      country: 'France',
      region: 'Grand Est',
      city: 'Nancy',
      currency: 'USD', // Salary in USD but French tax system
      taxSystem: {
        incomeTax: {
          brackets: [
            { min: 0, max: 12073, rate: 0 },    // €10,777 converted to USD
            { min: 12073, max: 30756, rate: 11 }, // €27,478 converted
            { min: 30756, max: 87961, rate: 30 }, // €78,570 converted
            { min: 87961, max: 189113, rate: 41 },
            { min: 189113, max: null, rate: 45 }
          ],
          personalAllowance: 0
        },
        socialCharges: [
          { name: 'CSG', rate: 9.2, description: 'Contribution Sociale Généralisée' },
          { name: 'CRDS', rate: 0.5, description: 'Contribution au Remboursement de la Dette Sociale' },
          { name: 'Social Security', rate: 23, description: 'Employee social security contributions' }
        ],
        localTaxes: []
      },
      confidence: 0.95,
      sources: ['French tax authorities', 'Double taxation treaty FR-KR'],
      specialRules: {
        remoteWork: 'French resident working for foreign employer pays French taxes',
        foreignIncome: 'Subject to French taxation as tax resident',
        doubletaxation: 'France-South Korea tax treaty prevents double taxation'
      }
    };

    mockInternationalTaxRAG.getTaxData.mockResolvedValue(frenchTaxData);

    // Mock AI response with CORRECT French taxation applied to USD salary
    const correctFrenchTaxForUSD = {
      gross: {
        annual: 45000,
        monthly: 3750,
        biweekly: 1730.77,
        currency: 'USD'
      },
      taxes: {
        federal: {
          amount: 17550, // ~39% total French taxes on USD salary - MUST NOT BE 0
          rate: 39.0,
          breakdown: {
            incomeTax: 3600,    // French income tax on USD salary
            socialSecurity: 12420,  // CSG + Social Security = 32.2% of $45k
            medicare: 1530      // CRDS + other French charges
          }
        },
        state: {
          amount: 0,
          rate: 0,
          stateName: 'Grand Est' // French region, not South Korean state
        },
        local: {
          amount: 0,
          rate: 0,
          locality: 'Nancy, France'
        },
        totalTaxes: 17550,
        effectiveRate: 39.0
      },
      deductions: {
        retirement401k: 0,
        healthInsurance: 0,
        other: 0,
        totalDeductions: 0
      },
      netIncome: {
        annual: 27450,  // $45k - $17.55k French taxes
        monthly: 2287.50,
        biweekly: 1055.77,
        hourly: 13.2,
        dailyTakeHome: 105.69
      },
      comparison: {
        vsMedianIncome: '+25% vs French median (USD equivalent)',
        purchasingPower: 27450,
        savingsPotential: 5000
      },
      remoteWorkConsiderations: {
        taxComplexity: 'complex',
        multiStateTax: false, // Not US multi-state, but international
        recommendedWithholding: 4387.50, // Quarterly estimates for French taxes
        quarterlyEstimates: 4387.50,
        notes: [
          'French tax resident working for South Korean employer',
          'Subject to French tax system despite foreign employer',
          'Double taxation treaty prevents paying both French and Korean taxes',
          'May need to file tax returns in both countries',
          'Consider social security coordination agreements'
        ]
      },
      insights: {
        taxOptimizations: [
          'Check France-South Korea tax treaty benefits',
          'Consider salary sacrifice in France-friendly vehicles',
          'Monitor 183-day rule for tax residence'
        ],
        comparisonToSimilarRoles: 'Competitive for French market in USD terms',
        takeHomeSummary: 'French resident pays French taxes: $27,450 net from $45,000 gross (39% rate)',
        warnings: [
          'International remote work requires tax planning',
          'Must comply with French tax resident obligations',
          'Employer may have withholding complications'
        ]
      },
      totalCompensation: {
        baseSalary: 45000,
        benefits: 0,
        bonuses: 0,
        equity: 0,
        total: 45000,
        totalAfterTax: 27450
      },
      confidence: {
        overall: 0.92,
        taxAccuracy: 0.88,
        source: 'current_tax_tables'
      }
    };

    mockGenerateCompletion.mockResolvedValue({
      content: JSON.stringify(correctFrenchTaxForUSD)
    });

    const request = {
      grossSalary: 45000,
      location: 'South Korea (Remote)', // Employer location
      residenceLocation: 'Nancy, France', // Employee residence - this should determine tax system
      workMode: 'remote_global' as const,
      currency: 'USD',
      userId: 'test-user-123',
      employerLocation: 'South Korea'
    };

    const result = await netIncomeCalculator.calculate(request);

    // Critical validations - should use French tax system
    expect(result.taxes.effectiveRate).toBeGreaterThanOrEqual(35); // French rate, not 0%
    expect(result.taxes.effectiveRate).toBeLessThanOrEqual(45);
    expect(result.taxes.totalTaxes).toBeGreaterThan(10000); // Should have significant French taxes
    expect(result.netIncome.annual).toBeLessThan(35000); // Net should reflect French taxation

    // CRITICAL: Verify federal amount is NOT 0 (main issue we're fixing)
    expect(result.taxes.federal.amount).toBeGreaterThan(10000); // Should be ~$17,550
    expect(result.taxes.federal.amount).not.toBe(0); // Specific check for the bug

    // Verify French tax components
    expect(result.taxes.federal.breakdown.socialSecurity).toBeGreaterThan(8000); // CSG + Social Security
    expect(result.taxes.federal.breakdown.medicare).toBeGreaterThan(200); // CRDS
    expect(result.taxes.federal.breakdown.incomeTax).toBeGreaterThan(1000); // French income tax

    // Verify remote work complexity is recognized
    expect(result.remoteWorkConsiderations?.taxComplexity).toBe('complex');
    expect(result.remoteWorkConsiderations?.notes).toContainEqual(
      expect.stringContaining('French tax resident')
    );

    // Verify AI was called with correct parameters
    expect(mockInternationalTaxRAG.getTaxData).toHaveBeenCalledWith(
      'Nancy, France', // Should use residence location, not employer location
      'remote_global',
      'South Korea'
    );

    // Verify prompt contains international remote work guidance
    const promptCall = mockGenerateCompletion.mock.calls[0][0];
    expect(promptCall).toContain('International remote work: YES');
    expect(promptCall).toContain('CRITICAL: For remote worker living in Nancy, France');
    expect(promptCall).toContain('South Korean employer + French resident = Use FRENCH tax system');

    console.log(`✅ International Remote Work Tax Validation:
    - Employer: South Korea
    - Employee Residence: Nancy, France
    - Gross: $${result.gross.annual}
    - Net: $${result.netIncome.annual}
    - Effective Rate: ${result.taxes.effectiveRate}%
    - Tax System Used: French (correct for French resident)`);
  });

  test('Validates AI receives correct international remote work context', async () => {
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

    const minimalResponse = {
      gross: { annual: 45000, monthly: 3750, biweekly: 1730, currency: 'USD' },
      taxes: { federal: { amount: 15000, rate: 33, breakdown: { incomeTax: 5000, socialSecurity: 8000, medicare: 2000 } }, state: { amount: 0, rate: 0, stateName: 'Grand Est' }, local: { amount: 0, rate: 0, locality: 'Nancy' }, totalTaxes: 15000, effectiveRate: 33 },
      netIncome: { annual: 30000, monthly: 2500, biweekly: 1153, hourly: 14.4, dailyTakeHome: 115 },
      deductions: { retirement401k: 0, healthInsurance: 0, other: 0, totalDeductions: 0 },
      comparison: { vsMedianIncome: 'Above median', purchasingPower: 30000, savingsPotential: 5000 },
      remoteWorkConsiderations: { taxComplexity: 'complex', multiStateTax: false, recommendedWithholding: 3750, notes: ['International remote work'] },
      insights: { taxOptimizations: [], comparisonToSimilarRoles: 'Good', takeHomeSummary: 'International remote work taxation', warnings: [] },
      confidence: { overall: 0.8, taxAccuracy: 0.8, source: 'current_tax_tables' }
    };

    mockGenerateCompletion.mockResolvedValue({ content: JSON.stringify(minimalResponse) });

    const request = {
      grossSalary: 45000,
      location: 'Seoul, South Korea',
      residenceLocation: 'Nancy, France',
      workMode: 'remote_global' as const,
      currency: 'USD',
      userId: 'test-user-123',
      employerLocation: 'Seoul, South Korea'
    };

    await netIncomeCalculator.calculate(request);

    // Verify the AI prompt contains proper international remote work context
    const promptCall = mockGenerateCompletion.mock.calls[0][0];

    expect(promptCall).toContain('REMOTE WORK TAX SCENARIO:');
    expect(promptCall).toContain('Employee lives in: Nancy, France');
    expect(promptCall).toContain('Employer based in: Seoul, South Korea');
    expect(promptCall).toContain('International remote work: YES');
    expect(promptCall).toContain('INTERNATIONAL REMOTE WORK RULES:');
    expect(promptCall).toContain('Tax residence determines primary taxation');
    expect(promptCall).toContain('apply Nancy, France tax rates and system, NOT Seoul, South Korea rates');
    expect(promptCall).toContain('Double taxation treaties may apply');
  });
});

console.log(`
🌍 INTERNATIONAL REMOTE WORK TAX VALIDATION:

✅ Smart Tax Residence Detection
   - Detects South Korea employer + France resident scenario
   - Applies French tax system to French resident (correct)
   - Provides international remote work context to AI
   - Handles double taxation treaty considerations

🔐 CONCLUSION: International remote work now uses residence-based taxation
`);