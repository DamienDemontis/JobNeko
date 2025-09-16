/**
 * Job Classification Engine
 * Analyzes job data to determine the appropriate UI and analysis approach
 */

import { ExtractedJobData } from '../ai-service';
import { ResumeExtraction } from './ai-resume-extractor';

export interface JobClassification {
  // Core job characteristics
  workArrangement: 'remote' | 'onsite' | 'hybrid' | 'flexible' | 'unknown';
  salaryTransparency: 'disclosed' | 'range' | 'negotiable' | 'hidden' | 'TBD';
  seniorityLevel: 'entry' | 'junior' | 'mid' | 'senior' | 'staff' | 'principal' | 'executive' | 'unknown';
  companyType: 'startup' | 'scale-up' | 'enterprise' | 'agency' | 'consulting' | 'non-profit' | 'government' | 'unknown';
  contractType: 'full-time' | 'part-time' | 'contract' | 'consulting' | 'internship' | 'temp' | 'unknown';

  // Geographic context
  locationContext: {
    isInternational: boolean;
    requiresRelocation: boolean;
    timezone: string;
    country: string;
    currency: string;
  };

  // Compensation context
  compensationContext: {
    hasEquity: boolean;
    hasBonus: boolean;
    hasRemotePayAdjustment: boolean;
    isNegotiable: boolean;
    benefitsLevel: 'basic' | 'standard' | 'comprehensive' | 'premium' | 'unknown';
  };

  // User match context
  userMatchContext?: {
    experienceGap: number; // -5 to +5 (negative = overqualified, positive = underqualified)
    skillsMatch: number; // 0-100%
    locationMatch: 'perfect' | 'good' | 'requires-relocation' | 'timezone-mismatch';
    careerStageAlignment: 'perfect' | 'stretch' | 'lateral' | 'step-back';
  };

  // Analysis requirements
  analysisNeeds: {
    needsResumeComparison: boolean;
    needsRelocationAnalysis: boolean;
    needsEquityValuation: boolean;
    needsTaxAnalysis: boolean;
    needsNegotiationStrategy: boolean;
    needsMarketComparison: boolean;
  };

  // UI adaptation hints
  uiHints: {
    primaryFocus: 'salary' | 'equity' | 'growth' | 'stability' | 'location' | 'skills';
    showRelocationSection: boolean;
    showEquityCalculator: boolean;
    showNegotiationGuide: boolean;
    showSkillsGap: boolean;
    showCareerProgression: boolean;
    warningLevel: 'none' | 'low' | 'medium' | 'high';
    confidenceLevel: number; // 0-100%
  };
}

export class JobClassificationEngine {
  /**
   * Classify a job posting with optional user context
   */
  async classifyJob(
    jobData: ExtractedJobData,
    userLocation?: string,
    userResume?: ResumeExtraction
  ): Promise<JobClassification> {

    // Analyze work arrangement
    const workArrangement = this.detectWorkArrangement(jobData);

    // Analyze salary transparency
    const salaryTransparency = this.detectSalaryTransparency(jobData);

    // Analyze seniority level
    const seniorityLevel = this.detectSeniorityLevel(jobData);

    // Analyze company type
    const companyType = this.detectCompanyType(jobData);

    // Analyze contract type
    const contractType = this.detectContractType(jobData);

    // Analyze location context
    const locationContext = this.analyzeLocationContext(jobData, userLocation);

    // Analyze compensation context
    const compensationContext = this.analyzeCompensationContext(jobData);

    // Analyze user match if resume provided
    const userMatchContext = userResume
      ? this.analyzeUserMatch(jobData, userResume, userLocation)
      : undefined;

    // Determine analysis needs
    const analysisNeeds = this.determineAnalysisNeeds(
      workArrangement,
      salaryTransparency,
      locationContext,
      compensationContext,
      userMatchContext
    );

    // Generate UI hints
    const uiHints = this.generateUIHints(
      jobData,
      workArrangement,
      salaryTransparency,
      seniorityLevel,
      compensationContext,
      userMatchContext,
      analysisNeeds
    );

    return {
      workArrangement,
      salaryTransparency,
      seniorityLevel,
      companyType,
      contractType,
      locationContext,
      compensationContext,
      userMatchContext,
      analysisNeeds,
      uiHints
    };
  }

  private detectWorkArrangement(job: ExtractedJobData): JobClassification['workArrangement'] {
    const location = job.location?.toLowerCase() || '';
    const description = (job.description || '').toLowerCase();
    const title = job.title.toLowerCase();

    // Check for explicit remote indicators
    if (location.includes('remote') ||
        description.includes('fully remote') ||
        description.includes('100% remote') ||
        title.includes('remote')) {
      return 'remote';
    }

    // Check for hybrid indicators
    if (description.includes('hybrid') ||
        description.includes('flexible work') ||
        description.includes('work from home') ||
        description.includes('wfh')) {
      return 'hybrid';
    }

    // Check for flexible arrangements
    if (description.includes('flexible schedule') ||
        description.includes('flexible hours') ||
        description.includes('flexible location')) {
      return 'flexible';
    }

    // Check for specific location
    if (location && !location.includes('remote') && location.length > 2) {
      return 'onsite';
    }

    return 'unknown';
  }

  private detectSalaryTransparency(job: ExtractedJobData): JobClassification['salaryTransparency'] {
    // Check if specific salary amounts are provided
    if (job.salaryMin && job.salaryMax) {
      return 'range';
    }

    if (job.salary && typeof job.salary === 'string') {
      const salaryLower = job.salary.toLowerCase();

      // Check for salary-to-be-determined indicators
      if (salaryLower.includes('tbd') ||
          salaryLower.includes('to be determined') ||
          salaryLower.includes('competitive') ||
          salaryLower.includes('negotiable')) {
        return salaryLower.includes('negotiable') ? 'negotiable' : 'TBD';
      }

      // Check for hidden/undisclosed
      if (salaryLower.includes('undisclosed') ||
          salaryLower.includes('confidential')) {
        return 'hidden';
      }

      // If salary field exists with actual values
      return 'disclosed';
    }

    return 'hidden';
  }

  private detectSeniorityLevel(job: ExtractedJobData): JobClassification['seniorityLevel'] {
    const title = job.title.toLowerCase();
    const experience = job.experienceLevel?.toLowerCase() || '';
    const requirements = (job.requirements || '').toLowerCase();

    // Check title patterns
    if (title.includes('intern') || title.includes('graduate')) {
      return 'entry';
    }

    if (title.includes('junior') || title.includes('jr.') || title.includes('associate')) {
      return 'junior';
    }

    if (title.includes('senior') || title.includes('sr.')) {
      return 'senior';
    }

    if (title.includes('staff') || title.includes('principal')) {
      return title.includes('staff') ? 'staff' : 'principal';
    }

    if (title.includes('lead') || title.includes('manager') || title.includes('director')) {
      return 'senior'; // Generally senior level
    }

    if (title.includes('cto') || title.includes('vp') || title.includes('chief')) {
      return 'executive';
    }

    // Check experience requirements
    if (experience.includes('0-2') || experience.includes('entry') || experience.includes('new grad')) {
      return 'entry';
    }

    if (experience.includes('2-4') || experience.includes('1-3')) {
      return 'junior';
    }

    if (experience.includes('3-6') || experience.includes('4-7') || experience.includes('mid-level')) {
      return 'mid';
    }

    if (experience.includes('5+') || experience.includes('senior')) {
      return 'senior';
    }

    // Unable to determine level from available data
    throw new Error('Unable to determine experience level from job description - insufficient data');
  }

  private detectCompanyType(job: ExtractedJobData): JobClassification['companyType'] {
    const company = job.company.toLowerCase();
    const description = (job.companyDescription || '').toLowerCase();
    const size = job.companySize?.toLowerCase() || '';

    // Check for startup indicators
    if (description.includes('startup') ||
        description.includes('early stage') ||
        size.includes('1-10') ||
        size.includes('2-10')) {
      return 'startup';
    }

    // Check for scale-up indicators
    if (description.includes('scale-up') ||
        description.includes('growing company') ||
        size.includes('11-50') ||
        size.includes('51-200')) {
      return 'scale-up';
    }

    // Check for enterprise indicators
    if (size.includes('1000+') ||
        size.includes('500+') ||
        description.includes('enterprise') ||
        description.includes('fortune') ||
        description.includes('multinational')) {
      return 'enterprise';
    }

    // Check for specific types
    if (description.includes('agency') || company.includes('agency')) {
      return 'agency';
    }

    if (description.includes('consulting') || company.includes('consulting')) {
      return 'consulting';
    }

    if (description.includes('non-profit') || description.includes('nonprofit')) {
      return 'non-profit';
    }

    if (description.includes('government') || description.includes('federal') || description.includes('state')) {
      return 'government';
    }

    return 'unknown';
  }

  private detectContractType(job: ExtractedJobData): JobClassification['contractType'] {
    const contractType = job.contractType?.toLowerCase() || '';
    const title = job.title.toLowerCase();
    const description = (job.description || '').toLowerCase();

    if (contractType.includes('full') || contractType.includes('permanent')) {
      return 'full-time';
    }

    if (contractType.includes('part') || contractType.includes('pt')) {
      return 'part-time';
    }

    if (contractType.includes('contract') || contractType.includes('freelance')) {
      return 'contract';
    }

    if (contractType.includes('intern') || title.includes('intern')) {
      return 'internship';
    }

    if (contractType.includes('temp') || contractType.includes('temporary')) {
      return 'temp';
    }

    if (title.includes('consultant') || description.includes('consulting')) {
      return 'consulting';
    }

    // Default assumption for unclear cases
    return 'full-time';
  }

  private analyzeLocationContext(job: ExtractedJobData, userLocation?: string): JobClassification['locationContext'] {
    const jobLocation = job.location || '';

    // Basic country/currency detection
    let country = 'US';
    let currency = 'USD';
    let timezone = 'America/New_York';

    if (jobLocation.toLowerCase().includes('seoul') || jobLocation.toLowerCase().includes('korea')) {
      country = 'KR';
      currency = 'KRW';
      timezone = 'Asia/Seoul';
    } else if (jobLocation.toLowerCase().includes('tokyo') || jobLocation.toLowerCase().includes('japan')) {
      country = 'JP';
      currency = 'JPY';
      timezone = 'Asia/Tokyo';
    } else if (jobLocation.toLowerCase().includes('london') || jobLocation.toLowerCase().includes('uk')) {
      country = 'GB';
      currency = 'GBP';
      timezone = 'Europe/London';
    } else if (jobLocation.toLowerCase().includes('berlin') || jobLocation.toLowerCase().includes('germany')) {
      country = 'DE';
      currency = 'EUR';
      timezone = 'Europe/Berlin';
    }

    const isInternational = country !== 'US';
    const requiresRelocation = userLocation ?
      !jobLocation.toLowerCase().includes(userLocation.toLowerCase()) &&
      !jobLocation.toLowerCase().includes('remote') : false;

    return {
      isInternational,
      requiresRelocation,
      timezone,
      country,
      currency
    };
  }

  private analyzeCompensationContext(job: ExtractedJobData): JobClassification['compensationContext'] {
    return {
      hasEquity: !!(job.equityOffered?.type),
      hasBonus: !!(job.bonusStructure?.type),
      hasRemotePayAdjustment: !!job.remotePayAdjustment,
      isNegotiable: !!job.isNegotiable || (typeof job.salary === 'string' && job.salary.toLowerCase().includes('negotiable')) || false,
      benefitsLevel: this.assessBenefitsLevel(job)
    };
  }

  private assessBenefitsLevel(job: ExtractedJobData): JobClassification['compensationContext']['benefitsLevel'] {
    const benefits = job.benefits || [];
    const healthInsurance = job.healthInsurance?.toLowerCase() || '';
    const retirement = job.retirement?.toLowerCase() || '';

    let score = 0;

    // Basic benefits
    if (healthInsurance.includes('health') || benefits.some(b => b.toLowerCase().includes('health'))) score += 1;
    if (retirement.includes('401k') || benefits.some(b => b.toLowerCase().includes('401k'))) score += 1;
    if (job.vacation || benefits.some(b => b.toLowerCase().includes('pto'))) score += 1;

    // Premium benefits
    if (benefits.some(b => b.toLowerCase().includes('dental'))) score += 1;
    if (benefits.some(b => b.toLowerCase().includes('vision'))) score += 1;
    if (benefits.some(b => b.toLowerCase().includes('mental health'))) score += 1;
    if (benefits.some(b => b.toLowerCase().includes('wellness'))) score += 1;
    if (benefits.some(b => b.toLowerCase().includes('stock'))) score += 1;

    if (score >= 7) return 'premium';
    if (score >= 5) return 'comprehensive';
    if (score >= 3) return 'standard';
    if (score >= 1) return 'basic';
    return 'unknown';
  }

  private analyzeUserMatch(
    job: ExtractedJobData,
    resume: ResumeExtraction,
    userLocation?: string
  ): JobClassification['userMatchContext'] {
    // Calculate experience gap
    const experienceGap = this.calculateExperienceGap(job, resume);

    // Calculate skills match
    const skillsMatch = this.calculateSkillsMatch(job, resume);

    // Analyze location match
    const locationMatch = this.analyzeLocationMatch(job, resume, userLocation);

    // Analyze career stage alignment
    const careerStageAlignment = this.analyzeCareerStageAlignment(job, resume);

    return {
      experienceGap,
      skillsMatch,
      locationMatch,
      careerStageAlignment
    };
  }

  private calculateExperienceGap(job: ExtractedJobData, resume: ResumeExtraction): number {
    // Get required experience from job (rough parsing)
    const requirements = job.requirements?.toLowerCase() || '';
    const experienceLevel = job.experienceLevel?.toLowerCase() || '';

    let requiredYears = 0;

    // Try to extract years from requirements
    const yearMatches = requirements.match(/(\d+)[\s]*[-+]?[\s]*years?/g);
    if (yearMatches) {
      const numbers = yearMatches[0].match(/\d+/g);
      if (numbers) {
        requiredYears = parseInt(numbers[0]);
      }
    }

    // Unable to determine experience requirements from job data
    if (requiredYears === 0) {
      throw new Error('Cannot determine experience requirements from job posting - insufficient data');
    }

    return resume.yearsOfExperience - requiredYears;
  }

  private calculateSkillsMatch(job: ExtractedJobData, resume: ResumeExtraction): number {
    const jobSkills = [
      ...(job.skills || []),
      ...(job.programmingLanguages || []),
      ...(job.frameworks || []),
      ...(job.tools || [])
    ].map(s => s.toLowerCase());

    const resumeSkills = [
      ...resume.technicalSkills,
      ...resume.languages
    ].map(s => s.toLowerCase());

    if (jobSkills.length === 0) return 50; // Unknown requirements

    const matchedSkills = jobSkills.filter(skill =>
      resumeSkills.some(resumeSkill =>
        resumeSkill.includes(skill) || skill.includes(resumeSkill)
      )
    );

    return Math.round((matchedSkills.length / jobSkills.length) * 100);
  }

  private analyzeLocationMatch(
    job: ExtractedJobData,
    resume: ResumeExtraction,
    userLocation?: string
  ): 'perfect' | 'good' | 'requires-relocation' | 'timezone-mismatch' {
    const jobLocation = job.location?.toLowerCase() || '';
    const resumeLocation = resume.location?.toLowerCase() || '';
    const currentLocation = (userLocation || resumeLocation).toLowerCase();

    // Perfect match for remote jobs
    if (jobLocation.includes('remote')) {
      return 'perfect';
    }

    // Perfect match for same city/area
    if (currentLocation && jobLocation.includes(currentLocation)) {
      return 'perfect';
    }

    // Good match for same country/region
    if (currentLocation && jobLocation &&
        (currentLocation.includes('us') && jobLocation.includes('us')) ||
        (currentLocation.includes('uk') && jobLocation.includes('uk'))) {
      return 'good';
    }

    // Requires relocation
    if (currentLocation && jobLocation && !jobLocation.includes('remote')) {
      return 'requires-relocation';
    }

    return 'timezone-mismatch';
  }

  private analyzeCareerStageAlignment(
    job: ExtractedJobData,
    resume: ResumeExtraction
  ): 'perfect' | 'stretch' | 'lateral' | 'step-back' {
    const jobLevel = this.detectSeniorityLevel(job);
    const resumeLevel = resume.careerLevel;

    const levelOrder = ['entry', 'junior', 'mid', 'senior', 'staff', 'principal', 'executive'];
    const jobIndex = levelOrder.indexOf(jobLevel);
    const resumeIndex = levelOrder.indexOf(resumeLevel);

    if (jobIndex === resumeIndex) return 'perfect';
    if (jobIndex === resumeIndex + 1) return 'stretch';
    if (jobIndex === resumeIndex - 1) return 'lateral';
    if (jobIndex < resumeIndex) return 'step-back';

    return 'stretch';
  }

  private determineAnalysisNeeds(
    workArrangement: JobClassification['workArrangement'],
    salaryTransparency: JobClassification['salaryTransparency'],
    locationContext: JobClassification['locationContext'],
    compensationContext: JobClassification['compensationContext'],
    userMatchContext?: JobClassification['userMatchContext']
  ): JobClassification['analysisNeeds'] {
    return {
      needsResumeComparison: !!userMatchContext,
      needsRelocationAnalysis: locationContext.requiresRelocation,
      needsEquityValuation: compensationContext.hasEquity,
      needsTaxAnalysis: locationContext.isInternational || workArrangement === 'remote',
      needsNegotiationStrategy: salaryTransparency === 'hidden' || salaryTransparency === 'negotiable',
      needsMarketComparison: salaryTransparency !== 'disclosed'
    };
  }

  private generateUIHints(
    job: ExtractedJobData,
    workArrangement: JobClassification['workArrangement'],
    salaryTransparency: JobClassification['salaryTransparency'],
    seniorityLevel: JobClassification['seniorityLevel'],
    compensationContext: JobClassification['compensationContext'],
    userMatchContext?: JobClassification['userMatchContext'],
    analysisNeeds?: JobClassification['analysisNeeds']
  ): JobClassification['uiHints'] {
    // Determine primary focus
    let primaryFocus: JobClassification['uiHints']['primaryFocus'] = 'salary';

    if (compensationContext.hasEquity) primaryFocus = 'equity';
    else if (seniorityLevel === 'entry' || seniorityLevel === 'junior') primaryFocus = 'growth';
    else if (userMatchContext?.skillsMatch && userMatchContext.skillsMatch < 60) primaryFocus = 'skills';
    else if (workArrangement === 'remote') primaryFocus = 'location';

    // Determine warning level
    let warningLevel: JobClassification['uiHints']['warningLevel'] = 'none';

    if (userMatchContext) {
      if (userMatchContext.experienceGap < -3 || userMatchContext.skillsMatch < 40) warningLevel = 'high';
      else if (userMatchContext.experienceGap < -1 || userMatchContext.skillsMatch < 60) warningLevel = 'medium';
      else if (userMatchContext.careerStageAlignment === 'step-back') warningLevel = 'low';
    }

    // Calculate confidence level
    let confidenceLevel = 70;
    if (salaryTransparency === 'disclosed') confidenceLevel += 20;
    if (userMatchContext?.skillsMatch && userMatchContext.skillsMatch > 80) confidenceLevel += 10;
    if (job.companySize && job.companyDescription) confidenceLevel += 10;

    return {
      primaryFocus,
      showRelocationSection: !!analysisNeeds?.needsRelocationAnalysis,
      showEquityCalculator: !!analysisNeeds?.needsEquityValuation,
      showNegotiationGuide: !!analysisNeeds?.needsNegotiationStrategy,
      showSkillsGap: !!userMatchContext && userMatchContext.skillsMatch < 80,
      showCareerProgression: seniorityLevel === 'entry' || seniorityLevel === 'junior',
      warningLevel,
      confidenceLevel: Math.min(confidenceLevel, 100)
    };
  }
}

export const jobClassifier = new JobClassificationEngine();
export const jobClassificationEngine = jobClassifier;