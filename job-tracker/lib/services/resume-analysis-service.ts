/**
 * Resume Analysis Service - MIGRATED TO UNIFIED ARCHITECTURE
 * Provides job-specific analysis with NO token limits and clean error handling
 */

import { ResumeExtraction } from './ai-resume-extractor';
import { ExtractedJobData } from '../ai-service';
import { unifiedAI } from './unified-ai-service';

export interface ResumeJobMatch {
  // Overall compatibility
  matchScore: number; // 0-100%
  compatibility: 'excellent' | 'good' | 'fair' | 'poor';

  // Skills analysis
  skillsAnalysis: {
    matchedSkills: string[];
    missingSkills: string[];
    transferableSkills: string[];
    learningGap: number; // months to acquire missing skills
    skillsAdvantage: string[]; // skills user has that job doesn't require
  };

  // Experience analysis
  experienceAnalysis: {
    relevantExperience: number; // years
    experienceGap: number; // positive = overqualified, negative = underqualified
    relevantRoles: Array<{
      title: string;
      company: string;
      relevanceScore: number; // 0-100%
      keyTakeaways: string[];
    }>;
    careerProgression: 'upward' | 'lateral' | 'downward' | 'pivot';
  };

  // Education alignment
  educationAlignment: {
    degreeRelevance: number; // 0-100%
    educationAdvantage: boolean;
    relevantCoursework: string[];
    certificationGaps: string[];
  };

  // Salary expectations
  salaryInsights: {
    expectedRange?: {
      min: number;
      max: number;
      currency: string;
    };
    negotiationStrength: number; // 1-10
    salaryGrowthPotential: number; // percentage increase opportunity
    marketPosition: 'below' | 'at' | 'above' | 'unknown';
  };

  // Career development
  careerAnalysis: {
    growthOpportunity: number; // 0-100%
    skillDevelopmentAreas: string[];
    careerAlignment: number; // 0-100% how well job aligns with career trajectory
    riskFactors: string[];
    opportunityFactors: string[];
  };

  // Red flags and concerns
  concerns: Array<{
    type: 'overqualified' | 'underqualified' | 'skill-gap' | 'career-mismatch' | 'salary-drop' | 'location-mismatch';
    severity: 'low' | 'medium' | 'high';
    description: string;
    mitigation?: string;
  }>;

  // Recommendations
  recommendations: Array<{
    category: 'application' | 'interview' | 'negotiation' | 'career';
    priority: 'high' | 'medium' | 'low';
    action: string;
    reasoning: string;
  }>;
}

export interface UserContext {
  careerGoals?: string;
  riskTolerance?: 'low' | 'medium' | 'high';
  salaryExpectations?: {
    current?: number;
    desired?: number;
    minimum?: number;
  };
  preferences?: {
    workArrangement?: 'remote' | 'onsite' | 'hybrid' | 'flexible';
    companySize?: 'startup' | 'mid-size' | 'enterprise' | 'any';
    industry?: string[];
    location?: string[];
  };
  timeline?: {
    urgency?: 'immediate' | 'weeks' | 'months' | 'exploring';
    availableStartDate?: string;
  };
}

export class ResumeAnalysisService {
  /**
   * Analyze how user's resume matches with a specific job
   */
  async analyzeJobMatch(
    resume: ResumeExtraction,
    job: ExtractedJobData,
    userContext?: UserContext
  ): Promise<ResumeJobMatch> {

    const prompt = this.buildAnalysisPrompt(resume, job, userContext);

    const aiResponse = await unifiedAI.process({
      operation: 'skill_matching',
      content: prompt,
      overrides: { model: 'gpt-5-mini', reasoning: 'medium' }
    });

    if (!aiResponse.success) {
      throw new Error(`Resume analysis failed: ${aiResponse.error?.message}`);
    }

    const responseContent = typeof aiResponse.data === 'string' ? aiResponse.data : JSON.stringify(aiResponse.data);
    return this.parseAnalysisResponse(responseContent);
  }

  /**
   * Get user's salary expectations based on resume and market data
   */
  async estimateSalaryExpectations(
    resume: ResumeExtraction,
    location: string = 'US',
    userContext?: UserContext
  ): Promise<ResumeJobMatch['salaryInsights']> {

    const prompt = `You are a salary expert. Based on this resume and location, estimate realistic salary expectations.

RESUME DATA:
${JSON.stringify(resume, null, 2)}

LOCATION: ${location}
USER CONTEXT: ${userContext ? JSON.stringify(userContext) : 'None provided'}

Analyze the candidate's market value and return JSON:
{
  "expectedRange": {
    "min": number,
    "max": number,
    "currency": "currency_code"
  },
  "negotiationStrength": number_1_to_10,
  "salaryGrowthPotential": percentage_number,
  "marketPosition": "below|at|above|unknown"
}

Consider:
- Years of experience and career level
- Technical skills and their market demand
- Location and currency
- Company types they've worked for
- Industry experience
- Education and certifications

Return ONLY valid JSON.`;

    const aiResponse = await unifiedAI.process({
      operation: 'general_completion',
      content: prompt,
      overrides: { model: 'gpt-5-mini', reasoning: 'low' }
    });

    if (!aiResponse.success) {
      throw new Error(`Salary expectations analysis failed: ${aiResponse.error?.message}`);
    }

    try {
      const responseContent = typeof aiResponse.data === 'string' ? aiResponse.data : JSON.stringify(aiResponse.data);
    return JSON.parse(responseContent);
    } catch (error) {
      console.error('Failed to parse salary expectations:', error);
      return {
        negotiationStrength: 5,
        salaryGrowthPotential: 15,
        marketPosition: 'unknown'
      };
    }
  }

  /**
   * Identify skill gaps and learning recommendations
   */
  async analyzeSkillGaps(
    resume: ResumeExtraction,
    targetRole: string,
    targetLevel: string = 'mid'
  ): Promise<{
    skillGaps: string[];
    learningPath: Array<{
      skill: string;
      priority: 'high' | 'medium' | 'low';
      timeToLearn: string;
      resources: string[];
    }>;
    strengthAreas: string[];
  }> {

    const prompt = `You are a career development expert. Analyze skill gaps for career advancement.

CURRENT RESUME:
${JSON.stringify(resume, null, 2)}

TARGET ROLE: ${targetRole}
TARGET LEVEL: ${targetLevel}

Identify what skills they need to develop and return JSON:
{
  "skillGaps": ["missing skills"],
  "learningPath": [
    {
      "skill": "skill name",
      "priority": "high|medium|low",
      "timeToLearn": "estimated time",
      "resources": ["learning resources"]
    }
  ],
  "strengthAreas": ["existing strong skills"]
}

Focus on:
- Technical skills that are in high demand
- Skills needed for the target level
- Industry-specific requirements
- Transferable skills they already have

Return ONLY valid JSON.`;

    const aiResponse = await unifiedAI.process({
      operation: 'general_completion',
      content: prompt,
      overrides: { model: 'gpt-5-mini', reasoning: 'medium' }
    });

    if (!aiResponse?.data && !aiResponse?.rawResponse) {
      return {
        skillGaps: [],
        learningPath: [],
        strengthAreas: []
      };
    }

    try {
      const responseContent = typeof aiResponse.data === 'string' ? aiResponse.data : JSON.stringify(aiResponse.data);
    return JSON.parse(responseContent);
    } catch (error) {
      console.error('Failed to parse skill gaps analysis:', error);
      return {
        skillGaps: [],
        learningPath: [],
        strengthAreas: []
      };
    }
  }

  private buildAnalysisPrompt(
    resume: ResumeExtraction,
    job: ExtractedJobData,
    userContext?: UserContext
  ): string {
    return `You are an expert career advisor. Analyze how well this candidate's resume matches the job opportunity.

CANDIDATE RESUME:
${JSON.stringify(resume, null, 2)}

JOB OPPORTUNITY:
${JSON.stringify(job, null, 2)}

USER CONTEXT:
${userContext ? JSON.stringify(userContext, null, 2) : 'No additional context provided'}

Provide a comprehensive analysis in JSON format:

{
  "matchScore": number_0_to_100,
  "compatibility": "excellent|good|fair|poor",
  "skillsAnalysis": {
    "matchedSkills": ["skills that match"],
    "missingSkills": ["skills job requires that candidate lacks"],
    "transferableSkills": ["candidate skills applicable to job"],
    "learningGap": number_months_to_acquire_missing_skills,
    "skillsAdvantage": ["extra skills candidate brings"]
  },
  "experienceAnalysis": {
    "relevantExperience": number_years,
    "experienceGap": number_positive_overqualified_negative_underqualified,
    "relevantRoles": [
      {
        "title": "role title",
        "company": "company name",
        "relevanceScore": number_0_to_100,
        "keyTakeaways": ["relevant achievements"]
      }
    ],
    "careerProgression": "upward|lateral|downward|pivot"
  },
  "educationAlignment": {
    "degreeRelevance": number_0_to_100,
    "educationAdvantage": boolean,
    "relevantCoursework": ["relevant courses"],
    "certificationGaps": ["missing certifications"]
  },
  "salaryInsights": {
    "expectedRange": {
      "min": number,
      "max": number,
      "currency": "currency_code"
    },
    "negotiationStrength": number_1_to_10,
    "salaryGrowthPotential": percentage_number,
    "marketPosition": "below|at|above|unknown"
  },
  "careerAnalysis": {
    "growthOpportunity": number_0_to_100,
    "skillDevelopmentAreas": ["areas for growth"],
    "careerAlignment": number_0_to_100,
    "riskFactors": ["potential concerns"],
    "opportunityFactors": ["potential benefits"]
  },
  "concerns": [
    {
      "type": "overqualified|underqualified|skill-gap|career-mismatch|salary-drop|location-mismatch",
      "severity": "low|medium|high",
      "description": "concern description",
      "mitigation": "how to address"
    }
  ],
  "recommendations": [
    {
      "category": "application|interview|negotiation|career",
      "priority": "high|medium|low",
      "action": "specific action to take",
      "reasoning": "why this action is important"
    }
  ]
}

ANALYSIS REQUIREMENTS:
- Be realistic and specific
- Consider industry standards and market conditions
- Account for location and currency differences
- Identify both strengths and improvement areas
- Provide actionable recommendations
- Consider career trajectory and growth potential
- Flag any red flags or concerns
- Be honest about fit and compatibility

Return ONLY valid JSON.`;
  }

  private parseAnalysisResponse(aiResponse: string): ResumeJobMatch {
    try {
      const parsed = JSON.parse(aiResponse);

      // Validate and provide defaults for required fields
      return {
        matchScore: parsed.matchScore || 0,
        compatibility: parsed.compatibility || 'fair',
        skillsAnalysis: {
          matchedSkills: parsed.skillsAnalysis?.matchedSkills || [],
          missingSkills: parsed.skillsAnalysis?.missingSkills || [],
          transferableSkills: parsed.skillsAnalysis?.transferableSkills || [],
          learningGap: parsed.skillsAnalysis?.learningGap || 0,
          skillsAdvantage: parsed.skillsAnalysis?.skillsAdvantage || []
        },
        experienceAnalysis: {
          relevantExperience: parsed.experienceAnalysis?.relevantExperience || 0,
          experienceGap: parsed.experienceAnalysis?.experienceGap || 0,
          relevantRoles: parsed.experienceAnalysis?.relevantRoles || [],
          careerProgression: parsed.experienceAnalysis?.careerProgression || 'lateral'
        },
        educationAlignment: {
          degreeRelevance: parsed.educationAlignment?.degreeRelevance || 0,
          educationAdvantage: parsed.educationAlignment?.educationAdvantage || false,
          relevantCoursework: parsed.educationAlignment?.relevantCoursework || [],
          certificationGaps: parsed.educationAlignment?.certificationGaps || []
        },
        salaryInsights: {
          expectedRange: parsed.salaryInsights?.expectedRange,
          negotiationStrength: parsed.salaryInsights?.negotiationStrength || 5,
          salaryGrowthPotential: parsed.salaryInsights?.salaryGrowthPotential || 0,
          marketPosition: parsed.salaryInsights?.marketPosition || 'unknown'
        },
        careerAnalysis: {
          growthOpportunity: parsed.careerAnalysis?.growthOpportunity || 0,
          skillDevelopmentAreas: parsed.careerAnalysis?.skillDevelopmentAreas || [],
          careerAlignment: parsed.careerAnalysis?.careerAlignment || 0,
          riskFactors: parsed.careerAnalysis?.riskFactors || [],
          opportunityFactors: parsed.careerAnalysis?.opportunityFactors || []
        },
        concerns: parsed.concerns || [],
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      console.error('Failed to parse resume analysis:', error);

      // Return default analysis structure
      return {
        matchScore: 50,
        compatibility: 'fair',
        skillsAnalysis: {
          matchedSkills: [],
          missingSkills: [],
          transferableSkills: [],
          learningGap: 0,
          skillsAdvantage: []
        },
        experienceAnalysis: {
          relevantExperience: 0,
          experienceGap: 0,
          relevantRoles: [],
          careerProgression: 'lateral'
        },
        educationAlignment: {
          degreeRelevance: 0,
          educationAdvantage: false,
          relevantCoursework: [],
          certificationGaps: []
        },
        salaryInsights: {
          negotiationStrength: 5,
          salaryGrowthPotential: 0,
          marketPosition: 'unknown'
        },
        careerAnalysis: {
          growthOpportunity: 0,
          skillDevelopmentAreas: [],
          careerAlignment: 0,
          riskFactors: ['Unable to analyze - AI parsing failed'],
          opportunityFactors: []
        },
        concerns: [{
          type: 'skill-gap',
          severity: 'medium',
          description: 'Unable to perform detailed analysis',
          mitigation: 'Please try refreshing the analysis'
        }],
        recommendations: []
      };
    }
  }
}

export const resumeAnalysisService = new ResumeAnalysisService();