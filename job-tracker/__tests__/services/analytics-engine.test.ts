import { AnalyticsEngine } from '@/lib/services/analytics-engine';
import { AIServiceManager } from '@/lib/services/ai-service-manager';

// Mock AI Service Manager
jest.mock('@/lib/services/ai-service-manager');
const MockAIServiceManager = AIServiceManager as jest.MockedClass<typeof AIServiceManager>;

describe('AnalyticsEngine', () => {
  let analyticsEngine: AnalyticsEngine;
  let mockAIService: jest.Mocked<AIServiceManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAIService = {
      generateCompletion: jest.fn(),
    } as any;

    // Mock the getInstance static method
    MockAIServiceManager.getInstance = jest.fn().mockReturnValue(mockAIService);

    analyticsEngine = new AnalyticsEngine();
  });

  describe('Insights Generation', () => {
    test('should generate insights from user data', async () => {
      const mockInsights = {
        content: JSON.stringify([
          {
            type: 'recommendation',
            title: 'Improve Application Response Rate',
            description: 'Your response rate is below average',
            impact: 'high',
            actionable: true,
            category: 'applications'
          }
        ])
      };

      mockAIService.generateCompletion.mockResolvedValue(mockInsights);

      const insights = await analyticsEngine.generateInsights('test-user', 'month');

      expect(insights).toHaveLength(1);
      expect(insights[0]).toMatchObject({
        type: 'recommendation',
        title: 'Improve Application Response Rate',
        impact: 'high',
        actionable: true,
        category: 'applications'
      });

      expect(mockAIService.generateCompletion).toHaveBeenCalledWith(
        expect.stringContaining('Analyze the following user job search data'),
        'job_analysis',
        'test-user',
        {
          max_tokens: 2000,
          temperature: 0.7,
          model: 'gpt-4o-mini'
        }
      );
    });

    test('should return fallback insights when AI service fails', async () => {
      mockAIService.generateCompletion.mockRejectedValue(new Error('AI service error'));

      const insights = await analyticsEngine.generateInsights('test-user', 'month');

      expect(insights).toHaveLength(1);
      expect(insights[0]).toMatchObject({
        id: 'fallback_1',
        type: 'recommendation',
        title: 'Improve Application Response Rate'
      });
    });

    test('should handle invalid JSON from AI service', async () => {
      const mockInsights = {
        content: 'invalid json content'
      };

      mockAIService.generateCompletion.mockResolvedValue(mockInsights);

      const insights = await analyticsEngine.generateInsights('test-user', 'month');

      // Should return fallback insights
      expect(insights).toHaveLength(1);
      expect(insights[0].id).toBe('fallback_1');
    });
  });

  describe('Performance Metrics Analysis', () => {
    test('should analyze performance metrics correctly', async () => {
      const metrics = await analyticsEngine.analyzePerformanceMetrics('test-user', 'month');

      expect(metrics).toMatchObject({
        applicationSuccessRate: expect.any(Number),
        interviewConversionRate: expect.any(Number),
        responseTime: expect.any(Number),
        networkGrowthRate: expect.any(Number),
        salaryNegotiationSuccess: expect.any(Number),
        overallScore: expect.any(Number)
      });

      expect(metrics.overallScore).toBeGreaterThanOrEqual(0);
      expect(metrics.overallScore).toBeLessThanOrEqual(100);
    });

    test('should handle errors gracefully and return default metrics', async () => {
      // Force an error by mocking fetchUserData to throw
      jest.spyOn(analyticsEngine as any, 'fetchUserData').mockRejectedValue(new Error('Database error'));

      const metrics = await analyticsEngine.analyzePerformanceMetrics('test-user', 'month');

      expect(metrics).toMatchObject({
        applicationSuccessRate: 0,
        interviewConversionRate: 0,
        responseTime: 0,
        networkGrowthRate: 0,
        salaryNegotiationSuccess: 0,
        overallScore: 0
      });
    });
  });

  describe('Trend Identification', () => {
    test('should identify trends for specified metrics', async () => {
      const metrics = ['applications', 'interviews', 'networkConnections'];
      const trends = await analyticsEngine.identifyTrends('test-user', metrics);

      expect(trends).toHaveLength(3);

      trends.forEach(trend => {
        expect(trend).toMatchObject({
          metric: expect.any(String),
          current: expect.any(Number),
          previous: expect.any(Number),
          change: expect.any(Number),
          trend: expect.stringMatching(/^(up|down|stable)$/),
          timeframe: 'month'
        });
      });
    });

    test('should return empty array when trend identification fails', async () => {
      jest.spyOn(analyticsEngine as any, 'fetchUserData').mockRejectedValue(new Error('Error'));

      const trends = await analyticsEngine.identifyTrends('test-user', ['applications']);

      expect(trends).toEqual([]);
    });

    test('should correctly determine trend direction', () => {
      const getTrendDirection = (analyticsEngine as any).getTrendDirection;

      expect(getTrendDirection(10)).toBe('up');
      expect(getTrendDirection(-10)).toBe('down');
      expect(getTrendDirection(2)).toBe('stable'); // Within 5% threshold
      expect(getTrendDirection(-3)).toBe('stable');
    });
  });

  describe('Behavior Pattern Analysis', () => {
    test('should analyze user behavior patterns', async () => {
      const patterns = await analyticsEngine.analyzeBehaviorPatterns('test-user');

      expect(patterns).toMatchObject({
        optimalApplicationTime: expect.any(String),
        bestApplicationDays: expect.any(Array),
        responsePatterns: expect.any(Array),
        interviewSuccessFactors: expect.any(Array)
      });

      expect(patterns.bestApplicationDays).toEqual(['Tuesday', 'Wednesday', 'Thursday']);
      expect(patterns.optimalApplicationTime).toBe('10:00 AM');
    });

    test('should return default patterns when analysis fails', async () => {
      jest.spyOn(analyticsEngine as any, 'fetchUserData').mockRejectedValue(new Error('Error'));

      const patterns = await analyticsEngine.analyzeBehaviorPatterns('test-user');

      expect(patterns).toMatchObject({
        optimalApplicationTime: '10:00 AM',
        bestApplicationDays: ['Tuesday', 'Wednesday', 'Thursday'],
        responsePatterns: [],
        interviewSuccessFactors: []
      });
    });
  });

  describe('Predictions Generation', () => {
    test('should generate predictions for given scenario', async () => {
      const mockPredictions = {
        content: JSON.stringify({
          successProbability: 85,
          timeline: '2-3 months',
          challenges: ['Market competition', 'Skill requirements'],
          recommendations: ['Networking', 'Skill development']
        })
      };

      mockAIService.generateCompletion.mockResolvedValue(mockPredictions);

      const predictions = await analyticsEngine.generatePredictions('test-user', 'senior role transition');

      expect(predictions).toMatchObject({
        successProbability: 85,
        timeline: '2-3 months',
        challenges: expect.any(Array),
        recommendations: expect.any(Array)
      });

      expect(mockAIService.generateCompletion).toHaveBeenCalledWith(
        expect.stringContaining('Based on the user\'s job search history'),
        'job_analysis',
        'test-user',
        {
          max_tokens: 1500,
          temperature: 0.6,
          model: 'gpt-4o-mini'
        }
      );
    });

    test('should return null when prediction generation fails', async () => {
      mockAIService.generateCompletion.mockRejectedValue(new Error('AI service error'));

      const predictions = await analyticsEngine.generatePredictions('test-user', 'career change');

      expect(predictions).toBeNull();
    });

    test('should handle invalid JSON in predictions', async () => {
      const mockPredictions = {
        content: 'invalid json'
      };

      mockAIService.generateCompletion.mockResolvedValue(mockPredictions);

      const predictions = await analyticsEngine.generatePredictions('test-user', 'promotion');

      expect(predictions).toMatchObject({
        successProbability: 75,
        timeline: '2-3 months',
        challenges: expect.any(Array),
        recommendations: expect.any(Array)
      });
    });
  });

  describe('Metric Calculations', () => {
    const mockUserData = {
      applications: [
        { id: '1', status: 'applied', responseTime: 7 },
        { id: '2', status: 'interview', responseTime: 5 },
        { id: '3', status: 'offer', responseTime: 14 },
        { id: '4', status: 'rejected', responseTime: 10 }
      ],
      interviews: [
        { id: '1', result: 'success', rating: 4 },
        { id: '2', result: 'success', rating: 5 },
        { id: '3', result: 'failure', rating: 2 }
      ],
      networkActivity: [
        { id: '1', success: true },
        { id: '2', success: true },
        { id: '3', success: false }
      ],
      salaryNegotiations: [
        { id: '1', success: true },
        { id: '2', success: false }
      ]
    };

    test('should calculate application success rate correctly', () => {
      const calculateApplicationSuccess = (analyticsEngine as any).calculateApplicationSuccess;
      const successRate = calculateApplicationSuccess(mockUserData);

      // 2 successful ('interview', 'offer') out of 4 total = 50%
      expect(successRate).toBe(50);
    });

    test('should calculate interview conversion rate correctly', () => {
      const calculateInterviewConversion = (analyticsEngine as any).calculateInterviewConversion;
      const conversionRate = calculateInterviewConversion(mockUserData);

      // 2 successful out of 3 total = 66.67% (rounded)
      expect(conversionRate).toBeCloseTo(66.67, 1);
    });

    test('should calculate average response time correctly', () => {
      const calculateAverageResponseTime = (analyticsEngine as any).calculateAverageResponseTime;
      const avgResponseTime = calculateAverageResponseTime(mockUserData);

      // (7 + 5 + 14 + 10) / 4 = 9
      expect(avgResponseTime).toBe(9);
    });

    test('should calculate network growth rate correctly', () => {
      const calculateNetworkGrowth = (analyticsEngine as any).calculateNetworkGrowth;
      const growthRate = calculateNetworkGrowth(mockUserData);

      // 2 successful out of 3 total = 66.67% (rounded)
      expect(growthRate).toBeCloseTo(66.67, 1);
    });

    test('should calculate salary negotiation success rate correctly', () => {
      const calculateSalaryNegotiation = (analyticsEngine as any).calculateSalaryNegotiation;
      const successRate = calculateSalaryNegotiation(mockUserData);

      // 1 successful out of 2 total = 50%
      expect(successRate).toBe(50);
    });

    test('should calculate overall score correctly', () => {
      const calculateOverallScore = (analyticsEngine as any).calculateOverallScore;

      const metrics = {
        applicationSuccessRate: 75,
        interviewConversionRate: 67,
        responseTime: 9, // This gets normalized
        networkGrowthRate: 67,
        salaryNegotiationSuccess: 50
      };

      const overallScore = calculateOverallScore(metrics);

      expect(overallScore).toBeGreaterThan(0);
      expect(overallScore).toBeLessThanOrEqual(100);
      expect(Number.isInteger(overallScore)).toBe(true);
    });
  });

  describe('Data Extraction', () => {
    test('should extract metric values correctly', () => {
      const extractMetricValue = (analyticsEngine as any).extractMetricValue;

      const mockData = {
        applications: [{ id: '1' }, { id: '2' }],
        interviews: [{ id: '1' }],
        networkActivity: [{ id: '1' }, { id: '2' }, { id: '3' }]
      };

      expect(extractMetricValue(mockData, 'applications')).toBe(2);
      expect(extractMetricValue(mockData, 'interviews')).toBe(1);
      expect(extractMetricValue(mockData, 'networkConnections')).toBe(3);
      expect(extractMetricValue(mockData, 'unknown')).toBe(0);
    });
  });
});