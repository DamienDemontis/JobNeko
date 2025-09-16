import { enhancedSalaryRAG } from '@/lib/services/enhanced-salary-rag';
import { aiWebSearch } from '@/lib/services/ai-web-search';
import { profileContextService } from '@/lib/services/profile-context-service';

// Mock the dependencies
jest.mock('@/lib/services/ai-web-search');
jest.mock('@/lib/services/profile-context-service');
jest.mock('../lib/ai-service', () => ({
  generateCompletion: jest.fn()
}));

const mockAiWebSearch = aiWebSearch as jest.Mocked<typeof aiWebSearch>;
const mockProfileContextService = profileContextService as jest.Mocked<typeof profileContextService>;

describe('Enhanced Salary RAG - No Fallbacks', () => {
  const sampleRequest = {
    jobTitle: 'Senior Software Engineer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    description: 'Looking for experienced developer...',
    requirements: 'React, Node.js, TypeScript',
    userId: 'test-user-123',
    postedSalary: '$150,000 - $200,000'
  };

  const mockUserContext = {
    userId: 'test-user-123',
    name: 'John Doe',
    email: 'john@example.com',
    currentLocation: {
      city: 'San Francisco',
      state: 'CA',
      country: 'United States',
      fullLocation: 'San Francisco, CA, United States'
    },
    salaryContext: {
      currentSalary: 140000,
      expectedSalary: 180000,
      currency: 'USD',
      hasCurrentSalary: true,
      hasExpectedSalary: true
    },
    professionalProfile: {
      careerLevel: 'senior',
      yearsOfExperience: 7,
      industryFocus: ['technology', 'software'],
      keySkills: ['JavaScript', 'React', 'Node.js'],
      hasResume: true,
      resumeContent: 'Senior Software Engineer with 7 years...'
    },
    preferences: {
      workMode: 'hybrid',
      willingToRelocate: false
    },
    contextCompleteness: {
      score: 85,
      missingFields: [],
      hasMinimumContext: true,
      hasRichContext: true
    }
  };

  const mockWebSearchResults = {
    query: 'senior software engineer san francisco salary 2025',
    results: [
      {
        title: 'Software Engineer Salaries in San Francisco - Glassdoor',
        url: 'https://www.glassdoor.com/Salaries/san-francisco-software-engineer-salary',
        content: 'The average Software Engineer salary in San Francisco is $165,000. Senior positions range from $150,000 to $220,000.',
        score: 0.9
      },
      {
        title: 'Senior Software Engineer Salary Bay Area - Levels.fyi',
        url: 'https://www.levels.fyi/salaries/software-engineer/san-francisco',
        content: 'Senior Software Engineers in SF earn $170,000 median, with top tier reaching $250,000.',
        score: 0.85
      }
    ],
    answer: 'Based on multiple sources, senior software engineers in San Francisco earn between $150,000-$220,000.'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock profile context service
    mockProfileContextService.getUserProfileContext.mockResolvedValue(mockUserContext);
    mockProfileContextService.generateAIContextPrompt.mockReturnValue({
      userContext: 'USER PROFILE: John Doe, Senior level, 7 years experience',
      professionalBackground: 'PROFESSIONAL: Skills - JavaScript, React...',
      locationContext: 'LOCATION: San Francisco, CA, United States',
      financialContext: 'FINANCIAL: Current $140,000, Expected $180,000 USD',
      preferencesContext: 'PREFERENCES: Hybrid work, No relocation',
      fullContextSummary: 'Complete user context summary...'
    });
  });

  describe('Real Web Search Data', () => {
    it('should successfully analyze with real web search results', async () => {
      // Mock successful web search with real results
      mockAiWebSearch.searchWeb.mockResolvedValue(mockWebSearchResults);

      // Mock AI completion with valid salary analysis
      const { generateCompletion } = require('../lib/ai-service');
      generateCompletion.mockResolvedValue({
        content: JSON.stringify({
          salaryIntelligence: {
            range: {
              min: 150000,
              max: 220000,
              median: 170000,
              currency: 'USD',
              confidence: 0.85
            },
            marketPosition: 'at_market',
            negotiationPower: 75,
            dataQuality: 'excellent'
          },
          personalizedInsights: {
            fitForProfile: 'excellent',
            careerProgression: 'Strong match for senior level position',
            skillsMatch: 90,
            experienceAlignment: 'Perfect alignment with 7 years experience',
            locationAnalysis: 'San Francisco market offers premium rates',
            salaryProgression: {
              currentVsOffer: 'Significant improvement over current $140k',
              expectedVsOffer: 'Meets expected range of $180k',
              growthPotential: 'Strong growth potential in SF market'
            }
          },
          contextualRecommendations: {
            negotiationStrategy: ['Leverage market data', 'Highlight relevant skills'],
            careerAdvice: ['Consider stock options', 'Negotiate remote flexibility'],
            actionItems: ['Research company culture', 'Prepare for technical interview'],
            redFlags: [],
            opportunities: ['Growing tech market', 'High demand for skills']
          },
          marketIntelligence: {
            demandLevel: 85,
            competitionLevel: 70,
            industryOutlook: 'Strong growth in tech sector',
            timeToHire: '3-6 weeks typical',
            alternativeOpportunities: 150
          },
          profileContext: {
            contextCompleteness: 85,
            keyFactors: ['Strong experience', 'Relevant skills', 'Market location'],
            improvementSuggestions: ['Add certifications', 'Update portfolio']
          }
        })
      });

      const result = await enhancedSalaryRAG.analyzeWithContext(sampleRequest);

      // Verify the analysis contains real data
      expect(result.salaryIntelligence.range.min).toBe(150000);
      expect(result.salaryIntelligence.range.max).toBe(220000);
      expect(result.salaryIntelligence.range.median).toBe(170000);
      expect(result.salaryIntelligence.range.confidence).toBe(0.85);

      // Verify sources are real web sources (should be 6: 2 sources × 3 search types)
      expect(result.sources.webSources).toHaveLength(6);
      expect(result.sources.webSources[0].url).toBe('https://www.glassdoor.com/Salaries/san-francisco-software-engineer-salary');
      expect(result.sources.webSources[1].url).toBe('https://www.levels.fyi/salaries/software-engineer/san-francisco');

      // Verify we have different types of sources
      const sourceTypes = result.sources.webSources.map(s => s.type);
      expect(sourceTypes).toContain('salary_data');
      expect(sourceTypes).toContain('company_info');
      expect(sourceTypes).toContain('market_trends');

      // Verify metadata
      expect(result.metadata.version).toBe('5.0.0-no-fallbacks');
    });

    it('should fail when no real web search results are available', async () => {
      // Mock empty web search results (like when API fails)
      mockAiWebSearch.searchWeb.mockResolvedValue({
        query: 'test query',
        results: [],
        answer: 'Based on AI knowledge (not live search): Some estimate...'
      });

      await expect(enhancedSalaryRAG.analyzeWithContext(sampleRequest))
        .rejects
        .toThrow('No web search data available. Cannot generate analysis without real market data.');
    });

    it('should fail when web search returns AI fallback content', async () => {
      // Mock web search that returns AI fallback instead of real results
      mockAiWebSearch.searchWeb.mockResolvedValue({
        query: 'test query',
        results: [
          {
            title: 'AI Generated Response',
            url: '',
            content: 'Based on AI knowledge (not live search): Estimated salary range...',
            score: 0.5
          }
        ]
      });

      await expect(enhancedSalaryRAG.analyzeWithContext(sampleRequest))
        .rejects
        .toThrow('No web search data available. Cannot generate analysis without real market data.');
    });

    it('should fail when AI returns invalid salary data', async () => {
      // Mock web search with valid results
      mockAiWebSearch.searchWeb.mockResolvedValue(mockWebSearchResults);

      // Mock AI completion with invalid/NaN values
      const { generateCompletion } = require('../lib/ai-service');
      generateCompletion.mockResolvedValue({
        content: JSON.stringify({
          salaryIntelligence: {
            range: {
              min: NaN,
              max: 0,
              median: null,
              currency: 'USD',
              confidence: NaN
            },
            marketPosition: 'at_market',
            negotiationPower: 75,
            dataQuality: 'limited'
          }
        })
      });

      await expect(enhancedSalaryRAG.analyzeWithContext(sampleRequest))
        .rejects
        .toThrow('Invalid salary data returned. Analysis must contain real market-based numbers.');
    });
  });

  describe('Data Source Validation', () => {
    it('should only include sources with valid URLs', async () => {
      // Mock web search with mixed valid/invalid sources
      const validResult = {
        query: 'test query',
        results: [
          {
            title: 'Valid Source',
            url: 'https://glassdoor.com/salary-data',
            content: 'Real salary data content',
            score: 0.8
          }
        ]
      };

      const invalidResult = {
        query: 'test query',
        results: [
          {
            title: 'Invalid Source',
            url: '',
            content: 'Some content without URL',
            score: 0.6
          },
          {
            title: 'AI Fallback',
            url: 'javascript:void(0)',
            content: 'Based on AI knowledge...',
            score: 0.4
          }
        ]
      };

      // Mock different results for different searches
      mockAiWebSearch.searchWeb
        .mockResolvedValueOnce(validResult)    // salary search
        .mockResolvedValueOnce(invalidResult)  // company search
        .mockResolvedValueOnce(invalidResult); // market search

      // Mock valid AI response
      const { generateCompletion } = require('../lib/ai-service');
      generateCompletion.mockResolvedValue({
        content: JSON.stringify({
          salaryIntelligence: {
            range: { min: 100000, max: 150000, median: 125000, currency: 'USD', confidence: 0.7 },
            marketPosition: 'at_market',
            negotiationPower: 70,
            dataQuality: 'good'
          },
          personalizedInsights: { fitForProfile: 'good', careerProgression: 'Good fit', skillsMatch: 80, experienceAlignment: 'Good', locationAnalysis: 'Good market', salaryProgression: { growthPotential: 'Good' } },
          contextualRecommendations: { negotiationStrategy: ['test'], careerAdvice: ['test'], actionItems: ['test'], redFlags: [], opportunities: ['test'] },
          marketIntelligence: { demandLevel: 70, competitionLevel: 60, industryOutlook: 'Stable', timeToHire: '4 weeks', alternativeOpportunities: 50 },
          profileContext: { contextCompleteness: 85, keyFactors: ['test'], improvementSuggestions: ['test'] }
        })
      });

      const result = await enhancedSalaryRAG.analyzeWithContext(sampleRequest);

      // Should only include the valid source
      expect(result.sources.webSources).toHaveLength(1);
      expect(result.sources.webSources[0].url).toBe('https://glassdoor.com/salary-data');
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error messages when web search fails', async () => {
      // Mock web search failure
      mockAiWebSearch.searchWeb.mockRejectedValue(new Error('Tavily API error: 403 - Forbidden'));

      await expect(enhancedSalaryRAG.analyzeWithContext(sampleRequest))
        .rejects
        .toThrow('Tavily API error: 403 - Forbidden');
    });

    it('should handle profile context service failures', async () => {
      // Mock profile context service failure
      mockProfileContextService.getUserProfileContext.mockRejectedValue(new Error('User not found'));

      await expect(enhancedSalaryRAG.analyzeWithContext(sampleRequest))
        .rejects
        .toThrow('User not found');
    });
  });
});