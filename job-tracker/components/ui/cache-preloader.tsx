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
  // DISABLED: Preloading causes unnecessary AI calls when viewing Overview tab
  // User explicitly requested to stop these background AI calls
  console.log('📵 CachePreloader disabled - no background AI calls will be made');

  // This component doesn't render anything and does no preloading
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