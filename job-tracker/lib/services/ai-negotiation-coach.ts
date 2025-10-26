// AI-Powered Negotiation Coach with Resume Analysis
// Uses user's resume and profile data to provide personalized negotiation strategies

import { unifiedAI } from './unified-ai-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface NegotiationRequest {
  userId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  currentOffer?: {
    baseSalary: number;
    bonus?: number;
    equity?: string;
    benefits?: string[];
    startDate?: string;
  };
  targetSalary?: number;
  location: string;
  workMode: string;
  hasCompetingOffers?: boolean;
  competingOffers?: Array<{
    company: string;
    salary: number;
    totalComp?: number;
  }>;
  negotiationPriorities?: ('salary' | 'equity' | 'flexibility' | 'title' | 'signing_bonus')[];
}

export interface NegotiationStrategy {
  readiness: {
    score: number; // 0-100
    hasResume: boolean;
    hasAdditionalInfo: boolean;
    profileCompleteness: number;
    missingElements: string[];
    recommendation: string;
  };
  leverage: {
    score: 'low' | 'medium' | 'high' | 'very_high';
    factors: string[];
    strengths: string[];
    weaknesses: string[];
  };
  strategies: Array<{
    approach: string;
    successProbability: number; // 0-100
    script: string;
    riskLevel: 'low' | 'medium' | 'high';
    expectedOutcome: string;
    whenToUse: string;
  }>;
  salaryRecommendations: {
    conservative: {
      amount: number;
      successRate: number;
      rationale: string;
    };
    target: {
      amount: number;
      successRate: number;
      rationale: string;
    };
    aggressive: {
      amount: number;
      successRate: number;
      rationale: string;
    };
  };
  negotiationScript: {
    opening: string;
    keyPoints: string[];
    handlingObjections: Array<{
      objection: string;
      response: string;
    }>;
    closingStrategy: string;
  };
  competingOfferStrategy?: {
    howToLeverage: string;
    mentionTiming: string;
    presentationApproach: string;
    warnings: string[];
  };
  nonMonetaryNegotiations: {
    flexibleWork: string;
    additionalPTO: string;
    signingBonus: string;
    titleUpgrade: string;
    equityIncrease: string;
    professionalDevelopment: string;
  };
  timeline: {
    idealNegotiationWindow: string;
    responseTimeframe: string;
    decisionDeadline: string;
    followUpSchedule: string[];
  };
  redFlags: string[];
  bestPractices: string[];
  personalizedInsights: string[];
}

interface UserProfileWithResume {
  id: string;
  email: string;
  profile?: {
    currentLocation?: string;
    yearsOfExperience?: number;
    expectedSalaryMin?: number;
    expectedSalaryMax?: number;
    currentSalary?: number;
    additionalInfo?: string; // New field for additional context
    skills?: string;
    education?: string;
    certifications?: string;
    achievements?: string;
    negotiationHistory?: string; // Track past negotiations
  };
  resumes?: Array<{
    filename: string;
    extractedText?: string;
    skills?: string;
    experience?: string;
    education?: string;
    achievements?: string;
    isActive: boolean;
  }>;
  jobs?: Array<{
    id: string;
    title: string;
    company: string;
    salaryMin?: number;
    salaryMax?: number;
    applicationStatus: string;
    rating?: number;
  }>;
}

export class AINegotiationCoachService {
  async generateStrategy(request: NegotiationRequest): Promise<NegotiationStrategy> {
    // Fetch user profile with resume
    const userProfile = await this.getUserProfileWithResume(request.userId);

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Check if user has uploaded resume
    const hasResume = userProfile.resumes && userProfile.resumes.length > 0;
    const hasAdditionalInfo = !!userProfile.profile?.additionalInfo;

    // Build comprehensive RAG context
    const ragContext = await this.buildNegotiationContext(request, userProfile);

    // Generate negotiation strategy
    const prompt = this.buildNegotiationPrompt(request, userProfile, ragContext);

    const aiResponse = await unifiedAI.process({
      operation: 'general_completion',
      content: prompt
    });
    if (!aiResponse || !(typeof aiResponse.data === 'string' ? aiResponse.data : JSON.stringify(aiResponse.data))) {
      throw new Error('Failed to generate negotiation strategy. AI service unavailable.');
    }

    const strategy = this.parseAIResponse((typeof aiResponse.data === 'string' ? aiResponse.data : JSON.stringify(aiResponse.data)));

    // Update readiness based on actual data
    strategy.readiness = {
      ...strategy.readiness,
      hasResume: hasResume || false,
      hasAdditionalInfo: hasAdditionalInfo || false,
      profileCompleteness: this.calculateProfileCompleteness(userProfile),
      missingElements: this.getMissingProfileElements(userProfile)
    };

    return strategy;
  }

  private async getUserProfileWithResume(userId: string): Promise<UserProfileWithResume | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          resumes: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          jobs: {
            where: {
              OR: [
                { applicationStatus: { in: ['offer_extended', 'offer_accepted'] } },
                {
                  ratings: {
                    some: {
                      rating: { gte: 4 }
                    }
                  }
                }
              ]
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      return user as UserProfileWithResume | null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  private async buildNegotiationContext(
    request: NegotiationRequest,
    userProfile: UserProfileWithResume
  ): Promise<string> {
    const contexts: string[] = [];

    // 1. User's resume context
    if (userProfile.resumes && userProfile.resumes[0]) {
      const resume = userProfile.resumes[0];
      let resumeContext = 'RESUME CONTEXT:';

      try {
        // Try to parse the complete AI extraction from content
        const extractedData = JSON.parse((resume as any).content || '{}');
        if (extractedData.name) {
          resumeContext += `\nName: ${extractedData.name}`;
          resumeContext += `\nCareer Level: ${extractedData.careerLevel || 'Unknown'}`;
          resumeContext += `\nYears of Experience: ${extractedData.yearsOfExperience || 0}`;
          resumeContext += `\nTechnical Skills: ${extractedData.technicalSkills?.join(', ') || 'None listed'}`;
          resumeContext += `\nKey Strengths: ${extractedData.keyStrengths?.join(', ') || 'None identified'}`;
          resumeContext += `\nIndustry Focus: ${extractedData.industryFocus?.join(', ') || 'General'}`;

          if (extractedData.experience && extractedData.experience.length > 0) {
            resumeContext += `\nRecent Experience:`;
            extractedData.experience.slice(0, 3).forEach((exp: any, idx: number) => {
              resumeContext += `\n  ${idx + 1}. ${exp.title} at ${exp.company} (${exp.duration})`;
              if (exp.achievements && exp.achievements.length > 0) {
                resumeContext += ` - Key achievement: ${exp.achievements[0]}`;
              }
            });
          }

          if (extractedData.certifications && extractedData.certifications.length > 0) {
            resumeContext += `\nCertifications: ${extractedData.certifications.join(', ')}`;
          }
        } else {
          // Fallback to old structure
          resumeContext += `\nSkills: ${resume.skills || 'Not extracted'}`;
          resumeContext += `\nExperience: ${resume.experience || 'Not extracted'}`;
          resumeContext += `\nEducation: ${resume.education || 'Not extracted'}`;
        }
      } catch (error) {
        // If parsing fails, use fallback
        resumeContext += `\nSkills: ${resume.skills || 'Not extracted'}`;
        resumeContext += `\nExperience: ${resume.experience || 'Not extracted'}`;
        resumeContext += `\nEducation: ${resume.education || 'Not extracted'}`;
      }

      contexts.push(resumeContext);
    } else {
      contexts.push(`RESUME CONTEXT: No resume uploaded - recommend user uploads resume for better negotiation strategy`);
    }

    // 2. Additional user-provided context
    if (userProfile.profile?.additionalInfo) {
      contexts.push(`ADDITIONAL USER CONTEXT:
${userProfile.profile.additionalInfo}`);
    }

    // 3. User's negotiation profile
    contexts.push(`NEGOTIATION PROFILE:
Years of Experience: ${userProfile.profile?.yearsOfExperience || 'Unknown'}
Current Salary: ${userProfile.profile?.currentSalary || 'Not disclosed'}
Expected Range: $${userProfile.profile?.expectedSalaryMin || 0} - $${userProfile.profile?.expectedSalaryMax || 0}
Current Location: ${userProfile.profile?.currentLocation || 'Unknown'}
Skills: ${userProfile.profile?.skills || 'Not specified'}
Certifications: ${userProfile.profile?.certifications || 'None listed'}
Achievements: ${userProfile.profile?.achievements || 'None listed'}`);

    // 4. Market context for the role
    const marketContext = await this.getMarketContext(request);
    if (marketContext) {
      contexts.push(`MARKET CONTEXT:\n${marketContext}`);
    }

    // 5. Company-specific context
    const companyContext = await this.getCompanyContext(request.company);
    if (companyContext) {
      contexts.push(`COMPANY CONTEXT:\n${companyContext}`);
    }

    // 6. User's application history
    if (userProfile.jobs && userProfile.jobs.length > 0) {
      const jobHistory = userProfile.jobs.map(job =>
        `- ${job.title} at ${job.company}: $${job.salaryMin}-${job.salaryMax} (${job.applicationStatus})`
      ).join('\n');
      contexts.push(`APPLICATION HISTORY:\n${jobHistory}`);
    }

    // 7. Competing offers context
    if (request.hasCompetingOffers && request.competingOffers) {
      const offers = request.competingOffers.map(offer =>
        `- ${offer.company}: $${offer.salary} base, $${offer.totalComp || offer.salary} total`
      ).join('\n');
      contexts.push(`COMPETING OFFERS:\n${offers}`);
    }

    return contexts.join('\n\n---\n\n');
  }

  private async getMarketContext(request: NegotiationRequest): Promise<string | null> {
    try {
      const similarJobs = await prisma.job.findMany({
        where: {
          title: { contains: request.jobTitle },
          location: { contains: request.location.split(',')[0] },
          salaryMin: { not: null }
        },
        select: {
          title: true,
          company: true,
          salaryMin: true,
          salaryMax: true
        },
        take: 5
      });

      if (similarJobs.length === 0) return null;

      const avgSalary = similarJobs.reduce((sum, job) =>
        sum + ((job.salaryMin || 0) + (job.salaryMax || 0)) / 2, 0
      ) / similarJobs.length;

      return `Market Data:
Average salary for similar roles: $${Math.round(avgSalary)}
Sample positions:
${similarJobs.map(job => `- ${job.title} at ${job.company}: $${job.salaryMin}-${job.salaryMax}`).join('\n')}`;
    } catch (error) {
      console.error('Error getting market context:', error);
      return null;
    }
  }

  private async getCompanyContext(company: string): Promise<string | null> {
    try {
      const companyJobs = await prisma.job.findMany({
        where: { company: { contains: company } },
        select: {
          title: true,
          salaryMin: true,
          salaryMax: true,
          applicationStatus: true
        },
        take: 5
      });

      if (companyJobs.length === 0) return null;

      return `Company hiring patterns:
Found ${companyJobs.length} positions from ${company}
Salary ranges: ${companyJobs.map(j => `$${j.salaryMin}-${j.salaryMax}`).join(', ')}
Typical roles: ${companyJobs.map(j => j.title).join(', ')}`;
    } catch (error) {
      console.error('Error getting company context:', error);
      return null;
    }
  }

  private calculateProfileCompleteness(userProfile: UserProfileWithResume): number {
    let score = 0;
    const checks = [
      userProfile.resumes && userProfile.resumes.length > 0, // 20 points
      userProfile.profile?.yearsOfExperience, // 10 points
      userProfile.profile?.currentSalary, // 10 points
      userProfile.profile?.expectedSalaryMin, // 10 points
      userProfile.profile?.skills, // 10 points
      userProfile.profile?.education, // 10 points
      userProfile.profile?.additionalInfo, // 15 points
      userProfile.profile?.achievements, // 15 points
    ];

    const weights = [20, 10, 10, 10, 10, 10, 15, 15];

    checks.forEach((check, index) => {
      if (check) score += weights[index];
    });

    return score;
  }

  private getMissingProfileElements(userProfile: UserProfileWithResume): string[] {
    const missing: string[] = [];

    if (!userProfile.resumes || userProfile.resumes.length === 0) {
      missing.push('Resume (required for personalized strategy)');
    }
    if (!userProfile.profile?.additionalInfo) {
      missing.push('Additional context about your experience');
    }
    if (!userProfile.profile?.yearsOfExperience) {
      missing.push('Years of experience');
    }
    if (!userProfile.profile?.currentSalary) {
      missing.push('Current salary (helps establish baseline)');
    }
    if (!userProfile.profile?.achievements) {
      missing.push('Key achievements');
    }

    return missing;
  }

  private buildNegotiationPrompt(
    request: NegotiationRequest,
    userProfile: UserProfileWithResume,
    ragContext: string
  ): string {
    const hasResume = userProfile.resumes && userProfile.resumes.length > 0;

    return `You are an expert salary negotiation coach with deep knowledge of compensation strategies. Generate a comprehensive negotiation strategy based on the following context.

${ragContext}

JOB DETAILS:
- Position: ${request.jobTitle} at ${request.company}
- Location: ${request.location}
- Work Mode: ${request.workMode}
- Current Offer: ${request.currentOffer ? `$${request.currentOffer.baseSalary} base` : 'Not yet provided'}
- Target Salary: ${request.targetSalary ? `$${request.targetSalary}` : 'Not specified'}
- Has Competing Offers: ${request.hasCompetingOffers ? 'Yes' : 'No'}

USER PROFILE STATUS:
- Has Resume: ${hasResume ? 'Yes' : 'No - RECOMMEND UPLOADING'}
- Has Additional Info: ${userProfile.profile?.additionalInfo ? 'Yes' : 'No'}
- Profile Completeness: ${this.calculateProfileCompleteness(userProfile)}%

REQUIRED JSON RESPONSE STRUCTURE:
{
  "readiness": {
    "score": number (0-100),
    "hasResume": boolean,
    "hasAdditionalInfo": boolean,
    "profileCompleteness": number,
    "missingElements": ["array of missing profile elements"],
    "recommendation": "string - what user should do to improve negotiation position"
  },
  "leverage": {
    "score": "low|medium|high|very_high",
    "factors": ["array of leverage factors"],
    "strengths": ["array of negotiation strengths"],
    "weaknesses": ["array of potential weaknesses"]
  },
  "strategies": [
    {
      "approach": "string - name of strategy",
      "successProbability": number (0-100),
      "script": "string - exact words to use",
      "riskLevel": "low|medium|high",
      "expectedOutcome": "string",
      "whenToUse": "string - specific scenario"
    }
  ],
  "salaryRecommendations": {
    "conservative": {
      "amount": number,
      "successRate": number (0-100),
      "rationale": "string"
    },
    "target": {
      "amount": number,
      "successRate": number (0-100),
      "rationale": "string"
    },
    "aggressive": {
      "amount": number,
      "successRate": number (0-100),
      "rationale": "string"
    }
  },
  "negotiationScript": {
    "opening": "string - opening statement",
    "keyPoints": ["array of key talking points"],
    "handlingObjections": [
      {
        "objection": "string - common objection",
        "response": "string - how to respond"
      }
    ],
    "closingStrategy": "string - how to close negotiation"
  },
  "competingOfferStrategy": {
    "howToLeverage": "string",
    "mentionTiming": "string",
    "presentationApproach": "string",
    "warnings": ["array of warnings"]
  },
  "nonMonetaryNegotiations": {
    "flexibleWork": "string - how to negotiate",
    "additionalPTO": "string",
    "signingBonus": "string",
    "titleUpgrade": "string",
    "equityIncrease": "string",
    "professionalDevelopment": "string"
  },
  "timeline": {
    "idealNegotiationWindow": "string",
    "responseTimeframe": "string",
    "decisionDeadline": "string",
    "followUpSchedule": ["array of follow-up times"]
  },
  "redFlags": ["array of warning signs"],
  "bestPractices": ["array of best practices"],
  "personalizedInsights": ["array of insights based on user's specific situation"]
}

CRITICAL REQUIREMENTS:
1. If user has no resume, emphasize uploading one for better strategy
2. Use actual market data from RAG context
3. Provide specific, actionable scripts
4. Account for user's experience level and background
5. Give realistic success probabilities
6. Include multiple negotiation approaches
7. Consider non-monetary benefits
8. Provide objection handling scripts

${!hasResume ? 'IMPORTANT: User has not uploaded resume - strategies are generic. Strongly recommend uploading resume for personalized approach.' : ''}

Return ONLY the JSON object, no additional text.`;
  }

  private parseAIResponse(aiResponse: string): NegotiationStrategy {
    try {
      const parsed = JSON.parse(aiResponse);

      // Validate required fields
      if (!parsed.readiness || !parsed.leverage || !parsed.strategies) {
        throw new Error('AI response missing critical negotiation fields');
      }

      return parsed as NegotiationStrategy;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error(`Negotiation strategy generation failed: ${error instanceof Error ? error.message : 'Invalid response format'}`);
    }
  }
}

export const aiNegotiationCoach = new AINegotiationCoachService();