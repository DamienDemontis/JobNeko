import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateToken } from '@/lib/auth'
import { aiSalaryIntelligence } from '@/lib/services/ai-salary-intelligence'
import { 
  withErrorHandling, 
  AuthenticationError, 
  NotFoundError, 
  validateId 
} from '@/lib/error-handling'

interface AIEnhancedSalaryAnalysis {
  jobId: string
  scenario: 'has_salary' | 'no_salary' | 'remote_job'
  hasData: boolean
  
  // AI Analysis Results
  aiAnalysis: {
    normalized_role: string
    level: string
    experience_years: number | null
    location: {
      city: string | null
      country: string
      iso_country_code: string
    }
    currency: string
    expected_salary_range: {
      min: number | null
      max: number | null
      period: string
      basis: string
    }
    monthly_net_income: number | null
    monthly_core_expenses: number | null
    affordability_score: number | null
    affordability_label: string
    explanations: string[]
    confidence: {
      level: string
      reasons: string[]
    }
  }
  
  // Original job data (simplified)
  originalSalary?: {
    raw: string
    parsed?: {
      min: number | null
      max: number | null
      currency: string
    }
  }
  
  // Simple recommendations
  recommendations: {
    keyInsights: string[]
    actionItems: string[]
    negotiationAdvice: string[]
  }
  
  // User comparison (if profile available)
  userComparison?: {
    vsExpectedSalary?: {
      percentage: number
      verdict: string
    }
    vsCurrentSalary?: {
      percentage: number
      verdict: string
    }
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
    // Use AI to analyze the job salary with full context
    const aiResult = await aiSalaryIntelligence.analyzeJobSalary({
      jobTitle: job.title,
      company: job.company || undefined,
      location: job.location || undefined,
      description: job.description || undefined,
      requirements: job.requirements || undefined,
      salaryInfo: job.salary || undefined,
      workMode: (job.workMode as 'onsite' | 'hybrid' | 'remote_country' | 'remote_global') || 'onsite',
      userId: user.id
    })

    // Determine scenario
    const scenario = determineScenario(job, aiResult)

    // Parse original salary if available
    let originalSalary: any = undefined
    if (job.salary && aiResult.listed_salary) {
      originalSalary = {
        raw: job.salary,
        parsed: {
          min: aiResult.listed_salary.min,
          max: aiResult.listed_salary.max,
          currency: aiResult.currency
        }
      }
    }

    // Generate recommendations based on AI analysis
    const recommendations = generateAIRecommendations(aiResult, userProfile)

    // Generate user comparison if profile exists
    const userComparison = generateUserComparison(aiResult, userProfile)

    // Build enhanced analysis response
    const analysis: AIEnhancedSalaryAnalysis = {
      jobId: job.id,
      scenario,
      hasData: aiResult.schema_valid,
      
      aiAnalysis: {
        normalized_role: aiResult.normalized_role,
        level: aiResult.level,
        experience_years: aiResult.experience_years,
        location: {
          city: aiResult.location.city,
          country: aiResult.location.country,
          iso_country_code: aiResult.location.iso_country_code
        },
        currency: aiResult.currency,
        expected_salary_range: {
          min: aiResult.expected_salary_range.min,
          max: aiResult.expected_salary_range.max,
          period: aiResult.expected_salary_range.period,
          basis: aiResult.expected_salary_range.basis
        },
        monthly_net_income: aiResult.monthly_net_income,
        monthly_core_expenses: aiResult.monthly_core_expenses,
        affordability_score: aiResult.affordability_score,
        affordability_label: aiResult.affordability_label,
        explanations: aiResult.explanations,
        confidence: {
          level: aiResult.confidence.level,
          reasons: aiResult.confidence.reasons
        }
      },
      
      originalSalary,
      recommendations,
      userComparison
    }

    // Log successful analysis
    console.log(`AI Enhanced Salary Analysis completed for job ${jobId}`, {
      userId: user.id,
      jobTitle: job.title,
      company: job.company || 'unspecified',
      location: job.location || 'unspecified',
      scenario,
      confidenceLevel: aiResult.confidence.level,
      hasUserProfile: !!userProfile,
      methodology: 'ai_powered'
    })

    return NextResponse.json(analysis, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error(`Enhanced salary analysis failed for job ${jobId}:`, error)
    
    // Return minimal error response
    const errorAnalysis: AIEnhancedSalaryAnalysis = {
      jobId: job.id,
      scenario: 'no_salary',
      hasData: false,
      
      aiAnalysis: {
        normalized_role: job.title,
        level: 'unknown',
        experience_years: null,
        location: {
          city: null,
          country: 'Unknown',
          iso_country_code: 'XX'
        },
        currency: 'USD',
        expected_salary_range: {
          min: null,
          max: null,
          period: 'year',
          basis: 'gross'
        },
        monthly_net_income: null,
        monthly_core_expenses: null,
        affordability_score: null,
        affordability_label: 'unaffordable',
        explanations: [`AI analysis failed: ${(error as Error).message}`],
        confidence: {
          level: 'low',
          reasons: ['AI processing error occurred']
        }
      },
      
      recommendations: {
        keyInsights: ['Analysis unavailable due to processing error'],
        actionItems: ['Please try again later'],
        negotiationAdvice: ['Manual salary research recommended']
      }
    }

    return NextResponse.json(errorAnalysis, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
})

/**
 * Determine analysis scenario based on job and AI results
 */
function determineScenario(job: any, aiResult: any): 'has_salary' | 'no_salary' | 'remote_job' {
  if (job.salary || aiResult.listed_salary) {
    return 'has_salary'
  }
  
  if (job.workMode === 'remote' || 
      job.location?.toLowerCase().includes('remote') || 
      aiResult.job_location_mode?.includes('remote')) {
    return 'remote_job'
  }
  
  return 'no_salary'
}

/**
 * Generate AI-powered recommendations
 */
function generateAIRecommendations(aiResult: any, userProfile: any) {
  const recommendations = {
    keyInsights: [...aiResult.explanations] as string[],
    actionItems: [] as string[],
    negotiationAdvice: [] as string[]
  }

  // Add specific insights based on AI analysis
  if (aiResult.affordability_score !== null) {
    if (aiResult.affordability_score < 0) {
      recommendations.actionItems.push('Consider negotiating for higher compensation or additional benefits')
      recommendations.actionItems.push('Look for roles in lower cost-of-living areas if remote work is possible')
    } else if (aiResult.affordability_score > 0.6) {
      recommendations.actionItems.push('This role offers excellent financial comfort for your situation')
    }
  }

  // Add negotiation advice based on experience level
  if (aiResult.level === 'senior' || aiResult.level === 'lead') {
    recommendations.negotiationAdvice.push('As a senior professional, focus on total compensation including equity and bonuses')
    recommendations.negotiationAdvice.push('Emphasize your leadership and impact in salary negotiations')
  } else if (aiResult.level === 'junior') {
    recommendations.negotiationAdvice.push('Focus on learning opportunities and career growth potential')
    recommendations.negotiationAdvice.push('Consider non-salary benefits like training budget and mentorship')
  }

  // Add salary range advice
  if (aiResult.expected_salary_range.min && aiResult.expected_salary_range.max) {
    const midpoint = (aiResult.expected_salary_range.min + aiResult.expected_salary_range.max) / 2
    recommendations.negotiationAdvice.push(`Market range appears to be $${aiResult.expected_salary_range.min?.toLocaleString()} - $${aiResult.expected_salary_range.max?.toLocaleString()}`)
    recommendations.negotiationAdvice.push(`Target around $${Math.round(midpoint).toLocaleString()} as a reasonable starting point`)
  }

  return recommendations
}

/**
 * Generate user profile comparison
 */
function generateUserComparison(aiResult: any, userProfile: any) {
  if (!userProfile) return undefined

  const comparison: any = {
    suggestions: []
  }

  // Compare with expected salary
  if (userProfile.expectedSalaryMin && aiResult.expected_salary_range.min) {
    const percentage = ((aiResult.expected_salary_range.min - userProfile.expectedSalaryMin) / userProfile.expectedSalaryMin) * 100
    comparison.vsExpectedSalary = {
      percentage: Math.round(percentage),
      verdict: percentage >= 0 ? 
        `${Math.round(percentage)}% above your minimum expectation` : 
        `${Math.round(Math.abs(percentage))}% below your minimum expectation`
    }
  }

  // Compare with current salary
  if (userProfile.currentSalary && aiResult.expected_salary_range.min) {
    const percentage = ((aiResult.expected_salary_range.min - userProfile.currentSalary) / userProfile.currentSalary) * 100
    comparison.vsCurrentSalary = {
      percentage: Math.round(percentage),
      verdict: percentage >= 0 ? 
        `${Math.round(percentage)}% increase from current salary` : 
        `${Math.round(Math.abs(percentage))}% decrease from current salary`
    }
  }

  // Add personalized suggestions
  if (userProfile.familySize > 1) {
    comparison.suggestions.push(`Family size of ${userProfile.familySize} considered in cost analysis`)
  }

  if (userProfile.currentLocation) {
    comparison.suggestions.push(`Location analysis includes your current location: ${userProfile.currentLocation}`)
  }

  return comparison
}