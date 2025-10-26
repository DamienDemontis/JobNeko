/**
 * Subscription Tier System
 * Defines feature access and limits for different subscription levels
 */

export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  PRO_MAX = 'pro_max',
  SELF_HOSTED = 'self_hosted'
}

export interface TierLimits {
  // Resume Matching
  matchAnalysisDepth: 'basic' | 'standard' | 'comprehensive';
  includeSkillsGap: boolean;
  includeImprovementPlan: boolean;
  includeATSAnalysis: boolean;
  includeTailoringRecommendations: boolean;
  includeStrengthsAnalysis: boolean;

  // AI Analysis
  salaryAnalysisDetail: 'basic' | 'enhanced' | 'comprehensive';
  includeWebSearch: boolean;
  includeCompanyIntelligence: boolean;
  includeNegotiationCoaching: boolean;
  includeCultureAnalysis: boolean;
  includeInterviewPrep: boolean;

  // Job Management
  maxJobs: number | 'unlimited';
  autoMatchScoring: boolean;
  batchOperations: boolean;
  advancedFiltering: boolean;

  // Data Refresh
  cacheExpirationHours: number;
  realTimeWebSearch: boolean;

  // Support
  prioritySupport: boolean;
  customReports: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    // Resume Matching - Basic only
    matchAnalysisDepth: 'basic',
    includeSkillsGap: false,
    includeImprovementPlan: false,
    includeATSAnalysis: false,
    includeTailoringRecommendations: false,
    includeStrengthsAnalysis: false,

    // AI Analysis - Basic only
    salaryAnalysisDetail: 'basic',
    includeWebSearch: false,
    includeCompanyIntelligence: false,
    includeNegotiationCoaching: false,
    includeCultureAnalysis: false,
    includeInterviewPrep: false,

    // Job Management
    maxJobs: 50,
    autoMatchScoring: true,  // Basic auto-matching for free tier
    batchOperations: false,
    advancedFiltering: false,

    // Data Refresh
    cacheExpirationHours: 168, // 7 days
    realTimeWebSearch: false,

    // Support
    prioritySupport: false,
    customReports: false
  },

  [SubscriptionTier.PRO]: {
    // Resume Matching - Standard depth
    matchAnalysisDepth: 'standard',
    includeSkillsGap: true,
    includeImprovementPlan: true,
    includeATSAnalysis: true,
    includeTailoringRecommendations: true,
    includeStrengthsAnalysis: true,

    // AI Analysis - Enhanced
    salaryAnalysisDetail: 'enhanced',
    includeWebSearch: true,
    includeCompanyIntelligence: true,
    includeNegotiationCoaching: true,
    includeCultureAnalysis: true,
    includeInterviewPrep: true,

    // Job Management
    maxJobs: 500,
    autoMatchScoring: true,
    batchOperations: true,
    advancedFiltering: true,

    // Data Refresh
    cacheExpirationHours: 24, // 1 day
    realTimeWebSearch: true,

    // Support
    prioritySupport: true,
    customReports: false
  },

  [SubscriptionTier.PRO_MAX]: {
    // Resume Matching - Comprehensive
    matchAnalysisDepth: 'comprehensive',
    includeSkillsGap: true,
    includeImprovementPlan: true,
    includeATSAnalysis: true,
    includeTailoringRecommendations: true,
    includeStrengthsAnalysis: true,

    // AI Analysis - Comprehensive with all features
    salaryAnalysisDetail: 'comprehensive',
    includeWebSearch: true,
    includeCompanyIntelligence: true,
    includeNegotiationCoaching: true,
    includeCultureAnalysis: true,
    includeInterviewPrep: true,

    // Job Management
    maxJobs: 'unlimited',
    autoMatchScoring: true,
    batchOperations: true,
    advancedFiltering: true,

    // Data Refresh
    cacheExpirationHours: 1, // 1 hour - near real-time
    realTimeWebSearch: true,

    // Support
    prioritySupport: true,
    customReports: true
  },

  [SubscriptionTier.SELF_HOSTED]: {
    // Self-hosted users get ALL features (they use their own API key)
    matchAnalysisDepth: 'comprehensive',
    includeSkillsGap: true,
    includeImprovementPlan: true,
    includeATSAnalysis: true,
    includeTailoringRecommendations: true,
    includeStrengthsAnalysis: true,

    salaryAnalysisDetail: 'comprehensive',
    includeWebSearch: true,
    includeCompanyIntelligence: true,
    includeNegotiationCoaching: true,
    includeCultureAnalysis: true,
    includeInterviewPrep: true,

    maxJobs: 'unlimited',
    autoMatchScoring: true,
    batchOperations: true,
    advancedFiltering: true,

    cacheExpirationHours: 0, // No caching for self-hosted (always fresh)
    realTimeWebSearch: true,

    prioritySupport: false, // No support for self-hosted
    customReports: true
  }
};

/**
 * Get tier limits for a user
 * Fetches from database or returns PRO_MAX for development
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  // For development: Always return PRO_MAX to see all features
  // TODO: Remove this override when deploying to production
  if (process.env.NODE_ENV === 'development') {
    return SubscriptionTier.PRO_MAX;
  }

  // Fetch user's subscription tier from database
  try {
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        apiKeyMode: true,
        encryptedApiKey: true
      }
    });

    if (!user) {
      return SubscriptionTier.FREE;
    }

    // If user has their own API key, they're self-hosted
    if (user.apiKeyMode === 'self_hosted' && user.encryptedApiKey) {
      return SubscriptionTier.SELF_HOSTED;
    }

    // Return user's subscription tier
    return user.subscriptionTier as SubscriptionTier;
  } catch (error) {
    console.error('Failed to fetch user tier:', error);
    return SubscriptionTier.FREE; // Fallback to free on error
  }
}

/**
 * Synchronous version for backwards compatibility
 * @deprecated Use getUserTier() instead
 */
export function getUserTierSync(userId: string): SubscriptionTier {
  // For development: Always return PRO_MAX
  if (process.env.NODE_ENV === 'development') {
    return SubscriptionTier.PRO_MAX;
  }
  return SubscriptionTier.FREE;
}

/**
 * Get tier limits
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_LIMITS[tier];
}

/**
 * Check if a feature is available for a tier
 */
export function hasFeature(tier: SubscriptionTier, feature: keyof TierLimits): boolean {
  const limits = TIER_LIMITS[tier];
  const value = limits[feature];

  if (typeof value === 'boolean') {
    return value;
  }

  return true; // Non-boolean features are considered "available" (but may have limits)
}
