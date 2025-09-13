'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  BanknotesIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  SparklesIcon,
  CogIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  HomeIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';

interface SalaryIntelligenceResponse {
  schema_version: string;
  methodology_version: string;
  generated_at_utc: string;
  schema_valid: boolean;
  
  normalized_role: string;
  normalized_role_slug: string;
  normalized_level_rank: number;
  level: 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | 'director' | 'unknown';
  experience_years: number | null;
  
  location: {
    city: string | null;
    admin_area: string | null;
    country: string;
    iso_country_code: string;
    lat: number | null;
    lng: number | null;
  };
  job_location_mode: 'onsite' | 'hybrid' | 'remote_country' | 'remote_global';
  
  currency: string;
  fx_used: boolean;
  fx_rate_date: string | null;
  
  listed_salary: {
    min: number | null;
    max: number | null;
    period: 'hour' | 'year';
    basis: 'gross' | 'net';
    data_quality: 'parsed' | 'inferred' | null;
  } | null;
  
  expected_salary_range: {
    min: number | null;
    max: number | null;
    period: 'hour' | 'year';
    basis: 'gross' | 'net';
    data_quality: 'market_calculation' | 'bls_baseline' | 'economic_indicators' | null;
    inference_basis: 'role_level_location' | 'similar_roles' | 'market_average' | 'system_error';
  };
  
  monthly_net_income: number | null;
  monthly_core_expenses: number | null;
  affordability_score: number | null;
  affordability_label: 'unaffordable' | 'tight' | 'comfortable' | 'very_comfortable';
  
  explanations: string[];
  confidence: {
    level: 'low' | 'medium' | 'high';
    reasons: string[];
  };
  sources: string[];
  cache_meta: {
    cache_hits: string[];
    cache_misses: string[];
  };
  
  country_tax_model_version: string;
  tax_method: 'calculation' | 'inference';
  col_model_version: string;
  col_method: 'city' | 'admin_area' | 'country' | 'inference';
  fx_model_version: string;
  
  assumptions: {
    tax_filing_status: string;
    dependents: number;
    housing_type: string;
    household_size: number;
  };
  
  computation_budget: {
    llm_calls: number;
    tool_calls: string;
    early_stop: boolean;
  };
  
  calc_notes: string[];
  validation_errors: string[];
}

interface SalaryIntelligenceHubProps {
  job: {
    id: string;
    title: string;
    company: string;
    location?: string;
    salary?: string;
    workMode?: string;
    contractType?: string;
    skills?: string;
    description?: string;
    [key: string]: any; // Allow additional properties
  };
  onJobUpdate?: (updatedJob: any) => void;
}

export default function SalaryIntelligenceHub({ job, onJobUpdate }: SalaryIntelligenceHubProps) {
  const [analysis, setAnalysis] = useState<SalaryIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState({
    experienceYears: '',
    salaryInfo: job.salary || '',
    currency: 'USD',
    workMode: (job.workMode?.toLowerCase() as any) || 'onsite'
  });
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Auto-trigger analysis on component mount
  useEffect(() => {
    if (job.title && !analysis) {
      handleAnalyze();
    }
  }, [job.title]);

  const handleAnalyze = async () => {
    if (!job.title?.trim()) {
      toast.error('Job title is required for analysis');
      return;
    }

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
        experienceYears: customInput.experienceYears ? parseInt(customInput.experienceYears) : undefined,
        salaryInfo: customInput.salaryInfo?.trim() || undefined,
        currency: customInput.currency,
        workMode: customInput.workMode,
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
      
      if (data.schema_valid) {
        toast.success('Salary intelligence analysis completed');
      } else {
        toast.warning('Analysis completed with validation warnings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      toast.error(`Analysis failed: ${errorMessage}`);
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
      case 'very_comfortable': return 'text-green-700 bg-green-50 border-green-200';
      case 'comfortable': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'tight': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'unaffordable': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const renderLoadingState = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <SparklesIcon className="h-5 w-5 animate-pulse text-blue-600" />
        <span className="text-lg font-medium">Analyzing salary data...</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-2/3 mb-2" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderErrorState = () => (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          <CardTitle className="text-red-800">Analysis Failed</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-red-700 mb-4">{error}</p>
        <Button onClick={handleAnalyze} variant="outline" className="border-red-200 text-red-700 hover:bg-red-100">
          Retry Analysis
        </Button>
      </CardContent>
    </Card>
  );

  const renderInputForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CogIcon className="h-5 w-5" />
          <span>Analysis Parameters</span>
        </CardTitle>
        <CardDescription>
          Customize the salary intelligence analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="experience">Years of Experience</Label>
            <Input
              id="experience"
              type="number"
              placeholder="e.g., 3"
              value={customInput.experienceYears}
              onChange={(e) => setCustomInput({ ...customInput, experienceYears: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="workMode">Work Mode</Label>
            <Select value={customInput.workMode} onValueChange={(value) => setCustomInput({ ...customInput, workMode: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="onsite">On-site</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="remote_country">Remote (Country)</SelectItem>
                <SelectItem value="remote_global">Remote (Global)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <Label htmlFor="salary">Listed Salary (Optional)</Label>
          <Input
            id="salary"
            placeholder="e.g., $80,000 - $120,000 or €70k"
            value={customInput.salaryInfo}
            onChange={(e) => setCustomInput({ ...customInput, salaryInfo: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select value={customInput.currency} onValueChange={(value) => setCustomInput({ ...customInput, currency: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="CAD">CAD ($)</SelectItem>
              <SelectItem value="AUD">AUD ($)</SelectItem>
              <SelectItem value="CHF">CHF</SelectItem>
              <SelectItem value="SEK">SEK</SelectItem>
              <SelectItem value="NOK">NOK</SelectItem>
              <SelectItem value="DKK">DKK</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleAnalyze} disabled={loading} className="w-full">
          {loading ? (
            <>
              <SparklesIcon className="h-4 w-4 mr-2 animate-pulse" />
              Analyzing...
            </>
          ) : (
            <>
              <SparklesIcon className="h-4 w-4 mr-2" />
              Analyze Salary Intelligence
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const renderSalaryOverview = () => {
    if (!analysis) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Expected Salary Range */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <BanknotesIcon className="h-4 w-4 mr-2 text-green-600" />
              Expected Salary Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {analysis.expected_salary_range.min && analysis.expected_salary_range.max 
                ? `${formatCurrency(analysis.expected_salary_range.min, analysis.currency)} - ${formatCurrency(analysis.expected_salary_range.max, analysis.currency)}`
                : 'Not available'
              }
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {typeof analysis.expected_salary_range.period === 'string' ? analysis.expected_salary_range.period : String(analysis.expected_salary_range.period)} • {typeof analysis.expected_salary_range.basis === 'string' ? analysis.expected_salary_range.basis : String(analysis.expected_salary_range.basis)}
            </p>
            {analysis.expected_salary_range.data_quality && (
              <Badge variant="outline" className="mt-2 text-xs">
                {typeof analysis.expected_salary_range.data_quality === 'string' 
                  ? analysis.expected_salary_range.data_quality.replace('_', ' ')
                  : analysis.expected_salary_range.data_quality
                }
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Monthly Net Income */}
        {analysis.monthly_net_income && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <CurrencyDollarIcon className="h-4 w-4 mr-2 text-blue-600" />
                Monthly Net Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(analysis.monthly_net_income, analysis.currency)}
              </div>
              <p className="text-sm text-gray-600 mt-1">After taxes & deductions</p>
            </CardContent>
          </Card>
        )}

        {/* Affordability Score */}
        {analysis.affordability_score !== null && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <ChartBarIcon className="h-4 w-4 mr-2 text-purple-600" />
                Affordability Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <div className="text-2xl font-bold text-purple-700">
                  {analysis.affordability_score.toFixed(1)}
                </div>
                <Badge className={`${getAffordabilityColor(analysis.affordability_label)} border`}>
                  {typeof analysis.affordability_label === 'string' 
                    ? analysis.affordability_label.replace('_', ' ')
                    : analysis.affordability_label
                  }
                </Badge>
              </div>
              <Progress value={Math.max(0, Math.min(100, (analysis.affordability_score + 1) * 25))} className="mt-2" />
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderJobDetails = () => {
    if (!analysis) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Role Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <BriefcaseIcon className="h-5 w-5 mr-2" />
              Role Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-600">Normalized Role</Label>
              <p className="text-lg font-semibold">{analysis.normalized_role}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Level</Label>
                <Badge variant="secondary" className="block w-fit mt-1 capitalize">
                  {analysis.level}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Rank</Label>
                <p className="text-lg font-semibold">{analysis.normalized_level_rank}</p>
              </div>
            </div>
            {analysis.experience_years && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Experience Years</Label>
                <p className="text-lg font-semibold">{analysis.experience_years} years</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <MapPinIcon className="h-5 w-5 mr-2" />
              Location Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-600">Location</Label>
              <p className="text-lg font-semibold">
                {[analysis.location.city, analysis.location.admin_area, analysis.location.country]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Work Mode</Label>
                <Badge variant="outline" className="block w-fit mt-1 capitalize">
                  {typeof analysis.job_location_mode === 'string' 
                    ? analysis.job_location_mode.replace('_', ' ')
                    : analysis.job_location_mode
                  }
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Country Code</Label>
                <p className="text-sm font-mono">{analysis.location.iso_country_code}</p>
              </div>
            </div>
            {analysis.fx_used && (
              <div>
                <Badge variant="secondary" className="text-xs">
                  Currency converted • {analysis.fx_rate_date}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderConfidenceAndSources = () => {
    if (!analysis) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Confidence & Validation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Analysis Confidence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confidence Level</span>
              <Badge className={getConfidenceBadgeColor(analysis.confidence.level)}>
                {analysis.confidence.level.toUpperCase()}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Schema Valid</span>
              {analysis.schema_valid ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600">Confidence Reasons</Label>
              <ul className="text-sm text-gray-600 mt-1 space-y-1">
                {analysis.confidence.reasons.map((reason, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-1 h-1 rounded-full bg-gray-400 mt-2 mr-2 flex-shrink-0" />
                    {typeof reason === 'string' ? reason : String(reason)}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources & Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <InformationCircleIcon className="h-5 w-5 mr-2" />
              Data Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-600">Analysis Methods</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  Tax: {analysis.tax_method}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  COL: {analysis.col_method}
                </Badge>
              </div>
            </div>

            {analysis.sources.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Data Sources</Label>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  {analysis.sources.map((source, index) => (
                    <li key={index} className="flex items-start">
                      <span className="inline-block w-1 h-1 rounded-full bg-gray-400 mt-2 mr-2 flex-shrink-0" />
                      {typeof source === 'string' ? source : (
                        typeof source === 'object' && source && source !== null && 'url_or_name' in source 
                          ? (source as any).url_or_name 
                          : String(source)
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <span>Schema: v{analysis.schema_version}</span>
                <span>Method: v{analysis.methodology_version}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDetailedBreakdown = () => {
    if (!analysis) return null;

    return (
      <div className="space-y-4">
        {/* Explanations */}
        {analysis.explanations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analysis Explanations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.explanations.map((explanation, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mt-1.5 mr-3 flex-shrink-0" />
                    {typeof explanation === 'string' ? explanation : String(explanation)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Assumptions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-2" />
              Calculation Assumptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <Label className="text-gray-600">Filing Status</Label>
                <p className="font-medium capitalize">{typeof analysis.assumptions.tax_filing_status === 'string' ? analysis.assumptions.tax_filing_status : String(analysis.assumptions.tax_filing_status)}</p>
              </div>
              <div>
                <Label className="text-gray-600">Dependents</Label>
                <p className="font-medium">{typeof analysis.assumptions.dependents === 'string' || typeof analysis.assumptions.dependents === 'number' ? analysis.assumptions.dependents : String(analysis.assumptions.dependents)}</p>
              </div>
              <div>
                <Label className="text-gray-600">Housing Type</Label>
                <p className="font-medium">{typeof analysis.assumptions.housing_type === 'string' ? analysis.assumptions.housing_type : String(analysis.assumptions.housing_type)}</p>
              </div>
              <div>
                <Label className="text-gray-600">Household Size</Label>
                <p className="font-medium">{typeof analysis.assumptions.household_size === 'string' || typeof analysis.assumptions.household_size === 'number' ? analysis.assumptions.household_size : String(analysis.assumptions.household_size)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calculation Notes */}
        {analysis.calc_notes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Calculation Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.calc_notes.map((note, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mt-1.5 mr-3 flex-shrink-0" />
                    {typeof note === 'string' ? note : String(note)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Validation Errors */}
        {analysis.validation_errors.length > 0 && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-lg text-red-800 flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                Validation Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.validation_errors.map((error, index) => (
                  <li key={index} className="flex items-start text-sm text-red-700">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-400 mt-1.5 mr-3 flex-shrink-0" />
                    {typeof error === 'string' ? error : String(error)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  if (loading) return renderLoadingState();
  if (error && !analysis) return renderErrorState();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Salary Intelligence</h2>
          <p className="text-gray-600">Advanced salary analysis powered by real market data</p>
        </div>
        {analysis && (
          <Badge variant="secondary" className="text-xs">
            Generated: {new Date(analysis.generated_at_utc).toLocaleString()}
          </Badge>
        )}
      </div>

      <Tabs defaultValue={analysis ? "overview" : "input"} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="input">Analysis Setup</TabsTrigger>
          <TabsTrigger value="overview" disabled={!analysis}>Overview</TabsTrigger>
          <TabsTrigger value="details" disabled={!analysis}>Job Details</TabsTrigger>
          <TabsTrigger value="breakdown" disabled={!analysis}>Detailed Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-6">
          {renderInputForm()}
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          {renderSalaryOverview()}
          {renderConfidenceAndSources()}
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          {renderJobDetails()}
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          {renderDetailedBreakdown()}
        </TabsContent>
      </Tabs>
    </div>
  );
}