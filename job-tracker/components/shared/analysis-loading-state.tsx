'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  type: 'checking-cache' | 'generating';
  message?: string;
  className?: string;
}

/**
 * Unified Loading State Component
 * Provides consistent loading animations for all AI analysis operations
 * across Salary, Location, Application, and Interview tabs
 */
export function AnalysisLoadingState({
  type,
  message,
  className = ''
}: LoadingStateProps) {
  const defaultMessages = {
    'checking-cache': 'Checking for cached analysis...',
    'generating': 'AI is analyzing...'
  };

  const displayMessage = message || defaultMessages[type];

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
      <p className="text-sm text-gray-600 animate-pulse">
        {displayMessage}
      </p>
    </div>
  );
}
