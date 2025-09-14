/**
 * Strict No-Fallbacks Tests for New Features
 * Ensures ZERO fallback behavior - only real AI responses allowed
 */

import { netIncomeCalculator } from '@/lib/services/net-income-calculator';
import { aiNegotiationCoach } from '@/lib/services/ai-negotiation-coach';
import { generateCompletion } from '@/lib/ai-service';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/ai-service');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    job: {
      findMany: jest.fn(),
    },
  },
}));

const mockGenerateCompletion = generateCompletion as jest.MockedFunction<typeof generateCompletion>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Net Income Calculator - NO FALLBACKS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.job.findMany.mockResolvedValue([]);
  });

  test('MUST FAIL when AI returns null', async () => {
    mockGenerateCompletion.mockResolvedValue(null);

    await expect(netIncomeCalculator.calculate({
      grossSalary: 120000,
      location: 'San Francisco, CA',
      workMode: 'onsite',
      currency: 'USD',
      userId: 'user-123'
    })).rejects.toThrow('Failed to calculate net income. AI service unavailable.');
  });

  test('MUST FAIL when AI returns undefined', async () => {
    mockGenerateCompletion.mockResolvedValue(undefined as any);

    await expect(netIncomeCalculator.calculate({
      grossSalary: 120000,
      location: 'San Francisco, CA',
      workMode: 'onsite',
      currency: 'USD',
      userId: 'user-123'
    })).rejects.toThrow('Failed to calculate net income. AI service unavailable.');
  });

  test('MUST FAIL when AI returns empty content', async () => {
    mockGenerateCompletion.mockResolvedValue({ content: '' });

    await expect(netIncomeCalculator.calculate({
      grossSalary: 120000,
      location: 'San Francisco, CA',
      workMode: 'onsite',
      currency: 'USD',
      userId: 'user-123'
    })).rejects.toThrow('Failed to calculate net income. AI service unavailable.');
  });

  test('MUST FAIL when AI returns invalid JSON', async () => {
    mockGenerateCompletion.mockResolvedValue({ content: 'not json' });

    await expect(netIncomeCalculator.calculate({
      grossSalary: 120000,
      location: 'San Francisco, CA',
      workMode: 'onsite',
      currency: 'USD',
      userId: 'user-123'
    })).rejects.toThrow(/Tax calculation failed:/);
  });

  test('MUST FAIL when AI returns incomplete data', async () => {
    mockGenerateCompletion.mockResolvedValue({
      content: JSON.stringify({
        gross: { annual: 120000 },
        // Missing required taxes field
      })
    });

    await expect(netIncomeCalculator.calculate({
      grossSalary: 120000,
      location: 'San Francisco, CA',
      workMode: 'onsite',
      currency: 'USD',
      userId: 'user-123'
    })).rejects.toThrow('AI response missing critical tax calculation fields');
  });

  test('MUST SUCCEED only with complete AI response', async () => {
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
      userId: 'user-123'
    });

    expect(result.netIncome.annual).toBe(90000);
    expect(result.taxes.effectiveRate).toBe(25);
  });
});

describe('AI Negotiation Coach - NO FALLBACKS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      profile: null,
      resumes: [],
      jobs: []
    } as any);
    mockPrisma.job.findMany.mockResolvedValue([]);
  });

  test('MUST FAIL when AI returns null', async () => {
    mockGenerateCompletion.mockResolvedValue(null);

    await expect(aiNegotiationCoach.generateStrategy({
      userId: 'user-123',
      jobId: 'job-123',
      jobTitle: 'Software Engineer',
      company: 'TechCorp',
      location: 'San Francisco, CA',
      workMode: 'onsite'
    })).rejects.toThrow('Failed to generate negotiation strategy. AI service unavailable.');
  });

  test('MUST FAIL when AI returns empty content', async () => {
    mockGenerateCompletion.mockResolvedValue({ content: '' });

    await expect(aiNegotiationCoach.generateStrategy({
      userId: 'user-123',
      jobId: 'job-123',
      jobTitle: 'Software Engineer',
      company: 'TechCorp',
      location: 'San Francisco, CA',
      workMode: 'onsite'
    })).rejects.toThrow('Failed to generate negotiation strategy. AI service unavailable.');
  });

  test('MUST FAIL when AI returns invalid JSON', async () => {
    mockGenerateCompletion.mockResolvedValue({ content: 'invalid json' });

    await expect(aiNegotiationCoach.generateStrategy({
      userId: 'user-123',
      jobId: 'job-123',
      jobTitle: 'Software Engineer',
      company: 'TechCorp',
      location: 'San Francisco, CA',
      workMode: 'onsite'
    })).rejects.toThrow(/Negotiation strategy generation failed:/);
  });

  test('MUST FAIL when AI returns incomplete strategy', async () => {
    mockGenerateCompletion.mockResolvedValue({
      content: JSON.stringify({
        readiness: { score: 70 },
        // Missing required leverage and strategies fields
      })
    });

    await expect(aiNegotiationCoach.generateStrategy({
      userId: 'user-123',
      jobId: 'job-123',
      jobTitle: 'Software Engineer',
      company: 'TechCorp',
      location: 'San Francisco, CA',
      workMode: 'onsite'
    })).rejects.toThrow('AI response missing critical negotiation fields');
  });

  test('MUST SUCCEED only with complete AI strategy', async () => {
    const completeStrategy = {
      readiness: {
        score: 75,
        hasResume: false,
        hasAdditionalInfo: false,
        profileCompleteness: 50,
        missingElements: ['Resume'],
        recommendation: 'Upload resume for better strategy'
      },
      leverage: {
        score: 'medium' as const,
        factors: ['Market demand'],
        strengths: ['Experience'],
        weaknesses: ['No resume']
      },
      strategies: [{
        approach: 'Standard Counter',
        successProbability: 60,
        script: 'Thank you for the offer...',
        riskLevel: 'medium' as const,
        expectedOutcome: '10% increase',
        whenToUse: 'Initial response'
      }],
      salaryRecommendations: {
        conservative: {
          amount: 125000,
          successRate: 80,
          rationale: 'Safe increase'
        },
        target: {
          amount: 135000,
          successRate: 65,
          rationale: 'Market rate'
        },
        aggressive: {
          amount: 145000,
          successRate: 40,
          rationale: 'Ambitious'
        }
      },
      negotiationScript: {
        opening: 'Thank you for this opportunity...',
        keyPoints: ['Market research', 'Value proposition'],
        handlingObjections: [{
          objection: 'Budget constraints',
          response: 'I understand the constraints...'
        }],
        closingStrategy: 'Confirm next steps'
      },
      nonMonetaryNegotiations: {
        flexibleWork: 'Remote days',
        additionalPTO: 'Extra vacation',
        signingBonus: 'One-time payment',
        titleUpgrade: 'Senior title',
        equityIncrease: 'Stock options',
        professionalDevelopment: 'Learning budget'
      },
      timeline: {
        idealNegotiationWindow: '48-72 hours',
        responseTimeframe: '24-48 hours',
        decisionDeadline: '1 week',
        followUpSchedule: ['Day 2: Follow up']
      },
      redFlags: ['Pressure tactics'],
      bestPractices: ['Get in writing'],
      personalizedInsights: []
    };

    mockGenerateCompletion.mockResolvedValue({
      content: JSON.stringify(completeStrategy)
    });

    const result = await aiNegotiationCoach.generateStrategy({
      userId: 'user-123',
      jobId: 'job-123',
      jobTitle: 'Software Engineer',
      company: 'TechCorp',
      location: 'San Francisco, CA',
      workMode: 'onsite'
    });

    expect(result.readiness.score).toBe(75);
    expect(result.leverage.score).toBe('medium');
    expect(result.strategies).toHaveLength(1);
    expect(result.salaryRecommendations.target.amount).toBe(135000);
  });

  test('MUST FAIL when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(aiNegotiationCoach.generateStrategy({
      userId: 'invalid-user',
      jobId: 'job-123',
      jobTitle: 'Software Engineer',
      company: 'TechCorp',
      location: 'San Francisco, CA',
      workMode: 'onsite'
    })).rejects.toThrow('User profile not found');
  });
});

describe('Edge Cases - NO FALLBACKS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Net Income: Must handle remote work with no employer location', async () => {
    mockGenerateCompletion.mockResolvedValue({ content: '' });

    await expect(netIncomeCalculator.calculate({
      grossSalary: 100000,
      location: 'Austin, TX',
      workMode: 'remote_global',
      currency: 'USD',
      userId: 'user-123'
      // No employerLocation provided
    })).rejects.toThrow('Failed to calculate net income. AI service unavailable.');
  });

  test('Negotiation Coach: Must fail with empty job title', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      profile: null,
      resumes: [],
      jobs: []
    } as any);

    mockGenerateCompletion.mockResolvedValue({ content: '' });

    await expect(aiNegotiationCoach.generateStrategy({
      userId: 'user-123',
      jobId: 'job-123',
      jobTitle: '', // Empty title
      company: 'TechCorp',
      location: 'San Francisco, CA',
      workMode: 'onsite'
    })).rejects.toThrow('Failed to generate negotiation strategy. AI service unavailable.');
  });

  test('Must validate monetary fields are numbers', async () => {
    const invalidResponse = {
      gross: {
        annual: 'not a number', // Invalid
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
      userId: 'user-123'
    })).rejects.toThrow(/Tax calculation failed:/);
  });
});