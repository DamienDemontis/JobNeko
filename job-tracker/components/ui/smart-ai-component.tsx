/**
 * Smart AI Component Wrapper
 * Prevents all "Cannot read property of undefined" errors
 * Uses centralized AI analysis system
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { centralizedAIAnalysis, AnalysisType, AnalysisResult } from '@/lib/services/centralized-ai-analysis';
import { AnalysisButton } from '@/components/shared/analysis-button';
import { AnalysisLoadingState } from '@/components/shared/analysis-loading-state';

interface SmartAIComponentProps {
  jobId: string;
  userId: string;
  token: string;
  analysisType: AnalysisType;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: (data: any, helpers: SmartAIHelpers) => React.ReactNode;
  autoLoad?: boolean;
  additionalData?: Record<string, any>;
}

interface SmartAIHelpers {
  safeGet: <T>(path: string, defaultValue: T) => T;
  safeJoin: (array: any, separator?: string) => string;
  safeMap: <T>(array: any, mapper: (item: any, index: number) => T) => T[];
  isLoading: boolean;
  error: string | null;
  refresh: (force?: boolean) => Promise<void>;
  isCached: boolean;
}

interface ComponentState {
  data: any;
  isLoading: boolean;
  error: string | null;
  isCached: boolean;
}

export default function SmartAIComponent({
  jobId,
  userId,
  token,
  analysisType,
  title,
  description,
  icon,
  children,
  autoLoad = true,
  additionalData = {}
}: SmartAIComponentProps) {
  const [state, setState] = useState<ComponentState>({
    data: null,
    isLoading: false,
    error: null,
    isCached: false
  });

  const checkCache = async () => {
    // Check cache without triggering fresh analysis
    try {
      const result: AnalysisResult = await centralizedAIAnalysis.runAnalysis(
        analysisType,
        jobId,
        userId,
        token,
        additionalData,
        { forceRefresh: false }
      );

      if (result.cached && result.data) {
        // Load cached data
        setState({
          data: result.data,
          isLoading: false,
          error: null,
          isCached: true
        });
      }
    } catch (error) {
      // If cache check fails, just stay in idle state
      console.log('No cached analysis found');
    }
  };

  const runAnalysis = async (forceRefresh: boolean = false) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      const result: AnalysisResult = await centralizedAIAnalysis.runAnalysis(
        analysisType,
        jobId,
        userId,
        token,
        additionalData,
        { forceRefresh }
      );

      setState({
        data: result.data,
        isLoading: false,
        error: null,
        isCached: result.cached
      });

    } catch (error) {
      console.error(`Smart AI Component error (${analysisType}):`, error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      }));
    }
  };

  useEffect(() => {
    if (jobId && userId && token) {
      if (autoLoad) {
        // Auto-load: run full analysis (which checks cache first)
        runAnalysis();
      } else {
        // Don't auto-load, but DO check for cached data
        checkCache();
      }
    }
  }, [jobId, userId, token, analysisType]);

  // Smart helper functions that prevent undefined errors
  const helpers: SmartAIHelpers = {
    safeGet: <T,>(path: string, defaultValue: T): T => {
      return centralizedAIAnalysis.safeAccess(state.data, path, defaultValue);
    },

    safeJoin: (array: any, separator: string = ', '): string => {
      return centralizedAIAnalysis.safeJoin(array, separator);
    },

    safeMap: <T,>(array: any, mapper: (item: any, index: number) => T): T[] => {
      if (!Array.isArray(array)) {
        return [];
      }
      return array.map(mapper);
    },

    isLoading: state.isLoading,
    error: state.error,
    refresh: runAnalysis,
    isCached: state.isCached
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
          {state.isCached && (
            <Badge variant="secondary" className="ml-auto">
              <Clock className="w-3 h-3 mr-1" />
              Cached
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        {state.isLoading && (
          <AnalysisLoadingState
            type="generating"
            message={`Generating ${analysisType.replace('_', ' ')} analysis...`}
          />
        )}

        {state.error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Analysis Failed</p>
              <p className="text-red-600 text-sm">{state.error}</p>
            </div>
            <AnalysisButton
              onClick={() => runAnalysis(true)}
              loading={state.isLoading}
              icon={RefreshCw}
              label="Retry"
              variant="outline"
              size="sm"
              className="ml-auto"
            />
          </div>
        )}

        {state.data && !state.isLoading && (
          <div className="space-y-4">
            {children(state.data, helpers)}

            {/* Analysis Meta */}
            <div className="flex items-center justify-between pt-4 border-t text-xs text-gray-500">
              <span>
                Analysis generated: {new Date(helpers.safeGet('analysisDate', new Date().toISOString())).toLocaleDateString()}
              </span>
              <AnalysisButton
                onClick={() => runAnalysis(true)}
                loading={state.isLoading}
                icon={RefreshCw}
                label="Refresh"
                variant="outline"
                size="sm"
              />
            </div>
          </div>
        )}

        {!state.data && !state.isLoading && !state.error && (
          <div className="text-center py-8">
            <AnalysisButton
              onClick={() => runAnalysis()}
              loading={state.isLoading}
              icon={CheckCircle}
              label={`Generate ${title}`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}