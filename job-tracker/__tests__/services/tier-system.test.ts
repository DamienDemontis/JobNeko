import { tierSystem, TierSystem } from '@/lib/services/tier-system';

describe('TierSystem', () => {
  let testTierSystem: TierSystem;

  beforeEach(() => {
    testTierSystem = new TierSystem();
  });

  describe('Tier Management', () => {
    test('should return all available tiers', () => {
      const tiers = testTierSystem.getTiers();
      expect(tiers).toHaveLength(3);
      expect(tiers.map(t => t.id)).toEqual(['free', 'pro', 'enterprise']);
    });

    test('should get specific tier by ID', () => {
      const proTier = testTierSystem.getTier('pro');
      expect(proTier).toBeDefined();
      expect(proTier?.name).toBe('Pro');
      expect(proTier?.price.monthly).toBe(29);
    });

    test('should return null for invalid tier ID', () => {
      const invalidTier = testTierSystem.getTier('invalid');
      expect(invalidTier).toBeNull();
    });
  });

  describe('Feature Access Control', () => {
    test('should allow free tier users to use basic features within limits', () => {
      const userId = 'test-user-1';

      // Mock user tier as free
      jest.spyOn(testTierSystem, 'getUserTier').mockReturnValue('free');

      // Should allow basic features
      expect(testTierSystem.canUseFeature(userId, 'jobTracking')).toBe(true);
      expect(testTierSystem.canUseFeature(userId, 'basicAnalytics')).toBe(true);
      expect(testTierSystem.canUseFeature(userId, 'resumeUpload')).toBe(true);

      // Should restrict premium features
      expect(testTierSystem.canUseFeature(userId, 'smartRecommendations')).toBe(false);
      expect(testTierSystem.canUseFeature(userId, 'performanceAnalytics')).toBe(false);
    });

    test('should enforce usage limits for free tier', () => {
      const userId = 'test-user-2';

      jest.spyOn(testTierSystem, 'getUserTier').mockReturnValue('free');

      // Use AI analysis feature up to limit (5 times for free tier)
      for (let i = 0; i < 5; i++) {
        expect(testTierSystem.useFeature(userId, 'aiJobAnalysis')).toBe(true);
      }

      // 6th usage should fail
      expect(testTierSystem.useFeature(userId, 'aiJobAnalysis')).toBe(false);
      expect(testTierSystem.canUseFeature(userId, 'aiJobAnalysis')).toBe(false);
    });

    test('should allow unlimited access for enterprise tier', () => {
      const userId = 'test-user-3';

      jest.spyOn(testTierSystem, 'getUserTier').mockReturnValue('enterprise');

      // Should allow all features
      expect(testTierSystem.canUseFeature(userId, 'smartRecommendations')).toBe(true);
      expect(testTierSystem.canUseFeature(userId, 'ssoIntegration')).toBe(true);
      expect(testTierSystem.canUseFeature(userId, 'apiAccess')).toBe(true);

      // Should allow unlimited usage
      for (let i = 0; i < 100; i++) {
        expect(testTierSystem.useFeature(userId, 'aiJobAnalysis')).toBe(true);
      }
    });
  });

  describe('Usage Tracking', () => {
    test('should track feature usage correctly', () => {
      const userId = 'test-user-4';

      jest.spyOn(testTierSystem, 'getUserTier').mockReturnValue('pro');

      // Use feature multiple times
      testTierSystem.useFeature(userId, 'aiJobAnalysis');
      testTierSystem.useFeature(userId, 'aiJobAnalysis');
      testTierSystem.useFeature(userId, 'salaryIntelligence');

      expect(testTierSystem.getFeatureUsage(userId, 'aiJobAnalysis')).toBe(2);
      expect(testTierSystem.getFeatureUsage(userId, 'salaryIntelligence')).toBe(1);
      expect(testTierSystem.getFeatureUsage(userId, 'networkAnalysis')).toBe(0);
    });

    test('should calculate remaining usage correctly', () => {
      const userId = 'test-user-5';

      jest.spyOn(testTierSystem, 'getUserTier').mockReturnValue('free');

      // Use 3 out of 5 allowed aiJobAnalysis
      testTierSystem.useFeature(userId, 'aiJobAnalysis');
      testTierSystem.useFeature(userId, 'aiJobAnalysis');
      testTierSystem.useFeature(userId, 'aiJobAnalysis');

      expect(testTierSystem.getRemainingUsage(userId, 'aiJobAnalysis')).toBe(2);
    });

    test('should return usage limits for user', () => {
      const userId = 'test-user-6';

      jest.spyOn(testTierSystem, 'getUserTier').mockReturnValue('pro');

      const limits = testTierSystem.getUsageLimits(userId);

      expect(limits.aiJobAnalysis).toEqual({
        used: 0,
        limit: 50,
        remaining: 50
      });

      expect(limits.salaryIntelligence).toEqual({
        used: 0,
        limit: 25,
        remaining: 25
      });
    });
  });

  describe('Tier Upgrades', () => {
    test('should successfully upgrade user tier', () => {
      const userId = 'test-user-7';

      expect(testTierSystem.upgradeUser(userId, 'pro')).toBe(true);
      expect(testTierSystem.upgradeUser(userId, 'enterprise')).toBe(true);
    });

    test('should fail to upgrade to invalid tier', () => {
      const userId = 'test-user-8';

      expect(testTierSystem.upgradeUser(userId, 'invalid-tier')).toBe(false);
    });
  });

  describe('Overage Calculation', () => {
    test('should calculate overage when limits exceeded', () => {
      const userId = 'test-user-9';

      jest.spyOn(testTierSystem, 'getUserTier').mockReturnValue('free');

      // Manually set usage to exceed the limit (5 for free tier aiJobAnalysis)
      // Since useFeature won't allow usage beyond limits, we need to set usage directly
      const usage = testTierSystem.getUserUsage(userId);
      usage.features['aiJobAnalysis'] = 8; // Set to 8 to exceed limit of 5
      (testTierSystem as any).updateUserUsage(userId, usage);

      const overage = testTierSystem.calculateOverage(userId);
      expect(overage.aiJobAnalysis).toBe(3); // 8 used - 5 limit = 3 overage
    });

    test('should return empty overage for users within limits', () => {
      const userId = 'test-user-10';

      jest.spyOn(testTierSystem, 'getUserTier').mockReturnValue('pro');

      // Use within limits
      testTierSystem.useFeature(userId, 'aiJobAnalysis');
      testTierSystem.useFeature(userId, 'aiJobAnalysis');

      const overage = testTierSystem.calculateOverage(userId);
      expect(Object.keys(overage)).toHaveLength(0);
    });
  });

  describe('Usage Reset', () => {
    test('should reset usage for specific feature', () => {
      const userId = 'test-user-11';

      jest.spyOn(testTierSystem, 'getUserTier').mockReturnValue('free');

      // Use feature
      testTierSystem.useFeature(userId, 'aiJobAnalysis');
      expect(testTierSystem.getFeatureUsage(userId, 'aiJobAnalysis')).toBe(1);

      // Reset usage
      testTierSystem.resetUsage(userId, 'aiJobAnalysis');
      expect(testTierSystem.getFeatureUsage(userId, 'aiJobAnalysis')).toBe(0);
    });

    test('should reset all usage when no feature specified', () => {
      const userId = 'test-user-12';

      jest.spyOn(testTierSystem, 'getUserTier').mockReturnValue('free');

      // Use multiple features
      testTierSystem.useFeature(userId, 'aiJobAnalysis');
      testTierSystem.useFeature(userId, 'salaryIntelligence');

      // Reset all usage
      testTierSystem.resetUsage(userId);

      expect(testTierSystem.getFeatureUsage(userId, 'aiJobAnalysis')).toBe(0);
      expect(testTierSystem.getFeatureUsage(userId, 'salaryIntelligence')).toBe(0);
    });
  });

  describe('Pricing Comparison', () => {
    test('should return pricing comparison data', () => {
      const comparison = testTierSystem.getPricingComparison();

      expect(comparison).toHaveLength(3);
      expect(comparison[0].tier).toBe('Free');
      expect(comparison[1].tier).toBe('Pro');
      expect(comparison[2].tier).toBe('Enterprise');

      expect(comparison[1].monthlyPrice).toBe(29);
      expect(comparison[1].yearlyPrice).toBe(290);
      expect(comparison[1].popular).toBe(true);
    });
  });
});