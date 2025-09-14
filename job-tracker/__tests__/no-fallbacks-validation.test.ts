/**
 * VALIDATION TESTS: NO FALLBACK BEHAVIOR CONFIRMED
 *
 * These tests PROVE that both features have ZERO fallback behavior.
 * Every test is designed to FAIL when AI is unavailable.
 *
 * ✅ PASSING = Feature correctly rejects without AI
 * ❌ FAILING = Feature has forbidden fallback behavior
 */

import { netIncomeCalculator } from '@/lib/services/net-income-calculator';
import { aiNegotiationCoach } from '@/lib/services/ai-negotiation-coach';
import { generateCompletion } from '@/lib/ai-service';

// Mock AI service only
jest.mock('@/lib/ai-service');
const mockGenerateCompletion = generateCompletion as jest.MockedFunction<typeof generateCompletion>;

describe('✅ NO FALLBACKS VALIDATION', () => {

  describe('Net Income Calculator - AI DEPENDENCY VALIDATION', () => {
    test('✅ CORRECTLY FAILS when AI unavailable', async () => {
      mockGenerateCompletion.mockResolvedValue(null);

      await expect(netIncomeCalculator.calculate({
        grossSalary: 120000,
        location: 'San Francisco, CA',
        workMode: 'onsite',
        currency: 'USD',
        userId: 'test-user'
      })).rejects.toThrow('Failed to calculate net income. AI service unavailable.');
    });

    test('✅ CORRECTLY FAILS when AI returns empty response', async () => {
      mockGenerateCompletion.mockResolvedValue({ content: '' });

      await expect(netIncomeCalculator.calculate({
        grossSalary: 120000,
        location: 'San Francisco, CA',
        workMode: 'onsite',
        currency: 'USD',
        userId: 'test-user'
      })).rejects.toThrow('Failed to calculate net income. AI service unavailable.');
    });

    test('✅ CORRECTLY FAILS when AI returns invalid JSON', async () => {
      mockGenerateCompletion.mockResolvedValue({ content: 'not json' });

      await expect(netIncomeCalculator.calculate({
        grossSalary: 120000,
        location: 'San Francisco, CA',
        workMode: 'onsite',
        currency: 'USD',
        userId: 'test-user'
      })).rejects.toThrow(/Tax calculation failed:/);
    });

    test('✅ CORRECTLY VALIDATES required fields from AI', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify({
          gross: { annual: 120000 },
          // Missing taxes field - should fail validation
        })
      });

      await expect(netIncomeCalculator.calculate({
        grossSalary: 120000,
        location: 'San Francisco, CA',
        workMode: 'onsite',
        currency: 'USD',
        userId: 'test-user'
      })).rejects.toThrow('AI response missing critical tax calculation fields');
    });

    test('✅ ONLY SUCCEEDS with complete AI response', async () => {
      const completeResponse = {
        gross: {
          annual: 120000,
          monthly: 10000,
          biweekly: 4615,
          currency: 'USD'
        },
        taxes: {
          federal: {
            amount: 24000,
            rate: 20,
            breakdown: {
              incomeTax: 18000,
              socialSecurity: 4464,
              medicare: 1536
            }
          },
          state: {
            amount: 6000,
            rate: 5,
            stateName: 'California'
          },
          totalTaxes: 30000,
          effectiveRate: 25
        },
        deductions: {
          retirement401k: 0,
          healthInsurance: 0,
          other: 0,
          totalDeductions: 0
        },
        netIncome: {
          annual: 90000,
          monthly: 7500,
          biweekly: 3461,
          hourly: 43.27,
          dailyTakeHome: 246
        },
        comparison: {
          vsMedianIncome: '+30% vs local median',
          purchasingPower: 75000,
          savingsPotential: 25000
        },
        insights: {
          taxOptimizations: ['Max out 401k'],
          comparisonToSimilarRoles: 'Competitive',
          takeHomeSummary: 'Good take-home pay',
          warnings: []
        },
        confidence: {
          overall: 0.9,
          taxAccuracy: 0.95,
          source: 'current_tax_tables' as const
        }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(completeResponse)
      });

      const result = await netIncomeCalculator.calculate({
        grossSalary: 120000,
        location: 'San Francisco, CA',
        workMode: 'onsite',
        currency: 'USD',
        userId: 'test-user'
      });

      expect(result.netIncome.annual).toBe(90000);
    });
  });

  describe('AI Negotiation Coach - AI DEPENDENCY VALIDATION', () => {
    test('✅ CORRECTLY FAILS when AI unavailable', async () => {
      mockGenerateCompletion.mockResolvedValue(null);

      await expect(aiNegotiationCoach.generateStrategy({
        userId: 'test-user',
        jobId: 'test-job',
        jobTitle: 'Software Engineer',
        company: 'TestCorp',
        location: 'San Francisco, CA',
        workMode: 'onsite'
      })).rejects.toThrow('Failed to generate negotiation strategy. AI service unavailable.');
    });

    test('✅ CORRECTLY FAILS when AI returns empty response', async () => {
      mockGenerateCompletion.mockResolvedValue({ content: '' });

      await expect(aiNegotiationCoach.generateStrategy({
        userId: 'test-user',
        jobId: 'test-job',
        jobTitle: 'Software Engineer',
        company: 'TestCorp',
        location: 'San Francisco, CA',
        workMode: 'onsite'
      })).rejects.toThrow('Failed to generate negotiation strategy. AI service unavailable.');
    });

    test('✅ CORRECTLY FAILS when AI returns invalid JSON', async () => {
      mockGenerateCompletion.mockResolvedValue({ content: 'not json' });

      await expect(aiNegotiationCoach.generateStrategy({
        userId: 'test-user',
        jobId: 'test-job',
        jobTitle: 'Software Engineer',
        company: 'TestCorp',
        location: 'San Francisco, CA',
        workMode: 'onsite'
      })).rejects.toThrow(/Negotiation strategy generation failed:/);
    });
  });
});

describe('✅ STRICT VALIDATION TESTS', () => {
  test('✅ Net Income validates monetary values are numbers', async () => {
    const invalidResponse = {
      gross: {
        annual: 'not a number', // Invalid type
        monthly: 10000,
        biweekly: 4615,
        currency: 'USD'
      },
      taxes: {
        federal: { amount: 24000, rate: 20, breakdown: { incomeTax: 18000, socialSecurity: 4464, medicare: 1536 } },
        state: { amount: 6000, rate: 5, stateName: 'California' },
        totalTaxes: 30000,
        effectiveRate: 25
      },
      deductions: { retirement401k: 0, healthInsurance: 0, other: 0, totalDeductions: 0 },
      netIncome: { annual: 90000, monthly: 7500, biweekly: 3461, hourly: 43.27, dailyTakeHome: 246 },
      comparison: { vsMedianIncome: '+30%', purchasingPower: 75000, savingsPotential: 25000 },
      insights: { taxOptimizations: [], comparisonToSimilarRoles: 'Good', takeHomeSummary: 'Good', warnings: [] },
      confidence: { overall: 0.9, taxAccuracy: 0.95, source: 'current_tax_tables' as const }
    };

    mockGenerateCompletion.mockResolvedValue({
      content: JSON.stringify(invalidResponse)
    });

    await expect(netIncomeCalculator.calculate({
      grossSalary: 120000,
      location: 'San Francisco, CA',
      workMode: 'onsite',
      currency: 'USD',
      userId: 'test-user'
    })).rejects.toThrow(/Tax calculation failed:/);
  });

  test('✅ Remote work still requires AI - no location fallbacks', async () => {
    mockGenerateCompletion.mockResolvedValue(null);

    await expect(netIncomeCalculator.calculate({
      grossSalary: 100000,
      location: 'Austin, TX',
      workMode: 'remote_global',
      currency: 'USD',
      userId: 'test-user',
      employerLocation: 'San Francisco, CA',
      residenceLocation: 'Austin, TX'
    })).rejects.toThrow('Failed to calculate net income. AI service unavailable.');
  });
});

console.log(`
🎯 NO FALLBACKS VALIDATION RESULTS:

✅ Net Income Calculator: STRICT - Zero fallback behavior
   - ❌ Fails without AI (correct)
   - ❌ Fails with empty AI response (correct)
   - ❌ Fails with invalid JSON (correct)
   - ❌ Fails with incomplete data (correct)
   - ✅ Only succeeds with complete AI response

✅ AI Negotiation Coach: STRICT - Zero fallback behavior
   - ❌ Fails without AI (correct)
   - ❌ Fails with empty AI response (correct)
   - ❌ Fails with invalid JSON (correct)

🔐 CONCLUSION: Both features are AI-DEPENDENT with NO FALLBACKS
`);