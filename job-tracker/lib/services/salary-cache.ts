// Intelligent Caching System for Salary Analysis
// Prevents redundant AI API calls and improves performance

import crypto from 'crypto';

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  metadata: {
    jobId: string;
    userId: string;
    location: string;
    expenseProfile: string;
    version: string;
  };
}

interface CacheOptions {
  ttlHours?: number;
  storage?: 'memory' | 'localStorage' | 'hybrid';
}

class SalaryAnalysisCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly version = '1.0.0';
  private readonly maxMemoryCacheSize = 100;

  /**
   * Generate a unique cache key based on analysis parameters
   */
  generateCacheKey(params: {
    jobId: string;
    userId: string;
    location: string;
    expenseProfile?: Record<string, number>;
    workMode?: string;
    currency?: string;
  }): string {
    const normalizedParams = {
      jobId: params.jobId,
      userId: params.userId,
      location: params.location.toLowerCase().trim(),
      expenseProfile: params.expenseProfile ? this.hashObject(params.expenseProfile) : 'default',
      workMode: params.workMode || 'onsite',
      currency: params.currency || 'USD',
      version: this.version
    };

    const keyString = Object.entries(normalizedParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');

    return crypto.createHash('sha256').update(keyString).digest('hex').substring(0, 16);
  }

  /**
   * Hash an object for consistent cache key generation
   */
  private hashObject(obj: Record<string, any>): string {
    const sortedStr = JSON.stringify(obj, Object.keys(obj).sort());
    return crypto.createHash('md5').update(sortedStr).digest('hex').substring(0, 8);
  }

  /**
   * Store analysis results in cache
   */
  async set<T>(
    key: string,
    data: T,
    metadata: CacheEntry<T>['metadata'],
    options?: CacheOptions
  ): Promise<void> {
    const ttl = options?.ttlHours ? options.ttlHours * 60 * 60 * 1000 : this.defaultTTL;
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      metadata
    };

    // Memory cache
    this.memoryCache.set(key, entry);
    this.pruneMemoryCache();

    // LocalStorage cache (if available and requested)
    if (typeof window !== 'undefined' && options?.storage !== 'memory') {
      try {
        const storageKey = `salary_cache_${key}`;
        localStorage.setItem(storageKey, JSON.stringify(entry));
        this.pruneLocalStorage();
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
    }
  }

  /**
   * Retrieve cached analysis
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.data as T;
    }

    // Check localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const storageKey = `salary_cache_${key}`;
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
          const entry = JSON.parse(storedData) as CacheEntry<T>;
          if (!this.isExpired(entry)) {
            // Restore to memory cache
            this.memoryCache.set(key, entry);
            return entry.data;
          } else {
            // Clean up expired entry
            localStorage.removeItem(storageKey);
          }
        }
      } catch (e) {
        console.warn('Failed to read from localStorage:', e);
      }
    }

    return null;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.timestamp + entry.ttl;
  }

  /**
   * Invalidate cache entries
   */
  async invalidate(pattern?: {
    jobId?: string;
    userId?: string;
    location?: string;
  }): Promise<void> {
    if (!pattern) {
      // Clear all caches
      this.memoryCache.clear();
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('salary_cache_'));
        keys.forEach(k => localStorage.removeItem(k));
      }
      return;
    }

    // Selective invalidation
    const toDelete: string[] = [];

    this.memoryCache.forEach((entry, key) => {
      if (
        (pattern.jobId && entry.metadata.jobId === pattern.jobId) ||
        (pattern.userId && entry.metadata.userId === pattern.userId) ||
        (pattern.location && entry.metadata.location.includes(pattern.location.toLowerCase()))
      ) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => {
      this.memoryCache.delete(key);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`salary_cache_${key}`);
      }
    });
  }

  /**
   * Prune memory cache to prevent unbounded growth
   */
  private pruneMemoryCache(): void {
    if (this.memoryCache.size <= this.maxMemoryCacheSize) return;

    // Remove oldest entries
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    const toRemove = entries.slice(0, entries.length - this.maxMemoryCacheSize);
    toRemove.forEach(([key]) => this.memoryCache.delete(key));
  }

  /**
   * Prune localStorage to prevent quota exceeded errors
   */
  private pruneLocalStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheKeys = Object.keys(localStorage)
        .filter(k => k.startsWith('salary_cache_'));

      if (cacheKeys.length <= 50) return;

      // Parse and sort by timestamp
      const entries = cacheKeys
        .map(key => {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            return { key, timestamp: data.timestamp || 0 };
          } catch {
            return { key, timestamp: 0 };
          }
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest 25%
      const toRemove = entries.slice(0, Math.floor(entries.length * 0.25));
      toRemove.forEach(({ key }) => localStorage.removeItem(key));
    } catch (e) {
      console.warn('Failed to prune localStorage:', e);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memoryCacheSize: number;
    localStorageCacheSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const memoryEntries = Array.from(this.memoryCache.values());
    const timestamps = memoryEntries.map(e => e.timestamp);

    let localStorageSize = 0;
    if (typeof window !== 'undefined') {
      localStorageSize = Object.keys(localStorage)
        .filter(k => k.startsWith('salary_cache_')).length;
    }

    return {
      memoryCacheSize: this.memoryCache.size,
      localStorageCacheSize: localStorageSize,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null
    };
  }

  /**
   * Check if analysis should be refreshed based on staleness
   */
  shouldRefresh(entry: CacheEntry<any>, options?: {
    maxAgeHours?: number;
    forceRefresh?: boolean;
  }): boolean {
    if (options?.forceRefresh) return true;

    const maxAge = options?.maxAgeHours
      ? options.maxAgeHours * 60 * 60 * 1000
      : this.defaultTTL / 2; // Default to half TTL for freshness

    return Date.now() > entry.timestamp + maxAge;
  }
}

// Export singleton instance
export const salaryCache = new SalaryAnalysisCache();

// Export types
export type { CacheEntry, CacheOptions };