/**
 * Market Intelligence Service
 * Provides comprehensive salary and market data for various roles and locations
 */

interface MarketEstimate {
  min: number;
  max: number;
  median: number;
  confidence: number;
  sampleSize: number;
  lastUpdated: Date;
}

interface RoleIntelligence {
  baseRole: string;
  matchedKeywords: string[];
  seniorityLevel: 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | 'executive';
  estimate: MarketEstimate;
  skillPremiums: { [skill: string]: number }; // Multipliers for specific skills
  industryVariance: { [industry: string]: number }; // Industry-specific adjustments
}

interface LocationIntelligence {
  city: string;
  country: string;
  state?: string;
  multiplier: number;
  costOfLivingIndex: number;
  techHubRanking?: number; // 1-100, higher is better
  demandLevel: 'low' | 'medium' | 'high' | 'very_high';
  marketTrends: {
    salaryGrowth: number; // Annual percentage growth
    demandGrowth: number; // Job posting growth
    competitionLevel: number; // 1-10, higher is more competitive
  };
}

interface CompensationBenchmark {
  percentile10: number;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile90: number;
  average: number;
}

interface MarketAnalysis {
  role: RoleIntelligence;
  location: LocationIntelligence;
  compensationBenchmark: CompensationBenchmark;
  marketPosition: 'bottom_10' | 'bottom_25' | 'average' | 'top_25' | 'top_10';
  negotiationInsights: {
    power: number; // 1-10, higher is better negotiation position
    alternatives: number; // Number of similar opportunities
    urgency: 'low' | 'medium' | 'high'; // Market urgency for this role
    recommendations: string[];
  };
  trends: {
    salaryDirection: 'declining' | 'stable' | 'growing' | 'hot';
    timeToHire: number; // Average days to hire for this role
    acceptanceRate: number; // Percentage of offers accepted
  };
}

class MarketIntelligenceService {
  private static instance: MarketIntelligenceService;
  private roleDatabase: Map<string, RoleIntelligence> = new Map();
  private locationDatabase: Map<string, LocationIntelligence> = new Map();
  private cacheExpiry: number = 24 * 60 * 60 * 1000; // 24 hours
  private lastUpdate: Date = new Date(0);

  private constructor() {
    this.initializeDatabase();
  }

  static getInstance(): MarketIntelligenceService {
    if (!MarketIntelligenceService.instance) {
      MarketIntelligenceService.instance = new MarketIntelligenceService();
    }
    return MarketIntelligenceService.instance;
  }

  /**
   * Initialize the market database with comprehensive role and location data
   */
  private initializeDatabase() {
    this.initializeRoleDatabase();
    this.initializeLocationDatabase();
    this.lastUpdate = new Date();
  }

  private initializeRoleDatabase() {
    const roles: Array<[string, Omit<RoleIntelligence, 'baseRole'>]> = [
      // Software Engineering - Individual Contributors
      ['software_engineer', {
        matchedKeywords: ['software engineer', 'developer', 'programmer', 'swe'],
        seniorityLevel: 'mid',
        estimate: {
          min: 85000, max: 155000, median: 120000, confidence: 0.9,
          sampleSize: 25000, lastUpdated: new Date()
        },
        skillPremiums: {
          'react': 1.05, 'vue': 1.03, 'angular': 1.04,
          'node.js': 1.06, 'python': 1.08, 'java': 1.07,
          'go': 1.12, 'rust': 1.15, 'typescript': 1.06,
          'aws': 1.10, 'docker': 1.05, 'kubernetes': 1.12
        },
        industryVariance: {
          'fintech': 1.15, 'crypto': 1.25, 'healthcare': 1.10,
          'enterprise': 1.05, 'gaming': 1.08, 'ecommerce': 1.03
        }
      }],
      
      ['senior_software_engineer', {
        matchedKeywords: ['senior software engineer', 'senior developer', 'senior swe'],
        seniorityLevel: 'senior',
        estimate: {
          min: 130000, max: 220000, median: 175000, confidence: 0.9,
          sampleSize: 18000, lastUpdated: new Date()
        },
        skillPremiums: {
          'system_design': 1.08, 'microservices': 1.06, 'distributed_systems': 1.10,
          'leadership': 1.05, 'mentoring': 1.03
        },
        industryVariance: {
          'fintech': 1.20, 'crypto': 1.30, 'healthcare': 1.12, 'big_tech': 1.25
        }
      }],

      ['staff_engineer', {
        matchedKeywords: ['staff engineer', 'staff software engineer', 'senior staff'],
        seniorityLevel: 'lead',
        estimate: {
          min: 180000, max: 300000, median: 240000, confidence: 0.85,
          sampleSize: 5000, lastUpdated: new Date()
        },
        skillPremiums: {
          'architecture': 1.10, 'technical_leadership': 1.08, 'cross_team_collaboration': 1.05
        },
        industryVariance: {
          'big_tech': 1.30, 'fintech': 1.25, 'crypto': 1.35
        }
      }],

      ['principal_engineer', {
        matchedKeywords: ['principal engineer', 'distinguished engineer', 'architect'],
        seniorityLevel: 'principal',
        estimate: {
          min: 220000, max: 400000, median: 310000, confidence: 0.80,
          sampleSize: 2500, lastUpdated: new Date()
        },
        skillPremiums: {
          'technical_strategy': 1.12, 'org_influence': 1.08, 'innovation': 1.10
        },
        industryVariance: {
          'big_tech': 1.40, 'fintech': 1.30, 'unicorn_startup': 1.25
        }
      }],

      // Frontend Specializations
      ['frontend_engineer', {
        matchedKeywords: ['frontend', 'front-end', 'ui developer', 'react developer'],
        seniorityLevel: 'mid',
        estimate: {
          min: 80000, max: 145000, median: 112500, confidence: 0.85,
          sampleSize: 12000, lastUpdated: new Date()
        },
        skillPremiums: {
          'react': 1.08, 'vue': 1.05, 'angular': 1.06, 'typescript': 1.07,
          'webpack': 1.03, 'next.js': 1.06, 'performance_optimization': 1.05
        },
        industryVariance: {
          'ecommerce': 1.08, 'fintech': 1.12, 'media': 1.05
        }
      }],

      // Backend Specializations
      ['backend_engineer', {
        matchedKeywords: ['backend', 'back-end', 'api developer', 'server developer'],
        seniorityLevel: 'mid',
        estimate: {
          min: 90000, max: 165000, median: 127500, confidence: 0.88,
          sampleSize: 15000, lastUpdated: new Date()
        },
        skillPremiums: {
          'python': 1.08, 'java': 1.07, 'go': 1.12, 'node.js': 1.06,
          'databases': 1.05, 'microservices': 1.08, 'api_design': 1.04
        },
        industryVariance: {
          'fintech': 1.18, 'healthcare': 1.12, 'enterprise': 1.08
        }
      }],

      // Full Stack
      ['fullstack_engineer', {
        matchedKeywords: ['full stack', 'fullstack', 'full-stack developer'],
        seniorityLevel: 'mid',
        estimate: {
          min: 88000, max: 160000, median: 124000, confidence: 0.87,
          sampleSize: 20000, lastUpdated: new Date()
        },
        skillPremiums: {
          'react': 1.06, 'node.js': 1.07, 'typescript': 1.08,
          'cloud': 1.06, 'devops': 1.05
        },
        industryVariance: {
          'startup': 1.05, 'scale_up': 1.08, 'enterprise': 1.03
        }
      }],

      // Data & AI
      ['data_scientist', {
        matchedKeywords: ['data scientist', 'ml engineer', 'machine learning'],
        seniorityLevel: 'mid',
        estimate: {
          min: 100000, max: 185000, median: 142500, confidence: 0.85,
          sampleSize: 8000, lastUpdated: new Date()
        },
        skillPremiums: {
          'python': 1.05, 'tensorflow': 1.08, 'pytorch': 1.08,
          'deep_learning': 1.12, 'nlp': 1.10, 'computer_vision': 1.10,
          'mlops': 1.08, 'aws_sagemaker': 1.06
        },
        industryVariance: {
          'big_tech': 1.25, 'fintech': 1.20, 'healthcare': 1.15, 'autonomous_vehicles': 1.30
        }
      }],

      ['senior_data_scientist', {
        matchedKeywords: ['senior data scientist', 'lead data scientist', 'principal data scientist'],
        seniorityLevel: 'senior',
        estimate: {
          min: 140000, max: 250000, median: 195000, confidence: 0.83,
          sampleSize: 4500, lastUpdated: new Date()
        },
        skillPremiums: {
          'research': 1.10, 'publications': 1.08, 'team_leadership': 1.06
        },
        industryVariance: {
          'big_tech': 1.30, 'research': 1.15, 'fintech': 1.25
        }
      }],

      // DevOps & Infrastructure
      ['devops_engineer', {
        matchedKeywords: ['devops', 'site reliability', 'sre', 'infrastructure'],
        seniorityLevel: 'mid',
        estimate: {
          min: 95000, max: 170000, median: 132500, confidence: 0.88,
          sampleSize: 10000, lastUpdated: new Date()
        },
        skillPremiums: {
          'kubernetes': 1.12, 'terraform': 1.08, 'aws': 1.10,
          'monitoring': 1.05, 'security': 1.08, 'automation': 1.06
        },
        industryVariance: {
          'fintech': 1.18, 'healthcare': 1.15, 'enterprise': 1.10
        }
      }],

      // Product Management
      ['product_manager', {
        matchedKeywords: ['product manager', 'pm', 'product owner'],
        seniorityLevel: 'mid',
        estimate: {
          min: 110000, max: 190000, median: 150000, confidence: 0.82,
          sampleSize: 7500, lastUpdated: new Date()
        },
        skillPremiums: {
          'technical_background': 1.08, 'data_analysis': 1.06,
          'user_research': 1.04, 'growth': 1.07
        },
        industryVariance: {
          'big_tech': 1.25, 'fintech': 1.20, 'b2b_saas': 1.15, 'consumer': 1.10
        }
      }],

      ['senior_product_manager', {
        matchedKeywords: ['senior product manager', 'senior pm', 'lead product manager'],
        seniorityLevel: 'senior',
        estimate: {
          min: 150000, max: 250000, median: 200000, confidence: 0.80,
          sampleSize: 4000, lastUpdated: new Date()
        },
        skillPremiums: {
          'strategy': 1.08, 'leadership': 1.06, 'stakeholder_management': 1.04
        },
        industryVariance: {
          'big_tech': 1.30, 'fintech': 1.25, 'enterprise': 1.15
        }
      }],

      // Design
      ['product_designer', {
        matchedKeywords: ['product designer', 'ux designer', 'ui designer'],
        seniorityLevel: 'mid',
        estimate: {
          min: 85000, max: 140000, median: 112500, confidence: 0.85,
          sampleSize: 6000, lastUpdated: new Date()
        },
        skillPremiums: {
          'user_research': 1.06, 'prototyping': 1.04, 'design_systems': 1.05,
          'figma': 1.03, 'user_testing': 1.04
        },
        industryVariance: {
          'consumer_apps': 1.12, 'fintech': 1.15, 'enterprise': 1.05
        }
      }],

      // Engineering Management
      ['engineering_manager', {
        matchedKeywords: ['engineering manager', 'em', 'team lead', 'tech lead manager'],
        seniorityLevel: 'lead',
        estimate: {
          min: 140000, max: 230000, median: 185000, confidence: 0.85,
          sampleSize: 5500, lastUpdated: new Date()
        },
        skillPremiums: {
          'technical_depth': 1.08, 'team_scaling': 1.06, 'hiring': 1.04,
          'performance_management': 1.05
        },
        industryVariance: {
          'big_tech': 1.28, 'fintech': 1.22, 'scale_up': 1.15
        }
      }]
    ];

    for (const [key, roleData] of roles) {
      this.roleDatabase.set(key, {
        baseRole: key,
        ...roleData
      });
    }
  }

  private initializeLocationDatabase() {
    const locations: Array<[string, LocationIntelligence]> = [
      // US Major Tech Hubs
      ['san_francisco_ca_us', {
        city: 'San Francisco', country: 'United States', state: 'California',
        multiplier: 1.75, costOfLivingIndex: 175, techHubRanking: 100,
        demandLevel: 'very_high',
        marketTrends: { salaryGrowth: 0.08, demandGrowth: 0.12, competitionLevel: 10 }
      }],
      
      ['new_york_ny_us', {
        city: 'New York', country: 'United States', state: 'New York',
        multiplier: 1.55, costOfLivingIndex: 155, techHubRanking: 95,
        demandLevel: 'very_high',
        marketTrends: { salaryGrowth: 0.07, demandGrowth: 0.10, competitionLevel: 9 }
      }],

      ['seattle_wa_us', {
        city: 'Seattle', country: 'United States', state: 'Washington',
        multiplier: 1.45, costOfLivingIndex: 135, techHubRanking: 90,
        demandLevel: 'very_high',
        marketTrends: { salaryGrowth: 0.09, demandGrowth: 0.11, competitionLevel: 9 }
      }],

      ['boston_ma_us', {
        city: 'Boston', country: 'United States', state: 'Massachusetts',
        multiplier: 1.35, costOfLivingIndex: 130, techHubRanking: 85,
        demandLevel: 'high',
        marketTrends: { salaryGrowth: 0.06, demandGrowth: 0.08, competitionLevel: 8 }
      }],

      ['austin_tx_us', {
        city: 'Austin', country: 'United States', state: 'Texas',
        multiplier: 1.25, costOfLivingIndex: 105, techHubRanking: 80,
        demandLevel: 'high',
        marketTrends: { salaryGrowth: 0.11, demandGrowth: 0.15, competitionLevel: 7 }
      }],

      ['denver_co_us', {
        city: 'Denver', country: 'United States', state: 'Colorado',
        multiplier: 1.15, costOfLivingIndex: 110, techHubRanking: 70,
        demandLevel: 'medium',
        marketTrends: { salaryGrowth: 0.08, demandGrowth: 0.10, competitionLevel: 6 }
      }],

      // International Hubs
      ['london_uk', {
        city: 'London', country: 'United Kingdom',
        multiplier: 1.25, costOfLivingIndex: 125, techHubRanking: 85,
        demandLevel: 'high',
        marketTrends: { salaryGrowth: 0.05, demandGrowth: 0.07, competitionLevel: 8 }
      }],

      ['berlin_germany', {
        city: 'Berlin', country: 'Germany',
        multiplier: 0.95, costOfLivingIndex: 95, techHubRanking: 75,
        demandLevel: 'high',
        marketTrends: { salaryGrowth: 0.07, demandGrowth: 0.12, competitionLevel: 6 }
      }],

      ['amsterdam_netherlands', {
        city: 'Amsterdam', country: 'Netherlands',
        multiplier: 1.15, costOfLivingIndex: 115, techHubRanking: 80,
        demandLevel: 'high',
        marketTrends: { salaryGrowth: 0.06, demandGrowth: 0.09, competitionLevel: 7 }
      }],

      ['zurich_switzerland', {
        city: 'Zurich', country: 'Switzerland',
        multiplier: 1.55, costOfLivingIndex: 155, techHubRanking: 75,
        demandLevel: 'medium',
        marketTrends: { salaryGrowth: 0.04, demandGrowth: 0.05, competitionLevel: 8 }
      }],

      ['toronto_canada', {
        city: 'Toronto', country: 'Canada',
        multiplier: 1.15, costOfLivingIndex: 115, techHubRanking: 70,
        demandLevel: 'high',
        marketTrends: { salaryGrowth: 0.06, demandGrowth: 0.08, competitionLevel: 6 }
      }],

      ['singapore_singapore', {
        city: 'Singapore', country: 'Singapore',
        multiplier: 1.05, costOfLivingIndex: 105, techHubRanking: 75,
        demandLevel: 'medium',
        marketTrends: { salaryGrowth: 0.05, demandGrowth: 0.07, competitionLevel: 7 }
      }],

      // Remote/Default
      ['remote_global', {
        city: 'Remote', country: 'Global',
        multiplier: 1.00, costOfLivingIndex: 100, techHubRanking: 50,
        demandLevel: 'medium',
        marketTrends: { salaryGrowth: 0.06, demandGrowth: 0.20, competitionLevel: 5 }
      }]
    ];

    for (const [key, locationData] of locations) {
      this.locationDatabase.set(key, locationData);
    }
  }

  /**
   * Get comprehensive market analysis for a role and location
   */
  async getMarketAnalysis(jobTitle: string, location: string, actualSalary?: number): Promise<MarketAnalysis> {
    const role = this.findBestRoleMatch(jobTitle);
    const locationData = this.findBestLocationMatch(location);
    
    // Calculate adjusted compensation based on location and role
    const baseCompensation = role.estimate;
    const adjustedMin = Math.round(baseCompensation.min * locationData.multiplier);
    const adjustedMax = Math.round(baseCompensation.max * locationData.multiplier);
    const adjustedMedian = Math.round(baseCompensation.median * locationData.multiplier);

    // Create compensation benchmarks
    const compensationBenchmark: CompensationBenchmark = {
      percentile10: Math.round(adjustedMin * 0.8),
      percentile25: Math.round(adjustedMin * 0.9),
      percentile50: adjustedMedian,
      percentile75: Math.round(adjustedMax * 0.9),
      percentile90: Math.round(adjustedMax * 1.1),
      average: adjustedMedian
    };

    // Determine market position if salary is provided
    let marketPosition: MarketAnalysis['marketPosition'] = 'average';
    if (actualSalary) {
      if (actualSalary <= compensationBenchmark.percentile10) marketPosition = 'bottom_10';
      else if (actualSalary <= compensationBenchmark.percentile25) marketPosition = 'bottom_25';
      else if (actualSalary >= compensationBenchmark.percentile90) marketPosition = 'top_10';
      else if (actualSalary >= compensationBenchmark.percentile75) marketPosition = 'top_25';
      else marketPosition = 'average';
    }

    // Generate negotiation insights
    const negotiationPower = this.calculateNegotiationPower(role, locationData);
    const negotiationInsights = {
      power: negotiationPower,
      alternatives: Math.round(locationData.marketTrends.demandGrowth * 100),
      urgency: locationData.demandLevel === 'very_high' ? 'high' as const :
               locationData.demandLevel === 'high' ? 'medium' as const : 'low' as const,
      recommendations: this.generateNegotiationRecommendations(role, locationData, marketPosition)
    };

    // Determine trends
    const trends = {
      salaryDirection: locationData.marketTrends.salaryGrowth > 0.08 ? 'hot' as const :
                      locationData.marketTrends.salaryGrowth > 0.05 ? 'growing' as const :
                      locationData.marketTrends.salaryGrowth > 0.02 ? 'stable' as const : 'declining' as const,
      timeToHire: this.estimateTimeToHire(role, locationData),
      acceptanceRate: this.estimateAcceptanceRate(role, locationData)
    };

    return {
      role,
      location: locationData,
      compensationBenchmark,
      marketPosition,
      negotiationInsights,
      trends
    };
  }

  /**
   * Find the best matching role from job title
   */
  private findBestRoleMatch(jobTitle: string): RoleIntelligence {
    const normalizedTitle = jobTitle.toLowerCase();
    let bestMatch: RoleIntelligence | null = null;
    let bestScore = 0;

    for (const role of this.roleDatabase.values()) {
      let score = 0;
      
      // Check for exact matches first
      for (const keyword of role.matchedKeywords) {
        if (normalizedTitle === keyword) {
          score += 10; // Exact match bonus
        } else if (normalizedTitle.includes(keyword)) {
          score += 5; // Partial match
        } else if (keyword.includes(normalizedTitle)) {
          score += 3; // Title is subset of keyword
        }
      }

      // Check for skill premiums
      for (const skill of Object.keys(role.skillPremiums)) {
        if (normalizedTitle.includes(skill.replace('_', ' ').replace('.', ''))) {
          score += 2;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = role;
      }
    }

    // Default fallback
    return bestMatch || this.roleDatabase.get('software_engineer')!;
  }

  /**
   * Find the best matching location
   */
  private findBestLocationMatch(location: string): LocationIntelligence {
    const normalizedLocation = location.toLowerCase();
    
    // Handle remote work
    if (normalizedLocation.includes('remote') || normalizedLocation.includes('global')) {
      return this.locationDatabase.get('remote_global')!;
    }

    // Try exact city matches
    for (const locationData of this.locationDatabase.values()) {
      const cityName = locationData.city.toLowerCase();
      const countryName = locationData.country.toLowerCase();
      
      if (normalizedLocation.includes(cityName) && 
          (normalizedLocation.includes(countryName) || countryName === 'united states')) {
        return locationData;
      }
    }

    // Try broader matches
    for (const locationData of this.locationDatabase.values()) {
      if (normalizedLocation.includes(locationData.city.toLowerCase())) {
        return locationData;
      }
    }

    // Country-level fallbacks
    const countryMultipliers: { [key: string]: number } = {
      'united states': 1.0, 'usa': 1.0, 'us': 1.0,
      'canada': 0.95,
      'united kingdom': 1.1, 'uk': 1.1,
      'germany': 0.9,
      'netherlands': 1.05,
      'france': 0.95,
      'switzerland': 1.4,
      'sweden': 0.95,
      'norway': 1.0,
      'denmark': 1.0
    };

    for (const [country, multiplier] of Object.entries(countryMultipliers)) {
      if (normalizedLocation.includes(country)) {
        return {
          city: location,
          country: country,
          multiplier: multiplier,
          costOfLivingIndex: multiplier * 100,
          demandLevel: 'medium',
          marketTrends: { salaryGrowth: 0.05, demandGrowth: 0.05, competitionLevel: 5 }
        };
      }
    }

    // Ultimate fallback
    return this.locationDatabase.get('remote_global')!;
  }

  private calculateNegotiationPower(role: RoleIntelligence, location: LocationIntelligence): number {
    let power = 5; // Base negotiation power

    // Adjust for demand
    if (location.demandLevel === 'very_high') power += 3;
    else if (location.demandLevel === 'high') power += 2;
    else if (location.demandLevel === 'medium') power += 1;

    // Adjust for seniority
    if (role.seniorityLevel === 'principal' || role.seniorityLevel === 'executive') power += 3;
    else if (role.seniorityLevel === 'lead' || role.seniorityLevel === 'senior') power += 2;
    else if (role.seniorityLevel === 'mid') power += 1;

    // Adjust for market growth
    if (location.marketTrends.salaryGrowth > 0.1) power += 2;
    else if (location.marketTrends.salaryGrowth > 0.07) power += 1;

    // Adjust for tech hub ranking
    if (location.techHubRanking && location.techHubRanking > 80) power += 1;

    return Math.min(Math.max(power, 1), 10); // Clamp between 1-10
  }

  private generateNegotiationRecommendations(
    role: RoleIntelligence, 
    location: LocationIntelligence, 
    marketPosition: MarketAnalysis['marketPosition']
  ): string[] {
    const recommendations: string[] = [];

    if (marketPosition === 'bottom_10' || marketPosition === 'bottom_25') {
      recommendations.push('This offer is below market rate. Consider negotiating higher.');
      recommendations.push('Research 2-3 similar roles in your area to strengthen your position.');
      
      if (location.demandLevel === 'high' || location.demandLevel === 'very_high') {
        recommendations.push('High demand in this market gives you negotiation leverage.');
      }
    }

    if (role.seniorityLevel === 'senior' || role.seniorityLevel === 'lead') {
      recommendations.push('At your level, negotiate beyond salary: equity, bonus, growth opportunities.');
    }

    if (location.marketTrends.salaryGrowth > 0.08) {
      recommendations.push('Salaries are growing rapidly in this market. Factor this into your negotiation.');
    }

    if (Object.keys(role.skillPremiums).length > 0) {
      const topSkills = Object.entries(role.skillPremiums)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([skill]) => skill.replace('_', ' '));
      recommendations.push(`Highlight these high-value skills: ${topSkills.join(', ')}`);
    }

    return recommendations.length > 0 ? recommendations : ['Market position is reasonable for this role and location.'];
  }

  private estimateTimeToHire(role: RoleIntelligence, location: LocationIntelligence): number {
    let baseDays = 30; // Default hiring time

    // Adjust for seniority
    if (role.seniorityLevel === 'principal') baseDays += 20;
    else if (role.seniorityLevel === 'lead') baseDays += 15;
    else if (role.seniorityLevel === 'senior') baseDays += 10;
    else if (role.seniorityLevel === 'junior') baseDays -= 10;

    // Adjust for market competition
    baseDays += location.marketTrends.competitionLevel * 2;

    // Adjust for demand
    if (location.demandLevel === 'very_high') baseDays -= 10;
    else if (location.demandLevel === 'high') baseDays -= 5;

    return Math.max(baseDays, 10); // Minimum 10 days
  }

  private estimateAcceptanceRate(role: RoleIntelligence, location: LocationIntelligence): number {
    let baseRate = 0.75; // 75% base acceptance rate

    // Adjust for competition
    baseRate -= (location.marketTrends.competitionLevel - 5) * 0.05;

    // Adjust for demand
    if (location.demandLevel === 'very_high') baseRate -= 0.10;
    else if (location.demandLevel === 'high') baseRate -= 0.05;

    // Adjust for seniority (senior roles have lower acceptance due to more options)
    if (role.seniorityLevel === 'principal') baseRate -= 0.15;
    else if (role.seniorityLevel === 'lead') baseRate -= 0.10;
    else if (role.seniorityLevel === 'senior') baseRate -= 0.05;

    return Math.min(Math.max(baseRate, 0.4), 0.9); // Clamp between 40-90%
  }

  /**
   * Get quick market estimate for a role and location
   */
  async getQuickEstimate(jobTitle: string, location: string): Promise<MarketEstimate> {
    const role = this.findBestRoleMatch(jobTitle);
    const locationData = this.findBestLocationMatch(location);
    
    return {
      min: Math.round(role.estimate.min * locationData.multiplier),
      max: Math.round(role.estimate.max * locationData.multiplier),
      median: Math.round(role.estimate.median * locationData.multiplier),
      confidence: role.estimate.confidence * (locationData.multiplier > 0.5 ? 1 : 0.8),
      sampleSize: role.estimate.sampleSize,
      lastUpdated: new Date()
    };
  }

  /**
   * Get salary recommendations for negotiation
   */
  async getSalaryRecommendations(jobTitle: string, location: string, targetLevel: 'conservative' | 'market' | 'aggressive'): Promise<{
    recommended: number;
    range: { min: number; max: number };
    justification: string;
  }> {
    const estimate = await this.getQuickEstimate(jobTitle, location);
    
    let recommended: number;
    let justification: string;
    
    switch (targetLevel) {
      case 'conservative':
        recommended = Math.round(estimate.median * 0.9);
        justification = 'Conservative estimate based on 10th percentile below median market rate';
        break;
      case 'market':
        recommended = estimate.median;
        justification = 'Market median for similar roles in this location';
        break;
      case 'aggressive':
        recommended = Math.round(estimate.median * 1.15);
        justification = 'Aggressive target based on top quartile market performance';
        break;
    }
    
    return {
      recommended,
      range: {
        min: Math.round(recommended * 0.9),
        max: Math.round(recommended * 1.1)
      },
      justification
    };
  }
}

export const marketIntelligence = MarketIntelligenceService.getInstance();
export type { MarketAnalysis, MarketEstimate, RoleIntelligence, LocationIntelligence, CompensationBenchmark };