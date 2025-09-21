/**
 * Unified Cache Service
 * Fast, intelligent caching for all AI analytics with proper button state management
 */

import { prisma } from '@/lib/prisma';

export interface CacheConfig {
  type: string;
  ttlHours: number;
  preloadOnMount?: boolean;
  showGenerateButton?: 'auto' | 'always' | 'never';
}

export interface CacheResult<T = any> {
  data: T | null;
  cached: boolean;
  expired: boolean;
  loading: boolean;
  error: string | null;
  cacheKey: string;
  lastUpdated: Date | null;
}

export interface CacheState<T = any> {
  data: T | null;
  isLoading: boolean;
  isCached: boolean;
  isExpired: boolean;
  error: string | null;
  lastUpdated: Date | null;
  shouldShowGenerateButton: boolean;
}

class UnifiedCacheService {
  private static instance: UnifiedCacheService;
  private preloadQueue: Map<string, Promise<any>> = new Map();
  private cacheConfigs: Map<string, CacheConfig> = new Map();

  constructor() {
    // Register all AI component cache configurations
    this.registerCacheConfigs();
  }

  static getInstance(): UnifiedCacheService {
    if (!UnifiedCacheService.instance) {
      UnifiedCacheService.instance = new UnifiedCacheService();
    }
    return UnifiedCacheService.instance;
  }

  private registerCacheConfigs() {
    // Smart components with good caching
    this.cacheConfigs.set('interview_analysis', {
      type: 'interview_analysis',
      ttlHours: 24,
      preloadOnMount: true,
      showGenerateButton: 'auto'
    });

    this.cacheConfigs.set('salary_analysis', {
      type: 'salary_analysis',
      ttlHours: 48,
      preloadOnMount: true,
      showGenerateButton: 'auto'
    });

    this.cacheConfigs.set('requirements_analysis', {
      type: 'requirements_analysis',
      ttlHours: 24,
      preloadOnMount: true,
      showGenerateButton: 'auto'
    });

    this.cacheConfigs.set('resume_optimization', {
      type: 'resume_optimization',
      ttlHours: 12,
      preloadOnMount: true,
      showGenerateButton: 'auto'
    });

    this.cacheConfigs.set('timeline_analysis', {
      type: 'timeline_analysis',
      ttlHours: 12,
      preloadOnMount: true,
      showGenerateButton: 'auto'
    });

    this.cacheConfigs.set('communication_generation', {
      type: 'communication_generation',
      ttlHours: 2,
      preloadOnMount: false,
      showGenerateButton: 'auto'
    });

    this.cacheConfigs.set('smart_questions', {
      type: 'smart_questions',
      ttlHours: 24,
      preloadOnMount: true,
      showGenerateButton: 'auto'
    });

    this.cacheConfigs.set('company_intelligence', {
      type: 'company_intelligence',
      ttlHours: 72,
      preloadOnMount: true,
      showGenerateButton: 'auto'
    });

    this.cacheConfigs.set('culture_analysis', {
      type: 'culture_analysis',
      ttlHours: 72,
      preloadOnMount: true,
      showGenerateButton: 'auto'
    });

    this.cacheConfigs.set('competitive_analysis', {
      type: 'competitive_analysis',
      ttlHours: 48,
      preloadOnMount: true,
      showGenerateButton: 'auto'
    });

    this.cacheConfigs.set('network_analysis', {
      type: 'network_analysis',
      ttlHours: 24,
      preloadOnMount: true,
      showGenerateButton: 'auto'
    });

    this.cacheConfigs.set('insider_intelligence', {
      type: 'insider_intelligence',
      ttlHours: 72,
      preloadOnMount: true,
      showGenerateButton: 'auto'
    });

    this.cacheConfigs.set('outreach_generation', {
      type: 'outreach_generation',
      ttlHours: 12,
      preloadOnMount: false,
      showGenerateButton: 'auto'
    });
  }

  /**
   * Generate a consistent cache key for any analysis type
   */
  generateCacheKey(
    type: string,
    jobId: string,
    userId: string,
    additionalParams?: Record<string, any>
  ): string {
    const params = {
      type,
      jobId,
      userId,
      ...additionalParams
    };

    const sortedKeys = Object.keys(params).sort();
    const keyString = sortedKeys
      .map(key => `${key}:${params[key as keyof typeof params]}`)
      .join('|');

    return Buffer.from(keyString).toString('base64');
  }

  /**
   * Fast cache check - checks memory first, then database
   */
  async checkCache<T = any>(
    type: string,
    jobId: string,
    userId: string,
    additionalParams?: Record<string, any>
  ): Promise<CacheResult<T>> {
    const cacheKey = this.generateCacheKey(type, jobId, userId, additionalParams);
    const config = this.cacheConfigs.get(type);

    try {
      // Check if we're already loading this
      if (this.preloadQueue.has(cacheKey)) {
        return {
          data: null,
          cached: false,
          expired: false,
          loading: true,
          error: null,
          cacheKey,
          lastUpdated: null
        };
      }

      // Check database cache
      const cached = await prisma.jobAnalysisCache.findFirst({
        where: {
          jobId,
          userId,
          analysisType: type,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (cached) {
        const data = JSON.parse(cached.analysisData);
        const expired = new Date() > cached.expiresAt;

        return {
          data,
          cached: true,
          expired,
          loading: false,
          error: null,
          cacheKey,
          lastUpdated: cached.createdAt
        };
      }

      // Check for expired cache (can still be useful)
      const expiredCache = await prisma.jobAnalysisCache.findFirst({
        where: {
          jobId,
          userId,
          analysisType: type
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (expiredCache) {
        const data = JSON.parse(expiredCache.analysisData);

        return {
          data,
          cached: true,
          expired: true,
          loading: false,
          error: null,
          cacheKey,
          lastUpdated: expiredCache.createdAt
        };
      }

      return {
        data: null,
        cached: false,
        expired: false,
        loading: false,
        error: null,
        cacheKey,
        lastUpdated: null
      };

    } catch (error) {
      console.error(`Cache check failed for ${type}:`, error);
      return {
        data: null,
        cached: false,
        expired: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Cache check failed',
        cacheKey,
        lastUpdated: null
      };
    }
  }

  /**
   * Save analysis to cache
   */
  async saveToCache<T = any>(
    type: string,
    jobId: string,
    userId: string,
    data: T,
    additionalParams?: Record<string, any>
  ): Promise<void> {
    const config = this.cacheConfigs.get(type);
    const ttlHours = config?.ttlHours || 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    try {
      // Delete old cache entries for this analysis
      await prisma.jobAnalysisCache.deleteMany({
        where: {
          jobId,
          userId,
          analysisType: type
        }
      });

      // Save new cache entry
      await prisma.jobAnalysisCache.create({
        data: {
          jobId,
          userId,
          analysisType: type,
          analysisData: JSON.stringify(data),
          expiresAt
        }
      });

      console.log(`✅ Cached ${type} analysis for job ${jobId}`);
    } catch (error) {
      console.error(`Failed to save ${type} to cache:`, error);
    }
  }

  /**
   * Preload cache for multiple analysis types
   * Called when a job page is loaded to prepare all caches
   */
  async preloadCaches(
    jobId: string,
    userId: string,
    token: string,
    types?: string[]
  ): Promise<Map<string, CacheResult>> {
    const results = new Map<string, CacheResult>();
    const typesToPreload = types || Array.from(this.cacheConfigs.keys())
      .filter(type => this.cacheConfigs.get(type)?.preloadOnMount);

    // Check all caches in parallel
    const cacheChecks = typesToPreload.map(async (type) => {
      const result = await this.checkCache(type, jobId, userId);
      results.set(type, result);
      return { type, result };
    });

    await Promise.all(cacheChecks);

    // Preload expired or missing caches in background
    for (const [type, result] of results) {
      if (!result.cached || result.expired) {
        this.preloadInBackground(type, jobId, userId, token);
      }
    }

    return results;
  }

  /**
   * Preload cache in background without blocking UI
   */
  private async preloadInBackground(
    type: string,
    jobId: string,
    userId: string,
    token: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(type, jobId, userId);

    // Avoid duplicate preloads
    if (this.preloadQueue.has(cacheKey)) {
      return;
    }

    const preloadPromise = this.performPreload(type, jobId, userId, token);
    this.preloadQueue.set(cacheKey, preloadPromise);

    try {
      await preloadPromise;
    } finally {
      this.preloadQueue.delete(cacheKey);
    }
  }

  private async performPreload(
    type: string,
    jobId: string,
    userId: string,
    token: string
  ): Promise<void> {
    try {
      console.log(`🔄 Background preloading ${type} for job ${jobId}`);

      const response = await fetch(`/api/ai-analysis/${type}/${jobId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        const result = await response.json();
        await this.saveToCache(type, jobId, userId, result.analysis);
        console.log(`✅ Background preload complete for ${type}`);
      }
    } catch (error) {
      console.error(`Background preload failed for ${type}:`, error);
    }
  }

  /**
   * Determine if generate button should be shown
   */
  shouldShowGenerateButton(
    config: CacheConfig | undefined,
    cacheResult: CacheResult
  ): boolean {
    if (!config) return true;

    switch (config.showGenerateButton) {
      case 'always':
        return true;
      case 'never':
        return false;
      case 'auto':
      default:
        // Show button if:
        // 1. No cached data
        // 2. Cache is expired
        // 3. There was an error
        return !cacheResult.cached ||
               cacheResult.expired ||
               cacheResult.error !== null;
    }
  }

  /**
   * Get initial cache state for a component
   */
  async getInitialState<T = any>(
    type: string,
    jobId: string,
    userId: string,
    additionalParams?: Record<string, any>
  ): Promise<CacheState<T>> {
    const config = this.cacheConfigs.get(type);
    const cacheResult = await this.checkCache<T>(type, jobId, userId, additionalParams);

    return {
      data: cacheResult.data,
      isLoading: cacheResult.loading,
      isCached: cacheResult.cached && !cacheResult.expired,
      isExpired: cacheResult.expired,
      error: cacheResult.error,
      lastUpdated: cacheResult.lastUpdated,
      shouldShowGenerateButton: this.shouldShowGenerateButton(config, cacheResult)
    };
  }

  /**
   * Clear all caches for a specific job
   */
  async clearJobCaches(jobId: string, userId: string): Promise<void> {
    try {
      await prisma.jobAnalysisCache.deleteMany({
        where: {
          jobId,
          userId
        }
      });
      console.log(`🗑️ Cleared all caches for job ${jobId}`);
    } catch (error) {
      console.error('Failed to clear job caches:', error);
    }
  }

  /**
   * Clear expired caches (maintenance)
   */
  async clearExpiredCaches(): Promise<void> {
    try {
      const result = await prisma.jobAnalysisCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });
      console.log(`🗑️ Cleared ${result.count} expired cache entries`);
    } catch (error) {
      console.error('Failed to clear expired caches:', error);
    }
  }
}

export const unifiedCacheService = UnifiedCacheService.getInstance();