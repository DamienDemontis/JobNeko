/**
 * AI Service Manager - MIGRATED TO UNIFIED ARCHITECTURE
 *
 * This service now uses the Unified AI Service internally.
 * All token limits removed, no fallbacks, clean error handling.
 *
 * IMPORTANT: This is a compatibility wrapper. New code should use
 * @/lib/services/unified-ai-service directly.
 */

import { unifiedAI } from './unified-ai-service';
import type { GPT5Model } from '@/lib/ai-service';
import { prisma } from '@/lib/prisma';

// Legacy interfaces for backward compatibility
export interface AIOptions {
  model?: GPT5Model;
  responseFormat?: 'json' | 'text';
  // Removed: temperature, max_tokens (no longer supported in unified architecture)
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

  // Usage quotas (no longer enforced - using unlimited GPT-5 capacity)
  private readonly USAGE_QUOTAS: UsageQuota = {
    free: {
      job_analysis: 10,
      resume_optimization: 5,
      interview_prep: 5,
      company_research: 3,
      communication_generation: 10,
      requirement_analysis: 8,
      salary_analysis: 5,
      skills_analysis: 8,
      networking_analysis: 5
    },
    pro: {
      job_analysis: 100,
      resume_optimization: 50,
      interview_prep: 50,
      company_research: 30,
      communication_generation: 100,
      requirement_analysis: 80,
      salary_analysis: 50,
      skills_analysis: 80,
      networking_analysis: 50
    },
    enterprise: {
      job_analysis: 1000,
      resume_optimization: 500,
      interview_prep: 500,
      company_research: 300,
      communication_generation: 1000,
      requirement_analysis: 800,
      salary_analysis: 500,
      skills_analysis: 800,
      networking_analysis: 500
    }
  };

  // Task type mapping to unified AI operations
  private readonly TASK_TYPE_MAPPING: { [key in AITaskType]: string } = {
    job_analysis: 'job_extraction',
    resume_optimization: 'resume_parsing',
    interview_prep: 'general_completion',
    company_research: 'company_analysis',
    communication_generation: 'general_completion',
    requirement_analysis: 'general_completion',
    salary_analysis: 'salary_analysis',
    skills_analysis: 'skill_matching',
    networking_analysis: 'general_completion'
  };

  private constructor() {}

  static getInstance(): AIServiceManager {
    if (!AIServiceManager.instance) {
      AIServiceManager.instance = new AIServiceManager();
    }
    return AIServiceManager.instance;
  }

  /**
   * Generate AI completion using unified architecture
   * NO TOKEN LIMITS - Uses GPT-5's full capacity
   */
  async generateCompletion(
    prompt: string,
    taskType: AITaskType,
    userId: string,
    options?: Partial<AIOptions>
  ): Promise<AIResponse> {
    try {
      console.log(`🔄 Migrating ${taskType} to unified AI architecture`);

      // Get user tier for logging (quotas no longer enforced)
      const userTier = await this.getUserTier(userId);
      console.log(`👤 User ${userId} (${userTier}) requesting ${taskType}`);

      // Map task type to unified operation
      const operation = this.TASK_TYPE_MAPPING[taskType];

      // Use unified AI service - NO TOKEN LIMITS
      const result = await unifiedAI.process({
        operation,
        content: prompt,
        overrides: {
          model: options?.model || this.getOptimalModel(taskType)
        }
      });

      if (!result.success) {
        throw new Error(`AI ${taskType} failed: ${result.error?.message}`);
      }

      // Track usage for analytics (not quota enforcement)
      await this.trackUsage(userId, taskType, result.inputLength, result.outputLength);

      // Return in legacy format for backward compatibility
      return {
        content: typeof result.data === 'string' ? result.data : JSON.stringify(result.data),
        usage: {
          prompt_tokens: result.inputLength,
          completion_tokens: result.outputLength,
          total_tokens: result.inputLength + result.outputLength
        },
        model: result.model,
        cached: false // No caching in unified architecture for accuracy
      };

    } catch (error) {
      console.error(`❌ AI Service Manager error for ${taskType}:`, error);
      throw error; // No fallbacks - show errors directly
    }
  }

  /**
   * Get optimal model for task type (no token limits)
   */
  private getOptimalModel(taskType: AITaskType): GPT5Model {
    const highComplexityTasks: AITaskType[] = [
      'job_analysis',
      'resume_optimization',
      'company_research',
      'salary_analysis'
    ];

    // Use full GPT-5 for complex tasks, mini for simpler ones
    return highComplexityTasks.includes(taskType) ? 'gpt-5' : 'gpt-5-mini';
  }

  /**
   * Check if user has quota (informational only - not enforced)
   */
  async checkQuota(userId: string, taskType: AITaskType, userTier: UserTier): Promise<boolean> {
    // Always return true - no quota enforcement in unified architecture
    console.log(`ℹ️ Quota check for ${userId} (${userTier}) - ${taskType}: unlimited`);
    return true;
  }

  /**
   * Get user tier
   */
  async getUserTier(userId: string): Promise<UserTier> {
    try {
      // Since the User model doesn't have a plan field, default to 'free'
      // This can be extended when user tiers are implemented
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });

      return user ? 'free' : 'free'; // Default to free tier for all users
    } catch (error) {
      console.error('Error getting user tier:', error);
      return 'free';
    }
  }

  /**
   * Track usage for analytics (not quota enforcement)
   */
  private async trackUsage(
    userId: string,
    taskType: AITaskType,
    inputTokens: number,
    outputTokens: number
  ): Promise<void> {
    try {
      // Track for analytics only - no quota enforcement
      console.log(`📊 Usage tracked: ${userId} - ${taskType} - ${inputTokens + outputTokens} tokens`);

      // Could store in database for analytics if needed
      // await prisma.aiUsage.create({ ... });
    } catch (error) {
      console.error('Error tracking usage:', error);
      // Don't throw - usage tracking failure shouldn't block AI operations
    }
  }

  /**
   * DEPRECATED: Model config with token limits
   * Use unified AI service configuration instead
   */
  private getModelConfig(taskType: AITaskType, options?: Partial<AIOptions>) {
    console.warn(`⚠️ getModelConfig is deprecated. Task ${taskType} migrated to unified architecture.`);
    return {
      model: options?.model || this.getOptimalModel(taskType),
      // Token limits removed - using GPT-5's full capacity
    };
  }

  /**
   * Generate cache key (unused in unified architecture)
   */
  private generateCacheKey(prompt: string, taskType: AITaskType, config: any): string {
    // Caching disabled in unified architecture for accuracy
    return '';
  }

  /**
   * Get cached response (unused in unified architecture)
   */
  private async getCachedResponse(cacheKey: string): Promise<AIResponse | null> {
    // No caching - always use fresh AI responses for accuracy
    return null;
  }

  /**
   * Cache response (unused in unified architecture)
   */
  private async cacheResponse(cacheKey: string, response: AIResponse): Promise<void> {
    // No caching in unified architecture
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(userId: string): Promise<{
    total_requests: number;
    total_tokens: number;
    requests_by_type: { [key in AITaskType]?: number };
  }> {
    // Return basic stats - detailed analytics can be implemented later
    return {
      total_requests: 0,
      total_tokens: 0,
      requests_by_type: {}
    };
  }
}

// Export singleton
export const aiServiceManager = AIServiceManager.getInstance();

/**
 * MIGRATION NOTE:
 *
 * This service has been migrated to use the unified AI architecture.
 * Key changes:
 * - NO TOKEN LIMITS: Uses GPT-5's full 128k capacity
 * - NO FALLBACKS: Shows errors directly
 * - NO CACHING: Always fresh responses for accuracy
 * - QUOTA ENFORCEMENT REMOVED: Unlimited usage
 *
 * For new code, use @/lib/services/unified-ai-service directly.
 */