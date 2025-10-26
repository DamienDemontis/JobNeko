/**
 * React hook for unified cache management
 * Provides fast, intelligent caching with proper button state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { unifiedCacheService, CacheState } from '@/lib/services/unified-cache-service';
import { toast } from 'sonner';

export interface UseUnifiedCacheOptions {
  type: string;
  jobId: string;
  userId: string;
  token: string;
  autoLoad?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  additionalParams?: Record<string, any>;
  generateFunction?: () => Promise<any>;
}

export interface UseUnifiedCacheResult<T = any> {
  data: T | null;
  isLoading: boolean;
  isCached: boolean;
  isExpired: boolean;
  error: string | null;
  lastUpdated: Date | null;
  shouldShowGenerateButton: boolean;
  generate: (force?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => Promise<void>;
}

export function useUnifiedCache<T = any>(
  options: UseUnifiedCacheOptions
): UseUnifiedCacheResult<T> {
  const {
    type,
    jobId,
    userId,
    token,
    autoLoad = true,
    onSuccess,
    onError,
    additionalParams,
    generateFunction
  } = options;

  const [state, setState] = useState<CacheState<T>>({
    data: null,
    isLoading: false,
    isCached: false,
    isExpired: false,
    error: null,
    lastUpdated: null,
    shouldShowGenerateButton: false
  });

  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const generateRef = useRef<((force?: boolean) => Promise<void>) | null>(null);
  const initialLoadRef = useRef(false);

  // Check cache on mount
  useEffect(() => {
    mountedRef.current = true;

    const initializeCache = async () => {
      if (!jobId || !userId || !token || initialLoadRef.current) return;

      initialLoadRef.current = true;

      try {
        const initialState = await unifiedCacheService.getInitialState<T>(
          type,
          jobId,
          userId,
          additionalParams
        );

        if (mountedRef.current) {
          setState(initialState);

          // If we have cached data but it's expired, and autoLoad is true,
          // refresh in background
          if (autoLoad && initialState.isExpired && !initialState.shouldShowGenerateButton) {
            // Schedule background refresh but don't await to avoid blocking
            refreshInBackground().catch(error =>
              console.error('Background refresh failed:', error)
            );
          }
        }
      } catch (error) {
        console.error(`Failed to initialize cache for ${type}:`, error);
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            error: 'Failed to check cache',
            shouldShowGenerateButton: true
          }));
        }
      }
    };

    initializeCache();

    return () => {
      mountedRef.current = false;
      // Cancel any pending operations
      loadingRef.current = false;
    };
  }, [jobId, userId, token, type]);

  // This will be moved after generate function is defined

  const refreshInBackground = useCallback(async () => {
    if (!generateFunction) return;

    try {
      console.log(`🔄 Background refresh for ${type}`);
      const result = await generateFunction();

      if (result && mountedRef.current) {
        await unifiedCacheService.saveToCache(type, jobId, userId, result, additionalParams);

        setState(prev => ({
          ...prev,
          data: result,
          isCached: true,
          isExpired: false,
          lastUpdated: new Date()
        }));
      }
    } catch (error) {
      console.error(`Background refresh failed for ${type}:`, error);
    }
  }, [type, jobId, userId, generateFunction, additionalParams]);

  const generate = useCallback(async (force: boolean = false) => {
    if (loadingRef.current) return;
    if (!force && state.data && state.isCached && !state.isExpired) {
      toast.info('Using cached analysis. Click refresh to generate new analysis.');
      return;
    }

    if (!generateFunction) {
      setState(prev => ({
        ...prev,
        error: 'No generate function provided',
        shouldShowGenerateButton: false
      }));
      return;
    }

    loadingRef.current = true;
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      const result = await generateFunction();

      if (!mountedRef.current) return;

      if (result) {
        // Save to cache
        await unifiedCacheService.saveToCache(type, jobId, userId, result, additionalParams);

        setState({
          data: result,
          isLoading: false,
          isCached: true,
          isExpired: false,
          error: null,
          lastUpdated: new Date(),
          shouldShowGenerateButton: false
        });

        onSuccess?.(result);
        toast.success(`${type.replace(/_/g, ' ')} generated successfully`);
      } else {
        throw new Error('No result returned from generation');
      }
    } catch (error) {
      console.error(`Failed to generate ${type}:`, error);

      if (!mountedRef.current) return;

      const errorMessage = error instanceof Error ? error.message : 'Generation failed';

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        shouldShowGenerateButton: true
      }));

      onError?.(errorMessage);
      toast.error(`Failed to generate ${type.replace(/_/g, ' ')}`);
    } finally {
      loadingRef.current = false;
    }
  }, [state.data, state.isCached, state.isExpired, generateFunction, type, jobId, userId, additionalParams, onSuccess, onError]);

  // Store generate function in ref for stable access
  generateRef.current = generate;

  // Auto-load if enabled and no cached data
  useEffect(() => {
    if (
      autoLoad &&
      !state.data &&
      !state.isLoading &&
      !state.error &&
      state.shouldShowGenerateButton &&
      generateFunction &&
      mountedRef.current &&
      !loadingRef.current &&
      generateRef.current
    ) {
      generateRef.current();
    }
  }, [autoLoad, state.shouldShowGenerateButton, state.data, state.isLoading, state.error, generateFunction]);

  const refresh = useCallback(async () => {
    await generate(true);
  }, [generate]);

  const clear = useCallback(async () => {
    try {
      await unifiedCacheService.clearJobCaches(jobId, userId);
      setState({
        data: null,
        isLoading: false,
        isCached: false,
        isExpired: false,
        error: null,
        lastUpdated: null,
        shouldShowGenerateButton: true
      });
      toast.success('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast.error('Failed to clear cache');
    }
  }, [jobId, userId]);

  return {
    data: state.data,
    isLoading: state.isLoading,
    isCached: state.isCached,
    isExpired: state.isExpired,
    error: state.error,
    lastUpdated: state.lastUpdated,
    shouldShowGenerateButton: state.shouldShowGenerateButton,
    generate,
    refresh,
    clear
  };
}