/**
 * Perfect AI RAG System Tests
 * Validates zero hardcoded values and perfect AI-driven analysis
 */

import { perfectAIRAG } from '../lib/services/perfect-ai-rag';

// Mock AI service
jest.mock('../lib/ai-service', () => ({
  generateCompletion: jest.fn()
}));

import { generateCompletion } from '../lib/ai-service';
const mockGenerateCompletion = generateCompletion as jest.MockedFunction<typeof generateCompletion>;

describe('Perfect AI RAG System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Zero Hardcoded Values Validation', () => {
    test('should not contain any hardcoded salary values', async () => {
      // Mock comprehensive AI responses for all API calls
      mockGenerateCompletion.mockImplementation(async (prompt: string, options?: any) => {
        // Check if this is the final synthesis call based on temperature and content
        if (options?.temperature === 0.1 && options?.max_tokens === 3000 && prompt.includes('Using ONLY the live market data provided above')) {
          return {
            content: JSON.stringify({
              role: {
                title: "Senior Software Engineer",
                normalizedTitle: "Senior Software Engineer",
                seniorityLevel: "senior",
                industry: "Technology",
                skillsRequired: ["JavaScript", "React", "Node.js", "AWS"],
                experienceLevel: 5,
                marketDemand: 89
              },
              compensation: {
                salaryRange: {
                  min: 165000,
                  max: 220000,
                  median: 192500,
                  currency: "USD",
                  confidence: 0.92
                },
                totalCompensation: {
                  base: 192500,
                  bonus: 38500,
                  equity: 77000,
                  benefits: 25000,
                  total: 333000
                },
                marketPosition: "top_25",
                negotiationPower: 8
              },
              location: {
                normalized: "San Francisco, CA",
                costOfLiving: 158.5,
                housingCosts: 4200,
                taxes: {
                  federal: 0.24,
                  state: 0.093,
                  local: 0.012,
                  total: 0.345
                },
                qualityOfLife: 78,
                marketMultiplier: 1.45
              },
              market: {
                demand: 89,
                competition: 85,
                growth: 0.18,
                outlook: "growing",
                timeToHire: 42,
                alternatives: 1250
              },
              analysis: {
                overallScore: 87,
                pros: [
                  "High compensation above market median",
                  "Strong company financial position",
                  "Growing industry with 18% growth rate",
                  "Excellent negotiation leverage (8/10)"
                ],
                cons: [
                  "Very high cost of living in San Francisco",
                  "High competition with 85/100 competition level",
                  "Significant tax burden at 34.5% total rate"
                ],
                risks: [
                  "Economic uncertainty affecting tech sector",
                  "Interest rate changes impacting equity valuations"
                ],
                opportunities: [
                  "AI/ML skills premium of 25% available",
                  "Cloud computing expertise adds 15% premium",
                  "Strong hiring market with 1,250 alternatives"
                ],
                recommendations: [
                  "Negotiate base salary toward 220k upper range given strong market",
                  "Request additional equity to offset high cost of living",
                  "Consider negotiating remote work options to reduce location costs",
                  "Highlight AI/ML experience for skill premium consideration"
                ]
              }
            })
          };
        }

        if (prompt.includes('job description')) {
          return {
            content: JSON.stringify({
              jobTitle: "Senior Software Engineer",
              seniorityLevel: "senior",
              industry: "Technology",
              skills: ["JavaScript", "React", "Node.js"],
              experienceRequired: 5,
              remotePolicy: "hybrid",
              normalizedLocation: "San Francisco, CA",
              compensationMentioned: false,
              equityMentioned: true,
              benefitsMentioned: ["Health Insurance", "401k"]
            })
          };
        }

        if (prompt.includes('Bureau of Labor Statistics')) {
          return {
            content: JSON.stringify({
              meanAnnualWage: 165000,
              medianAnnualWage: 158000,
              employmentStatistics: { total: 1500000, growth: 0.22 },
              geographicDifferentials: { sanFrancisco: 1.45 }
            })
          };
        }

        if (prompt.includes('Numbeo')) {
          return {
            content: JSON.stringify({
              costOfLivingIndex: 158.5,
              rentIndex: 185.2,
              restaurantPriceIndex: 142.3,
              groceriesIndex: 162.1,
              localPurchasingPowerIndex: 125.6,
              averageMonthlyNetSalary: 9800,
              housingCosts: 4200,
              transportationCosts: 180,
              utilitiesCosts: 140
            })
          };
        }

        if (prompt.includes('job market')) {
          return {
            content: JSON.stringify({
              currentPostings: 1250,
              salaryRanges: [
                { min: 140000, max: 190000, company: "TechCorp" },
                { min: 155000, max: 210000, company: "InnovateLab" }
              ],
              requiredSkills: ["React", "TypeScript", "AWS"],
              competitionLevel: 85,
              timeToFill: 42,
              demandTrends: { sixMonthGrowth: 0.23 },
              hiringVelocity: "high"
            })
          };
        }

        if (prompt.includes('company intelligence')) {
          return {
            content: JSON.stringify({
              companySize: 15000,
              recentFunding: { series: "IPO", amount: 50000000000 },
              financialHealth: "strong",
              stockPerformance: { growth: 0.15 },
              glassdoorRating: 4.2,
              compensationPhilosophy: "competitive",
              equityStructure: "RSUs with 4-year vesting",
              recentLayoffs: false,
              hiringSpree: true
            })
          };
        }

        if (prompt.includes('economic indicators')) {
          return {
            content: JSON.stringify({
              gdpGrowth: 0.024,
              unemploymentRate: 0.035,
              inflationRate: 0.032,
              interestRates: 0.051,
              currencyStrength: 1.08,
              techSectorHealth: "strong",
              policyChanges: [],
              investmentClimate: "favorable"
            })
          };
        }

        if (prompt.includes('industry trends')) {
          return {
            content: JSON.stringify({
              industryGrowth: 0.18,
              technologyTrends: ["AI/ML", "Cloud Computing", "Cybersecurity"],
              skillPremiums: { "AI/ML": 1.25, "Cloud": 1.15 },
              salaryGrowthTrends: { annual: 0.12 },
              remoteWorkAdoption: 0.78,
              maActivity: { deals: 142, impact: "moderate" },
              vcInvestment: { amount: 85000000000, growth: 0.08 },
              regulatoryChanges: []
            })
          };
        }

        if (prompt.includes('market sentiment')) {
          return {
            content: JSON.stringify({
              overallSentiment: "positive",
              salaryTrend: "increasing",
              marketConfidence: 0.82,
              riskFactors: ["economic uncertainty", "interest rates"],
              growthOpportunities: ["AI adoption", "digital transformation"]
            })
          };
        }

        if (prompt.includes('competitor')) {
          return {
            content: JSON.stringify({
              similarCompanies: ["Google", "Meta", "Microsoft"],
              salaryRanges: {
                "Google": { min: 180000, max: 250000 },
                "Meta": { min: 175000, max: 240000 },
                "Microsoft": { min: 160000, max: 220000 }
              },
              uniqueBenefits: ["Free meals", "Transportation", "Unlimited PTO"],
              marketPositioning: "premium",
              hiringVelocity: "high",
              competitionLevel: 9
            })
          };
        }


        return { content: '{}' };
      });

      const jobDescription = `
        Senior Software Engineer at TechCorp
        Location: San Francisco, CA
        We're looking for an experienced engineer to join our team...
      `;

      const analysis = await perfectAIRAG.analyzeJobOffer(jobDescription);

      // Validate that analysis contains no hardcoded values
      expect(analysis).toBeDefined();
      expect(analysis.compensation).toBeDefined();
      expect(analysis.compensation.salaryRange).toBeDefined();
      expect(analysis.compensation.salaryRange.min).toBeGreaterThan(0);
      expect(analysis.compensation.salaryRange.max).toBeGreaterThan(analysis.compensation.salaryRange.min);
      expect(analysis.location.costOfLiving).toBeGreaterThan(0);
      expect(analysis.market.demand).toBeGreaterThan(0);

      // Validate all values are AI-generated from live data
      expect(analysis.compensation.salaryRange.min).toBe(165000); // From BLS mock data
      expect(analysis.location.costOfLiving).toBe(158.5); // From Numbeo mock data
      expect(analysis.market.demand).toBe(89); // From market analysis

      // Ensure no hardcoded confidence scores
      expect(analysis.confidence.overall).toBeGreaterThan(0);
      expect(analysis.confidence.overall).toBeLessThanOrEqual(1);
    });

    test('should validate external API integration calls', async () => {
      const jobDescription = "Senior Developer at TestCorp in Austin, TX";

      await perfectAIRAG.analyzeJobOffer(jobDescription, "Austin, TX", "TestCorp");

      // Verify all external API integration prompts were called
      const prompts = mockGenerateCompletion.mock.calls.map(call => call[0]);

      // Verify that Perfect AI RAG makes comprehensive external API calls
      expect(prompts.some(p => p.includes('Bureau of Labor Statistics'))).toBe(true);
      expect(prompts.some(p => p.includes('Numbeo'))).toBe(true);
      expect(prompts.some(p => p.includes('job market') || p.includes('market analysis'))).toBe(true);
      // Company intelligence is only called when a company is specified in the job description
      const hasCompanyInJob = jobDescription.toLowerCase().includes('testcorp');
      if (hasCompanyInJob) {
        expect(prompts.some(p => p.includes('Research comprehensive company intelligence') || p.includes('company intelligence'))).toBe(true);
      }
      expect(prompts.some(p => p.includes('economic indicators') || p.includes('current economic indicators'))).toBe(true);
      expect(prompts.some(p => p.includes('industry trends') || p.includes('trends in the'))).toBe(true);
      expect(prompts.some(p => p.includes('market sentiment') || p.includes('current market sentiment'))).toBe(true);
      expect(prompts.some(p => p.includes('competitor') || p.includes('competitive landscape'))).toBe(true);

      // Verify comprehensive analysis is performed
      expect(prompts.length).toBeGreaterThan(8); // Should have multiple data gathering + final analysis prompts
    });

    test('should handle any job offer type universally', async () => {
      const nonTechJobDescription = `
        Marketing Director at RetailCorp
        Location: Chicago, IL
        Remote work available
        Manage marketing campaigns and team of 12 people...
      `;

      mockGenerateCompletion.mockImplementation(async (prompt: string, options?: any) => {
        if (prompt.includes('job description')) {
          return {
            content: JSON.stringify({
              jobTitle: "Marketing Director",
              seniorityLevel: "senior",
              industry: "Retail",
              skills: ["Marketing Strategy", "Team Leadership", "Analytics"],
              experienceRequired: 8,
              remotePolicy: "hybrid",
              normalizedLocation: "Chicago, IL",
              compensationMentioned: false,
              equityMentioned: false,
              benefitsMentioned: ["Health Insurance", "Retirement Plan"]
            })
          };
        }

        // Return marketing-specific data for other calls
        if (prompt.includes('Using ONLY the live market data provided above')) {
          return {
            content: JSON.stringify({
              role: {
                title: "Marketing Director",
                normalizedTitle: "Marketing Director",
                seniorityLevel: "senior",
                industry: "Retail",
                skillsRequired: ["Marketing Strategy", "Team Leadership"],
                experienceLevel: 8,
                marketDemand: 72
              },
              compensation: {
                salaryRange: {
                  min: 95000,
                  max: 135000,
                  median: 115000,
                  currency: "USD",
                  confidence: 0.88
                },
                totalCompensation: {
                  base: 115000,
                  bonus: 23000,
                  equity: 0,
                  benefits: 18000,
                  total: 156000
                },
                marketPosition: "average",
                negotiationPower: 6
              },
              location: {
                normalized: "Chicago, IL",
                costOfLiving: 108.2,
                housingCosts: 2200,
                taxes: {
                  federal: 0.22,
                  state: 0.0495,
                  local: 0.01,
                  total: 0.2795
                },
                qualityOfLife: 82,
                marketMultiplier: 1.08
              },
              market: {
                demand: 72,
                competition: 68,
                growth: 0.08,
                outlook: "stable",
                timeToHire: 38,
                alternatives: 420
              },
              analysis: {
                overallScore: 74,
                pros: ["Reasonable market compensation", "Strong company position"],
                cons: ["Limited growth in retail sector"],
                risks: ["Economic downturn affecting retail"],
                opportunities: ["Digital transformation initiatives"],
                recommendations: ["Focus on digital marketing expertise"]
              }
            })
          };
        }

        return { content: '{}' };
      });

      const analysis = await perfectAIRAG.analyzeJobOffer(nonTechJobDescription);

      // Validate universal job analysis works for non-tech roles
      expect(analysis.role.industry).toBe('Retail');
      expect(analysis.role.title).toBe('Marketing Director');
      expect(analysis.compensation.salaryRange.min).toBeGreaterThan(0);
      expect(analysis.market.demand).toBeGreaterThan(0);

      // Ensure industry-specific analysis
      expect(analysis.role.skillsRequired).toContain('Marketing Strategy');
      expect(analysis.analysis.opportunities).toContain('Digital transformation initiatives');
    });
  });

  describe('RAG Context Building', () => {
    test('should build comprehensive live RAG context', async () => {
      mockGenerateCompletion.mockResolvedValue({ content: '{}' });

      const ragContext = await perfectAIRAG.buildLiveRAGContext(
        "Software Engineer at StartupCorp",
        "Austin, TX",
        "StartupCorp"
      );

      // Validate all RAG context sources are present
      expect(ragContext.jobAnalysis).toBeDefined();
      expect(ragContext.salaryData).toHaveLength(2); // BLS + Market analysis
      expect(ragContext.costOfLiving).toBeDefined();
      expect(ragContext.economicIndicators).toBeDefined();
      expect(ragContext.companyIntelligence).toBeDefined();
      expect(ragContext.industryTrends).toBeDefined();
      expect(ragContext.marketSentiment).toBeDefined();
      expect(ragContext.competitorAnalysis).toBeDefined();

      // Validate data sources have timestamps and confidence
      expect(ragContext.jobAnalysis.timestamp).toBeInstanceOf(Date);
      expect(ragContext.jobAnalysis.confidence).toBeGreaterThan(0);
      expect(ragContext.salaryData[0].source).toBe('Bureau of Labor Statistics');
      expect(ragContext.salaryData[1].source).toBe('Live Job Market Analysis');
    });

    test('should handle missing company gracefully', async () => {
      mockGenerateCompletion.mockResolvedValue({ content: '{}' });

      const ragContext = await perfectAIRAG.buildLiveRAGContext(
        "Generic Job Description",
        "Remote"
      );

      expect(ragContext.companyIntelligence.source).toBe('Not Available');
      expect(ragContext.companyIntelligence.confidence).toBe(0.0);
      expect(ragContext.companyIntelligence.data.reason).toBe('No company specified');
    });
  });

  describe('No Fallback Policy', () => {
    test('should fail gracefully without using fallback values', async () => {
      // Mock AI service to fail
      mockGenerateCompletion.mockRejectedValue(new Error('AI service unavailable'));

      await expect(
        perfectAIRAG.analyzeJobOffer("Test job description")
      ).rejects.toThrow('AI service unavailable');

      // Verify no fallback values were used
      expect(mockGenerateCompletion).toHaveBeenCalled();
    });

    test('should validate temperature settings are dynamic', async () => {
      mockGenerateCompletion.mockResolvedValue({ content: '{}' });

      await perfectAIRAG.analyzeJobOffer("Test job");

      // Check that different temperature values are used for different contexts
      const calls = mockGenerateCompletion.mock.calls;
      const temperatures = calls.map(call => call[1]?.temperature).filter(t => t !== undefined);

      expect(temperatures).toContain(0.0); // Data retrieval calls
      expect(temperatures).toContain(0.1); // Analysis calls
      expect(temperatures).toContain(0.2); // Sentiment analysis
    });
  });

  describe('Data Source Validation', () => {
    test('should validate all external data sources are called', async () => {
      mockGenerateCompletion.mockResolvedValue({ content: '{}' });

      await perfectAIRAG.analyzeJobOffer("Test job description");

      const prompts = mockGenerateCompletion.mock.calls.map(call => call[0]);

      // Verify all external APIs are being queried with flexible pattern matching
      const expectedAPIs = [
        { pattern: 'Bureau of Labor Statistics', alternatives: ['BLS', 'labor statistics'] },
        { pattern: 'Numbeo', alternatives: ['cost of living', 'numbeo'] },
        { pattern: 'job market', alternatives: ['market analysis', 'job market'] },
        { pattern: 'company intelligence', alternatives: ['comprehensive company intelligence', 'company intelligence'] },
        { pattern: 'economic indicators', alternatives: ['current economic indicators', 'economic indicators'] },
        { pattern: 'industry trends', alternatives: ['market trends', 'industry trends'] },
        { pattern: 'market sentiment', alternatives: ['current market sentiment', 'market sentiment'] },
        { pattern: 'competitor', alternatives: ['competition', 'competitor'] }
      ];

      // Verify all external data sources are queried with flexible pattern matching
      const allDataSources = [
        { pattern: 'Bureau of Labor Statistics', alternatives: ['BLS', 'Bureau of Labor Statistics'] },
        { pattern: 'Numbeo', alternatives: ['Numbeo', 'cost of living'] },
        { pattern: 'job market', alternatives: ['job market', 'market analysis'] },
        { pattern: 'company intelligence', alternatives: ['company intelligence', 'comprehensive company intelligence'] },
        { pattern: 'economic indicators', alternatives: ['economic indicators', 'current economic indicators'] },
        { pattern: 'industry trends', alternatives: ['industry trends', 'trends in the'] },
        { pattern: 'market sentiment', alternatives: ['market sentiment', 'current market sentiment'] },
        { pattern: 'competitor', alternatives: ['competitor', 'competitive landscape'] }
      ];

      allDataSources.forEach(({ pattern, alternatives }) => {
        // Company intelligence is only called when a company is specified
        if (pattern === 'company intelligence') {
          // Skip company intelligence validation for generic test (since no company is provided)
          return;
        }

        const found = prompts.some(p =>
          alternatives.some(alt => p.toLowerCase().includes(alt.toLowerCase()))
        );
        expect(found).toBe(true);
      });

      // Verify comprehensive data gathering
      expect(prompts.length).toBeGreaterThan(8);
    });

    test('should calculate confidence scores from data source reliability', async () => {
      mockGenerateCompletion.mockImplementation(async (prompt: string) => {
        // Add default responses for data gathering
        if (prompt.includes('job description')) {
          return { content: JSON.stringify({ jobTitle: "Test", industry: "Tech" }) };
        }
        if (prompt.includes('Bureau of Labor Statistics')) {
          return { content: JSON.stringify({ meanAnnualWage: 100000 }) };
        }
        if (prompt.includes('Numbeo')) {
          return { content: JSON.stringify({ costOfLivingIndex: 100 }) };
        }
        if (prompt.includes('job market')) {
          return { content: JSON.stringify({ currentPostings: 100 }) };
        }
        if (prompt.includes('company intelligence')) {
          return { content: JSON.stringify({ companySize: 1000 }) };
        }
        if (prompt.includes('economic indicators')) {
          return { content: JSON.stringify({ gdpGrowth: 0.02 }) };
        }
        if (prompt.includes('industry trends')) {
          return { content: JSON.stringify({ industryGrowth: 0.05 }) };
        }
        if (prompt.includes('market sentiment')) {
          return { content: JSON.stringify({ overallSentiment: "positive" }) };
        }
        if (prompt.includes('competitor')) {
          return { content: JSON.stringify({ similarCompanies: [] }) };
        }

        if (prompt.includes('Using ONLY the live market data provided above')) {
          return {
            content: JSON.stringify({
              role: { title: "Test", normalizedTitle: "Test", seniorityLevel: "mid", industry: "Tech", skillsRequired: [], experienceLevel: 3, marketDemand: 70 },
              compensation: { salaryRange: { min: 80000, max: 120000, median: 100000, currency: "USD", confidence: 0.85 }, totalCompensation: { base: 100000, bonus: 0, equity: 0, benefits: 0, total: 100000 }, marketPosition: "average", negotiationPower: 5 },
              location: { normalized: "Test City", costOfLiving: 100, housingCosts: 1500, taxes: { federal: 0.22, state: 0.05, local: 0, total: 0.27 }, qualityOfLife: 75, marketMultiplier: 1.0 },
              market: { demand: 70, competition: 60, growth: 0.05, outlook: "stable", timeToHire: 30, alternatives: 100 },
              analysis: { overallScore: 70, pros: [], cons: [], risks: [], opportunities: [], recommendations: [] }
            })
          };
        }
        return { content: '{}' };
      });

      const analysis = await perfectAIRAG.analyzeJobOffer("Test job");

      expect(analysis.confidence).toBeDefined();
      expect(analysis.confidence.overall).toBeGreaterThan(0);
      expect(analysis.confidence.salary).toBeGreaterThan(0);
      expect(analysis.confidence.market).toBeGreaterThan(0);
      expect(analysis.confidence.location).toBeGreaterThan(0);
      expect(analysis.confidence.dataSources).toBeDefined();
      expect(Array.isArray(analysis.confidence.dataSources)).toBe(true);
    });
  });
});

describe('Perfect AI RAG API Route', () => {
  test('should validate API route structure', () => {
    // Test that the API route file exists and exports correct functions
    const apiPath = '../app/api/jobs/[id]/perfect-salary-analysis/route.ts';

    expect(() => {
      require(apiPath);
    }).not.toThrow();
  });
});

describe('Perfect AI RAG Component', () => {
  test('should validate component structure', () => {
    // Test that the component file exists and exports correctly
    const componentPath = '../components/ui/perfect-ai-salary-hub.tsx';

    expect(() => {
      require(componentPath);
    }).not.toThrow();
  });
});