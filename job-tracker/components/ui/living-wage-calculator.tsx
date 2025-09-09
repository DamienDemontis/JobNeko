'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MapPin, 
  Calculator, 
  TrendingUp, 
  Home, 
  Car, 
  ShoppingCart, 
  Heart, 
  Zap, 
  Target,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Users,
  Briefcase,
  DollarSign
} from 'lucide-react'
import { Slider } from '@/components/ui/slider'

interface LivingWageCalculatorProps {
  location?: string
  jobTitle?: string
  workMode?: 'remote' | 'hybrid' | 'onsite'
  userProfile?: {
    currentLocation?: string
    currentCountry?: string
    currentState?: string
    familySize?: number
    dependents?: number
    maritalStatus?: string
    lifestyle?: 'minimal' | 'comfortable' | 'luxury'
    targetSavingsRate?: number
    currentSalary?: number
  }
  onEstimateUpdate?: (estimate: LivingWageEstimate) => void
}

interface LivingWageEstimate {
  location: {
    city: string
    country: string
    state?: string
    confidence: number
  }
  breakdowns: {
    survival: SalaryBreakdown
    comfortable: SalaryBreakdown
    optimal: SalaryBreakdown
  }
  recommendations: {
    targetLevel: 'survival' | 'comfortable' | 'optimal'
    negotiationRange: { min: number; max: number }
    marketPosition: string
    confidenceScore: number
  }
  factors: {
    familySize: number
    lifestyle: string
    savingsRate: number
    costOfLivingIndex: number
  }
}

interface SalaryBreakdown {
  grossAnnual: number
  netMonthly: number
  categories: {
    housing: number
    food: number
    transportation: number
    utilities: number
    healthcare: number
    savings: number
    discretionary: number
    taxes: number
  }
  description: string
  confidence: number
}

interface CostOfLivingData {
  costOfLivingIndex: number
  rentIndex: number
  qualityOfLifeIndex?: number
  averageRent1BR: number
  averageRent3BR: number
  utilities: number
  transportation: number
  food: number
  healthcare: number
}

const DEFAULT_COST_MULTIPLIERS = {
  'United States': { housing: 1.2, food: 1.1, transport: 1.0, healthcare: 1.5 },
  'Canada': { housing: 1.0, food: 1.0, transport: 0.9, healthcare: 0.3 },
  'United Kingdom': { housing: 1.3, food: 1.1, transport: 1.2, healthcare: 0.0 },
  'Germany': { housing: 0.9, food: 1.0, transport: 0.8, healthcare: 0.2 },
  'Australia': { housing: 1.1, food: 1.0, transport: 1.1, healthcare: 0.1 },
  'Netherlands': { housing: 1.2, food: 1.0, transport: 0.9, healthcare: 0.1 },
  'Switzerland': { housing: 2.0, food: 1.5, transport: 1.3, healthcare: 0.3 },
  'Singapore': { housing: 1.4, food: 0.8, transport: 0.7, healthcare: 0.2 },
  'Remote': { housing: 0.8, food: 0.9, transport: 0.7, healthcare: 1.0 }
}

const LIFESTYLE_MULTIPLIERS = {
  minimal: { discretionary: 0.5, housing: 0.8, food: 0.7 },
  comfortable: { discretionary: 1.0, housing: 1.0, food: 1.0 },
  luxury: { discretionary: 2.0, housing: 1.4, food: 1.3 }
}

const FAMILY_SIZE_MULTIPLIERS = {
  1: { housing: 0.7, food: 1.0, healthcare: 1.0 },
  2: { housing: 1.0, food: 1.6, healthcare: 1.8 },
  3: { housing: 1.3, food: 2.0, healthcare: 2.2 },
  4: { housing: 1.5, food: 2.4, healthcare: 2.6 },
  5: { housing: 1.7, food: 2.8, healthcare: 3.0 }
}

export function LivingWageCalculator({ 
  location, 
  jobTitle, 
  workMode = 'onsite', 
  userProfile,
  onEstimateUpdate 
}: LivingWageCalculatorProps) {
  const [loading, setLoading] = useState(false)
  const [customFamilySize, setCustomFamilySize] = useState<number[]>([userProfile?.familySize || 1])
  const [customSavingsRate, setCustomSavingsRate] = useState<number[]>([userProfile?.targetSavingsRate || 15])
  const [customLifestyle, setCustomLifestyle] = useState<'minimal' | 'comfortable' | 'luxury'>(
    userProfile?.lifestyle || 'comfortable'
  )
  const [showCustomization, setShowCustomization] = useState(false)
  const [costOfLivingData, setCostOfLivingData] = useState<CostOfLivingData | null>(null)
  const [estimate, setEstimate] = useState<LivingWageEstimate | null>(null)

  // Determine effective location for calculations
  const effectiveLocation = useMemo(() => {
    if (workMode === 'remote' && userProfile?.currentLocation) {
      return {
        city: userProfile.currentLocation,
        country: userProfile.currentCountry || 'Remote',
        state: userProfile.currentState,
        isRemote: true
      }
    }
    
    if (location) {
      const parts = location.split(',').map(s => s.trim())
      if (parts.length >= 2) {
        return {
          city: parts[0],
          country: parts[parts.length - 1],
          state: parts.length > 2 ? parts[1] : undefined,
          isRemote: false
        }
      }
      return {
        city: parts[0],
        country: 'Unknown',
        isRemote: false
      }
    }
    
    return {
      city: 'Global',
      country: 'Remote',
      isRemote: true
    }
  }, [location, workMode, userProfile])

  // Fetch cost of living data
  useEffect(() => {
    const fetchCostOfLiving = async () => {
      if (!effectiveLocation.city || effectiveLocation.city === 'Global') return
      
      setLoading(true)
      try {
        const response = await fetch(`/api/cost-of-living?city=${encodeURIComponent(effectiveLocation.city)}&country=${encodeURIComponent(effectiveLocation.country)}`)
        if (response.ok) {
          const data = await response.json()
          setCostOfLivingData(data)
        }
      } catch (error) {
        console.warn('Cost of living data unavailable:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCostOfLiving()
  }, [effectiveLocation])

  // Calculate living wage estimate
  const livingWageEstimate = useMemo((): LivingWageEstimate | null => {
    if (!effectiveLocation.city) return null

    const familySize = customFamilySize[0]
    const savingsRate = customSavingsRate[0]
    const lifestyle = customLifestyle

    // Get cost multipliers for location
    const locationMultipliers = DEFAULT_COST_MULTIPLIERS[effectiveLocation.country as keyof typeof DEFAULT_COST_MULTIPLIERS] || 
                               DEFAULT_COST_MULTIPLIERS['Remote']
    
    // Get lifestyle multipliers
    const lifestyleMultipliers = LIFESTYLE_MULTIPLIERS[lifestyle]
    
    // Get family size multipliers
    const familyMultipliers = FAMILY_SIZE_MULTIPLIERS[Math.min(familySize, 5) as keyof typeof FAMILY_SIZE_MULTIPLIERS]

    // Base costs (monthly, USD)
    const baseCosts = {
      housing: 1200,
      food: 300,
      transportation: 200,
      utilities: 150,
      healthcare: 200,
      discretionary: 400
    }

    // Apply all multipliers
    const calculateCosts = (survivalMultiplier: number, comfortMultiplier: number) => {
      const housing = baseCosts.housing * locationMultipliers.housing * familyMultipliers.housing * lifestyleMultipliers.housing * comfortMultiplier
      const food = baseCosts.food * locationMultipliers.food * familyMultipliers.food * lifestyleMultipliers.food * comfortMultiplier
      const transportation = baseCosts.transportation * locationMultipliers.transport * comfortMultiplier
      const utilities = baseCosts.utilities * familyMultipliers.housing * comfortMultiplier
      const healthcare = baseCosts.healthcare * locationMultipliers.healthcare * familyMultipliers.healthcare * comfortMultiplier
      const discretionary = baseCosts.discretionary * lifestyleMultipliers.discretionary * comfortMultiplier * survivalMultiplier

      const totalMonthly = housing + food + transportation + utilities + healthcare + discretionary
      const savings = (totalMonthly * savingsRate) / (100 - savingsRate)
      const grossMonthly = totalMonthly + savings
      const taxes = grossMonthly * 0.25 // Approximate tax rate
      const grossWithTaxes = grossMonthly + taxes

      return {
        grossAnnual: grossWithTaxes * 12,
        netMonthly: grossMonthly,
        categories: {
          housing: Math.round(housing),
          food: Math.round(food),
          transportation: Math.round(transportation),
          utilities: Math.round(utilities),
          healthcare: Math.round(healthcare),
          savings: Math.round(savings),
          discretionary: Math.round(discretionary),
          taxes: Math.round(taxes)
        }
      }
    }

    // Calculate three levels
    const survival = {
      ...calculateCosts(0.3, 0.7),
      description: 'Bare minimum to cover essential needs',
      confidence: costOfLivingData ? 0.8 : 0.6
    }

    const comfortable = {
      ...calculateCosts(1.0, 1.0),
      description: 'Comfortable living with moderate discretionary spending',
      confidence: costOfLivingData ? 0.9 : 0.7
    }

    const optimal = {
      ...calculateCosts(1.5, 1.3),
      description: 'High quality of life with significant savings and flexibility',
      confidence: costOfLivingData ? 0.9 : 0.7
    }

    // Determine recommended target level
    let targetLevel: 'survival' | 'comfortable' | 'optimal' = 'comfortable'
    if (userProfile?.currentSalary) {
      if (userProfile.currentSalary < survival.grossAnnual * 1.2) targetLevel = 'survival'
      else if (userProfile.currentSalary > comfortable.grossAnnual * 1.2) targetLevel = 'optimal'
    }

    const costOfLivingIndex = costOfLivingData?.costOfLivingIndex || 100

    const estimate: LivingWageEstimate = {
      location: {
        city: effectiveLocation.city,
        country: effectiveLocation.country,
        state: effectiveLocation.state,
        confidence: costOfLivingData ? 0.9 : 0.6
      },
      breakdowns: { survival, comfortable, optimal },
      recommendations: {
        targetLevel,
        negotiationRange: {
          min: comfortable.grossAnnual * 0.9,
          max: optimal.grossAnnual * 0.9
        },
        marketPosition: jobTitle ? `Based on ${jobTitle} in ${effectiveLocation.city}` : `For ${effectiveLocation.city}`,
        confidenceScore: costOfLivingData ? 0.85 : 0.65
      },
      factors: {
        familySize,
        lifestyle,
        savingsRate,
        costOfLivingIndex
      }
    }

    return estimate
  }, [effectiveLocation, customFamilySize, customSavingsRate, customLifestyle, costOfLivingData, userProfile, jobTitle])

  // Update parent component when estimate changes
  useEffect(() => {
    if (livingWageEstimate && onEstimateUpdate) {
      onEstimateUpdate(livingWageEstimate)
    }
  }, [livingWageEstimate, onEstimateUpdate])

  useEffect(() => {
    setEstimate(livingWageEstimate)
  }, [livingWageEstimate])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading && !estimate) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Calculating living wage...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!estimate) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">Unable to calculate living wage</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Location and Context Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg">Living Wage Analysis</CardTitle>
                <CardDescription>
                  {estimate.location.city}, {estimate.location.country}
                  {workMode === 'remote' && (
                    <Badge variant="secondary" className="ml-2">Remote</Badge>
                  )}
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant={estimate.recommendations.confidenceScore > 0.8 ? "default" : "secondary"}
            >
              {Math.round(estimate.recommendations.confidenceScore * 100)}% Confidence
            </Badge>
          </div>

          {/* Quick Summary */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(estimate.breakdowns.survival.grossAnnual)}
              </div>
              <div className="text-sm text-gray-600">Survival</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(estimate.breakdowns.comfortable.grossAnnual)}
              </div>
              <div className="text-sm text-gray-600">Comfortable</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(estimate.breakdowns.optimal.grossAnnual)}
              </div>
              <div className="text-sm text-gray-600">Optimal</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Detailed Breakdown */}
      <Tabs defaultValue={estimate.recommendations.targetLevel} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="survival" className="flex items-center space-x-1">
            <Target className="h-4 w-4" />
            <span>Survival</span>
          </TabsTrigger>
          <TabsTrigger value="comfortable" className="flex items-center space-x-1">
            <CheckCircle2 className="h-4 w-4" />
            <span>Comfortable</span>
          </TabsTrigger>
          <TabsTrigger value="optimal" className="flex items-center space-x-1">
            <TrendingUp className="h-4 w-4" />
            <span>Optimal</span>
          </TabsTrigger>
        </TabsList>

        {Object.entries(estimate.breakdowns).map(([level, breakdown]) => (
          <TabsContent key={level} value={level} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{level.charAt(0).toUpperCase() + level.slice(1)} Living</span>
                  <span className="text-2xl font-bold">
                    {formatCurrency(breakdown.grossAnnual)}
                  </span>
                </CardTitle>
                <CardDescription>{breakdown.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Monthly breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Home className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Housing</span>
                      </div>
                      <span className="font-medium">{formatCurrency(breakdown.categories.housing)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ShoppingCart className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Food</span>
                      </div>
                      <span className="font-medium">{formatCurrency(breakdown.categories.food)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Car className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">Transportation</span>
                      </div>
                      <span className="font-medium">{formatCurrency(breakdown.categories.transportation)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">Utilities</span>
                      </div>
                      <span className="font-medium">{formatCurrency(breakdown.categories.utilities)}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span className="text-sm">Healthcare</span>
                      </div>
                      <span className="font-medium">{formatCurrency(breakdown.categories.healthcare)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">Savings</span>
                      </div>
                      <span className="font-medium">{formatCurrency(breakdown.categories.savings)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Discretionary</span>
                      </div>
                      <span className="font-medium">{formatCurrency(breakdown.categories.discretionary)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Briefcase className="h-4 w-4 text-gray-600" />
                        <span className="text-sm">Taxes</span>
                      </div>
                      <span className="font-medium">{formatCurrency(breakdown.categories.taxes)}</span>
                    </div>
                  </div>
                </div>

                {/* Monthly total */}
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>Net Monthly Income</span>
                    <span>{formatCurrency(breakdown.netMonthly)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Customization Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Customize Your Analysis</CardTitle>
              <CardDescription>Adjust factors to match your situation</CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowCustomization(!showCustomization)}
            >
              <Calculator className="h-4 w-4 mr-2" />
              {showCustomization ? 'Hide' : 'Customize'}
            </Button>
          </div>
        </CardHeader>
        
        {showCustomization && (
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Family Size */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <label className="text-sm font-medium">Family Size: {customFamilySize[0]}</label>
                </div>
                <Slider
                  value={customFamilySize}
                  onValueChange={setCustomFamilySize}
                  max={8}
                  min={1}
                  step={1}
                  className="py-4"
                />
                <div className="text-xs text-gray-500">
                  Includes yourself and dependents
                </div>
              </div>

              {/* Savings Rate */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <label className="text-sm font-medium">Target Savings Rate: {customSavingsRate[0]}%</label>
                </div>
                <Slider
                  value={customSavingsRate}
                  onValueChange={setCustomSavingsRate}
                  max={40}
                  min={5}
                  step={1}
                  className="py-4"
                />
                <div className="text-xs text-gray-500">
                  Recommended: 15-20% for comfortable retirement
                </div>
              </div>
            </div>

            {/* Lifestyle */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Lifestyle Preferences</label>
              <div className="flex space-x-2">
                {(['minimal', 'comfortable', 'luxury'] as const).map((style) => (
                  <Button
                    key={style}
                    variant={customLifestyle === style ? "default" : "outline"}
                    onClick={() => setCustomLifestyle(style)}
                    className="capitalize"
                  >
                    {style}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span>Salary Negotiation Guidance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium text-blue-900">Recommended Salary Range</div>
                <div className="text-sm text-blue-700">
                  {formatCurrency(estimate.recommendations.negotiationRange.min)} - {formatCurrency(estimate.recommendations.negotiationRange.max)}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Based on {estimate.recommendations.marketPosition.toLowerCase()}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Cost of Living Factors</div>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Family size: {estimate.factors.familySize} {estimate.factors.familySize === 1 ? 'person' : 'people'}</div>
                <div>Lifestyle: {estimate.factors.lifestyle}</div>
                <div>Savings target: {estimate.factors.savingsRate}%</div>
                <div>COL Index: {formatNumber(estimate.factors.costOfLivingIndex)}</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Key Insights</div>
              <div className="space-y-1 text-sm text-gray-600">
                {workMode === 'remote' && (
                  <div>• Remote work allows location flexibility</div>
                )}
                <div>• Target {estimate.recommendations.targetLevel} level for your situation</div>
                <div>• Consider total compensation beyond base salary</div>
                <div>• Factor in career growth potential</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}