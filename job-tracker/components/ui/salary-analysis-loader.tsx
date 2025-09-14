'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle2, Circle, Database, Globe, Brain, TrendingUp, Calculator, FileSearch } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface LoadingStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  duration: number; // estimated duration in ms
}

const loadingSteps: LoadingStep[] = [
  {
    id: 'job-analysis',
    label: 'AI Job Analysis',
    description: 'Extracting job type, seniority, skills, and work mode from posting',
    icon: <FileSearch className="w-4 h-4" />,
    duration: 2000
  },
  {
    id: 'bls-data',
    label: 'Bureau of Labor Statistics',
    description: 'Retrieving government salary data and employment statistics',
    icon: <Database className="w-4 h-4" />,
    duration: 2500
  },
  {
    id: 'market-research',
    label: 'Live Job Market Research',
    description: 'Analyzing current job postings and salary offerings',
    icon: <Globe className="w-4 h-4" />,
    duration: 3000
  },
  {
    id: 'cost-of-living',
    label: 'Cost of Living Analysis',
    description: 'Processing location-specific economic data and housing costs',
    icon: <TrendingUp className="w-4 h-4" />,
    duration: 2000
  },
  {
    id: 'company-intel',
    label: 'Company Intelligence',
    description: 'Gathering compensation philosophy and financial health data',
    icon: <Brain className="w-4 h-4" />,
    duration: 2500
  },
  {
    id: 'ai-synthesis',
    label: 'AI Analysis Synthesis',
    description: 'Combining all data sources into comprehensive salary intelligence',
    icon: <Calculator className="w-4 h-4" />,
    duration: 3000
  }
];

export function SalaryAnalysisLoader() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);

  useEffect(() => {
    const totalDuration = loadingSteps.reduce((acc, step) => acc + step.duration, 0);
    let elapsed = 0;
    let stepElapsed = 0;
    let currentStepIndex = 0;

    const interval = setInterval(() => {
      elapsed += 100;
      stepElapsed += 100;

      // Update overall progress
      setProgress(Math.min((elapsed / totalDuration) * 100, 100));

      // Update step progress
      const currentStepDuration = loadingSteps[currentStepIndex]?.duration || 1000;
      setStepProgress(Math.min((stepElapsed / currentStepDuration) * 100, 100));

      // Move to next step if current is complete
      if (stepElapsed >= currentStepDuration && currentStepIndex < loadingSteps.length - 1) {
        stepElapsed = 0;
        currentStepIndex++;
        setCurrentStep(currentStepIndex);
      }

      // Clear interval when complete
      if (elapsed >= totalDuration) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const getStepStatus = (index: number) => {
    if (index < currentStep) return 'complete';
    if (index === currentStep) return 'active';
    return 'pending';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600 animate-pulse" />
          <CardTitle>Analyzing Compensation Data</CardTitle>
        </div>
        <CardDescription>
          Performing real-time market analysis with live data sources
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Overall Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {loadingSteps.map((step, index) => {
            const status = getStepStatus(index);
            const isActive = status === 'active';
            const isComplete = status === 'complete';

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 transition-all duration-300 ${
                  isActive ? 'opacity-100' : isComplete ? 'opacity-70' : 'opacity-40'
                }`}
              >
                <div className="mt-1">
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : isActive ? (
                    <div className="relative">
                      <Circle className="w-5 h-5 text-blue-600" />
                      <Loader2 className="w-5 h-5 text-blue-600 absolute top-0 left-0 animate-spin" />
                    </div>
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {React.cloneElement(step.icon as React.ReactElement, {
                      className: `w-4 h-4 ${
                        isActive ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-gray-400'
                      }`
                    })}
                    <p className={`text-sm font-medium ${
                      isActive ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">{step.description}</p>
                  {isActive && (
                    <Progress value={stepProgress} className="h-1 mt-2" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current processing status */}
        <div className="pt-2 text-center">
          <div className="text-sm text-gray-600">
            <div className="font-medium text-blue-600">
              {loadingSteps[currentStep]?.label || 'Initializing...'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {loadingSteps[currentStep]?.description || 'Preparing analysis...'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}