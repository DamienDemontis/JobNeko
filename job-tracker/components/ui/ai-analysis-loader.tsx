'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SparklesIcon, ChartBarIcon, MapPinIcon, BanknotesIcon } from '@heroicons/react/24/outline';

interface LoadingStep {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  estimatedDuration: number;
}

const LOADING_STEPS: LoadingStep[] = [
  {
    id: 'context',
    label: 'Building Context',
    description: 'Gathering user profile and job requirements...',
    icon: SparklesIcon,
    estimatedDuration: 2000
  },
  {
    id: 'market',
    label: 'Analyzing Market',
    description: 'Researching salary data and market trends...',
    icon: ChartBarIcon,
    estimatedDuration: 3000
  },
  {
    id: 'location',
    label: 'Location Intelligence',
    description: 'Processing cost of living and regional factors...',
    icon: MapPinIcon,
    estimatedDuration: 2500
  },
  {
    id: 'calculation',
    label: 'AI Analysis',
    description: 'Generating personalized salary insights...',
    icon: BanknotesIcon,
    estimatedDuration: 3500
  }
];

interface AIAnalysisLoaderProps {
  isLoading: boolean;
  currentStep?: string;
  progress?: number;
  className?: string;
  variant?: 'full' | 'compact' | 'minimal';
  showSteps?: boolean;
  customMessage?: string;
}

export default function AIAnalysisLoader({
  isLoading,
  currentStep,
  progress,
  className,
  variant = 'full',
  showSteps = true,
  customMessage
}: AIAnalysisLoaderProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Simulate step progression if currentStep not provided
  useEffect(() => {
    if (!isLoading) {
      setActiveStep(0);
      setAnimationProgress(0);
      return;
    }

    const totalDuration = LOADING_STEPS.reduce((sum, step) => sum + step.estimatedDuration, 0);
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += 100;

      // Calculate which step should be active
      let stepElapsed = 0;
      let newActiveStep = 0;

      for (let i = 0; i < LOADING_STEPS.length; i++) {
        if (elapsed > stepElapsed + LOADING_STEPS[i].estimatedDuration) {
          stepElapsed += LOADING_STEPS[i].estimatedDuration;
          newActiveStep = Math.min(i + 1, LOADING_STEPS.length - 1);
        } else {
          break;
        }
      }

      setActiveStep(newActiveStep);
      setAnimationProgress(Math.min((elapsed / totalDuration) * 100, 95)); // Cap at 95% until complete

      if (elapsed >= totalDuration) {
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isLoading]);

  // Use provided progress if available
  const displayProgress = progress !== undefined ? progress : animationProgress;

  if (!isLoading) return null;

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-3 p-4', className)}>
        <div className="relative">
          <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <SparklesIcon className="absolute inset-0.5 w-5 h-5 text-blue-600 animate-pulse" />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">
            {customMessage || 'AI is analyzing...'}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4', className)}>
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <SparklesIcon className="absolute inset-1 w-6 h-6 text-blue-600 animate-pulse" />
          </div>
          <div>
            <div className="font-medium text-gray-900">AI Salary Analysis</div>
            <div className="text-sm text-gray-600">
              {customMessage || LOADING_STEPS[activeStep]?.description || 'Processing...'}
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${displayProgress}%` }}
          />
        </div>

        <div className="text-xs text-gray-500 mt-2 text-right">
          {Math.round(displayProgress)}% complete
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className={cn('bg-white border border-gray-200 rounded-xl p-6 shadow-sm', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <SparklesIcon className="absolute inset-1.5 w-7 h-7 text-blue-600 animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Salary Analysis</h3>
          <p className="text-sm text-gray-600">
            {customMessage || 'Analyzing salary data with artificial intelligence...'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{Math.round(displayProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
            style={{ width: `${displayProgress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          </div>
        </div>
      </div>

      {/* Loading Steps */}
      {showSteps && (
        <div className="space-y-3">
          {LOADING_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === activeStep;
            const isCompleted = index < activeStep;

            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-all duration-300',
                  isActive && 'bg-blue-50 border border-blue-200',
                  isCompleted && 'bg-green-50',
                  !isActive && !isCompleted && 'bg-gray-50'
                )}
              >
                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300',
                  isCompleted && 'bg-green-500',
                  isActive && 'bg-blue-500',
                  !isActive && !isCompleted && 'bg-gray-300'
                )}>
                  {isCompleted ? (
                    <div className="w-5 h-5 text-white">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <Icon className={cn(
                      'w-5 h-5 transition-colors duration-300',
                      isActive && 'text-white animate-pulse',
                      !isActive && 'text-gray-500'
                    )} />
                  )}
                </div>

                <div className="flex-1">
                  <div className={cn(
                    'font-medium transition-colors duration-300',
                    isActive && 'text-blue-900',
                    isCompleted && 'text-green-900',
                    !isActive && !isCompleted && 'text-gray-700'
                  )}>
                    {step.label}
                  </div>
                  <div className={cn(
                    'text-sm transition-colors duration-300',
                    isActive && 'text-blue-700',
                    isCompleted && 'text-green-700',
                    !isActive && !isCompleted && 'text-gray-500'
                  )}>
                    {isActive ? step.description :
                     isCompleted ? 'Completed' : step.description}
                  </div>
                </div>

                {isActive && (
                  <div className="flex-shrink-0">
                    <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Message */}
      <div className="mt-6 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <div className="text-sm text-gray-700 flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-blue-600" />
          This analysis considers market data, location factors, and your profile for personalized insights.
        </div>
      </div>
    </div>
  );
}

// Skeleton components for specific sections
export function SalarySkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg p-6', className)}>
      <div className="animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
          <div>
            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-32" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function BudgetBreakdownSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg p-6', className)}>
      <div className="animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="h-6 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export function MarketInsightsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg p-6', className)}>
      <div className="animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-5 bg-gray-200 rounded w-28" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-6 bg-gray-200 rounded" />
          </div>
          <div>
            <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-6 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded w-4/5" />
          <div className="h-3 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}