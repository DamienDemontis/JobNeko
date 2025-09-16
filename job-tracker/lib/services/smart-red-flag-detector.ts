/**
 * Smart Red Flag Detector
 * Intelligent warning system for salary, benefits, company, and job posting red flags
 */

import { ExtractedJobData } from '../ai-service';
// import { ResumeExtraction } from './resume-analysis-service';
import { JobClassification } from './job-classification-engine';
import { ContextualSalaryAnalysis } from './contextual-salary-analyzer';
import { generateCompletion } from '../ai-service';

export interface RedFlag {
  id: string;
  type: 'salary' | 'benefits' | 'company' | 'posting' | 'cultural' | 'legal' | 'career';
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  evidence: string[];
  impact: string;
  recommendation: string;
  urgency: 'immediate' | 'before_applying' | 'before_accepting' | 'monitor';
  confidence: number; // 0-100
}

export interface RedFlagAnalysis {
  // Overall assessment
  riskLevel: 'very_high' | 'high' | 'moderate' | 'low' | 'minimal';
  overallScore: number; // 0-100, higher is better
  recommendation: 'avoid' | 'proceed_with_caution' | 'acceptable_risk' | 'green_light';

  // Categorized red flags
  redFlags: {
    critical: RedFlag[];
    high: RedFlag[];
    medium: RedFlag[];
    low: RedFlag[];
  };

  // Positive indicators (green flags)
  greenFlags: Array<{
    type: string;
    description: string;
    impact: string;
  }>;

  // Risk mitigation strategies
  mitigation: {
    immediateActions: string[];
    questionsToAsk: string[];
    researchToDo: string[];
    negotiationPoints: string[];
  };

  // Context-specific warnings
  contextualWarnings: {
    forNewGrads: string[];
    forExperienced: string[];
    forCareerChangers: string[];
    forRemoteWorkers: string[];
  };

  // Market comparison
  marketComparison: {
    industryStandards: string;
    competitorComparison: string;
    marketPosition: 'below' | 'at' | 'above' | 'unknown';
  };

  // Analysis metadata
  analysis_metadata: {
    analyzed_at: string;
    confidence: number;
    sources_analyzed: string[];
    limitation_notes: string[];
    reanalysis_triggers: string[];
  };
}

export class SmartRedFlagDetector {
  private readonly redFlagPatterns = {
    salary: [
      {
        pattern: /competitive salary|market rate/i,
        flag: 'Vague salary description',
        severity: 'medium' as const
      },
      {
        pattern: /unpaid|no salary|volunteer/i,
        flag: 'Unpaid position',
        severity: 'critical' as const
      },
      {
        pattern: /commission only|performance based pay/i,
        flag: 'Commission-only compensation',
        severity: 'high' as const
      }
    ],
    benefits: [
      {
        pattern: /no benefits|benefits not included/i,
        flag: 'No benefits offered',
        severity: 'high' as const
      },
      {
        pattern: /unlimited pto|unlimited vacation/i,
        flag: 'Unlimited PTO (often means less PTO)',
        severity: 'medium' as const
      }
    ],
    company: [
      {
        pattern: /fast-paced|work hard play hard|wear many hats/i,
        flag: 'Potential overwork culture',
        severity: 'medium' as const
      },
      {
        pattern: /family|rockstar|ninja|guru/i,
        flag: 'Unprofessional job posting language',
        severity: 'low' as const
      }
    ],
    posting: [
      {
        pattern: /urgent|immediate start|asap/i,
        flag: 'Urgency may indicate high turnover',
        severity: 'medium' as const
      },
      {
        pattern: /no experience required but/i,
        flag: 'Contradictory requirements',
        severity: 'low' as const
      }
    ]
  };

  /**
   * Comprehensive red flag analysis
   */
  async analyzeRedFlags(
    job: ExtractedJobData,
    classification: JobClassification,
    salaryAnalysis?: ContextualSalaryAnalysis,
    userResume?: any,
    userContext?: {
      experienceLevel?: 'entry' | 'mid' | 'senior';
      careerGoals?: string[];
      riskTolerance?: 'low' | 'medium' | 'high';
    }
  ): Promise<RedFlagAnalysis> {

    // Analyze different types of red flags
    const [
      salaryFlags,
      benefitsFlags,
      companyFlags,
      postingFlags,
      culturalFlags,
      careerFlags
    ] = await Promise.all([
      this.analyzeSalaryRedFlags(job, salaryAnalysis),
      this.analyzeBenefitsRedFlags(job),
      this.analyzeCompanyRedFlags(job, classification),
      this.analyzePostingRedFlags(job),
      this.analyzeCulturalRedFlags(job),
      this.analyzeCareerRedFlags(job, userResume, userContext)
    ]);

    const allFlags = [
      ...salaryFlags,
      ...benefitsFlags,
      ...companyFlags,
      ...postingFlags,
      ...culturalFlags,
      ...careerFlags
    ];

    // Generate AI-powered analysis for subtle red flags
    const aiFlags = await this.generateAIRedFlagAnalysis(job, classification, userContext);
    allFlags.push(...aiFlags);

    // Categorize flags by severity
    const categorizedFlags = this.categorizeFlags(allFlags);

    // Calculate overall risk assessment
    const riskAssessment = this.calculateRiskAssessment(categorizedFlags);

    // Generate contextual warnings
    const contextualWarnings = this.generateContextualWarnings(allFlags, userContext);

    // Generate green flags (positive indicators)
    const greenFlags = this.identifyGreenFlags(job, classification);

    // Generate mitigation strategies
    const mitigation = this.generateMitigationStrategies(allFlags, job);

    return {
      riskLevel: riskAssessment.level,
      overallScore: riskAssessment.score,
      recommendation: riskAssessment.recommendation,
      redFlags: categorizedFlags,
      greenFlags,
      mitigation,
      contextualWarnings,
      marketComparison: this.generateMarketComparison(job, salaryAnalysis) as any,
      analysis_metadata: {
        analyzed_at: new Date().toISOString(),
        confidence: this.calculateAnalysisConfidence(job, classification),
        sources_analyzed: this.getAnalyzedSources(job),
        limitation_notes: this.identifyLimitations(job),
        reanalysis_triggers: ['Job posting updated', 'Company news', 'Market changes']
      }
    };
  }

  /**
   * Quick red flag scan for job listings
   */
  async quickScan(job: ExtractedJobData): Promise<{
    hasRedFlags: boolean;
    flagCount: number;
    severityLevel: 'critical' | 'high' | 'medium' | 'low' | 'none';
    topConcerns: string[];
  }> {

    const quickFlags = [
      ...this.detectPatternFlags(job.description || '', 'posting'),
      ...this.detectSalaryQuickFlags(job),
      ...this.detectCompanyQuickFlags(job)
    ];

    const severityLevel = this.getQuickSeverityLevel(quickFlags);

    return {
      hasRedFlags: quickFlags.length > 0,
      flagCount: quickFlags.length,
      severityLevel,
      topConcerns: quickFlags.slice(0, 3).map(flag => flag.title)
    };
  }

  /**
   * Domain-specific red flag analysis
   */
  async analyzeSpecificDomain(
    domain: 'startup' | 'remote' | 'contract' | 'international',
    job: ExtractedJobData,
    additionalContext?: any
  ): Promise<RedFlag[]> {

    switch (domain) {
      case 'startup':
        return this.analyzeStartupRedFlags(job);
      case 'remote':
        return this.analyzeRemoteRedFlags(job);
      case 'contract':
        return this.analyzeContractRedFlags(job);
      case 'international':
        return this.analyzeInternationalRedFlags(job);
      default:
        return [];
    }
  }

  private async analyzeSalaryRedFlags(
    job: ExtractedJobData,
    salaryAnalysis?: ContextualSalaryAnalysis
  ): Promise<RedFlag[]> {
    const flags: RedFlag[] = [];

    // No salary disclosed
    if (!job.salaryMin) {
      flags.push({
        id: 'no-salary-disclosed',
        type: 'salary',
        severity: 'medium',
        category: 'Transparency',
        title: 'Salary Not Disclosed',
        description: 'Job posting does not include salary information',
        evidence: ['No salary range provided in posting'],
        impact: 'Creates information asymmetry in negotiations',
        recommendation: 'Ask for salary range early in the process',
        urgency: 'before_applying',
        confidence: 95
      });
    }

    // Below market rate
    if (salaryAnalysis?.salaryData.marketPosition === 'below') {
      flags.push({
        id: 'below-market-salary',
        type: 'salary',
        severity: 'high',
        category: 'Compensation',
        title: 'Below Market Rate',
        description: 'Offered salary appears to be below market standards',
        evidence: ['Salary analysis indicates below-market compensation'],
        impact: 'Potential underpayment and career stagnation',
        recommendation: 'Negotiate or consider other opportunities',
        urgency: 'before_accepting',
        confidence: 80
      });
    }

    // Wide salary range (may indicate inexperience with role)
    if (job.salaryMin && job.salaryMax) {
      const range = job.salaryMax - job.salaryMin;
      const percentage = (range / job.salaryMin) * 100;

      if (percentage > 50) {
        flags.push({
          id: 'wide-salary-range',
          type: 'salary',
          severity: 'low',
          category: 'Compensation Structure',
          title: 'Unusually Wide Salary Range',
          description: `Salary range spans ${percentage.toFixed(0)}% which may indicate unclear role definition`,
          evidence: [`Range: ${job.salaryMin} - ${job.salaryMax} ${(job as any).salaryCurrency || 'USD'}`],
          impact: 'May indicate poorly defined role or unrealistic expectations',
          recommendation: 'Clarify role responsibilities and expectations',
          urgency: 'before_applying',
          confidence: 70
        });
      }
    }

    return flags;
  }

  private async analyzeBenefitsRedFlags(job: ExtractedJobData): Promise<RedFlag[]> {
    const flags: RedFlag[] = [];
    const benefits = job.benefits || [];

    // No benefits mentioned
    if (benefits.length === 0) {
      flags.push({
        id: 'no-benefits-mentioned',
        type: 'benefits',
        severity: 'medium',
        category: 'Compensation Package',
        title: 'No Benefits Information',
        description: 'Job posting does not mention any benefits',
        evidence: ['No benefits listed in job posting'],
        impact: 'May indicate minimal benefits package',
        recommendation: 'Inquire about full benefits package during interview',
        urgency: 'before_applying',
        confidence: 85
      });
    }

    // Check for problematic benefit patterns
    const benefitsText = benefits.join(' ').toLowerCase();

    if (benefitsText.includes('unlimited pto') || benefitsText.includes('unlimited vacation')) {
      flags.push({
        id: 'unlimited-pto-concern',
        type: 'benefits',
        severity: 'medium',
        category: 'Time Off Policy',
        title: 'Unlimited PTO Policy',
        description: 'Unlimited PTO policies often result in employees taking less time off',
        evidence: ['Unlimited PTO mentioned in benefits'],
        impact: 'Research shows unlimited PTO often means less actual vacation time',
        recommendation: 'Ask about actual PTO usage statistics and company culture',
        urgency: 'before_accepting',
        confidence: 75
      });
    }

    return flags;
  }

  private async analyzeCompanyRedFlags(
    job: ExtractedJobData,
    classification: JobClassification
  ): Promise<RedFlag[]> {
    const flags: RedFlag[] = [];

    // Company size vs compensation
    if (classification.companyType === 'startup' && job.salaryMin && job.salaryMin < 80000) {
      flags.push({
        id: 'startup-low-salary',
        type: 'company',
        severity: 'medium',
        category: 'Startup Risk',
        title: 'Startup with Below-Market Salary',
        description: 'Early-stage company offering below-market compensation without clear equity upside',
        evidence: ['Startup classification', 'Below-market salary'],
        impact: 'High risk with limited financial reward',
        recommendation: 'Negotiate significant equity or consider other opportunities',
        urgency: 'before_accepting',
        confidence: 80
      });
    }

    // High turnover indicators
    const description = job.description?.toLowerCase() || '';
    if (description.includes('immediate start') || description.includes('urgent') || description.includes('asap')) {
      flags.push({
        id: 'urgency-turnover-risk',
        type: 'company',
        severity: 'medium',
        category: 'Turnover Risk',
        title: 'Urgency May Indicate High Turnover',
        description: 'Job posting emphasizes immediate start, which may suggest high turnover',
        evidence: ['Urgent language in job posting'],
        impact: 'Potential workplace instability',
        recommendation: 'Ask about team stability and reasons for the opening',
        urgency: 'before_applying',
        confidence: 60
      });
    }

    return flags;
  }

  private async analyzePostingRedFlags(job: ExtractedJobData): Promise<RedFlag[]> {
    const flags: RedFlag[] = [];
    const description = job.description || '';

    // Pattern-based detection
    const postingFlags = this.detectPatternFlags(description, 'posting');
    flags.push(...postingFlags);

    // Poor job description quality
    if (description.length < 200) {
      flags.push({
        id: 'poor-job-description',
        type: 'posting',
        severity: 'low',
        category: 'Job Posting Quality',
        title: 'Minimal Job Description',
        description: 'Job posting lacks detailed information about role and responsibilities',
        evidence: ['Very brief job description'],
        impact: 'May indicate lack of planning or unclear expectations',
        recommendation: 'Ask for detailed role expectations during interview',
        urgency: 'before_applying',
        confidence: 70
      });
    }

    // Unrealistic requirements
    if (job.skills && job.skills.length > 15) {
      flags.push({
        id: 'unrealistic-requirements',
        type: 'posting',
        severity: 'medium',
        category: 'Job Requirements',
        title: 'Excessive Skill Requirements',
        description: 'Job posting lists an unusually high number of required skills',
        evidence: [`${job.skills.length} required skills listed`],
        impact: 'May indicate unrealistic expectations or poorly defined role',
        recommendation: 'Focus on core skills and clarify actual requirements',
        urgency: 'before_applying',
        confidence: 75
      });
    }

    return flags;
  }

  private async analyzeCulturalRedFlags(job: ExtractedJobData): Promise<RedFlag[]> {
    const flags: RedFlag[] = [];
    const description = job.description?.toLowerCase() || '';

    // Cultural red flag patterns
    const culturalPatterns = [
      {
        pattern: /work hard play hard|hustle|grind/,
        title: 'Potential Overwork Culture',
        severity: 'medium' as const
      },
      {
        pattern: /family|we're all family/,
        title: 'Family Language May Indicate Boundary Issues',
        severity: 'low' as const
      },
      {
        pattern: /rockstar|ninja|guru|wizard/,
        title: 'Unprofessional Job Title Language',
        severity: 'low' as const
      }
    ];

    culturalPatterns.forEach((pattern, index) => {
      if (pattern.pattern.test(description)) {
        flags.push({
          id: `cultural-flag-${index}`,
          type: 'cultural',
          severity: pattern.severity,
          category: 'Company Culture',
          title: pattern.title,
          description: `Job posting contains language that may indicate cultural concerns`,
          evidence: ['Specific language patterns in job posting'],
          impact: 'May indicate problematic workplace culture',
          recommendation: 'Ask specific questions about work-life balance and company culture',
          urgency: 'before_applying',
          confidence: 60
        });
      }
    });

    return flags;
  }

  private async analyzeCareerRedFlags(
    job: ExtractedJobData,
    userResume?: any,
    userContext?: any
  ): Promise<RedFlag[]> {
    const flags: RedFlag[] = [];

    if (!userResume) return flags;

    // Overqualification risk
    if (userResume.careerLevel === 'senior' && job.title?.toLowerCase().includes('junior')) {
      flags.push({
        id: 'overqualification-risk',
        type: 'career',
        severity: 'medium',
        category: 'Career Alignment',
        title: 'Potential Overqualification',
        description: 'Your experience level may be significantly higher than this role requires',
        evidence: ['Senior experience level vs junior role'],
        impact: 'Risk of boredom, underpayment, and limited growth',
        recommendation: 'Consider if this aligns with career goals or is a strategic move',
        urgency: 'before_applying',
        confidence: 80
      });
    }

    // Skills mismatch
    const requiredSkills = job.skills || [];
    const userSkills = userResume.technicalSkills || [];
    const matchedSkills = requiredSkills.filter((skill: string) =>
      userSkills.some((userSkill: string) => userSkill.toLowerCase().includes(skill.toLowerCase()))
    );

    if (requiredSkills.length > 0 && matchedSkills.length / requiredSkills.length < 0.3) {
      flags.push({
        id: 'major-skills-gap',
        type: 'career',
        severity: 'high',
        category: 'Skill Alignment',
        title: 'Significant Skills Gap',
        description: 'Large gap between required skills and your current skillset',
        evidence: [`Only ${matchedSkills.length}/${requiredSkills.length} required skills match`],
        impact: 'Low chance of success in role without significant learning',
        recommendation: 'Focus skill development or consider better-matched opportunities',
        urgency: 'before_applying',
        confidence: 85
      });
    }

    return flags;
  }

  private async generateAIRedFlagAnalysis(
    job: ExtractedJobData,
    classification: JobClassification,
    userContext?: any
  ): Promise<RedFlag[]> {

    const prompt = `You are an expert career advisor specializing in identifying red flags in job opportunities.

JOB POSTING:
${JSON.stringify(job, null, 2)}

JOB CLASSIFICATION:
${JSON.stringify(classification, null, 2)}

USER CONTEXT:
${JSON.stringify(userContext, null, 2)}

Analyze this job opportunity for subtle red flags that pattern matching might miss. Look for:

1. Contradictory information
2. Unrealistic expectations
3. Hidden compensation issues
4. Cultural red flags
5. Career risks
6. Market positioning problems

Return ONLY a JSON array of red flags:

[
  {
    "id": "unique_id",
    "type": "salary|benefits|company|posting|cultural|legal|career",
    "severity": "critical|high|medium|low",
    "category": "specific category",
    "title": "brief title",
    "description": "detailed description",
    "evidence": ["supporting evidence"],
    "impact": "potential impact",
    "recommendation": "specific action",
    "urgency": "immediate|before_applying|before_accepting|monitor",
    "confidence": number_0_to_100
  }
]

Be specific and actionable. Only include genuine concerns, not nitpicking.`;

    try {
      const response = await generateCompletion(prompt, {
        max_tokens: 2000,
        temperature: 0.2
      });

      if (response?.content) {
        const aiFlags = JSON.parse(response.content);
        return Array.isArray(aiFlags) ? aiFlags : [];
      }
    } catch (error) {
      console.error('AI red flag analysis failed:', error);
    }

    return [];
  }

  private detectPatternFlags(text: string, category: string): RedFlag[] {
    const flags: RedFlag[] = [];
    const patterns = this.redFlagPatterns[category as keyof typeof this.redFlagPatterns] || [];

    patterns.forEach((patternConfig, index) => {
      if (patternConfig.pattern.test(text)) {
        flags.push({
          id: `pattern-${category}-${index}`,
          type: category as any,
          severity: patternConfig.severity,
          category: 'Pattern Detection',
          title: patternConfig.flag,
          description: `Detected concerning pattern in job posting: ${patternConfig.flag}`,
          evidence: ['Pattern match in job description'],
          impact: 'May indicate potential issues with role or company',
          recommendation: 'Investigate further during interview process',
          urgency: 'before_applying',
          confidence: 70
        });
      }
    });

    return flags;
  }

  private detectSalaryQuickFlags(job: ExtractedJobData): RedFlag[] {
    const flags: RedFlag[] = [];

    if (!job.salaryMin) {
      flags.push({
        id: 'quick-no-salary',
        type: 'salary',
        severity: 'medium',
        category: 'Transparency',
        title: 'No Salary Information',
        description: 'Salary not disclosed in posting',
        evidence: ['Missing salary data'],
        impact: 'Information asymmetry',
        recommendation: 'Ask for range',
        urgency: 'before_applying',
        confidence: 95
      });
    }

    return flags;
  }

  private detectCompanyQuickFlags(job: ExtractedJobData): RedFlag[] {
    // Quick company-related flag detection
    return [];
  }

  private categorizeFlags(flags: RedFlag[]) {
    return {
      critical: flags.filter(f => f.severity === 'critical'),
      high: flags.filter(f => f.severity === 'high'),
      medium: flags.filter(f => f.severity === 'medium'),
      low: flags.filter(f => f.severity === 'low')
    };
  }

  private calculateRiskAssessment(categorizedFlags: any) {
    const criticalCount = categorizedFlags.critical.length;
    const highCount = categorizedFlags.high.length;
    const mediumCount = categorizedFlags.medium.length;
    const lowCount = categorizedFlags.low.length;

    let score = 100;
    score -= criticalCount * 30;
    score -= highCount * 20;
    score -= mediumCount * 10;
    score -= lowCount * 5;

    score = Math.max(0, score);

    let level: 'very_high' | 'high' | 'moderate' | 'low' | 'minimal';
    let recommendation: 'avoid' | 'proceed_with_caution' | 'acceptable_risk' | 'green_light';

    if (criticalCount > 0) {
      level = 'very_high';
      recommendation = 'avoid';
    } else if (highCount > 2 || score < 50) {
      level = 'high';
      recommendation = 'proceed_with_caution';
    } else if (score < 75) {
      level = 'moderate';
      recommendation = 'acceptable_risk';
    } else {
      level = 'low';
      recommendation = 'green_light';
    }

    return { level, score, recommendation };
  }

  private generateContextualWarnings(flags: RedFlag[], userContext?: any) {
    return {
      forNewGrads: [
        'Be especially cautious of roles with vague descriptions',
        'Ensure salary meets entry-level market standards'
      ],
      forExperienced: [
        'Watch for overqualification risks',
        'Ensure role offers growth opportunities'
      ],
      forCareerChangers: [
        'Verify skill requirements align with transition goals',
        'Consider long-term career trajectory'
      ],
      forRemoteWorkers: [
        'Confirm remote work infrastructure and support',
        'Clarify communication and collaboration expectations'
      ]
    };
  }

  private identifyGreenFlags(job: ExtractedJobData, classification: JobClassification) {
    const greenFlags = [];

    if (job.salaryMin) {
      greenFlags.push({
        type: 'Transparency',
        description: 'Salary range clearly disclosed',
        impact: 'Shows transparency and professionalism'
      });
    }

    if (job.benefits && job.benefits.length > 0) {
      greenFlags.push({
        type: 'Benefits',
        description: 'Comprehensive benefits package mentioned',
        impact: 'Indicates investment in employee wellbeing'
      });
    }

    return greenFlags;
  }

  private generateMitigationStrategies(flags: RedFlag[], job: ExtractedJobData) {
    const criticalFlags = flags.filter(f => f.severity === 'critical');
    const highFlags = flags.filter(f => f.severity === 'high');

    return {
      immediateActions: criticalFlags.map(f => f.recommendation),
      questionsToAsk: [
        'Can you provide more details about the compensation structure?',
        'What does a typical day/week look like in this role?',
        'How do you measure success in this position?',
        'What are the biggest challenges facing the team?'
      ],
      researchToDo: [
        'Company financial health and stability',
        'Employee reviews on Glassdoor/similar sites',
        'Recent company news and press coverage',
        'Industry salary benchmarks'
      ],
      negotiationPoints: highFlags.map(f => f.recommendation)
    };
  }

  private generateMarketComparison(job: ExtractedJobData, salaryAnalysis?: ContextualSalaryAnalysis) {
    return {
      industryStandards: 'Salary appears to be within industry range',
      competitorComparison: 'Research needed for comprehensive comparison',
      marketPosition: salaryAnalysis?.salaryData.marketPosition || 'unknown'
    };
  }

  private getQuickSeverityLevel(flags: RedFlag[]): 'critical' | 'high' | 'medium' | 'low' | 'none' {
    if (flags.length === 0) return 'none';
    if (flags.some(f => f.severity === 'critical')) return 'critical';
    if (flags.some(f => f.severity === 'high')) return 'high';
    if (flags.some(f => f.severity === 'medium')) return 'medium';
    return 'low';
  }

  private calculateAnalysisConfidence(job: ExtractedJobData, classification: JobClassification): number {
    let confidence = 70;

    if (job.description && job.description.length > 500) confidence += 15;
    if (job.salaryMin) confidence += 10;
    if (job.company) confidence += 5;

    return Math.min(confidence, 100);
  }

  private getAnalyzedSources(job: ExtractedJobData): string[] {
    const sources = ['Job posting content'];

    if (job.salary) sources.push('Salary information');
    if (job.benefits) sources.push('Benefits information');
    if (job.company) sources.push('Company information');

    return sources;
  }

  private identifyLimitations(job: ExtractedJobData): string[] {
    const limitations = [];

    if (!job.description || job.description.length < 200) {
      limitations.push('Limited job description for comprehensive analysis');
    }

    if (!job.company) {
      limitations.push('No company information available');
    }

    return limitations;
  }

  // Domain-specific analyzers
  private async analyzeStartupRedFlags(job: ExtractedJobData): Promise<RedFlag[]> {
    const flags: RedFlag[] = [];

    if (job.salaryMin && job.salaryMin < 70000) {
      flags.push({
        id: 'startup-below-market',
        type: 'company',
        severity: 'high',
        category: 'Startup Risk',
        title: 'Below-Market Startup Salary',
        description: 'Startup offering below-market salary without clear equity compensation',
        evidence: ['Low salary for startup environment'],
        impact: 'High risk, low reward scenario',
        recommendation: 'Negotiate substantial equity package',
        urgency: 'before_accepting',
        confidence: 85
      });
    }

    return flags;
  }

  private async analyzeRemoteRedFlags(job: ExtractedJobData): Promise<RedFlag[]> {
    const flags: RedFlag[] = [];
    const description = job.description?.toLowerCase() || '';

    if (!description.includes('remote') && !description.includes('work from home')) {
      flags.push({
        id: 'unclear-remote-policy',
        type: 'posting',
        severity: 'medium',
        category: 'Remote Work',
        title: 'Unclear Remote Work Policy',
        description: 'Remote designation unclear in job posting',
        evidence: ['Ambiguous remote work description'],
        impact: 'May face unexpected office requirements',
        recommendation: 'Clarify remote work expectations',
        urgency: 'before_applying',
        confidence: 75
      });
    }

    return flags;
  }

  private async analyzeContractRedFlags(job: ExtractedJobData): Promise<RedFlag[]> {
    const flags: RedFlag[] = [];

    if (!job.benefits || job.benefits.length === 0) {
      flags.push({
        id: 'contract-no-benefits',
        type: 'benefits',
        severity: 'medium',
        category: 'Contract Work',
        title: 'No Benefits for Contract Role',
        description: 'Contract position with no benefits mentioned',
        evidence: ['Contract role without benefits'],
        impact: 'Higher total compensation needed to offset lack of benefits',
        recommendation: 'Factor in additional costs for healthcare and retirement',
        urgency: 'before_accepting',
        confidence: 90
      });
    }

    return flags;
  }

  private async analyzeInternationalRedFlags(job: ExtractedJobData): Promise<RedFlag[]> {
    const flags: RedFlag[] = [];

    // Add international-specific red flag logic
    return flags;
  }
}

export const smartRedFlagDetector = new SmartRedFlagDetector();