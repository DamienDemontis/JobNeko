'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  BanknotesIcon,
  ChartBarIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface SalaryIntelligenceResponse {
  schema_valid: boolean;
  expected_salary_range: {
    min: number | null;
    max: number | null;
    data_quality: string | null;
  };
  currency: string;
  affordability_score: number | null;
  affordability_label: string;
  confidence: {
    level: 'low' | 'medium' | 'high';
  };
  monthly_net_income: number | null;
}

interface Job {
  id: string;
  title: string;
  location?: string;
  salary?: string;
  workMode?: string;
  [key: string]: any; // Allow additional properties
}

interface SalaryIntelligenceWidgetProps {
  job: Job;
  compact?: boolean;
  autoAnalyze?: boolean;
  className?: string;
}

export default function SalaryIntelligenceWidget({ 
  job, 
  compact = false, 
  autoAnalyze = true,
  className = '' 
}: SalaryIntelligenceWidgetProps) {
  const [analysis, setAnalysis] = useState<SalaryIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (autoAnalyze && job.title && !analysis && !loading) {
      handleAnalyze();
    }
  }, [job.title, autoAnalyze]);

  const handleAnalyze = async () => {
    if (!job.title?.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const requestBody = {
        jobTitle: job.title.trim(),
        location: job.location?.trim() || undefined,
        salaryInfo: job.salary?.trim() || undefined,
        workMode: job.workMode?.toLowerCase() || 'onsite',
        computationBudget: {
          llm_calls: 1,
          tool_calls: '<=4',
          early_stop: true
        }
      };

      const response = await fetch('/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      if (!autoAnalyze) {
        toast.error(`Salary analysis failed: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null, currency = 'USD') => {
    // Since AI service now guarantees non-null values, provide reasonable fallbacks
    const safeAmount = amount ?? 0;
    if (isNaN(safeAmount) || safeAmount < 0) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
      }).format(0);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(safeAmount);
  };

  const getConfidenceBadgeColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAffordabilityColor = (label: string) => {
    switch (label) {
      case 'very_comfortable': return 'text-green-700';
      case 'comfortable': return 'text-blue-700';
      case 'tight': return 'text-yellow-700';
      case 'unaffordable': return 'text-red-700';
      default: return 'text-gray-700';
    }
  };

  if (loading) {
    return (
      <Card className={`${className} ${compact ? 'p-4' : ''}`}>
        <CardHeader className={compact ? 'p-0 pb-3' : ''}>
          <div className="flex items-center space-x-2">
            <SparklesIcon className="h-4 w-4 animate-pulse text-blue-600" />
            <CardTitle className="text-sm">Analyzing salary...</CardTitle>
          </div>
        </CardHeader>
        <CardContent className={compact ? 'p-0' : ''}>
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !analysis) {
    return (
      <Card className={`${className} ${compact ? 'p-4' : ''} border-red-200`}>
        <CardContent className={compact ? 'p-0' : ''}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">Analysis failed</span>
            </div>
            <Button
              onClick={handleAnalyze}
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-red-700 hover:bg-red-50"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className={`${className} ${compact ? 'p-4' : ''}`}>
        <CardContent className={compact ? 'p-0' : ''}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SparklesIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Salary analysis</span>
            </div>
            <Button
              onClick={handleAnalyze}
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
            >
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={`${className} p-3`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BanknotesIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Salary Est.</span>
            </div>
            <Badge className={`${getConfidenceBadgeColor(analysis.confidence.level)} text-xs`}>
              {analysis.confidence.level}
            </Badge>
          </div>
          
          <div className="text-lg font-bold text-green-700">
            {analysis.expected_salary_range.min && analysis.expected_salary_range.max 
              ? `${formatCurrency(analysis.expected_salary_range.min, analysis.currency)} - ${formatCurrency(analysis.expected_salary_range.max, analysis.currency)}`
              : 'Not available'
            }
          </div>

          {analysis.affordability_score !== null && (
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="h-3 w-3 text-purple-600" />
              <span className={`text-xs font-medium ${getAffordabilityColor(analysis.affordability_label)}`}>
                {typeof analysis.affordability_label === 'string' 
                  ? analysis.affordability_label.replace('_', ' ')
                  : analysis.affordability_label
                }
              </span>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <SparklesIcon className="h-5 w-5 mr-2 text-blue-600" />
            Salary Intelligence
          </CardTitle>
          <div className="flex items-center space-x-2">
            {analysis.schema_valid ? (
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            ) : (
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
            )}
            <Badge className={getConfidenceBadgeColor(analysis.confidence.level)}>
              {analysis.confidence.level} confidence
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Expected Salary Range */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <BanknotesIcon className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Expected Salary Range</span>
          </div>
          <div className="text-2xl font-bold text-green-700">
            {analysis.expected_salary_range.min && analysis.expected_salary_range.max 
              ? `${formatCurrency(analysis.expected_salary_range.min, analysis.currency)} - ${formatCurrency(analysis.expected_salary_range.max, analysis.currency)}`
              : 'Not available'
            }
          </div>
          {analysis.expected_salary_range.data_quality && (
            <Badge variant="outline" className="mt-1 text-xs">
              {typeof analysis.expected_salary_range.data_quality === 'string' 
                ? analysis.expected_salary_range.data_quality.replace('_', ' ')
                : analysis.expected_salary_range.data_quality
              }
            </Badge>
          )}
        </div>

        {/* Monthly Net Income & Affordability */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          {analysis.monthly_net_income && (
            <div>
              <div className="text-sm text-gray-600">Monthly Net Income</div>
              <div className="text-xl font-semibold text-blue-700">
                {formatCurrency(analysis.monthly_net_income, analysis.currency)}
              </div>
            </div>
          )}
          
          {analysis.affordability_score !== null && (
            <div>
              <div className="text-sm text-gray-600">Affordability</div>
              <div className="flex items-center space-x-2">
                <div className="text-xl font-semibold text-purple-700">
                  {analysis.affordability_score.toFixed(1)}
                </div>
                <span className={`text-sm font-medium capitalize ${getAffordabilityColor(analysis.affordability_label)}`}>
                  {typeof analysis.affordability_label === 'string' 
                    ? analysis.affordability_label.replace('_', ' ')
                    : analysis.affordability_label
                  }
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}