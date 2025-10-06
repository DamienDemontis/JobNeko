'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { AIAnalysisButton } from './ai-analysis-button';

interface AIAnalysisPanelProps {
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  success?: boolean;
  children?: React.ReactNode;
  onAnalyze?: () => Promise<void>;
  onCancel?: () => void;
  analyzeLabel?: string;
  className?: string;
  showAnimation?: boolean;
  autoAnalyze?: boolean;
  disabled?: boolean;
}

export function AIAnalysisPanel({
  title,
  description,
  loading = false,
  error = null,
  success = false,
  children,
  onAnalyze,
  onCancel,
  analyzeLabel = 'Analyze',
  className = '',
  showAnimation = true,
  autoAnalyze = false,
  disabled = false,
}: AIAnalysisPanelProps) {
  // Auto-analyze on mount if enabled
  React.useEffect(() => {
    if (autoAnalyze && onAnalyze && !loading && !error && !success) {
      onAnalyze();
    }
  }, [autoAnalyze]);

  return (
    <Card className={`border-gray-200 bg-white ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {title}
            </CardTitle>
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>
          {onAnalyze && (
            <AIAnalysisButton
              onClick={onAnalyze}
              loading={loading}
              disabled={disabled}
              label={analyzeLabel}
              variant="outline"
              size="sm"
              showAnimation={showAnimation}
              onCancel={onCancel}
              cancelable={!!onCancel}
            />
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Error State */}
        {error && (
          <Alert className="border-red-200 bg-red-50 mb-4">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && !children && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full bg-gray-100" />
            <Skeleton className="h-4 w-3/4 bg-gray-100" />
            <Skeleton className="h-4 w-5/6 bg-gray-100" />
          </div>
        )}

        {/* Success Indicator */}
        {success && !error && !loading && (
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Analysis complete</span>
          </div>
        )}

        {/* Content */}
        {children}

        {/* Empty State */}
        {!loading && !error && !children && (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              No analysis available. Click analyze to start.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}