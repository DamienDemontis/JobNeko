/**
 * Tests for Net Income Calculator and AI Negotiation Coach
 * Ensures both features work with AI RAG and handle edge cases
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

describe('Net Income Calculator with AI RAG', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Location-Aware Tax Calculations', () => {
    it('should calculate net income for onsite work in high-tax state', async () => {
      const mockAIResponse = {
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
            amount: 9600,
            rate: 8,
            stateName: 'California'
          },
          local: {
            amount: 1200,
            rate: 1,
            locality: 'San Francisco'
          },
          totalTaxes: 34800,
          effectiveRate: 29
        },
        deductions: {
          retirement401k: 6000,
          healthInsurance: 2400,
          other: 0,
          totalDeductions: 8400
        },
        netIncome: {
          annual: 76800,
          monthly: 6400,
          biweekly: 2953,
          hourly: 36.92,
          dailyTakeHome: 210
        },
        comparison: {
          vsMedianIncome: '+45% vs local median',
          purchasingPower: 65000,
          savingsPotential: 15000
        },
        insights: {
          taxOptimizations: [
            'Consider maxing out 401k contributions to reduce taxable income',
            'Health Savings Account (HSA) contributions can provide triple tax benefits'
          ],
          comparisonToSimilarRoles: 'Your net income is competitive for the Bay Area',
          takeHomeSummary: 'You will take home $6,400/month after all taxes and deductions',
          warnings: []
        },
        confidence: {
          overall: 0.95,
          taxAccuracy: 0.98,
          source: 'current_tax_tables' as const
        }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(mockAIResponse)
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        profile: {
          currentLocation: 'San Francisco, CA',
          filingStatus: 'single',
          stateOfResidence: 'California'
        }
      } as any);

      const result = await netIncomeCalculator.calculate({
        grossSalary: 120000,
        location: 'San Francisco, CA',
        workMode: 'onsite',
        currency: 'USD',
        userId: 'user-123',
        retirement401k: 6000,
        healthInsurance: 2400
      });

      expect(result.netIncome.annual).toBe(76800);
      expect(result.taxes.effectiveRate).toBe(29);
      expect(result.taxes.state.stateName).toBe('California');
      expect(result.taxes.local?.locality).toBe('San Francisco');
    });

    it('should handle remote work with different residence and employer locations', async () => {
      const mockAIResponse = {
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
            amount: 0,
            rate: 0,
            stateName: 'Texas'
          },
          totalTaxes: 24000,
          effectiveRate: 20
        },
        deductions: {
          retirement401k: 0,
          healthInsurance: 0,
          other: 0,
          totalDeductions: 0
        },
        netIncome: {
          annual: 96000,
          monthly: 8000,
          biweekly: 3692,
          hourly: 46.15,
          dailyTakeHome: 263
        },
        remoteWorkConsiderations: {
          taxComplexity: 'moderate' as const,
          multiStateTax: true,
          recommendedWithholding: 2000,
          quarterlyEstimates: 500,
          notes: [
            'Texas has no state income tax - significant savings',
            'Employer in California may require some withholding',
            'Consider quarterly estimated tax payments'
          ]
        },
        comparison: {
          vsMedianIncome: '+65% vs local median',
          purchasingPower: 110000,
          savingsPotential: 35000
        },
        insights: {
          taxOptimizations: ['Living in no-tax state provides major advantage'],
          comparisonToSimilarRoles: 'Excellent tax situation',
          takeHomeSummary: 'Remote work in Texas saves you ~$9,600/year in state taxes',
          warnings: ['Ensure proper tax documentation for multi-state work']
        },
        confidence: {
          overall: 0.92,
          taxAccuracy: 0.95,
          source: 'current_tax_tables' as const
        }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(mockAIResponse)
      });

      const result = await netIncomeCalculator.calculate({
        grossSalary: 120000,
        location: 'San Francisco, CA',
        workMode: 'remote_country',
        currency: 'USD',
        userId: 'user-123',
        employerLocation: 'San Francisco, CA',
        residenceLocation: 'Austin, TX'
      });

      expect(result.netIncome.annual).toBe(96000);
      expect(result.taxes.state.rate).toBe(0);
      expect(result.remoteWorkConsiderations?.multiStateTax).toBe(true);
      expect(result.remoteWorkConsiderations?.taxComplexity).toBe('moderate');
    });

    it('should include total compensation with benefits', async () => {
      const mockAIResponse = {
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
            stateName: 'New York'
          },
          totalTaxes: 30000,
          effectiveRate: 25
        },
        deductions: {
          retirement401k: 6000,
          healthInsurance: 3600,
          other: 0,
          totalDeductions: 9600
        },
        netIncome: {
          annual: 80400,
          monthly: 6700,
          biweekly: 3092,
          hourly: 38.65,
          dailyTakeHome: 220
        },
        totalCompensation: {
          baseSalary: 120000,
          benefits: 15600, // 401k match + health contribution
          bonuses: 25000, // signing + performance
          equity: 0,
          total: 160600,
          totalAfterTax: 120600
        },
        comparison: {
          vsMedianIncome: '+30% vs local median',
          purchasingPower: 72000,
          savingsPotential: 20000
        },
        insights: {
          taxOptimizations: [],
          comparisonToSimilarRoles: 'Competitive total compensation package',
          takeHomeSummary: 'Total compensation of $160,600 with $120,600 after-tax value',
          warnings: []
        },
        confidence: {
          overall: 0.95,
          taxAccuracy: 0.97,
          source: 'current_tax_tables' as const
        }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(mockAIResponse)
      });

      const result = await netIncomeCalculator.calculate({
        grossSalary: 120000,
        location: 'New York, NY',
        workMode: 'hybrid',
        currency: 'USD',
        userId: 'user-123',
        retirement401k: 6000,
        healthInsurance: 3600,
        employerMatch401k: 6000,
        employerHealthContribution: 9600,
        signingBonus: 10000,
        performanceBonus: 15000
      });

      expect(result.totalCompensation?.total).toBe(160600);
      expect(result.totalCompensation?.benefits).toBe(15600);
      expect(result.totalCompensation?.bonuses).toBe(25000);
    });
  });

  describe('Error Handling', () => {
    it('should fail when AI service is unavailable', async () => {
      mockGenerateCompletion.mockResolvedValue(null);

      await expect(netIncomeCalculator.calculate({
        grossSalary: 120000,
        location: 'New York, NY',
        workMode: 'onsite',
        currency: 'USD',
        userId: 'user-123'
      })).rejects.toThrow('Failed to calculate net income. AI service unavailable.');
    });
  });
});

describe('AI Negotiation Coach', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Resume-Based Strategy Generation', () => {
    it('should generate personalized strategy when user has resume', async () => {
      const mockAIResponse = {
        readiness: {
          score: 85,
          hasResume: true,
          hasAdditionalInfo: true,
          profileCompleteness: 90,
          missingElements: [],
          recommendation: 'You are well-prepared for negotiation with strong leverage'
        },
        leverage: {
          score: 'high' as const,
          factors: [
            'Strong technical skills match',
            'Competing offers available',
            '5 years relevant experience'
          ],
          strengths: [
            'Python expertise aligns perfectly with role',
            'Previous experience at similar companies',
            'Strong educational background'
          ],
          weaknesses: [
            'Limited experience with specific framework',
            'Asking above initial range'
          ]
        },
        strategies: [
          {
            approach: 'Value-Based Negotiation',
            successProbability: 75,
            script: 'I appreciate the offer. Based on my research and the value I bring...',
            riskLevel: 'low' as const,
            expectedOutcome: '10-15% increase likely',
            whenToUse: 'Initial counter-offer'
          }
        ],
        salaryRecommendations: {
          conservative: {
            amount: 130000,
            successRate: 90,
            rationale: 'Safe increase within budget'
          },
          target: {
            amount: 140000,
            successRate: 70,
            rationale: 'Market rate for your skills'
          },
          aggressive: {
            amount: 150000,
            successRate: 40,
            rationale: 'Top of range, requires strong justification'
          }
        },
        negotiationScript: {
          opening: 'Thank you for the offer. I\'m excited about the opportunity...',
          keyPoints: [
            'Highlight specific achievements from resume',
            'Reference market data',
            'Emphasize unique value proposition'
          ],
          handlingObjections: [
            {
              objection: 'That\'s above our budget',
              response: 'I understand budget constraints. Can we explore total compensation?'
            }
          ],
          closingStrategy: 'Request time to consider, commit to response timeline'
        },
        nonMonetaryNegotiations: {
          flexibleWork: 'Request additional WFH days',
          additionalPTO: 'Ask for extra week vacation',
          signingBonus: 'Request $10-15k signing bonus',
          titleUpgrade: 'Negotiate for Senior title',
          equityIncrease: 'Ask for additional stock options',
          professionalDevelopment: 'Request $5k annual learning budget'
        },
        timeline: {
          idealNegotiationWindow: 'Within 48-72 hours of offer',
          responseTimeframe: '24-48 hours for counter',
          decisionDeadline: 'Request 1 week for final decision',
          followUpSchedule: ['Day 2: Initial response', 'Day 4: Counter if needed']
        },
        redFlags: ['Pressure for immediate decision', 'Unwillingness to negotiate'],
        bestPractices: ['Get offer in writing', 'Negotiate total package'],
        personalizedInsights: [
          'Your Python expertise gives you strong leverage',
          'Similar roles at competitors pay 15% more',
          'Your 2 years at Google adds significant credibility'
        ]
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(mockAIResponse)
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        profile: {
          yearsOfExperience: 5,
          currentSalary: 110000,
          additionalInfo: 'Led team of 5, delivered 3 major projects',
          skills: JSON.stringify(['Python', 'AWS', 'Docker'])
        },
        resumes: [{
          filename: 'resume.pdf',
          extractedText: 'Software Engineer at Google...',
          skills: JSON.stringify(['Python', 'Machine Learning']),
          isActive: true
        }]
      } as any);

      const result = await aiNegotiationCoach.generateStrategy({
        userId: 'user-123',
        jobId: 'job-123',
        jobTitle: 'Senior Software Engineer',
        company: 'TechCorp',
        currentOffer: {
          baseSalary: 120000
        },
        location: 'San Francisco, CA',
        workMode: 'hybrid',
        hasCompetingOffers: true,
        competingOffers: [
          { company: 'Competitor Inc', salary: 135000 }
        ]
      });

      expect(result.readiness.score).toBe(85);
      expect(result.readiness.hasResume).toBe(true);
      expect(result.leverage.score).toBe('high');
      expect(result.salaryRecommendations.target.amount).toBe(140000);
      expect(result.personalizedInsights).toContain('Your Python expertise gives you strong leverage');
    });

    it('should provide generic strategy when user has no resume', async () => {
      const mockAIResponse = {
        readiness: {
          score: 45,
          hasResume: false,
          hasAdditionalInfo: false,
          profileCompleteness: 30,
          missingElements: [
            'Resume (required for personalized strategy)',
            'Additional context about your experience',
            'Key achievements'
          ],
          recommendation: 'Upload your resume for a personalized negotiation strategy'
        },
        leverage: {
          score: 'medium' as const,
          factors: ['General market conditions'],
          strengths: ['Job market favors candidates'],
          weaknesses: ['Limited information about your background']
        },
        strategies: [
          {
            approach: 'Standard Counter',
            successProbability: 50,
            script: 'Generic negotiation approach...',
            riskLevel: 'medium' as const,
            expectedOutcome: '5-10% increase possible',
            whenToUse: 'General negotiation'
          }
        ],
        salaryRecommendations: {
          conservative: {
            amount: 126000,
            successRate: 80,
            rationale: 'Standard 5% increase'
          },
          target: {
            amount: 132000,
            successRate: 60,
            rationale: 'Market average increase'
          },
          aggressive: {
            amount: 138000,
            successRate: 30,
            rationale: 'Ambitious without supporting data'
          }
        },
        negotiationScript: {
          opening: 'Thank you for the offer...',
          keyPoints: ['General market rates', 'Basic value proposition'],
          handlingObjections: [],
          closingStrategy: 'Standard closing'
        },
        nonMonetaryNegotiations: {
          flexibleWork: 'Standard request',
          additionalPTO: 'Standard request',
          signingBonus: 'Standard request',
          titleUpgrade: 'Consider if applicable',
          equityIncrease: 'Standard request',
          professionalDevelopment: 'Standard request'
        },
        timeline: {
          idealNegotiationWindow: 'Within 72 hours',
          responseTimeframe: '48 hours',
          decisionDeadline: '1 week',
          followUpSchedule: ['Day 3: Follow up']
        },
        redFlags: [],
        bestPractices: ['Get offer in writing'],
        personalizedInsights: []
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(mockAIResponse)
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        profile: null,
        resumes: []
      } as any);

      const result = await aiNegotiationCoach.generateStrategy({
        userId: 'user-123',
        jobId: 'job-123',
        jobTitle: 'Software Engineer',
        company: 'TechCorp',
        currentOffer: {
          baseSalary: 120000
        },
        location: 'San Francisco, CA',
        workMode: 'onsite'
      });

      expect(result.readiness.score).toBe(45);
      expect(result.readiness.hasResume).toBe(false);
      expect(result.readiness.missingElements).toContain('Resume (required for personalized strategy)');
      expect(result.leverage.score).toBe('medium');
    });
  });

  describe('Error Handling', () => {
    it('should fail when AI service is unavailable', async () => {
      mockGenerateCompletion.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com'
      } as any);

      await expect(aiNegotiationCoach.generateStrategy({
        userId: 'user-123',
        jobId: 'job-123',
        jobTitle: 'Software Engineer',
        company: 'TechCorp',
        location: 'San Francisco, CA',
        workMode: 'onsite'
      })).rejects.toThrow('Failed to generate negotiation strategy. AI service unavailable.');
    });

    it('should fail when user not found', async () => {
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
});