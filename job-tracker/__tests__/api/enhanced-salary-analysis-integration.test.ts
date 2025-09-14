/**
 * Enhanced Salary Analysis API Integration Tests
 *
 * Tests the complete end-to-end flow of the enhanced salary analysis API
 * WITHOUT any fallback systems. Ensures the API fails gracefully when
 * AI services are unavailable and only returns real AI-generated data.
 */

import { POST } from '@/app/api/salary/enhanced-analysis/route';
import { generateCompletion } from '@/lib/ai-service';
import { verifyToken } from '@/lib/auth';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/ai-service');
jest.mock('@/lib/auth');
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
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('/api/salary/enhanced-analysis Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful auth by default
    mockVerifyToken.mockReturnValue({
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User'
    });
  });

  const createMockRequest = (body: any) => {
    const request = {
      headers: new Map([
        ['Authorization', 'Bearer valid-token'],
        ['Content-Type', 'application/json']
      ]),
      json: async () => body
    } as unknown as NextRequest;

    // Mock headers.get method
    request.headers.get = (name: string) => {
      const headers = new Map([
        ['authorization', 'Bearer valid-token'],
        ['content-type', 'application/json']
      ]);
      return headers.get(name.toLowerCase()) || null;
    };

    return request;
  };

  describe('AI Service Failures', () => {
    it('should return 500 when AI service is completely unavailable', async () => {
      mockGenerateCompletion.mockResolvedValue(null);

      const requestBody = {
        job: {
          id: 'job-123',
          title: 'Software Engineer',
        },
        analysisLocation: 'New York, NY',
        currency: 'USD'
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Analysis failed');
      expect(data.details).toContain('AI service unavailable');
    });

    it('should return 500 when AI returns invalid JSON', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: 'This is not valid JSON at all!'
      });

      const requestBody = {
        job: {
          id: 'job-123',
          title: 'Data Scientist',
        },
        analysisLocation: 'San Francisco, CA',
        currency: 'USD'
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Analysis failed');
      expect(data.details).toContain('AI analysis failed');
    });

    it('should return 500 when AI response is incomplete', async () => {
      const incompleteAIResponse = {
        salary: {
          estimated: { min: 80000, max: 120000 }
          // Missing other required fields
        }
        // Missing expenses, location, affordability, career, insights
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(incompleteAIResponse)
      });

      const requestBody = {
        job: {
          id: 'job-123',
          title: 'Product Manager',
        },
        analysisLocation: 'Austin, TX',
        currency: 'USD'
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Analysis failed');
      expect(data.details).toMatch(/AI response missing/);
    });
  });

  describe('Successful AI Analysis', () => {
    it('should return complete analysis when AI provides all required data', async () => {
      const completeAIResponse = {
        salary: {
          estimated: {
            min: 95000,
            max: 135000,
            median: 115000,
            confidence: 0.88,
            currency: 'USD'
          },
          market: {
            p25: 85000,
            p50: 115000,
            p75: 145000,
            p90: 170000,
            source: 'live_data',
            currency: 'USD'
          }
        },
        expenses: {
          monthly: {
            housing: 2800,
            food: 750,
            transportation: 450,
            healthcare: 350,
            utilities: 220,
            entertainment: 550,
            savings: 1200,
            other: 380,
            total: 6700
          },
          annual: {
            housing: 33600,
            food: 9000,
            transportation: 5400,
            healthcare: 4200,
            utilities: 2640,
            entertainment: 6600,
            savings: 14400,
            other: 4560,
            total: 80400
          },
          customized: false,
          recommendations: [
            'Consider reducing housing costs to under 30% of income',
            'Excellent savings rate of 15%+'
          ]
        },
        location: {
          input: 'Seattle, WA',
          normalized: {
            city: 'Seattle',
            country: 'United States'
          },
          costOfLivingIndex: 172,
          source: 'real_data'
        },
        affordability: {
          score: 1.4,
          label: 'comfortable',
          monthlyNetIncome: 8200,
          monthlySurplus: 1500,
          savingsRate: 18.3,
          explanation: 'Comfortable living with healthy savings rate of 18.3%'
        },
        career: {
          level: 'senior',
          yearsExperience: 5,
          marketPosition: 'at_market',
          growthPotential: 'Strong growth potential in Pacific Northwest tech hub',
          negotiationLeverage: 'medium'
        },
        insights: {
          similarJobs: [
            {
              title: 'Senior Software Engineer',
              company: 'Amazon',
              salaryRange: '$120k-$160k',
              location: 'Seattle, WA'
            },
            {
              title: 'Software Engineer III',
              company: 'Microsoft',
              salaryRange: '$110k-$150k',
              location: 'Redmond, WA'
            }
          ],
          industryTrends: [
            'Cloud computing expertise in high demand',
            'Remote work policies becoming permanent',
            'AI/ML skills commanding premium salaries'
          ],
          negotiationTips: [
            'Highlight cloud platform experience (AWS, Azure)',
            'Seattle market is competitive - leverage multiple offers',
            'Total compensation often includes significant stock options'
          ],
          warnings: [
            'High cost of living in Seattle metro area',
            'Traffic and commute times can be significant'
          ],
          opportunities: [
            'Growing startup ecosystem beyond big tech',
            'Strong demand for senior engineers',
            'Remote work opportunities with Seattle companies'
          ]
        }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(completeAIResponse)
      });

      const requestBody = {
        job: {
          id: 'job-456',
          title: 'Senior Software Engineer',
          company: 'TechCorp',
          description: 'Build scalable cloud applications...',
          location: 'Seattle, WA'
        },
        analysisLocation: 'Seattle, WA',
        currency: 'USD',
        expenseProfile: {
          housing: 0.35,
          food: 0.15,
          transportation: 0.10,
          healthcare: 0.08,
          utilities: 0.05,
          entertainment: 0.12,
          savings: 0.20,
          other: 0.05
        }
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();

      // Verify salary data
      expect(data.data.salary.estimated.min).toBe(95000);
      expect(data.data.salary.estimated.max).toBe(135000);
      expect(data.data.salary.estimated.currency).toBe('USD');
      expect(data.data.salary.market.p50).toBe(115000);

      // Verify expenses (totals may be adjusted by expense profile processing)
      expect(data.data.expenses.monthly.total).toBeGreaterThan(0);
      expect(data.data.expenses.annual.total).toBeGreaterThan(0);

      // Verify location analysis
      expect(data.data.location.normalized.city).toBe('Seattle');
      expect(data.data.location.costOfLivingIndex).toBe(172);

      // Verify affordability
      expect(data.data.affordability.score).toBe(1.4);
      expect(data.data.affordability.label).toBe('comfortable');

      // Verify career analysis
      expect(data.data.career.level).toBe('senior');
      expect(data.data.career.marketPosition).toBe('at_market');

      // Verify insights
      expect(data.data.insights.negotiationTips).toHaveLength(3);
      expect(data.data.insights.similarJobs).toHaveLength(2);
      expect(data.data.insights.industryTrends).toHaveLength(3);
    });

    it('should handle different currencies correctly', async () => {
      const gbpAIResponse = {
        salary: {
          estimated: {
            min: 65000,
            max: 90000,
            median: 77500,
            confidence: 0.82,
            currency: 'GBP'
          },
          market: {
            p25: 60000,
            p50: 77500,
            p75: 95000,
            p90: 110000,
            source: 'market_analysis',
            currency: 'GBP'
          }
        },
        expenses: {
          monthly: {
            housing: 1800,
            food: 600,
            transportation: 300,
            healthcare: 100,
            utilities: 180,
            entertainment: 400,
            savings: 800,
            other: 220,
            total: 4400
          },
          annual: {
            housing: 21600,
            food: 7200,
            transportation: 3600,
            healthcare: 1200,
            utilities: 2160,
            entertainment: 4800,
            savings: 9600,
            other: 2640,
            total: 52800
          },
          customized: false,
          recommendations: ['NHS healthcare reduces medical costs significantly']
        },
        location: {
          input: 'London, UK',
          normalized: {
            city: 'London',
            country: 'United Kingdom'
          },
          costOfLivingIndex: 195,
          source: 'real_data'
        },
        affordability: {
          score: 1.1,
          label: 'comfortable',
          monthlyNetIncome: 5200,
          monthlySurplus: 800,
          savingsRate: 15.4,
          explanation: 'Comfortable living in London with 15.4% savings rate'
        },
        career: {
          level: 'mid',
          yearsExperience: 3,
          marketPosition: 'at_market',
          growthPotential: 'Good growth opportunities in London fintech',
          negotiationLeverage: 'medium'
        },
        insights: {
          similarJobs: [],
          industryTrends: ['Fintech growth in London', 'Brexit impact stabilizing'],
          negotiationTips: [
            'London market is competitive',
            'Consider pension contributions',
            'Holiday allowance is generous in UK'
          ],
          warnings: ['High cost of living in Zone 1-2'],
          opportunities: ['Strong fintech sector growth']
        }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(gbpAIResponse)
      });

      const requestBody = {
        job: {
          id: 'job-789',
          title: 'Software Developer',
        },
        analysisLocation: 'London, UK',
        currency: 'GBP'
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.salary.estimated.currency).toBe('GBP');
      expect(data.data.salary.market.currency).toBe('GBP');
      expect(data.data.location.normalized.country).toBe('United Kingdom');
    });
  });

  describe('Input Validation', () => {
    it('should return 401 when no authorization token provided', async () => {
      const requestBody = {
        job: { id: 'job-123', title: 'Engineer' },
        analysisLocation: 'NYC'
      };

      const request = {
        headers: { get: () => null },
        json: async () => requestBody
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when token is invalid', async () => {
      mockVerifyToken.mockReturnValue(null);

      const requestBody = {
        job: { id: 'job-123', title: 'Engineer' },
        analysisLocation: 'NYC'
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid token');
    });

    it('should return 400 when required fields are missing', async () => {
      const requestBody = {
        job: { id: 'job-123' }, // Missing title
        // Missing analysisLocation
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when job title is not a string', async () => {
      const requestBody = {
        job: {
          id: 'job-123',
          title: '   ' // Only whitespace
        },
        analysisLocation: 'New York'
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Job title must be a non-empty string');
    });
  });

  describe('Data-Driven Results Verification', () => {
    it('should never return hardcoded salary values even on edge cases', async () => {
      // Test with unusual job titles that might trigger fallbacks
      const unusualJobs = [
        'Quantum Computing Specialist',
        'Metaverse Architect',
        'AI Ethics Consultant',
        'Blockchain Interoperability Engineer'
      ];

      for (const jobTitle of unusualJobs) {
        mockGenerateCompletion.mockResolvedValue(null); // Force AI failure

        const requestBody = {
          job: { id: 'unusual-job', title: jobTitle },
          analysisLocation: 'Remote'
        };

        const request = createMockRequest(requestBody);
        const response = await POST(request);

        // Should fail, never return mock data
        expect(response.status).toBe(500);

        const data = await response.json();
        expect(data.error).toBe('Analysis failed');
      }
    });

    it('should provide realistic salary ranges based on AI analysis', async () => {
      const realisticAIResponse = {
        salary: {
          estimated: {
            min: 160000,
            max: 220000,
            median: 190000,
            confidence: 0.91,
            currency: 'USD'
          },
          market: {
            p25: 150000,
            p50: 190000,
            p75: 230000,
            p90: 280000,
            source: 'live_data',
            currency: 'USD'
          }
        },
        expenses: {
          monthly: {
            housing: 4500,
            food: 1200,
            transportation: 400,
            healthcare: 500,
            utilities: 300,
            entertainment: 800,
            savings: 2500,
            other: 500,
            total: 10700
          },
          annual: {
            housing: 54000,
            food: 14400,
            transportation: 4800,
            healthcare: 6000,
            utilities: 3600,
            entertainment: 9600,
            savings: 30000,
            other: 6000,
            total: 128400
          },
          customized: false,
          recommendations: ['High income allows for aggressive savings']
        },
        location: {
          input: 'San Francisco, CA',
          normalized: {
            city: 'San Francisco',
            country: 'United States'
          },
          costOfLivingIndex: 270,
          source: 'real_data'
        },
        affordability: {
          score: 2.1,
          label: 'very_comfortable',
          monthlyNetIncome: 13500,
          monthlySurplus: 2800,
          savingsRate: 20.7,
          explanation: 'Excellent financial position with 20.7% savings rate'
        },
        career: {
          level: 'principal',
          yearsExperience: 10,
          marketPosition: 'above_market',
          growthPotential: 'Leadership track with equity upside',
          negotiationLeverage: 'high'
        },
        insights: {
          similarJobs: [
            {
              title: 'Principal Engineer',
              company: 'Google',
              salaryRange: '$180k-$250k',
              location: 'Mountain View, CA'
            }
          ],
          industryTrends: ['Principal level roles commanding premium'],
          negotiationTips: [
            'Focus on total compensation including equity',
            'Leadership experience is highly valued',
            'Consider signing bonus for role transition'
          ],
          warnings: ['Extremely high cost of living'],
          opportunities: ['IPO opportunities in SF startups']
        }
      };

      mockGenerateCompletion.mockResolvedValue({
        content: JSON.stringify(realisticAIResponse)
      });

      const requestBody = {
        job: {
          id: 'senior-role',
          title: 'Principal Software Engineer',
          company: 'Major Tech Company'
        },
        analysisLocation: 'San Francisco, CA',
        currency: 'USD'
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Verify realistic high-level compensation
      expect(data.data.salary.estimated.min).toBeGreaterThan(150000);
      expect(data.data.salary.estimated.max).toBeLessThan(300000);
      expect(data.data.career.level).toBe('principal');
      expect(data.data.location.costOfLivingIndex).toBeGreaterThan(200);
      expect(data.data.affordability.score).toBeGreaterThan(2.0);
    });
  });
});