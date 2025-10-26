'use client';

import React, { useState } from 'react';
import { AIAnalysisPanel } from './ai-analysis-panel';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Building, TrendingUp, Users, Globe, Star, DollarSign, Target, Award } from 'lucide-react';

interface UnifiedCompanyTabProps {
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  jobLocation?: string;
  userId: string;
  token: string;
  autoAnalyze?: boolean;
  onAnalysisComplete?: (data: any) => void;
}

export function UnifiedCompanyTab({
  jobId,
  jobTitle,
  jobCompany,
  jobLocation,
  userId,
  token,
  autoAnalyze = false,
  onAnalysisComplete,
}: UnifiedCompanyTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<any>(null);
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
          operation: 'company_research',
          forceRefresh: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to research company');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setCompanyData(result.data);
        onAnalysisComplete?.(result.data);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'An error occurred during analysis');
        console.error('Company research error:', err);
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

  const renderCompanyResearch = () => {
    if (!companyData) return null;

    return (
      <div className="space-y-6">
        {/* Company Overview */}
        {companyData.overview && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Building className="h-5 w-5 text-gray-600" />
                Company Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {companyData.overview.industry && (
                  <div>
                    <p className="text-xs text-gray-500">Industry</p>
                    <p className="text-sm font-medium text-gray-900">{companyData.overview.industry}</p>
                  </div>
                )}
                {companyData.overview.size && (
                  <div>
                    <p className="text-xs text-gray-500">Company Size</p>
                    <p className="text-sm font-medium text-gray-900">{companyData.overview.size}</p>
                  </div>
                )}
                {companyData.overview.founded && (
                  <div>
                    <p className="text-xs text-gray-500">Founded</p>
                    <p className="text-sm font-medium text-gray-900">{companyData.overview.founded}</p>
                  </div>
                )}
                {companyData.overview.headquarters && (
                  <div>
                    <p className="text-xs text-gray-500">Headquarters</p>
                    <p className="text-sm font-medium text-gray-900">{companyData.overview.headquarters}</p>
                  </div>
                )}
              </div>

              {companyData.overview.mission && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-1">Mission</p>
                  <p className="text-sm text-gray-700">{companyData.overview.mission}</p>
                </div>
              )}

              {companyData.overview.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <a href={companyData.overview.website} target="_blank" rel="noopener noreferrer"
                     className="text-sm text-blue-600 hover:underline">
                    {companyData.overview.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Culture & Values */}
        {companyData.culture && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-600" />
                Culture & Values
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {companyData.culture.values && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Core Values</p>
                  <div className="flex flex-wrap gap-2">
                    {companyData.culture.values.map((value: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="bg-gray-50">
                        {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {companyData.culture.work_life_balance && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Work-Life Balance</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < companyData.culture.work_life_balance
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {companyData.culture.diversity_score && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Diversity & Inclusion</span>
                  <Badge variant="outline" className="bg-gray-50">
                    {companyData.culture.diversity_score}/10
                  </Badge>
                </div>
              )}

              {companyData.culture.employee_satisfaction && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Employee Satisfaction</span>
                  <span className="text-sm font-medium text-gray-900">
                    {companyData.culture.employee_satisfaction}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Growth & Financials */}
        {companyData.financials && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-gray-600" />
                Growth & Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {companyData.financials.revenue && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Annual Revenue</span>
                  <span className="text-sm font-medium text-gray-900">
                    {companyData.financials.revenue}
                  </span>
                </div>
              )}

              {companyData.financials.growth_rate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Growth Rate</span>
                  <Badge
                    variant="outline"
                    className={
                      companyData.financials.growth_rate > 0
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }
                  >
                    {companyData.financials.growth_rate > 0 ? '+' : ''}
                    {companyData.financials.growth_rate}% YoY
                  </Badge>
                </div>
              )}

              {companyData.financials.funding && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 mb-1">Funding</p>
                  <p className="text-sm font-medium text-gray-900">{companyData.financials.funding}</p>
                  {companyData.financials.investors && (
                    <p className="text-xs text-gray-600 mt-1">
                      Investors: {companyData.financials.investors.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {companyData.financials.stock_ticker && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">{companyData.financials.stock_ticker}</span>
                  {companyData.financials.stock_price && (
                    <span className="text-sm text-gray-600">
                      ${companyData.financials.stock_price}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Benefits & Perks */}
        {companyData.benefits && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Award className="h-5 w-5 text-gray-600" />
                Benefits & Perks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {companyData.benefits.health && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">🏥 Health & Wellness</p>
                  <ul className="space-y-1">
                    {companyData.benefits.health.map((benefit: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-green-500">✓</span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {companyData.benefits.time_off && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">🏖️ Time Off</p>
                  <p className="text-sm text-gray-600">{companyData.benefits.time_off}</p>
                </div>
              )}

              {companyData.benefits.professional_development && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">📚 Professional Development</p>
                  <ul className="space-y-1">
                    {companyData.benefits.professional_development.map((benefit: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-blue-500">✓</span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {companyData.benefits.remote_work && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-gray-700 mb-1">🏠 Remote Work Policy</p>
                  <p className="text-sm text-gray-600">{companyData.benefits.remote_work}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Red Flags or Concerns */}
        {companyData.concerns && companyData.concerns.length > 0 && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-red-600" />
                Points to Consider
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {companyData.concerns.map((concern: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">⚠️</span>
                    <div>
                      <p className="text-sm text-gray-700">{concern.issue}</p>
                      {concern.source && (
                        <p className="text-xs text-gray-500 mt-1">Source: {concern.source}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <AIAnalysisPanel
      title="Company Intelligence"
      description="Comprehensive company research and insights"
      loading={loading}
      error={error}
      success={!!companyData}
      onAnalyze={handleAnalyze}
      onCancel={handleCancel}
      analyzeLabel="Research Company"
      autoAnalyze={autoAnalyze && !companyData}
    >
      {renderCompanyResearch()}
    </AIAnalysisPanel>
  );
}