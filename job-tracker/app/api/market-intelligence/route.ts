import { NextRequest, NextResponse } from 'next/server'
import { aiSalaryIntelligence } from '@/lib/services/ai-salary-intelligence'
import { withErrorHandling, ValidationError } from '@/lib/error-handling'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json()
  const { jobTitle, location, userId } = body

  if (!jobTitle) {
    throw new ValidationError('Job title is required')
  }

  if (!userId) {
    throw new ValidationError('User ID is required for personalized analysis')
  }

  try {
    // Use AI salary intelligence for market analysis
    const aiAnalysis = await aiSalaryIntelligence.analyzeJobSalary({
      jobTitle: jobTitle,
      location: location || undefined,
      userId: userId
    })

    // Transform AI result to match expected market analysis format
    const marketAnalysis = {
      jobTitle: aiAnalysis.normalized_role,
      location: `${aiAnalysis.location.city || 'Unknown'}, ${aiAnalysis.location.country}`,
      experienceLevel: aiAnalysis.level,
      salaryRange: {
        min: aiAnalysis.expected_salary_range.min,
        max: aiAnalysis.expected_salary_range.max,
        currency: aiAnalysis.currency,
        period: aiAnalysis.expected_salary_range.period
      },
      marketInsights: aiAnalysis.explanations,
      confidence: {
        level: aiAnalysis.confidence.level,
        reasons: aiAnalysis.confidence.reasons
      },
      affordability: {
        score: aiAnalysis.affordability_score,
        label: aiAnalysis.affordability_label,
        monthlyNetIncome: aiAnalysis.monthly_net_income,
        monthlyCoreExpenses: aiAnalysis.monthly_core_expenses
      },
      methodology: 'ai_powered',
      sources: aiAnalysis.sources
    }

    console.log(`AI Market Intelligence completed for ${jobTitle} in ${location}`, {
      userId,
      confidenceLevel: aiAnalysis.confidence.level,
      methodology: 'ai_powered'
    })

    return NextResponse.json(marketAnalysis, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('AI Market Intelligence error:', error)

    // Return error response in expected format
    const errorResponse = {
      jobTitle: jobTitle,
      location: location || 'Unknown',
      error: 'AI market analysis failed',
      message: (error as Error).message,
      methodology: 'ai_powered',
      salaryRange: {
        min: null,
        max: null,
        currency: 'USD',
        period: 'year'
      },
      marketInsights: [`Analysis failed: ${(error as Error).message}`],
      confidence: {
        level: 'low',
        reasons: ['AI processing error occurred']
      }
    }

    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
})

// GET method for API documentation
export const GET = withErrorHandling(async (request: NextRequest) => {
  return NextResponse.json({
    endpoint: 'AI Market Intelligence API',
    method: 'POST',
    description: 'Provides AI-powered market analysis for job titles and locations',
    methodology: 'Uses OpenAI for comprehensive salary and market intelligence',
    required_fields: {
      jobTitle: 'string - Job title to analyze',
      userId: 'string - User ID for personalized analysis'
    },
    optional_fields: {
      location: 'string - Job location (city, country)'
    },
    sample_request: {
      jobTitle: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      userId: 'user_123'
    }
  }, { status: 200 })
})