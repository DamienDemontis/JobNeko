/**
 * AI Service Manager - Centralized AI request management with usage tracking
 * Handles model selection, quota management, and intelligent caching
 * NO FALLBACKS - Only intelligent AI-driven responses
 */

import { generateCompletion } from '@/lib/ai-service';
import { prisma } from '@/lib/prisma';

export interface AIOptions {
  temperature?: number;
  max_tokens?: number;
  model?: string;
  responseFormat?: 'json' | 'text';
}

export interface AIResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  cached: boolean;
}

export interface ModelConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  complexity: 'low' | 'medium' | 'high';
}

export type AITaskType =
  | 'job_analysis'
  | 'resume_optimization'
  | 'interview_prep'
  | 'company_research'
  | 'communication_generation'
  | 'requirement_analysis'
  | 'salary_analysis'
  | 'skills_analysis'
  | 'networking_analysis';

export type UserTier = 'free' | 'pro' | 'enterprise';

interface UsageQuota {
  free: { [key in AITaskType]: number };
  pro: { [key in AITaskType]: number };
  enterprise: { [key in AITaskType]: number };
}

export class AIServiceManager {
  private static instance: AIServiceManager;

  // Monthly usage quotas per tier
  private readonly USAGE_QUOTAS: UsageQuota = {
    free: {
      job_analysis: 10,
      resume_optimization: 5,
      interview_prep: 5,
      company_research: 3,
      communication_generation: 10,
      requirement_analysis: 15,
      salary_analysis: 5,
      skills_analysis: 10,
      networking_analysis: 3
    },
    pro: {
      job_analysis: 100,
      resume_optimization: 50,
      interview_prep: 50,
      company_research: 30,
      communication_generation: 100,
      requirement_analysis: 150,
      salary_analysis: 50,
      skills_analysis: 100,
      networking_analysis: 30
    },
    enterprise: {
      job_analysis: -1, // unlimited
      resume_optimization: -1,
      interview_prep: -1,
      company_research: -1,
      communication_generation: -1,
      requirement_analysis: -1,
      salary_analysis: -1,
      skills_analysis: -1,
      networking_analysis: -1
    }
  };

  // Model optimization based on task complexity
  private readonly MODEL_CONFIGS: { [key in AITaskType]: ModelConfig } = {
    job_analysis: {
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 2000,
      complexity: 'high'
    },
    resume_optimization: {
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 1500,
      complexity: 'high'
    },
    interview_prep: {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 1000,
      complexity: 'medium'
    },
    company_research: {
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 2500,
      complexity: 'high'
    },
    communication_generation: {
      model: 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 800,
      complexity: 'medium'
    },
    requirement_analysis: {
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 1200,
      complexity: 'medium'
    },
    salary_analysis: {
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 2000,
      complexity: 'high'
    },
    skills_analysis: {
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 1500,
      complexity: 'medium'
    },
    networking_analysis: {
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 1000,
      complexity: 'medium'
    }
  };

  private constructor() {}

  static getInstance(): AIServiceManager {
    if (!AIServiceManager.instance) {
      AIServiceManager.instance = new AIServiceManager();
    }
    return AIServiceManager.instance;
  }

  /**
   * Generate AI completion with usage tracking and quota management
   */
  async generateCompletion(
    prompt: string,
    taskType: AITaskType,
    userId: string,
    options?: Partial<AIOptions>
  ): Promise<AIResponse> {
    try {
      // Get user tier
      const userTier = await this.getUserTier(userId);

      // Check quota
      const hasQuota = await this.checkQuota(userId, taskType, userTier);
      if (!hasQuota) {
        throw new Error(`Usage quota exceeded for ${taskType}. Please upgrade your plan.`);
      }

      // Get optimized model config
      const modelConfig = this.getModelConfig(taskType, options);

      // Check cache first
      const cacheKey = this.generateCacheKey(prompt, taskType, modelConfig);
      const cachedResponse = await this.getCachedResponse(cacheKey);

      if (cachedResponse) {
        console.log(`✅ Cache hit for ${taskType}`);
        return {
          ...cachedResponse,
          cached: true
        };
      }

      // Generate new response
      console.log(`🤖 Generating ${taskType} with model: ${modelConfig.model}`);
      const response = await generateCompletion(prompt, {
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.max_tokens,
        model: modelConfig.model,
        ...options
      });

      if (!response?.content) {
        throw new Error(`Failed to generate ${taskType} - no content received`);
      }

      // Estimate token usage (approximation)
      const estimatedTokens = this.estimateTokens(prompt + response.content);

      const aiResponse: AIResponse = {
        content: response.content,
        usage: {
          prompt_tokens: Math.floor(estimatedTokens * 0.4),
          completion_tokens: Math.floor(estimatedTokens * 0.6),
          total_tokens: estimatedTokens
        },
        model: modelConfig.model,
        cached: false
      };

      // Track usage
      await this.trackUsage(userId, taskType, aiResponse.usage.total_tokens);

      // Cache response
      await this.cacheResponse(cacheKey, aiResponse);

      console.log(`✅ ${taskType} completed - ${estimatedTokens} tokens used`);
      return aiResponse;

    } catch (error) {
      console.error(`❌ AI Service Manager error for ${taskType}:`, error);
      throw new Error(`Failed to generate ${taskType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user has quota for specific task type
   */
  async checkQuota(userId: string, taskType: AITaskType, userTier?: UserTier): Promise<boolean> {
    try {
      const tier = userTier || await this.getUserTier(userId);
      const quota = this.USAGE_QUOTAS[tier][taskType];

      // Unlimited quota
      if (quota === -1) return true;

      // Get current month usage
      const currentUsage = await this.getCurrentMonthUsage(userId, taskType);

      return currentUsage < quota;
    } catch (error) {
      console.error('Error checking quota:', error);
      return false;
    }
  }

  /**
   * Get user's current tier
   */
  private async getUserTier(userId: string): Promise<UserTier> {
    try {
      // For now, return 'free' as default since payment system isn't implemented
      // TODO: Implement proper tier checking when payment system is added
      return 'free';
    } catch (error) {
      console.error('Error getting user tier:', error);
      return 'free';
    }
  }

  /**
   * Get optimized model configuration for task type
   */
  private getModelConfig(taskType: AITaskType, options?: Partial<AIOptions>): ModelConfig {
    const baseConfig = this.MODEL_CONFIGS[taskType];

    return {
      ...baseConfig,
      temperature: options?.temperature ?? baseConfig.temperature,
      max_tokens: options?.max_tokens ?? baseConfig.max_tokens,
      model: options?.model ?? baseConfig.model
    };
  }

  /**
   * Track AI usage for user
   */
  private async trackUsage(userId: string, taskType: AITaskType, tokensUsed: number): Promise<void> {
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      await prisma.aIUsageTracking.upsert({
        where: {
          userId_taskType_monthKey: {
            userId,
            taskType,
            monthKey
          }
        },
        update: {
          requestCount: { increment: 1 },
          tokensUsed: { increment: tokensUsed },
          lastUsedAt: now
        },
        create: {
          userId,
          taskType,
          monthKey,
          requestCount: 1,
          tokensUsed,
          lastUsedAt: now
        }
      });
    } catch (error) {
      console.error('Error tracking usage:', error);
      // Don't throw - usage tracking failure shouldn't break AI functionality
    }
  }

  /**
   * Get current month usage for user and task type
   */
  private async getCurrentMonthUsage(userId: string, taskType: AITaskType): Promise<number> {
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const usage = await prisma.aIUsageTracking.findUnique({
        where: {
          userId_taskType_monthKey: {
            userId,
            taskType,
            monthKey
          }
        }
      });

      return usage?.requestCount ?? 0;
    } catch (error) {
      console.error('Error getting current usage:', error);
      return 0;
    }
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(prompt: string, taskType: AITaskType, modelConfig: ModelConfig): string {
    const content = `${taskType}-${modelConfig.model}-${prompt}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `ai-cache-${hash.toString(36)}`;
  }

  /**
   * Get cached response
   */
  private async getCachedResponse(cacheKey: string): Promise<AIResponse | null> {
    try {
      const cached = await prisma.aIResponseCache.findUnique({
        where: { cacheKey }
      });

      if (!cached) return null;

      // Check if cache is expired (24 hours)
      const isExpired = new Date() > cached.expiresAt;
      if (isExpired) {
        await prisma.aIResponseCache.delete({ where: { cacheKey } });
        return null;
      }

      return JSON.parse(cached.response) as AIResponse;
    } catch (error) {
      console.error('Error getting cached response:', error);
      return null;
    }
  }

  /**
   * Cache AI response
   */
  private async cacheResponse(cacheKey: string, response: AIResponse): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour cache

      await prisma.aIResponseCache.upsert({
        where: { cacheKey },
        update: {
          response: JSON.stringify(response),
          expiresAt
        },
        create: {
          cacheKey,
          response: JSON.stringify(response),
          expiresAt
        }
      });
    } catch (error) {
      console.error('Error caching response:', error);
      // Don't throw - caching failure shouldn't break functionality
    }
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get user usage statistics
   */
  async getUserUsageStats(userId: string): Promise<{
    currentMonth: { [key in AITaskType]?: number };
    totalAllTime: number;
    tier: UserTier;
    quotas: { [key in AITaskType]: number };
  }> {
    try {
      const tier = await this.getUserTier(userId);
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const usage = await prisma.aIUsageTracking.findMany({
        where: { userId, monthKey }
      });

      const currentMonth: { [key in AITaskType]?: number } = {};
      for (const record of usage) {
        currentMonth[record.taskType as AITaskType] = record.requestCount;
      }

      const totalUsage = await prisma.aIUsageTracking.aggregate({
        where: { userId },
        _sum: { requestCount: true }
      });

      return {
        currentMonth,
        totalAllTime: totalUsage._sum.requestCount ?? 0,
        tier,
        quotas: this.USAGE_QUOTAS[tier]
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      throw new Error('Failed to get usage statistics');
    }
  }
}

// Export singleton instance
export const aiServiceManager = AIServiceManager.getInstance();