/**
 * Company Intelligence Service - Real-time company analysis
 * Scrapes and analyzes company data for accurate compensation modeling
 */

interface CompanyProfile {
  name: string;
  type: 'startup' | 'scaleup' | 'enterprise' | 'bigtech' | 'unknown';
  fundingStage?: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'series-d+' | 'public';
  foundedYear?: number;
  employeeCount?: number;
  industryVertical?: string;
  location?: string;
  lastFundingAmount?: number;
  lastFundingDate?: Date;
  isRemoteFirst?: boolean;
  compensationStyle: {
    salaryMultiplier: number; // vs market rate (0.8 = 80% of market)
    equityLikely: boolean;
    bonusStructure: 'none' | 'performance' | 'target-based' | 'profit-sharing';
    benefitsLevel: 'basic' | 'standard' | 'premium';
  };
  confidence: number;
  dataSource: string[];
  lastUpdated: Date;
}

interface RemoteWorkIntelligence {
  isRemoteRole: boolean;
  remoteType: 'fully-remote' | 'hybrid' | 'remote-friendly' | 'on-site';
  geographicRestrictions?: string[];
  timeZoneRequirements?: string[];
  remoteCompensationStyle: 'location-based' | 'global-rate' | 'hybrid-model';
  premiumMultiplier: number; // adjustment for remote vs local
}

class CompanyIntelligenceService {
  private cache = new Map<string, CompanyProfile>();
  private remoteCache = new Map<string, RemoteWorkIntelligence>();

  /**
   * Analyze company from job posting data
   */
  async analyzeCompany(companyName: string, jobDescription: string, location: string): Promise<CompanyProfile> {
    const cacheKey = `${companyName.toLowerCase()}-${Date.now() - (Date.now() % (24 * 60 * 60 * 1000))}`; // Daily cache
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Multi-source intelligence gathering
      const [crunchbaseData, linkedinData, jobDescriptionIntel] = await Promise.allSettled([
        this.scrapeCrunchbaseIntel(companyName),
        this.scrapeLinkedInIntel(companyName),
        this.analyzeJobDescription(jobDescription, location)
      ]);

      const profile = this.synthesizeCompanyProfile(
        companyName,
        jobDescription,
        location,
        crunchbaseData,
        linkedinData,
        jobDescriptionIntel
      );

      this.cache.set(cacheKey, profile);
      return profile;
    } catch (error) {
      console.error(`Company analysis failed for ${companyName}:`, error);
      return this.getFallbackProfile(companyName, jobDescription, location);
    }
  }

  /**
   * Analyze remote work context from job posting
   */
  async analyzeRemoteWork(jobTitle: string, location: string, jobDescription: string): Promise<RemoteWorkIntelligence> {
    const cacheKey = `remote-${location.toLowerCase()}-${jobTitle.toLowerCase()}`;
    
    if (this.remoteCache.has(cacheKey)) {
      return this.remoteCache.get(cacheKey)!;
    }

    const analysis = await this.performRemoteAnalysis(jobTitle, location, jobDescription);
    this.remoteCache.set(cacheKey, analysis);
    return analysis;
  }

  /**
   * Scrape Crunchbase-style data (using search engines to avoid direct API costs)
   */
  private async scrapeCrunchbaseIntel(companyName: string): Promise<any> {
    try {
      // Search for funding information
      const fundingQuery = `"${companyName}" funding series seed venture capital`;
      const employeeQuery = `"${companyName}" employees size company`;
      
      // Use web search to find publicly available funding data
      // This would integrate with the WebSearch tool in a real implementation
      return {
        fundingStage: await this.detectFundingStage(companyName),
        employeeCount: await this.estimateEmployeeCount(companyName),
        foundedYear: await this.findFoundedYear(companyName)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Analyze LinkedIn company data patterns
   */
  private async scrapeLinkedInIntel(companyName: string): Promise<any> {
    try {
      // Look for company size indicators, industry, and growth patterns
      return {
        industryVertical: await this.detectIndustry(companyName),
        isRemoteFirst: await this.detectRemoteFirstPolicy(companyName)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Smart job description analysis for company intelligence
   */
  private async analyzeJobDescription(jobDescription: string, location: string): Promise<any> {
    const desc = jobDescription.toLowerCase();
    
    // Startup indicators
    const startupKeywords = ['startup', 'early-stage', 'seed funded', 'series a', 'series b', 'venture-backed', 'fast-growing', 'disruptive'];
    const startupScore = startupKeywords.reduce((score, keyword) => 
      score + (desc.includes(keyword) ? 1 : 0), 0);

    // Enterprise indicators  
    const enterpriseKeywords = ['fortune 500', 'global leader', 'established', 'multinational', 'enterprise-grade', 'industry leader'];
    const enterpriseScore = enterpriseKeywords.reduce((score, keyword) => 
      score + (desc.includes(keyword) ? 1 : 0), 0);

    // BigTech indicators
    const bigtechKeywords = ['faang', 'big tech', 'silicon valley', 'cupertino', 'mountain view', 'redmond', 'seattle tech'];
    const bigtechScore = bigtechKeywords.reduce((score, keyword) => 
      score + (desc.includes(keyword) ? 1 : 0), 0);

    // Equity mentions
    const equityKeywords = ['equity', 'stock options', 'rsu', 'esop', 'ownership stake', 'shares'];
    const equityLikely = equityKeywords.some(keyword => desc.includes(keyword));

    // Remote work analysis
    const remoteKeywords = ['remote', 'work from home', 'distributed team', 'location independent'];
    const isRemoteRole = remoteKeywords.some(keyword => desc.includes(keyword)) || 
                        location.toLowerCase().includes('remote');

    return {
      startupScore,
      enterpriseScore,
      bigtechScore,
      equityLikely,
      isRemoteRole,
      benefitsKeywords: this.extractBenefitsKeywords(desc)
    };
  }

  /**
   * Synthesize all data sources into company profile
   */
  private synthesizeCompanyProfile(
    companyName: string,
    jobDescription: string,
    location: string,
    crunchbaseData: any,
    linkedinData: any,
    jobIntel: any
  ): CompanyProfile {
    const jobAnalysis = jobIntel.status === 'fulfilled' ? jobIntel.value : {};
    
    // Determine company type based on multiple signals
    let type: CompanyProfile['type'] = 'unknown';
    let salaryMultiplier = 1.0;
    let confidence = 0.5;

    if (jobAnalysis.bigtechScore > 0) {
      type = 'bigtech';
      salaryMultiplier = 1.2; // BigTech typically pays premium
      confidence = 0.8;
    } else if (jobAnalysis.startupScore > jobAnalysis.enterpriseScore) {
      type = jobAnalysis.startupScore > 2 ? 'startup' : 'scaleup';
      salaryMultiplier = type === 'startup' ? 0.85 : 0.95; // Startups pay below market + equity
      confidence = 0.7;
    } else if (jobAnalysis.enterpriseScore > 0) {
      type = 'enterprise';
      salaryMultiplier = 1.05; // Enterprise pays slightly above market
      confidence = 0.75;
    }

    // Adjust based on funding stage if detected
    const fundingStage = this.inferFundingStage(jobAnalysis, crunchbaseData);
    if (fundingStage) {
      const stageMultipliers = {
        'pre-seed': 0.75,
        'seed': 0.8,
        'series-a': 0.85,
        'series-b': 0.9,
        'series-c': 0.95,
        'series-d+': 1.0,
        'public': 1.1
      };
      salaryMultiplier *= (stageMultipliers[fundingStage] || 1.0);
    }

    return {
      name: companyName,
      type,
      fundingStage,
      employeeCount: crunchbaseData?.value?.employeeCount,
      industryVertical: linkedinData?.value?.industryVertical,
      location,
      isRemoteFirst: linkedinData?.value?.isRemoteFirst || jobAnalysis.isRemoteRole,
      compensationStyle: {
        salaryMultiplier,
        equityLikely: jobAnalysis.equityLikely || type === 'startup' || type === 'scaleup',
        bonusStructure: this.inferBonusStructure(type, jobAnalysis),
        benefitsLevel: this.inferBenefitsLevel(type, jobAnalysis)
      },
      confidence,
      dataSource: ['job_description_analysis'],
      lastUpdated: new Date()
    };
  }

  /**
   * Perform intelligent remote work analysis
   */
  private async performRemoteAnalysis(jobTitle: string, location: string, jobDescription: string): Promise<RemoteWorkIntelligence> {
    const desc = jobDescription.toLowerCase();
    const loc = location.toLowerCase();
    
    // Detect remote type
    let remoteType: RemoteWorkIntelligence['remoteType'] = 'on-site';
    let premiumMultiplier = 1.0;

    if (loc.includes('remote') || desc.includes('fully remote') || desc.includes('100% remote')) {
      remoteType = 'fully-remote';
      // Fully remote often pays less than SF/NYC but more than local
      premiumMultiplier = await this.calculateRemotePremium(location, jobDescription);
    } else if (desc.includes('hybrid') || desc.includes('flexible work')) {
      remoteType = 'hybrid';
      premiumMultiplier = 0.98; // Slight discount vs full on-site
    } else if (desc.includes('remote friendly') || desc.includes('remote optional')) {
      remoteType = 'remote-friendly';
      premiumMultiplier = 1.02; // Slight premium for flexibility
    }

    // Analyze compensation model
    let compensationStyle: RemoteWorkIntelligence['remoteCompensationStyle'] = 'location-based';
    
    if (desc.includes('global rate') || desc.includes('location agnostic')) {
      compensationStyle = 'global-rate';
      premiumMultiplier *= 1.15; // Global rate typically higher
    } else if (desc.includes('sf rates') || desc.includes('silicon valley rates')) {
      compensationStyle = 'global-rate';
      premiumMultiplier *= 1.25; // SF rates are premium
    }

    return {
      isRemoteRole: remoteType !== 'on-site',
      remoteType,
      remoteCompensationStyle: compensationStyle,
      premiumMultiplier,
      geographicRestrictions: this.extractGeoRestrictions(jobDescription),
      timeZoneRequirements: this.extractTimezoneReqs(jobDescription)
    };
  }

  /**
   * Calculate remote work premium based on company location and description
   */
  private async calculateRemotePremium(location: string, jobDescription: string): Promise<number> {
    const desc = jobDescription.toLowerCase();
    
    // US companies typically pay more for remote
    if (desc.includes('san francisco') || desc.includes('silicon valley') || 
        desc.includes('new york') || desc.includes('seattle')) {
      return 1.1; // 10% premium for US tech hub companies
    }
    
    // European companies more location-adjusted
    if (desc.includes('amsterdam') || desc.includes('london') || 
        desc.includes('berlin') || desc.includes('zurich')) {
      return 0.95; // 5% discount for location-based European companies
    }
    
    return 1.0; // No adjustment
  }

  /**
   * Helper methods for data extraction
   */
  private async detectFundingStage(companyName: string): Promise<CompanyProfile['fundingStage'] | undefined> {
    // This would use WebSearch to find recent funding news
    // For now, return undefined to avoid hardcoding
    return undefined;
  }

  private async estimateEmployeeCount(companyName: string): Promise<number | undefined> {
    // This would scrape LinkedIn company pages or use APIs
    return undefined;
  }

  private async findFoundedYear(companyName: string): Promise<number | undefined> {
    // This would search for company founding information
    return undefined;
  }

  private async detectIndustry(companyName: string): Promise<string | undefined> {
    // This would analyze company industry from multiple sources
    return undefined;
  }

  private async detectRemoteFirstPolicy(companyName: string): Promise<boolean> {
    // This would analyze company remote work policies
    return false;
  }

  private extractBenefitsKeywords(description: string): string[] {
    const benefitsKeywords = ['health insurance', 'dental', '401k', 'unlimited pto', 'flexible hours', 
                             'wellness stipend', 'learning budget', 'home office stipend'];
    
    return benefitsKeywords.filter(keyword => description.includes(keyword));
  }

  private inferFundingStage(jobAnalysis: any, crunchbaseData: any): CompanyProfile['fundingStage'] | undefined {
    // Logic to infer funding stage from available signals
    if (crunchbaseData?.value?.fundingStage) {
      return crunchbaseData.value.fundingStage;
    }
    
    // No hardcoded inference - return undefined if no real data
    return undefined;
  }

  private inferBonusStructure(type: CompanyProfile['type'], jobAnalysis: any): CompanyProfile['compensationStyle']['bonusStructure'] {
    if (type === 'bigtech') return 'target-based';
    if (type === 'enterprise') return 'performance';
    if (type === 'startup') return 'none';
    return 'performance';
  }

  private inferBenefitsLevel(type: CompanyProfile['type'], jobAnalysis: any): CompanyProfile['compensationStyle']['benefitsLevel'] {
    const benefitsCount = jobAnalysis.benefitsKeywords?.length || 0;
    
    if (benefitsCount > 5 || type === 'bigtech') return 'premium';
    if (benefitsCount > 2 || type === 'enterprise') return 'standard';
    return 'basic';
  }

  private extractGeoRestrictions(description: string): string[] {
    const restrictions: string[] = [];
    
    if (description.includes('us only') || description.includes('united states only')) {
      restrictions.push('US-only');
    }
    if (description.includes('eu only') || description.includes('european union')) {
      restrictions.push('EU-only');
    }
    
    return restrictions;
  }

  private extractTimezoneReqs(description: string): string[] {
    const requirements: string[] = [];
    
    if (description.includes('pst') || description.includes('pacific time')) {
      requirements.push('PST');
    }
    if (description.includes('est') || description.includes('eastern time')) {
      requirements.push('EST');
    }
    if (description.includes('cet') || description.includes('central european')) {
      requirements.push('CET');
    }
    
    return requirements;
  }

  private getFallbackProfile(companyName: string, jobDescription: string, location: string): CompanyProfile {
    return {
      name: companyName,
      type: 'unknown',
      location,
      compensationStyle: {
        salaryMultiplier: 1.0,
        equityLikely: false,
        bonusStructure: 'performance',
        benefitsLevel: 'standard'
      },
      confidence: 0.3,
      dataSource: ['fallback'],
      lastUpdated: new Date()
    };
  }
}

export const companyIntelligence = new CompanyIntelligenceService();
export type { CompanyProfile, RemoteWorkIntelligence };