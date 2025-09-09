import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateToken } from '@/lib/auth'
import { calculateEnhancedSalary } from '@/lib/services/salary-calculator'
import { parseSalaryString } from '@/lib/salary-intelligence'
import { numbeoScraper } from '@/lib/services/numbeo-scraper'
import { locationResolver } from '@/lib/services/location-resolver'
import { marketIntelligence } from '@/lib/services/market-intelligence-real'
import { 
  withErrorHandling, 
  AuthenticationError, 
  NotFoundError, 
  validateId 
} from '@/lib/error-handling'

interface EnhancedSalaryAnalysis {
  jobId: string
  scenario: 'has_salary' | 'no_salary' | 'remote_job'
  hasData: boolean
  
  // Original job data
  originalSalary?: {
    raw: string
    parsed?: {
      min: number
      max: number
      midpoint: number
      currency: string
      confidence: number
      rangeWidth: number
      rangePercent: number
    }
  }
  
  // Location analysis
  locationAnalysis: {
    original: string
    resolved: {
      city: string
      country: string
      state?: string
      isRemote: boolean
      confidence: number
      resolvedBy: string
      warnings?: string[]
      alternatives?: any[]
    }
    costOfLiving?: {
      costOfLivingIndex: number
      rentIndex: number
      qualityOfLifeIndex?: number
      safetyIndex?: number
      healthcareIndex?: number
      educationIndex?: number
    }
  }
  
  // Market intelligence
  marketIntelligence: {
    roleMatch: {
      matchedRole: string
      confidence: number
      keywords: string[]
    }
    salaryEstimates: {
      junior: { min: number; max: number; median: number }
      mid: { min: number; max: number; median: number }
      senior: { min: number; max: number; median: number }
      confidence: number
    }
    locationMultiplier: number
    negotiationInsights: {
      leverage: 'low' | 'medium' | 'high'
      factors: string[]
      recommendations: string[]
    }
  }
  
  // Living wage analysis
  livingWage: {
    survival: {
      grossAnnual: number
      netMonthly: number
      breakdown: Record<string, number>
    }
    comfortable: {
      grossAnnual: number
      netMonthly: number
      breakdown: Record<string, number>
    }
    optimal: {
      grossAnnual: number
      netMonthly: number
      breakdown: Record<string, number>
    }
    recommendedLevel: 'survival' | 'comfortable' | 'optimal'
  }
  
  // Enhanced calculations
  enhancedCalculations: {
    netSalaryUSD?: { min: number; max: number }
    purchasingPower?: number
    savingsPotential?: number
    comfortLevel?: string
    comfortScore?: number
    betterThanPercent?: number
  }
  
  // Recommendations
  recommendations: {
    salaryTargets: {
      minimum: number
      comfortable: number
      stretch: number
    }
    negotiationRange: { min: number; max: number }
    keyInsights: string[]
    actionItems: string[]
  }
  
  // Confidence and metadata
  confidence: {
    overall: number
    salary: number
    location: number
    market: number
    costOfLiving: number
  }
  
  // Comparison to user profile
  userComparison?: {
    vsExpectedSalary?: {
      percentage: number
      verdict: string
    }
    vsCurrentSalary?: {
      percentage: number
      verdict: string
    }
    profileCompleteness: number
    suggestions: string[]
  }
}

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Extract and validate token
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    throw new AuthenticationError('Authorization token required')
  }

  const user = await validateToken(token)
  if (!user) {
    throw new AuthenticationError('Invalid or expired token')
  }

  // Validate job ID parameter
  const resolvedParams = await params
  validateId(resolvedParams.id, 'Job ID')
  const jobId = resolvedParams.id

  // Fetch job data
  const job = await prisma.job.findUnique({
    where: { id: jobId, userId: user.id },
  })

  if (!job) {
    throw new NotFoundError('Job')
  }

  // Fetch user profile for personalized analysis
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: user.id }
  })

  try {
    // 1. Determine scenario
    const scenario = determineScenario(job)
    
    // 2. Resolve location using enhanced service
    const locationResolution = await locationResolver.resolveLocation(
      {
        jobLocation: job.location || '',
        workMode: (job.workMode as 'remote' | 'hybrid' | 'onsite') || 'onsite',
        company: job.company || '',
        jobTitle: job.title || ''
      },
      userProfile ? {
        currentLocation: userProfile.currentLocation || undefined,
        currentCountry: userProfile.currentCountry || undefined
      } : undefined
    )

    // 3. Get market intelligence
    const marketAnalysis = await marketIntelligence.getMarketAnalysis(
      job.title || '',
      `${locationResolution.city}, ${locationResolution.country}`
    )

    // 4. Calculate living wage
    const livingWageEstimate = await calculateLivingWage(
      locationResolution,
      userProfile
    )

    // 5. Parse salary if available
    let originalSalaryData = null
    let enhancedCalculations = null
    
    if (scenario === 'has_salary' && job.salary) {
      const parsedSalary = parseSalaryString(job.salary)
      if (parsedSalary) {
        originalSalaryData = {
          raw: job.salary,
          parsed: {
            min: parsedSalary.min,
            max: parsedSalary.max,
            midpoint: (parsedSalary.min + parsedSalary.max) / 2,
            currency: parsedSalary.currency,
            confidence: calculateSalaryConfidence(parsedSalary),
            rangeWidth: parsedSalary.max - parsedSalary.min,
            rangePercent: ((parsedSalary.max - parsedSalary.min) / ((parsedSalary.min + parsedSalary.max) / 2)) * 100
          }
        }

        // Enhanced calculations
        try {
          const enhancedResult = await calculateEnhancedSalary(
            job.salary,
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
          )

          enhancedCalculations = enhancedResult
        } catch (error) {
          console.warn('Enhanced salary calculation failed:', error)
        }
      }
    }

    // 6. Get cost of living data
    let costOfLivingData = null
    try {
      if (locationResolution.city !== 'Remote' && locationResolution.city !== 'Global') {
        costOfLivingData = await numbeoScraper.getCityData(
          locationResolution.city,
          locationResolution.country,
          locationResolution.state
        )
      }
    } catch (error) {
      console.warn('Cost of living data unavailable:', error)
    }

    // 7. Generate recommendations
    const recommendations = generateRecommendations(
      scenario,
      originalSalaryData,
      marketAnalysis,
      livingWageEstimate,
      locationResolution,
      userProfile
    )

    // 8. Calculate confidence scores
    const confidence = calculateConfidenceScores(
      originalSalaryData,
      locationResolution,
      marketAnalysis,
      costOfLivingData
    )

    // 9. User profile comparison
    const userComparison = generateUserComparison(
      originalSalaryData,
      marketAnalysis,
      userProfile
    )

    // 10. Build comprehensive response
    const analysis: EnhancedSalaryAnalysis = {
      jobId,
      scenario,
      hasData: scenario === 'has_salary' && originalSalaryData !== null,
      
      originalSalary: originalSalaryData || undefined,
      
      locationAnalysis: {
        original: job.location || '',
        resolved: locationResolution,
        costOfLiving: costOfLivingData ? {
          costOfLivingIndex: costOfLivingData.costOfLivingIndex,
          rentIndex: costOfLivingData.rentIndex,
          qualityOfLifeIndex: costOfLivingData.qualityOfLifeIndex || undefined,
          safetyIndex: costOfLivingData.safetyIndex || undefined,
          healthcareIndex: costOfLivingData.healthcareIndex || undefined,
          educationIndex: costOfLivingData.educationIndex || undefined
        } : undefined
      },
      
      marketIntelligence: {
        roleMatch: {
          matchedRole: marketAnalysis.roleIntelligence?.title || job.title || 'Software Engineer',
          confidence: marketAnalysis.roleIntelligence?.matchConfidence || 0.7,
          keywords: marketAnalysis.roleIntelligence?.matchedKeywords || []
        },
        salaryEstimates: {
          junior: {
            min: Math.round(marketAnalysis.salaryEstimate.min * 0.6),
            max: Math.round(marketAnalysis.salaryEstimate.max * 0.6),
            median: Math.round(marketAnalysis.salaryEstimate.median * 0.6)
          },
          mid: {
            min: marketAnalysis.salaryEstimate.min,
            max: marketAnalysis.salaryEstimate.max,
            median: marketAnalysis.salaryEstimate.median
          },
          senior: {
            min: Math.round(marketAnalysis.salaryEstimate.min * 1.5),
            max: Math.round(marketAnalysis.salaryEstimate.max * 1.5),
            median: Math.round(marketAnalysis.salaryEstimate.median * 1.5)
          },
          confidence: marketAnalysis.confidenceScore || 0.75
        },
        locationMultiplier: marketAnalysis.locationData?.multiplier || 1.0,
        negotiationInsights: {
          leverage: marketAnalysis.confidenceScore > 0.8 ? 'high' as const : 
                   marketAnalysis.confidenceScore > 0.6 ? 'medium' as const : 'low' as const,
          factors: [
            `Market demand for ${marketAnalysis.roleIntelligence?.title || job.title}`,
            `Location competitiveness in ${marketAnalysis.locationData?.city}`,
            marketAnalysis.salaryEstimate.source === 'market_calculation' ? 
              'Real market data available' : 'Estimated market data'
          ],
          recommendations: [
            'Research similar positions in your area',
            'Highlight relevant skills and experience',
            marketAnalysis.salaryEstimate.confidence > 0.8 ? 
              'Strong market position for negotiation' : 'Consider additional skill development'
          ]
        }
      },
      
      livingWage: livingWageEstimate,
      
      enhancedCalculations: enhancedCalculations || {},
      
      recommendations,
      
      confidence,
      
      userComparison
    }

    return NextResponse.json(analysis)
    
  } catch (error) {
    console.error('Salary analysis failed:', error)
    
    // Return minimal analysis on failure
    return NextResponse.json({
      jobId,
      scenario: 'no_salary',
      hasData: false,
      error: 'Analysis temporarily unavailable',
      locationAnalysis: {
        original: job.location || '',
        resolved: {
          city: 'Unknown',
          country: 'Unknown',
          isRemote: false,
          confidence: 0,
          resolvedBy: 'fallback'
        }
      },
      marketIntelligence: {
        roleMatch: { matchedRole: 'Unknown', confidence: 0, keywords: [] },
        salaryEstimates: {
          junior: { min: 0, max: 0, median: 0 },
          mid: { min: 0, max: 0, median: 0 },
          senior: { min: 0, max: 0, median: 0 },
          confidence: 0
        },
        locationMultiplier: 1,
        negotiationInsights: {
          leverage: 'low' as const,
          factors: [],
          recommendations: []
        }
      },
      livingWage: {
        survival: { grossAnnual: 0, netMonthly: 0, breakdown: {} },
        comfortable: { grossAnnual: 0, netMonthly: 0, breakdown: {} },
        optimal: { grossAnnual: 0, netMonthly: 0, breakdown: {} },
        recommendedLevel: 'comfortable' as const
      },
      enhancedCalculations: {},
      recommendations: {
        salaryTargets: { minimum: 0, comfortable: 0, stretch: 0 },
        negotiationRange: { min: 0, max: 0 },
        keyInsights: ['Analysis temporarily unavailable'],
        actionItems: ['Please try again later']
      },
      confidence: {
        overall: 0,
        salary: 0,
        location: 0,
        market: 0,
        costOfLiving: 0
      }
    }, { status: 200 })
  }
})

function determineScenario(job: any): 'has_salary' | 'no_salary' | 'remote_job' {
  const hasValidSalary = job.salary && 
    job.salary.trim() && 
    !job.salary.toLowerCase().includes('competitive') &&
    !job.salary.toLowerCase().includes('negotiable')
    
  const isRemote = job.location?.toLowerCase().includes('remote') || 
                   job.workMode === 'remote' ||
                   job.location?.toLowerCase().includes('worldwide')

  if (hasValidSalary) return 'has_salary'
  if (isRemote) return 'remote_job' 
  return 'no_salary'
}

function calculateSalaryConfidence(parsedSalary: any): number {
  const rangeWidth = parsedSalary.max - parsedSalary.min
  const midpoint = (parsedSalary.min + parsedSalary.max) / 2
  const rangePercent = (rangeWidth / midpoint) * 100
  
  let confidence = 0.8
  if (rangePercent > 100) confidence = 0.4 // Very wide range
  else if (rangePercent > 50) confidence = 0.6 // Wide range
  else if (rangePercent > 20) confidence = 0.7 // Medium range
  
  return confidence
}

async function calculateLivingWage(locationResolution: any, userProfile: any) {
  const familySize = userProfile?.familySize || 1
  const savingsRate = userProfile?.targetSavingsRate || 15
  const lifestyle = userProfile?.lifestyle || 'comfortable'
  
  // Get real cost of living data
  let costData = null;
  try {
    if (locationResolution.city !== 'Remote' && locationResolution.city !== 'Global') {
      const response = await fetch(`/api/cost-of-living?city=${encodeURIComponent(locationResolution.city)}&country=${encodeURIComponent(locationResolution.country)}`);
      if (response.ok) {
        costData = await response.json();
      }
    }
  } catch (error) {
    console.log('Could not fetch cost of living data');
  }

  // Base costs derived from US Bureau of Labor Statistics Consumer Expenditure Survey
  const usBLSBaseCosts = {
    housing: 1784, // Average US housing cost (2023)
    food: 473,     // Average US food cost
    transportation: 483, // Average US transportation
    utilities: 298,      // Average US utilities
    healthcare: 414,     // Average US healthcare
    discretionary: 650   // Other expenses
  };

  // Apply real location multiplier
  const locationMultiplier = costData ? (costData.costOfLivingIndex / 100) : (locationResolution.multiplier || 1.0);
  
  // Family size adjustments based on USDA data
  const familySizeAdjustments = {
    1: 1.0,
    2: 1.6,  // Adults typically share housing costs
    3: 1.9,  // Economies of scale
    4: 2.2,
    5: 2.5
  };
  
  const familyMultiplier = familySizeAdjustments[Math.min(familySize, 5) as keyof typeof familySizeAdjustments] || 2.5;
  
  // Lifestyle adjustments
  const lifestyleMultipliers = {
    'minimal': { housing: 0.75, food: 0.7, discretionary: 0.4 },
    'comfortable': { housing: 1.0, food: 1.0, discretionary: 1.0 },
    'luxury': { housing: 1.4, food: 1.3, discretionary: 2.0 }
  };
  
  const lifestyleAdjust = lifestyleMultipliers[lifestyle as keyof typeof lifestyleMultipliers] || lifestyleMultipliers.comfortable;

  const calculateLevel = (levelMultiplier: number) => {
    // Apply all multipliers to base costs
    const housing = usBLSBaseCosts.housing * locationMultiplier * (familySize === 1 ? 1.0 : familyMultiplier * 0.6) * lifestyleAdjust.housing * levelMultiplier;
    const food = usBLSBaseCosts.food * locationMultiplier * familyMultiplier * lifestyleAdjust.food * levelMultiplier;
    const transportation = usBLSBaseCosts.transportation * locationMultiplier * (1 + (familySize - 1) * 0.2) * levelMultiplier;
    const utilities = usBLSBaseCosts.utilities * locationMultiplier * (1 + (familySize - 1) * 0.15) * levelMultiplier;
    const healthcare = usBLSBaseCosts.healthcare * locationMultiplier * familyMultiplier * levelMultiplier;
    const discretionary = usBLSBaseCosts.discretionary * locationMultiplier * lifestyleAdjust.discretionary * levelMultiplier;
    
    const totalMonthly = housing + food + transportation + utilities + healthcare + discretionary;
    
    // Calculate savings and taxes
    const savings = (totalMonthly * savingsRate) / (100 - savingsRate);
    
    // Progressive tax calculation (simplified)
    const grossMonthly = totalMonthly + savings;
    const annualGross = grossMonthly * 12;
    let taxes = 0;
    
    if (annualGross <= 20000) taxes = annualGross * 0.10;
    else if (annualGross <= 50000) taxes = 2000 + (annualGross - 20000) * 0.15;
    else if (annualGross <= 100000) taxes = 6500 + (annualGross - 50000) * 0.22;
    else taxes = 17500 + (annualGross - 100000) * 0.28;
    
    const monthlyTaxes = taxes / 12;
    const finalGrossMonthly = grossMonthly + monthlyTaxes;
    
    return {
      grossAnnual: finalGrossMonthly * 12,
      netMonthly: grossMonthly,
      breakdown: {
        housing: Math.round(housing),
        food: Math.round(food),
        transportation: Math.round(transportation),
        utilities: Math.round(utilities),
        healthcare: Math.round(healthcare),
        discretionary: Math.round(discretionary),
        savings: Math.round(savings),
        taxes: Math.round(monthlyTaxes)
      }
    }
  }

  // Calculate different comfort levels
  const survival = calculateLevel(0.65);   // Bare minimum
  const comfortable = calculateLevel(1.0); // Standard living
  const optimal = calculateLevel(1.4);     // High quality of life
  
  // Determine recommended level based on user profile
  let recommendedLevel: 'survival' | 'comfortable' | 'optimal' = 'comfortable';
  if (userProfile?.currentSalary) {
    if (userProfile.currentSalary < comfortable.grossAnnual * 0.9) {
      recommendedLevel = 'survival';
    } else if (userProfile.currentSalary > optimal.grossAnnual * 0.8) {
      recommendedLevel = 'optimal';
    }
  }

  return {
    survival,
    comfortable,
    optimal,
    recommendedLevel
  }
}

function generateRecommendations(
  scenario: string,
  salaryData: any,
  marketAnalysis: any,
  livingWage: any,
  locationResolution: any,
  userProfile: any
) {
  const keyInsights: string[] = []
  const actionItems: string[] = []
  
  // Market-based recommendations using real data
  const marketMedian = marketAnalysis.salaryEstimate?.median || livingWage.comfortable.grossAnnual
  const comfortable = livingWage.comfortable.grossAnnual
  
  const salaryTargets = {
    minimum: Math.max(livingWage.survival.grossAnnual, marketMedian * 0.8),
    comfortable: Math.max(comfortable, marketMedian),
    stretch: Math.round(marketMedian * 1.5) // 50% above market median
  }

  if (scenario === 'has_salary' && salaryData?.parsed) {
    const jobSalary = salaryData.parsed.midpoint
    
    if (jobSalary < salaryTargets.minimum) {
      keyInsights.push('This salary may not cover basic living costs in this location')
      actionItems.push('Consider negotiating based on living wage requirements')
    } else if (jobSalary >= salaryTargets.comfortable) {
      keyInsights.push('Salary is competitive for the location and role')
    }
  }

  keyInsights.push('Market analysis provides negotiation guidance')
  actionItems.push('Research similar positions in your area')

  if (locationResolution.confidence < 0.7) {
    actionItems.push('Clarify the exact work location for accurate analysis')
  }

  if (!userProfile?.currentLocation) {
    actionItems.push('Add your location to profile for personalized analysis')
  }

  return {
    salaryTargets,
    negotiationRange: {
      min: salaryTargets.comfortable * 0.9,
      max: salaryTargets.stretch * 0.9
    },
    keyInsights,
    actionItems
  }
}

function calculateConfidenceScores(
  salaryData: any,
  locationResolution: any,
  marketAnalysis: any,
  costOfLivingData: any
) {
  const salaryConfidence = salaryData?.parsed?.confidence || 0
  const locationConfidence = locationResolution.confidence
  const marketConfidence = marketAnalysis.confidenceScore || 0.75
  const costOfLivingConfidence = costOfLivingData ? 0.9 : 0.5

  return {
    salary: salaryConfidence,
    location: locationConfidence,
    market: marketConfidence,
    costOfLiving: costOfLivingConfidence,
    overall: (salaryConfidence + locationConfidence + marketConfidence + costOfLivingConfidence) / 4
  }
}

function generateUserComparison(salaryData: any, marketAnalysis: any, userProfile: any) {
  if (!userProfile) return undefined

  const comparison: any = {}
  const suggestions: string[] = []
  let profileCompleteness = 0

  // Check profile completeness
  const profileFields = [
    'currentLocation', 'currentCountry', 'currentSalary', 
    'expectedSalaryMin', 'familySize', 'maritalStatus'
  ]
  
  profileCompleteness = profileFields.reduce((count, field) => {
    return userProfile[field] ? count + 1 : count
  }, 0) / profileFields.length

  if (profileCompleteness < 0.7) {
    suggestions.push('Complete your profile for more personalized analysis')
  }

  // Salary comparisons
  if (salaryData?.parsed && userProfile.expectedSalaryMin) {
    const jobSalary = salaryData.parsed.midpoint
    const expectedSalary = userProfile.expectedSalaryMin
    const percentage = Math.round(((jobSalary - expectedSalary) / expectedSalary) * 100)
    
    comparison.vsExpectedSalary = {
      percentage,
      verdict: percentage > 0 ? 'above expected' : 'below expected'
    }
  }

  if (salaryData?.parsed && userProfile.currentSalary) {
    const jobSalary = salaryData.parsed.midpoint
    const currentSalary = userProfile.currentSalary
    const percentage = Math.round(((jobSalary - currentSalary) / currentSalary) * 100)
    
    comparison.vsCurrentSalary = {
      percentage,
      verdict: percentage > 0 ? 'salary increase' : 'salary decrease'
    }
  }

  return {
    ...comparison,
    profileCompleteness,
    suggestions
  }
}