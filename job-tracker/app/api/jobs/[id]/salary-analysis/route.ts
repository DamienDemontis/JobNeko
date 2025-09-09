import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { calculateEnhancedSalary } from '@/lib/services/salary-calculator';
import { parseSalaryString, convertToUSDSync } from '@/lib/salary-intelligence';
import { numbeoScraper } from '@/lib/services/numbeo-scraper';
import { findCountry, findRegionDefault, isMajorCity, NUMBEO_COUNTRIES } from '@/lib/numbeo-countries';
import { 
  withErrorHandling, 
  AuthenticationError, 
  NotFoundError, 
  ValidationError,
  ExternalServiceError,
  validateId 
} from '@/lib/error-handling';

interface LocationResolution {
  city: string;
  country: string;
  state?: string;
  isRemote: boolean;
  confidence: number;
}

// Enhanced location resolution for vague locations and remote jobs
async function resolveLocation(jobLocation: string, userProfile?: any): Promise<LocationResolution> {
  const location = jobLocation?.toLowerCase() || '';
  
  // Handle remote jobs - use user's location if available
  if (location.includes('remote') || location.includes('anywhere')) {
    if (userProfile?.currentLocation && userProfile?.currentCountry) {
      return {
        city: userProfile.currentLocation,
        country: userProfile.currentCountry,
        state: userProfile.currentState,
        isRemote: true,
        confidence: 0.9
      };
    }
    // Default remote location
    return {
      city: 'Remote',
      country: 'Global',
      isRemote: true,
      confidence: 0.5
    };
  }

  // Handle region-based locations using comprehensive database
  const regionDefault = findRegionDefault(location);
  if (regionDefault) {
    return {
      city: userProfile?.currentLocation || regionDefault.defaultCity,
      country: userProfile?.currentCountry || regionDefault.normalizedName,
      state: userProfile?.currentState,
      isRemote: false,
      confidence: 0.7
    };
  }

  // Try to parse city, state/country from location string
  const parts = jobLocation.split(',').map(s => s.trim());
  
  if (parts.length >= 2) {
    const potentialCountry = parts[parts.length - 1];
    const countryInfo = findCountry(potentialCountry);
    
    if (countryInfo) {
      const city = parts[0];
      const isMajor = isMajorCity(city, countryInfo);
      
      return {
        city: isMajor ? city : countryInfo.defaultCity,
        country: countryInfo.normalizedName,
        state: parts.length > 2 ? parts[1] : undefined,
        isRemote: false,
        confidence: isMajor ? 0.9 : 0.75
      };
    }
    
    // Fallback for unknown countries
    return {
      city: parts[0],
      country: potentialCountry,
      state: parts.length > 2 ? parts[1] : undefined,
      isRemote: false,
      confidence: 0.6
    };
  }

  // Single location - try to match as country first, then city
  if (parts.length === 1 && parts[0]) {
    const singleLocation = parts[0];
    
    // Check if it's a country
    const countryInfo = findCountry(singleLocation);
    if (countryInfo) {
      return {
        city: countryInfo.defaultCity,
        country: countryInfo.normalizedName,
        isRemote: false,
        confidence: 0.8
      };
    }
    
    // Check if it's a major city in any country
    for (const country of Object.values(NUMBEO_COUNTRIES)) {
      if (isMajorCity(singleLocation, country)) {
        return {
          city: singleLocation,
          country: country.normalizedName,
          isRemote: false,
          confidence: 0.85
        };
      }
    }
    
    // Unknown single location
    return {
      city: singleLocation,
      country: 'Unknown',
      isRemote: false,
      confidence: 0.4
    };
  }

  // Fallback to user location or default
  return {
    city: userProfile?.currentLocation || 'Remote',
    country: userProfile?.currentCountry || 'Global',
    state: userProfile?.currentState,
    isRemote: true,
    confidence: 0.3
  };
}

// Enhanced salary parsing for wide ranges and edge cases
function parseJobSalary(salaryString: string) {
  if (!salaryString) return null;

  const parsed = parseSalaryString(salaryString);
  if (!parsed) return null;

  // Calculate confidence based on range width
  const rangeWidth = parsed.max - parsed.min;
  const midpoint = (parsed.min + parsed.max) / 2;
  const rangePercent = (rangeWidth / midpoint) * 100;
  
  let confidence = 0.8;
  if (rangePercent > 100) confidence = 0.4; // Very wide range like $98K-$210K
  else if (rangePercent > 50) confidence = 0.6; // Wide range
  else if (rangePercent > 20) confidence = 0.7; // Medium range

  return {
    ...parsed,
    confidence,
    rangeWidth,
    midpoint,
    rangePercent
  };
}

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Extract and validate token
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  // Validate job ID parameter
  const resolvedParams = await params;
  validateId(resolvedParams.id, 'Job ID');
  const jobId = resolvedParams.id;

  // Fetch job data with proper error handling
  const job = await prisma.job.findUnique({
    where: { id: jobId, userId: user.id },
  });

  if (!job) {
    throw new NotFoundError('Job');
  }

  // Fetch user profile for enhanced calculations
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: user.id }
  });

  // Resolve location intelligently
  const locationResolution = await resolveLocation(job.location || '', userProfile);
  
  // Parse salary with enhanced handling
  const salaryData = parseJobSalary(job.salary || '');
  
  if (!salaryData) {
    return NextResponse.json({
      error: 'No salary data available',
      hasData: false,
      suggestion: 'Add salary information to get detailed analysis'
    }, { status: 200 });
  }

  // Get cost of living data for resolved location with error handling
  let costOfLivingData;
  try {
    costOfLivingData = await numbeoScraper.getCityData(
      locationResolution.city,
      locationResolution.country,
      locationResolution.state
    );
  } catch (error) {
    console.warn('Cost of living data unavailable, using fallback estimates:', error);
    // Continue with analysis using default estimates
  }

  // Convert salary to USD
  let minUSD: number, maxUSD: number, midpointUSD: number;
  try {
    minUSD = convertToUSDSync(salaryData.min, salaryData.currency);
    maxUSD = convertToUSDSync(salaryData.max, salaryData.currency);
    midpointUSD = (minUSD + maxUSD) / 2;
  } catch (error) {
    console.warn('Currency conversion failed, using original values:', error);
    minUSD = salaryData.min;
    maxUSD = salaryData.max;
    midpointUSD = (minUSD + maxUSD) / 2;
  }

  // Calculate enhanced salary analysis with error handling
  let salaryAnalysis;
  try {
    salaryAnalysis = await calculateEnhancedSalary(
      job.salary || '',
      `${locationResolution.city}, ${locationResolution.country}`,
      (job.workMode as 'remote' | 'hybrid' | 'onsite') || 'hybrid',
      {
        currentLocation: userProfile?.currentLocation || undefined,
        currentCountry: userProfile?.currentCountry || undefined,
        familySize: userProfile?.familySize || 1,
        dependents: userProfile?.dependents || 0,
        maritalStatus: userProfile?.maritalStatus || 'single',
        expectedSalaryMin: userProfile?.expectedSalaryMin || 0,
        currentSalary: userProfile?.currentSalary || 0,
      }
    );
  } catch (error) {
    console.warn('Enhanced salary calculation failed, using basic analysis:', error);
    // Provide fallback analysis
    salaryAnalysis = {
      comfortLevel: 'analyzing',
      comfortScore: Math.min(Math.max((midpointUSD / 1000), 20), 90),
      netSalaryUSD: { min: minUSD * 0.73, max: maxUSD * 0.73 },
      purchasingPower: 1.0,
      savingsPotential: 15,
      betterThanPercent: 50
    };
  }

  // Build comprehensive response
  const response = {
    hasData: true,
    originalSalary: {
      min: salaryData.min,
      max: salaryData.max,
      midpoint: salaryData.midpoint,
      currency: salaryData.currency,
      frequency: 'yearly',
      confidence: salaryData.confidence,
      rangeWidth: salaryData.rangeWidth,
      rangePercent: Math.round(salaryData.rangePercent)
    },
    normalizedSalaryUSD: {
      min: minUSD,
      max: maxUSD,
      midpoint: midpointUSD
    },
    locationData: {
      original: job.location,
      resolved: {
        city: locationResolution.city,
        country: locationResolution.country,
        state: locationResolution.state
      },
      isRemote: locationResolution.isRemote,
      confidence: locationResolution.confidence,
      costOfLiving: costOfLivingData ? {
        costOfLivingIndex: costOfLivingData.costOfLivingIndex,
        rentIndex: costOfLivingData.rentIndex,
        qualityOfLifeIndex: costOfLivingData.qualityOfLifeIndex,
        safetyIndex: costOfLivingData.safetyIndex,
        healthcareIndex: costOfLivingData.healthcareIndex,
        educationIndex: costOfLivingData.educationIndex
      } : null
    },
    analysis: salaryAnalysis,
    familyContext: userProfile ? {
      familySize: userProfile.familySize || 1,
      dependents: userProfile.dependents || 0,
      maritalStatus: userProfile.maritalStatus || 'single',
      hasExpectedSalary: !!userProfile.expectedSalaryMin,
      comparisonToExpected: userProfile.expectedSalaryMin ? {
        percentage: Math.round(((midpointUSD - userProfile.expectedSalaryMin) / userProfile.expectedSalaryMin) * 100),
        verdict: midpointUSD > userProfile.expectedSalaryMin ? 'above expected' : 'below expected'
      } : null
    } : null,
    confidence: {
      overall: Math.min(salaryData.confidence, locationResolution.confidence),
      salary: salaryData.confidence,
      location: locationResolution.confidence,
      costOfLiving: costOfLivingData ? 0.9 : 0.5
    },
    recommendations: generateRecommendations(salaryData, locationResolution, userProfile)
  };

  return NextResponse.json(response);
});

function generateRecommendations(salaryData: any, location: LocationResolution, userProfile: any) {
  const recommendations = [];

  if (salaryData.rangePercent > 80) {
    recommendations.push({
      type: 'wide_range',
      message: 'This job has a very wide salary range. Consider negotiating based on your experience level.',
      priority: 'high'
    });
  }

  if (location.confidence < 0.6) {
    recommendations.push({
      type: 'location_unclear',
      message: 'Job location is vague. Confirm the actual work location for accurate cost-of-living analysis.',
      priority: 'medium'
    });
  }

  if (location.isRemote && !userProfile?.currentLocation) {
    recommendations.push({
      type: 'profile_incomplete',
      message: 'Add your location to your profile for more accurate remote job analysis.',
      priority: 'medium'
    });
  }

  if (!userProfile?.expectedSalaryMin) {
    recommendations.push({
      type: 'no_benchmark',
      message: 'Set your expected salary in your profile to see how this job compares.',
      priority: 'low'
    });
  }

  return recommendations;
}