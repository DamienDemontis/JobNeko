/**
 * Contextual Salary Analyzer
 * Provides different salary analysis based on job type, classification, and user profile
 */

import { ExtractedJobData } from '../ai-service';
import { JobClassification, jobClassificationEngine } from './job-classification-engine';
import { ResumeJobMatch, resumeAnalysisService } from './resume-analysis-service';
// import { perfectAIRAG } from './perfect-ai-rag'; // Replaced with internal estimation

export interface ContextualSalaryAnalysis {
  // Core analysis data
  salaryData: {
    disclosed: boolean;
    range?: {
      min: number;
      max: number;
      currency: string;
    };
    estimated?: {
      min: number;
      max: number;
      currency: string;
      confidence: number;
    };
    marketPosition?: 'below' | 'at' | 'above' | 'premium';
  };

  // Context-specific insights
  contextualInsights: {
    workArrangementImpact: {
      type: 'remote' | 'onsite' | 'hybrid';
      salaryAdjustment: number; // percentage impact
      explanation: string;
      considerations: string[];
    };

    transparencyLevel: {
      disclosed: boolean;
      impact: 'positive' | 'neutral' | 'negative';
      negotiationImplications: string[];
      redFlags?: string[];
    };

    seniorityAlignment: {
      jobLevel: string;
      userLevel?: string;
      levelMatch: 'underqualified' | 'matched' | 'overqualified';
      salaryExpectationAdjustment: number;
      careerImpact: string;
    };

    companyContext: {
      type: 'startup' | 'mid-size' | 'enterprise' | 'unknown';
      compensationStyle: string;
      equityLikelihood: number; // 0-100%
      benefitsExpectation: string[];
      cultureImpact: string;
    };
  };

  // Personalized recommendations
  personalizedAdvice: {
    negotiationStrategy: {
      approach: 'aggressive' | 'moderate' | 'conservative';
      talking_points: string[];
      leverage_factors: string[];
      timing_advice: string;
    };

    applicationAdvice: {
      should_apply: boolean;
      confidence_level: number; // 0-100%
      key_selling_points: string[];
      concerns_to_address: string[];
      preparation_recommendations: string[];
    };

    careerAdvice: {
      strategic_fit: number; // 0-100%
      growth_potential: string;
      risk_assessment: string;
      opportunity_cost: string;
      timeline_recommendation: string;
    };
  };

  // Financial analysis
  financialProjection: {
    total_compensation_estimate: {
      base_salary: number;
      equity_value?: number;
      benefits_value: number;
      total_annual: number;
      currency: string;
    };

    lifestyle_impact: {
      take_home_monthly: number;
      cost_of_living_adjusted: number;
      purchasing_power_change: number; // vs current situation
      financial_stress_level: 'low' | 'medium' | 'high';
    };

    comparison_metrics: {
      vs_market_median: number; // percentage above/below
      vs_user_current?: number; // percentage change
      vs_user_expectations?: number; // percentage vs desired
      opportunity_cost: number; // what they might miss elsewhere
    };
  };

  // Meta information
  analysis_quality: {
    confidence: number; // 0-100%
    data_sources: string[];
    limitations: string[];
    last_updated: string;
  };
}

export class ContextualSalaryAnalyzer {
  /**
   * Main analysis method - provides contextual salary analysis based on job and user profile
   */
  async analyze(
    job: ExtractedJobData,
    userResume?: any,
    userContext?: {
      currentSalary?: number;
      desiredSalary?: number;
      location?: string;
      urgency?: 'immediate' | 'weeks' | 'months' | 'exploring';
      riskTolerance?: 'low' | 'medium' | 'high';
    }
  ): Promise<ContextualSalaryAnalysis> {

    // Step 1: Classify the job to understand context
    const classification = await jobClassificationEngine.classifyJob(job);

    // Step 2: Get base salary intelligence (internal estimation)
    const salaryIntelligence = this.generateInternalSalaryEstimate(job, classification);

    // Step 3: Analyze resume match if available
    let resumeMatch: ResumeJobMatch | undefined;
    if (userResume) {
      resumeMatch = await resumeAnalysisService.analyzeJobMatch(userResume, job, userContext);
    }

    // Step 4: Build contextual analysis
    const analysis: ContextualSalaryAnalysis = {
      salaryData: this.analyzeSalaryData(job, salaryIntelligence),
      contextualInsights: this.generateContextualInsights(classification, job, resumeMatch),
      personalizedAdvice: this.generatePersonalizedAdvice(classification, resumeMatch, userContext),
      financialProjection: this.calculateFinancialProjection(job, salaryIntelligence, classification, userContext),
      analysis_quality: this.assessAnalysisQuality(salaryIntelligence, resumeMatch, classification)
    };

    return analysis;
  }

  /**
   * Specialized analysis for remote jobs
   */
  async analyzeRemoteJob(
    job: ExtractedJobData,
    userResume?: any,
    userLocation?: string
  ): Promise<ContextualSalaryAnalysis> {

    const baseAnalysis = await this.analyze(job, userResume, { location: userLocation });

    // Enhanced remote-specific insights
    baseAnalysis.contextualInsights.workArrangementImpact = {
      type: 'remote',
      salaryAdjustment: this.calculateRemoteSalaryAdjustment(job, userLocation),
      explanation: 'Remote position allows for location arbitrage opportunities',
      considerations: [
        'Salary may be location-independent or location-adjusted',
        'Consider tax implications across jurisdictions',
        'Equipment and home office setup costs',
        'Time zone alignment requirements',
        'Career advancement opportunities in remote setting'
      ]
    };

    return baseAnalysis;
  }

  /**
   * Specialized analysis for undisclosed salary jobs
   */
  async analyzeUndisclosedSalaryJob(
    job: ExtractedJobData,
    userResume?: any
  ): Promise<ContextualSalaryAnalysis> {

    const baseAnalysis = await this.analyze(job, userResume);

    // Enhanced undisclosed salary insights
    baseAnalysis.contextualInsights.transparencyLevel = {
      disclosed: false,
      impact: 'negative',
      negotiationImplications: [
        'Information asymmetry favors employer',
        'Research is critical before negotiation',
        'Consider asking for range early in process',
        'May indicate less structured compensation'
      ],
      redFlags: [
        'Potential salary below market rate',
        'Lack of compensation transparency',
        'May require more aggressive research and negotiation'
      ]
    };

    return baseAnalysis;
  }

  private analyzeSalaryData(job: ExtractedJobData, salaryIntelligence: any) {
    const hasSalary = job.salary && job.salaryMin && job.salaryMax;

    return {
      disclosed: !!hasSalary,
      range: hasSalary ? {
        min: job.salaryMin || 0,
        max: job.salaryMax || 0,
        currency: (job as any).salaryCurrency || 'USD'
      } : undefined,
      estimated: salaryIntelligence?.estimated ? {
        min: salaryIntelligence.estimated.min,
        max: salaryIntelligence.estimated.max,
        currency: salaryIntelligence.estimated.currency,
        confidence: salaryIntelligence.estimated.confidence || 0.7
      } : undefined,
      marketPosition: this.determineMarketPosition(job, salaryIntelligence)
    };
  }

  private generateContextualInsights(
    classification: JobClassification,
    job: ExtractedJobData,
    resumeMatch?: ResumeJobMatch
  ) {
    return {
      workArrangementImpact: this.analyzeWorkArrangementImpact(classification.workArrangement),
      transparencyLevel: this.analyzeTransparencyLevel(classification.salaryTransparency),
      seniorityAlignment: this.analyzeSeniorityAlignment(classification.seniorityLevel, resumeMatch),
      companyContext: this.analyzeCompanyContext(classification.companyType, job)
    };
  }

  private generatePersonalizedAdvice(
    classification: JobClassification,
    resumeMatch?: ResumeJobMatch,
    userContext?: any
  ) {
    return {
      negotiationStrategy: this.generateNegotiationStrategy(classification, resumeMatch, userContext),
      applicationAdvice: this.generateApplicationAdvice(classification, resumeMatch),
      careerAdvice: this.generateCareerAdvice(resumeMatch, userContext)
    };
  }

  private calculateFinancialProjection(
    job: ExtractedJobData,
    salaryIntelligence: any,
    classification: JobClassification,
    userContext?: any
  ) {
    const baseSalary = job.salaryMin || salaryIntelligence?.estimated?.min || 0;
    const equityValue = this.estimateEquityValue(classification.companyType, baseSalary);
    const benefitsValue = this.estimateBenefitsValue(baseSalary, classification.companyType);

    return {
      total_compensation_estimate: {
        base_salary: baseSalary,
        equity_value: equityValue,
        benefits_value: benefitsValue,
        total_annual: baseSalary + equityValue + benefitsValue,
        currency: (job as any).salaryCurrency || 'USD'
      },
      lifestyle_impact: this.calculateLifestyleImpact(baseSalary, job.location, userContext),
      comparison_metrics: this.calculateComparisonMetrics(baseSalary, userContext, salaryIntelligence)
    };
  }

  private assessAnalysisQuality(salaryIntelligence: any, resumeMatch?: ResumeJobMatch, classification?: JobClassification) {
    const dataSources = ['job_posting'];
    let confidence = 0.5;

    if (salaryIntelligence) {
      dataSources.push('market_intelligence');
      confidence += 0.2;
    }

    if (resumeMatch) {
      dataSources.push('resume_analysis');
      confidence += 0.2;
    }

    if (classification) {
      dataSources.push('job_classification');
      confidence += 0.1;
    }

    return {
      confidence: Math.min(confidence * 100, 100),
      data_sources: dataSources,
      limitations: this.identifyLimitations(salaryIntelligence, resumeMatch),
      last_updated: new Date().toISOString()
    };
  }

  // Helper methods
  private calculateRemoteSalaryAdjustment(job: ExtractedJobData, userLocation?: string): number {
    // Remote jobs can have location-based salary adjustments
    // This is a simplified implementation
    return 0; // No adjustment for now
  }

  private determineMarketPosition(job: ExtractedJobData, salaryIntelligence: any): 'below' | 'at' | 'above' | 'premium' {
    if (!job.salaryMin || !salaryIntelligence?.estimated?.median) {
      return 'at'; // Default assumption
    }

    const jobSalary = ((job.salaryMin || 0) + (job.salaryMax || 0)) / 2;
    const marketMedian = salaryIntelligence.estimated.median;

    if (jobSalary < marketMedian * 0.85) return 'below';
    if (jobSalary > marketMedian * 1.25) return 'premium';
    if (jobSalary > marketMedian * 1.1) return 'above';
    return 'at';
  }

  private analyzeWorkArrangementImpact(workArrangement: string) {
    const impacts = {
      remote: {
        salaryAdjustment: 0,
        explanation: 'Remote work may offer location arbitrage opportunities',
        considerations: ['Location independence', 'Home office costs', 'Time zone requirements']
      },
      onsite: {
        salaryAdjustment: 5, // Often higher to compensate for commute
        explanation: 'On-site roles often include location-based salary premiums',
        considerations: ['Commute costs', 'Office benefits', 'Face-to-face collaboration']
      },
      hybrid: {
        salaryAdjustment: 2,
        explanation: 'Hybrid offers balance between remote flexibility and office presence',
        considerations: ['Flexible arrangement', 'Partial commute costs', 'Best of both worlds']
      }
    };

    return {
      type: workArrangement as 'remote' | 'onsite' | 'hybrid',
      ...(impacts as any)[workArrangement] || impacts.onsite
    };
  }

  private analyzeTransparencyLevel(salaryTransparency: string) {
    const levels = {
      full: {
        disclosed: true,
        impact: 'positive' as const,
        negotiationImplications: ['Clear expectations', 'Easier to negotiate within range'],
        redFlags: undefined
      },
      partial: {
        disclosed: true,
        impact: 'neutral' as const,
        negotiationImplications: ['Some guidance available', 'May need clarification'],
        redFlags: undefined
      },
      none: {
        disclosed: false,
        impact: 'negative' as const,
        negotiationImplications: ['Information asymmetry', 'Research required'],
        redFlags: ['Potential below-market offer', 'Lack of transparency']
      }
    };

    return (levels as any)[salaryTransparency] || levels.none;
  }

  private analyzeSeniorityAlignment(seniorityLevel: string, resumeMatch?: ResumeJobMatch) {
    const userLevel = resumeMatch?.experienceAnalysis?.careerProgression || 'unknown';

    return {
      jobLevel: seniorityLevel,
      userLevel: userLevel,
      levelMatch: this.determineLevelMatch(seniorityLevel, resumeMatch),
      salaryExpectationAdjustment: this.calculateSeniorityAdjustment(seniorityLevel, resumeMatch),
      careerImpact: this.assessCareerImpact(seniorityLevel, resumeMatch)
    };
  }

  private analyzeCompanyContext(companyType: string, job: ExtractedJobData) {
    const contexts = {
      startup: {
        compensationStyle: 'Equity-heavy, potentially below-market base',
        equityLikelihood: 80,
        benefitsExpectation: ['Stock options', 'Flexible PTO', 'Learning budget'],
        cultureImpact: 'High growth, high risk, significant upside potential'
      },
      'mid-size': {
        compensationStyle: 'Balanced base and equity',
        equityLikelihood: 50,
        benefitsExpectation: ['401k matching', 'Health insurance', 'Professional development'],
        cultureImpact: 'Stable growth, moderate risk, steady advancement'
      },
      enterprise: {
        compensationStyle: 'Market-rate base, structured bonuses',
        equityLikelihood: 20,
        benefitsExpectation: ['Comprehensive benefits', 'Pension', 'Extensive PTO'],
        cultureImpact: 'Stable environment, lower risk, structured career path'
      }
    };

    return {
      type: companyType as 'startup' | 'mid-size' | 'enterprise' | 'unknown',
      ...(contexts as any)[companyType] || contexts['mid-size']
    };
  }

  private generateNegotiationStrategy(classification: JobClassification, resumeMatch?: ResumeJobMatch, userContext?: any) {
    const leverage = resumeMatch?.salaryInsights?.negotiationStrength || 5;

    return {
      approach: leverage > 7 ? 'aggressive' as const : leverage > 4 ? 'moderate' as const : 'conservative' as const,
      talking_points: this.generateTalkingPoints(resumeMatch, classification),
      leverage_factors: this.identifyLeverageFactors(resumeMatch, userContext),
      timing_advice: this.generateTimingAdvice(classification, userContext)
    };
  }

  private generateApplicationAdvice(classification: JobClassification, resumeMatch?: ResumeJobMatch) {
    const matchScore = resumeMatch?.matchScore || 50;

    return {
      should_apply: matchScore >= 40,
      confidence_level: matchScore,
      key_selling_points: resumeMatch?.skillsAnalysis?.matchedSkills || [],
      concerns_to_address: resumeMatch?.concerns?.map(c => c.description) || [],
      preparation_recommendations: this.generatePrepRecommendations(resumeMatch, classification)
    };
  }

  private generateCareerAdvice(resumeMatch?: ResumeJobMatch, userContext?: any) {
    return {
      strategic_fit: resumeMatch?.careerAnalysis?.careerAlignment || 50,
      growth_potential: resumeMatch?.careerAnalysis?.growthOpportunity ? 'High' : 'Moderate',
      risk_assessment: this.assessRisk(resumeMatch, userContext),
      opportunity_cost: this.calculateOpportunityCost(resumeMatch, userContext),
      timeline_recommendation: this.generateTimelineAdvice(userContext)
    };
  }

  private calculateLifestyleImpact(baseSalary: number, location?: string, userContext?: any) {
    // Simplified calculation - would integrate with cost-of-living data
    const takeHome = baseSalary * 0.7; // Rough after-tax estimate

    return {
      take_home_monthly: takeHome / 12,
      cost_of_living_adjusted: takeHome,
      purchasing_power_change: userContext?.currentSalary ?
        ((baseSalary - userContext.currentSalary) / userContext.currentSalary) * 100 : 0,
      financial_stress_level: this.assessFinancialStress(takeHome, location)
    };
  }

  private calculateComparisonMetrics(baseSalary: number, userContext?: any, salaryIntelligence?: any) {
    return {
      vs_market_median: salaryIntelligence?.estimated?.median ?
        ((baseSalary - salaryIntelligence.estimated.median) / salaryIntelligence.estimated.median) * 100 : 0,
      vs_user_current: userContext?.currentSalary ?
        ((baseSalary - userContext.currentSalary) / userContext.currentSalary) * 100 : undefined,
      vs_user_expectations: userContext?.desiredSalary ?
        ((baseSalary - userContext.desiredSalary) / userContext.desiredSalary) * 100 : undefined,
      opportunity_cost: 0 // Would calculate based on other opportunities
    };
  }

  private estimateEquityValue(companyType: string, baseSalary: number): number {
    const multipliers = { startup: 0.3, 'mid-size': 0.1, enterprise: 0.05 };
    return baseSalary * ((multipliers as any)[companyType] || 0.1);
  }

  private estimateBenefitsValue(baseSalary: number, companyType: string): number {
    const percentages = { startup: 0.15, 'mid-size': 0.25, enterprise: 0.35 };
    return baseSalary * ((percentages as any)[companyType] || 0.25);
  }

  private identifyLimitations(salaryIntelligence: any, resumeMatch?: ResumeJobMatch): string[] {
    const limitations = [];

    if (!salaryIntelligence) limitations.push('Limited market salary data');
    if (!resumeMatch) limitations.push('No resume analysis available');

    return limitations;
  }

  // Additional helper methods (simplified implementations)
  private determineLevelMatch(jobLevel: string, resumeMatch?: ResumeJobMatch): 'underqualified' | 'matched' | 'overqualified' {
    return 'matched'; // Simplified
  }

  private calculateSeniorityAdjustment(seniorityLevel: string, resumeMatch?: ResumeJobMatch): number {
    return 0; // Simplified
  }

  private assessCareerImpact(seniorityLevel: string, resumeMatch?: ResumeJobMatch): string {
    return 'Positive career progression opportunity'; // Simplified
  }

  private generateTalkingPoints(resumeMatch?: ResumeJobMatch, classification?: JobClassification): string[] {
    return resumeMatch?.skillsAnalysis?.skillsAdvantage || ['Relevant experience', 'Strong skill match'];
  }

  private identifyLeverageFactors(resumeMatch?: ResumeJobMatch, userContext?: any): string[] {
    return ['Market experience', 'Unique skills', 'Cultural fit'];
  }

  private generateTimingAdvice(classification: JobClassification, userContext?: any): string {
    return 'Best to negotiate after initial offer, before final acceptance';
  }

  private generatePrepRecommendations(resumeMatch?: ResumeJobMatch, classification?: JobClassification): string[] {
    return ['Research company compensation philosophy', 'Prepare specific examples', 'Practice salary negotiation'];
  }

  private assessRisk(resumeMatch?: ResumeJobMatch, userContext?: any): string {
    return userContext?.riskTolerance === 'low' ? 'Low risk, stable opportunity' : 'Moderate risk with growth potential';
  }

  private calculateOpportunityCost(resumeMatch?: ResumeJobMatch, userContext?: any): string {
    return 'Consider current market opportunities and timeline';
  }

  private generateTimelineAdvice(userContext?: any): string {
    const urgency = userContext?.urgency || 'exploring';
    const advice = {
      immediate: 'Move quickly if this aligns with goals',
      weeks: 'Good timing to pursue if interested',
      months: 'Can be selective and negotiate thoroughly',
      exploring: 'Use as benchmark for other opportunities'
    };
    return (advice as any)[urgency];
  }

  private assessFinancialStress(takeHome: number, location?: string): 'low' | 'medium' | 'high' {
    // Simplified - would use real cost-of-living data
    if (takeHome > 100000) return 'low';
    if (takeHome > 60000) return 'medium';
    return 'high';
  }

  /**
   * Internal salary estimation when external services are not available
   */
  private generateInternalSalaryEstimate(job: ExtractedJobData, classification: JobClassification) {
    // Use job's disclosed salary if available
    if (job.salaryMin && job.salaryMax) {
      return {
        estimated: {
          min: job.salaryMin,
          max: job.salaryMax,
          currency: (job as any).salaryCurrency || 'USD',
          confidence: 0.9,
          median: (job.salaryMin + job.salaryMax) / 2
        }
      };
    }

    // Generate estimates based on classification
    const baseSalaryEstimates = {
      'entry': { min: 50000, max: 70000 },
      'mid': { min: 70000, max: 100000 },
      'senior': { min: 100000, max: 140000 },
      'lead': { min: 130000, max: 180000 },
      'principal': { min: 160000, max: 220000 },
      'executive': { min: 200000, max: 300000 }
    };

    const companyMultipliers = {
      'startup': 0.9,
      'mid-size': 1.0,
      'enterprise': 1.2,
      'unknown': 1.0
    };

    const locationMultipliers = {
      'US': 1.0,
      'San Francisco': 1.4,
      'New York': 1.3,
      'Seattle': 1.2,
      'Austin': 1.1,
      'Remote': 1.0,
      'Europe': 0.8,
      'Asia': 0.7
    };

    const baseSalary = (baseSalaryEstimates as any)[classification.seniorityLevel] || baseSalaryEstimates['mid'];
    const companyMultiplier = (companyMultipliers as any)[classification.companyType] || 1.0;

    // Simple location detection
    const locationMultiplier = this.detectLocationMultiplier(job.location, locationMultipliers);

    const min = Math.round(baseSalary.min * companyMultiplier * locationMultiplier);
    const max = Math.round(baseSalary.max * companyMultiplier * locationMultiplier);

    return {
      estimated: {
        min,
        max,
        currency: this.detectCurrency(job.location),
        confidence: 0.6,
        median: Math.round((min + max) / 2)
      }
    };
  }

  private detectLocationMultiplier(location: string = '', multipliers: Record<string, number>): number {
    const locationLower = location.toLowerCase();

    if (locationLower.includes('san francisco') || locationLower.includes('sf')) return multipliers['San Francisco'];
    if (locationLower.includes('new york') || locationLower.includes('nyc')) return multipliers['New York'];
    if (locationLower.includes('seattle')) return multipliers['Seattle'];
    if (locationLower.includes('austin')) return multipliers['Austin'];
    if (locationLower.includes('remote')) return multipliers['Remote'];
    if (locationLower.includes('europe') || locationLower.includes('london') || locationLower.includes('berlin')) return multipliers['Europe'];
    if (locationLower.includes('asia') || locationLower.includes('tokyo') || locationLower.includes('singapore')) return multipliers['Asia'];

    return multipliers['US']; // Default
  }

  private detectCurrency(location: string = ''): string {
    const locationLower = location.toLowerCase();

    if (locationLower.includes('europe') || locationLower.includes('berlin') || locationLower.includes('paris')) return 'EUR';
    if (locationLower.includes('london') || locationLower.includes('uk')) return 'GBP';
    if (locationLower.includes('japan') || locationLower.includes('tokyo')) return 'JPY';
    if (locationLower.includes('korea') || locationLower.includes('seoul')) return 'KRW';
    if (locationLower.includes('canada')) return 'CAD';
    if (locationLower.includes('australia') || locationLower.includes('sydney')) return 'AUD';

    return 'USD'; // Default
  }
}

export const contextualSalaryAnalyzer = new ContextualSalaryAnalyzer();