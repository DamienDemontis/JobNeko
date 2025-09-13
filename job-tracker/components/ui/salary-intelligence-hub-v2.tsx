'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
// Collapsible component - we'll use a simple implementation
const Collapsible = ({ children, open, onOpenChange }: any) => {
  const [isOpen, setIsOpen] = React.useState(open || false);
  React.useEffect(() => {
    if (onOpenChange) onOpenChange(isOpen);
  }, [isOpen]);
  
  return React.Children.map(children, child => {
    if (child?.type === CollapsibleTrigger) {
      return React.cloneElement(child, { onClick: () => setIsOpen(!isOpen), isOpen });
    }
    if (child?.type === CollapsibleContent) {
      return isOpen ? child : null;
    }
    return child;
  });
};

const CollapsibleTrigger = ({ children, asChild, onClick, isOpen }: any) => {
  if (asChild) {
    return React.cloneElement(React.Children.only(children), { onClick });
  }
  return <div onClick={onClick}>{children}</div>;
};

const CollapsibleContent = ({ children }: any) => {
  return <div className="mt-2">{children}</div>;
};
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  BanknotesIcon,
  MapPinIcon,
  ChartBarIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  HomeIcon,
  UserGroupIcon,
  PencilIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { 
  UserIcon,
  UsersIcon,
  HomeModernIcon 
} from '@heroicons/react/24/solid';

// Types
interface UserProfile {
  currentCity: string;
  currentCountry: string;
  currentState: string;
  familySize: number;
  dependents: number;
  maritalStatus: 'single' | 'married' | 'partnered';
  expectedSalary: number;
  currentSalary: number;
  currencyPreference: string;
  workModePreference: 'remote' | 'hybrid' | 'onsite';
  willingToRelocate: boolean;
}

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  workMode?: string;
  applicationStatus?: string;
  priority?: string;
  extractedAt?: string | Date;
  createdAt?: string | Date;
  activities?: any[];
  [key: string]: any;
}

interface EnhancedSalaryAnalysis {
  jobId: string;
  scenario: 'has_salary' | 'no_salary' | 'remote_job';
  hasData: boolean;
  
  // AI Analysis Results
  aiAnalysis: {
    normalized_role: string;
    level: string;
    experience_years: number | null;
    location: {
      city: string | null;
      country: string;
      iso_country_code: string;
    };
    currency: string;
    expected_salary_range: {
      min: number | null;
      max: number | null;
      period: string;
      basis: string;
    };
    monthly_net_income: number | null;
    monthly_core_expenses: number | null;
    affordability_score: number | null;
    affordability_label: string;
    explanations: string[];
    confidence: {
      level: 'low' | 'medium' | 'high';
      reasons: string[];
    };
  };
  
  // Original job data (simplified)
  originalSalary?: {
    raw: string;
    parsed?: {
      min: number | null;
      max: number | null;
      currency: string;
    };
  };
  
  // Simple recommendations
  recommendations: {
    keyInsights: string[];
    actionItems: string[];
    negotiationAdvice: string[];
  };
  
  // User comparison (if profile available)
  userComparison?: {
    vsExpectedSalary?: {
      percentage: number;
      verdict: string;
    };
    vsCurrentSalary?: {
      percentage: number;
      verdict: string;
    };
    suggestions: string[];
  };
}

interface SalaryIntelligenceHubProps {
  job: Job;
  onJobUpdate?: (job: any) => void;
}

// Major cities for location selector
const MAJOR_CITIES = [
  { value: 'New York, USA', label: 'New York, USA', col: 100 },
  { value: 'San Francisco, USA', label: 'San Francisco, USA', col: 110 },
  { value: 'London, UK', label: 'London, UK', col: 95 },
  { value: 'Berlin, Germany', label: 'Berlin, Germany', col: 75 },
  { value: 'Paris, France', label: 'Paris, France', col: 90 },
  { value: 'Amsterdam, Netherlands', label: 'Amsterdam, Netherlands', col: 85 },
  { value: 'Tokyo, Japan', label: 'Tokyo, Japan', col: 92 },
  { value: 'Singapore, Singapore', label: 'Singapore', col: 98 },
  { value: 'Toronto, Canada', label: 'Toronto, Canada', col: 82 },
  { value: 'Sydney, Australia', label: 'Sydney, Australia', col: 94 },
];

export default function SalaryIntelligenceHubV2({ job, onJobUpdate }: SalaryIntelligenceHubProps) {
  // State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analysis, setAnalysis] = useState<EnhancedSalaryAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [familyContext, setFamilyContext] = useState<'single' | 'couple' | 'family'>('single');
  const [isEditingSalary, setIsEditingSalary] = useState(false);
  const [tempSalaryInput, setTempSalaryInput] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Determine if job is remote
  const isRemoteJob = useMemo(() => {
    return job.workMode === 'remote' || 
           job.location?.toLowerCase().includes('remote') ||
           job.location?.toLowerCase().includes('worldwide');
  }, [job]);
  
  // Fetch user profile on mount
  useEffect(() => {
    fetchUserProfile();
  }, []);
  
  // Fetch analysis when profile or job changes
  useEffect(() => {
    if (profile || !loading) {
      fetchSalaryAnalysis();
    }
  }, [profile, job.id]);
  
  // Debug: Log the analysis data
  useEffect(() => {
    if (analysis) {
      console.log('📊 Salary Analysis Data:', {
        scenario: analysis.scenario,
        originalSalary: analysis.originalSalary,
        marketEstimate: analysis.aiAnalysis?.expected_salary_range,
        livingWage: {
          grossAnnual: (analysis.aiAnalysis?.expected_salary_range?.min || 0),
          netMonthly: analysis.aiAnalysis?.monthly_net_income || 0
        },
        enhancedCalc: analysis.aiAnalysis
      });
    }
  }, [analysis]);
  
  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        
        // Set defaults from profile
        if (data.profile) {
          setFamilyContext(
            data.profile.maritalStatus === 'single' ? 'single' :
            data.profile.dependents > 0 ? 'family' : 'couple'
          );
          
          if (isRemoteJob && data.profile.currentCity && data.profile.currentCountry) {
            setSelectedLocation(`${data.profile.currentCity}, ${data.profile.currentCountry}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSalaryAnalysis = async (overrideLocation?: string) => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }
      
      // Build request params
      const params = new URLSearchParams();
      
      // Add user-selected location for remote jobs
      if (isRemoteJob && (overrideLocation || selectedLocation)) {
        params.append('userLocation', overrideLocation || selectedLocation);
      }
      
      // Add family context
      params.append('familyContext', familyContext);
      
      const response = await fetch(
        `/api/jobs/${job.id}/salary-analysis-enhanced?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
        setError(null);
      } else {
        throw new Error('Failed to fetch analysis');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError('Unable to analyze salary data');
    } finally {
      setUpdating(false);
      setLoading(false);
    }
  };
  
  // Handle location change for remote jobs
  const handleLocationChange = useCallback((newLocation: string) => {
    setSelectedLocation(newLocation);
    fetchSalaryAnalysis(newLocation);
  }, []);
  
  // Handle family context change
  const handleFamilyContextChange = useCallback((context: 'single' | 'couple' | 'family') => {
    setFamilyContext(context);
    fetchSalaryAnalysis();
  }, [selectedLocation]);
  
  // Handle salary edit
  const handleSalaryEdit = async () => {
    if (!tempSalaryInput.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salary: tempSalaryInput,
        }),
      });
      
      if (response.ok) {
        const updatedJob = await response.json();
        onJobUpdate?.(updatedJob);
        setIsEditingSalary(false);
        toast.success('Salary updated successfully');
        fetchSalaryAnalysis();
      }
    } catch (error) {
      toast.error('Failed to update salary');
    }
  };
  
  // Format currency - never returns 'N/A', provides meaningful fallbacks
  const formatCurrency = (amount: number | null | undefined, currency = 'USD') => {
    // Since AI service now guarantees non-null values, provide reasonable fallbacks
    const safeAmount = amount ?? 0;
    if (isNaN(safeAmount) || safeAmount < 0) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(0);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(safeAmount);
  };
  
  // Calculate affordability percentage using AI analysis
  const getAffordabilityPercentage = () => {
    if (!analysis?.aiAnalysis) return 0;
    const affordabilityScore = analysis.aiAnalysis.affordability_score || 0;
    // Convert affordability score (-1 to 3) to percentage (0 to 100)
    return Math.min(100, Math.max(0, ((affordabilityScore + 1) / 4) * 100));
  };
  
  // Get estimated monthly net income from AI analysis
  const getEstimatedMonthlyNet = () => {
    return analysis?.aiAnalysis?.monthly_net_income || null;
  };
  
  // Get living expenses from AI analysis
  const getLivingExpenses = () => {
    return analysis?.aiAnalysis?.monthly_core_expenses || null;
  };
  
  // Get affordability color
  const getAffordabilityColor = (percentage: number) => {
    if (percentage >= 30) return 'text-green-600 bg-green-50';
    if (percentage >= 10) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="h-5 w-5 animate-pulse text-blue-600" />
          <span className="text-lg font-medium">Analyzing salary intelligence...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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
  }
  
  // Error state
  if (error && !analysis) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <Button 
            onClick={() => fetchSalaryAnalysis()} 
            variant="outline" 
            className="mt-4"
          >
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Context Bar - Smart Controls */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Location Selector for Remote Jobs */}
            {isRemoteJob && (
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-gray-600 mb-1">Your Location</Label>
                <Select value={selectedLocation} onValueChange={handleLocationChange}>
                  <SelectTrigger className="bg-white">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select your location" />
                  </SelectTrigger>
                  <SelectContent>
                    {profile?.currentCity && (
                      <SelectItem value={`${profile.currentCity}, ${profile.currentCountry}`}>
                        <span className="font-medium">📍 My Location</span>
                      </SelectItem>
                    )}
                    {MAJOR_CITIES.map((city) => (
                      <SelectItem key={city.value} value={city.value}>
                        <span>{city.label}</span>
                        <span className="text-xs text-gray-500 ml-2">COL: {city.col}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Family Context Toggle */}
            <div>
              <Label className="text-xs text-gray-600 mb-1">Family Status</Label>
              <div className="flex rounded-lg bg-white border">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={familyContext === 'single' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleFamilyContextChange('single')}
                        className="rounded-r-none"
                      >
                        <UserIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Single</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={familyContext === 'couple' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleFamilyContextChange('couple')}
                        className="rounded-none border-x"
                      >
                        <UsersIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Couple</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={familyContext === 'family' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleFamilyContextChange('family')}
                        className="rounded-l-none"
                      >
                        <HomeModernIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Family with Kids</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            {/* Salary Display/Input */}
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-gray-600 mb-1">Salary</Label>
              {job.salary ? (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{job.salary}</span>
                  <Dialog open={isEditingSalary} onOpenChange={setIsEditingSalary}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Salary</DialogTitle>
                        <DialogDescription>
                          Enter the salary information (e.g., &quot;$120,000 - $150,000&quot;)
                        </DialogDescription>
                      </DialogHeader>
                      <Input
                        value={tempSalaryInput}
                        onChange={(e) => setTempSalaryInput(e.target.value)}
                        placeholder="e.g., $120,000 - $150,000"
                      />
                      <Button onClick={handleSalaryEdit}>Save</Button>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <Dialog open={isEditingSalary} onOpenChange={setIsEditingSalary}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Salary
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Salary Information</DialogTitle>
                      <DialogDescription>
                        Enter the salary for this position
                      </DialogDescription>
                    </DialogHeader>
                    <Input
                      value={tempSalaryInput}
                      onChange={(e) => setTempSalaryInput(e.target.value)}
                      placeholder="e.g., $120,000 - $150,000"
                    />
                    <Button onClick={handleSalaryEdit}>Save</Button>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            {/* Confidence Badge */}
            {analysis && analysis.aiAnalysis && (
              <div>
                <Label className="text-xs text-gray-600 mb-1">Confidence</Label>
                <Badge 
                  variant={analysis.aiAnalysis.confidence.level === 'high' ? 'default' : 'secondary'}
                  className="flex items-center gap-1"
                >
                  <CheckCircleIcon className="h-3 w-3" />
                  {analysis.aiAnalysis.confidence.level === 'high' ? 'High' : 
                   analysis.aiAnalysis.confidence.level === 'medium' ? 'Medium' : 'Low'}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Main Content - Only render if we have analysis */}
      {analysis && (
        <>
          {/* Hero Section - Visual Data */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Salary Range Visual */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <BanknotesIcon className="h-4 w-4 mr-2 text-green-600" />
                  Salary Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysis.originalSalary ? (
                  <>
                    <div className="text-2xl font-bold text-green-700">
                      {analysis.originalSalary.parsed?.min && analysis.originalSalary.parsed?.max
                        ? formatCurrency((analysis.originalSalary.parsed.min + analysis.originalSalary.parsed.max) / 2)
                        : 'N/A'
                      }
                    </div>
                    <div className="text-sm text-gray-600">
                      {analysis.originalSalary.parsed?.min && analysis.originalSalary.parsed?.max
                        ? `${formatCurrency(analysis.originalSalary.parsed.min)} - ${formatCurrency(analysis.originalSalary.parsed.max)}`
                        : analysis.originalSalary.raw
                      }
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Annual Salary</div>
                    <Progress 
                      value={50} // Midpoint
                      className="mt-2"
                    />
                  </>
                ) : (
                  <>
                    <div className="text-xl font-bold text-blue-700">
                      {analysis.aiAnalysis?.expected_salary_range?.min && analysis.aiAnalysis?.expected_salary_range?.max
                        ? `${formatCurrency(analysis.aiAnalysis.expected_salary_range.min)} - ${formatCurrency(analysis.aiAnalysis.expected_salary_range.max)}`
                        : 'Not available'
                      }
                    </div>
                    <div className="text-xs text-gray-600">
                      AI Market Estimate (Annual)
                      {analysis.aiAnalysis?.confidence?.level === 'low' && (
                        <span className="text-orange-600 ml-1">• Low confidence</span>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 w-full"
                      onClick={() => setIsEditingSalary(true)}
                    >
                      <PlusIcon className="h-3 w-3 mr-1" />
                      Add Actual Salary for Better Analysis
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Affordability Gauge */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <ChartBarIcon className="h-4 w-4 mr-2 text-blue-600" />
                  Affordability
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const affordabilityPercentage = getAffordabilityPercentage();
                  const monthlyNet = getEstimatedMonthlyNet();
                  const expenses = getLivingExpenses();
                  
                  if (!monthlyNet || !expenses) {
                    return (
                      <div className="text-center py-4">
                        <div className="text-lg font-bold text-gray-400">--</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Add salary for affordability analysis
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="relative">
                      <div className="text-3xl font-bold text-center">
                        {Math.round(affordabilityPercentage)}%
                      </div>
                      <div className="text-xs text-center text-gray-600 mt-1">
                        Affordability Analysis
                        {analysis?.aiAnalysis?.confidence?.level === 'low' && (
                          <div className="text-orange-600 text-xs mt-1">AI analysis - confidence could be improved</div>
                        )}
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Tight</span>
                          <span>Comfortable</span>
                        </div>
                        <div className="h-3 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full relative">
                          <div 
                            className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-white border-2 border-gray-800"
                            style={{ left: `${Math.min(100, Math.max(0, affordabilityPercentage))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
            
            {/* Monthly Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <HomeIcon className="h-4 w-4 mr-2 text-purple-600" />
                  Monthly Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const monthlyNet = getEstimatedMonthlyNet();
                  const expenses = getLivingExpenses();
                  
                  if (monthlyNet && expenses) {
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Net Income</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(monthlyNet)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Expenses</span>
                          <span className="font-medium text-orange-600">
                            {formatCurrency(expenses)}
                          </span>
                        </div>
                        <div className="border-t pt-2 flex justify-between text-sm font-bold">
                          <span>Savings</span>
                          <span className={getAffordabilityColor(getAffordabilityPercentage())}>
                            {formatCurrency(monthlyNet - expenses)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="text-sm text-gray-600 text-center py-4">
                      {job.salary || analysis?.aiAnalysis?.expected_salary_range?.min ? 
                        'Calculating breakdown...' : 'Add salary for breakdown'}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
          
          {/* Key Insights Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Market Position */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Market Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {analysis.aiAnalysis?.confidence?.level === 'high' ? 'Strong' :
                   analysis.aiAnalysis?.confidence?.level === 'medium' ? 'Average' : 'Below Average'}
                </div>
                <Progress 
                  value={
                    analysis.aiAnalysis?.confidence?.level === 'high' ? 75 :
                    analysis.aiAnalysis?.confidence?.level === 'medium' ? 50 : 25
                  } 
                  className="mt-2"
                />
                <p className="text-xs text-gray-600 mt-1">
                  {analysis.recommendations?.negotiationAdvice?.[0] || 'AI-powered negotiation analysis available'}
                </p>
              </CardContent>
            </Card>
            
            {/* Cost of Living */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cost of Living</CardTitle>
              </CardHeader>
              <CardContent>
                {analysis.aiAnalysis?.location ? (
                  <>
                    <div className="text-lg font-bold">
                      {analysis.aiAnalysis.location.city || 'Unknown'}, {analysis.aiAnalysis.location.country}
                    </div>
                    <div className="text-xs text-gray-600">
                      AI Location Analysis
                    </div>
                    {analysis.aiAnalysis.monthly_core_expenses && (
                      <div className="mt-2">
                        <div className="text-sm">Monthly Expenses: {formatCurrency(analysis.aiAnalysis.monthly_core_expenses)}</div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-600">
                    Location data unavailable
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Savings Potential */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Annual Savings</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const monthlyNet = getEstimatedMonthlyNet();
                  const expenses = getLivingExpenses();
                  
                  if (monthlyNet && expenses) {
                    const monthlySavings = monthlyNet - expenses;
                    const annualSavings = monthlySavings * 12;
                    const savingsRate = (monthlySavings / monthlyNet) * 100;
                    
                    return (
                      <>
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(annualSavings)}
                        </div>
                        <div className="text-xs text-gray-600">
                          {Math.round(Math.max(0, savingsRate))}% savings rate
                        </div>
                        <Progress 
                          value={Math.min(100, Math.max(0, savingsRate))} 
                          className="mt-2"
                        />
                      </>
                    );
                  }
                  
                  return (
                    <div className="text-sm text-gray-600 text-center py-2">
                      {job.salary || analysis?.aiAnalysis?.expected_salary_range?.min ? 
                        'Calculating savings...' : 'Add salary for calculation'}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
          
          {/* Expandable Details */}
          <div className="space-y-2">
            {/* Tax Breakdown */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span>Tax & Deductions Breakdown</span>
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card>
                  <CardContent className="pt-4">
                    {(() => {
                      const grossAnnual = analysis?.originalSalary?.parsed?.min && analysis?.originalSalary?.parsed?.max
                        ? (analysis.originalSalary.parsed.min + analysis.originalSalary.parsed.max) / 2
                        : analysis?.aiAnalysis?.expected_salary_range?.min && analysis?.aiAnalysis?.expected_salary_range?.max
                        ? (analysis.aiAnalysis.expected_salary_range.min + analysis.aiAnalysis.expected_salary_range.max) / 2
                        : null;
                      const monthlyNet = getEstimatedMonthlyNet();
                      
                      if (grossAnnual && monthlyNet) {
                        const annualNet = monthlyNet * 12;
                        const taxRate = ((grossAnnual - annualNet) / grossAnnual) * 100;
                        
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Gross Annual</span>
                              <span>{formatCurrency(grossAnnual)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Net Monthly</span>
                              <span>{formatCurrency(monthlyNet)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Net Annual</span>
                              <span>{formatCurrency(annualNet)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>Tax Rate</span>
                              <span>{Math.round(taxRate)}%</span>
                            </div>
                            <div className="text-xs text-gray-600 mt-2">
                              * Estimated based on standard deductions
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="text-sm text-gray-600 text-center py-4">
                          {job.salary || analysis?.aiAnalysis?.expected_salary_range?.min ? 
                            'Calculating taxes...' : 'Tax calculations require salary information'}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
            
            {/* Living Wage Details */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span>Living Wage Analysis</span>
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium">Monthly Analysis</div>
                        <div className="text-lg font-bold">
                          {analysis.aiAnalysis?.monthly_net_income ? 
                            formatCurrency(analysis.aiAnalysis.monthly_net_income * 12) : 'Not available'}
                        </div>
                        <div className="text-xs text-gray-600">
                          {analysis.aiAnalysis?.monthly_net_income ? 
                            `${formatCurrency(analysis.aiAnalysis.monthly_net_income)}/month net` : 'Analysis pending'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Monthly Income</span>
                          <span>{analysis.aiAnalysis?.monthly_net_income ? formatCurrency(analysis.aiAnalysis.monthly_net_income) : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Core Expenses</span>
                          <span>{analysis.aiAnalysis?.monthly_core_expenses ? formatCurrency(analysis.aiAnalysis.monthly_core_expenses) : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span>Affordability</span>
                          <span className={`capitalize ${
                            analysis.aiAnalysis?.affordability_label === 'very_comfortable' ? 'text-green-600' :
                            analysis.aiAnalysis?.affordability_label === 'comfortable' ? 'text-blue-600' :
                            analysis.aiAnalysis?.affordability_label === 'tight' ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {analysis.aiAnalysis?.affordability_label?.replace('_', ' ') || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
            
            {/* Recommendations */}
            {((analysis.recommendations?.keyInsights && analysis.recommendations.keyInsights.length > 0) || 
              (analysis.recommendations?.actionItems && analysis.recommendations.actionItems.length > 0) ||
              (analysis.recommendations?.negotiationAdvice && analysis.recommendations.negotiationAdvice.length > 0)) && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span>Personalized Recommendations</span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        {/* Key Insights */}
                        {analysis.recommendations?.keyInsights && analysis.recommendations.keyInsights.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-800 mb-2">Key Insights</h4>
                            <ul className="space-y-1">
                              {analysis.recommendations.keyInsights.map((insight, index) => (
                                <li key={`insight-${index}`} className="flex items-start text-sm">
                                  <InformationCircleIcon className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                                  <span>{insight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Action Items */}
                        {analysis.recommendations?.actionItems && analysis.recommendations.actionItems.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-800 mb-2">Action Items</h4>
                            <ul className="space-y-1">
                              {analysis.recommendations.actionItems.map((action, index) => (
                                <li key={`action-${index}`} className="flex items-start text-sm">
                                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Negotiation Tips */}
                        {analysis.recommendations?.negotiationAdvice?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-800 mb-2">Negotiation Tips</h4>
                            <ul className="space-y-1">
                              {analysis.recommendations.negotiationAdvice.map((tip, index) => (
                                <li key={`tip-${index}`} className="flex items-start text-sm">
                                  <SparklesIcon className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </>
      )}
      
      {/* Updating overlay */}
      {updating && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-5 w-5 animate-pulse text-blue-600" />
                <span>Updating analysis...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}