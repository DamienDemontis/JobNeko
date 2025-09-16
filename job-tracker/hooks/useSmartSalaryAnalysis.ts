'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

interface SalaryData {
  min: number;
  max: number;
  currency: string;
  frequency: 'annual' | 'monthly' | 'hourly';
  confidence: number;
  source: string;
}

interface LocationData {
  city: string;
  country: string;
  state?: string;
  isRemote: boolean;
  confidence: number;
  costOfLivingIndex: number;
  rentIndex?: number;
  qualityOfLifeIndex?: number;
  source: string;
}

interface MarketIntelligence {
  roleEstimate: {
    min: number;
    max: number;
    confidence: number;
    source: string;
  };
  marketPosition: 'below' | 'at' | 'above' | 'premium';
  competitiveness: number;
  industryBenchmarks?: {
    percentile25: number;
    percentile50: number;
    percentile75: number;
    percentile90: number;
  };
}

interface LivingWageAnalysis {
  struggling: number;
  tight: number;
  comfortable: number;
  thriving: number;
  luxurious: number;
  recommended: number;
  breakdown: {
    housing: number;
    food: number;
    transportation: number;
    healthcare: number;
    savings: number;
    discretionary: number;
  };
}

interface ComfortAnalysis {
  level: 'struggling' | 'tight' | 'comfortable' | 'thriving' | 'luxurious';
  score: number; // 0-100
  explanation: string;
  factors: {
    cost_of_living: number;
    family_size: number;
    location_bonus: number;
    market_position: number;
  };
}

interface SmartSalaryAnalysis {
  scenario: 'has_salary' | 'no_salary' | 'remote_job';
  hasData: boolean;
  loading: boolean;
  error?: string;
  
  // Core Data
  salaryData?: SalaryData;
  locationData: LocationData;
  marketIntelligence: MarketIntelligence;
  livingWage: LivingWageAnalysis;
  comfort: ComfortAnalysis;
  
  // Enhanced Insights
  insights: {
    purchasingPower: number;
    savingsPotential: number;
    familyImpact: number;
    locationAdvantage: 'low' | 'average' | 'high';
    negotiationPower: number;
    careerGrowthPotential: number;
  };
  
  // Confidence Metrics
  confidence: {
    overall: number;
    salary: number;
    location: number;
    market: number;
  };
  
  // Recommendations
  recommendations: {
    negotiationRange?: { min: number; max: number };
    alternativeLocations?: Array<{ city: string; country: string; advantage: string }>;
    careerAdvice?: string[];
    improvementAreas?: string[];
  };
}

interface UseSmartSalaryAnalysisProps {
  job: any;
  userProfile?: any;
  autoRefresh?: boolean;
  includeMarketAnalysis?: boolean;
  includeLivingWageAnalysis?: boolean;
  onJobUpdate?: (job: any) => void;
}

// Enhanced salary parsing with confidence scoring
const parseSalaryString = (salaryString: string): SalaryData | null => {
  if (!salaryString || salaryString.trim() === '') return null;
  
  const salary = salaryString.toLowerCase().trim();
  
  // Skip competitive/negotiable salaries
  if (salary.includes('competitive') || salary.includes('negotiable') || salary.includes('discuss')) {
    return null;
  }

  // Currency detection
  let currency = 'USD';
  if (salary.includes('€') || salary.includes('eur')) currency = 'EUR';
  else if (salary.includes('£') || salary.includes('gbp')) currency = 'GBP';
  else if (salary.includes('¥') || salary.includes('jpy')) currency = 'JPY';
  else if (salary.includes('cad') || salary.includes('c$')) currency = 'CAD';
  else if (salary.includes('aud') || salary.includes('a$')) currency = 'AUD';

  // Frequency detection
  let frequency: 'annual' | 'monthly' | 'hourly' = 'annual';
  if (salary.includes('/hr') || salary.includes('hour') || salary.includes('hourly')) frequency = 'hourly';
  else if (salary.includes('/month') || salary.includes('monthly') || salary.includes('/mo')) frequency = 'monthly';
  else if (salary.includes('/year') || salary.includes('annual') || salary.includes('yearly')) frequency = 'annual';

  // Extract numbers
  const numbers = salary.match(/[\d,]+(?:\.\d{1,2})?/g);
  if (!numbers || numbers.length === 0) return null;

  const cleanNumbers = numbers.map(num => parseFloat(num.replace(/,/g, '')));
  
  let min: number, max: number, confidence: number;
  
  if (cleanNumbers.length === 1) {
    min = max = cleanNumbers[0];
    confidence = 0.7; // Single number is less precise
  } else {
    min = Math.min(...cleanNumbers);
    max = Math.max(...cleanNumbers);
    confidence = 0.9; // Range is more precise
    
    // Adjust confidence based on range width
    const rangeWidth = (max - min) / min;
    if (rangeWidth > 1) confidence *= 0.6; // Very wide range
    else if (rangeWidth > 0.5) confidence *= 0.8; // Wide range
  }

  // Convert to annual if needed
  if (frequency === 'hourly') {
    min *= 40 * 52; // Assume 40 hours/week, 52 weeks/year
    max *= 40 * 52;
    confidence *= 0.8; // Hourly conversion is less precise
  } else if (frequency === 'monthly') {
    min *= 12;
    max *= 12;
    confidence *= 0.9; // Monthly conversion is fairly precise
  }

  return {
    min,
    max,
    currency,
    frequency: 'annual', // Always convert to annual
    confidence,
    source: 'job_posting'
  };
};

// Enhanced location resolution
const resolveJobLocation = (jobLocation: string, userProfile: any): LocationData => {
  const location = jobLocation?.toLowerCase() || '';
  
  // Handle remote work scenarios with intelligence
  if (location.includes('remote') || location.includes('worldwide') || location.includes('global')) {
    // Extract specific remote context
    const remoteContext = extractRemoteContext(location);
    
    if (remoteContext.specificLocation) {
      return {
        city: remoteContext.specificLocation.city,
        country: remoteContext.specificLocation.country,
        state: remoteContext.specificLocation.state,
        isRemote: true,
        confidence: 0.8,
        costOfLivingIndex: 100, // Default, will be fetched
        source: 'job_remote_specific'
      };
    }
    
    // Use user's location for remote work
    if (userProfile?.currentCity && userProfile?.currentCountry) {
      return {
        city: userProfile.currentCity,
        country: userProfile.currentCountry,
        state: userProfile.currentState,
        isRemote: true,
        confidence: 0.9,
        costOfLivingIndex: 100,
        source: 'user_profile_remote'
      };
    }
    
    // Generic remote fallback
    return {
      city: 'Remote',
      country: 'Global',
      isRemote: true,
      confidence: 0.3,
      costOfLivingIndex: 100,
      source: 'remote_generic'
    };
  }

  // Parse structured location
  const parsedLocation = parseLocationString(jobLocation);
  if (parsedLocation) {
    return {
      ...parsedLocation,
      isRemote: false,
      confidence: 0.8,
      costOfLivingIndex: 100,
      source: 'job_posting_parsed'
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
      costOfLivingIndex: 100,
      source: 'user_profile_fallback'
    };
  }

  // Ultimate fallback
  return {
    city: 'Unknown',
    country: 'Unknown',
    isRemote: false,
    confidence: 0.1,
    costOfLivingIndex: 100,
    source: 'fallback'
  };
};

// Helper function to extract remote work context
const extractRemoteContext = (location: string) => {
  // Patterns like "Remote (US only)", "Remote from Berlin", "Worldwide remote"
  const patterns = [
    /remote.*\(([^)]+)\)/i, // Remote (location)
    /remote.*from\s+([^,\n]+)/i, // Remote from location
    /([^,\n]+).*remote/i // Location remote
  ];

  for (const pattern of patterns) {
    const match = location.match(pattern);
    if (match) {
      const locationPart = match[1].trim();
      const parsed = parseLocationString(locationPart);
      if (parsed) {
        return { specificLocation: parsed };
      }
    }
  }

  return { specificLocation: null };
};

// Helper function to parse location strings
const parseLocationString = (locationString: string) => {
  if (!locationString) return null;
  
  const parts = locationString.split(',').map(p => p.trim());
  
  if (parts.length >= 2) {
    return {
      city: parts[0],
      country: parts[parts.length - 1],
      state: parts.length > 2 ? parts[1] : undefined
    };
  } else if (parts.length === 1) {
    // Could be city or country - use context clues
    const part = parts[0].toLowerCase();
    
    // Common countries
    const countries = ['usa', 'uk', 'canada', 'germany', 'france', 'netherlands', 'sweden', 'norway'];
    if (countries.some(country => part.includes(country))) {
      return { city: parts[0], country: parts[0] };
    }
    
    return { city: parts[0], country: 'Unknown' };
  }
  
  return null;
};

// Market intelligence calculation
const calculateMarketIntelligence = (jobTitle: string, location: LocationData): MarketIntelligence => {
  // This would integrate with our market data
  // For now, using the enhanced role database from the component
  const estimate = getEnhancedMarketEstimate(jobTitle, `${location.city}, ${location.country}`);
  
  return {
    roleEstimate: {
      min: estimate.min,
      max: estimate.max,
      confidence: estimate.confidence,
      source: 'market_database'
    },
    marketPosition: 'at', // Will be calculated against actual salary
    competitiveness: 75,
    industryBenchmarks: {
      percentile25: estimate.min * 0.8,
      percentile50: (estimate.min + estimate.max) / 2,
      percentile75: estimate.max * 0.9,
      percentile90: estimate.max * 1.1
    }
  };
};

// Enhanced market estimate (placeholder for now, would be moved to service)
const getEnhancedMarketEstimate = (title: string, location: string) => {
  // This is a simplified version - the full implementation would be in a separate service
  return {
    min: 80000,
    max: 150000,
    confidence: 0.8
  };
};

// Living wage calculation with regional adjustments
const calculateLivingWage = (location: LocationData, familySize: number = 1): LivingWageAnalysis => {
  // Base living wage for single person in average US city
  const baseLiving = 50000;
  
  // Apply cost of living adjustment
  const costAdjustment = location.costOfLivingIndex / 100;
  const adjustedBase = baseLiving * costAdjustment;
  
  // Family size multipliers
  const familyMultiplier = Math.pow(1.4, familySize - 1);
  const familyAdjustedBase = adjustedBase * familyMultiplier;
  
  // Calculate tiers
  const struggling = familyAdjustedBase * 0.6;
  const tight = familyAdjustedBase * 0.8;
  const comfortable = familyAdjustedBase * 1.0;
  const thriving = familyAdjustedBase * 1.4;
  const luxurious = familyAdjustedBase * 2.0;
  
  // Breakdown by category (percentages of comfortable wage)
  const breakdown = {
    housing: comfortable * 0.30,
    food: comfortable * 0.15,
    transportation: comfortable * 0.15,
    healthcare: comfortable * 0.10,
    savings: comfortable * 0.20,
    discretionary: comfortable * 0.10
  };
  
  return {
    struggling,
    tight,
    comfortable,
    thriving,
    luxurious,
    recommended: comfortable,
    breakdown
  };
};

// Comfort level calculation
const calculateComfortLevel = (salary: number, livingWage: LivingWageAnalysis): ComfortAnalysis => {
  let level: ComfortAnalysis['level'] = 'struggling';
  let score = 0;
  
  if (salary >= livingWage.luxurious) {
    level = 'luxurious';
    score = 95;
  } else if (salary >= livingWage.thriving) {
    level = 'thriving';
    score = 85;
  } else if (salary >= livingWage.comfortable) {
    level = 'comfortable';
    score = 75;
  } else if (salary >= livingWage.tight) {
    level = 'tight';
    score = 55;
  } else {
    level = 'struggling';
    score = 25;
  }
  
  const explanations = {
    luxurious: 'This salary provides an excellent lifestyle with significant discretionary spending and savings potential.',
    thriving: 'This salary allows for a very comfortable lifestyle with good savings and some luxury spending.',
    comfortable: 'This salary covers all basic needs comfortably with some discretionary spending and savings.',
    tight: 'This salary covers basic needs but leaves little room for discretionary spending or substantial savings.',
    struggling: 'This salary may not adequately cover all basic living expenses for this location.'
  };
  
  return {
    level,
    score,
    explanation: explanations[level],
    factors: {
      cost_of_living: 1.0,
      family_size: 1.0,
      location_bonus: 1.0,
      market_position: 1.0
    }
  };
};

export const useSmartSalaryAnalysis = ({
  job,
  userProfile,
  autoRefresh = true,
  includeMarketAnalysis = true,
  includeLivingWageAnalysis = true,
  onJobUpdate
}: UseSmartSalaryAnalysisProps) => {
  const [analysis, setAnalysis] = useState<SmartSalaryAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  // Determine scenario based on job data
  const scenario = useMemo((): 'has_salary' | 'no_salary' | 'remote_job' => {
    if (!job) return 'no_salary';
    
    const hasValidSalary = job.salary &&
      typeof job.salary === 'string' &&
      job.salary.trim() &&
      !job.salary.toLowerCase().includes('competitive') &&
      !job.salary.toLowerCase().includes('negotiable');
    
    const isRemote = job.location?.toLowerCase().includes('remote') || 
                    job.workMode === 'remote' ||
                    job.location?.toLowerCase().includes('worldwide');
    
    if (hasValidSalary) return 'has_salary';
    if (isRemote) return 'remote_job';
    return 'no_salary';
  }, [job]);

  // Core analysis computation
  const computeAnalysis = useCallback(async (): Promise<SmartSalaryAnalysis> => {
    if (!job) throw new Error('Job data is required');

    // Parse salary if available
    const salaryData = job.salary ? parseSalaryString(job.salary) : undefined;
    
    // Resolve location
    const locationData = resolveJobLocation(job.location, userProfile);
    
    // Get market intelligence
    const marketIntelligence = includeMarketAnalysis 
      ? calculateMarketIntelligence(job.title || '', locationData)
      : {
          roleEstimate: { min: 0, max: 0, confidence: 0, source: 'none' },
          marketPosition: 'at' as const,
          competitiveness: 0
        };
    
    // Calculate living wage
    const livingWage = includeLivingWageAnalysis
      ? calculateLivingWage(locationData, userProfile?.familySize || 1)
      : {
          struggling: 0, tight: 0, comfortable: 0, thriving: 0, luxurious: 0,
          recommended: 0, breakdown: {
            housing: 0, food: 0, transportation: 0, healthcare: 0, savings: 0, discretionary: 0
          }
        };
    
    // Calculate comfort if we have salary data
    const salaryForComfort = salaryData ? (salaryData.min + salaryData.max) / 2 : livingWage.recommended;
    const comfort = calculateComfortLevel(salaryForComfort, livingWage);
    
    // Calculate insights
    const purchasingPower = locationData.costOfLivingIndex > 0 
      ? 100 / locationData.costOfLivingIndex 
      : 1.0;
    
    const insights = {
      purchasingPower,
      savingsPotential: Math.max(0, (salaryForComfort - livingWage.comfortable) / salaryForComfort),
      familyImpact: (userProfile?.familySize || 1) > 1 ? 1.5 : 1.0,
      locationAdvantage: purchasingPower > 1.2 ? 'high' as const : 
                        purchasingPower > 0.8 ? 'average' as const : 'low' as const,
      negotiationPower: marketIntelligence.competitiveness / 100,
      careerGrowthPotential: 0.75 // Placeholder
    };
    
    // Calculate confidence metrics
    const confidence = {
      overall: Math.min(
        (salaryData?.confidence || 0.5) * 0.3 +
        locationData.confidence * 0.3 +
        marketIntelligence.roleEstimate.confidence * 0.4,
        0.95
      ),
      salary: salaryData?.confidence || 0,
      location: locationData.confidence,
      market: marketIntelligence.roleEstimate.confidence
    };
    
    // Generate recommendations
    const recommendations = {
      negotiationRange: marketIntelligence.roleEstimate.min > 0 ? {
        min: marketIntelligence.roleEstimate.min,
        max: marketIntelligence.roleEstimate.max
      } : undefined,
      alternativeLocations: [], // Would be populated by API
      careerAdvice: [], // Would be populated by API
      improvementAreas: [] // Would be populated by API
    };

    return {
      scenario,
      hasData: !!salaryData,
      loading: false,
      salaryData: salaryData || undefined,
      locationData,
      marketIntelligence,
      livingWage,
      comfort,
      insights,
      confidence,
      recommendations
    };
  }, [job, userProfile, scenario, includeMarketAnalysis, includeLivingWageAnalysis]);

  // Enhanced API integration
  const fetchEnhancedData = useCallback(async (baseAnalysis: SmartSalaryAnalysis) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !job?.id) return baseAnalysis;

      // Try to get enhanced data from our salary analysis API
      const response = await fetch(`/api/jobs/${job.id}/salary-analysis`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const apiData = await response.json();
        
        // Merge API data with base analysis
        return {
          ...baseAnalysis,
          locationData: {
            ...baseAnalysis.locationData,
            costOfLivingIndex: apiData.locationData?.costOfLivingIndex || baseAnalysis.locationData.costOfLivingIndex,
            rentIndex: apiData.locationData?.rentIndex,
            qualityOfLifeIndex: apiData.locationData?.qualityOfLifeIndex
          },
          // Could add more API data integration here
          confidence: {
            ...baseAnalysis.confidence,
            overall: Math.min(baseAnalysis.confidence.overall * 1.1, 0.95) // Boost confidence with API data
          }
        };
      }
      
      return baseAnalysis;
    } catch (error) {
      console.warn('Failed to fetch enhanced salary data:', error);
      return baseAnalysis;
    }
  }, [job?.id]);

  // Main analysis effect
  useEffect(() => {
    if (!job) {
      setLoading(false);
      return;
    }

    const runAnalysis = async () => {
      setLoading(true);
      setError(undefined);
      
      try {
        // Compute base analysis
        const baseAnalysis = await computeAnalysis();
        
        // Enhance with API data
        const enhancedAnalysis = await fetchEnhancedData(baseAnalysis);
        
        setAnalysis(enhancedAnalysis);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
        setError(errorMessage);
        console.error('Smart salary analysis failed:', err);
      } finally {
        setLoading(false);
      }
    };

    runAnalysis();
  }, [job, userProfile, computeAnalysis, fetchEnhancedData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !analysis) return;

    const refreshInterval = setInterval(async () => {
      try {
        const refreshedAnalysis = await fetchEnhancedData(analysis);
        if (JSON.stringify(refreshedAnalysis) !== JSON.stringify(analysis)) {
          setAnalysis(refreshedAnalysis);
        }
      } catch (error) {
        console.warn('Auto-refresh failed:', error);
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [analysis, autoRefresh, fetchEnhancedData]);

  // Utility functions for components
  const refresh = useCallback(async () => {
    if (!job) return;
    setLoading(true);
    
    try {
      const newAnalysis = await computeAnalysis();
      const enhancedAnalysis = await fetchEnhancedData(newAnalysis);
      setAnalysis(enhancedAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  }, [computeAnalysis, fetchEnhancedData, job]);

  const updateJobSalary = useCallback(async (newSalary: string) => {
    if (!job || !onJobUpdate) return;
    
    // Update job locally and trigger re-analysis
    const updatedJob = { ...job, salary: newSalary };
    await onJobUpdate(updatedJob);
    
    // Analysis will re-run due to job dependency
  }, [job]);

  return {
    analysis,
    loading,
    error,
    refresh,
    updateJobSalary
  };
};