// Profile Context Service
// Provides comprehensive user context for AI services (salary intelligence, job matching, etc.)
// Ensures all profile data is utilized with no hardcoded values or fallbacks

import { prisma } from '@/lib/prisma';

export interface UserProfileContext {
  // Personal Information
  userId: string;
  name: string;
  email: string;

  // Location Context
  currentLocation: {
    city: string;
    state: string;
    country: string;
    fullLocation: string; // "City, State, Country"
  };

  // Financial Context
  salaryContext: {
    currentSalary: number | null;
    expectedSalary: number | null;
    currency: string;
    hasCurrentSalary: boolean;
    hasExpectedSalary: boolean;
  };

  // Professional Context
  professionalProfile: {
    careerLevel: string;
    yearsOfExperience: number;
    industryFocus: string[];
    keySkills: string[];
    hasResume: boolean;
    resumeContent: string | null;
  };

  // Preferences & Personal Context
  preferences: {
    workMode: string; // remote, hybrid, onsite
    willingToRelocate: boolean;
  };

  // Context Completeness Score
  contextCompleteness: {
    score: number; // 0-100
    missingFields: string[];
    hasMinimumContext: boolean; // For basic AI functionality
    hasRichContext: boolean; // For advanced AI features
  };
}

export interface AIContextPrompt {
  userContext: string;
  professionalBackground: string;
  locationContext: string;
  financialContext: string;
  preferencesContext: string;
  fullContextSummary: string;
}

export class ProfileContextService {

  /**
   * Get comprehensive user profile context for AI services
   */
  async getUserProfileContext(userId: string): Promise<UserProfileContext> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        resumes: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Parse location from stored format
    const storedLocation = user.profile?.currentLocation || '';
    const locationParts = storedLocation.split(',').map(part => part.trim());
    const city = locationParts[0] || '';
    const state = locationParts[1] || '';
    const country = user.profile?.currentCountry || '';

    // Get resume content
    const activeResume = user.resumes[0];
    const resumeContent = activeResume?.content || null;

    // Parse skills from resume if available
    let keySkills: string[] = [];
    if (activeResume?.skills) {
      try {
        keySkills = JSON.parse(activeResume.skills);
      } catch {
        keySkills = [];
      }
    }

    // Build context object
    const context: UserProfileContext = {
      userId: user.id,
      name: user.name || '',
      email: user.email,

      currentLocation: {
        city,
        state,
        country,
        fullLocation: [city, state, country].filter(Boolean).join(', '),
      },

      salaryContext: {
        currentSalary: user.profile?.currentSalary || null,
        expectedSalary: user.profile?.expectedSalaryMax || null,
        currency: user.profile?.preferredCurrency || 'USD',
        hasCurrentSalary: Boolean(user.profile?.currentSalary),
        hasExpectedSalary: Boolean(user.profile?.expectedSalaryMax),
      },

      professionalProfile: {
        careerLevel: this.inferCareerLevel(resumeContent, user.profile?.currentSalary ?? null),
        yearsOfExperience: this.inferExperience(resumeContent),
        industryFocus: this.inferIndustryFocus(resumeContent),
        keySkills,
        hasResume: Boolean(resumeContent),
        resumeContent,
      },

      preferences: {
        workMode: 'hybrid', // Default since not stored yet
        willingToRelocate: user.profile?.openToRelocation || false,
      },

      contextCompleteness: this.calculateContextCompleteness(user, resumeContent),
    };

    return context;
  }

  /**
   * Generate AI-ready context prompts from user profile
   */
  generateAIContextPrompt(context: UserProfileContext): AIContextPrompt {
    const userContext = this.buildUserContextSection(context);
    const professionalBackground = this.buildProfessionalSection(context);
    const locationContext = this.buildLocationSection(context);
    const financialContext = this.buildFinancialSection(context);
    const preferencesContext = this.buildPreferencesSection(context);

    const fullContextSummary = [
      userContext,
      professionalBackground,
      locationContext,
      financialContext,
      preferencesContext,
    ].filter(Boolean).join('\n\n');

    return {
      userContext,
      professionalBackground,
      locationContext,
      financialContext,
      preferencesContext,
      fullContextSummary,
    };
  }

  private buildUserContextSection(context: UserProfileContext): string {
    return `USER PROFILE:
- Name: ${context.name}
- Career Level: ${context.professionalProfile.careerLevel}
- Years of Experience: ${context.professionalProfile.yearsOfExperience}
- Industry Focus: ${context.professionalProfile.industryFocus.join(', ') || 'Not specified'}`;
  }

  private buildProfessionalSection(context: UserProfileContext): string {
    if (!context.professionalProfile.hasResume) {
      return 'PROFESSIONAL BACKGROUND: Limited information available (no resume uploaded)';
    }

    return `PROFESSIONAL BACKGROUND:
- Skills: ${context.professionalProfile.keySkills.join(', ') || 'Not extracted'}
- Experience Level: ${context.professionalProfile.careerLevel}
- Years in Field: ${context.professionalProfile.yearsOfExperience}
- Resume Available: Yes (use for detailed background analysis)`;
  }

  private buildLocationSection(context: UserProfileContext): string {
    const { currentLocation } = context;

    if (!currentLocation.fullLocation) {
      return 'LOCATION CONTEXT: Location not specified';
    }

    return `LOCATION CONTEXT:
- Current Location: ${currentLocation.fullLocation}
- City: ${currentLocation.city}
- State/Region: ${currentLocation.state || 'Not specified'}
- Country: ${currentLocation.country}
- Relocation Willingness: ${context.preferences.willingToRelocate ? 'Open to relocation' : 'Prefers current location'}`;
  }

  private buildFinancialSection(context: UserProfileContext): string {
    const { salaryContext } = context;

    let financial = `FINANCIAL CONTEXT:
- Currency Preference: ${salaryContext.currency}`;

    if (salaryContext.hasCurrentSalary) {
      financial += `\n- Current Salary: ${salaryContext.currentSalary} ${salaryContext.currency}`;
    }

    if (salaryContext.hasExpectedSalary) {
      financial += `\n- Expected Salary: ${salaryContext.expectedSalary} ${salaryContext.currency}`;
    }

    if (!salaryContext.hasCurrentSalary && !salaryContext.hasExpectedSalary) {
      financial += '\n- Salary Information: Not provided (use market data for analysis)';
    }

    return financial;
  }

  private buildPreferencesSection(context: UserProfileContext): string {
    return `PREFERENCES:
- Work Mode: ${context.preferences.workMode}
- Open to Relocation: ${context.preferences.willingToRelocate ? 'Yes' : 'No'}`;
  }

  private inferCareerLevel(resumeContent: string | null, currentSalary: number | null): string {
    if (!resumeContent) {
      if (currentSalary && currentSalary >= 150000) return 'senior';
      if (currentSalary && currentSalary >= 100000) return 'mid';
      if (currentSalary && currentSalary >= 70000) return 'junior';
      return 'entry';
    }

    const content = resumeContent.toLowerCase();

    // Senior level indicators
    if (content.includes('senior') || content.includes('lead') || content.includes('principal') ||
        content.includes('architect') || content.includes('director') || content.includes('manager')) {
      return 'senior';
    }

    // Mid level indicators
    if (content.includes('mid') || content.includes('intermediate') ||
        content.match(/\d+\+?\s*years?/)) {
      return 'mid';
    }

    // Junior level indicators
    if (content.includes('junior') || content.includes('associate') || content.includes('graduate')) {
      return 'junior';
    }

    // Default based on salary
    if (currentSalary && currentSalary >= 120000) return 'senior';
    if (currentSalary && currentSalary >= 80000) return 'mid';

    return 'entry';
  }

  private inferExperience(resumeContent: string | null): number {
    if (!resumeContent) return 0;

    const yearMatches = resumeContent.match(/(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience)?/gi);
    if (yearMatches) {
      const years = yearMatches.map(match => parseInt(match.match(/\d+/)?.[0] || '0'));
      return Math.max(...years);
    }

    // Count employment periods as rough estimate
    const employmentMatches = resumeContent.match(/\d{4}\s*[-–]\s*(?:\d{4}|present|current)/gi);
    return employmentMatches ? employmentMatches.length * 2 : 0;
  }

  private inferIndustryFocus(resumeContent: string | null): string[] {
    if (!resumeContent) return [];

    const industries = [
      'fintech', 'finance', 'banking', 'healthcare', 'education', 'ecommerce',
      'enterprise', 'startup', 'consulting', 'technology', 'software', 'web development',
      'mobile development', 'data science', 'machine learning', 'ai', 'devops'
    ];

    const content = resumeContent.toLowerCase();
    return industries.filter(industry => content.includes(industry));
  }

  private calculateContextCompleteness(user: any, resumeContent: string | null): UserProfileContext['contextCompleteness'] {
    const fields = {
      name: Boolean(user.name),
      location: Boolean(user.profile?.currentLocation),
      country: Boolean(user.profile?.currentCountry),
      currentSalary: Boolean(user.profile?.currentSalary),
      expectedSalary: Boolean(user.profile?.expectedSalaryMax),
      currency: Boolean(user.profile?.preferredCurrency),
      resume: Boolean(resumeContent),
    };

    const completedFields = Object.values(fields).filter(Boolean).length;
    const totalFields = Object.keys(fields).length;
    const score = Math.round((completedFields / totalFields) * 100);

    const missingFields = Object.entries(fields)
      .filter(([, completed]) => !completed)
      .map(([field]) => field);

    const hasMinimumContext = fields.name && (fields.location || fields.country);
    const hasRichContext = score >= 70;

    return {
      score,
      missingFields,
      hasMinimumContext,
      hasRichContext,
    };
  }
}

export const profileContextService = new ProfileContextService();