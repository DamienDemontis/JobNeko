/**
 * Centralized AI Executor Service
 * Manages all AI operations with proper tier checking, caching, and error handling
 */

import { UnifiedAIService } from './unified-ai-service';
import { centralizedMatchService } from './centralized-match-service';
import { SkillsGapAnalysisService } from './skills-gap-analysis';
import { hasFeature, getTierLimits } from './subscription-tiers';
import { prisma } from '@/lib/prisma';

export type AIOperationType =
  | 'match_score'
  | 'salary_analysis'
  | 'company_research'
  | 'skills_gap'
  | 'interview_prep'
  | 'negotiation'
  | 'career_advice';

export interface AIExecutorOptions {
  userId: string;
  jobId: string;
  operation: AIOperationType;
  data: any;
  forceRefresh?: boolean;
  subscriptionTier?: string;
}

export interface AIExecutorResult {
  success: boolean;
  data?: any;
  error?: string;
  cached?: boolean;
  executionTime?: number;
}

class AIExecutor {
  private unifiedAI: any;
  private matchService: typeof centralizedMatchService;
  private skillsGapService: SkillsGapAnalysisService;

  constructor() {
    // UnifiedAIService is a singleton, access it directly
    this.unifiedAI = UnifiedAIService.getInstance();
    this.matchService = centralizedMatchService;
    this.skillsGapService = new SkillsGapAnalysisService();
  }

  /**
   * Execute an AI operation with proper checks and caching
   */
  async execute(options: AIExecutorOptions): Promise<AIExecutorResult> {
    const startTime = Date.now();

    try {
      // 1. Check subscription tier permissions
      const tierCheck = await this.checkTierPermissions(options);
      if (!tierCheck.allowed) {
        return {
          success: false,
          error: tierCheck.error,
        };
      }

      // 2. Check for cached results (unless force refresh)
      if (!options.forceRefresh) {
        const cached = await this.getCachedResult(options);
        if (cached) {
          return {
            success: true,
            data: cached,
            cached: true,
            executionTime: Date.now() - startTime,
          };
        }
      }

      // 3. Execute the operation
      const result = await this.executeOperation(options);

      // 4. Cache the result
      if (result.success && result.data) {
        await this.cacheResult(options, result.data);
      }

      // 5. Track usage
      await this.trackUsage(options);

      return {
        ...result,
        executionTime: Date.now() - startTime,
      };

    } catch (error) {
      console.error(`AI Executor error for ${options.operation}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI operation failed',
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute multiple operations in parallel
   */
  async executeMultiple(operations: AIExecutorOptions[]): Promise<Map<AIOperationType, AIExecutorResult>> {
    const results = new Map<AIOperationType, AIExecutorResult>();

    const promises = operations.map(async (op) => {
      const result = await this.execute(op);
      return { operation: op.operation, result };
    });

    const completed = await Promise.allSettled(promises);

    for (const item of completed) {
      if (item.status === 'fulfilled') {
        results.set(item.value.operation, item.value.result);
      } else {
        console.error('Operation failed:', item.reason);
      }
    }

    return results;
  }

  /**
   * Check if user can perform the operation based on tier
   */
  private async checkTierPermissions(options: AIExecutorOptions): Promise<{ allowed: boolean; error?: string }> {
    let tier = options.subscriptionTier;

    if (!tier) {
      // Fetch user tier from database
      const user = await prisma.user.findUnique({
        where: { id: options.userId },
        select: { subscriptionTier: true },
      });
      tier = user?.subscriptionTier || 'free';
    }

    // Map operations to features
    const featureMap: Record<AIOperationType, string> = {
      match_score: 'job_analysis',
      salary_analysis: 'salary_analysis',
      company_research: 'company_intelligence',
      skills_gap: 'skills_gap_analysis',
      interview_prep: 'interview_prep',
      negotiation: 'negotiation_coaching',
      career_advice: 'career_advice',
    };

    const feature = featureMap[options.operation];
    if (!hasFeature(tier, feature)) {
      return {
        allowed: false,
        error: `${options.operation} requires a higher subscription tier`,
      };
    }

    // Check rate limits
    const limits = getTierLimits(tier);
    const usage = await this.getCurrentMonthUsage(options.userId, options.operation);

    if (limits.aiRequests && usage >= limits.aiRequests) {
      return {
        allowed: false,
        error: `Monthly AI request limit reached (${limits.aiRequests})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get cached result if available
   */
  private async getCachedResult(options: AIExecutorOptions): Promise<any | null> {
    try {
      const cache = await prisma.jobAnalysisCache.findUnique({
        where: {
          jobId_userId_analysisType: {
            jobId: options.jobId,
            userId: options.userId,
            analysisType: options.operation,
          },
        },
      });

      if (cache && new Date(cache.expiresAt) > new Date()) {
        return JSON.parse(cache.analysisData);
      }
    } catch (error) {
      console.error('Cache retrieval error:', error);
    }

    return null;
  }

  /**
   * Cache the result
   */
  private async cacheResult(options: AIExecutorOptions, data: any): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour cache

      await prisma.jobAnalysisCache.upsert({
        where: {
          jobId_userId_analysisType: {
            jobId: options.jobId,
            userId: options.userId,
            analysisType: options.operation,
          },
        },
        update: {
          analysisData: JSON.stringify(data),
          expiresAt,
          updatedAt: new Date(),
        },
        create: {
          jobId: options.jobId,
          userId: options.userId,
          analysisType: options.operation,
          analysisData: JSON.stringify(data),
          expiresAt,
        },
      });
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  /**
   * Execute the specific operation
   */
  private async executeOperation(options: AIExecutorOptions): Promise<AIExecutorResult> {
    switch (options.operation) {
      case 'match_score':
        return this.executeMatchScore(options);

      case 'salary_analysis':
        return this.executeSalaryAnalysis(options);

      case 'company_research':
        return this.executeCompanyResearch(options);

      case 'skills_gap':
        return this.executeSkillsGap(options);

      case 'interview_prep':
        return this.executeInterviewPrep(options);

      case 'negotiation':
        return this.executeNegotiation(options);

      case 'career_advice':
        return this.executeCareerAdvice(options);

      default:
        return {
          success: false,
          error: `Unknown operation: ${options.operation}`,
        };
    }
  }

  /**
   * Execute match score calculation
   */
  private async executeMatchScore(options: AIExecutorOptions): Promise<AIExecutorResult> {
    try {
      const result = await this.matchService.calculateMatch({
        jobId: options.jobId,
        jobDescription: options.data.jobDescription,
        jobRequirements: options.data.jobRequirements,
        jobTitle: options.data.jobTitle,
        jobCompany: options.data.jobCompany,
        resumeText: options.data.resumeText,
        resumeSkills: options.data.resumeSkills,
        userProfile: options.data.userProfile,
        forceRecalculate: options.forceRefresh,
      });

      // Update job with match score
      await prisma.job.update({
        where: { id: options.jobId },
        data: {
          matchScore: result.matchScore,
          matchAnalysis: JSON.stringify(result.detailedAnalysis),
        },
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Match calculation failed',
      };
    }
  }

  /**
   * Execute salary analysis
   */
  private async executeSalaryAnalysis(options: AIExecutorOptions): Promise<AIExecutorResult> {
    try {
      const result = await this.unifiedAI.analyzeSalary({
        jobTitle: options.data.jobTitle,
        company: options.data.company,
        location: options.data.location,
        salary: options.data.salary,
        userProfile: options.data.userProfile,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Salary analysis failed',
      };
    }
  }

  /**
   * Execute company research
   */
  private async executeCompanyResearch(options: AIExecutorOptions): Promise<AIExecutorResult> {
    try {
      const result = await this.unifiedAI.researchCompany({
        company: options.data.company,
        jobTitle: options.data.jobTitle,
        location: options.data.location,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Company research failed',
      };
    }
  }

  /**
   * Execute skills gap analysis
   */
  private async executeSkillsGap(options: AIExecutorOptions): Promise<AIExecutorResult> {
    try {
      const result = await this.skillsGapService.analyzeGaps({
        jobRequirements: options.data.jobRequirements,
        userSkills: options.data.userSkills,
        jobTitle: options.data.jobTitle,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Skills gap analysis failed',
      };
    }
  }

  /**
   * Execute interview preparation
   */
  private async executeInterviewPrep(options: AIExecutorOptions): Promise<AIExecutorResult> {
    try {
      const result = await this.unifiedAI.generateInterviewPrep({
        jobTitle: options.data.jobTitle,
        company: options.data.company,
        jobDescription: options.data.jobDescription,
        userProfile: options.data.userProfile,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Interview prep failed',
      };
    }
  }

  /**
   * Execute negotiation coaching
   */
  private async executeNegotiation(options: AIExecutorOptions): Promise<AIExecutorResult> {
    try {
      const result = await this.unifiedAI.generateNegotiationStrategy({
        jobTitle: options.data.jobTitle,
        company: options.data.company,
        salary: options.data.salary,
        userProfile: options.data.userProfile,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Negotiation strategy failed',
      };
    }
  }

  /**
   * Execute career advice
   */
  private async executeCareerAdvice(options: AIExecutorOptions): Promise<AIExecutorResult> {
    try {
      const result = await this.unifiedAI.generateCareerAdvice({
        currentRole: options.data.currentRole,
        targetRole: options.data.targetRole,
        userProfile: options.data.userProfile,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Career advice failed',
      };
    }
  }

  /**
   * Track AI usage
   */
  private async trackUsage(options: AIExecutorOptions): Promise<void> {
    try {
      const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM

      await prisma.aIUsageTracking.upsert({
        where: {
          userId_taskType_monthKey: {
            userId: options.userId,
            taskType: options.operation,
            monthKey,
          },
        },
        update: {
          requestCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
        create: {
          userId: options.userId,
          taskType: options.operation,
          monthKey,
          requestCount: 1,
        },
      });
    } catch (error) {
      console.error('Usage tracking error:', error);
    }
  }

  /**
   * Get current month usage
   */
  private async getCurrentMonthUsage(userId: string, operation: AIOperationType): Promise<number> {
    try {
      const monthKey = new Date().toISOString().slice(0, 7);

      const usage = await prisma.aIUsageTracking.findUnique({
        where: {
          userId_taskType_monthKey: {
            userId,
            taskType: operation,
            monthKey,
          },
        },
      });

      return usage?.requestCount || 0;
    } catch (error) {
      console.error('Usage retrieval error:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const aiExecutor = new AIExecutor();