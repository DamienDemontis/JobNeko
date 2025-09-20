import { AIServiceManager } from './ai-service-manager';

export interface AnalyticsInsight {
  id: string;
  type: 'trend' | 'recommendation' | 'alert' | 'achievement';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  data: any;
  createdAt: Date;
  category: 'applications' | 'interviews' | 'salary' | 'networking' | 'performance';
}

export interface MetricTrend {
  metric: string;
  current: number;
  previous: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  timeframe: string;
}

export interface PerformanceMetrics {
  applicationSuccessRate: number;
  interviewConversionRate: number;
  responseTime: number;
  networkGrowthRate: number;
  salaryNegotiationSuccess: number;
  overallScore: number;
}

export interface UserBehaviorPattern {
  optimalApplicationTime: string;
  bestApplicationDays: string[];
  responsePatterns: {
    industry: string;
    averageResponseTime: number;
    successRate: number;
  }[];
  interviewSuccessFactors: string[];
}

export class AnalyticsEngine {
  private aiService: AIServiceManager;

  constructor() {
    this.aiService = AIServiceManager.getInstance();
  }

  async generateInsights(userId: string, timeframe: 'week' | 'month' | 'quarter' | 'year'): Promise<AnalyticsInsight[]> {
    try {
      // Fetch user data from database
      const userData = await this.fetchUserData(userId, timeframe);

      // Generate AI-powered insights
      const insights = await this.aiService.generateCompletion(
        this.buildInsightsPrompt(userData),
        'job_analysis',
        userId,
        {
          max_tokens: 2000,
          temperature: 0.7,
          model: 'gpt-4o-mini'
        }
      );

      return this.parseInsights(insights.content);
    } catch (error) {
      console.error('Error generating insights:', error);
      return this.getFallbackInsights();
    }
  }

  async analyzePerformanceMetrics(userId: string, timeframe: string): Promise<PerformanceMetrics> {
    try {
      const userData = await this.fetchUserData(userId, timeframe as any);

      // Calculate metrics
      const metrics: PerformanceMetrics = {
        applicationSuccessRate: this.calculateApplicationSuccess(userData),
        interviewConversionRate: this.calculateInterviewConversion(userData),
        responseTime: this.calculateAverageResponseTime(userData),
        networkGrowthRate: this.calculateNetworkGrowth(userData),
        salaryNegotiationSuccess: this.calculateSalaryNegotiation(userData),
        overallScore: 0
      };

      // Calculate overall score
      metrics.overallScore = this.calculateOverallScore(metrics);

      return metrics;
    } catch (error) {
      console.error('Error analyzing performance metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  async identifyTrends(userId: string, metrics: string[]): Promise<MetricTrend[]> {
    try {
      const currentData = await this.fetchUserData(userId, 'month');
      const previousData = await this.fetchUserData(userId, 'month', 1); // Previous month

      const trends: MetricTrend[] = [];

      for (const metric of metrics) {
        const current = this.extractMetricValue(currentData, metric);
        const previous = this.extractMetricValue(previousData, metric);
        const change = ((current - previous) / previous) * 100;

        trends.push({
          metric,
          current,
          previous,
          change,
          trend: this.getTrendDirection(change),
          timeframe: 'month'
        });
      }

      return trends;
    } catch (error) {
      console.error('Error identifying trends:', error);
      return [];
    }
  }

  async analyzeBehaviorPatterns(userId: string): Promise<UserBehaviorPattern> {
    try {
      const userData = await this.fetchUserData(userId, 'quarter');

      return {
        optimalApplicationTime: this.findOptimalApplicationTime(userData),
        bestApplicationDays: this.findBestApplicationDays(userData),
        responsePatterns: this.analyzeResponsePatterns(userData),
        interviewSuccessFactors: this.identifySuccessFactors(userData)
      };
    } catch (error) {
      console.error('Error analyzing behavior patterns:', error);
      return this.getDefaultBehaviorPattern();
    }
  }

  async generatePredictions(userId: string, scenario: string): Promise<any> {
    try {
      const userData = await this.fetchUserData(userId, 'year');

      const predictions = await this.aiService.generateCompletion(
        this.buildPredictionPrompt(userData, scenario),
        'job_analysis',
        userId,
        {
          max_tokens: 1500,
          temperature: 0.6,
          model: 'gpt-4o-mini'
        }
      );

      return this.parsePredictions(predictions.content);
    } catch (error) {
      console.error('Error generating predictions:', error);
      return null;
    }
  }

  private async fetchUserData(userId: string, timeframe: 'week' | 'month' | 'quarter' | 'year', offset: number = 0): Promise<any> {
    // In production, this would fetch from your database
    // For now, return mock data
    return {
      applications: [
        { id: '1', createdAt: new Date(), status: 'applied', responseTime: 7 },
        { id: '2', createdAt: new Date(), status: 'interview', responseTime: 5 },
        { id: '3', createdAt: new Date(), status: 'offer', responseTime: 14 }
      ],
      interviews: [
        { id: '1', type: 'phone', result: 'success', rating: 4 },
        { id: '2', type: 'technical', result: 'success', rating: 5 }
      ],
      networkActivity: [
        { id: '1', type: 'connection', platform: 'linkedin', success: true },
        { id: '2', type: 'message', platform: 'email', success: true }
      ],
      salaryNegotiations: [
        { id: '1', initial: 120000, final: 135000, success: true }
      ]
    };
  }

  private buildInsightsPrompt(userData: any): string {
    return `
      Analyze the following user job search data and generate actionable insights:

      Applications: ${JSON.stringify(userData.applications)}
      Interviews: ${JSON.stringify(userData.interviews)}
      Network Activity: ${JSON.stringify(userData.networkActivity)}
      Salary Negotiations: ${JSON.stringify(userData.salaryNegotiations)}

      Generate 5-7 insights covering:
      1. Performance trends and patterns
      2. Areas for improvement
      3. Success factors identification
      4. Market timing recommendations
      5. Strategic suggestions

      Format as JSON array with: type, title, description, impact, actionable, category
    `;
  }

  private buildPredictionPrompt(userData: any, scenario: string): string {
    return `
      Based on the user's job search history and current market conditions, predict outcomes for:

      Scenario: ${scenario}
      User Data: ${JSON.stringify(userData)}

      Provide predictions for:
      1. Success probability
      2. Timeline estimation
      3. Potential challenges
      4. Recommended actions
      5. Success factors

      Format as structured JSON with confidence scores.
    `;
  }

  private parseInsights(content: string): AnalyticsInsight[] {
    try {
      const parsed = JSON.parse(content);
      return parsed.map((insight: any, index: number) => ({
        id: `insight_${index}`,
        type: insight.type || 'recommendation',
        title: insight.title,
        description: insight.description,
        impact: insight.impact || 'medium',
        actionable: insight.actionable || false,
        data: insight.data || {},
        createdAt: new Date(),
        category: insight.category || 'performance'
      }));
    } catch (error) {
      return this.getFallbackInsights();
    }
  }

  private parsePredictions(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      return {
        successProbability: 75,
        timeline: '2-3 months',
        challenges: ['Market competition', 'Skill gaps'],
        recommendations: ['Focus on networking', 'Improve technical skills']
      };
    }
  }

  private calculateApplicationSuccess(userData: any): number {
    const totalApps = userData.applications.length;
    const successfulApps = userData.applications.filter((app: any) =>
      ['interview', 'offer', 'accepted'].includes(app.status)
    ).length;

    return totalApps > 0 ? (successfulApps / totalApps) * 100 : 0;
  }

  private calculateInterviewConversion(userData: any): number {
    const totalInterviews = userData.interviews.length;
    const successfulInterviews = userData.interviews.filter((interview: any) =>
      interview.result === 'success'
    ).length;

    return totalInterviews > 0 ? (successfulInterviews / totalInterviews) * 100 : 0;
  }

  private calculateAverageResponseTime(userData: any): number {
    const responseTimes = userData.applications
      .filter((app: any) => app.responseTime)
      .map((app: any) => app.responseTime);

    return responseTimes.length > 0
      ? responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length
      : 0;
  }

  private calculateNetworkGrowth(userData: any): number {
    const totalActivities = userData.networkActivity.length;
    const successfulActivities = userData.networkActivity.filter((activity: any) =>
      activity.success
    ).length;

    return totalActivities > 0 ? (successfulActivities / totalActivities) * 100 : 0;
  }

  private calculateSalaryNegotiation(userData: any): number {
    const totalNegotiations = userData.salaryNegotiations.length;
    const successfulNegotiations = userData.salaryNegotiations.filter((neg: any) =>
      neg.success
    ).length;

    return totalNegotiations > 0 ? (successfulNegotiations / totalNegotiations) * 100 : 0;
  }

  private calculateOverallScore(metrics: PerformanceMetrics): number {
    const weights = {
      applicationSuccessRate: 0.25,
      interviewConversionRate: 0.25,
      responseTime: 0.15, // Lower is better, so invert
      networkGrowthRate: 0.15,
      salaryNegotiationSuccess: 0.2
    };

    const normalizedResponseTime = Math.max(0, 100 - (metrics.responseTime * 5)); // Convert to 0-100 scale

    return Math.round(
      (metrics.applicationSuccessRate * weights.applicationSuccessRate) +
      (metrics.interviewConversionRate * weights.interviewConversionRate) +
      (normalizedResponseTime * weights.responseTime) +
      (metrics.networkGrowthRate * weights.networkGrowthRate) +
      (metrics.salaryNegotiationSuccess * weights.salaryNegotiationSuccess)
    );
  }

  private extractMetricValue(data: any, metric: string): number {
    // Extract specific metric values from data
    switch (metric) {
      case 'applications':
        return data.applications.length;
      case 'interviews':
        return data.interviews.length;
      case 'networkConnections':
        return data.networkActivity.length;
      default:
        return 0;
    }
  }

  private getTrendDirection(change: number): 'up' | 'down' | 'stable' {
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  private findOptimalApplicationTime(userData: any): string {
    // Analyze application success by time of day
    return '10:00 AM'; // Mock result
  }

  private findBestApplicationDays(userData: any): string[] {
    // Analyze application success by day of week
    return ['Tuesday', 'Wednesday', 'Thursday']; // Mock result
  }

  private analyzeResponsePatterns(userData: any): any[] {
    // Analyze response patterns by industry/company type
    return [
      { industry: 'Tech', averageResponseTime: 5, successRate: 35 },
      { industry: 'Finance', averageResponseTime: 8, successRate: 28 }
    ];
  }

  private identifySuccessFactors(userData: any): string[] {
    // Identify factors that correlate with interview success
    return [
      'Strong technical portfolio',
      'Personalized cover letters',
      'Network referrals'
    ];
  }

  private getFallbackInsights(): AnalyticsInsight[] {
    return [
      {
        id: 'fallback_1',
        type: 'recommendation',
        title: 'Improve Application Response Rate',
        description: 'Your current response rate is below average. Consider personalizing your applications.',
        impact: 'high',
        actionable: true,
        data: {},
        createdAt: new Date(),
        category: 'applications'
      }
    ];
  }

  private getDefaultMetrics(): PerformanceMetrics {
    return {
      applicationSuccessRate: 0,
      interviewConversionRate: 0,
      responseTime: 0,
      networkGrowthRate: 0,
      salaryNegotiationSuccess: 0,
      overallScore: 0
    };
  }

  private getDefaultBehaviorPattern(): UserBehaviorPattern {
    return {
      optimalApplicationTime: '10:00 AM',
      bestApplicationDays: ['Tuesday', 'Wednesday', 'Thursday'],
      responsePatterns: [],
      interviewSuccessFactors: []
    };
  }
}