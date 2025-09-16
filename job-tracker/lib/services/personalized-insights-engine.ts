/**
 * Personalized Insights Engine
 * Generates job-specific insights based on user resume and context
 */

import { ExtractedJobData } from '../ai-service';
import { ResumeJobMatch, resumeAnalysisService, UserContext } from './resume-analysis-service';
import { JobClassification, jobClassificationEngine } from './job-classification-engine';
import { ContextualSalaryAnalysis, contextualSalaryAnalyzer } from './contextual-salary-analyzer';
import { generateCompletion } from '../ai-service';

export interface PersonalizedJobInsights {
  // Core matching data
  matchAnalysis: {
    overallScore: number; // 0-100
    confidence: number; // 0-100
    recommendation: 'highly_recommended' | 'recommended' | 'consider' | 'pass';
    reasoning: string;
  };

  // Skill-specific insights
  skillsInsights: {
    strongMatches: Array<{
      skill: string;
      relevance: number; // 0-100
      advantageLevel: 'critical' | 'strong' | 'nice_to_have';
      examples: string[]; // From user's experience
    }>;

    developmentOpportunities: Array<{
      skill: string;
      priority: 'must_have' | 'important' | 'nice_to_have';
      timeToLearn: string;
      impact: string; // How this skill affects the role
      learningPath: string[];
    }>;

    transferableSkills: Array<{
      userSkill: string;
      jobApplication: string;
      transferabilityScore: number; // 0-100
      howToPosition: string;
    }>;
  };

  // Experience insights
  experienceInsights: {
    relevantExperience: Array<{
      position: string;
      company: string;
      relevanceScore: number; // 0-100
      keyHighlights: string[];
      storyAngles: string[]; // How to position this experience
    }>;

    experienceGaps: Array<{
      missingArea: string;
      impact: 'critical' | 'moderate' | 'minor';
      mitigation: string;
      alternativeEvidence: string[];
    }>;

    careerTrajectory: {
      progressionType: 'upward' | 'lateral' | 'pivot' | 'step_back';
      strategicValue: string;
      narrativeFraming: string;
      potentialConcerns: string[];
    };
  };

  // Contextual positioning
  positioningStrategy: {
    uniqueValueProposition: string;
    competitiveDifferentiators: string[];
    addressingWeaknesses: Array<{
      weakness: string;
      strategy: string;
      supporting_evidence: string[];
    }>;

    interviewPreparation: {
      keyQuestions: string[];
      storyBank: Array<{
        situation: string;
        challenge: string;
        action: string;
        result: string;
        relevance: string;
      }>;
      technicalPrep: string[];
    };
  };

  // Personalized application advice
  applicationStrategy: {
    coverLetterPoints: string[];
    resumeOptimization: Array<{
      section: string;
      recommendation: string;
      priority: 'high' | 'medium' | 'low';
    }>;

    networkingOpportunities: Array<{
      type: 'linkedin' | 'referral' | 'industry_connection' | 'alumni';
      strategy: string;
      script?: string;
    }>;

    timelineRecommendation: {
      urgency: 'apply_immediately' | 'apply_soon' | 'can_wait' | 'explore_more';
      reasoning: string;
      optimalTiming: string;
    };
  };

  // Growth and development insights
  careerDevelopment: {
    skillGrowthPlan: Array<{
      skill: string;
      currentLevel: number; // 0-100
      targetLevel: number; // 0-100
      timeline: string;
      resources: string[];
      milestones: string[];
    }>;

    careerPathAlignment: {
      shortTermFit: number; // 0-100
      longTermValue: number; // 0-100
      alternativePaths: string[];
      riskMitigation: string[];
    };

    professionalBranding: {
      strengthsToEmphasize: string[];
      areasToDownplay: string[];
      narrativeAdjustments: string[];
    };
  };

  // Salary and compensation insights
  compensationInsights: {
    negotiationReadiness: number; // 0-100
    leveragePoints: string[];
    marketPosition: string;
    expectationAlignment: string;
    negotiationTimeline: string;
  };

  // Meta information
  insights_metadata: {
    generated_at: string;
    confidence_score: number; // 0-100
    data_quality: 'excellent' | 'good' | 'fair' | 'limited';
    limitations: string[];
    refresh_recommended: string; // When to regenerate insights
  };
}

export class PersonalizedInsightsEngine {
  /**
   * Generate comprehensive personalized insights for a job opportunity
   */
  async generateInsights(
    job: ExtractedJobData,
    userResume: any,
    userContext?: UserContext
  ): Promise<PersonalizedJobInsights> {

    // Get foundational analyses
    const [classification, resumeMatch, salaryAnalysis] = await Promise.all([
      jobClassificationEngine.classifyJob(job),
      resumeAnalysisService.analyzeJobMatch(userResume, job, userContext),
      contextualSalaryAnalyzer.analyze(job, userResume, {
        currentSalary: userContext?.salaryExpectations?.current,
        desiredSalary: userContext?.salaryExpectations?.desired,
        urgency: userContext?.timeline?.urgency,
        riskTolerance: userContext?.riskTolerance
      })
    ]);

    // Generate insights using AI analysis
    const insights = await this.generatePersonalizedAnalysis(
      job,
      userResume,
      classification,
      resumeMatch,
      salaryAnalysis,
      userContext
    );

    return insights;
  }

  /**
   * Quick insights for dashboard preview (lighter computation)
   */
  async generateQuickInsights(
    job: ExtractedJobData,
    userResume: any
  ): Promise<Partial<PersonalizedJobInsights>> {

    const resumeMatch = await resumeAnalysisService.analyzeJobMatch(userResume, job);

    return {
      matchAnalysis: {
        overallScore: resumeMatch.matchScore,
        confidence: 85,
        recommendation: this.getQuickRecommendation(resumeMatch.matchScore),
        reasoning: this.generateQuickReasoning(resumeMatch)
      },

      skillsInsights: {
        strongMatches: resumeMatch.skillsAnalysis.matchedSkills.slice(0, 3).map(skill => ({
          skill,
          relevance: 90,
          advantageLevel: 'strong' as const,
          examples: []
        })),

        developmentOpportunities: resumeMatch.skillsAnalysis.missingSkills.slice(0, 3).map(skill => ({
          skill,
          priority: 'important' as const,
          timeToLearn: '2-3 months',
          impact: 'Would strengthen application significantly',
          learningPath: ['Online courses', 'Practice projects']
        })),

        transferableSkills: []
      },

      insights_metadata: {
        generated_at: new Date().toISOString(),
        confidence_score: 75,
        data_quality: 'good',
        limitations: ['Quick analysis - full insights available on job details page'],
        refresh_recommended: '24 hours'
      }
    };
  }

  /**
   * Generate insights focused on application strategy
   */
  async generateApplicationFocusedInsights(
    job: ExtractedJobData,
    userResume: any,
    applicationDeadline?: string
  ): Promise<Pick<PersonalizedJobInsights, 'applicationStrategy' | 'positioningStrategy'>> {

    const resumeMatch = await resumeAnalysisService.analyzeJobMatch(userResume, job);
    const urgency = this.calculateApplicationUrgency(applicationDeadline);

    const applicationStrategy = await this.generateApplicationStrategy(job, userResume, resumeMatch, urgency);
    const positioningStrategy = await this.generatePositioningStrategy(job, userResume, resumeMatch);

    return {
      applicationStrategy,
      positioningStrategy
    };
  }

  private async generatePersonalizedAnalysis(
    job: ExtractedJobData,
    userResume: any,
    classification: JobClassification,
    resumeMatch: ResumeJobMatch,
    salaryAnalysis: ContextualSalaryAnalysis,
    userContext?: UserContext
  ): Promise<PersonalizedJobInsights> {

    const prompt = `You are a senior career coach providing personalized job application insights.

JOB OPPORTUNITY:
${JSON.stringify(job, null, 2)}

USER RESUME:
${JSON.stringify(userResume, null, 2)}

JOB CLASSIFICATION:
${JSON.stringify(classification, null, 2)}

RESUME MATCH ANALYSIS:
${JSON.stringify(resumeMatch, null, 2)}

USER CONTEXT:
${JSON.stringify(userContext, null, 2)}

Generate comprehensive, actionable insights to help this candidate succeed. Focus on:

1. PERSONALIZED POSITIONING: How should they present themselves?
2. SKILL DEVELOPMENT: What should they learn/emphasize?
3. APPLICATION STRATEGY: How to stand out and address gaps?
4. INTERVIEW PREPARATION: Specific stories and talking points
5. CAREER ALIGNMENT: How this fits their trajectory

Return detailed JSON following this structure:

{
  "matchAnalysis": {
    "overallScore": number_0_to_100,
    "confidence": number_0_to_100,
    "recommendation": "highly_recommended|recommended|consider|pass",
    "reasoning": "detailed explanation"
  },
  "skillsInsights": {
    "strongMatches": [
      {
        "skill": "specific skill",
        "relevance": number_0_to_100,
        "advantageLevel": "critical|strong|nice_to_have",
        "examples": ["specific examples from their experience"]
      }
    ],
    "developmentOpportunities": [
      {
        "skill": "skill to develop",
        "priority": "must_have|important|nice_to_have",
        "timeToLearn": "realistic timeline",
        "impact": "how this affects their candidacy",
        "learningPath": ["specific learning steps"]
      }
    ],
    "transferableSkills": [
      {
        "userSkill": "what they have",
        "jobApplication": "how it applies to job",
        "transferabilityScore": number_0_to_100,
        "howToPosition": "positioning advice"
      }
    ]
  },
  "experienceInsights": {
    "relevantExperience": [
      {
        "position": "job title",
        "company": "company name",
        "relevanceScore": number_0_to_100,
        "keyHighlights": ["relevant achievements"],
        "storyAngles": ["how to frame this experience"]
      }
    ],
    "experienceGaps": [
      {
        "missingArea": "gap description",
        "impact": "critical|moderate|minor",
        "mitigation": "how to address",
        "alternativeEvidence": ["other ways to show capability"]
      }
    ],
    "careerTrajectory": {
      "progressionType": "upward|lateral|pivot|step_back",
      "strategicValue": "how this move helps career",
      "narrativeFraming": "how to explain career path",
      "potentialConcerns": ["concerns to address"]
    }
  },
  "positioningStrategy": {
    "uniqueValueProposition": "what makes them special for this role",
    "competitiveDifferentiators": ["advantages over other candidates"],
    "addressingWeaknesses": [
      {
        "weakness": "area of concern",
        "strategy": "how to address it",
        "supporting_evidence": ["evidence to overcome concern"]
      }
    ],
    "interviewPreparation": {
      "keyQuestions": ["likely interview questions"],
      "storyBank": [
        {
          "situation": "context",
          "challenge": "problem faced",
          "action": "what they did",
          "result": "outcome achieved",
          "relevance": "why it matters for this role"
        }
      ],
      "technicalPrep": ["technical areas to review"]
    }
  },
  "applicationStrategy": {
    "coverLetterPoints": ["key points for cover letter"],
    "resumeOptimization": [
      {
        "section": "resume section",
        "recommendation": "specific improvement",
        "priority": "high|medium|low"
      }
    ],
    "networkingOpportunities": [
      {
        "type": "linkedin|referral|industry_connection|alumni",
        "strategy": "networking approach",
        "script": "optional outreach message"
      }
    ],
    "timelineRecommendation": {
      "urgency": "apply_immediately|apply_soon|can_wait|explore_more",
      "reasoning": "why this timeline",
      "optimalTiming": "when to apply"
    }
  },
  "careerDevelopment": {
    "skillGrowthPlan": [
      {
        "skill": "skill to develop",
        "currentLevel": number_0_to_100,
        "targetLevel": number_0_to_100,
        "timeline": "learning timeline",
        "resources": ["learning resources"],
        "milestones": ["progress markers"]
      }
    ],
    "careerPathAlignment": {
      "shortTermFit": number_0_to_100,
      "longTermValue": number_0_to_100,
      "alternativePaths": ["other career options"],
      "riskMitigation": ["ways to reduce career risks"]
    },
    "professionalBranding": {
      "strengthsToEmphasize": ["strengths to highlight"],
      "areasToDownplay": ["weaknesses to minimize"],
      "narrativeAdjustments": ["story improvements"]
    }
  },
  "compensationInsights": {
    "negotiationReadiness": number_0_to_100,
    "leveragePoints": ["negotiation advantages"],
    "marketPosition": "their position in market",
    "expectationAlignment": "salary expectation guidance",
    "negotiationTimeline": "when to negotiate"
  }
}

Be specific, actionable, and honest. Focus on practical advice they can implement immediately.`;

    const response = await generateCompletion(prompt, {
      max_tokens: 4000,
      temperature: 0.3
    });

    if (!response?.content) {
      return this.getFallbackInsights(resumeMatch);
    }

    try {
      const insights = JSON.parse(response.content);

      // Add metadata
      insights.insights_metadata = {
        generated_at: new Date().toISOString(),
        confidence_score: this.calculateConfidenceScore(resumeMatch, classification),
        data_quality: this.assessDataQuality(userResume, job),
        limitations: this.identifyLimitations(userResume, job, userContext),
        refresh_recommended: '7 days'
      };

      return insights;
    } catch (error) {
      console.error('Failed to parse insights:', error);
      return this.getFallbackInsights(resumeMatch);
    }
  }

  private async generateApplicationStrategy(
    job: ExtractedJobData,
    userResume: any,
    resumeMatch: ResumeJobMatch,
    urgency: string
  ) {
    return {
      coverLetterPoints: this.generateCoverLetterPoints(job, resumeMatch),
      resumeOptimization: this.generateResumeOptimizations(job, userResume, resumeMatch),
      networkingOpportunities: this.generateNetworkingStrategies(job),
      timelineRecommendation: {
        urgency: urgency as any,
        reasoning: this.generateUrgencyReasoning(urgency),
        optimalTiming: this.calculateOptimalTiming(urgency)
      }
    };
  }

  private async generatePositioningStrategy(
    job: ExtractedJobData,
    userResume: any,
    resumeMatch: ResumeJobMatch
  ) {
    return {
      uniqueValueProposition: this.generateUVP(userResume, resumeMatch),
      competitiveDifferentiators: resumeMatch.skillsAnalysis.skillsAdvantage,
      addressingWeaknesses: resumeMatch.concerns.map(concern => ({
        weakness: concern.description,
        strategy: concern.mitigation || 'Address proactively in application',
        supporting_evidence: []
      })),
      interviewPreparation: {
        keyQuestions: this.generateInterviewQuestions(job),
        storyBank: this.generateStoryBank(userResume, job),
        technicalPrep: resumeMatch.skillsAnalysis.missingSkills
      }
    };
  }

  // Helper methods
  private getQuickRecommendation(matchScore: number): 'highly_recommended' | 'recommended' | 'consider' | 'pass' {
    if (matchScore >= 80) return 'highly_recommended';
    if (matchScore >= 60) return 'recommended';
    if (matchScore >= 40) return 'consider';
    return 'pass';
  }

  private generateQuickReasoning(resumeMatch: ResumeJobMatch): string {
    if (resumeMatch.matchScore >= 80) {
      return 'Excellent match with strong skill alignment and relevant experience';
    } else if (resumeMatch.matchScore >= 60) {
      return 'Good match with some skill gaps that can be addressed';
    } else if (resumeMatch.matchScore >= 40) {
      return 'Moderate match - consider if role aligns with career goals';
    }
    return 'Limited match - significant skill or experience gaps';
  }

  private calculateApplicationUrgency(deadline?: string): string {
    if (!deadline) return 'can_wait';

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 3) return 'apply_immediately';
    if (daysLeft <= 7) return 'apply_soon';
    return 'can_wait';
  }

  private calculateConfidenceScore(resumeMatch: ResumeJobMatch, classification: JobClassification): number {
    let confidence = 70;

    if (resumeMatch.matchScore > 0) confidence += 15;
    if ((classification as any).adaptationNeeds?.length > 0) confidence += 10;

    return Math.min(confidence, 100);
  }

  private assessDataQuality(resume: any, job: ExtractedJobData): 'excellent' | 'good' | 'fair' | 'limited' {
    const resumeQuality = resume.confidence || 0;
    const jobDataQuality = job.description ? 0.8 : 0.4;

    const combined = (resumeQuality + jobDataQuality) / 2;

    if (combined >= 0.8) return 'excellent';
    if (combined >= 0.6) return 'good';
    if (combined >= 0.4) return 'fair';
    return 'limited';
  }

  private identifyLimitations(resume: any, job: ExtractedJobData, userContext?: UserContext): string[] {
    const limitations = [];

    if (!userContext) limitations.push('Limited user context available');
    if (!job.salary) limitations.push('No salary information available');
    if (resume.confidence < 0.7) limitations.push('Resume parsing confidence below optimal');

    return limitations;
  }

  private generateCoverLetterPoints(job: ExtractedJobData, resumeMatch: ResumeJobMatch): string[] {
    return [
      `Highlight ${resumeMatch.skillsAnalysis.matchedSkills.slice(0, 3).join(', ')} experience`,
      'Address company mission alignment',
      'Demonstrate understanding of role requirements',
      'Show enthusiasm for growth opportunities'
    ];
  }

  private generateResumeOptimizations(job: ExtractedJobData, resume: any, resumeMatch: ResumeJobMatch) {
    return [
      {
        section: 'Skills',
        recommendation: `Emphasize ${resumeMatch.skillsAnalysis.matchedSkills.slice(0, 3).join(', ')}`,
        priority: 'high' as const
      },
      {
        section: 'Experience',
        recommendation: 'Quantify achievements with metrics',
        priority: 'high' as const
      }
    ];
  }

  private generateNetworkingStrategies(job: ExtractedJobData) {
    return [
      {
        type: 'linkedin' as const,
        strategy: `Connect with current ${job.company} employees in similar roles`,
        script: `Hi [Name], I'm interested in the ${job.title} role at ${job.company}. Would love to learn about your experience there.`
      }
    ];
  }

  private generateUrgencyReasoning(urgency: string): string {
    const reasons = {
      apply_immediately: 'Application deadline is very soon',
      apply_soon: 'Application deadline approaching',
      can_wait: 'Sufficient time to prepare application',
      explore_more: 'Consider researching other opportunities'
    };
    return (reasons as any)[urgency] || 'Standard application timeline';
  }

  private calculateOptimalTiming(urgency: string): string {
    const timings = {
      apply_immediately: 'Within 24 hours',
      apply_soon: 'Within 3-5 days',
      can_wait: 'Within 1-2 weeks',
      explore_more: 'After exploring alternatives'
    };
    return (timings as any)[urgency] || 'When ready with strong application';
  }

  private generateUVP(resume: any, resumeMatch: ResumeJobMatch): string {
    const strengths = resume.keyStrengths.slice(0, 2);
    const experience = resume.yearsOfExperience;

    return `${experience}+ years of experience with proven expertise in ${strengths.join(' and ')}`;
  }

  private generateInterviewQuestions(job: ExtractedJobData): string[] {
    return [
      `Tell me about your experience with ${(job.skills as any)?.split ? (job.skills as unknown as string).split(',')[0] : 'relevant technologies'}`,
      'Why are you interested in this role?',
      'How do you handle challenging technical problems?',
      'What questions do you have about our team/company?'
    ];
  }

  private generateStoryBank(resume: any, job: ExtractedJobData) {
    return resume.experience.slice(0, 2).map((exp: any) => ({
      situation: `At ${exp.company} as ${exp.title}`,
      challenge: 'Faced complex technical challenge',
      action: 'Implemented solution using relevant skills',
      result: 'Achieved measurable positive outcome',
      relevance: `Demonstrates capability for ${job.title} role`
    }));
  }

  private getFallbackInsights(resumeMatch: ResumeJobMatch): PersonalizedJobInsights {
    return {
      matchAnalysis: {
        overallScore: resumeMatch.matchScore,
        confidence: 60,
        recommendation: this.getQuickRecommendation(resumeMatch.matchScore),
        reasoning: 'Basic analysis based on resume-job matching'
      },
      skillsInsights: {
        strongMatches: resumeMatch.skillsAnalysis.matchedSkills.slice(0, 3).map(skill => ({
          skill,
          relevance: 80,
          advantageLevel: 'strong' as const,
          examples: []
        })),
        developmentOpportunities: resumeMatch.skillsAnalysis.missingSkills.slice(0, 3).map(skill => ({
          skill,
          priority: 'important' as const,
          timeToLearn: '2-3 months',
          impact: 'Would improve candidacy',
          learningPath: ['Study resources', 'Practice projects']
        })),
        transferableSkills: []
      },
      experienceInsights: {
        relevantExperience: [],
        experienceGaps: [],
        careerTrajectory: {
          progressionType: 'lateral',
          strategicValue: 'Career development opportunity',
          narrativeFraming: 'Natural next step in career',
          potentialConcerns: []
        }
      },
      positioningStrategy: {
        uniqueValueProposition: 'Experienced professional with relevant background',
        competitiveDifferentiators: resumeMatch.skillsAnalysis.skillsAdvantage,
        addressingWeaknesses: [],
        interviewPreparation: {
          keyQuestions: [],
          storyBank: [],
          technicalPrep: []
        }
      },
      applicationStrategy: {
        coverLetterPoints: ['Highlight relevant experience', 'Show enthusiasm for role'],
        resumeOptimization: [],
        networkingOpportunities: [],
        timelineRecommendation: {
          urgency: 'apply_soon',
          reasoning: 'Standard application timeline',
          optimalTiming: 'Within 1 week'
        }
      },
      careerDevelopment: {
        skillGrowthPlan: [],
        careerPathAlignment: {
          shortTermFit: resumeMatch.careerAnalysis.careerAlignment,
          longTermValue: resumeMatch.careerAnalysis.growthOpportunity,
          alternativePaths: [],
          riskMitigation: []
        },
        professionalBranding: {
          strengthsToEmphasize: resumeMatch.skillsAnalysis.skillsAdvantage,
          areasToDownplay: [],
          narrativeAdjustments: []
        }
      },
      compensationInsights: {
        negotiationReadiness: resumeMatch.salaryInsights?.negotiationStrength * 10 || 50,
        leveragePoints: ['Relevant experience', 'Market demand for skills'],
        marketPosition: resumeMatch.salaryInsights?.marketPosition || 'at',
        expectationAlignment: 'Align expectations with market rates',
        negotiationTimeline: 'After initial offer'
      },
      insights_metadata: {
        generated_at: new Date().toISOString(),
        confidence_score: 60,
        data_quality: 'fair',
        limitations: ['Fallback analysis due to AI processing error'],
        refresh_recommended: '24 hours'
      }
    };
  }
}

export const personalizedInsightsEngine = new PersonalizedInsightsEngine();