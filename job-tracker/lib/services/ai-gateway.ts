/**
 * Centralized AI Gateway
 *
 * Single point of entry for ALL AI requests in the platform.
 * Handles:
 * - Deployment mode awareness (self-hosted vs SaaS)
 * - Subscription tier enforcement (SaaS only)
 * - Usage tracking and limits (SaaS only)
 * - API key management
 * - Cost tracking
 * - Error handling
 *
 * This is the ONLY way AI services should be accessed.
 */

import { unifiedAI, AIRequest, AIResponse } from './unified-ai-service';
import { getUserTier, getTierLimits, SubscriptionTier } from './subscription-tiers';
import { platformConfig } from '@/lib/config';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export interface AIGatewayRequest extends Omit<AIRequest, 'overrides'> {
  userId: string;
  // Optional: Override API key for specific requests
  customApiKey?: string;
}

export interface AIGatewayResponse<T = any> extends AIResponse<T> {
  tier: SubscriptionTier;
  usageTracked: boolean;
  costEstimate?: number;
  remainingQuota?: number;
}

export class AIGateway {
  private static instance: AIGateway;

  private constructor() {
    console.log('🚪 AI Gateway initialized');
  }

  static getInstance(): AIGateway {
    if (!AIGateway.instance) {
      AIGateway.instance = new AIGateway();
    }
    return AIGateway.instance;
  }

  /**
   * Main request method - ALL AI requests MUST go through here
   */
  async request<T = any>(request: AIGatewayRequest): Promise<AIGatewayResponse<T>> {
    console.log(`🚪 AI Gateway [${platformConfig.deploymentMode}]: ${request.operation} from user ${request.userId}`);

    try {
      // 1. Determine user's tier and mode
      const { tier, mode, apiKey } = await this.getUserContext(request.userId, request.customApiKey);

      console.log(`   Tier: ${tier}, Mode: ${mode}`);

      // 2. In self-hosted mode, enforce API key requirement
      if (platformConfig.isSelfHosted && !apiKey) {
        throw new Error('API key required. Please configure your OpenAI API key in Settings.');
      }

      // 3. Check if feature is allowed for tier (only in SaaS mode)
      if (platformConfig.isSaaS) {
        const limits = getTierLimits(tier);
        const isAllowed = this.checkFeatureAccess(request.operation, limits);

        if (!isAllowed) {
          throw new Error(`Feature "${request.operation}" not available in ${tier} tier. Please upgrade.`);
        }
      }

      // 4. Check usage limits (only for SaaS platform mode)
      if (platformConfig.isSaaS && mode === 'platform') {
        const canProceed = await this.checkUsageLimits(request.userId, request.operation, tier);
        if (!canProceed) {
          throw new Error(`Usage limit reached for "${request.operation}". Please upgrade or wait for reset.`);
        }
      }

      // 5. Execute request with appropriate API key
      // Pass the API key directly to avoid mutating process.env
      const result = await this.executeRequest<T>(request, apiKey);

      // 7. Track usage (only for SaaS platform mode)
      if (platformConfig.isSaaS && mode === 'platform') {
        await this.trackUsage(
          request.userId,
          request.operation,
          result.processingTime,
          result.inputLength,
          result.outputLength,
          result.success
        );
      }

      // 8. Estimate cost
      const costEstimate = this.estimateCost(result.inputLength, result.outputLength, result.model);

      return {
        ...result,
        tier,
        usageTracked: platformConfig.isSaaS && mode === 'platform',
        costEstimate,
      };

    } catch (error) {
      console.error('🚪 AI Gateway error:', error);
      throw error;
    }
  }

  /**
   * Get user's tier, mode, and API key
   */
  private async getUserContext(userId: string, customApiKey?: string): Promise<{
    tier: SubscriptionTier;
    mode: 'platform' | 'self_hosted';
    apiKey?: string;
  }> {
    if (customApiKey) {
      return {
        tier: SubscriptionTier.SELF_HOSTED,
        mode: 'self_hosted',
        apiKey: customApiKey
      };
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          subscriptionTier: true,
          apiKeyMode: true,
          encryptedApiKey: true
        }
      });

      if (!user) {
        return {
          tier: SubscriptionTier.FREE,
          mode: 'platform'
        };
      }

      // User has their own API key
      if (user.apiKeyMode === 'self_hosted' && user.encryptedApiKey) {
        const decryptedKey = this.decryptApiKey(user.encryptedApiKey);
        return {
          tier: SubscriptionTier.SELF_HOSTED,
          mode: 'self_hosted',
          apiKey: decryptedKey
        };
      }

      // User uses platform API key
      const tier = await getUserTier(userId);
      return {
        tier,
        mode: 'platform'
      };

    } catch (error) {
      console.error('Failed to get user context:', error);
      return {
        tier: SubscriptionTier.FREE,
        mode: 'platform'
      };
    }
  }

  /**
   * Check if operation is allowed for tier
   */
  private checkFeatureAccess(operation: string, limits: any): boolean {
    // For now, all operations are allowed for all tiers
    // In future, can add operation-specific checks
    // e.g., if (operation === 'company_intelligence' && !limits.includeCompanyIntelligence) return false;
    return true;
  }

  /**
   * Check usage limits for SaaS users
   */
  private async checkUsageLimits(userId: string, operation: string, tier: SubscriptionTier): Promise<boolean> {
    // SELF_HOSTED and PRO_MAX have unlimited usage
    if (tier === SubscriptionTier.SELF_HOSTED || tier === SubscriptionTier.PRO_MAX) {
      return true;
    }

    // Check monthly AI usage
    const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM

    const usage = await prisma.aIUsageTracking.findUnique({
      where: {
        userId_taskType_monthKey: {
          userId,
          taskType: operation,
          monthKey
        }
      }
    });

    // Define limits per tier per operation
    const limits = {
      [SubscriptionTier.FREE]: 50, // 50 AI requests per month
      [SubscriptionTier.PRO]: 500, // 500 AI requests per month
      [SubscriptionTier.PRO_MAX]: -1, // Unlimited
      [SubscriptionTier.SELF_HOSTED]: -1 // Unlimited
    };

    const limit = limits[tier];
    if (limit === -1) return true; // Unlimited

    const currentUsage = usage?.requestCount || 0;
    return currentUsage < limit;
  }

  /**
   * Execute the AI request with optional custom API key
   * @param request The AI request to execute
   * @param customApiKey Optional API key to use (for self-hosted users)
   */
  private async executeRequest<T>(
    request: AIGatewayRequest,
    customApiKey?: string
  ): Promise<AIResponse<T>> {
    const aiRequest: AIRequest = {
      operation: request.operation,
      content: request.content,
      additionalInstructions: request.additionalInstructions,
      // Pass custom API key to unified AI if provided
      overrides: customApiKey ? { customApiKey } : undefined
    };

    return await unifiedAI.process<T>(aiRequest);
  }

  /**
   * Track usage in database
   */
  private async trackUsage(
    userId: string,
    taskType: string,
    responseTime: number,
    inputTokens: number,
    outputTokens: number,
    success: boolean
  ): Promise<void> {
    const monthKey = new Date().toISOString().slice(0, 7);
    const totalTokens = inputTokens + outputTokens;

    try {
      await prisma.aIUsageTracking.upsert({
        where: {
          userId_taskType_monthKey: {
            userId,
            taskType,
            monthKey
          }
        },
        create: {
          userId,
          taskType,
          monthKey,
          requestCount: 1,
          tokensUsed: totalTokens,
          lastUsedAt: new Date()
        },
        update: {
          requestCount: {
            increment: 1
          },
          tokensUsed: {
            increment: totalTokens
          },
          lastUsedAt: new Date()
        }
      });

      console.log(`✅ Usage tracked: ${taskType} for user ${userId}`);
    } catch (error) {
      console.error('Failed to track usage:', error);
      // Don't throw - usage tracking failure shouldn't break the request
    }
  }

  /**
   * Estimate cost based on tokens and model
   */
  private estimateCost(inputTokens: number, outputTokens: number, model: string): number {
    // GPT-5 pricing (estimated, adjust when actual pricing is known)
    const pricing = {
      'gpt-5': { input: 0.00003, output: 0.00006 },
      'gpt-5-mini': { input: 0.00001, output: 0.00002 },
      'gpt-5-nano': { input: 0.000005, output: 0.00001 }
    };

    const modelPricing = pricing[model as keyof typeof pricing] || pricing['gpt-5-mini'];

    return (inputTokens * modelPricing.input) + (outputTokens * modelPricing.output);
  }

  /**
   * Encrypt API key for storage
   */
  encryptApiKey(apiKey: string): string {
    const algorithm = 'aes-256-gcm';
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Store iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt API key from storage
   */
  private decryptApiKey(encryptedData: string): string {
    const algorithm = 'aes-256-gcm';
    const key = this.getEncryptionKey();

    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Get encryption key from environment
   */
  private getEncryptionKey(): Buffer {
    const secret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || 'default-secret-key-change-me';
    // Generate 32-byte key from secret
    return crypto.scryptSync(secret, 'salt', 32);
  }

  /**
   * Save user's API key
   */
  async saveUserApiKey(userId: string, apiKey: string): Promise<void> {
    const encrypted = this.encryptApiKey(apiKey);

    await prisma.user.update({
      where: { id: userId },
      data: {
        apiKeyMode: 'self_hosted',
        encryptedApiKey: encrypted,
        subscriptionTier: 'self_hosted'
      }
    });

    console.log(`🔑 API key saved for user ${userId}`);
  }

  /**
   * Remove user's API key (switch back to platform mode)
   */
  async removeUserApiKey(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        apiKeyMode: 'platform',
        encryptedApiKey: null,
        subscriptionTier: 'free'
      }
    });

    console.log(`🔑 API key removed for user ${userId}`);
  }

  /**
   * Get usage statistics for a user
   */
  async getUserUsageStats(userId: string): Promise<{
    monthlyUsage: number;
    monthlyLimit: number;
    tier: SubscriptionTier;
    mode: 'platform' | 'self_hosted';
  }> {
    const { tier, mode } = await this.getUserContext(userId);
    const monthKey = new Date().toISOString().slice(0, 7);

    const usage = await prisma.aIUsageTracking.findMany({
      where: {
        userId,
        monthKey
      }
    });

    const monthlyUsage = usage.reduce((sum, record) => sum + record.requestCount, 0);

    const limits = {
      [SubscriptionTier.FREE]: 50,
      [SubscriptionTier.PRO]: 500,
      [SubscriptionTier.PRO_MAX]: -1,
      [SubscriptionTier.SELF_HOSTED]: -1
    };

    return {
      monthlyUsage,
      monthlyLimit: limits[tier],
      tier,
      mode
    };
  }
}

// Export singleton
export const aiGateway = AIGateway.getInstance();
