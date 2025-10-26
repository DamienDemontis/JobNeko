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
    if (autoLoad && jobId && userId && token) {
      runAnalysis();
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
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Generating {analysisType.replace('_', ' ')} analysis...</span>
          </div>
        )}

        {state.error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Analysis Failed</p>
              <p className="text-red-600 text-sm">{state.error}</p>
            </div>
            <Button
              onClick={() => runAnalysis(true)}
              variant="outline"
              size="sm"
              className="ml-auto"
            >
              Retry
            </Button>
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
              <Button
                onClick={() => runAnalysis(true)}
                variant="outline"
                size="sm"
                disabled={state.isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        )}

        {!state.data && !state.isLoading && !state.error && (
          <div className="text-center py-8">
            <Button onClick={() => runAnalysis()}>
              Generate {title}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}