import { NextRequest, NextResponse } from 'next/server'
import { numbeoScraper } from '@/lib/services/numbeo-scraper'
import { withErrorHandling } from '@/lib/error-handling'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const city = searchParams.get('city')
  const country = searchParams.get('country')
  const state = searchParams.get('state')

  if (!city || !country) {
    return NextResponse.json(
      { error: 'City and country parameters are required' },
      { status: 400 }
    )
  }

  try {
    // Get real data from Numbeo scraper
    const costOfLivingData = await numbeoScraper.getCityData(
      city,
      country,
      state || undefined
    )

    if (!costOfLivingData) {
      // If Numbeo doesn't have data, use World Bank or fallback calculations
      const fallbackData = await getFallbackCostOfLiving(city, country)
      return NextResponse.json(fallbackData)
    }

    // Transform to expected format
    const response = {
      city: costOfLivingData.city,
      country: costOfLivingData.country,
      state: costOfLivingData.state,
      costOfLivingIndex: costOfLivingData.costOfLivingIndex,
      rentIndex: costOfLivingData.rentIndex,
      groceriesIndex: costOfLivingData.groceriesIndex,
      restaurantIndex: costOfLivingData.restaurantIndex,
      // purchasingPowerIndex: costOfLivingData.purchasingPowerIndex, // Not available in schema
      qualityOfLifeIndex: costOfLivingData.qualityOfLifeIndex || undefined,
      safetyIndex: costOfLivingData.safetyIndex || undefined,
      healthcareIndex: costOfLivingData.healthcareIndex || undefined,
      educationIndex: costOfLivingData.educationIndex || undefined,
      // avgRent fields not available in schema
      // averageRent1BR: costOfLivingData.avgRent1BR || 0,
      // averageRent3BR: costOfLivingData.avgRent3BR || 0,
      avgNetSalaryUSD: costOfLivingData.avgNetSalaryUSD || null,
      medianHousePriceUSD: costOfLivingData.medianHousePriceUSD || null,
      utilities: costOfLivingData.utilitiesIndex || 100,
      transportation: costOfLivingData.transportIndex || 100,
      food: costOfLivingData.groceriesIndex || 100,
      healthcare: costOfLivingData.healthcareIndex || 100,
      dataQuality: costOfLivingData.dataPoints ? 'high' : 'estimated',
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Cost of living API error:', error)
    
    // Return estimated data on error
    const fallbackData = await getFallbackCostOfLiving(city, country)
    return NextResponse.json(fallbackData)
  }
})

async function getFallbackCostOfLiving(city: string, country: string) {
  // Country-based cost indices (relative to US = 100)
  const countryIndices: Record<string, number> = {
    'United States': 100,
    'United Kingdom': 95,
    'Canada': 85,
    'Germany': 80,
    'France': 85,
    'Netherlands': 90,
    'Switzerland': 140,
    'Australia': 95,
    'Japan': 90,
    'Singapore': 110,
    'India': 30,
    'Brazil': 45,
    'Mexico': 40,
    'Poland': 45,
    'Spain': 70,
    'Italy': 75,
    'Sweden': 95,
    'Norway': 120,
    'Denmark': 110,
    'Ireland': 95
  }

  // Major city multipliers
  const cityMultipliers: Record<string, number> = {
    'new york': 1.4,
    'san francisco': 1.5,
    'london': 1.3,
    'paris': 1.2,
    'tokyo': 1.2,
    'zurich': 1.4,
    'singapore': 1.3,
    'sydney': 1.2,
    'toronto': 1.1,
    'vancouver': 1.2,
    'seattle': 1.2,
    'boston': 1.3,
    'los angeles': 1.2,
    'chicago': 1.0,
    'berlin': 0.9,
    'amsterdam': 1.1,
    'dublin': 1.1,
    'stockholm': 1.1,
    'copenhagen': 1.2,
    'oslo': 1.3
  }

  const baseIndex = countryIndices[country] || 75
  const cityMultiplier = cityMultipliers[city.toLowerCase()] || 1.0
  const finalIndex = baseIndex * cityMultiplier

  // Calculate rent based on cost of living
  const rentIndex = finalIndex * 1.2 // Rent typically higher than general COL
  
  // Estimate monthly rents based on index
  const baseRent1BR = 1200 // Base US rent
  const baseRent3BR = 2500 // Base US 3BR rent
  
  return {
    city,
    country,
    costOfLivingIndex: Math.round(finalIndex),
    rentIndex: Math.round(rentIndex),
    groceriesIndex: Math.round(finalIndex * 0.9),
    restaurantIndex: Math.round(finalIndex * 1.1),
    purchasingPowerIndex: Math.round(150 - finalIndex * 0.5),
    qualityOfLifeIndex: Math.round(80 + (100 - finalIndex) * 0.2),
    safetyIndex: 70,
    healthcareIndex: 75,
    educationIndex: 80,
    averageRent1BR: Math.round((baseRent1BR * finalIndex) / 100),
    averageRent3BR: Math.round((baseRent3BR * finalIndex) / 100),
    utilities: Math.round(finalIndex * 0.8),
    transportation: Math.round(finalIndex * 0.9),
    food: Math.round(finalIndex * 0.9),
    healthcare: Math.round(finalIndex * 1.1),
    dataQuality: 'estimated',
    lastUpdated: new Date().toISOString()
  }
}