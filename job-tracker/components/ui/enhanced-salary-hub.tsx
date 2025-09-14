'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  BanknotesIcon,
  MapPinIcon,
  ChartBarIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
  SparklesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

// Import our new components
import LocationAutocomplete from './location-autocomplete';
import ExpenseBreakdownEditor from './expense-breakdown-editor';
import AIAnalysisLoader, { SalarySkeletonCard, BudgetBreakdownSkeleton, MarketInsightsSkeleton } from './ai-analysis-loader';
import NetIncomeCalculator from './net-income-calculator';
import AINegotiationCoach from './ai-negotiation-coach';

// Import services
import { salaryCache } from '@/lib/services/salary-cache';

// Define response type locally to avoid importing server-only code
interface EnhancedSalaryResponse {
  salary: {
    estimated: {
      min: number;
      max: number;
      median: number;
      confidence: number;
    };
    market: {
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      source: string;
    };
    listed?: {
      min: number;
      max: number;
      period: string;
      currency: string;
    };
  };
  expenses: {
    monthly: Record<string, number>;
    annual: Record<string, number>;
    customized: boolean;
    recommendations: string[];
  };
  location: {
    city: string;
    state?: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    costOfLivingIndex: number;
    source: string;
  };
  affordability: {
    score: number;
    label: string;
    breakdown: {
      survival: number;
      comfortable: number;
      optimal: number;
    };
  };
  insights: {
    negotiationTips: string[];
    careerProgression?: string;
    marketPosition?: string;
  };
  metadata: {
    cached: boolean;
    processingTimeMs: number;
  };
}

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  workMode?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
  };
  description?: string;
  skills?: string[];
  requirements?: string[];
}

interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  experience_years?: number;
  skills?: string[];
  preferred_salary_min?: number;
  preferred_salary_max?: number;
  current_salary?: number;
  career_level?: string;
  industry_experience?: string[];
}

interface Location {
  display: string;
  city: string;
  state?: string;
  country: string;
  countryCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  confidence: number;
  source: 'user' | 'geocoding' | 'popular' | 'recent';
}

interface ExpenseProfile {
  name: string;
  housing: number;
  food: number;
  transportation: number;
  healthcare: number;
  utilities: number;
  entertainment: number;
  savings: number;
  other: number;
}

interface EnhancedSalaryHubProps {
  job: Job;
  userProfile?: UserProfile;
  className?: string;
  onLocationChange?: (location: string) => void;
  onExpenseProfileChange?: (profile: ExpenseProfile) => void;
}

// No default expense profile - expense data will come from AI analysis only

export default function EnhancedSalaryHub({
  job,
  userProfile,
  className,
  onLocationChange,
  onExpenseProfileChange
}: EnhancedSalaryHubProps) {
  // Auth and state management
  const { token } = useAuth();
  const [analysisLocation, setAnalysisLocation] = useState<string>(job.location || '');
  const [expenseProfile, setExpenseProfile] = useState<ExpenseProfile>({
    name: 'AI-Determined',
    housing: 0,
    food: 0,
    transportation: 0,
    healthcare: 0,
    utilities: 0,
    entertainment: 0,
    savings: 0,
    other: 0
  });
  const [currency, setCurrency] = useState('USD');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<EnhancedSalaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cacheKey, setCacheKey] = useState<string | null>(null);

  // Generate cache key for current configuration
  const currentCacheKey = useMemo(() => {
    if (!userProfile?.id) return null;

    return salaryCache.generateCacheKey({
      jobId: job.id,
      userId: userProfile.id,
      location: analysisLocation,
      expenseProfile: {
        housing: expenseProfile.housing,
        food: expenseProfile.food,
        transportation: expenseProfile.transportation,
        healthcare: expenseProfile.healthcare,
        utilities: expenseProfile.utilities,
        entertainment: expenseProfile.entertainment,
        savings: expenseProfile.savings,
        other: expenseProfile.other
      },
      workMode: job.workMode,
      currency
    });
  }, [job.id, userProfile?.id, analysisLocation, expenseProfile, job.workMode, currency]);

  // Helper function to extract expense profile from AI analysis
  const extractExpenseProfileFromAnalysis = useCallback((analysisResponse: any) => {
    if (analysisResponse?.expenses?.monthly) {
      const aiExpenses = analysisResponse.expenses.monthly;
      const total = aiExpenses.total || 1; // Prevent division by zero

      setExpenseProfile({
        name: 'AI-Generated',
        housing: Math.round((aiExpenses.housing / total) * 100),
        food: Math.round((aiExpenses.food / total) * 100),
        transportation: Math.round((aiExpenses.transportation / total) * 100),
        healthcare: Math.round((aiExpenses.healthcare / total) * 100),
        utilities: Math.round((aiExpenses.utilities / total) * 100),
        entertainment: Math.round((aiExpenses.entertainment / total) * 100),
        savings: Math.round((aiExpenses.savings / total) * 100),
        other: Math.round((aiExpenses.other / total) * 100)
      });
    }
  }, []);

  // Check if we need to reanalyze based on cache key changes
  useEffect(() => {
    if (currentCacheKey !== cacheKey) {
      setCacheKey(currentCacheKey);
      // Clear previous data when configuration changes
      setAnalysisData(null);
      setError(null);
    }
  }, [currentCacheKey, cacheKey]);

  // Load cached data on mount and when cache key changes
  useEffect(() => {
    if (!currentCacheKey) return;

    const loadCachedData = async () => {
      try {
        const cached = await salaryCache.get<EnhancedSalaryResponse>(currentCacheKey);
        if (cached) {
          setAnalysisData(cached);

          // Extract and set smart expense profile from cached AI analysis
          extractExpenseProfileFromAnalysis(cached);

          console.log('Loaded analysis from cache:', currentCacheKey.substring(0, 8));
        }
      } catch (error) {
        console.warn('Failed to load cached data:', error);
      }
    };

    loadCachedData();
  }, [currentCacheKey, extractExpenseProfileFromAnalysis]);

  // Perform AI analysis
  const performAnalysis = useCallback(async () => {
    if (!token || !analysisLocation.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const request = {
        job: {
          id: job.id,
          title: job.title,
          company: job.company,
          description: job.description || '',
          skills: job.skills || [],
          requirements: job.requirements || [],
          location: job.location,
          workMode: job.workMode,
          salary: job.salary
        },
        userProfile: {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          experienceYears: userProfile.experience_years || 0,
          skills: userProfile.skills || [],
          preferredSalaryRange: {
            min: userProfile.preferred_salary_min,
            max: userProfile.preferred_salary_max
          },
          currentSalary: userProfile.current_salary,
          careerLevel: userProfile.career_level,
          industryExperience: userProfile.industry_experience || []
        },
        analysisLocation,
        expenseProfile: {
          housing: expenseProfile.housing / 100,
          food: expenseProfile.food / 100,
          transportation: expenseProfile.transportation / 100,
          healthcare: expenseProfile.healthcare / 100,
          utilities: expenseProfile.utilities / 100,
          entertainment: expenseProfile.entertainment / 100,
          savings: expenseProfile.savings / 100,
          other: expenseProfile.other / 100
        },
        currency,
        options: {
          includeNegotiationTips: true,
          includeMarketComparison: true,
          includeCareerProgression: true,
          detailedBreakdown: true
        }
      };

      // Check authentication
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const apiResponse = await fetch('/api/salary/enhanced-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.details || errorData.error || 'Analysis failed');
      }

      const { data: response } = await apiResponse.json();
      setAnalysisData(response);

      // Extract and set smart expense profile from AI analysis
      extractExpenseProfileFromAnalysis(response);

      // Cache the result
      if (currentCacheKey) {
        await salaryCache.set(
          currentCacheKey,
          response,
          {
            jobId: job.id,
            userId: userProfile.id,
            location: analysisLocation,
            expenseProfile: expenseProfile.name,
            version: '1.0.0'
          },
          { ttlHours: 24 }
        );
        console.log('Cached analysis result:', currentCacheKey.substring(0, 8));
      }

      toast.success('Salary analysis completed successfully!');
    } catch (error) {
      console.error('Analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed. Please try again.');
      toast.error('Failed to analyze salary data');
    } finally {
      setIsAnalyzing(false);
    }
  }, [job, userProfile, analysisLocation, expenseProfile, currency, currentCacheKey, isAnalyzing, token, extractExpenseProfileFromAnalysis]);

  // Auto-trigger analysis when configuration is complete and no cached data exists
  useEffect(() => {
    if (
      !isAnalyzing &&
      !analysisData &&
      !error &&
      token &&
      analysisLocation.trim() &&
      currentCacheKey
    ) {
      // Small delay to prevent rapid firing
      const timer = setTimeout(() => {
        performAnalysis();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [performAnalysis, isAnalyzing, analysisData, error, token, analysisLocation, currentCacheKey]);

  // Handle location change
  const handleLocationChange = useCallback((location: Location | string) => {
    const locationString = typeof location === 'string' ? location : location.display;
    setAnalysisLocation(locationString);
    onLocationChange?.(locationString);
  }, [onLocationChange]);

  // Handle expense profile change
  const handleExpenseProfileChange = useCallback((newProfile: ExpenseProfile) => {
    setExpenseProfile(newProfile);
    onExpenseProfileChange?.(newProfile);
  }, [onExpenseProfileChange]);

  // Format currency display
  const formatCurrency = useCallback((amount: number | null | undefined, showCurrency = true) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return showCurrency ? `${currency} 0` : '0';
    }
    return new Intl.NumberFormat('en-US', {
      style: showCurrency ? 'currency' : 'decimal',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }, [currency]);

  // Calculate monthly income for expense breakdown
  const monthlyIncome = useMemo(() => {
    if (analysisData?.salary?.estimated?.median) {
      return analysisData.salary.estimated.median / 12;
    }
    if (job.salary?.min && job.salary?.max) {
      return ((job.salary.min + job.salary.max) / 2) / 12;
    }
    // No fallback - return null if no data available
    return null;
  }, [analysisData, job.salary]);

  return (
    <Tabs defaultValue="analysis" className={cn('space-y-6', className)}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="analysis">Salary Analysis</TabsTrigger>
        <TabsTrigger value="net-income">Net Take-Home</TabsTrigger>
        <TabsTrigger value="negotiation">Negotiation Coach</TabsTrigger>
      </TabsList>

      <TabsContent value="analysis" className="space-y-6">
      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog6ToothIcon className="w-5 h-5" />
            Analysis Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Analysis Location
            </label>
            <LocationAutocomplete
              value={analysisLocation}
              onChange={handleLocationChange}
              placeholder="Enter city, state, country..."
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Specify the location for cost-of-living and market analysis
            </p>
          </div>

          {/* Currency Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD (C$)</option>
              <option value="AUD">AUD (A$)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {isAnalyzing && (
        <AIAnalysisLoader
          isLoading={true}
          variant="full"
          showSteps={true}
          customMessage="Analyzing salary data with AI and market intelligence..."
        />
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={performAnalysis}
              className="ml-3"
              disabled={isAnalyzing}
            >
              Retry Analysis
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {analysisData && (
        <div className="space-y-6">
          {/* Salary Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BanknotesIcon className="w-5 h-5" />
                Salary Analysis
                <Badge variant="outline" className="ml-auto">
                  {analysisData?.salary?.estimated?.confidence ? `${Math.round(analysisData.salary.estimated.confidence * 100)}% confidence` : 'Analyzing...'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">
                    {formatCurrency(analysisData?.salary?.estimated?.min)}
                  </div>
                  <div className="text-sm text-blue-600">Minimum</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">
                    {formatCurrency(analysisData?.salary?.estimated?.median)}
                  </div>
                  <div className="text-sm text-green-600">Recommended</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-900">
                    {formatCurrency(analysisData?.salary?.estimated?.max)}
                  </div>
                  <div className="text-sm text-purple-600">Maximum</div>
                </div>
              </div>

              {analysisData.insights?.marketPosition && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{analysisData.insights.marketPosition}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Market Intelligence & Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChartBarIcon className="w-5 h-5" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPinIcon className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-sm text-gray-600">Location Factor</div>
                    <div className="font-semibold">
                      {analysisData.location?.costOfLivingIndex || 100}% of baseline
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ChartBarIcon className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="text-sm text-gray-600">Affordability Score</div>
                    <div className="font-semibold">
                      {analysisData.affordability?.score ? `${analysisData.affordability.score}/3` : 'N/A'} - {analysisData.affordability?.label || 'Unknown'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Market Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPinIcon className="w-5 h-5" />
                  Market Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysisData.salary?.market ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-600">Market Median (P50)</div>
                      <div className="text-lg font-semibold">
                        {formatCurrency(analysisData?.salary?.market?.p50)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Market Range</div>
                      <div className="text-lg font-semibold">
                        {formatCurrency(analysisData?.salary?.market?.p25)} - {formatCurrency(analysisData?.salary?.market?.p90)}
                      </div>
                    </div>
                    <div className="pt-2 text-xs text-blue-600">
                      Source: {analysisData.salary.market.source}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    Market data unavailable
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Insights & Recommendations */}
          {analysisData.insights?.negotiationTips && analysisData.insights.negotiationTips.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5" />
                  AI Insights & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Negotiation Strategy</h4>
                    <div className="grid gap-3">
                      {analysisData.insights.negotiationTips.slice(0, 3).map((tip, index) => (
                        <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-100">
                          <p className="text-sm text-green-800">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {analysisData.insights.careerProgression && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Career Progression</h4>
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                        <p className="text-sm text-purple-800">
                          {analysisData.insights.careerProgression}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}


        </div>
      )}

      {/* Loading skeletons when data is not available */}
      {!isAnalyzing && !analysisData && !error && (
        <div className="space-y-4">
          <SalarySkeletonCard />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BudgetBreakdownSkeleton />
            <MarketInsightsSkeleton />
          </div>
        </div>
      )}
      </TabsContent>

      <TabsContent value="net-income" className="space-y-6">
        {analysisData?.salary?.estimated?.median ? (
          <NetIncomeCalculator
            grossSalary={analysisData.salary.estimated.median}
            location={analysisLocation || job.location || ''}
            workMode={job.workMode as 'onsite' | 'hybrid' | 'remote_country' | 'remote_global' || 'onsite'}
            currency={currency}
            userId={userProfile?.id || ''}
            token={token || ''}
            jobTitle={job.title}
            company={job.company}
          />
        ) : (
          <Alert>
            <InformationCircleIcon className="h-4 w-4" />
            <AlertDescription>
              Please complete the salary analysis first to calculate your net take-home pay.
            </AlertDescription>
          </Alert>
        )}
      </TabsContent>

      <TabsContent value="negotiation" className="space-y-6">
        <AINegotiationCoach
          jobId={job.id}
          jobTitle={job.title}
          company={job.company}
          currentOffer={analysisData?.salary?.estimated ? {
            baseSalary: analysisData.salary.estimated.median,
            bonus: 0,
            equity: undefined,
            benefits: []
          } : undefined}
          location={analysisLocation || job.location || ''}
          workMode={job.workMode || 'onsite'}
          userId={userProfile?.id || ''}
          token={token || ''}
          userHasResume={false} // This should be fetched from user profile
          userHasAdditionalInfo={false} // This should be fetched from user profile
        />
      </TabsContent>
    </Tabs>
  );
}