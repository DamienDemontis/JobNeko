'use client';

import React, { useState, useEffect } from 'react';
import { AIAnalysisPanel } from './ai-analysis-panel';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { DollarSign, TrendingUp, MapPin, Building, AlertCircle, CheckCircle } from 'lucide-react';

interface UnifiedSalaryTabProps {
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  jobLocation?: string;
  jobSalary?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  userId: string;
  token: string;
  autoAnalyze?: boolean;
  onAnalysisComplete?: (data: any) => void;
}

export function UnifiedSalaryTab({
  jobId,
  jobTitle,
  jobCompany,
  jobLocation,
  jobSalary,
  salaryMin,
  salaryMax,
  salaryCurrency,
  userId,
  token,
  autoAnalyze = false,
  onAnalysisComplete,
}: UnifiedSalaryTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salaryData, setSalaryData] = useState<any>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleAnalyze = async () => {
    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          operation: 'salary_analysis',
          forceRefresh: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze salary');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setSalaryData(result.data);
        onAnalysisComplete?.(result.data);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'An error occurred during analysis');
        console.error('Salary analysis error:', err);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderSalaryAnalysis = () => {
    if (!salaryData) return null;

    return (
      <div className="space-y-6">
        {/* Salary Range Card */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Expected Salary Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Main Range */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Base Salary</span>
                  <Badge variant="outline" className="bg-white">
                    {salaryData.confidence || 'High'} Confidence
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(salaryData.expected_salary_range?.min || salaryMin || 0, salaryData.currency)}
                  {' - '}
                  {formatCurrency(salaryData.expected_salary_range?.max || salaryMax || 0, salaryData.currency)}
                </div>
                {salaryData.expected_salary_range?.median && (
                  <div className="text-sm text-gray-600 mt-1">
                    Median: {formatCurrency(salaryData.expected_salary_range.median, salaryData.currency)}
                  </div>
                )}
              </div>

              {/* Total Compensation if available */}
              {salaryData.total_compensation && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Total Compensation (with benefits)</div>
                  <div className="text-xl font-semibold text-blue-900">
                    {formatCurrency(salaryData.total_compensation.min || 0, salaryData.currency)}
                    {' - '}
                    {formatCurrency(salaryData.total_compensation.max || 0, salaryData.currency)}
                  </div>
                </div>
              )}

              {/* Data Sources */}
              {salaryData.data_sources && salaryData.data_sources.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs text-gray-500">
                    Data from: {salaryData.data_sources.join(', ')}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Market Comparison */}
        {salaryData.market_comparison && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Market Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {salaryData.market_comparison.vs_market && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">vs. Market Average</span>
                  <Badge
                    variant="outline"
                    className={
                      salaryData.market_comparison.vs_market > 0
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : salaryData.market_comparison.vs_market < 0
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-gray-50 text-gray-700'
                    }
                  >
                    {salaryData.market_comparison.vs_market > 0 ? '+' : ''}
                    {salaryData.market_comparison.vs_market}%
                  </Badge>
                </div>
              )}

              {salaryData.market_comparison.percentile && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Market Percentile</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {salaryData.market_comparison.percentile}th percentile
                  </span>
                </div>
              )}

              {salaryData.market_comparison.similar_roles && (
                <div className="pt-2 border-t">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Similar Roles</div>
                  <div className="space-y-1">
                    {salaryData.market_comparison.similar_roles.slice(0, 3).map((role: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{role.title}</span>
                        <span className="font-medium">{formatCurrency(role.median, salaryData.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Location Impact */}
        {salaryData.location_factors && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-teal-600" />
                Location Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {salaryData.location_factors.cost_of_living_index && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Cost of Living Index</span>
                  <Badge variant="outline">
                    {salaryData.location_factors.cost_of_living_index}
                  </Badge>
                </div>
              )}

              {salaryData.location_factors.adjusted_salary && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Adjusted for Location</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(salaryData.location_factors.adjusted_salary, salaryData.currency)}
                  </div>
                </div>
              )}

              {salaryData.location_factors.remote_adjustment && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-gray-600">
                    Remote work may affect salary by {salaryData.location_factors.remote_adjustment}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Negotiation Tips */}
        {salaryData.negotiation_insights && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Negotiation Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {salaryData.negotiation_insights.leverage_points && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Your Leverage</div>
                  <ul className="space-y-1">
                    {salaryData.negotiation_insights.leverage_points.map((point: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {salaryData.negotiation_insights.target_range && (
                <div className="bg-green-50 rounded-lg p-3 mt-3">
                  <div className="text-xs text-gray-600 mb-1">Recommended Ask</div>
                  <div className="text-lg font-semibold text-green-900">
                    {formatCurrency(salaryData.negotiation_insights.target_range.min, salaryData.currency)}
                    {' - '}
                    {formatCurrency(salaryData.negotiation_insights.target_range.max, salaryData.currency)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <AIAnalysisPanel
      title="Salary Intelligence"
      description="Get AI-powered salary insights and negotiation guidance"
      loading={loading}
      error={error}
      success={!!salaryData}
      onAnalyze={handleAnalyze}
      onCancel={handleCancel}
      analyzeLabel="Analyze Salary"
      autoAnalyze={autoAnalyze && !salaryData}
    >
      {renderSalaryAnalysis()}
    </AIAnalysisPanel>
  );
}