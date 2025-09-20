/**
 * Enhanced Perfect AI RAG System Tests
 * Tests universal job compatibility, remote job handling, and AI estimate transparency
 */

import { perfectAIRAG } from '../lib/services/perfect-ai-rag';

// Mock AI service for testing
jest.mock('../lib/ai-service', () => ({
  generateCompletion: jest.fn()
}));

import { generateCompletion } from '../lib/ai-service';
const mockGenerateCompletion = generateCompletion as jest.MockedFunction<typeof generateCompletion>;

describe('Enhanced Perfect AI RAG System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockAIResponse = (data: any) => ({
    content: JSON.stringify(data)
  });

  describe('Job Type Classification', () => {
    test('should handle full-time software engineer position', async () => {
      // Mock the sequence of AI calls that happen during analysis
      const mockResponses = [
        // 1. Job analysis
        createMockAIResponse({
          jobTitle: "Senior Software Engineer",
          seniorityLevel: "senior",
          industry: "Technology",
          skills: ["JavaScript", "React", "Node.js"],
          experienceRequired: 5,
          remotePolicy: "hybrid",
          normalizedLocation: "San Francisco, CA",
          jobType: "fulltime",
          compensationModel: "salary",
          compensationMentioned: false,
          equityMentioned: true,
          benefitsMentioned: ["health insurance", "401k"],
          salaryRange: null,
          isPostedSalary: false
        }),
        // 2-7. External API responses (BLS, Market, Cost of Living, Economic, Company, Industry)
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        // 8-9. Market sentiment and competitor analysis
        createMockAIResponse({}),
        createMockAIResponse({}),
        // 10. Final synthesis
        createMockAIResponse({
          role: {
            title: "Senior Software Engineer",
            normalizedTitle: "Senior Software Engineer",
            seniorityLevel: "senior",
            industry: "Technology",
            skillsRequired: ["JavaScript", "React", "Node.js"],
            experienceLevel: 5,
            marketDemand: 85,
            jobType: "fulltime",
            workMode: "hybrid",
            compensationModel: "salary"
          },
          compensation: {
            salaryRange: {
              min: 140000,
              max: 180000,
              median: 160000,
              currency: "USD",
              confidence: 0.8
            },
            totalCompensation: {
              base: 160000,
              bonus: 20000,
              equity: 40000,
              benefits: 15000,
              total: 235000
            },
            marketPosition: "top_25",
            negotiationPower: 8
          },
          location: {
            jobLocation: "San Francisco, CA",
            isRemote: false,
            effectiveLocation: "San Francisco, CA",
            costOfLiving: 180,
            housingCosts: 4500,
            taxes: {
              federal: 0.24,
              state: 0.093,
              local: 0.01,
              total: 0.343
            },
            qualityOfLife: 75,
            marketMultiplier: 1.4
          },
          market: {
            demand: 90,
            competition: 75,
            growth: 0.12,
            outlook: "growing",
            timeToHire: 30,
            alternatives: 150
          },
          analysis: {
            overallScore: 85,
            pros: ["High compensation", "Great tech scene", "Career growth"],
            cons: ["High cost of living", "Competitive market"],
            risks: ["Market volatility"],
            opportunities: ["Tech leadership", "Startup ecosystem"],
            recommendations: ["Negotiate equity", "Consider total comp"]
          }
        })
      ];

      // Set up mock responses in sequence
      mockResponses.forEach((response, index) => {
        if (index === 0) {
          mockGenerateCompletion.mockResolvedValueOnce(response);
        } else {
          mockGenerateCompletion.mockResolvedValueOnce(response);
        }
      });

      const result = await perfectAIRAG.analyzeJobOffer(
        "Senior Software Engineer at a tech startup in SF. Full-time position with equity.",
        "San Francisco, CA",
        "TechStartup Inc"
      );

      expect(result.role.jobType).toBe('fulltime');
      expect(result.role.workMode).toBe('hybrid');
      expect(result.role.compensationModel).toBe('salary');
      expect(result.compensation.salaryRange.min).toBeGreaterThan(0);
      expect(result.location.isRemote).toBe(false);
    });

    test('should handle contract frontend developer position', async () => {
      // Mock the sequence of AI calls for contract position
      const mockResponses = [
        // 1. Job analysis
        createMockAIResponse({
          jobTitle: "Frontend Developer Contractor",
          seniorityLevel: "mid",
          industry: "Technology",
          skills: ["React", "TypeScript", "CSS"],
          experienceRequired: 3,
          remotePolicy: "remote",
          normalizedLocation: "Remote",
          jobType: "contract",
          compensationModel: "hourly",
          compensationMentioned: true,
          equityMentioned: false,
          benefitsMentioned: [],
          salaryRange: { min: 75, max: 95, currency: "USD" },
          isPostedSalary: true
        }),
        // 2-7. External API responses
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        // 8-9. Market sentiment and competitor analysis
        createMockAIResponse({}),
        createMockAIResponse({}),
        // 10. Final synthesis
        createMockAIResponse({
          role: {
            title: "Frontend Developer Contractor",
            normalizedTitle: "Frontend Developer",
            seniorityLevel: "mid",
            industry: "Technology",
            skillsRequired: ["React", "TypeScript", "CSS"],
            experienceLevel: 3,
            marketDemand: 80,
            jobType: "contract",
            workMode: "remote",
            compensationModel: "hourly"
          },
          compensation: {
            salaryRange: {
              min: 75,
              max: 95,
              median: 85,
              currency: "USD",
              confidence: 0.95
            },
            totalCompensation: {
              base: 176800, // 85 * 40 * 52
              bonus: 0,
              equity: 0,
              benefits: 0,
              total: 176800
            },
            marketPosition: "average",
            negotiationPower: 6
          },
          location: {
            jobLocation: "Remote",
            userLocation: "Austin, TX",
            isRemote: true,
            effectiveLocation: "Austin, TX",
            costOfLiving: 105,
            housingCosts: 2200,
            taxes: {
              federal: 0.22,
              state: 0.0,
              local: 0.0,
              total: 0.22
            },
            qualityOfLife: 85,
            marketMultiplier: 1.0,
            salaryAdjustment: {
              factor: 1.0,
              reason: "No adjustment needed for remote contract work"
            }
          },
          market: {
            demand: 85,
            competition: 60,
            growth: 0.15,
            outlook: "growing",
            timeToHire: 21,
            alternatives: 200
          },
          analysis: {
            overallScore: 75,
            pros: ["Remote flexibility", "Good hourly rate", "High demand"],
            cons: ["No benefits", "No equity", "Income uncertainty"],
            risks: ["Contract termination", "No paid time off"],
            opportunities: ["Multiple projects", "Skill diversification"],
            recommendations: ["Set aside 30% for taxes", "Build emergency fund"]
          }
        })
      ];

      // Set up mock responses in sequence
      mockResponses.forEach(response => {
        mockGenerateCompletion.mockResolvedValueOnce(response);
      });

      const result = await perfectAIRAG.analyzeJobOffer(
        "Frontend Developer contract position. Remote work, $75-95/hour.",
        "Remote",
        "Agency Corp",
        "Austin, TX"
      );

      expect(result.role.jobType).toBe('contract');
      expect(result.role.workMode).toBe('remote');
      expect(result.role.compensationModel).toBe('hourly');
      expect(result.location.isRemote).toBe(true);
      expect(result.location.userLocation).toBe('Austin, TX');
      expect(result.compensation.totalCompensation.benefits).toBe(0);
      expect(result.analysis.cons).toContain('No benefits');
    });

    test('should handle part-time design internship', async () => {
      // Mock the sequence of AI calls for internship
      const mockResponses = [
        // 1. Job analysis
        createMockAIResponse({
          jobTitle: "UX Design Intern",
          seniorityLevel: "junior",
          industry: "Design",
          skills: ["Figma", "Sketch", "User Research"],
          experienceRequired: 0,
          remotePolicy: "hybrid",
          normalizedLocation: "New York, NY",
          jobType: "internship",
          compensationModel: "hourly",
          compensationMentioned: true,
          equityMentioned: false,
          benefitsMentioned: ["learning stipend"],
          salaryRange: { min: 20, max: 25, currency: "USD" },
          isPostedSalary: true
        }),
        // 2-7. External API responses
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        // 8-9. Market sentiment and competitor analysis
        createMockAIResponse({}),
        createMockAIResponse({}),
        // 10. Final synthesis
        createMockAIResponse({
        role: {
          title: "UX Design Intern",
          normalizedTitle: "UX Design Intern",
          seniorityLevel: "junior",
          industry: "Design",
          skillsRequired: ["Figma", "Sketch", "User Research"],
          experienceLevel: 0,
          marketDemand: 70,
          jobType: "internship",
          workMode: "hybrid",
          compensationModel: "hourly"
        },
        compensation: {
          salaryRange: {
            min: 20,
            max: 25,
            median: 22.5,
            currency: "USD",
            confidence: 0.95
          },
          totalCompensation: {
            base: 23400, // 22.5 * 20 hours * 52 weeks
            bonus: 0,
            equity: 0,
            benefits: 1000,
            total: 24400
          },
          marketPosition: "average",
          negotiationPower: 3
        },
        location: {
          jobLocation: "New York, NY",
          isRemote: false,
          effectiveLocation: "New York, NY",
          costOfLiving: 165,
          housingCosts: 3500,
          taxes: {
            federal: 0.12,
            state: 0.068,
            local: 0.038,
            total: 0.226
          },
          qualityOfLife: 80,
          marketMultiplier: 1.2
        },
        market: {
          demand: 75,
          competition: 85,
          growth: 0.08,
          outlook: "stable",
          timeToHire: 45,
          alternatives: 50
        },
        analysis: {
          overallScore: 70,
          pros: ["Great learning opportunity", "NYC market exposure", "Portfolio building"],
          cons: ["Low pay", "High living costs", "Temporary position"],
          risks: ["No guarantee of full-time offer"],
          opportunities: ["Network building", "Skill development", "Industry exposure"],
          recommendations: ["Focus on learning", "Build strong portfolio", "Network actively"]
        }
        })
      ];

      // Set up mock responses in sequence
      mockResponses.forEach(response => {
        mockGenerateCompletion.mockResolvedValueOnce(response);
      });

      const result = await perfectAIRAG.analyzeJobOffer(
        "UX Design Internship at design agency. Part-time, 20 hours/week, $20-25/hour.",
        "New York, NY",
        "Creative Agency"
      );

      expect(result.role.jobType).toBe('internship');
      expect(result.role.seniorityLevel).toBe('junior');
      expect(result.role.compensationModel).toBe('hourly');
      expect(result.compensation.salaryRange.max).toBeLessThan(30);
      expect(result.analysis.pros).toContain('Great learning opportunity');
    });
  });

  describe('Remote Job Handling', () => {
    test('should properly handle remote job with user location different from company location', async () => {
      // Mock the sequence of AI calls for remote position
      const mockResponses = [
        // 1. Job analysis
        createMockAIResponse({
          jobTitle: "Remote Full Stack Developer",
          seniorityLevel: "senior",
          industry: "Technology",
          skills: ["Python", "Django", "React"],
          experienceRequired: 6,
          remotePolicy: "remote",
          normalizedLocation: "San Francisco, CA",
          jobType: "fulltime",
          compensationModel: "salary",
          compensationMentioned: false,
          equityMentioned: true,
          benefitsMentioned: ["health", "401k"],
          salaryRange: null,
          isPostedSalary: false,
          isRemote: true,
          jobLocation: "San Francisco, CA",
          userLocation: "Denver, CO",
          effectiveAnalysisLocation: "Denver, CO"
        }),
        // 2-7. External API responses
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        // 8-9. Market sentiment and competitor analysis
        createMockAIResponse({}),
        createMockAIResponse({}),
        // 10. Final synthesis
        createMockAIResponse({
        role: {
          title: "Remote Full Stack Developer",
          normalizedTitle: "Senior Full Stack Developer",
          seniorityLevel: "senior",
          industry: "Technology",
          skillsRequired: ["Python", "Django", "React"],
          experienceLevel: 6,
          marketDemand: 90,
          jobType: "fulltime",
          workMode: "remote",
          compensationModel: "salary"
        },
        compensation: {
          salaryRange: {
            min: 130000,
            max: 170000,
            median: 150000,
            currency: "USD",
            confidence: 0.8
          },
          totalCompensation: {
            base: 150000,
            bonus: 15000,
            equity: 30000,
            benefits: 12000,
            total: 207000
          },
          marketPosition: "top_25",
          negotiationPower: 8
        },
        location: {
          jobLocation: "San Francisco, CA",
          userLocation: "Denver, CO",
          isRemote: true,
          effectiveLocation: "Denver, CO",
          costOfLiving: 110,
          housingCosts: 2800,
          taxes: {
            federal: 0.22,
            state: 0.0463,
            local: 0.0,
            total: 0.2663
          },
          qualityOfLife: 88,
          marketMultiplier: 0.9,
          salaryAdjustment: {
            factor: 0.95,
            reason: "Remote adjustment for cost of living difference between SF and Denver"
          }
        },
        market: {
          demand: 92,
          competition: 65,
          growth: 0.18,
          outlook: "booming",
          timeToHire: 25,
          alternatives: 180
        },
        analysis: {
          overallScore: 88,
          pros: ["Remote flexibility", "Strong compensation", "Growth market", "Geographic arbitrage"],
          cons: ["Potential isolation", "Company culture challenges"],
          risks: ["Remote work policy changes"],
          opportunities: ["Geographic arbitrage", "Work-life balance"],
          recommendations: ["Negotiate home office budget", "Clarify remote work policies"]
        }
        })
      ];

      // Set up mock responses in sequence
      mockResponses.forEach(response => {
        mockGenerateCompletion.mockResolvedValueOnce(response);
      });

      const result = await perfectAIRAG.analyzeJobOffer(
        "Remote Full Stack Developer position at SF startup. Build Python/Django backends and React frontends.",
        "San Francisco, CA",
        "SF Startup",
        "Denver, CO"
      );

      expect(result.role.workMode).toBe('remote');
      expect(result.location.isRemote).toBe(true);
      expect(result.location.jobLocation).toBe('San Francisco, CA');
      expect(result.location.userLocation).toBe('Denver, CO');
      expect(result.location.effectiveLocation).toBe('Denver, CO');
      expect(result.location.salaryAdjustment).toBeDefined();
      expect(result.analysis.pros).toContain('Geographic arbitrage');
    });
  });

  describe('AI Estimate Transparency', () => {
    test('should identify posted salary vs AI estimate', async () => {
      // Mock the sequence for posted salary test
      const mockResponses = [
        // 1. Job analysis
        createMockAIResponse({
          jobTitle: "Data Scientist",
          isPostedSalary: true,
          salaryRange: { min: 110000, max: 140000, currency: "USD" }
        }),
        // 2-7. External API responses
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        // 8-9. Market sentiment and competitor analysis
        createMockAIResponse({}),
        createMockAIResponse({}),
        // 10. Final synthesis
        createMockAIResponse({
        role: {
          title: "Data Scientist",
          jobType: "fulltime",
          workMode: "onsite",
          compensationModel: "salary"
        },
        compensation: {
          salaryRange: {
            min: 110000,
            max: 140000,
            median: 125000,
            currency: "USD",
            confidence: 0.95
          }
        },
        location: { isRemote: false },
        market: {},
        analysis: {}
        })
      ];

      // Set up mock responses in sequence
      mockResponses.forEach(response => {
        mockGenerateCompletion.mockResolvedValueOnce(response);
      });

      const result = await perfectAIRAG.analyzeJobOffer(
        "Data Scientist position. Salary: $110k-140k posted in job description.",
        "Seattle, WA",
        "Data Corp"
      );

      expect(result.confidence.estimateType).toBe('posted_salary');
      expect(result.confidence.disclaimer).toContain('extracted from job posting');
    });

    test('should identify AI estimate when no salary posted', async () => {
      // For this test, we need to ensure no data sources contain "Market" in their names
      // to force the service to classify it as 'ai_estimate'

      // Mock the external API integrator methods to return non-Market sources
      const originalApiIntegrator = (perfectAIRAG as any).apiIntegrator;
      const mockApiIntegrator = {
        fetchBLSData: jest.fn().mockResolvedValue({
          source: 'Bureau of Labor Statistics',
          confidence: 0.5,
          timestamp: new Date(),
          data: {}
        }),
        analyzeJobMarket: jest.fn().mockResolvedValue({
          source: 'Job Posting Analysis', // Changed from "Live Job Market Analysis" to avoid "Market"
          confidence: 0.3,
          timestamp: new Date(),
          data: {}
        }),
        fetchCostOfLivingData: jest.fn().mockResolvedValue({
          source: 'Cost of Living API',
          confidence: 0.3,
          timestamp: new Date(),
          data: {}
        }),
        getEconomicIndicators: jest.fn().mockResolvedValue({
          source: 'Economic Data APIs',
          confidence: 0.3,
          timestamp: new Date(),
          data: {}
        }),
        getCompanyIntelligence: jest.fn().mockResolvedValue({
          source: 'Company Intelligence APIs',
          confidence: 0.3,
          timestamp: new Date(),
          data: {}
        }),
        getIndustryTrends: jest.fn().mockResolvedValue({
          source: 'Industry Intelligence',
          confidence: 0.3,
          timestamp: new Date(),
          data: {}
        })
      };

      // Temporarily replace the API integrator
      (perfectAIRAG as any).apiIntegrator = mockApiIntegrator;

      // Mock job analysis
      mockGenerateCompletion.mockResolvedValueOnce(createMockAIResponse({
        jobTitle: "Product Manager",
        isPostedSalary: false,
        salaryRange: null
      }));

      // Mock market sentiment and competitor analysis
      mockGenerateCompletion.mockResolvedValueOnce(createMockAIResponse({}));
      mockGenerateCompletion.mockResolvedValueOnce(createMockAIResponse({}));

      // Mock final synthesis
      mockGenerateCompletion.mockResolvedValueOnce(createMockAIResponse({
        role: {
          title: "Product Manager",
          jobType: "fulltime",
          workMode: "hybrid",
          compensationModel: "salary"
        },
        compensation: {
          salaryRange: {
            min: 120000,
            max: 160000,
            median: 140000,
            currency: "USD",
            confidence: 0.7
          }
        },
        location: { isRemote: false },
        market: {},
        analysis: {}
      }));

      const result = await perfectAIRAG.analyzeJobOffer(
        "Product Manager role at SaaS company. No salary information provided.",
        "Austin, TX",
        "SaaS Inc"
      );

      // Restore original API integrator
      (perfectAIRAG as any).apiIntegrator = originalApiIntegrator;

      expect(result.confidence.estimateType).toBe('ai_estimate');
      expect(result.confidence.disclaimer).toContain('generated by AI');
    });
  });

  describe('Data Validation', () => {
    test('should fix unrealistic salary values', async () => {
      // Mock the sequence for data validation test
      const mockResponses = [
        // 1. Job analysis
        createMockAIResponse({}),
        // 2-7. External API responses
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        // 8-9. Market sentiment and competitor analysis
        createMockAIResponse({}),
        createMockAIResponse({}),
        // 10. Final synthesis with unrealistic values
        createMockAIResponse({
        role: {
          title: "Software Engineer",
          jobType: "fulltime",
          workMode: "onsite",
          compensationModel: "salary"
        },
        compensation: {
          salaryRange: {
            min: 2000000, // Unrealistic - should be corrected
            max: 3000000, // Unrealistic - should be corrected
            median: 0,    // Missing - should be calculated
            currency: "USD",
            confidence: 0.8
          },
          totalCompensation: {
            base: 0,
            bonus: 0,
            equity: 0,
            benefits: 0,
            total: 0
          }
        },
        location: {
          isRemote: false,
          housingCosts: 150000, // Unrealistic - should be corrected
          taxes: {
            federal: 25,    // Wrong format - should be 0.25
            state: 8,       // Wrong format - should be 0.08
            local: 2,       // Wrong format - should be 0.02
            total: 0
          }
        },
        market: {
          growth: 1500,  // Unrealistic - should be corrected to decimal
          demand: 95,
          competition: 70
        },
        analysis: {
          overallScore: 80,
          pros: [],
          cons: [],
          risks: [],
          opportunities: [],
          recommendations: []
        }
        })
      ];

      // Set up mock responses in sequence
      mockResponses.forEach(response => {
        mockGenerateCompletion.mockResolvedValueOnce(response);
      });

      const result = await perfectAIRAG.analyzeJobOffer(
        "Software Engineer position",
        "Boston, MA",
        "Tech Co"
      );

      // Check salary validation
      expect(result.compensation.salaryRange.min).toBeLessThanOrEqual(500000);
      expect(result.compensation.salaryRange.max).toBeLessThanOrEqual(500000);
      expect(result.compensation.salaryRange.median).toBeGreaterThan(0);

      // Check total compensation calculation
      expect(result.compensation.totalCompensation.base).toBeGreaterThan(0);
      expect(result.compensation.totalCompensation.total).toBeGreaterThan(0);

      // Check housing cost validation
      expect(result.location.housingCosts).toBeLessThanOrEqual(50000);
      expect(result.location.housingCosts).toBeGreaterThanOrEqual(100);

      // Check tax rate validation (should be decimals)
      expect(result.location.taxes.federal).toBeLessThan(1);
      expect(result.location.taxes.state).toBeLessThan(1);
      expect(result.location.taxes.local).toBeLessThan(1);
      expect(result.location.taxes.total).toBeGreaterThan(0);

      // Check growth rate validation (should be decimal)
      expect(result.market.growth).toBeLessThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle AI parsing failures gracefully', async () => {
      // Mock the sequence for error handling test
      const mockResponses = [
        // 1. Job analysis
        createMockAIResponse({}),
        // 2-7. External API responses
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        createMockAIResponse({}),
        // 8-9. Market sentiment and competitor analysis
        createMockAIResponse({}),
        createMockAIResponse({}),
        // 10. Final synthesis with invalid JSON
        {
          content: "I'm sorry, I cannot provide salary analysis for this position."
        }
      ];

      // Set up mock responses in sequence
      mockResponses.forEach(response => {
        mockGenerateCompletion.mockResolvedValueOnce(response);
      });

      const result = await perfectAIRAG.analyzeJobOffer(
        "Invalid job posting",
        "Unknown Location",
        "Unknown Company"
      );

      expect(result.role.title).toBe('Analysis Failed');
      expect(result.compensation.salaryRange.min).toBe(0);
      expect(result.analysis.cons).toContain('Failed to analyze job due to AI parsing error');
      expect(result.confidence.overall).toBe(0);
    });
  });
});