// Enhanced Salary Intelligence with Family Adjustments and City Data

import { numbeoScraper } from './numbeo-scraper';
import { convertToUSD, convertToUSDSync, parseSalaryString } from '../salary-intelligence';

interface UserProfile {
  currentLocation?: string;
  currentCountry?: string;
  familySize: number;
  dependents: number;
  maritalStatus?: string;
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  currentSalary?: number;
  preferredCurrency: string;
  housingPreference?: string;
  commuteToleranceMinutes?: number;
  openToRelocation: boolean;
  preferredCountries?: string[];
}

export interface EnhancedSalaryAnalysis {
  // Original salary information
  originalSalary: {
    min: number;
    max: number;
    currency: string;
  };
  
  // USD normalized salaries
  normalizedSalaryUSD: {
    min: number;
    max: number;
  };
  
  // Cost of living adjusted salaries
  costOfLivingAdjusted: {
    min: number;
    max: number;
  };
  
  // Family-adjusted analysis
  familyAdjustedAnalysis: {
    adjustedMin: number;
    adjustedMax: number;
    familyMultiplier: number;
    dependentsCost: number;
    housingRequirement: number;
  };
  
  // Quality metrics
  comfortScore: number; // 0-100
  familyComfortScore: number; // 0-100 adjusted for family
  comfortLevel: 'struggling' | 'tight' | 'comfortable' | 'thriving' | 'luxurious';
  familyComfortLevel: 'struggling' | 'tight' | 'comfortable' | 'thriving' | 'luxurious';
  
  // Financial metrics
  purchasingPower: number;
  savingsPotential: number;
  familySavingsPotential: number;
  taxEstimate: number;
  netSalaryUSD: {
    min: number;
    max: number;
  };
  
  // Location data
  locationData: {
    city: string;
    country: string;
    costOfLivingIndex: number;
    rentIndex: number;
    qualityOfLifeIndex?: number;
    safetyIndex?: number;
    healthcareIndex?: number;
    educationIndex?: number;
    avgNetSalaryUSD?: number;
    medianHousePriceUSD?: number;
    incomeTaxRate?: number;
  };
  
  // Comparison metrics
  comparisonToExpected?: {
    meetMinExpectation: boolean;
    exceedsMaxExpectation: boolean;
    percentageOfMinExpected: number;
    percentageOfMaxExpected: number;
  };
  
  comparisonToCurrent?: {
    increasePct: number;
    increaseUSD: number;
    isRaise: boolean;
  };
  
  // Market data
  betterThanPercent: number;
  relativeToLocalAverage?: number;
  
  // Recommendations
  recommendations: string[];
  warnings: string[];
}

export async function calculateEnhancedSalary(
  salaryStr: string | undefined,
  jobLocation: string | undefined,
  workMode: 'remote' | 'hybrid' | 'onsite' = 'onsite',
  userProfile?: Partial<UserProfile>
): Promise<EnhancedSalaryAnalysis | null> {
  if (!salaryStr) return null;
  
  const parsed = parseSalaryString(salaryStr);
  if (!parsed) return null;
  
  // Determine effective location for cost calculations
  const effectiveLocation = determineEffectiveLocation(jobLocation, workMode, userProfile);
  
  // Get city data from Numbeo or cache
  const cityData = await numbeoScraper.getCityData(
    effectiveLocation.city,
    effectiveLocation.country,
    effectiveLocation.state
  );
  
  if (!cityData) {
    console.warn(`No city data found for ${effectiveLocation.city}, ${effectiveLocation.country}`);
    return null;
  }
  
  // Convert to USD with live rates
  const minUSD = await convertToUSD(parsed.min, parsed.currency);
  const maxUSD = await convertToUSD(parsed.max, parsed.currency);
  const avgUSD = (minUSD + maxUSD) / 2;
  
  // Family adjustments
  const familySize = userProfile?.familySize || 1;
  const dependents = userProfile?.dependents || 0;
  const familyMultiplier = calculateFamilyMultiplier(familySize, dependents);
  
  // Cost of living adjustments
  const adjustmentFactor = 100 / cityData.costOfLivingIndex;
  const adjustedMin = minUSD * adjustmentFactor;
  const adjustedMax = maxUSD * adjustmentFactor;
  
  // Family-adjusted costs
  const dependentsCost = calculateDependentsCost(dependents, cityData);
  const housingRequirement = calculateHousingRequirement(familySize, userProfile?.housingPreference, cityData);
  const familyAdjustedMin = adjustedMin * familyMultiplier + dependentsCost;
  const familyAdjustedMax = adjustedMax * familyMultiplier + dependentsCost;
  
  // Tax estimation
  const taxRate = cityData.incomeTaxRate || estimateTaxRate(avgUSD, cityData.country);
  const taxEstimate = avgUSD * (taxRate / 100);
  const netMinUSD = minUSD * (1 - taxRate / 100);
  const netMaxUSD = maxUSD * (1 - taxRate / 100);
  
  // Comfort scores
  const comfortScore = calculateComfortScore(avgUSD, cityData.costOfLivingIndex);
  const familyComfortScore = calculateFamilyComfortScore(
    avgUSD, 
    cityData.costOfLivingIndex, 
    familySize, 
    dependents,
    housingRequirement
  );
  
  // Quality metrics
  const purchasingPower = (avgUSD / cityData.costOfLivingIndex) * 100;
  const savingsPotential = calculateSavingsPotential(avgUSD, cityData.costOfLivingIndex);
  const familySavingsPotential = calculateFamilySavingsPotential(
    avgUSD,
    cityData.costOfLivingIndex,
    familyMultiplier,
    dependentsCost
  );
  
  // Comparisons
  const comparisonToExpected = userProfile?.expectedSalaryMin || userProfile?.expectedSalaryMax
    ? calculateExpectedComparison(avgUSD, userProfile)
    : undefined;
  
  const comparisonToCurrent = userProfile?.currentSalary
    ? calculateCurrentComparison(avgUSD, userProfile.currentSalary)
    : undefined;
  
  // Market comparison
  const betterThanPercent = Math.min(95, Math.max(5, comfortScore * 0.9));
  const relativeToLocalAverage = cityData.avgNetSalaryUSD
    ? (avgUSD / cityData.avgNetSalaryUSD) * 100
    : undefined;
  
  // Generate recommendations and warnings
  const { recommendations, warnings } = generateRecommendationsAndWarnings({
    avgUSD,
    familyComfortScore,
    cityData,
    userProfile,
    workMode,
    comparisonToExpected,
    relativeToLocalAverage,
  });
  
  return {
    originalSalary: parsed,
    normalizedSalaryUSD: {
      min: minUSD,
      max: maxUSD,
    },
    costOfLivingAdjusted: {
      min: adjustedMin,
      max: adjustedMax,
    },
    familyAdjustedAnalysis: {
      adjustedMin: familyAdjustedMin,
      adjustedMax: familyAdjustedMax,
      familyMultiplier,
      dependentsCost,
      housingRequirement,
    },
    comfortScore,
    familyComfortScore,
    comfortLevel: getComfortLevel(comfortScore),
    familyComfortLevel: getComfortLevel(familyComfortScore),
    purchasingPower,
    savingsPotential,
    familySavingsPotential,
    taxEstimate,
    netSalaryUSD: {
      min: netMinUSD,
      max: netMaxUSD,
    },
    locationData: {
      city: cityData.city,
      country: cityData.country,
      costOfLivingIndex: cityData.costOfLivingIndex,
      rentIndex: cityData.rentIndex,
      qualityOfLifeIndex: cityData.qualityOfLifeIndex ?? undefined,
      safetyIndex: cityData.safetyIndex ?? undefined,
      healthcareIndex: cityData.healthcareIndex ?? undefined,
      educationIndex: cityData.educationIndex ?? undefined,
      avgNetSalaryUSD: cityData.avgNetSalaryUSD ?? undefined,
      medianHousePriceUSD: cityData.medianHousePriceUSD ?? undefined,
      incomeTaxRate: cityData.incomeTaxRate ?? undefined,
    },
    comparisonToExpected,
    comparisonToCurrent,
    betterThanPercent,
    relativeToLocalAverage,
    recommendations,
    warnings,
  };
}

// Synchronous version for immediate UI updates
export function calculateEnhancedSalarySync(
  salaryStr: string | undefined,
  jobLocation: string | undefined,
  workMode: 'remote' | 'hybrid' | 'onsite' = 'onsite',
  userProfile?: Partial<UserProfile>,
  cachedCityData?: any
): EnhancedSalaryAnalysis | null {
  if (!salaryStr || !cachedCityData) return null;
  
  const parsed = parseSalaryString(salaryStr);
  if (!parsed) return null;
  
  // Use cached city data and sync currency conversion
  const minUSD = convertToUSDSync(parsed.min, parsed.currency);
  const maxUSD = convertToUSDSync(parsed.max, parsed.currency);
  const avgUSD = (minUSD + maxUSD) / 2;
  
  // Apply the same calculations as async version
  // ... (similar logic but with cached data)
  
  return null; // Simplified for now - full implementation would mirror async version
}

function determineEffectiveLocation(
  jobLocation: string | undefined,
  workMode: 'remote' | 'hybrid' | 'onsite',
  userProfile?: Partial<UserProfile>
) {
  // For remote jobs, use user's current location
  if (workMode === 'remote') {
    return {
      city: userProfile?.currentLocation || 'Remote',
      country: userProfile?.currentCountry || 'USA',
      state: undefined,
    };
  }
  
  // For hybrid/onsite, use job location
  if (jobLocation) {
    const parts = jobLocation.split(',').map(p => p.trim());
    return {
      city: parts[0] || 'Unknown',
      country: parts[parts.length - 1] || 'USA',
      state: parts.length > 2 ? parts[1] : undefined,
    };
  }
  
  // Fallback to user's location
  return {
    city: userProfile?.currentLocation || 'Remote',
    country: userProfile?.currentCountry || 'USA',
    state: undefined,
  };
}

function calculateFamilyMultiplier(familySize: number, dependents: number): number {
  // Base multiplier for family size
  const baseFamilyMultiplier = 1 + (familySize - 1) * 0.3; // Each additional family member adds 30%
  
  // Additional multiplier for dependents (children, elderly care)
  const dependentsMultiplier = 1 + dependents * 0.4; // Each dependent adds 40%
  
  return Math.min(baseFamilyMultiplier * dependentsMultiplier, 3.0); // Cap at 3x
}

function calculateDependentsCost(dependents: number, cityData: any): number {
  // Estimate annual cost per dependent based on city data
  // Children: education, healthcare, childcare
  // Scale with cost of living
  const baseCostPerDependent = 15000; // USD per year base cost
  const adjustedCost = (baseCostPerDependent * cityData.costOfLivingIndex) / 100;
  
  return dependents * adjustedCost;
}

function calculateHousingRequirement(
  familySize: number,
  housingPreference: string | undefined,
  cityData: any
): number {
  // Estimate additional housing costs for larger families
  const baseHousingCost = (cityData.rentIndex / 100) * 30000; // Base rent in USD
  const familySizeMultiplier = 1 + (familySize - 1) * 0.25; // 25% more per additional person
  
  return baseHousingCost * familySizeMultiplier;
}

function calculateFamilyComfortScore(
  salaryUSD: number,
  costIndex: number,
  familySize: number,
  dependents: number,
  housingRequirement: number
): number {
  // Adjust salary for family requirements
  const familyMultiplier = calculateFamilyMultiplier(familySize, dependents);
  const dependentsCost = dependents * 15000 * (costIndex / 100);
  const totalFamilyRequirement = salaryUSD * familyMultiplier + dependentsCost;
  
  // Calculate comfort based on family-adjusted salary
  const adjustedSalary = (totalFamilyRequirement / costIndex) * 100;
  
  // Family-specific thresholds (higher than individual)
  const thresholds = {
    struggling: 50000 + (dependents * 15000),
    tight: 80000 + (dependents * 20000),
    comfortable: 120000 + (dependents * 25000),
    thriving: 180000 + (dependents * 30000),
    luxurious: 250000 + (dependents * 35000),
  };
  
  if (adjustedSalary < thresholds.struggling) {
    return Math.max(0, (adjustedSalary / thresholds.struggling) * 20);
  } else if (adjustedSalary < thresholds.tight) {
    return 20 + ((adjustedSalary - thresholds.struggling) / (thresholds.tight - thresholds.struggling)) * 20;
  } else if (adjustedSalary < thresholds.comfortable) {
    return 40 + ((adjustedSalary - thresholds.tight) / (thresholds.comfortable - thresholds.tight)) * 20;
  } else if (adjustedSalary < thresholds.thriving) {
    return 60 + ((adjustedSalary - thresholds.comfortable) / (thresholds.thriving - thresholds.comfortable)) * 20;
  } else if (adjustedSalary < thresholds.luxurious) {
    return 80 + ((adjustedSalary - thresholds.thriving) / (thresholds.luxurious - thresholds.thriving)) * 15;
  } else {
    return Math.min(100, 95 + (adjustedSalary - thresholds.luxurious) / 100000);
  }
}

function calculateSavingsPotential(salaryUSD: number, costIndex: number): number {
  const adjustedSalary = (salaryUSD / costIndex) * 100;
  const basicCosts = 35000;
  const comfortableCosts = 55000;
  
  if (adjustedSalary <= basicCosts) {
    return 0;
  } else if (adjustedSalary <= comfortableCosts) {
    return ((adjustedSalary - basicCosts) / adjustedSalary) * 100;
  } else {
    const surplus = adjustedSalary - comfortableCosts;
    return Math.min(50, 15 + (surplus / adjustedSalary) * 100);
  }
}

function calculateFamilySavingsPotential(
  salaryUSD: number,
  costIndex: number,
  familyMultiplier: number,
  dependentsCost: number
): number {
  const adjustedSalary = (salaryUSD / costIndex) * 100;
  const familyBasicCosts = 35000 * familyMultiplier + dependentsCost;
  const familyComfortableCosts = 55000 * familyMultiplier + dependentsCost;
  
  if (adjustedSalary <= familyBasicCosts) {
    return 0;
  } else if (adjustedSalary <= familyComfortableCosts) {
    return ((adjustedSalary - familyBasicCosts) / adjustedSalary) * 100;
  } else {
    const surplus = adjustedSalary - familyComfortableCosts;
    return Math.min(40, 10 + (surplus / adjustedSalary) * 100);
  }
}

function estimateTaxRate(salaryUSD: number, country: string): number {
  // Simplified tax estimation by country and income level
  const taxRates: Record<string, { low: number; mid: number; high: number }> = {
    'USA': { low: 15, mid: 22, high: 32 },
    'UK': { low: 20, mid: 40, high: 45 },
    'Canada': { low: 15, mid: 26, high: 33 },
    'Germany': { low: 14, mid: 42, high: 45 },
    'France': { low: 14, mid: 30, high: 41 },
    'Australia': { low: 19, mid: 32.5, high: 37 },
    'Singapore': { low: 0, mid: 15, high: 22 },
    'Japan': { low: 15, mid: 33, high: 45 },
    'Netherlands': { low: 37, mid: 37, high: 49.5 },
    'Switzerland': { low: 13, mid: 25, high: 35 },
    'Sweden': { low: 32, mid: 52, high: 57 },
    'Norway': { low: 22, mid: 35.8, high: 47.8 },
    'Denmark': { low: 38, mid: 56, high: 56 },
  };
  
  const rates = taxRates[country] || taxRates['USA'];
  
  if (salaryUSD < 50000) return rates.low;
  if (salaryUSD < 150000) return rates.mid;
  return rates.high;
}

function calculateExpectedComparison(
  avgUSD: number,
  userProfile: Partial<UserProfile>
) {
  const expectedMin = userProfile.expectedSalaryMin || 0;
  const expectedMax = userProfile.expectedSalaryMax || 0;
  
  return {
    meetMinExpectation: avgUSD >= expectedMin,
    exceedsMaxExpectation: expectedMax > 0 && avgUSD > expectedMax,
    percentageOfMinExpected: expectedMin > 0 ? (avgUSD / expectedMin) * 100 : 0,
    percentageOfMaxExpected: expectedMax > 0 ? (avgUSD / expectedMax) * 100 : 0,
  };
}

function calculateCurrentComparison(avgUSD: number, currentSalary: number) {
  const increaseUSD = avgUSD - currentSalary;
  const increasePct = (increaseUSD / currentSalary) * 100;
  
  return {
    increasePct,
    increaseUSD,
    isRaise: increaseUSD > 0,
  };
}

function generateRecommendationsAndWarnings(params: {
  avgUSD: number;
  familyComfortScore: number;
  cityData: any;
  userProfile?: Partial<UserProfile>;
  workMode: string;
  comparisonToExpected?: any;
  relativeToLocalAverage?: number;
}) {
  const recommendations: string[] = [];
  const warnings: string[] = [];
  const { avgUSD, familyComfortScore, cityData, userProfile, workMode, comparisonToExpected, relativeToLocalAverage } = params;
  
  // Salary level recommendations
  if (familyComfortScore < 40) {
    warnings.push('This salary may not provide comfortable living for your family size');
    recommendations.push('Consider negotiating for a higher base salary or additional benefits');
  }
  
  if (familyComfortScore >= 80) {
    recommendations.push('This salary offers excellent financial security for your family');
  }
  
  // Cost of living recommendations
  if (cityData.costOfLivingIndex > 120) {
    warnings.push('This city has a very high cost of living');
    recommendations.push('Factor in higher living expenses when evaluating the offer');
  }
  
  if (cityData.costOfLivingIndex < 60) {
    recommendations.push('Low cost of living area - your salary will go further');
  }
  
  // Remote work recommendations
  if (workMode === 'remote' && userProfile?.openToRelocation) {
    recommendations.push('Consider relocating to a lower cost area to maximize purchasing power');
  }
  
  // Family-specific recommendations
  const dependents = userProfile?.dependents || 0;
  if (dependents > 0) {
    if (cityData.educationIndex && cityData.educationIndex > 80) {
      recommendations.push('Excellent education system for your dependents');
    }
    if (cityData.healthcareIndex && cityData.healthcareIndex > 80) {
      recommendations.push('Good healthcare system important for families');
    }
  }
  
  // Market comparison recommendations
  if (relativeToLocalAverage && relativeToLocalAverage > 150) {
    recommendations.push('Salary is significantly above local average - excellent offer');
  } else if (relativeToLocalAverage && relativeToLocalAverage < 80) {
    warnings.push('Salary is below local average for this area');
  }
  
  // Expectation comparison
  if (comparisonToExpected?.meetMinExpectation === false) {
    warnings.push('Salary is below your minimum expectation');
    recommendations.push('Consider if other benefits compensate for lower base salary');
  }
  
  return { recommendations, warnings };
}

function calculateComfortScore(salaryUSD: number, costIndex: number): number {
  const adjustedSalary = (salaryUSD / costIndex) * 100;
  
  const thresholds = {
    struggling: 40000,
    tight: 60000,
    comfortable: 100000,
    thriving: 150000,
    luxurious: 200000,
  };
  
  if (adjustedSalary < thresholds.struggling) {
    return Math.max(0, (adjustedSalary / thresholds.struggling) * 20);
  } else if (adjustedSalary < thresholds.tight) {
    return 20 + ((adjustedSalary - thresholds.struggling) / (thresholds.tight - thresholds.struggling)) * 20;
  } else if (adjustedSalary < thresholds.comfortable) {
    return 40 + ((adjustedSalary - thresholds.tight) / (thresholds.comfortable - thresholds.tight)) * 20;
  } else if (adjustedSalary < thresholds.thriving) {
    return 60 + ((adjustedSalary - thresholds.comfortable) / (thresholds.thriving - thresholds.comfortable)) * 20;
  } else if (adjustedSalary < thresholds.luxurious) {
    return 80 + ((adjustedSalary - thresholds.thriving) / (thresholds.luxurious - thresholds.thriving)) * 15;
  } else {
    return Math.min(100, 95 + (adjustedSalary - thresholds.luxurious) / 50000);
  }
}

function getComfortLevel(score: number): 'struggling' | 'tight' | 'comfortable' | 'thriving' | 'luxurious' {
  if (score < 20) return 'struggling';
  if (score < 40) return 'tight';
  if (score < 60) return 'comfortable';
  if (score < 80) return 'thriving';
  return 'luxurious';
}

// Export utility functions
export { determineEffectiveLocation, calculateFamilyMultiplier, estimateTaxRate };