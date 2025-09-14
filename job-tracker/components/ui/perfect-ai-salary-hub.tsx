'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';
import { SalaryAnalysisLoader } from './salary-analysis-loader';
import { Input } from './input';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, Zap, MapPin, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface UniversalJobAnalysis {
  role: {
    title: string;
    normalizedTitle: string;
    seniorityLevel: string;
    industry: string;
    skillsRequired: string[];
    experienceLevel: number;
    marketDemand: number;
    jobType: 'fulltime' | 'parttime' | 'contract' | 'internship';
    workMode: 'onsite' | 'hybrid' | 'remote';
    compensationModel: 'salary' | 'hourly' | 'commission' | 'equity_heavy';
  };
  compensation: {
    salaryRange: {
      min: number;
      max: number;
      median: number;
      currency: string;
      confidence: number;
    };
    totalCompensation: {
      base: number;
      bonus: number;
      equity: number;
      benefits: number;
      total: number;
    };
    marketPosition: string;
    negotiationPower: number;
  };
  location: {
    jobLocation: string;
    userLocation?: string;
    isRemote: boolean;
    effectiveLocation: string;
    costOfLiving: number;
    housingCosts: number;
    taxes: {
      federal: number;
      state: number;
      local: number;
      total: number;
    };
    qualityOfLife: number;
    marketMultiplier: number;
    salaryAdjustment?: {
      factor: number;
      reason: string;
    };
  };
  market: {
    demand: number;
    competition: number;
    growth: number;
    outlook: string;
    timeToHire: number;
    alternatives: number;
  };
  analysis: {
    overallScore: number;
    pros: string[];
    cons: string[];
    risks: string[];
    opportunities: string[];
    recommendations: string[];
  };
  confidence: {
    overall: number;
    salary: number;
    market: number;
    location: number;
    dataSources: string[];
    estimateType: 'posted_salary' | 'ai_estimate' | 'market_calculation';
    disclaimer?: string;
  };
  metadata?: {
    analysisTimestamp: string;
    ragVersion: string;
    processingTime: number;
    processingTimeFormatted?: string;
    cached?: boolean;
    cacheAge?: string;
    cacheKey?: string | null;
  };
}

interface PerfectAISalaryHubProps {
  jobId: string;
  token?: string;
  className?: string;
}

export default function PerfectAISalaryHub({ jobId, token, className = '' }: PerfectAISalaryHubProps) {
  const [analysis, setAnalysis] = useState<UniversalJobAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<string>('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [taxDetailsExpanded, setTaxDetailsExpanded] = useState(false);
  const [dataSourcesExpanded, setDataSourcesExpanded] = useState(false);

  useEffect(() => {
    loadAnalysis();
  }, [jobId]);

  const loadAnalysis = async (forceRefresh = false, customUserLocation?: string) => {
    try {
      setLoading(!forceRefresh);
      setRefreshing(forceRefresh);
      setError(null);

      if (!token) {
        throw new Error('Authentication required. Please log in to view salary analysis.');
      }

      const locationParam = customUserLocation || userLocation;
      const urlParams = new URLSearchParams();
      if (locationParam) {
        urlParams.set('userLocation', locationParam);
      }
      if (forceRefresh) {
        urlParams.set('forceRefresh', 'true');
      }
      const url = `/api/jobs/${jobId}/perfect-salary-analysis${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;
      const method = forceRefresh ? 'POST' : 'GET';
      const body = forceRefresh ? JSON.stringify({
        forceRefresh: true,
        userLocation: locationParam
      }) : undefined;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body
      });

      if (!response.ok) {
        let errorMessage = 'Salary analysis failed';

        try {
          const errorData = await response.json();
          errorMessage = errorData?.message || errorData?.error || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || `HTTP ${response.status} error`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      setAnalysis(data);

    } catch (err) {
      console.error('Salary analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    // Validate currency code and provide fallback
    const validCurrency = currency && currency.length === 3 && /^[A-Z]{3}$/.test(currency) ? currency : 'USD';

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: validCurrency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (error) {
      // Fallback to USD if currency is invalid
      console.warn(`Invalid currency code: ${currency}, using USD instead`);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(amount);
    }
  };

  const getMarketPositionColor = (position: string) => {
    switch (position) {
      case 'top_10': return 'bg-green-100 text-green-800';
      case 'top_25': return 'bg-blue-100 text-blue-800';
      case 'average': return 'bg-gray-100 text-gray-800';
      case 'bottom_25': return 'bg-orange-100 text-orange-800';
      case 'bottom_10': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOutlookIcon = (outlook: string) => {
    switch (outlook) {
      case 'booming': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'growing': return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'stable': return <Info className="w-4 h-4 text-gray-600" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-blue-600';
    if (confidence >= 0.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getEstimateTypeIcon = (estimateType: string) => {
    switch (estimateType) {
      case 'posted_salary': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'market_calculation': return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'ai_estimate': return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default: return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEstimateTypeLabel = (estimateType: string) => {
    switch (estimateType) {
      case 'posted_salary': return 'Posted Salary';
      case 'market_calculation': return 'Market Estimate';
      case 'ai_estimate': return 'AI Estimate';
      default: return 'Unknown Source';
    }
  };

  const handleLocationChange = () => {
    if (userLocation.trim()) {
      loadAnalysis(true, userLocation);
      setShowLocationModal(false);
    }
  };

  const formatJobType = (jobType: string) => {
    return jobType.replace('_', '-').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatWorkMode = (workMode: string) => {
    return workMode.charAt(0).toUpperCase() + workMode.slice(1);
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <SalaryAnalysisLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Salary Analysis Error: {error}
            <div className="mt-2">
              <Button onClick={() => loadAnalysis()} size="sm">
                Retry Analysis
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h2 className="text-2xl font-bold">Salary Intelligence</h2>
          {analysis.confidence.estimateType && (
            <div className="flex items-center gap-1">
              {getEstimateTypeIcon(analysis.confidence.estimateType)}
              <Badge variant="secondary" className="text-xs">
                {getEstimateTypeLabel(analysis.confidence.estimateType)}
              </Badge>
            </div>
          )}
          {analysis.metadata?.cached && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Cached ({analysis.metadata.cacheAge})
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {analysis.role.workMode === 'remote' && (
            <Button
              onClick={() => setShowLocationModal(true)}
              size="sm"
              variant="outline"
              className="flex items-center gap-1"
            >
              <MapPin className="w-4 h-4" />
              Set Location
            </Button>
          )}
          <Button
            onClick={() => loadAnalysis(true)}
            disabled={refreshing}
            size="sm"
            variant="outline"
            className="flex items-center gap-1"
          >
            {refreshing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Refreshing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                {analysis.metadata?.cached ? 'Refresh Analysis' : 'Refresh Analysis'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* AI Estimate Disclaimer */}
      {analysis.confidence.disclaimer && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{getEstimateTypeLabel(analysis.confidence.estimateType)}:</strong> {analysis.confidence.disclaimer}
          </AlertDescription>
        </Alert>
      )}

      {/* Remote Job Location Modal */}
      {showLocationModal && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Set Your Location for Remote Job Analysis
            </CardTitle>
            <CardDescription>
              Since this is a remote position, specify your location for accurate cost-of-living and tax calculations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="e.g., San Francisco, CA or London, UK"
              value={userLocation}
              onChange={(e) => setUserLocation(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLocationChange()}
            />
            <div className="flex gap-2">
              <Button onClick={handleLocationChange} size="sm">
                Update Analysis
              </Button>
              <Button onClick={() => setShowLocationModal(false)} size="sm" variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Analysis Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Job Overview
            <Badge
              variant="outline"
              className={`${analysis.analysis.overallScore >= 80 ? 'bg-green-100 text-green-800' :
                          analysis.analysis.overallScore >= 60 ? 'bg-blue-100 text-blue-800' :
                          analysis.analysis.overallScore >= 40 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'}`}
            >
              {analysis.analysis.overallScore}/100
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Role Level</p>
              <p className="font-semibold capitalize">{analysis.role.seniorityLevel}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Job Type</p>
              <p className="font-semibold">{formatJobType(analysis.role.jobType)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Work Mode</p>
              <p className="font-semibold">{formatWorkMode(analysis.role.workMode)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Compensation Model</p>
              <p className="font-semibold capitalize">{analysis.role.compensationModel.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => setDetailsExpanded(!detailsExpanded)}
            >
              <span>Additional Details</span>
              {detailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            {detailsExpanded && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Industry</p>
                  <p className="font-semibold">{analysis.role.industry}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Market Demand</p>
                  <p className="font-semibold">{analysis.role.marketDemand}/100</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Experience Required</p>
                  <p className="font-semibold">{analysis.role.experienceLevel} years</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Salary Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle>Live Salary Intelligence</CardTitle>
          <CardDescription>Comprehensive compensation and market analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Salary Range</p>
              <p className="text-xl font-bold text-blue-700">
                {formatCurrency(analysis.compensation.salaryRange.min, analysis.compensation.salaryRange.currency)} - {formatCurrency(analysis.compensation.salaryRange.max, analysis.compensation.salaryRange.currency)}
              </p>
              <p className="text-sm text-gray-600">
                Median: {formatCurrency(analysis.compensation.salaryRange.median, analysis.compensation.salaryRange.currency)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Compensation</p>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(analysis.compensation.totalCompensation.total, analysis.compensation.salaryRange.currency)}
              </p>
              <p className="text-sm text-gray-600">
                Base + Bonus + Equity + Benefits
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Market Position</p>
              <Badge className={getMarketPositionColor(analysis.compensation.marketPosition)}>
                {analysis.compensation.marketPosition.replace('_', ' ')}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">
                Negotiation Power: {analysis.compensation.negotiationPower}/10
              </p>
            </div>
          </div>

          {/* Compensation Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Base Salary</p>
              <p className="font-semibold">{formatCurrency(analysis.compensation.totalCompensation.base)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Bonus</p>
              <p className="font-semibold">{formatCurrency(analysis.compensation.totalCompensation.bonus)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Equity</p>
              <p className="font-semibold">{formatCurrency(analysis.compensation.totalCompensation.equity)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Benefits</p>
              <p className="font-semibold">{formatCurrency(analysis.compensation.totalCompensation.benefits)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Location Analysis
            {analysis.location.isRemote && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Remote Position
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {analysis.location.isRemote ? (
              <>
                Remote job analysis for {analysis.location.effectiveLocation}
                {analysis.location.userLocation && analysis.location.userLocation !== analysis.location.jobLocation && (
                  <span className="text-blue-600"> • Living in {analysis.location.userLocation}</span>
                )}
              </>
            ) : (
              `On-site position in ${analysis.location.effectiveLocation}`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analysis.location.salaryAdjustment && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 font-medium">
                <Info className="w-4 h-4" />
                Remote Work Adjustment
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Salary adjusted by {(analysis.location.salaryAdjustment.factor * 100).toFixed(1)}% - {analysis.location.salaryAdjustment.reason}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Cost of Living</p>
              <p className="font-semibold">{analysis.location.costOfLiving}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Housing Costs</p>
              <p className="font-semibold">{formatCurrency(analysis.location.housingCosts)}/month</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Tax Rate</p>
              <p className="font-semibold">{(analysis.location.taxes.total * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Quality of Life</p>
              <p className="font-semibold">{analysis.location.qualityOfLife}/100</p>
            </div>
          </div>

          {/* Tax Breakdown - Collapsible */}
          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => setTaxDetailsExpanded(!taxDetailsExpanded)}
            >
              <span>Tax Breakdown</span>
              {taxDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            {taxDetailsExpanded && (
              <div className="mt-4 grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Federal Tax</p>
                  <p className="font-semibold">{(analysis.location.taxes.federal * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">State Tax</p>
                  <p className="font-semibold">{(analysis.location.taxes.state * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Local Tax</p>
                  <p className="font-semibold">{(analysis.location.taxes.local * 100).toFixed(1)}%</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Market Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Market Intelligence
            {getOutlookIcon(analysis.market.outlook)}
          </CardTitle>
          <CardDescription>Live market conditions and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Market Demand</p>
              <p className="font-semibold">{analysis.market.demand}/100</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Competition</p>
              <p className="font-semibold">{analysis.market.competition}/100</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Growth Rate</p>
              <p className="font-semibold">{(analysis.market.growth * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Time to Hire</p>
              <p className="font-semibold">{analysis.market.timeToHire} days</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Market Outlook</p>
            <div className="flex items-center gap-2">
              {getOutlookIcon(analysis.market.outlook)}
              <Badge
                variant="outline"
                className={`capitalize ${
                  analysis.market.outlook === 'booming' ? 'bg-green-100 text-green-800' :
                  analysis.market.outlook === 'growing' ? 'bg-blue-100 text-blue-800' :
                  analysis.market.outlook === 'stable' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}
              >
                {analysis.market.outlook}
              </Badge>
              <span className="text-sm text-gray-600">
                {analysis.market.alternatives} similar opportunities available
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pros & Cons */}
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Advantages
              </h4>
              <ul className="space-y-1 text-sm">
                {analysis.analysis.pros.map((pro, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-orange-700 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Concerns
              </h4>
              <ul className="space-y-1 text-sm">
                {analysis.analysis.cons.map((con, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-blue-700 mb-2">Action Items</h4>
              <ul className="space-y-2 text-sm">
                {analysis.analysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {analysis.analysis.opportunities.length > 0 && (
              <div>
                <h4 className="font-semibold text-purple-700 mb-2">Opportunities</h4>
                <ul className="space-y-1 text-sm">
                  {analysis.analysis.opportunities.map((opp, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-purple-600 mt-0.5">◆</span>
                      <span>{opp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.analysis.risks.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-700 mb-2">Risks</h4>
                <ul className="space-y-1 text-sm">
                  {analysis.analysis.risks.map((risk, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-600 mt-0.5">⚠</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Confidence & Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Data Quality
            {getEstimateTypeIcon(analysis.confidence.estimateType)}
          </CardTitle>
          <CardDescription>Analysis confidence and transparency metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Overall Confidence</p>
              <p className={`font-semibold ${getConfidenceColor(analysis.confidence.overall)}`}>
                {(analysis.confidence.overall * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Salary Data</p>
              <p className={`font-semibold ${getConfidenceColor(analysis.confidence.salary)}`}>
                {(analysis.confidence.salary * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Market Data</p>
              <p className={`font-semibold ${getConfidenceColor(analysis.confidence.market)}`}>
                {(analysis.confidence.market * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Location Data</p>
              <p className={`font-semibold ${getConfidenceColor(analysis.confidence.location)}`}>
                {(analysis.confidence.location * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Data Sources - Collapsible */}
          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => setDataSourcesExpanded(!dataSourcesExpanded)}
            >
              <span>Data Sources & Technical Details</span>
              {dataSourcesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            {dataSourcesExpanded && (
              <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Data Sources Used:</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.confidence.dataSources.map((source, index) => (
                      <Badge key={index} variant="outline" className="bg-white">
                        {source}
                      </Badge>
                    ))}
                  </div>
                </div>

                {analysis.metadata && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Analysis completed: {new Date(analysis.metadata.analysisTimestamp).toLocaleString()}</div>
                    {analysis.metadata.processingTimeFormatted && (
                      <div>Processing time: {analysis.metadata.processingTimeFormatted}</div>
                    )}
                    {analysis.metadata.cached && analysis.metadata.cacheAge && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Cached result (age: {analysis.metadata.cacheAge})</span>
                      </div>
                    )}
                    {analysis.metadata.cached === false && (
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-blue-500" />
                        <span>Fresh analysis</span>
                      </div>
                    )}
                    <div>AI RAG Version: {analysis.metadata.ragVersion}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skills Intelligence */}
      {analysis.role.skillsRequired.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Skills Intelligence</CardTitle>
            <CardDescription>Market-valued skills identified from live job market data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.role.skillsRequired.map((skill, index) => (
                <Badge key={index} variant="outline" className="bg-gradient-to-r from-blue-50 to-purple-50">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}