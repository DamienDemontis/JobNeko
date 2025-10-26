export interface FeatureLimit {
  feature: string;
  limit: number;
  period: 'daily' | 'weekly' | 'monthly' | 'lifetime';
  resetDate?: Date;
}

export interface TierFeatures {
  // Core Features
  jobTracking: boolean;
  basicAnalytics: boolean;
  resumeUpload: boolean;

  // AI Features
  aiJobAnalysis: FeatureLimit;
  salaryIntelligence: FeatureLimit;
  interviewPrep: FeatureLimit;
  networkAnalysis: FeatureLimit;
  companyIntelligence: FeatureLimit;

  // Advanced Features
  smartRecommendations: boolean;
  performanceAnalytics: boolean;
  jobDiscovery: FeatureLimit;
  customReports: boolean;

  // Premium Features
  realTimeNotifications: boolean;
  prioritySupport: boolean;
  customIntegrations: boolean;
  teamCollaboration: boolean;
  advancedExport: boolean;

  // Enterprise Features
  ssoIntegration: boolean;
  customBranding: boolean;
  dedicatedSupport: boolean;
  apiAccess: boolean;
  dataRetention: number; // days
}

export interface Tier {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: TierFeatures;
  popular: boolean;
  badge?: string;
  maxUsers: number;
}

export interface UserUsage {
  userId: string;
  tier: string;
  features: { [key: string]: number };
  resetDates: { [key: string]: Date };
  overage: { [key: string]: number };
}

export class TierSystem {
  private tiers: Map<string, Tier> = new Map();
  private userUsage: Map<string, UserUsage> = new Map();

  constructor() {
    this.initializeTiers();
  }

  private initializeTiers() {
    const tiers: Tier[] = [
      {
        id: 'free',
        name: 'Free',
        description: 'Perfect for getting started with basic job tracking',
        price: { monthly: 0, yearly: 0 },
        popular: false,
        maxUsers: 1,
        features: {
          // Core Features
          jobTracking: true,
          basicAnalytics: true,
          resumeUpload: true,

          // AI Features (Limited)
          aiJobAnalysis: { feature: 'aiJobAnalysis', limit: 5, period: 'monthly' },
          salaryIntelligence: { feature: 'salaryIntelligence', limit: 3, period: 'monthly' },
          interviewPrep: { feature: 'interviewPrep', limit: 2, period: 'monthly' },
          networkAnalysis: { feature: 'networkAnalysis', limit: 1, period: 'monthly' },
          companyIntelligence: { feature: 'companyIntelligence', limit: 2, period: 'monthly' },

          // Advanced Features
          smartRecommendations: false,
          performanceAnalytics: false,
          jobDiscovery: { feature: 'jobDiscovery', limit: 0, period: 'monthly' },
          customReports: false,

          // Premium Features
          realTimeNotifications: false,
          prioritySupport: false,
          customIntegrations: false,
          teamCollaboration: false,
          advancedExport: false,

          // Enterprise Features
          ssoIntegration: false,
          customBranding: false,
          dedicatedSupport: false,
          apiAccess: false,
          dataRetention: 30
        }
      },
      {
        id: 'pro',
        name: 'Pro',
        description: 'Advanced features for serious job seekers',
        price: { monthly: 29, yearly: 290 },
        popular: true,
        badge: 'Most Popular',
        maxUsers: 1,
        features: {
          // Core Features
          jobTracking: true,
          basicAnalytics: true,
          resumeUpload: true,

          // AI Features (Generous)
          aiJobAnalysis: { feature: 'aiJobAnalysis', limit: 50, period: 'monthly' },
          salaryIntelligence: { feature: 'salaryIntelligence', limit: 25, period: 'monthly' },
          interviewPrep: { feature: 'interviewPrep', limit: 15, period: 'monthly' },
          networkAnalysis: { feature: 'networkAnalysis', limit: 10, period: 'monthly' },
          companyIntelligence: { feature: 'companyIntelligence', limit: 20, period: 'monthly' },

          // Advanced Features
          smartRecommendations: true,
          performanceAnalytics: true,
          jobDiscovery: { feature: 'jobDiscovery', limit: 100, period: 'monthly' },
          customReports: true,

          // Premium Features
          realTimeNotifications: true,
          prioritySupport: true,
          customIntegrations: false,
          teamCollaboration: false,
          advancedExport: true,

          // Enterprise Features
          ssoIntegration: false,
          customBranding: false,
          dedicatedSupport: false,
          apiAccess: false,
          dataRetention: 365
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Complete solution for teams and organizations',
        price: { monthly: 99, yearly: 990 },
        popular: false,
        badge: 'Best Value',
        maxUsers: 10,
        features: {
          // Core Features
          jobTracking: true,
          basicAnalytics: true,
          resumeUpload: true,

          // AI Features (Unlimited)
          aiJobAnalysis: { feature: 'aiJobAnalysis', limit: -1, period: 'monthly' },
          salaryIntelligence: { feature: 'salaryIntelligence', limit: -1, period: 'monthly' },
          interviewPrep: { feature: 'interviewPrep', limit: -1, period: 'monthly' },
          networkAnalysis: { feature: 'networkAnalysis', limit: -1, period: 'monthly' },
          companyIntelligence: { feature: 'companyIntelligence', limit: -1, period: 'monthly' },

          // Advanced Features
          smartRecommendations: true,
          performanceAnalytics: true,
          jobDiscovery: { feature: 'jobDiscovery', limit: -1, period: 'monthly' },
          customReports: true,

          // Premium Features
          realTimeNotifications: true,
          prioritySupport: true,
          customIntegrations: true,
          teamCollaboration: true,
          advancedExport: true,

          // Enterprise Features
          ssoIntegration: true,
          customBranding: true,
          dedicatedSupport: true,
          apiAccess: true,
          dataRetention: -1 // Unlimited
        }
      }
    ];

    tiers.forEach(tier => this.tiers.set(tier.id, tier));
  }

  getTiers(): Tier[] {
    return Array.from(this.tiers.values());
  }

  getTier(tierId: string): Tier | null {
    return this.tiers.get(tierId) || null;
  }

  getUserTier(userId: string): string {
    // In production, fetch from database
    // For now, return default tier
    return 'free';
  }

  canUseFeature(userId: string, feature: string): boolean {
    const userTier = this.getUserTier(userId);
    const tier = this.getTier(userTier);

    if (!tier) return false;

    const featureConfig = this.getFeatureConfig(tier.features, feature);

    if (!featureConfig) return false;

    // Check if feature is boolean
    if (typeof featureConfig === 'boolean') {
      return featureConfig;
    }

    // Check if feature has limits
    if (typeof featureConfig === 'object' && 'limit' in featureConfig) {
      const limit = featureConfig.limit;

      // Unlimited access
      if (limit === -1) return true;

      // No access
      if (limit === 0) return false;

      // Check usage against limit
      const usage = this.getFeatureUsage(userId, feature);
      return usage < limit;
    }

    return false;
  }

  useFeature(userId: string, feature: string): boolean {
    if (!this.canUseFeature(userId, feature)) {
      return false;
    }

    const usage = this.getUserUsage(userId);
    const currentUsage = usage.features[feature] || 0;
    usage.features[feature] = currentUsage + 1;

    this.updateUserUsage(userId, usage);
    return true;
  }

  getFeatureUsage(userId: string, feature: string): number {
    const usage = this.getUserUsage(userId);
    return usage.features[feature] || 0;
  }

  getRemainingUsage(userId: string, feature: string): number {
    const userTier = this.getUserTier(userId);
    const tier = this.getTier(userTier);

    if (!tier) return 0;

    const featureConfig = this.getFeatureConfig(tier.features, feature);

    if (typeof featureConfig === 'object' && 'limit' in featureConfig) {
      const limit = featureConfig.limit;

      if (limit === -1) return -1; // Unlimited
      if (limit === 0) return 0;   // No access

      const usage = this.getFeatureUsage(userId, feature);
      return Math.max(0, limit - usage);
    }

    return 0;
  }

  getUsageLimits(userId: string): { [feature: string]: { used: number; limit: number; remaining: number } } {
    const userTier = this.getUserTier(userId);
    const tier = this.getTier(userTier);

    if (!tier) return {};

    const limits: { [feature: string]: { used: number; limit: number; remaining: number } } = {};

    Object.entries(tier.features).forEach(([featureName, config]) => {
      if (typeof config === 'object' && 'limit' in config) {
        const used = this.getFeatureUsage(userId, featureName);
        const limit = config.limit;
        const remaining = limit === -1 ? -1 : Math.max(0, limit - used);

        limits[featureName] = { used, limit, remaining };
      }
    });

    return limits;
  }

  resetUsage(userId: string, feature?: string): void {
    const usage = this.getUserUsage(userId);

    if (feature) {
      usage.features[feature] = 0;
      usage.resetDates[feature] = new Date();
    } else {
      usage.features = {};
      usage.resetDates = {};
    }

    this.updateUserUsage(userId, usage);
  }

  upgradeUser(userId: string, newTier: string): boolean {
    const tier = this.getTier(newTier);
    if (!tier) return false;

    // In production, update database
    // For now, update in-memory
    const usage = this.getUserUsage(userId);
    usage.tier = newTier;
    this.updateUserUsage(userId, usage);

    return true;
  }

  calculateOverage(userId: string): { [feature: string]: number } {
    const userTier = this.getUserTier(userId);
    const tier = this.getTier(userTier);

    if (!tier) return {};

    const overage: { [feature: string]: number } = {};

    Object.entries(tier.features).forEach(([featureName, config]) => {
      if (typeof config === 'object' && 'limit' in config && config.limit > 0) {
        const used = this.getFeatureUsage(userId, featureName);
        const limit = config.limit;

        if (used > limit) {
          overage[featureName] = used - limit;
        }
      }
    });

    return overage;
  }

  getPricingComparison(): any[] {
    const tiers = this.getTiers();

    return tiers.map(tier => ({
      tier: tier.name,
      monthlyPrice: tier.price.monthly,
      yearlyPrice: tier.price.yearly,
      features: this.getFeatureSummary(tier.features),
      popular: tier.popular,
      badge: tier.badge
    }));
  }

  private getUserUsage(userId: string): UserUsage {
    if (!this.userUsage.has(userId)) {
      this.userUsage.set(userId, {
        userId,
        tier: this.getUserTier(userId),
        features: {},
        resetDates: {},
        overage: {}
      });
    }

    return this.userUsage.get(userId)!;
  }

  private updateUserUsage(userId: string, usage: UserUsage): void {
    this.userUsage.set(userId, usage);
    // In production, persist to database
  }

  private getFeatureConfig(features: TierFeatures, feature: string): any {
    return (features as any)[feature];
  }

  private getFeatureSummary(features: TierFeatures): string[] {
    const summary: string[] = [];

    // Core features
    if (features.jobTracking) summary.push('Job Tracking');
    if (features.basicAnalytics) summary.push('Basic Analytics');
    if (features.resumeUpload) summary.push('Resume Upload');

    // AI features with limits
    if (features.aiJobAnalysis.limit > 0) {
      summary.push(`AI Job Analysis (${features.aiJobAnalysis.limit === -1 ? 'Unlimited' : features.aiJobAnalysis.limit}/month)`);
    }

    if (features.salaryIntelligence.limit > 0) {
      summary.push(`Salary Intelligence (${features.salaryIntelligence.limit === -1 ? 'Unlimited' : features.salaryIntelligence.limit}/month)`);
    }

    // Advanced features
    if (features.smartRecommendations) summary.push('Smart Recommendations');
    if (features.performanceAnalytics) summary.push('Performance Analytics');

    // Premium features
    if (features.prioritySupport) summary.push('Priority Support');
    if (features.customIntegrations) summary.push('Custom Integrations');
    if (features.teamCollaboration) summary.push('Team Collaboration');

    return summary;
  }
}

// Singleton instance
export const tierSystem = new TierSystem();