/**
 * Intelligent Salary Analysis Cache Service
 * Provides smart caching with automatic invalidation and versioning
 */

import { PersonalizedSalaryAnalysis } from './enhanced-salary-rag';

export interface CachedSalaryAnalysis {
  id: string;
  jobId: string;
  userId: string;
  analysis: PersonalizedSalaryAnalysis;
  createdAt: string;
  expiresAt: string;
  cacheKey: string;
  version: string;
  inputHash: string; // Hash of job details + user profile for invalidation
}

export interface CacheStats {
  totalCached: number;
  hitRate: number;
  avgAnalysisTime: number;
  lastCleanup: string;
}

export class SalaryAnalysisCacheService {
  private readonly CACHE_DURATION_HOURS = 24; // 24 hours default
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CLEANUP_INTERVAL_HOURS = 6;

  /**
   * Generate cache key for salary analysis
   */
  generateCacheKey(jobId: string, userId: string): string {
    return `salary_analysis:${userId}:${jobId}`;
  }

  /**
   * Generate input hash for cache invalidation
   * Changes when job details or user profile changes significantly
   */
  generateInputHash(jobData: {
    title: string;
    company: string;
    location: string;
    description?: string;
    requirements?: string;
    salary?: string;
  }, userProfileHash: string): string {
    const input = JSON.stringify({
      ...jobData,
      userProfileHash,
      timestamp: Math.floor(Date.now() / (1000 * 60 * 60)) // Hour precision
    });

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get cached analysis if valid
   */
  async getCachedAnalysis(
    jobId: string,
    userId: string,
    currentInputHash: string
  ): Promise<CachedSalaryAnalysis | null> {
    if (typeof window === 'undefined') return null; // Server-side

    try {
      const cacheKey = this.generateCacheKey(jobId, userId);
      const cached = localStorage.getItem(cacheKey);

      if (!cached) return null;

      const cachedData: CachedSalaryAnalysis = JSON.parse(cached);

      // Check expiration
      if (new Date(cachedData.expiresAt) < new Date()) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      // Check if input has changed (job details or user profile)
      if (cachedData.inputHash !== currentInputHash) {
        console.log('🔄 Cache invalidated due to changed job/profile data');
        localStorage.removeItem(cacheKey);
        return null;
      }

      console.log('✅ Salary analysis cache hit for job:', jobId);
      this.updateCacheStats('hit');
      return cachedData;

    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  /**
   * Cache salary analysis
   */
  async cacheAnalysis(
    jobId: string,
    userId: string,
    analysis: PersonalizedSalaryAnalysis,
    inputHash: string,
    customDurationHours?: number
  ): Promise<void> {
    if (typeof window === 'undefined') return; // Server-side

    try {
      const cacheKey = this.generateCacheKey(jobId, userId);
      const durationHours = customDurationHours || this.CACHE_DURATION_HOURS;
      const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

      const cachedData: CachedSalaryAnalysis = {
        id: `cache_${Date.now()}`,
        jobId,
        userId,
        analysis,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        cacheKey,
        version: analysis.metadata.version,
        inputHash
      };

      localStorage.setItem(cacheKey, JSON.stringify(cachedData));

      console.log(`💾 Cached salary analysis for job ${jobId} (expires: ${expiresAt.toLocaleString()})`);
      this.updateCacheStats('miss');

      // Schedule cleanup if needed
      this.scheduleCleanup();

    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  /**
   * Invalidate cache for specific job
   */
  async invalidateJobCache(jobId: string, userId: string): Promise<void> {
    if (typeof window === 'undefined') return;

    const cacheKey = this.generateCacheKey(jobId, userId);
    localStorage.removeItem(cacheKey);
    console.log('🗑️ Invalidated cache for job:', jobId);
  }

  /**
   * Invalidate all user's salary caches
   */
  async invalidateUserCache(userId: string): Promise<void> {
    if (typeof window === 'undefined') return;

    const keys = Object.keys(localStorage);
    const userCacheKeys = keys.filter(key => key.startsWith(`salary_analysis:${userId}:`));

    userCacheKeys.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ Invalidated ${userCacheKeys.length} cached analyses for user`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    if (typeof window === 'undefined') {
      return { totalCached: 0, hitRate: 0, avgAnalysisTime: 0, lastCleanup: '' };
    }

    const stats = localStorage.getItem('salary_cache_stats');
    if (!stats) {
      return { totalCached: 0, hitRate: 0, avgAnalysisTime: 0, lastCleanup: '' };
    }

    return JSON.parse(stats);
  }

  /**
   * Update cache statistics
   */
  private updateCacheStats(type: 'hit' | 'miss'): void {
    if (typeof window === 'undefined') return;

    const stats = this.getCacheStats();
    const total = stats.totalCached + 1;
    const hits = type === 'hit' ? (stats.hitRate * stats.totalCached + 1) : (stats.hitRate * stats.totalCached);

    const updatedStats: CacheStats = {
      totalCached: total,
      hitRate: hits / total,
      avgAnalysisTime: stats.avgAnalysisTime, // TODO: Track actual analysis times
      lastCleanup: stats.lastCleanup
    };

    localStorage.setItem('salary_cache_stats', JSON.stringify(updatedStats));
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredEntries(): Promise<number> {
    if (typeof window === 'undefined') return 0;

    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith('salary_analysis:'));
    let cleaned = 0;

    for (const key of cacheKeys) {
      try {
        const cached = localStorage.getItem(key);
        if (!cached) continue;

        const cachedData: CachedSalaryAnalysis = JSON.parse(cached);

        if (new Date(cachedData.expiresAt) < new Date()) {
          localStorage.removeItem(key);
          cleaned++;
        }
      } catch (error) {
        // Remove corrupted cache entries
        localStorage.removeItem(key);
        cleaned++;
      }
    }

    // Update cleanup timestamp
    const stats = this.getCacheStats();
    stats.lastCleanup = new Date().toISOString();
    localStorage.setItem('salary_cache_stats', JSON.stringify(stats));

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
    }

    return cleaned;
  }

  /**
   * Schedule automatic cleanup
   */
  private scheduleCleanup(): void {
    if (typeof window === 'undefined') return;

    const stats = this.getCacheStats();
    const lastCleanup = stats.lastCleanup ? new Date(stats.lastCleanup) : new Date(0);
    const nextCleanup = new Date(lastCleanup.getTime() + this.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000);

    if (new Date() > nextCleanup) {
      // Run cleanup asynchronously
      setTimeout(() => this.cleanupExpiredEntries(), 1000);
    }
  }

  /**
   * Get cache size information
   */
  getCacheInfo(): { count: number; sizeKB: number; oldestEntry: string } {
    if (typeof window === 'undefined') {
      return { count: 0, sizeKB: 0, oldestEntry: '' };
    }

    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith('salary_analysis:'));

    let totalSize = 0;
    let oldestDate = new Date();

    for (const key of cacheKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;
        try {
          const cached: CachedSalaryAnalysis = JSON.parse(value);
          const createdAt = new Date(cached.createdAt);
          if (createdAt < oldestDate) {
            oldestDate = createdAt;
          }
        } catch (error) {
          // Ignore corrupted entries
        }
      }
    }

    return {
      count: cacheKeys.length,
      sizeKB: Math.round(totalSize / 1024),
      oldestEntry: oldestDate.toISOString()
    };
  }
}

// Export singleton
export const salaryAnalysisCache = new SalaryAnalysisCacheService();