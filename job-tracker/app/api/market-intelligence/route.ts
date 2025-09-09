import { NextRequest, NextResponse } from 'next/server'
import { marketIntelligence } from '@/lib/services/market-intelligence-real'
import { withErrorHandling } from '@/lib/error-handling'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json()
  const { jobTitle, location } = body

  if (!jobTitle) {
    return NextResponse.json(
      { error: 'Job title is required' },
      { status: 400 }
    )
  }

  try {
    const marketAnalysis = await marketIntelligence.getMarketAnalysis(
      jobTitle,
      location || 'United States'
    )

    return NextResponse.json(marketAnalysis)
  } catch (error) {
    console.error('Market intelligence analysis failed:', error)
    
    // Return fallback data
    return NextResponse.json({
      roleIntelligence: {
        title: jobTitle,
        matchedKeywords: [],
        seniorityLevel: 'mid',
        experienceYears: { min: 2, max: 5 },
        matchConfidence: 0.5
      },
      locationData: {
        city: 'Unknown',
        country: location || 'United States',
        multiplier: 1.0,
        costOfLivingIndex: 100
      },
      salaryEstimate: {
        min: 70000,
        max: 120000,
        median: 95000,
        confidence: 0.5,
        source: 'fallback'
      },
      confidenceScore: 0.5
    })
  }
})

export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const jobTitle = searchParams.get('jobTitle')
  const location = searchParams.get('location')

  if (!jobTitle) {
    return NextResponse.json(
      { error: 'Job title is required' },
      { status: 400 }
    )
  }

  try {
    const estimate = await marketIntelligence.getQuickEstimate(
      jobTitle,
      location || 'United States'
    )

    return NextResponse.json(estimate)
  } catch (error) {
    console.error('Quick estimate failed:', error)
    
    // Return fallback estimate
    return NextResponse.json({
      min: 70000,
      max: 120000,
      median: 95000,
      confidence: 0.5,
      source: 'fallback'
    })
  }
})