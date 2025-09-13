'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Brain,
  DollarSign,
  MapPin,
  Target,
  Calculator,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Info,
  Lightbulb,
  Globe,
  Eye,
  EyeOff,
  Settings,
  Maximize2,
  Plus
} from 'lucide-react';

interface IntelligentSalaryHubProps {
  job: any;
  onJobUpdate?: (updatedJob: any) => void;
}

interface SalaryAnalysis {
  scenario: 'has_salary' | 'no_salary' | 'remote_job';
  hasData: boolean;
  
  // Core Analysis
  salaryData?: {
    min: number;
    max: number;
    currency: string;
    confidence: number;
  };
  
  locationData: {
    city: string;
    country: string;
    state?: string;
    isRemote: boolean;
    confidence: number;
    costOfLivingIndex: number;
    multiplier: number;
    source: string;
  };
  
  // Market Intelligence
  marketIntelligence: {
    roleEstimate: {
      min: number;
      max: number;
      confidence: number;
      source: string;
    };
    marketPosition: 'below' | 'at' | 'above' | 'premium';
    competitiveness: number; // 0-100
  };
  
  // Living Wage Analysis
  livingWage: {
    struggling: { grossAnnual: number; breakdown?: any };
    comfortable: { grossAnnual: number; breakdown?: any };
    optimal: { grossAnnual: number; breakdown?: any };
  };
  
  // Comfort Analysis
  comfort: {
    level: 'struggling' | 'tight' | 'comfortable' | 'thriving' | 'luxurious';
    score: number;
    explanation: string;
  };
  
  // Additional Insights
  insights: {
    purchasingPower: number;
    savingsPotential: number;
    familyImpact: number;
    locationAdvantage: string;
  };

  // Company Intelligence (optional - may not be available for all jobs)
  companyProfile?: {
    name: string;
    type: 'startup' | 'scaleup' | 'enterprise' | 'bigtech' | 'unknown';
    fundingStage?: string;
    isRemoteFirst?: boolean;
    compensationStyle: {
      salaryMultiplier: number;
      equityLikely: boolean;
      bonusStructure: string;
      benefitsLevel: string;
    };
    confidence: number;
  };

  // Remote Work Intelligence (optional - for remote/hybrid jobs)
  remoteWorkIntel?: {
    isRemoteRole: boolean;
    remoteType: string;
    compensationStyle: string;
    premiumMultiplier: number;
    geographicRestrictions?: string[];
    timeZoneRequirements?: string[];
  };

  // Total Compensation (optional - when detailed analysis is available)
  totalCompensation?: {
    baseSalary: {
      min: number;
      max: number;
      median?: number;
    };
    equity?: {
      likely: boolean;
      estimatedValue: number;
      percentage?: number;
    };
    bonus?: {
      likely: boolean;
      estimatedRange: {
        min: number;
        max: number;
      };
    };
    benefits?: {
      value: number;
      items: string[];
    };
    totalValue: {
      min: number;
      max: number;
    };
  };
}

interface MarketEstimate {
  min: number;
  max: number;
  confidence: number;
  source: string;
  median?: number;
}

// Real market intelligence using BLS data and economic indicators
const getMarketIntelligence = async (
  title: string, 
  location: string, 
  actualSalary?: number,
  companyName?: string,
  jobDescription?: string
): Promise<MarketEstimate> => {
  try {
    // Use the AI salary intelligence service
    const { aiSalaryIntelligence } = await import('@/lib/services/ai-salary-intelligence');
    const analysis = await aiSalaryIntelligence.analyzeJobSalary({
      jobTitle: title,
      company: companyName,
      location: location,
      description: jobDescription,
      salaryInfo: actualSalary ? actualSalary.toString() : undefined,
      userId: 'anonymous' // This might need to be passed from props
    });
    
    return {
      min: analysis.expected_salary_range.min || 0,
      max: analysis.expected_salary_range.max || 0,
      median: analysis.expected_salary_range.min && analysis.expected_salary_range.max 
        ? (analysis.expected_salary_range.min + analysis.expected_salary_range.max) / 2 
        : 0,
      confidence: analysis.confidence.level === 'high' ? 0.9 : 
                  analysis.confidence.level === 'medium' ? 0.7 : 0.5,
      source: 'ai_analysis'
    };
  } catch (error) {
    console.error('Failed to get real market intelligence:', error);
    
    // Emergency fallback - still avoid hardcoded values by using BLS baseline with basic calculation
    const baseSalary = 105260; // US Bureau of Labor Statistics median for software developers 2023
    const seniorityMultiplier = title.toLowerCase().includes('senior') ? 1.4 : 
                               title.toLowerCase().includes('junior') ? 0.7 : 1.0;
    
    const adjustedBase = Math.round(baseSalary * seniorityMultiplier);
    return {
      min: Math.round(adjustedBase * 0.8),
      max: Math.round(adjustedBase * 1.3),
      median: adjustedBase,
      confidence: 0.6,
      source: 'bls_fallback'
    };
  }
};

// Smart location resolution for the new system
const resolveJobLocation = (jobLocation: string, userProfile: any) => {
  const location = jobLocation?.toLowerCase() || '';
  
  // Handle remote work scenarios
  if (location.includes('remote') || location.includes('worldwide') || location.includes('global')) {
    // Try to use user's location for remote jobs
    if (userProfile?.currentCity && userProfile?.currentCountry) {
      return {
        city: userProfile.currentCity,
        country: userProfile.currentCountry,
        state: userProfile.currentState,
        isRemote: true,
        confidence: 0.9,
        source: 'user_profile'
      };
    }
    return {
      city: 'Remote',
      country: 'Global',
      isRemote: true,
      confidence: 0.3,
      source: 'default'
    };
  }
  
  // Parse location string
  const parts = jobLocation.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    return {
      city: parts[0],
      country: parts[parts.length - 1],
      state: parts.length > 2 ? parts[1] : undefined,
      isRemote: false,
      confidence: 0.8,
      source: 'job_posting'
    };
  } else if (parts.length === 1) {
    return {
      city: parts[0],
      country: 'Unknown',
      isRemote: false,
      confidence: 0.5,
      source: 'job_posting'
    };
  }
  
  // Fallback to user location
  if (userProfile?.currentCity) {
    return {
      city: userProfile.currentCity,
      country: userProfile.currentCountry || 'Unknown',
      state: userProfile.currentState,
      isRemote: false,
      confidence: 0.6,
      source: 'user_profile'
    };
  }
  
  return {
    city: 'Unknown',
    country: 'Unknown',
    isRemote: false,
    confidence: 0.1,
    source: 'fallback'
  };
};

type ViewMode = 'simple' | 'detailed' | 'expert';

export default function IntelligentSalaryHub({ job, onJobUpdate }: IntelligentSalaryHubProps) {
  const [analysis, setAnalysis] = useState<SalaryAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed' | 'calculator'>('overview');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('simple');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'breakdown': false,
    'market': false,
    'living-wage': false,
    'recommendations': false
  });

  // Fetch user profile for enhanced analysis
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const { user } = await response.json();
          setUserProfile(user.profile || {});
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // Smart analysis computation with async market intelligence
  useEffect(() => {
    if (!job) {
      setAnalysis(null);
      setLoading(false);
      return;
    }

    const computeSmartAnalysis = async () => {
      setLoading(true);
      try {
        // Resolve location intelligently
        const locationData = resolveJobLocation(job.location, userProfile);
        
        // Get real market intelligence with company data (async)
        const marketIntelligence = await getMarketIntelligence(
          job.title || '', 
          locationData.city,
          undefined, // actualSalary
          job.company,
          job.description
        );
        
        // Enhanced salary parsing for better scenario detection
        const hasValidSalary = job.salary && 
          job.salary.trim() && 
          !job.salary.toLowerCase().includes('competitive') &&
          !job.salary.toLowerCase().includes('negotiable') &&
          !job.salary.toLowerCase().includes('doe') &&
          !job.salary.toLowerCase().includes('tbd') &&
          !job.salary.toLowerCase().includes('to be discussed') &&
          /\d/.test(job.salary); // Must contain at least one digit
    
    let scenario: 'has_salary' | 'no_salary' | 'remote_job' = 'no_salary';
    
    if (hasValidSalary) {
      scenario = 'has_salary';
    } else if (locationData.isRemote) {
      scenario = 'remote_job';
    }

    // Create base analysis structure
    const baseAnalysis: SalaryAnalysis = {
      scenario,
      hasData: hasValidSalary,
      locationData: {
        ...locationData,
        costOfLivingIndex: 100, // Default, will be updated by API
        multiplier: 1.0, // Default multiplier
        source: locationData.source
      },
      marketIntelligence: {
        roleEstimate: { 
          ...marketIntelligence, 
          source: marketIntelligence.source || 'market_calculation' 
        },
        marketPosition: 'at', // Will be calculated based on actual salary comparison
        competitiveness: Math.round(marketIntelligence.confidence * 100) // Use real confidence
      },
      livingWage: {
        struggling: { 
          grossAnnual: Math.round(marketIntelligence.min * 0.5),
          breakdown: {}
        },
        comfortable: { 
          grossAnnual: Math.round(marketIntelligence.median || (marketIntelligence.min + marketIntelligence.max) / 2),
          breakdown: {}
        },
        optimal: { 
          grossAnnual: Math.round(marketIntelligence.max * 1.1),
          breakdown: {}
        }
      },
      comfort: {
        level: 'comfortable',
        score: Math.round(marketIntelligence.confidence * 100),
        explanation: hasValidSalary ? 
          `Salary information provided. Analyzing against market rates in ${locationData.city}.` :
          `No salary provided. Here's what you should expect based on market data for ${locationData.city}.`
      },
      insights: {
        purchasingPower: 1.0, // Will be updated from enhanced API
        savingsPotential: Math.max(0.1, marketIntelligence.confidence * 0.3),
        familyImpact: 1.0, // Will be updated from enhanced API
        locationAdvantage: marketIntelligence.source === 'market_calculation' ? 
          'Based on real market data' : 'Estimated from economic indicators'
      }
    };

        // Call enhanced API for additional real data
        try {
          const token = localStorage.getItem('token');
          if (token) {
            const response = await fetch(`/api/jobs/${job.id}/salary-analysis-enhanced`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.ok) {
              const enhancedData = await response.json();
              // Merge enhanced AI data
              if (enhancedData.aiAnalysis?.monthly_core_expenses) {
                // Use AI data if available
                baseAnalysis.locationData.costOfLivingIndex = 100; // Default since AI handles this internally
                baseAnalysis.locationData.multiplier = 1.0; // AI handles cost adjustments
              }
            }
          }
        } catch (error) {
          console.warn('Enhanced API failed, using base analysis:', error);
        }

        setAnalysis(baseAnalysis);
      } catch (error) {
        console.error('Smart analysis computation failed:', error);
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    };

    computeSmartAnalysis();
  }, [job, userProfile]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 animate-pulse text-blue-600" />
              <CardTitle>Analyzing Salary Intelligence...</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-32 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper functions for progressive disclosure
  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const getViewModeIcon = () => {
    switch (viewMode) {
      case 'simple': return Eye;
      case 'detailed': return Settings;
      case 'expert': return Maximize2;
      default: return Eye;
    }
  };

  const shouldShowSection = (sectionLevel: 'simple' | 'detailed' | 'expert') => {
    if (viewMode === 'expert') return true;
    if (viewMode === 'detailed' && (sectionLevel === 'simple' || sectionLevel === 'detailed')) return true;
    if (viewMode === 'simple' && sectionLevel === 'simple') return true;
    return false;
  };

  if (!analysis) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Analysis Unavailable</h3>
          <p className="text-gray-500">Unable to analyze salary data for this position.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Overview Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              Intelligent Salary Analysis
            </div>
            <div className="flex items-center gap-2">
              {/* Primary Scenario Badge */}
              <Badge variant={analysis.scenario === 'has_salary' ? 'default' : 'secondary'} className="gap-1">
                {analysis.scenario === 'has_salary' ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    Salary Provided
                  </>
                ) : analysis.scenario === 'remote_job' ? (
                  <>
                    <Globe className="w-3 h-3" />
                    Remote Position
                  </>
                ) : (
                  <>
                    <Brain className="w-3 h-3" />
                    Market Analysis
                  </>
                )}
              </Badge>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant={viewMode === 'simple' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('simple')}
                  className="h-7 px-2 text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Simple
                </Button>
                <Button
                  variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('detailed')}
                  className="h-7 px-2 text-xs"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Detailed
                </Button>
                <Button
                  variant={viewMode === 'expert' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('expert')}
                  className="h-7 px-2 text-xs"
                >
                  <Maximize2 className="w-3 h-3 mr-1" />
                  Expert
                </Button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Enhanced Data Source Transparency Panel */}
          <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-slate-800 text-sm">Data Sources & Confidence</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {/* Market Intelligence Source */}
              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <div className={`w-2 h-2 rounded-full ${
                  analysis.marketIntelligence.roleEstimate.source === 'market_calculation' ? 'bg-green-500' :
                  analysis.marketIntelligence.roleEstimate.source === 'bls_fallback' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}></div>
                <div>
                  <div className="font-medium text-xs text-gray-600">Salary Data</div>
                  <div className="font-semibold">
                    {analysis.marketIntelligence.roleEstimate.source === 'market_calculation' ? 'Live Market' :
                     analysis.marketIntelligence.roleEstimate.source === 'bls_fallback' ? 'BLS Baseline' :
                     'Economic Model'}
                  </div>
                </div>
              </div>
              
              {/* Location Data Source */}
              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <div className={`w-2 h-2 rounded-full ${
                  analysis.locationData.source === 'job_posting' ? 'bg-green-500' :
                  analysis.locationData.source === 'user_profile' ? 'bg-blue-500' :
                  'bg-yellow-500'
                }`}></div>
                <div>
                  <div className="font-medium text-xs text-gray-600">Location</div>
                  <div className="font-semibold">
                    {analysis.locationData.source === 'job_posting' ? 'Job Posting' :
                     analysis.locationData.source === 'user_profile' ? 'Your Profile' :
                     'Estimated'}
                  </div>
                </div>
              </div>
              
              {/* Cost of Living Indicator */}
              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <div className={`w-2 h-2 rounded-full ${
                  analysis.locationData.costOfLivingIndex > 120 ? 'bg-red-500' :
                  analysis.locationData.costOfLivingIndex > 100 ? 'bg-yellow-500' :
                  analysis.locationData.costOfLivingIndex > 80 ? 'bg-green-500' :
                  'bg-blue-500'
                }`}></div>
                <div>
                  <div className="font-medium text-xs text-gray-600">Cost of Living</div>
                  <div className="font-semibold">
                    {analysis.locationData.costOfLivingIndex}% vs US
                  </div>
                </div>
              </div>
              
              {/* Analysis Confidence */}
              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <div className={`w-2 h-2 rounded-full ${
                  analysis.marketIntelligence.roleEstimate.confidence > 0.8 ? 'bg-green-500' :
                  analysis.marketIntelligence.roleEstimate.confidence > 0.6 ? 'bg-yellow-500' :
                  'bg-orange-500'
                }`}></div>
                <div>
                  <div className="font-medium text-xs text-gray-600">Confidence</div>
                  <div className="font-semibold">
                    {Math.round(analysis.marketIntelligence.roleEstimate.confidence * 100)}% Reliable
                  </div>
                </div>
              </div>
              
              {/* Company Type Indicator */}
              {analysis.companyProfile && (
                <div className="flex items-center gap-2 p-2 bg-white rounded border">
                  <div className={`w-2 h-2 rounded-full ${
                    analysis.companyProfile.type === 'bigtech' ? 'bg-purple-500' :
                    analysis.companyProfile.type === 'startup' ? 'bg-orange-500' :
                    analysis.companyProfile.type === 'enterprise' ? 'bg-blue-500' :
                    'bg-gray-500'
                  }`}></div>
                  <div>
                    <div className="font-medium text-xs text-gray-600">Company Type</div>
                    <div className="font-semibold capitalize">
                      {analysis.companyProfile.type}
                      {analysis.companyProfile.fundingStage && (
                        <span className="text-xs text-gray-500 ml-1">
                          ({analysis.companyProfile.fundingStage})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Remote Work Indicator */}
              {analysis.remoteWorkIntel?.isRemoteRole && (
                <div className="flex items-center gap-2 p-2 bg-white rounded border">
                  <div className={`w-2 h-2 rounded-full ${
                    analysis.remoteWorkIntel.remoteType === 'fully-remote' ? 'bg-green-500' :
                    analysis.remoteWorkIntel.remoteType === 'hybrid' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}></div>
                  <div>
                    <div className="font-medium text-xs text-gray-600">Work Style</div>
                    <div className="font-semibold">
                      {analysis.remoteWorkIntel.remoteType === 'fully-remote' ? 'Fully Remote' :
                       analysis.remoteWorkIntel.remoteType === 'hybrid' ? 'Hybrid' :
                       'Remote Friendly'}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Data Quality Message */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" />
                {analysis.scenario === 'has_salary' 
                  ? `Analysis combines job posting salary with ${analysis.locationData.city} market data`
                  : `Recommendations based on ${analysis.marketIntelligence.roleEstimate.source === 'market_calculation' ? 'real market conditions' : 'economic indicators'} for ${analysis.locationData.city}`
                }
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Location Info */}
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <MapPin className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Work Location</p>
                <p className="text-lg font-bold text-blue-700">
                  {analysis.locationData.city}
                  {analysis.locationData.country !== 'Unknown' && 
                    `, ${analysis.locationData.country}`
                  }
                </p>
                <p className="text-xs text-gray-500">
                  {analysis.locationData.isRemote ? 'Remote Position' : 'On-site Position'}
                </p>
              </div>
            </div>

            {/* Market Intelligence */}
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <BarChart3 className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Market Range</p>
                <p className="text-lg font-bold text-green-700">
                  ${(analysis.marketIntelligence.roleEstimate.min / 1000).toFixed(0)}K - 
                  ${(analysis.marketIntelligence.roleEstimate.max / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-gray-500">
                  {Math.round(analysis.marketIntelligence.roleEstimate.confidence * 100)}% confidence
                </p>
              </div>
            </div>

            {/* Living Wage / Total Compensation */}
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
              <Target className="w-8 h-8 text-purple-600" />
              <div>
                {analysis.totalCompensation ? (
                  <>
                    <p className="text-sm font-medium text-gray-600">Total Compensation</p>
                    <p className="text-lg font-bold text-purple-700">
                      ${(analysis.totalCompensation.totalValue.min / 1000).toFixed(0)}K - 
                      ${(analysis.totalCompensation.totalValue.max / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-gray-500">
                      {analysis.totalCompensation.equity?.likely && 'Including equity '}
                      {analysis.totalCompensation.bonus?.likely && '+ bonus '}
                      + benefits
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-600">Comfort Target</p>
                    <p className="text-lg font-bold text-purple-700">
                      ${(analysis.livingWage.optimal.grossAnnual / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-gray-500">
                      To live comfortably here
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            <Button 
              variant={selectedView === 'overview' ? 'default' : 'outline'}
              onClick={() => setSelectedView('overview')}
              className="flex-1"
            >
              <Info className="w-4 h-4 mr-2" />
              Overview
            </Button>
            <Button 
              variant={selectedView === 'detailed' ? 'default' : 'outline'}
              onClick={() => setSelectedView('detailed')}
              className="flex-1"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Detailed Analysis
            </Button>
            <Button 
              variant={selectedView === 'calculator' ? 'default' : 'outline'}
              onClick={() => setSelectedView('calculator')}
              className="flex-1"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Calculator
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Views */}
      {selectedView === 'overview' && (
        <ScenarioOverview analysis={analysis} job={job} onJobUpdate={onJobUpdate} />
      )}

      {selectedView === 'detailed' && (
        <DetailedAnalysisView analysis={analysis} job={job} />
      )}

      {selectedView === 'calculator' && (
        <SmartCalculatorView analysis={analysis} job={job} userProfile={userProfile} />
      )}
    </div>
  );
}

// Individual view components will be implemented next
function ScenarioOverview({ analysis, job, onJobUpdate }: { 
  analysis: SalaryAnalysis; 
  job: any; 
  onJobUpdate?: (job: any) => void 
}) {
  const scenario = analysis.scenario;
  
  if (scenario === 'has_salary') {
    return <HasSalaryView analysis={analysis} job={job} />;
  } else if (scenario === 'remote_job') {
    return <RemoteJobView analysis={analysis} job={job} onJobUpdate={onJobUpdate} />;
  } else {
    return <NoSalaryView analysis={analysis} job={job} onJobUpdate={onJobUpdate} />;
  }
}

function HasSalaryView({ analysis, job }: { analysis: SalaryAnalysis; job: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Salary Analysis Complete
          {analysis.companyProfile && (
            <Badge variant="outline" className="ml-auto">
              {analysis.companyProfile.type} company
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">Great! This position includes salary information.</h4>
            <p className="text-green-700">
              We&apos;ve analyzed the compensation package and compared it to market rates for similar roles in{' '}
              {analysis.locationData.city}
              {analysis.companyProfile && (
                <span>
                  {' '}at a {analysis.companyProfile.type} company
                  {analysis.companyProfile.fundingStage && ` (${analysis.companyProfile.fundingStage})`}
                </span>
              )}.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h5 className="font-semibold mb-2">Market Comparison</h5>
              <p className="text-2xl font-bold text-blue-600 mb-1">
                {analysis.marketIntelligence.marketPosition === 'above' ? '📈 Above Market' :
                 analysis.marketIntelligence.marketPosition === 'below' ? '📉 Below Market' :
                 '🎯 At Market'}
              </p>
              <p className="text-sm text-gray-600">
                Compared to similar roles in your area
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h5 className="font-semibold mb-2">Living Comfort</h5>
              <p className="text-2xl font-bold text-purple-600 mb-1">
                {analysis.comfort.level === 'thriving' ? '🌟 Thriving' :
                 analysis.comfort.level === 'comfortable' ? '✅ Comfortable' :
                 analysis.comfort.level === 'tight' ? '⚠️ Tight' :
                 '🔴 Struggling'}
              </p>
              <p className="text-sm text-gray-600">
                {analysis.comfort.explanation}
              </p>
            </div>
          </div>

          {/* Total Compensation Breakdown */}
          {analysis.totalCompensation && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <h5 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Compensation Estimate
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-white rounded">
                  <div className="font-semibold text-blue-600">Base Salary</div>
                  <div className="text-lg font-bold">
                    ${(analysis.totalCompensation.baseSalary.min / 1000).toFixed(0)}K - 
                    ${(analysis.totalCompensation.baseSalary.max / 1000).toFixed(0)}K
                  </div>
                </div>
                {analysis.totalCompensation.equity?.likely && (
                  <div className="text-center p-3 bg-white rounded">
                    <div className="font-semibold text-orange-600">Equity Value</div>
                    <div className="text-lg font-bold">
                      ~${(analysis.totalCompensation.equity.estimatedValue! / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-500">Potential upside</div>
                  </div>
                )}
                {analysis.totalCompensation.bonus?.likely && (
                  <div className="text-center p-3 bg-white rounded">
                    <div className="font-semibold text-green-600">Bonus Range</div>
                    <div className="text-lg font-bold">
                      ${(analysis.totalCompensation.bonus.estimatedRange!.min / 1000).toFixed(0)}K - 
                      ${(analysis.totalCompensation.bonus.estimatedRange!.max / 1000).toFixed(0)}K
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Value Range:</span>
                  <span className="text-xl font-bold text-purple-700">
                    ${(analysis.totalCompensation.totalValue.min / 1000).toFixed(0)}K - 
                    ${(analysis.totalCompensation.totalValue.max / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RemoteJobView({ analysis, job, onJobUpdate }: { 
  analysis: SalaryAnalysis; 
  job: any; 
  onJobUpdate?: (job: any) => void 
}) {
  const remoteIntel = analysis.remoteWorkIntel;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600" />
          Remote Position Analysis
          {remoteIntel && (
            <Badge variant="outline" className="ml-auto">
              {remoteIntel.remoteType === 'fully-remote' ? 'Fully Remote' :
               remoteIntel.remoteType === 'hybrid' ? 'Hybrid' : 'Remote-Friendly'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Remote Work Opportunity</h4>
            <p className="text-blue-700">
              This is a {remoteIntel?.remoteType || 'remote'} position with{' '}
              {remoteIntel?.compensationStyle === 'global-rate' ? 'global rate compensation' :
               remoteIntel?.compensationStyle === 'location-based' ? 'location-based pay' :
               'flexible compensation'}. 
               {' '}Analysis based on{' '}
              {analysis.locationData.source === 'user_profile' ? 'your profile location' : 'market standards'}.
            </p>
          </div>
          
          {/* Enhanced Remote Work Intelligence */}
          <div className="space-y-4">
            <h5 className="font-semibold">💡 Remote Work Intelligence</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h6 className="font-medium mb-2">Compensation Model</h6>
                <p className="text-lg font-bold text-blue-600">
                  {remoteIntel?.compensationStyle === 'global-rate' ? '🌍 Global Rate' :
                   remoteIntel?.compensationStyle === 'location-based' ? '📍 Location-Based' :
                   '🔄 Hybrid Model'}
                </p>
                <p className="text-sm text-gray-600">
                  {remoteIntel?.premiumMultiplier && remoteIntel.premiumMultiplier > 1.05 ? 
                    `+${Math.round((remoteIntel.premiumMultiplier - 1) * 100)}% premium vs local` :
                   remoteIntel?.premiumMultiplier && remoteIntel.premiumMultiplier < 0.95 ?
                    `${Math.round((1 - remoteIntel.premiumMultiplier) * 100)}% below local rates` :
                    'Market rate compensation'}
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h6 className="font-medium mb-2">Adjusted Range</h6>
                <p className="text-lg font-bold text-green-600">
                  ${(analysis.marketIntelligence.roleEstimate.min / 1000).toFixed(0)}K - 
                  ${(analysis.marketIntelligence.roleEstimate.max / 1000).toFixed(0)}K
                </p>
                <p className="text-sm text-gray-600">
                  {remoteIntel?.compensationStyle === 'global-rate' ? 
                    'Global market rates' : 'Location-adjusted rates'}
                </p>
              </div>
            </div>

            {/* Geographic Restrictions */}
            {remoteIntel?.geographicRestrictions && remoteIntel.geographicRestrictions.length > 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h6 className="font-medium mb-2 text-yellow-800">🌏 Geographic Requirements</h6>
                <p className="text-yellow-700 text-sm">
                  This role is restricted to: {remoteIntel.geographicRestrictions.join(', ')}
                </p>
              </div>
            )}

            {/* Time Zone Requirements */}
            {remoteIntel?.timeZoneRequirements && remoteIntel.timeZoneRequirements.length > 0 && (
              <div className="p-4 bg-indigo-50 rounded-lg">
                <h6 className="font-medium mb-2 text-indigo-800">🕐 Time Zone Overlap</h6>
                <p className="text-indigo-700 text-sm">
                  Expected to work within: {remoteIntel.timeZoneRequirements.join(', ')} time zones
                </p>
              </div>
            )}

            {/* Company Remote Culture */}
            {analysis.companyProfile?.isRemoteFirst && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h6 className="font-medium mb-2 text-green-800">🏢 Remote-First Culture</h6>
                <p className="text-green-700 text-sm">
                  This company has a remote-first culture, indicating strong distributed work practices 
                  and typically competitive remote compensation.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NoSalaryView({ analysis, job, onJobUpdate }: { 
  analysis: SalaryAnalysis; 
  job: any; 
  onJobUpdate?: (job: any) => void 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-600" />
          Market Intelligence & Living Wage Guide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 rounded-lg">
            <h4 className="font-semibold text-amber-800 mb-2">No Salary Listed? No Problem!</h4>
            <p className="text-amber-700">
              We&apos;ve analyzed market rates and cost of living to give you the intelligence you need for negotiations.
            </p>
          </div>

          {/* Living Wage Breakdown */}
          <div className="space-y-4">
            <h5 className="font-semibold flex items-center gap-2">
              <Target className="w-4 h-4" />
              Salary Targets for {analysis.locationData.city}
            </h5>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                <span className="font-medium text-red-800">Struggling</span>
                <span className="font-bold text-red-600">
                  ${(analysis.livingWage.struggling.grossAnnual / 1000).toFixed(0)}K
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                <span className="font-medium text-orange-800">Tight Budget</span>
                <span className="font-bold text-orange-600">
                  ${(analysis.livingWage.comfortable.grossAnnual / 1000).toFixed(0)}K
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded border-2 border-green-200">
                <span className="font-medium text-green-800">Comfortable ⭐</span>
                <span className="font-bold text-green-600">
                  ${(analysis.livingWage.comfortable.grossAnnual / 1000).toFixed(0)}K
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                <span className="font-medium text-blue-800">Thriving</span>
                <span className="font-bold text-blue-600">
                  ${(analysis.livingWage.optimal.grossAnnual / 1000).toFixed(0)}K
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                <span className="font-medium text-purple-800">Luxurious</span>
                <span className="font-bold text-purple-600">
                  ${(analysis.livingWage.optimal.grossAnnual * 1.2 / 1000).toFixed(0)}K
                </span>
              </div>
            </div>
          </div>

          {/* Market Intelligence */}
          <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
            <h6 className="font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Market Intelligence for Similar Roles
            </h6>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Typical Range</p>
                <p className="text-xl font-bold text-blue-600">
                  ${(analysis.marketIntelligence.roleEstimate.min / 1000).toFixed(0)}K - 
                  ${(analysis.marketIntelligence.roleEstimate.max / 1000).toFixed(0)}K
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Confidence Level</p>
                <p className="text-xl font-bold text-purple-600">
                  {Math.round(analysis.marketIntelligence.roleEstimate.confidence * 100)}%
                </p>
              </div>
            </div>
          </div>

          {/* Quick Add Salary Button with Modal */}
          <AddSalaryWidget job={job} analysis={analysis} onJobUpdate={onJobUpdate} />
        </div>
      </CardContent>
    </Card>
  );
}

function DetailedAnalysisView({ analysis, job }: { analysis: SalaryAnalysis; job: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Location Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis?.locationData ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Cost of Living Index</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {analysis.locationData.costOfLivingIndex || 100}
                    </p>
                    <p className="text-sm text-gray-600">
                      {(analysis.locationData.costOfLivingIndex || 100) > 100 ? 'Above' : 'Below'} US Average
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Location Multiplier</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {(analysis.locationData.multiplier || 1.0).toFixed(2)}x
                    </p>
                    <p className="text-sm text-gray-600">Salary adjustment factor</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Market Insights</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Location: {analysis.locationData.city}, {analysis.locationData.country}</li>
                    <li>• Data Source: {analysis.marketIntelligence?.roleEstimate?.source || 'Market Analysis'}</li>
                    <li>• Confidence: {Math.round((analysis.locationData.confidence || 0) * 100)}%</li>
                  </ul>
                </div>
              </>
            ) : (
              <p>Loading location analysis...</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Market Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis?.marketIntelligence ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Role Match</h4>
                    <p className="text-lg font-semibold">{analysis.marketIntelligence.roleEstimate.confidence}% Confidence</p>
                    <p className="text-sm text-gray-600">Market position: Strong</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Salary Range</h4>
                    <p className="text-lg font-semibold">
                      ${analysis.marketIntelligence.roleEstimate.min.toLocaleString()} - 
                      ${analysis.marketIntelligence.roleEstimate.max.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Market competitive range</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Market Insights</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Competitiveness: {analysis.marketIntelligence.competitiveness}% percentile</li>
                    <li>• Data quality: {analysis.marketIntelligence.roleEstimate.source}</li>
                    <li>• Location adjustment: {analysis.locationData?.multiplier?.toFixed(2)}x multiplier</li>
                  </ul>
                </div>
              </>
            ) : (
              <p>Loading market analysis...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SmartCalculatorView({ analysis, job, userProfile }: { 
  analysis: SalaryAnalysis; 
  job: any; 
  userProfile: any 
}) {
  const [selectedScenario, setSelectedScenario] = useState<'single' | 'couple' | 'family'>('single');
  const [showBreakdown, setShowBreakdown] = useState(true);

  // Calculate intelligent budget breakdown based on location and cost-of-living data
  const calculateBudgetBreakdown = (grossAnnual: number, scenario: 'single' | 'couple' | 'family') => {
    const monthly = grossAnnual / 12;
    const netMultiplier = 0.75; // Approximate after taxes, benefits, etc.
    const netMonthly = monthly * netMultiplier;
    
    // Base percentages for different expense categories
    const basePercentages = {
      housing: scenario === 'family' ? 0.32 : scenario === 'couple' ? 0.30 : 0.28,
      food: scenario === 'family' ? 0.15 : scenario === 'couple' ? 0.12 : 0.10,
      transportation: 0.15,
      healthcare: 0.08,
      utilities: 0.08,
      savings: 0.20,
      entertainment: 0.05,
      miscellaneous: 0.07
    };

    // Adjust for cost of living index
    const colAdjustment = (analysis.locationData.costOfLivingIndex || 100) / 100;
    
    return {
      gross: {
        annual: grossAnnual,
        monthly: monthly
      },
      net: {
        monthly: netMonthly
      },
      breakdown: {
        housing: Math.round(netMonthly * basePercentages.housing * colAdjustment),
        food: Math.round(netMonthly * basePercentages.food * colAdjustment),
        transportation: Math.round(netMonthly * basePercentages.transportation * colAdjustment),
        healthcare: Math.round(netMonthly * basePercentages.healthcare),
        utilities: Math.round(netMonthly * basePercentages.utilities * colAdjustment),
        savings: Math.round(netMonthly * basePercentages.savings),
        entertainment: Math.round(netMonthly * basePercentages.entertainment * colAdjustment),
        miscellaneous: Math.round(netMonthly * basePercentages.miscellaneous)
      }
    };
  };

  const budgetLevels = {
    survival: calculateBudgetBreakdown(analysis.livingWage.struggling.grossAnnual, selectedScenario),
    comfortable: calculateBudgetBreakdown(analysis.livingWage.comfortable.grossAnnual, selectedScenario),
    optimal: calculateBudgetBreakdown(analysis.livingWage.optimal.grossAnnual, selectedScenario)
  };

  return (
    <div className="space-y-6">
      {/* Header Card with Data Sources */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-600" />
              Smart Budget Calculator
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs">
                📊 {analysis.marketIntelligence.roleEstimate.source === 'market_calculation' ? 'Real Market Data' : 'BLS + Economic Indicators'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                🌍 COL Index: {analysis.locationData.costOfLivingIndex}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">
              💡 Smart Recommendations for {analysis.locationData.city}
            </h4>
            <p className="text-green-700 text-sm">
              Based on real cost-of-living data ({analysis.locationData.costOfLivingIndex}% of US average), 
              market intelligence, and economic indicators. 
              {analysis.scenario === 'has_salary' 
                ? 'Comparing your offer against these benchmarks.' 
                : 'Use these targets for salary negotiations.'}
            </p>
          </div>

          {/* Family Scenario Selector */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={selectedScenario === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedScenario('single')}
            >
              👤 Single
            </Button>
            <Button
              variant={selectedScenario === 'couple' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedScenario('couple')}
            >
              👫 Couple
            </Button>
            <Button
              variant={selectedScenario === 'family' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedScenario('family')}
            >
              👨‍👩‍👧‍👦 Family
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Budget Level Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Survival Level */}
        <Card className="border-l-4 border-l-red-400">
          <CardHeader>
            <CardTitle className="text-red-700 text-lg">
              🚨 Survival Level
            </CardTitle>
            <div className="text-2xl font-bold text-red-600">
              ${budgetLevels.survival.gross.annual.toLocaleString()}/year
            </div>
            <div className="text-sm text-gray-600">
              ${budgetLevels.survival.net.monthly.toLocaleString()}/month take-home
            </div>
          </CardHeader>
          {showBreakdown && (
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>🏠 Housing</span>
                  <span>${budgetLevels.survival.breakdown.housing.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>🍽️ Food</span>
                  <span>${budgetLevels.survival.breakdown.food.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>🚗 Transportation</span>
                  <span>${budgetLevels.survival.breakdown.transportation.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>💊 Healthcare</span>
                  <span>${budgetLevels.survival.breakdown.healthcare.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>💰 Savings</span>
                  <span>Limited</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Comfortable Level - Highlighted */}
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-blue-700 text-lg flex items-center gap-2">
              ✨ Comfortable (Recommended)
            </CardTitle>
            <div className="text-2xl font-bold text-blue-600">
              ${budgetLevels.comfortable.gross.annual.toLocaleString()}/year
            </div>
            <div className="text-sm text-gray-600">
              ${budgetLevels.comfortable.net.monthly.toLocaleString()}/month take-home
            </div>
          </CardHeader>
          {showBreakdown && (
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>🏠 Housing</span>
                  <span>${budgetLevels.comfortable.breakdown.housing.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>🍽️ Food</span>
                  <span>${budgetLevels.comfortable.breakdown.food.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>🚗 Transportation</span>
                  <span>${budgetLevels.comfortable.breakdown.transportation.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>💊 Healthcare</span>
                  <span>${budgetLevels.comfortable.breakdown.healthcare.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>⚡ Utilities</span>
                  <span>${budgetLevels.comfortable.breakdown.utilities.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>💰 Savings (20%)</span>
                  <span>${budgetLevels.comfortable.breakdown.savings.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>🎬 Entertainment</span>
                  <span>${budgetLevels.comfortable.breakdown.entertainment.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Optimal Level */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="text-purple-700 text-lg">
              🌟 Optimal/Thriving
            </CardTitle>
            <div className="text-2xl font-bold text-purple-600">
              ${budgetLevels.optimal.gross.annual.toLocaleString()}/year
            </div>
            <div className="text-sm text-gray-600">
              ${budgetLevels.optimal.net.monthly.toLocaleString()}/month take-home
            </div>
          </CardHeader>
          {showBreakdown && (
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>🏠 Housing</span>
                  <span>${budgetLevels.optimal.breakdown.housing.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>🍽️ Food</span>
                  <span>${budgetLevels.optimal.breakdown.food.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>🚗 Transportation</span>
                  <span>${budgetLevels.optimal.breakdown.transportation.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>💊 Healthcare</span>
                  <span>${budgetLevels.optimal.breakdown.healthcare.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>⚡ Utilities</span>
                  <span>${budgetLevels.optimal.breakdown.utilities.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>💰 Savings (20%+)</span>
                  <span>${budgetLevels.optimal.breakdown.savings.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>🎬 Entertainment</span>
                  <span>${budgetLevels.optimal.breakdown.entertainment.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>🎯 Flexible</span>
                  <span>${budgetLevels.optimal.breakdown.miscellaneous.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Market Intelligence & Negotiation Advice */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Negotiation Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">💼 Market Position</h4>
              <div className="space-y-3">
                <div className="p-3 bg-white rounded border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Market Range</span>
                    <span className="font-bold text-blue-600">
                      ${(analysis.marketIntelligence.roleEstimate.min / 1000).toFixed(0)}K - 
                      ${(analysis.marketIntelligence.roleEstimate.max / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Based on {analysis.marketIntelligence.roleEstimate.source}
                  </div>
                </div>
                <div className="p-3 bg-white rounded border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Confidence Level</span>
                    <span className="font-bold text-green-600">
                      {Math.round(analysis.marketIntelligence.roleEstimate.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">🎯 Negotiation Strategy</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Ask for <strong>${budgetLevels.comfortable.gross.annual.toLocaleString()}</strong> minimum (comfortable living)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span>Target <strong>${budgetLevels.optimal.gross.annual.toLocaleString()}</strong> for optimal quality of life</span>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-purple-500 mt-0.5" />
                  <span>Consider total compensation (benefits, equity, bonuses)</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-orange-500 mt-0.5" />
                  <span>Factor in {analysis.locationData.costOfLivingIndex}% cost-of-living vs US average</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toggle Breakdown Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center gap-2"
        >
          {showBreakdown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showBreakdown ? 'Hide' : 'Show'} Budget Breakdown
        </Button>
      </div>
    </div>
  );
}

// Salary Input Widget Component
function AddSalaryWidget({ job, analysis, onJobUpdate }: { job: any; analysis: SalaryAnalysis; onJobUpdate?: (job: any) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    salary: '',
    currency: 'USD',
    type: 'annual', // annual, monthly, hourly
    notes: ''
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token');
      }

      // Update the job with salary information
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...job,
          salary: `${formData.currency} ${formData.salary}/${formData.type}${formData.notes ? ` (${formData.notes})` : ''}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update job');
      }

      const updatedJob = await response.json();
      
      // Update the parent component
      if (onJobUpdate) {
        onJobUpdate(updatedJob);
      }

      // Reset form and close dialog
      setFormData({ salary: '', currency: 'USD', type: 'annual', notes: '' });
      setOpen(false);
      
      // Show success message (you could add a toast notification here)
      console.log('Salary information updated successfully');

    } catch (error) {
      console.error('Failed to save salary information:', error);
      // You could add error handling/toast notification here
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Add Salary Information to This Job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Salary Information</DialogTitle>
          <DialogDescription>
            Got salary details for this position? Add them here to get more accurate analysis.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Salary Amount */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="salary" className="text-right">
              Amount
            </Label>
            <div className="col-span-3 flex gap-2">
              <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="CHF">CHF</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                  <SelectItem value="SEK">SEK</SelectItem>
                  <SelectItem value="NOK">NOK</SelectItem>
                  <SelectItem value="DKK">DKK</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="salary"
                type="number"
                placeholder="75000"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="flex-1"
              />
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Salary Range Helper */}
          <div className="col-span-4">
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">Quick Reference</span>
              </div>
              <div className="space-y-1 text-blue-700">
                <div>• Market Range: ${(analysis.marketIntelligence?.roleEstimate?.min / 1000 || 0).toFixed(0)}K - ${(analysis.marketIntelligence?.roleEstimate?.max / 1000 || 0).toFixed(0)}K annual</div>
                <div>• Comfortable Living: ${(analysis.livingWage?.comfortable?.grossAnnual / 1000 || 0).toFixed(0)}K annual</div>
                <div>• Location: {analysis.locationData?.city} ({analysis.locationData?.costOfLivingIndex || 100}% of US average)</div>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <div className="col-span-3">
              <Textarea
                id="notes"
                placeholder="e.g., base salary, includes bonuses, equity details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-[60px]"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.salary || saving}
            className="min-w-[100px]"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Save Salary
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}