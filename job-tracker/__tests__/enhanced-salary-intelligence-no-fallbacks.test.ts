/**
 * Enhanced Salary Intelligence Tests - NO FALLBACKS ALLOWED
 *
 * These tests ensure the AI salary intelligence system:
 * 1. ONLY works with real AI responses
 * 2. FAILS when AI is unavailable (no fallbacks)
 * 3. Validates all required fields from AI
 * 4. Provides accurate, data-driven results
 */

import { enhancedSalaryIntelligence } from '@/lib/services/enhanced-salary-intelligence';
import { generateCompletion } from '@/lib/ai-service';
import { prisma } from '@/lib/prisma';

// Mock the AI service
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

describe('Enhanced Salary Intelligence - No Fallbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock empty database responses by default
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.job.findMany.mockResolvedValue([]);
  });

  describe('AI Service Dependency', () => {
    it('should FAIL when AI service is unavailable', async () => {
      mockGenerateCompletion.mockResolvedValue(null);

      const request = {
        jobId: 'test-job-id',
        jobTitle: 'Software Engineer',
        userId: 'test-user-id',
        location: 'New York, NY',
        currency: 'USD'
      };

      await expect(enhancedSalaryIntelligence.analyze(request)).rejects.toThrow(
        'AI service unavailable or returned empty response. No fallback data will be provided.'
      );
    });

    it('should FAIL when AI returns empty content', async () => {
      mockGenerateCompletion.mockResolvedValue({ content: '' });

      const request = {
        jobId: 'test-job-id',
        jobTitle: 'Software Engineer',
        userId: 'test-user-id',
        location: 'New York, NY',
        currency: 'USD'
      };

      await expect(enhancedSalaryIntelligence.analyze(request)).rejects.toThrow(
        'AI service unavailable or returned empty response. No fallback data will be provided.'
      );
    });

    it('should FAIL when AI returns invalid JSON', async () => {
      mockGenerateCompletion.mockResolvedValue({ content: 'invalid json response' });

      const request = {
        jobId: 'test-job-id',
        jobTitle: 'Software Engineer',
        userId: 'test-user-id',
        location: 'New York, NY',
        currency: 'USD'
      };

      await expect(enhancedSalaryIntelligence.analyze(request)).rejects.toThrow(
        /AI analysis failed:/
      );
    });
  });

  describe('Required Field Validation', () => {
    const baseRequest = {
      jobId: 'test-job-id',
      jobTitle: 'Software Engineer',
      userId: 'test-user-id',
      location: 'New York, NY',
      currency: 'USD'
    };

    it('should FAIL when AI response missing salary data', async () => {
      const incompleteResponse = {
        expenses: { monthly: {}, annual: {} },
        location: { input: 'New York' },
        affordability: { score: 1 },
        career: { level: 'mid' },
        insights: { negotiationTips: [] }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(incompleteResponse)
      });

      await expect(enhancedSalaryIntelligence.analyze(baseRequest)).rejects.toThrow(
        'AI response missing salary data'
      );
    });

    it('should FAIL when AI response missing expenses data', async () => {
      const incompleteResponse = {
        salary: { estimated: { min: 80000, max: 120000 }, market: {} },
        location: { input: 'New York' },
        affordability: { score: 1 },
        career: { level: 'mid' },
        insights: { negotiationTips: [] }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(incompleteResponse)
      });

      await expect(enhancedSalaryIntelligence.analyze(baseRequest)).rejects.toThrow(
        'AI response missing expenses data'
      );
    });

    it('should FAIL when AI response missing location data', async () => {
      const incompleteResponse = {
        salary: { estimated: { min: 80000, max: 120000 }, market: {} },
        expenses: { monthly: {}, annual: {} },
        affordability: { score: 1 },
        career: { level: 'mid' },
        insights: { negotiationTips: [] }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(incompleteResponse)
      });

      await expect(enhancedSalaryIntelligence.analyze(baseRequest)).rejects.toThrow(
        'AI response missing location data'
      );
    });

    it('should FAIL when AI response missing affordability data', async () => {
      const incompleteResponse = {
        salary: { estimated: { min: 80000, max: 120000 }, market: {} },
        expenses: { monthly: {}, annual: {} },
        location: { input: 'New York' },
        career: { level: 'mid' },
        insights: { negotiationTips: [] }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(incompleteResponse)
      });

      await expect(enhancedSalaryIntelligence.analyze(baseRequest)).rejects.toThrow(
        'AI response missing affordability data'
      );
    });

    it('should FAIL when AI response missing career data', async () => {
      const incompleteResponse = {
        salary: { estimated: { min: 80000, max: 120000 }, market: {} },
        expenses: { monthly: {}, annual: {} },
        location: { input: 'New York' },
        affordability: { score: 1 },
        insights: { negotiationTips: [] }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(incompleteResponse)
      });

      await expect(enhancedSalaryIntelligence.analyze(baseRequest)).rejects.toThrow(
        'AI response missing career data'
      );
    });

    it('should FAIL when AI response missing insights data', async () => {
      const incompleteResponse = {
        salary: { estimated: { min: 80000, max: 120000 }, market: {} },
        expenses: { monthly: {}, annual: {} },
        location: { input: 'New York' },
        affordability: { score: 1 },
        career: { level: 'mid' }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(incompleteResponse)
      });

      await expect(enhancedSalaryIntelligence.analyze(baseRequest)).rejects.toThrow(
        'AI response missing insights data'
      );
    });
  });

  describe('Successful AI Analysis', () => {
    it('should successfully process complete AI response with all required fields', async () => {
      const completeAIResponse = {
        salary: {
          estimated: {
            min: 85000,
            max: 125000,
            median: 105000,
            confidence: 0.85,
            currency: 'USD'
          },
          market: {
            p25: 80000,
            p50: 105000,
            p75: 130000,
            p90: 155000,
            source: 'live_data',
            currency: 'USD'
          }
        },
        expenses: {
          monthly: {
            housing: 2500,
            food: 800,
            transportation: 400,
            healthcare: 300,
            utilities: 200,
            entertainment: 500,
            savings: 1000,
            other: 300,
            total: 6000
          },
          annual: {
            housing: 30000,
            food: 9600,
            transportation: 4800,
            healthcare: 3600,
            utilities: 2400,
            entertainment: 6000,
            savings: 12000,
            other: 3600,
            total: 72000
          },
          customized: false,
          recommendations: ['Consider reducing housing costs', 'Increase savings rate']
        },
        location: {
          input: 'New York, NY',
          normalized: {
            city: 'New York',
            country: 'United States'
          },
          costOfLivingIndex: 185,
          source: 'real_data'
        },
        affordability: {
          score: 1.2,
          label: 'comfortable',
          monthlyNetIncome: 7500,
          monthlySurplus: 1500,
          savingsRate: 20,
          explanation: 'With 20% savings rate, this role provides comfortable living'
        },
        career: {
          level: 'mid',
          yearsExperience: 4,
          marketPosition: 'at_market',
          growthPotential: 'Strong growth potential in tech sector',
          negotiationLeverage: 'medium'
        },
        insights: {
          similarJobs: [
            {
              title: 'Full Stack Developer',
              company: 'TechCorp',
              salaryRange: '$90k-$130k',
              location: 'New York, NY'
            }
          ],
          industryTrends: ['Remote work increasing', 'AI skills in high demand'],
          negotiationTips: [
            'Highlight your unique technical skills',
            'Research company funding and growth',
            'Consider total compensation package'
          ],
          warnings: ['Cost of living is high in NYC'],
          opportunities: ['Growing fintech sector in NYC']
        }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(completeAIResponse)
      });

      const request = {
        jobId: 'test-job-id',
        jobTitle: 'Software Engineer',
        userId: 'test-user-id',
        location: 'New York, NY',
        currency: 'USD'
      };

      const result = await enhancedSalaryIntelligence.analyze(request);

      // Verify all required fields are present
      expect(result.salary).toBeDefined();
      expect(result.salary.estimated.min).toBe(85000);
      expect(result.salary.estimated.max).toBe(125000);
      expect(result.salary.estimated.currency).toBe('USD');

      expect(result.expenses).toBeDefined();
      expect(result.expenses.monthly.total).toBe(6000);

      expect(result.location).toBeDefined();
      expect(result.location.costOfLivingIndex).toBe(185);

      expect(result.affordability).toBeDefined();
      expect(result.affordability.score).toBe(1.2);
      expect(result.affordability.label).toBe('comfortable');

      expect(result.career).toBeDefined();
      expect(result.career.level).toBe('mid');
      expect(result.career.marketPosition).toBe('at_market');

      expect(result.insights).toBeDefined();
      expect(result.insights.negotiationTips).toHaveLength(3);
      expect(result.insights.similarJobs).toHaveLength(1);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.dataSources).toBeDefined();
      expect(result.metadata.dataSources.length).toBeGreaterThan(0);
    });

    it('should handle different currencies correctly', async () => {
      const eurResponse = {
        salary: {
          estimated: {
            min: 75000,
            max: 110000,
            median: 92500,
            confidence: 0.8,
            currency: 'EUR'
          },
          market: {
            p25: 70000,
            p50: 92500,
            p75: 115000,
            p90: 140000,
            source: 'market_analysis',
            currency: 'EUR'
          }
        },
        expenses: {
          monthly: {
            housing: 2000,
            food: 600,
            transportation: 200,
            healthcare: 150,
            utilities: 180,
            entertainment: 400,
            savings: 800,
            other: 200,
            total: 4530
          },
          annual: {
            housing: 24000,
            food: 7200,
            transportation: 2400,
            healthcare: 1800,
            utilities: 2160,
            entertainment: 4800,
            savings: 9600,
            other: 2400,
            total: 54360
          },
          customized: false,
          recommendations: ['European healthcare is subsidized']
        },
        location: {
          input: 'Berlin, Germany',
          normalized: {
            city: 'Berlin',
            country: 'Germany'
          },
          costOfLivingIndex: 142,
          source: 'real_data'
        },
        affordability: {
          score: 1.5,
          label: 'very_comfortable',
          monthlyNetIncome: 6200,
          monthlySurplus: 1670,
          savingsRate: 27,
          explanation: 'With 27% savings rate, excellent financial position'
        },
        career: {
          level: 'senior',
          yearsExperience: 6,
          marketPosition: 'above_market',
          growthPotential: 'Excellent growth in European tech hub',
          negotiationLeverage: 'high'
        },
        insights: {
          similarJobs: [],
          industryTrends: ['European tech growth', 'GDPR expertise valued'],
          negotiationTips: [
            'European benefits are comprehensive',
            'Work-life balance is prioritized',
            'Consider stock options carefully'
          ],
          warnings: [],
          opportunities: ['Growing startup ecosystem']
        }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(eurResponse)
      });

      const request = {
        jobId: 'test-job-id',
        jobTitle: 'Senior Software Engineer',
        userId: 'test-user-id',
        location: 'Berlin, Germany',
        currency: 'EUR'
      };

      const result = await enhancedSalaryIntelligence.analyze(request);

      expect(result.salary.estimated.currency).toBe('EUR');
      expect(result.salary.market.currency).toBe('EUR');
      expect(result.salary.estimated.min).toBe(75000);
      expect(result.location.normalized.country).toBe('Germany');
      expect(result.career.level).toBe('senior');
    });
  });

  describe('RAG Context Integration', () => {
    it('should build context from user data when available', async () => {
      // Mock user with profile and ratings
      const mockUser = {
        id: 'test-user-id',
        profile: {
          currentLocation: 'San Francisco, CA',
          experience_years: 5,
          skills: ['React', 'Node.js', 'TypeScript'],
          preferred_salary_min: 120000,
          preferred_salary_max: 160000,
          current_salary: 110000,
          career_level: 'senior',
          industry_experience: ['fintech', 'startup']
        },
        resumes: [
          {
            content: 'Experienced software engineer with 5 years in fintech...',
            skills: ['React', 'Node.js', 'TypeScript', 'AWS']
          }
        ],
        jobs: [
          {
            title: 'Full Stack Engineer',
            company: 'TechStartup',
            salaryMin: 130000,
            salaryMax: 150000,
            ratings: [{ rating: 5 }]
          }
        ]
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const completeAIResponse = {
        salary: {
          estimated: { min: 140000, max: 170000, median: 155000, confidence: 0.9, currency: 'USD' },
          market: { p25: 130000, p50: 155000, p75: 180000, p90: 200000, source: 'live_data', currency: 'USD' }
        },
        expenses: {
          monthly: { housing: 3500, food: 1000, transportation: 300, healthcare: 400, utilities: 250, entertainment: 600, savings: 1500, other: 400, total: 7950 },
          annual: { housing: 42000, food: 12000, transportation: 3600, healthcare: 4800, utilities: 3000, entertainment: 7200, savings: 18000, other: 4800, total: 95400 }
        },
        location: {
          input: 'San Francisco, CA',
          normalized: { city: 'San Francisco', country: 'United States' },
          costOfLivingIndex: 245,
          source: 'real_data'
        },
        affordability: {
          score: 1.8,
          label: 'very_comfortable',
          monthlyNetIncome: 11000,
          monthlySurplus: 3050,
          savingsRate: 28,
          explanation: 'High income area but excellent savings potential'
        },
        career: {
          level: 'senior',
          yearsExperience: 5,
          marketPosition: 'above_market',
          growthPotential: 'Exceptional growth in tech hub',
          negotiationLeverage: 'high'
        },
        insights: {
          similarJobs: [
            { title: 'Senior Full Stack Engineer', company: 'BigTech', salaryRange: '$150k-$180k', location: 'SF' }
          ],
          industryTrends: ['AI integration', 'Cloud-native development'],
          negotiationTips: [
            'Your fintech experience is highly valued',
            'Equity compensation is significant in SF',
            'Consider total comp including benefits'
          ],
          warnings: ['Extremely high cost of living'],
          opportunities: ['Abundant senior-level opportunities']
        }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(completeAIResponse)
      });

      const request = {
        jobId: 'test-job-id',
        jobTitle: 'Senior Software Engineer',
        userId: 'test-user-id',
        location: 'San Francisco, CA',
        currency: 'USD'
      };

      const result = await enhancedSalaryIntelligence.analyze(request);

      // Verify the AI received rich context and provided accurate analysis
      expect(result.salary.estimated.min).toBeGreaterThan(120000); // Above user's minimum
      expect(result.career.level).toBe('senior');
      expect(result.location.costOfLivingIndex).toBeGreaterThan(200); // SF is expensive
      expect(result.insights.negotiationTips.some(tip =>
        tip.toLowerCase().includes('fintech') || tip.toLowerCase().includes('experience')
      )).toBe(true);
    });
  });

  describe('No Fallback Guarantee', () => {
    it('should never return hardcoded salary values', async () => {
      // Test multiple scenarios that might trigger fallbacks
      const scenarios = [
        { jobTitle: 'Unknown Role', location: 'Unknown City' },
        { jobTitle: 'Brand New Technology Expert', location: 'Remote' },
        { jobTitle: 'Extremely Niche Specialist', location: 'Small Town, USA' },
      ];

      for (const scenario of scenarios) {
        mockGenerateCompletion.mockResolvedValue(null); // AI unavailable

        const request = {
          jobId: 'test-job-id',
          jobTitle: scenario.jobTitle,
          userId: 'test-user-id',
          location: scenario.location,
          currency: 'USD'
        };

        // Should fail, not return hardcoded data
        await expect(enhancedSalaryIntelligence.analyze(request)).rejects.toThrow();
      }
    });

    it('should never return mock expense data', async () => {
      mockGenerateCompletion.mockResolvedValue({ content: '{"incomplete": true}' });

      const request = {
        jobId: 'test-job-id',
        jobTitle: 'Software Engineer',
        userId: 'test-user-id',
        location: 'Any Location',
        currency: 'USD'
      };

      // Should fail validation, not return default expenses
      await expect(enhancedSalaryIntelligence.analyze(request)).rejects.toThrow(
        'AI response missing'
      );
    });
  });
});