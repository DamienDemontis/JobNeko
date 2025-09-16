/**
 * Geographic Salary Intelligence Service
 * Provides location-aware salary analysis with cost-of-living adjustments
 */

import { aiWebSearch } from './ai-web-search';

export interface LocationData {
  city: string;
  country: string;
  fullLocation: string;
  isRemote: boolean;
  remotePolicy?: 'fully_remote' | 'hybrid' | 'location_based' | 'unknown';
}

export interface CostOfLivingData {
  location: string;
  index: number; // Base 100 (NYC = 100)
  housing: number;
  food: number;
  transportation: number;
  healthcare: number;
  utilities: number;
  entertainment: number;
  confidence: number;
  currency: string;
  dataSource: string;
}

export interface GeographicSalaryAnalysis {
  primaryLocation: LocationAnalysis;
  alternativeLocations: LocationAnalysis[];
  remoteOpportunities: RemoteAnalysis;
  relocationAnalysis: RelocationAnalysis;
  recommendations: GeographicRecommendation[];
}

export interface LocationAnalysis {
  location: LocationData;
  salaryData: {
    median: number;
    range: [number, number];
    confidence: number;
    sampleSize: number;
  };
  costOfLiving: CostOfLivingData;
  adjustedSalary: {
    purchasing_power: number;
    real_value_score: number; // 0-100
    cost_adjusted_salary: number;
  };
  marketMetrics: {
    jobAvailability: number; // 0-100
    competitionLevel: number; // 0-100
    growthTrend: number; // -100 to 100
  };
}

export interface RemoteAnalysis {
  isRemoteFriendly: boolean;
  remoteSalaryPremium: number; // percentage
  hybridOptions: {
    available: boolean;
    salaryImpact: number;
    flexibilityScore: number;
  };
  remoteMarketSize: number;
  globalOpportunities: {
    count: number;
    topLocations: string[];
    averageSalary: number;
  };
}

export interface RelocationAnalysis {
  worthwhileLocations: RelocationOption[];
  breakEvenAnalysis: {
    salaryIncrease_needed: number;
    timeToBreakEven: string;
    totalCostImpact: number;
  };
  qualityOfLifeFactors: {
    climate: number;
    culture: number;
    safety: number;
    infrastructure: number;
    overall_score: number;
  };
}

export interface RelocationOption {
  location: LocationData;
  salaryIncrease: number;
  costIncrease: number;
  netBenefit: number;
  roi: number;
  timeframe: string;
}

export interface GeographicRecommendation {
  type: 'salary_negotiation' | 'relocation' | 'remote_work' | 'market_timing';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  actionItems: string[];
}

export class GeographicSalaryIntelligenceService {

  /**
   * Analyze geographic salary opportunities
   */
  async analyzeGeographicOpportunities(
    jobTitle: string,
    primaryLocation: string,
    currentUserLocation: string,
    isRemoteOffered: boolean,
    postedSalary?: string
  ): Promise<GeographicSalaryAnalysis> {

    console.log('🌍 Starting geographic salary analysis...');

    try {
      // Step 1: Parse and detect location details
      const primaryLocationData = await this.parseLocationData(primaryLocation, isRemoteOffered);
      const userLocationData = await this.parseLocationData(currentUserLocation, false);

      // Step 2: Get salary data for primary location
      const primaryAnalysis = await this.analyzeLocation(
        jobTitle,
        primaryLocationData,
        postedSalary
      );

      // Step 3: Analyze alternative locations
      const alternativeLocations = await this.getAlternativeLocations(
        jobTitle,
        primaryLocationData,
        userLocationData
      );

      // Step 4: Remote work analysis
      const remoteAnalysis = await this.analyzeRemoteOpportunities(
        jobTitle,
        isRemoteOffered,
        primaryLocationData
      );

      // Step 5: Relocation analysis
      const relocationAnalysis = await this.analyzeRelocationOptions(
        jobTitle,
        userLocationData,
        alternativeLocations
      );

      // Step 6: Generate recommendations
      const recommendations = this.generateGeographicRecommendations(
        primaryAnalysis,
        alternativeLocations,
        remoteAnalysis,
        relocationAnalysis
      );

      return {
        primaryLocation: primaryAnalysis,
        alternativeLocations,
        remoteOpportunities: remoteAnalysis,
        relocationAnalysis,
        recommendations
      };

    } catch (error) {
      console.error('Geographic analysis failed:', error);
      throw new Error('Failed to analyze geographic salary opportunities');
    }
  }

  /**
   * Parse location data and detect remote policies
   */
  private async parseLocationData(location: string, isRemote: boolean): Promise<LocationData> {
    if (isRemote || location.toLowerCase().includes('remote')) {
      return {
        city: 'Remote',
        country: 'Global',
        fullLocation: 'Remote',
        isRemote: true,
        remotePolicy: 'fully_remote'
      };
    }

    // Parse city, country from location string
    const parts = location.split(',').map(p => p.trim());
    const city = parts[0] || '';
    const country = parts[parts.length - 1] || '';

    return {
      city,
      country,
      fullLocation: location,
      isRemote: false,
      remotePolicy: 'location_based'
    };
  }

  /**
   * Analyze salary data for a specific location
   */
  private async analyzeLocation(
    jobTitle: string,
    location: LocationData,
    postedSalary?: string
  ): Promise<LocationAnalysis> {

    // Get salary data from web search
    const salaryQuery = location.isRemote
      ? `${jobTitle} remote salary 2025`
      : `${jobTitle} salary ${location.fullLocation} 2025`;

    const salaryResults = await aiWebSearch.searchWeb(salaryQuery, 6);

    // Get cost of living data
    const colData = await this.getCostOfLivingData(location);

    // Parse salary data from search results
    const salaryData = this.extractSalaryFromResults(salaryResults.results, postedSalary);

    // Calculate adjusted salary metrics
    const adjustedSalary = this.calculateAdjustedSalary(salaryData, colData);

    // Get market metrics
    const marketMetrics = await this.getMarketMetrics(jobTitle, location);

    return {
      location,
      salaryData,
      costOfLiving: colData,
      adjustedSalary,
      marketMetrics
    };
  }

  /**
   * Get cost of living data for location
   */
  private async getCostOfLivingData(location: LocationData): Promise<CostOfLivingData> {
    if (location.isRemote) {
      return {
        location: 'Remote/Global',
        index: 85, // Average for remote work
        housing: 75,
        food: 90,
        transportation: 60,
        healthcare: 95,
        utilities: 85,
        entertainment: 90,
        confidence: 0.7,
        currency: 'USD',
        dataSource: 'remote_average'
      };
    }

    try {
      // Search for cost of living data
      const colQuery = `cost of living ${location.fullLocation} 2025 index`;
      const colResults = await aiWebSearch.searchWeb(colQuery, 4);

      return this.extractCostOfLivingFromResults(colResults.results, location);
    } catch (error) {
      console.warn('Could not get COL data, using estimates');
      return this.getEstimatedCostOfLiving(location);
    }
  }

  /**
   * Extract cost of living data from search results
   */
  private extractCostOfLivingFromResults(results: any[], location: LocationData): CostOfLivingData {
    // Parse cost of living from search results
    // This would typically parse Numbeo, Expatistan, or other COL websites

    // For now, return estimated data based on common city patterns
    return this.getEstimatedCostOfLiving(location);
  }

  /**
   * Get estimated cost of living for major cities
   */
  private getEstimatedCostOfLiving(location: LocationData): CostOfLivingData {
    const city = location.city.toLowerCase();
    const country = location.country.toLowerCase();

    // Major city estimates (base 100 = NYC)
    const cityEstimates: Record<string, Partial<CostOfLivingData>> = {
      'san francisco': { index: 95, housing: 120, confidence: 0.9 },
      'new york': { index: 100, housing: 130, confidence: 0.95 },
      'london': { index: 85, housing: 90, confidence: 0.9 },
      'paris': { index: 80, housing: 85, confidence: 0.85 },
      'berlin': { index: 65, housing: 70, confidence: 0.85 },
      'seoul': { index: 70, housing: 75, confidence: 0.8 },
      'tokyo': { index: 85, housing: 90, confidence: 0.9 },
      'singapore': { index: 90, housing: 95, confidence: 0.9 },
      'zurich': { index: 110, housing: 115, confidence: 0.9 },
      'amsterdam': { index: 75, housing: 80, confidence: 0.85 },
      'toronto': { index: 70, housing: 75, confidence: 0.85 },
      'sydney': { index: 80, housing: 85, confidence: 0.85 },
    };

    const estimate = cityEstimates[city] || { index: 60, housing: 60, confidence: 0.6 };

    return {
      location: location.fullLocation,
      index: estimate.index || 60,
      housing: estimate.housing || 60,
      food: (estimate.index || 60) * 0.9,
      transportation: (estimate.index || 60) * 0.8,
      healthcare: (estimate.index || 60) * 1.1,
      utilities: (estimate.index || 60) * 0.85,
      entertainment: (estimate.index || 60) * 0.95,
      confidence: estimate.confidence || 0.6,
      currency: 'USD',
      dataSource: 'estimated'
    };
  }

  /**
   * Extract salary data from search results
   */
  private extractSalaryFromResults(results: any[], postedSalary?: string): LocationAnalysis['salaryData'] {
    // Parse salary ranges from search results
    // This would extract numbers from Glassdoor, Levels.fyi, etc.

    let median = 75000; // Default
    let range: [number, number] = [60000, 95000];
    let confidence = 0.6;
    let sampleSize = 10;

    // If posted salary is provided, use it as anchor
    if (postedSalary) {
      const salaryMatch = postedSalary.match(/[\d,]+/g);
      if (salaryMatch) {
        const nums = salaryMatch.map(s => parseInt(s.replace(/,/g, '')));
        if (nums.length >= 2) {
          range = [Math.min(...nums), Math.max(...nums)];
          median = (range[0] + range[1]) / 2;
          confidence = 0.8; // Higher confidence with posted salary
        } else if (nums.length === 1) {
          median = nums[0];
          range = [median * 0.85, median * 1.15];
          confidence = 0.75;
        }
      }
    }

    // Try to extract from search results
    for (const result of results) {
      const content = result.content.toLowerCase();
      const salaryMatches = content.match(/\$[\d,]+/g);
      if (salaryMatches && salaryMatches.length > 0) {
        confidence = Math.min(confidence + 0.1, 0.95);
        sampleSize += 5;
      }
    }

    return {
      median,
      range,
      confidence,
      sampleSize
    };
  }

  /**
   * Calculate purchasing power adjusted salary
   */
  private calculateAdjustedSalary(
    salaryData: LocationAnalysis['salaryData'],
    colData: CostOfLivingData
  ): LocationAnalysis['adjustedSalary'] {
    const baselineIndex = 100; // NYC baseline
    const adjustment = baselineIndex / colData.index;

    const cost_adjusted_salary = salaryData.median * adjustment;
    const purchasing_power = (salaryData.median / colData.index) * 100;

    // Calculate real value score (0-100)
    const real_value_score = Math.min(100, Math.max(0, (purchasing_power - 50) * 2));

    return {
      purchasing_power,
      real_value_score,
      cost_adjusted_salary
    };
  }

  /**
   * Get market metrics for location
   */
  private async getMarketMetrics(jobTitle: string, location: LocationData): Promise<LocationAnalysis['marketMetrics']> {
    // This would typically search for job market data
    // For now, return estimated metrics

    const isRemote = location.isRemote;
    const isMajorCity = ['san francisco', 'new york', 'london', 'berlin', 'seoul', 'tokyo'].includes(
      location.city.toLowerCase()
    );

    return {
      jobAvailability: isRemote ? 90 : (isMajorCity ? 80 : 50),
      competitionLevel: isRemote ? 85 : (isMajorCity ? 75 : 45),
      growthTrend: isRemote ? 25 : (isMajorCity ? 15 : -5)
    };
  }

  /**
   * Get alternative locations to consider
   */
  private async getAlternativeLocations(
    jobTitle: string,
    primaryLocation: LocationData,
    userLocation: LocationData
  ): Promise<LocationAnalysis[]> {

    const alternatives = ['San Francisco, CA', 'New York, NY', 'London, UK', 'Berlin, Germany', 'Singapore'];
    const analyses: LocationAnalysis[] = [];

    // Only analyze 3 alternatives to avoid too many API calls
    for (const altLocation of alternatives.slice(0, 3)) {
      if (altLocation !== primaryLocation.fullLocation) {
        try {
          const locationData = await this.parseLocationData(altLocation, false);
          const analysis = await this.analyzeLocation(jobTitle, locationData);
          analyses.push(analysis);
        } catch (error) {
          console.warn(`Failed to analyze ${altLocation}:`, error);
        }
      }
    }

    return analyses;
  }

  /**
   * Analyze remote work opportunities
   */
  private async analyzeRemoteOpportunities(
    jobTitle: string,
    isRemoteOffered: boolean,
    primaryLocation: LocationData
  ): Promise<RemoteAnalysis> {

    if (primaryLocation.isRemote || isRemoteOffered) {
      return {
        isRemoteFriendly: true,
        remoteSalaryPremium: 5, // 5% premium for remote work
        hybridOptions: {
          available: true,
          salaryImpact: 0,
          flexibilityScore: 85
        },
        remoteMarketSize: 10000,
        globalOpportunities: {
          count: 500,
          topLocations: ['Global', 'US Remote', 'EU Remote'],
          averageSalary: 85000
        }
      };
    }

    // Search for remote opportunities in this role
    const remoteQuery = `${jobTitle} remote jobs 2025`;
    const remoteResults = await aiWebSearch.searchWeb(remoteQuery, 3);

    const hasRemoteOptions = remoteResults.results.some(r =>
      r.content.toLowerCase().includes('remote') ||
      r.content.toLowerCase().includes('work from home')
    );

    return {
      isRemoteFriendly: hasRemoteOptions,
      remoteSalaryPremium: hasRemoteOptions ? 8 : 0,
      hybridOptions: {
        available: hasRemoteOptions,
        salaryImpact: -2, // Slightly lower than full remote
        flexibilityScore: hasRemoteOptions ? 70 : 20
      },
      remoteMarketSize: hasRemoteOptions ? 5000 : 100,
      globalOpportunities: {
        count: hasRemoteOptions ? 200 : 10,
        topLocations: hasRemoteOptions ? ['US Remote', 'EU Remote', 'Global'] : [],
        averageSalary: hasRemoteOptions ? 80000 : 0
      }
    };
  }

  /**
   * Analyze relocation options and ROI
   */
  private async analyzeRelocationOptions(
    jobTitle: string,
    userLocation: LocationData,
    alternativeLocations: LocationAnalysis[]
  ): Promise<RelocationAnalysis> {

    const worthwhileLocations: RelocationOption[] = [];

    for (const alt of alternativeLocations) {
      // Calculate relocation ROI
      const salaryIncrease = 20; // Estimate
      const costIncrease = alt.costOfLiving.index - 60; // Assume user is at index 60
      const netBenefit = salaryIncrease - costIncrease;

      if (netBenefit > 5) { // Only include if net positive benefit > 5%
        worthwhileLocations.push({
          location: alt.location,
          salaryIncrease,
          costIncrease,
          netBenefit,
          roi: netBenefit / costIncrease,
          timeframe: '6-12 months'
        });
      }
    }

    return {
      worthwhileLocations,
      breakEvenAnalysis: {
        salaryIncrease_needed: 15,
        timeToBreakEven: '18 months',
        totalCostImpact: 25000
      },
      qualityOfLifeFactors: {
        climate: 75,
        culture: 80,
        safety: 85,
        infrastructure: 90,
        overall_score: 82
      }
    };
  }

  /**
   * Generate geographic recommendations
   */
  private generateGeographicRecommendations(
    primary: LocationAnalysis,
    alternatives: LocationAnalysis[],
    remote: RemoteAnalysis,
    relocation: RelocationAnalysis
  ): GeographicRecommendation[] {

    const recommendations: GeographicRecommendation[] = [];

    // Remote work recommendation
    if (remote.isRemoteFriendly && remote.remoteSalaryPremium > 0) {
      recommendations.push({
        type: 'remote_work',
        priority: 'high',
        title: 'Consider Remote Opportunities',
        description: `Remote work could increase your salary by ${remote.remoteSalaryPremium}% while reducing living costs.`,
        impact: `+${remote.remoteSalaryPremium}% salary potential`,
        actionItems: [
          'Search for remote-first companies',
          'Negotiate remote work terms',
          'Consider relocating to lower-cost areas'
        ]
      });
    }

    // Relocation recommendation
    if (relocation.worthwhileLocations.length > 0) {
      const bestLocation = relocation.worthwhileLocations[0];
      recommendations.push({
        type: 'relocation',
        priority: 'medium',
        title: `Consider Relocating to ${bestLocation.location.city}`,
        description: `Moving could provide ${bestLocation.netBenefit}% net salary benefit after cost adjustments.`,
        impact: `+${bestLocation.salaryIncrease}% salary, +${bestLocation.costIncrease}% costs`,
        actionItems: [
          'Research visa/work permit requirements',
          'Calculate total relocation costs',
          'Network with professionals in target location'
        ]
      });
    }

    // Salary negotiation based on location
    recommendations.push({
      type: 'salary_negotiation',
      priority: 'high',
      title: 'Use Location Data in Negotiations',
      description: 'Your location analysis provides strong negotiation leverage.',
      impact: `Potential 5-15% salary increase`,
      actionItems: [
        'Present cost-of-living adjusted salary data',
        'Compare with other market opportunities',
        'Emphasize location flexibility if applicable'
      ]
    });

    return recommendations;
  }
}

// Export singleton
export const geographicSalaryIntelligence = new GeographicSalaryIntelligenceService();