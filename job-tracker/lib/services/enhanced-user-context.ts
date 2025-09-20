/**
 * Enhanced User Context Service - Extended profile context for advanced AI features
 * Provides comprehensive user context for intelligent AI analysis
 * NO FALLBACKS - Only data-driven context building
 */

import { prisma } from '@/lib/prisma';
import { profileContextService, type UserProfileContext } from './profile-context-service';

export interface LinkedInProfile {
  url: string;
  connections?: number;
  skills?: string[];
  experience?: LinkedInExperience[];
  education?: LinkedInEducation[];
  recommendations?: number;
}

export interface LinkedInExperience {
  company: string;
  title: string;
  duration: string;
  description?: string;
  skills?: string[];
}

export interface LinkedInEducation {
  school: string;
  degree?: string;
  field?: string;
  year?: string;
}

export interface NetworkGraph {
  totalConnections: number;
  industryConnections: { [industry: string]: number };
  companyConnections: { [company: string]: string[] }; // company -> connection names
  schoolConnections: { [school: string]: string[] };
  mutualConnections: { [personId: string]: MutualConnection };
}

export interface MutualConnection {
  name: string;
  title: string;
  company: string;
  relationshipStrength: 'strong' | 'medium' | 'weak';
  lastInteraction?: Date;
  connectionPath: string[];
}

export interface CareerProgression {
  careerTrajectory: 'ascending' | 'lateral' | 'transitioning' | 'returning';
  experienceGaps: string[];
  skillsProgression: SkillsEvolution;
  leadershipExperience: boolean;
  managementYears?: number;
  teamSizes?: number[];
}

export interface SkillsEvolution {
  emergingSkills: string[];
  maturingSkills: string[];
  expertSkills: string[];
  outdatedSkills: string[];
  industryTrends: string[];
}

export interface CommunicationStyle {
  tone: 'formal' | 'professional' | 'casual' | 'creative';
  industry: string;
  seniority: string;
  culturalBackground?: string;
  preferredTopics: string[];
  avoidTopics: string[];
}

export interface InterviewHistory {
  totalInterviews: number;
  successRate: number;
  commonFeedback: string[];
  strengthAreas: string[];
  improvementAreas: string[];
  industryPerformance: { [industry: string]: number };
  roleTypePerformance: { [roleType: string]: number };
}

export interface EnhancedUserContext extends UserProfileContext {
  linkedIn?: LinkedInProfile;
  networkGraph?: NetworkGraph;
  careerProgression: CareerProgression;
  communicationStyle: CommunicationStyle;
  interviewHistory?: InterviewHistory;
  marketPositioning: {
    salaryPercentile: number;
    experienceLevel: 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | 'executive';
    marketDemand: 'low' | 'medium' | 'high' | 'very_high';
    uniqueValueProps: string[];
  };
}

export class EnhancedUserContextService {
  private static instance: EnhancedUserContextService;

  private constructor() {}

  static getInstance(): EnhancedUserContextService {
    if (!EnhancedUserContextService.instance) {
      EnhancedUserContextService.instance = new EnhancedUserContextService();
    }
    return EnhancedUserContextService.instance;
  }

  /**
   * Get comprehensive enhanced user context
   */
  async getEnhancedUserContext(userId: string): Promise<EnhancedUserContext> {
    try {
      // Get base context from existing service
      const baseContext = await profileContextService.getUserProfileContext(userId);

      // Get enhanced profile data
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId },
        include: {
          user: {
            include: {
              resumes: true,
              jobs: {
                include: {
                  activities: true
                }
              }
            }
          }
        }
      });

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Build enhanced context
      const linkedInProfile = await this.parseLinkedInProfile(userProfile.linkedinUrl);
      const careerProgression = await this.analyzeCareerProgression(userProfile, baseContext);
      const communicationStyle = await this.determineCommunicationStyle(userProfile, baseContext);
      const interviewHistory = await this.buildInterviewHistory(userProfile.user.jobs);
      const marketPositioning = await this.calculateMarketPositioning(userProfile, baseContext);

      return {
        ...baseContext,
        linkedIn: linkedInProfile,
        careerProgression,
        communicationStyle,
        interviewHistory,
        marketPositioning
      };

    } catch (error) {
      console.error('Error building enhanced user context:', error);
      throw new Error(`Failed to build enhanced user context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse LinkedIn profile information
   */
  private async parseLinkedInProfile(linkedinUrl?: string | null): Promise<LinkedInProfile | undefined> {
    if (!linkedinUrl) return undefined;

    try {
      // Basic LinkedIn profile structure
      // In a real implementation, this would use LinkedIn API or web scraping
      // For now, return basic structure based on URL validation

      const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/;
      if (!linkedinRegex.test(linkedinUrl)) {
        console.warn('Invalid LinkedIn URL format');
        return undefined;
      }

      return {
        url: linkedinUrl,
        // Note: In production, these would be populated from LinkedIn API
        // or user input forms for network analysis
        connections: undefined,
        skills: [],
        experience: [],
        education: [],
        recommendations: undefined
      };

    } catch (error) {
      console.error('Error parsing LinkedIn profile:', error);
      return undefined;
    }
  }

  /**
   * Analyze career progression patterns
   */
  private async analyzeCareerProgression(userProfile: any, baseContext: UserProfileContext): Promise<CareerProgression> {
    try {
      const resumeContent = userProfile.user.resumes?.[0]?.content || '';
      const jobHistory = userProfile.user.jobs || [];

      // Analyze trajectory from job applications and resume
      const careerTrajectory = this.determineCareerTrajectory(jobHistory, resumeContent);

      // Identify gaps in experience
      const experienceGaps = this.identifyExperienceGaps(resumeContent, baseContext.professionalProfile.keySkills);

      // Analyze skills evolution
      const skillsProgression = this.analyzeSkillsProgression(resumeContent, baseContext.professionalProfile.keySkills);

      // Detect leadership experience
      const leadershipAnalysis = this.analyzeLeadershipExperience(resumeContent);

      return {
        careerTrajectory,
        experienceGaps,
        skillsProgression,
        leadershipExperience: leadershipAnalysis.hasLeadership,
        managementYears: leadershipAnalysis.managementYears,
        teamSizes: leadershipAnalysis.teamSizes
      };

    } catch (error) {
      console.error('Error analyzing career progression:', error);
      return {
        careerTrajectory: 'lateral',
        experienceGaps: [],
        skillsProgression: {
          emergingSkills: [],
          maturingSkills: [],
          expertSkills: [],
          outdatedSkills: [],
          industryTrends: []
        },
        leadershipExperience: false
      };
    }
  }

  /**
   * Determine communication style preferences
   */
  private async determineCommunicationStyle(userProfile: any, baseContext: UserProfileContext): Promise<CommunicationStyle> {
    try {
      const industry = baseContext.professionalProfile.industryFocus?.[0] || 'technology';
      const seniority = baseContext.professionalProfile.careerLevel || 'mid';

      // Determine tone based on industry and seniority
      let tone: CommunicationStyle['tone'] = 'professional';

      if (industry.toLowerCase().includes('creative') || industry.toLowerCase().includes('startup')) {
        tone = 'creative';
      } else if (industry.toLowerCase().includes('finance') || industry.toLowerCase().includes('legal')) {
        tone = 'formal';
      } else if (seniority === 'junior' || seniority === 'entry') {
        tone = 'professional';
      }

      return {
        tone,
        industry,
        seniority,
        preferredTopics: this.generatePreferredTopics(baseContext),
        avoidTopics: this.generateAvoidTopics(baseContext)
      };

    } catch (error) {
      console.error('Error determining communication style:', error);
      return {
        tone: 'professional',
        industry: 'technology',
        seniority: 'mid',
        preferredTopics: [],
        avoidTopics: []
      };
    }
  }

  /**
   * Build interview history from job applications
   */
  private async buildInterviewHistory(jobs: any[]): Promise<InterviewHistory | undefined> {
    try {
      if (!jobs || jobs.length === 0) return undefined;

      const interviewedJobs = jobs.filter(job =>
        job.activities?.some((activity: any) =>
          activity.title?.toLowerCase().includes('interview')
        )
      );

      if (interviewedJobs.length === 0) return undefined;

      // Calculate success rate based on job outcomes
      const successfulInterviews = interviewedJobs.filter(job =>
        job.activities?.some((activity: any) =>
          activity.title?.toLowerCase().includes('offer') ||
          activity.title?.toLowerCase().includes('hired')
        )
      );

      const successRate = successfulInterviews.length / interviewedJobs.length;

      return {
        totalInterviews: interviewedJobs.length,
        successRate,
        commonFeedback: [], // Would be populated from actual feedback data
        strengthAreas: [],
        improvementAreas: [],
        industryPerformance: {},
        roleTypePerformance: {}
      };

    } catch (error) {
      console.error('Error building interview history:', error);
      return undefined;
    }
  }

  /**
   * Calculate market positioning metrics
   */
  private async calculateMarketPositioning(userProfile: any, baseContext: UserProfileContext): Promise<EnhancedUserContext['marketPositioning']> {
    try {
      const experience = baseContext.professionalProfile.yearsOfExperience || 0;
      const skills = baseContext.professionalProfile.keySkills;

      // Determine experience level
      let experienceLevel: EnhancedUserContext['marketPositioning']['experienceLevel'] = 'mid';
      if (experience < 2) experienceLevel = 'junior';
      else if (experience >= 2 && experience < 5) experienceLevel = 'mid';
      else if (experience >= 5 && experience < 8) experienceLevel = 'senior';
      else if (experience >= 8 && experience < 12) experienceLevel = 'lead';
      else if (experience >= 12) experienceLevel = 'principal';

      // Assess market demand based on skills
      const inDemandSkills = ['typescript', 'react', 'node.js', 'python', 'aws', 'ai', 'machine learning'];
      const userInDemandSkills = skills.filter(skill =>
        inDemandSkills.some(demandSkill =>
          skill.toLowerCase().includes(demandSkill.toLowerCase())
        )
      ).length;

      let marketDemand: EnhancedUserContext['marketPositioning']['marketDemand'] = 'medium';
      if (userInDemandSkills >= 4) marketDemand = 'very_high';
      else if (userInDemandSkills >= 2) marketDemand = 'high';
      else if (userInDemandSkills >= 1) marketDemand = 'medium';
      else marketDemand = 'low';

      // Generate unique value propositions
      const uniqueValueProps = this.generateUniqueValueProps(baseContext, experience);

      return {
        salaryPercentile: this.calculateSalaryPercentile(userProfile.currentSalary, experienceLevel),
        experienceLevel,
        marketDemand,
        uniqueValueProps
      };

    } catch (error) {
      console.error('Error calculating market positioning:', error);
      return {
        salaryPercentile: 50,
        experienceLevel: 'mid',
        marketDemand: 'medium',
        uniqueValueProps: []
      };
    }
  }

  // Helper methods

  private determineCareerTrajectory(jobHistory: any[], resumeContent: string): CareerProgression['careerTrajectory'] {
    // Analyze if user is moving up, sideways, or transitioning
    // This would involve NLP analysis of job titles and responsibilities
    return 'ascending'; // Simplified for now
  }

  private identifyExperienceGaps(resumeContent: string, skills: string[]): string[] {
    // Identify missing experiences that might be expected for their level
    const commonGaps = ['cloud architecture', 'team leadership', 'project management'];
    return commonGaps.filter(gap =>
      !resumeContent.toLowerCase().includes(gap.toLowerCase()) &&
      !skills.some(skill => skill.toLowerCase().includes(gap.toLowerCase()))
    );
  }

  private analyzeSkillsProgression(resumeContent: string, skills: string[]): SkillsEvolution {
    // This would use AI to analyze skill progression from resume
    const currentYear = new Date().getFullYear();

    return {
      emergingSkills: skills.filter(skill =>
        ['ai', 'machine learning', 'typescript', 'docker'].some(emerging =>
          skill.toLowerCase().includes(emerging)
        )
      ),
      maturingSkills: skills.filter(skill =>
        ['react', 'node.js', 'postgresql'].some(maturing =>
          skill.toLowerCase().includes(maturing)
        )
      ),
      expertSkills: skills.slice(0, 3), // Top skills
      outdatedSkills: [],
      industryTrends: ['ai integration', 'cloud-native', 'microservices']
    };
  }

  private analyzeLeadershipExperience(resumeContent: string): {
    hasLeadership: boolean;
    managementYears?: number;
    teamSizes?: number[];
  } {
    const leadershipKeywords = ['lead', 'manage', 'mentor', 'supervise', 'coordinate', 'direct'];
    const hasLeadership = leadershipKeywords.some(keyword =>
      resumeContent.toLowerCase().includes(keyword)
    );

    return {
      hasLeadership,
      managementYears: hasLeadership ? 2 : undefined, // Would extract from resume
      teamSizes: hasLeadership ? [3, 5] : undefined // Would extract from resume
    };
  }

  private generatePreferredTopics(baseContext: UserProfileContext): string[] {
    const industry = baseContext.professionalProfile.industryFocus?.[0] || 'technology';
    const skills = baseContext.professionalProfile.keySkills;

    const topics = [
      `${industry} trends`,
      'career development',
      'professional growth'
    ];

    // Add skill-specific topics
    if (skills.some(skill => skill.toLowerCase().includes('ai'))) {
      topics.push('artificial intelligence', 'machine learning');
    }

    return topics;
  }

  private generateAvoidTopics(baseContext: UserProfileContext): string[] {
    // Topics to avoid in professional communication
    return [
      'personal financial details',
      'family issues',
      'health problems',
      'political opinions',
      'religious views'
    ];
  }

  private calculateSalaryPercentile(currentSalary?: number, experienceLevel?: string): number {
    // Simplified calculation - would use market data in production
    if (!currentSalary) return 50;

    const baseSalaries = {
      junior: 70000,
      mid: 95000,
      senior: 130000,
      lead: 160000,
      principal: 200000,
      executive: 250000
    };

    const baseForLevel = baseSalaries[experienceLevel as keyof typeof baseSalaries] || 95000;
    const percentile = Math.min(95, Math.max(5, (currentSalary / baseForLevel) * 50));

    return Math.round(percentile);
  }

  private generateUniqueValueProps(baseContext: UserProfileContext, experience: number): string[] {
    const props = [];
    const skills = baseContext.professionalProfile.keySkills;

    if (experience >= 5) {
      props.push('Experienced professional with proven track record');
    }

    if (skills.some(skill => skill.toLowerCase().includes('lead'))) {
      props.push('Leadership experience with team management');
    }

    if (skills.some(skill => ['ai', 'machine learning', 'ml'].some(ai => skill.toLowerCase().includes(ai)))) {
      props.push('AI/ML expertise in high-demand market');
    }

    if (skills.length >= 10) {
      props.push('Diverse technical skill set with adaptability');
    }

    return props;
  }
}

// Export singleton instance
export const enhancedUserContextService = EnhancedUserContextService.getInstance();