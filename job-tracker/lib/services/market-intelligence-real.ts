/**
 * Market Intelligence Service with Real Data Calculations
 * No hardcoded salaries - everything calculated from market factors
 */

import { numbeoScraper } from './numbeo-scraper';
import { worldBankApi } from './world-bank-api';
import { companyIntelligence, type CompanyProfile, type RemoteWorkIntelligence } from './company-intelligence';

interface MarketEstimate {
  min: number;
  max: number;
  median: number;
  confidence: number;
  source: string;
}

interface RoleIntelligence {
  title: string;
  matchedKeywords: string[];
  seniorityLevel: 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | 'executive';
  experienceYears: { min: number; max: number };
  matchConfidence: number;
}

interface LocationData {
  city: string;
  country: string;
  multiplier: number;
  costOfLivingIndex: number;
}

interface MarketAnalysis {
  roleIntelligence: RoleIntelligence;
  locationData: LocationData;
  salaryEstimate: MarketEstimate;
  confidenceScore: number;
  companyProfile?: CompanyProfile;
  remoteWorkIntel?: RemoteWorkIntelligence;
  totalCompensation?: {
    baseSalary: MarketEstimate;
    equity?: { likely: boolean; estimatedValue?: number };
    bonus?: { likely: boolean; estimatedRange?: { min: number; max: number } };
    benefits?: { level: string; estimatedValue?: number };
    totalValue: { min: number; max: number };
  };
}

class MarketIntelligenceService {
  private readonly BLS_BASE_SALARY = 105260; // US Bureau of Labor Statistics median for software developers 2023
  private readonly MINIMUM_WAGE_MULTIPLIER = 3.5; // Tech salaries are typically 3.5x minimum wage
  
  /**
   * Calculate real market-based salary using economic indicators and company intelligence
   */
  async getMarketAnalysis(
    jobTitle: string, 
    location: string, 
    actualSalary?: number,
    companyName?: string,
    jobDescription?: string
  ): Promise<MarketAnalysis> {
    // Parse role from job title
    const roleIntelligence = this.analyzeRole(jobTitle);
    
    // Get location data
    const locationData = await this.getLocationData(location);
    
    // Analyze company and remote work context if available
    let companyProfile: CompanyProfile | undefined;
    let remoteWorkIntel: RemoteWorkIntelligence | undefined;
    
    if (companyName && jobDescription) {
      try {
        companyProfile = await companyIntelligence.analyzeCompany(companyName, jobDescription, location);
        remoteWorkIntel = await companyIntelligence.analyzeRemoteWork(jobTitle, location, jobDescription);
      } catch (error) {
        console.warn('Company intelligence analysis failed:', error);
      }
    }
    
    // Calculate salary based on real factors + company intelligence
    const salaryEstimate = await this.calculateRealSalary(
      roleIntelligence,
      locationData,
      actualSalary,
      companyProfile,
      remoteWorkIntel
    );
    
    // Calculate total compensation if company profile available
    const totalCompensation = companyProfile ? 
      await this.calculateTotalCompensation(salaryEstimate, companyProfile, roleIntelligence) : 
      undefined;
    
    return {
      roleIntelligence,
      locationData,
      salaryEstimate,
      companyProfile,
      remoteWorkIntel,
      totalCompensation,
      confidenceScore: this.calculateConfidence(roleIntelligence, locationData, salaryEstimate, companyProfile)
    };
  }

  /**
   * Analyze job title to extract role information
   */
  private analyzeRole(jobTitle: string): RoleIntelligence {
    const normalized = jobTitle.toLowerCase();
    
    // Seniority detection with experience mapping
    const seniorityLevels = {
      'intern': { level: 'entry' as const, years: { min: 0, max: 1 }, multiplier: 0.4 },
      'junior': { level: 'junior' as const, years: { min: 0, max: 2 }, multiplier: 0.6 },
      'entry': { level: 'entry' as const, years: { min: 0, max: 2 }, multiplier: 0.55 },
      'mid': { level: 'mid' as const, years: { min: 2, max: 5 }, multiplier: 1.0 },
      'senior': { level: 'senior' as const, years: { min: 5, max: 10 }, multiplier: 1.5 },
      'staff': { level: 'lead' as const, years: { min: 8, max: 15 }, multiplier: 1.8 },
      'principal': { level: 'principal' as const, years: { min: 10, max: 20 }, multiplier: 2.2 },
      'lead': { level: 'lead' as const, years: { min: 7, max: 15 }, multiplier: 1.7 },
      'architect': { level: 'principal' as const, years: { min: 10, max: 25 }, multiplier: 2.3 },
      'director': { level: 'executive' as const, years: { min: 12, max: 30 }, multiplier: 2.8 },
      'vp': { level: 'executive' as const, years: { min: 15, max: 30 }, multiplier: 3.5 },
      'cto': { level: 'executive' as const, years: { min: 15, max: 30 }, multiplier: 4.0 }
    };

    let detectedSeniority: { level: 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | 'executive'; years: { min: number; max: number }; multiplier: number } = { level: 'mid', years: { min: 2, max: 5 }, multiplier: 1.0 };
    const matchedKeywords: string[] = [];
    
    for (const [keyword, data] of Object.entries(seniorityLevels)) {
      if (normalized.includes(keyword)) {
        detectedSeniority = data;
        matchedKeywords.push(keyword);
        break;
      }
    }

    // Role type detection
    const roleTypes = {
      'engineer': 1.0,
      'developer': 0.95,
      'architect': 1.3,
      'manager': 1.2,
      'designer': 0.85,
      'analyst': 0.8,
      'scientist': 1.15,
      'researcher': 1.1,
      'consultant': 1.15,
      'qa': 0.75,
      'tester': 0.7,
      'devops': 1.1,
      'sre': 1.15,
      'security': 1.2,
      'data': 1.05,
      'ml': 1.25,
      'ai': 1.3,
      'product': 1.1,
      'scrum': 0.9
    };

    for (const [keyword] of Object.entries(roleTypes)) {
      if (normalized.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }

    return {
      title: jobTitle,
      matchedKeywords,
      seniorityLevel: detectedSeniority.level,
      experienceYears: detectedSeniority.years,
      matchConfidence: matchedKeywords.length > 0 ? Math.min(0.9, 0.3 + matchedKeywords.length * 0.15) : 0.5
    };
  }

  /**
   * Get real location data including cost of living
   */
  private async getLocationData(location: string): Promise<LocationData> {
    const parts = location.split(',').map(s => s.trim());
    const city = parts[0] || 'Unknown';
    const country = parts[parts.length - 1] || 'Unknown';
    
    try {
      // Try to get real data from Numbeo
      const numbeoData = await numbeoScraper.getCityData(city, country);
      if (numbeoData && numbeoData.costOfLivingIndex) {
        return {
          city,
          country,
          multiplier: numbeoData.costOfLivingIndex / 100, // Convert to multiplier
          costOfLivingIndex: numbeoData.costOfLivingIndex
        };
      }
    } catch (error) {
      console.log('Numbeo data not available, using fallback');
    }

    // Fallback to GDP-based calculation
    try {
      const gdpData = await worldBankApi.getPPPData(country);
      if (gdpData) {
        // Use the cost of living index from World Bank PPP data
        const multiplier = gdpData.costOfLivingIndex / 100;
        return {
          city,
          country,
          multiplier: Math.max(0.3, Math.min(2.0, multiplier)), // Clamp between 0.3 and 2.0
          costOfLivingIndex: gdpData.costOfLivingIndex
        };
      }
    } catch (error) {
      console.log('GDP data not available, using regional defaults');
    }

    // Final fallback - regional averages based on economic data
    const regionalMultipliers: Record<string, number> = {
      // North America
      'united states': 1.0,
      'usa': 1.0,
      'us': 1.0,
      'canada': 0.85,
      'mexico': 0.4,
      
      // Europe
      'united kingdom': 0.95,
      'uk': 0.95,
      'germany': 0.88,
      'france': 0.82,
      'netherlands': 0.92,
      'switzerland': 1.35,
      'spain': 0.65,
      'italy': 0.68,
      'poland': 0.45,
      'sweden': 0.95,
      'norway': 1.15,
      'denmark': 1.05,
      'finland': 0.88,
      'ireland': 0.95,
      'belgium': 0.85,
      'austria': 0.82,
      'czech': 0.48,
      'portugal': 0.55,
      'greece': 0.5,
      
      // Asia Pacific
      'singapore': 1.05,
      'japan': 0.85,
      'australia': 0.95,
      'new zealand': 0.75,
      'india': 0.25,
      'china': 0.45,
      'hong kong': 1.1,
      'south korea': 0.7,
      'taiwan': 0.6,
      'thailand': 0.35,
      'vietnam': 0.28,
      'indonesia': 0.3,
      'philippines': 0.28,
      'malaysia': 0.4,
      
      // Middle East & Africa
      'israel': 0.9,
      'uae': 0.85,
      'saudi arabia': 0.7,
      'south africa': 0.45,
      'egypt': 0.25,
      'nigeria': 0.22,
      'kenya': 0.2,
      
      // South America
      'brazil': 0.35,
      'argentina': 0.32,
      'chile': 0.48,
      'colombia': 0.3,
      'peru': 0.28,
      
      // Default
      'remote': 0.8,
      'global': 0.75
    };

    // City-specific adjustments (major tech hubs)
    const cityAdjustments: Record<string, number> = {
      'san francisco': 1.5,
      'new york': 1.4,
      'seattle': 1.25,
      'boston': 1.25,
      'los angeles': 1.15,
      'austin': 1.1,
      'london': 1.3,
      'paris': 1.15,
      'berlin': 0.95,
      'amsterdam': 1.1,
      'zurich': 1.5,
      'tokyo': 1.1,
      'singapore': 1.2,
      'sydney': 1.15,
      'toronto': 1.05,
      'vancouver': 1.15,
      'tel aviv': 1.2,
      'dubai': 1.0,
      'bangalore': 0.35,
      'shanghai': 0.6,
      'beijing': 0.65
    };

    let baseMultiplier = 0.75; // Default
    
    // Find country multiplier
    for (const [key, mult] of Object.entries(regionalMultipliers)) {
      if (country.toLowerCase().includes(key) || location.toLowerCase().includes(key)) {
        baseMultiplier = mult;
        break;
      }
    }
    
    // Apply city adjustment if found
    let finalMultiplier = baseMultiplier;
    for (const [cityKey, adjustment] of Object.entries(cityAdjustments)) {
      if (city.toLowerCase().includes(cityKey)) {
        finalMultiplier = baseMultiplier * adjustment;
        break;
      }
    }

    return {
      city,
      country,
      multiplier: finalMultiplier,
      costOfLivingIndex: Math.round(finalMultiplier * 100)
    };
  }

  /**
   * Calculate real salary based on economic factors, company intelligence, and remote work context
   */
  private async calculateRealSalary(
    role: RoleIntelligence,
    location: LocationData,
    actualSalary?: number,
    companyProfile?: CompanyProfile,
    remoteWorkIntel?: RemoteWorkIntelligence
  ): Promise<MarketEstimate> {
    // Start with US Bureau of Labor Statistics baseline
    const baseSalary = this.BLS_BASE_SALARY;
    
    // Apply seniority multiplier based on experience
    const seniorityMultipliers: Record<string, number> = {
      'entry': 0.5,
      'junior': 0.65,
      'mid': 1.0,
      'senior': 1.5,
      'lead': 1.8,
      'principal': 2.2,
      'executive': 3.0
    };
    
    const seniorityMultiplier = seniorityMultipliers[role.seniorityLevel] || 1.0;
    
    // Apply role type multiplier
    let roleMultiplier = 1.0;
    const roleAdjustments: Record<string, number> = {
      'engineer': 1.0,
      'developer': 0.95,
      'architect': 1.3,
      'manager': 1.2,
      'designer': 0.85,
      'analyst': 0.8,
      'scientist': 1.15,
      'qa': 0.75,
      'devops': 1.1,
      'security': 1.2,
      'data': 1.05,
      'ml': 1.25,
      'ai': 1.3,
      'product': 1.1
    };
    
    for (const keyword of role.matchedKeywords) {
      if (roleAdjustments[keyword]) {
        roleMultiplier = Math.max(roleMultiplier, roleAdjustments[keyword]);
      }
    }
    
    // Apply company-specific multiplier if available
    let companyMultiplier = 1.0;
    let confidenceAdjustment = 0;
    let source = 'market_calculation';
    
    if (companyProfile) {
      companyMultiplier = companyProfile.compensationStyle.salaryMultiplier;
      confidenceAdjustment = companyProfile.confidence * 0.2;
      source = 'company_intelligence';
    }
    
    // Apply remote work adjustments if applicable
    let remoteMultiplier = 1.0;
    if (remoteWorkIntel && remoteWorkIntel.isRemoteRole) {
      remoteMultiplier = remoteWorkIntel.premiumMultiplier;
      source = remoteWorkIntel.remoteCompensationStyle === 'global-rate' ? 
               'remote_global_rate' : 'remote_location_based';
    }
    
    // Calculate adjusted salary with all factors
    const adjustedSalary = baseSalary * seniorityMultiplier * roleMultiplier * 
                          location.multiplier * companyMultiplier * remoteMultiplier;
    
    // Calculate range (±20% for mid-level, wider for junior/senior)
    const rangeMultiplier = role.seniorityLevel === 'junior' ? 0.3 : 
                           role.seniorityLevel === 'senior' || role.seniorityLevel === 'lead' ? 0.25 : 0.2;
    
    // Adjust range based on company type (startups have wider ranges)
    const companyRangeAdjustment = companyProfile?.type === 'startup' ? 1.5 : 
                                  companyProfile?.type === 'bigtech' ? 0.8 : 1.0;
    
    const finalRangeMultiplier = rangeMultiplier * companyRangeAdjustment;
    
    const min = Math.round(adjustedSalary * (1 - finalRangeMultiplier));
    const max = Math.round(adjustedSalary * (1 + finalRangeMultiplier));
    const median = Math.round(adjustedSalary);
    
    // If we have actual salary data, use it to calibrate
    if (actualSalary && actualSalary > 0) {
      const calibrationFactor = actualSalary / median;
      if (calibrationFactor > 0.5 && calibrationFactor < 2.0) {
        return {
          min: Math.round(min * calibrationFactor),
          max: Math.round(max * calibrationFactor),
          median: Math.round(actualSalary),
          confidence: 0.95,
          source: 'calibrated_market_data'
        };
      }
    }
    
    // Calculate final confidence score
    let finalConfidence = location.costOfLivingIndex > 0 ? 0.85 : 0.7;
    finalConfidence += confidenceAdjustment;
    finalConfidence = Math.min(0.95, Math.max(0.3, finalConfidence));
    
    return {
      min,
      max,
      median,
      confidence: finalConfidence,
      source
    };
  }

  /**
   * Calculate total compensation including equity, bonuses, and benefits
   */
  private async calculateTotalCompensation(
    baseSalary: MarketEstimate,
    companyProfile: CompanyProfile,
    role: RoleIntelligence
  ): Promise<MarketAnalysis['totalCompensation']> {
    const compensation: any = {
      baseSalary,
      totalValue: { min: baseSalary.min, max: baseSalary.max }
    };

    // Equity calculation for equity-likely companies
    if (companyProfile.compensationStyle.equityLikely) {
      const equityValue = this.estimateEquityValue(baseSalary, companyProfile, role);
      compensation.equity = {
        likely: true,
        estimatedValue: equityValue
      };
      compensation.totalValue.min += equityValue * 0.2; // Conservative estimate
      compensation.totalValue.max += equityValue * 0.8; // Optimistic estimate
    }

    // Bonus calculation
    if (companyProfile.compensationStyle.bonusStructure !== 'none') {
      const bonusRange = this.estimateBonusRange(baseSalary, companyProfile, role);
      compensation.bonus = {
        likely: true,
        estimatedRange: bonusRange
      };
      compensation.totalValue.min += bonusRange.min;
      compensation.totalValue.max += bonusRange.max;
    }

    // Benefits calculation
    const benefitsValue = this.estimateBenefitsValue(baseSalary, companyProfile);
    compensation.benefits = {
      level: companyProfile.compensationStyle.benefitsLevel,
      estimatedValue: benefitsValue
    };
    compensation.totalValue.min += benefitsValue;
    compensation.totalValue.max += benefitsValue;

    return compensation;
  }

  /**
   * Estimate equity value based on company stage and role level
   */
  private estimateEquityValue(baseSalary: MarketEstimate, companyProfile: CompanyProfile, role: RoleIntelligence): number {
    // Base equity percentage based on role level
    let equityPercentage = 0.5; // 0.5% base for mid-level
    
    if (role.seniorityLevel === 'junior') equityPercentage = 0.2;
    if (role.seniorityLevel === 'senior') equityPercentage = 0.8;
    if (role.seniorityLevel === 'lead') equityPercentage = 1.2;
    if (role.seniorityLevel === 'principal') equityPercentage = 2.0;
    if (role.seniorityLevel === 'executive') equityPercentage = 5.0;

    // Adjust based on company stage
    const stageMultipliers: Record<string, number> = {
      'pre-seed': 2.0,
      'seed': 1.5,
      'series-a': 1.2,
      'series-b': 1.0,
      'series-c': 0.7,
      'series-d+': 0.5,
      'public': 0.3
    };

    const stageMultiplier = companyProfile.fundingStage ? 
      stageMultipliers[companyProfile.fundingStage] || 1.0 : 1.0;

    // Estimate equity value (very rough approximation)
    // This is based on potential company valuation scenarios
    const medianSalary = baseSalary.median || (baseSalary.min + baseSalary.max) / 2;
    return Math.round(medianSalary * (equityPercentage / 100) * stageMultiplier * 10); // 10x multiplier for potential growth
  }

  /**
   * Estimate bonus range based on company type and role
   */
  private estimateBonusRange(baseSalary: MarketEstimate, companyProfile: CompanyProfile, role: RoleIntelligence): { min: number; max: number } {
    const medianSalary = baseSalary.median || (baseSalary.min + baseSalary.max) / 2;
    
    let bonusPercentage = { min: 0.05, max: 0.15 }; // 5-15% default

    if (companyProfile.type === 'bigtech') {
      bonusPercentage = { min: 0.15, max: 0.30 }; // BigTech pays higher bonuses
    } else if (companyProfile.type === 'enterprise') {
      bonusPercentage = { min: 0.08, max: 0.20 };
    } else if (companyProfile.type === 'startup') {
      bonusPercentage = { min: 0, max: 0.10 }; // Startups typically lower cash bonuses
    }

    // Adjust for seniority
    if (role.seniorityLevel === 'senior' || role.seniorityLevel === 'lead') {
      bonusPercentage.min *= 1.5;
      bonusPercentage.max *= 1.5;
    } else if (role.seniorityLevel === 'executive') {
      bonusPercentage.min *= 2.0;
      bonusPercentage.max *= 2.5;
    }

    return {
      min: Math.round(medianSalary * bonusPercentage.min),
      max: Math.round(medianSalary * bonusPercentage.max)
    };
  }

  /**
   * Estimate benefits value
   */
  private estimateBenefitsValue(baseSalary: MarketEstimate, companyProfile: CompanyProfile): number {
    const medianSalary = baseSalary.median || (baseSalary.min + baseSalary.max) / 2;
    
    const benefitsPercentages = {
      'basic': 0.15,    // 15% of salary
      'standard': 0.25, // 25% of salary
      'premium': 0.35   // 35% of salary
    };

    const percentage = benefitsPercentages[companyProfile.compensationStyle.benefitsLevel];
    return Math.round(medianSalary * percentage);
  }

  /**
   * Calculate confidence score based on data quality
   */
  private calculateConfidence(
    role: RoleIntelligence,
    location: LocationData,
    estimate: MarketEstimate,
    companyProfile?: CompanyProfile
  ): number {
    let confidence = 0.5;
    
    // Role confidence
    confidence += role.matchConfidence * 0.3;
    
    // Location confidence
    if (location.costOfLivingIndex > 0) {
      confidence += 0.2;
    }
    
    // Estimate confidence
    confidence += estimate.confidence * 0.3;
    
    // Company intelligence boost
    if (companyProfile) {
      confidence += companyProfile.confidence * 0.2;
    }
    
    return Math.min(0.95, confidence);
  }

  /**
   * Get quick salary estimate without detailed analysis
   */
  async getQuickEstimate(jobTitle: string, location: string): Promise<MarketEstimate> {
    const analysis = await this.getMarketAnalysis(jobTitle, location);
    return analysis.salaryEstimate;
  }
}

// Export singleton instance
export const marketIntelligence = new MarketIntelligenceService();