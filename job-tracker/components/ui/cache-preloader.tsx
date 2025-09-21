/**
 * Cache Preloader Component
 * Intelligently preloads AI analysis caches based on tab navigation
 */

'use client';

import { useEffect, useRef } from 'react';
import { unifiedCacheService } from '@/lib/services/unified-cache-service';

interface CachePreloaderProps {
  jobId: string;
  userId: string;
  token: string;
  activeTab: string;
  onCacheStatus?: (status: Map<string, boolean>) => void;
}

// Map tabs to their associated analysis types
const TAB_ANALYSIS_MAP: Record<string, string[]> = {
  overview: ['job_analysis', 'requirements_analysis'],
  salary: ['salary_analysis', 'market_intelligence'],
  application: ['resume_optimization', 'timeline_analysis', 'communication_generation'],
  interview: ['interview_analysis', 'interview_coaching', 'smart_questions'],
  network: ['network_analysis', 'insider_intelligence', 'outreach_generation'],
  timeline: ['timeline_analysis'],
  company: ['company_intelligence', 'culture_analysis', 'competitive_analysis'],
  notes: ['smart_notes']
};

// Priority order for preloading (most important first)
const PRELOAD_PRIORITY = [
  'job_analysis',
  'salary_analysis',
  'requirements_analysis',
  'company_intelligence',
  'timeline_analysis',
  'interview_analysis',
  'resume_optimization'
];

export function CachePreloader({
  jobId,
  userId,
  token,
  activeTab,
  onCacheStatus
}: CachePreloaderProps) {
  const preloadedRef = useRef<Set<string>>(new Set());
  const preloadingRef = useRef<Set<string>>(new Set());
  const cacheStatusRef = useRef<Map<string, boolean>>(new Map());

  // Preload caches for the active tab
  useEffect(() => {
    if (!jobId || !userId || !token) return;

    const preloadForTab = async () => {
      const analysisTypes = TAB_ANALYSIS_MAP[activeTab] || [];

      // Check what's already cached
      const cacheResults = await unifiedCacheService.preloadCaches(
        jobId,
        userId,
        token,
        analysisTypes
      );

      // Update cache status
      for (const [type, result] of cacheResults) {
        const hasCache = result.cached && !result.expired;
        cacheStatusRef.current.set(type, hasCache);

        if (hasCache) {
          preloadedRef.current.add(type);
        }
      }

      onCacheStatus?.(new Map(cacheStatusRef.current));
    };

    preloadForTab();
  }, [activeTab, jobId, userId, token]);

  // Background preload other tabs based on priority
  useEffect(() => {
    if (!jobId || !userId || !token) return;

    const backgroundPreload = async () => {
      // Wait a bit for the main content to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get all analysis types that haven't been preloaded yet
      const allTypes = new Set<string>();
      Object.values(TAB_ANALYSIS_MAP).forEach(types => {
        types.forEach(type => allTypes.add(type));
      });

      // Sort by priority
      const typesToPreload = Array.from(allTypes)
        .filter(type => !preloadedRef.current.has(type) && !preloadingRef.current.has(type))
        .sort((a, b) => {
          const aIndex = PRELOAD_PRIORITY.indexOf(a);
          const bIndex = PRELOAD_PRIORITY.indexOf(b);

          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;

          return aIndex - bIndex;
        });

      // Preload in batches to avoid overwhelming the server
      const BATCH_SIZE = 3;
      for (let i = 0; i < typesToPreload.length; i += BATCH_SIZE) {
        const batch = typesToPreload.slice(i, i + BATCH_SIZE);

        // Mark as preloading
        batch.forEach(type => preloadingRef.current.add(type));

        try {
          console.log(`🔄 Background preloading batch: ${batch.join(', ')}`);

          const results = await unifiedCacheService.preloadCaches(
            jobId,
            userId,
            token,
            batch
          );

          // Update status
          for (const [type, result] of results) {
            const hasCache = result.cached && !result.expired;
            cacheStatusRef.current.set(type, hasCache);

            if (hasCache) {
              preloadedRef.current.add(type);
            }
          }

          onCacheStatus?.(new Map(cacheStatusRef.current));

        } catch (error) {
          console.error('Background preload error:', error);
        } finally {
          // Remove from preloading set
          batch.forEach(type => preloadingRef.current.delete(type));
        }

        // Wait between batches
        if (i + BATCH_SIZE < typesToPreload.length) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      console.log('✅ Background preloading complete');
    };

    // Start background preloading
    const timeoutId = setTimeout(backgroundPreload, 1000);

    return () => clearTimeout(timeoutId);
  }, [jobId, userId, token]);

  // This component doesn't render anything
  return null;
}

/**
 * Hook to check if a specific analysis type is cached
 */
export function useCacheStatus(type: string, jobId: string, userId: string) {
  const checkCache = async () => {
    const result = await unifiedCacheService.checkCache(type, jobId, userId);
    return result.cached && !result.expired;
  };

  return checkCache;
}