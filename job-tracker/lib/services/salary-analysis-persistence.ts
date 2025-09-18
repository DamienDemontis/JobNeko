import { prisma } from '@/lib/prisma';

interface SalaryAnalysisCacheData {
  jobId: string;
  userId: string;
  jobTitle: string;
  company: string;
  location?: string;
  jobSalary?: string;
  analysisData: any;
  dataSources?: any[];
  confidence: number;
  userProfileHash: string;
}

export class SalaryAnalysisPersistence {
  private static instance: SalaryAnalysisPersistence;
  private readonly CACHE_DURATION_DAYS = 7; // Cache valid for 7 days
  private readonly VERSION = '1.0';

  private constructor() {}

  static getInstance(): SalaryAnalysisPersistence {
    if (!SalaryAnalysisPersistence.instance) {
      SalaryAnalysisPersistence.instance = new SalaryAnalysisPersistence();
    }
    return SalaryAnalysisPersistence.instance;
  }

  /**
   * Get cached salary analysis if valid
   */
  async getCachedAnalysis(
    jobId: string,
    userId: string,
    userProfileHash: string
  ): Promise<any | null> {
    try {
      const cached = await prisma.salaryAnalysisCache.findUnique({
        where: {
          jobId_userId_userProfileHash: {
            jobId,
            userId,
            userProfileHash
          }
        }
      });

      if (!cached) {
        return null;
      }

      // Check if cache has expired
      if (new Date() > cached.expiresAt) {
        // Delete expired cache
        await this.deleteCachedAnalysis(jobId, userId, userProfileHash);
        return null;
      }

      // Update access metadata
      await prisma.salaryAnalysisCache.update({
        where: { id: cached.id },
        data: {
          lastAccessedAt: new Date(),
          accessCount: cached.accessCount + 1
        }
      });

      // Parse and return the analysis data
      const analysisData = JSON.parse(cached.analysisData);
      const dataSources = cached.dataSources ? JSON.parse(cached.dataSources) : null;

      return {
        ...analysisData,
        dataSources,
        fromCache: true,
        cachedAt: cached.createdAt,
        cacheExpiresAt: cached.expiresAt
      };
    } catch (error) {
      console.error('Failed to retrieve cached analysis:', error);
      return null;
    }
  }

  /**
   * Save salary analysis to cache
   */
  async saveAnalysis(data: SalaryAnalysisCacheData): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.CACHE_DURATION_DAYS);

      await prisma.salaryAnalysisCache.upsert({
        where: {
          jobId_userId_userProfileHash: {
            jobId: data.jobId,
            userId: data.userId,
            userProfileHash: data.userProfileHash
          }
        },
        update: {
          jobTitle: data.jobTitle,
          company: data.company,
          location: data.location,
          jobSalary: data.jobSalary,
          analysisData: JSON.stringify(data.analysisData),
          dataSources: data.dataSources ? JSON.stringify(data.dataSources) : null,
          confidence: data.confidence,
          version: this.VERSION,
          updatedAt: new Date(),
          expiresAt,
          lastAccessedAt: new Date(),
          accessCount: 1
        },
        create: {
          jobId: data.jobId,
          userId: data.userId,
          jobTitle: data.jobTitle,
          company: data.company,
          location: data.location,
          jobSalary: data.jobSalary,
          userProfileHash: data.userProfileHash,
          analysisData: JSON.stringify(data.analysisData),
          dataSources: data.dataSources ? JSON.stringify(data.dataSources) : null,
          confidence: data.confidence,
          version: this.VERSION,
          expiresAt
        }
      });
    } catch (error) {
      console.error('Failed to save analysis to cache:', error);
      // Don't throw - caching failure shouldn't break the flow
    }
  }

  /**
   * Delete cached analysis
   */
  async deleteCachedAnalysis(
    jobId: string,
    userId: string,
    userProfileHash: string
  ): Promise<void> {
    try {
      await prisma.salaryAnalysisCache.delete({
        where: {
          jobId_userId_userProfileHash: {
            jobId,
            userId,
            userProfileHash
          }
        }
      });
    } catch (error) {
      // Ignore deletion errors (e.g., if already deleted)
      console.log('Cache deletion failed or item not found:', error);
    }
  }

  /**
   * Clear all expired cache entries
   */
  async clearExpiredCache(): Promise<number> {
    try {
      const result = await prisma.salaryAnalysisCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });
      return result.count;
    } catch (error) {
      console.error('Failed to clear expired cache:', error);
      return 0;
    }
  }

  /**
   * Clear all cache for a specific user
   */
  async clearUserCache(userId: string): Promise<number> {
    try {
      const result = await prisma.salaryAnalysisCache.deleteMany({
        where: { userId }
      });
      return result.count;
    } catch (error) {
      console.error('Failed to clear user cache:', error);
      return 0;
    }
  }

  /**
   * Clear cache for a specific job
   */
  async clearJobCache(jobId: string): Promise<number> {
    try {
      const result = await prisma.salaryAnalysisCache.deleteMany({
        where: { jobId }
      });
      return result.count;
    } catch (error) {
      console.error('Failed to clear job cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics for a user
   */
  async getUserCacheStats(userId: string): Promise<{
    totalCached: number;
    totalSize: number;
    oldestCache: Date | null;
    newestCache: Date | null;
    mostAccessedJob: string | null;
  }> {
    try {
      const caches = await prisma.salaryAnalysisCache.findMany({
        where: { userId },
        select: {
          analysisData: true,
          createdAt: true,
          jobTitle: true,
          company: true,
          accessCount: true
        },
        orderBy: { createdAt: 'asc' }
      });

      if (caches.length === 0) {
        return {
          totalCached: 0,
          totalSize: 0,
          oldestCache: null,
          newestCache: null,
          mostAccessedJob: null
        };
      }

      const totalSize = caches.reduce((sum, cache) =>
        sum + Buffer.byteLength(cache.analysisData, 'utf8'), 0
      );

      const mostAccessed = caches.reduce((max, cache) =>
        cache.accessCount > max.accessCount ? cache : max
      );

      return {
        totalCached: caches.length,
        totalSize,
        oldestCache: caches[0].createdAt,
        newestCache: caches[caches.length - 1].createdAt,
        mostAccessedJob: `${mostAccessed.jobTitle} at ${mostAccessed.company}`
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalCached: 0,
        totalSize: 0,
        oldestCache: null,
        newestCache: null,
        mostAccessedJob: null
      };
    }
  }
}

// Export singleton instance
export const salaryAnalysisPersistence = SalaryAnalysisPersistence.getInstance();