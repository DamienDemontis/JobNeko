/**
 * Resume Matching Service
 * Provides real, consistent resume-to-job matching with actionable feedback
 */

import { unifiedAI } from './unified-ai-service';
import { skillsGapAnalysis, type SkillsAnalysisResult } from './skills-gap-analysis';

export interface ResumeMatchResult {
  overallMatch: {
    percentage: number;
    confidence: number;
    level: 'excellent' | 'good' | 'fair' | 'poor';
  };

  matchBreakdown: {
    skills: MatchSection;
    experience: MatchSection;
    education: MatchSection;
    achievements: MatchSection;
    keywords: MatchSection;
  };

  missingElements: {
    criticalGaps: MissingElement[];
    importantGaps: MissingElement[];
    suggestedImprovements: MissingElement[];
  };

  strengthsHighlights: {
    topStrengths: Strength[];
    uniqueAdvantages: Strength[];
    competitiveEdge: string[];
  };

  improvementPlan: {
    quickWins: ImprovementAction[];      // Can be done immediately
    shortTerm: ImprovementAction[];      // 1-4 weeks
    longTerm: ImprovementAction[];       // 1-6 months
  };

  atsCompatibility: {
    score: number; // 0-100
    issues: ATSIssue[];
    recommendations: string[];
  };

  tailoringRecommendations: {
    keywordsToAdd: string[];
    sectionsToEmphasize: string[];
    phrasesToInclude: string[];
    metricsToHighlight: string[];
  };
}

export interface MatchSection {
  score: number; // 0-100
  weight: number; // How important this section is
  details: string;
  matchedItems: string[];
  missingItems: string[];
}

export interface MissingElement {
  element: string;
  importance: 'critical' | 'important' | 'nice_to_have';
  category: 'skill' | 'experience' | 'education' | 'keyword' | 'achievement';
  impact: string;
  howToAddress: string;
  timeToFix: 'immediate' | 'short_term' | 'long_term';
}

export interface Strength {
  element: string;
  category: 'skill' | 'experience' | 'achievement' | 'education';
  advantage: string;
  howToLeverage: string;
}

export interface ImprovementAction {
  action: string;
  category: 'content' | 'formatting' | 'keywords' | 'structure';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  specificSteps: string[];
  expectedImprovement: number; // percentage points
}

export interface ATSIssue {
  issue: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  solution: string;
}

export class ResumeMatchingService {

  /**
   * Perform comprehensive resume matching analysis
   */
  async analyzeResumeMatch(
    resumeContent: string,
    jobTitle: string,
    company: string,
    jobDescription: string,
    jobRequirements: string,
    preExtractedSkills?: any[] // NEW: Pre-extracted skills from database
  ): Promise<ResumeMatchResult> {

    console.log('📄 Starting comprehensive resume matching analysis...');

    try {
      // Step 1: Get skills gap analysis first (with optional pre-extracted skills)
      const skillsAnalysis = await skillsGapAnalysis.analyzeSkillsGap(
        resumeContent,
        jobTitle,
        jobDescription,
        jobRequirements,
        undefined, // currentSalary
        preExtractedSkills // Pass cached skills
      );

      // Step 2: Extract detailed resume and job components
      const resumeComponents = await this.extractResumeComponents(resumeContent);
      const jobComponents = await this.extractJobComponents(
        jobTitle,
        company,
        jobDescription,
        jobRequirements
      );

      // Step 3: Calculate match breakdown
      const matchBreakdown = await this.calculateMatchBreakdown(
        resumeComponents,
        jobComponents,
        skillsAnalysis
      );

      // Step 4: Calculate overall match
      const overallMatch = this.calculateOverallMatch(matchBreakdown);

      // Step 5: Identify missing elements
      const missingElements = await this.identifyMissingElements(
        resumeComponents,
        jobComponents,
        skillsAnalysis
      );

      // Step 6: Highlight strengths
      const strengthsHighlights = await this.identifyStrengths(
        resumeComponents,
        jobComponents,
        skillsAnalysis
      );

      // Step 7: Create improvement plan
      const improvementPlan = await this.createImprovementPlan(
        missingElements,
        matchBreakdown,
        overallMatch.percentage
      );

      // Step 8: Check ATS compatibility
      const atsCompatibility = await this.checkATSCompatibility(
        resumeContent,
        jobComponents
      );

      // Step 9: Generate tailoring recommendations
      const tailoringRecommendations = await this.generateTailoringRecommendations(
        resumeComponents,
        jobComponents,
        missingElements
      );

      return {
        overallMatch,
        matchBreakdown,
        missingElements,
        strengthsHighlights,
        improvementPlan,
        atsCompatibility,
        tailoringRecommendations
      };

    } catch (error) {
      console.error('Resume matching analysis failed:', error);
      throw new Error('Failed to analyze resume match');
    }
  }

  /**
   * Extract structured components from resume
   */
  private async extractResumeComponents(resumeContent: string): Promise<any> {
    const prompt = `Analyze this resume and extract structured information:

Resume:
${resumeContent}

Extract and return JSON with:
{
  "personalInfo": {
    "name": "string",
    "title": "string",
    "yearsOfExperience": number
  },
  "skills": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"],
    "tools": ["tool1", "tool2"],
    "languages": ["lang1", "lang2"]
  },
  "experience": [
    {
      "company": "string",
      "role": "string",
      "duration": "string",
      "achievements": ["achievement1", "achievement2"],
      "technologies": ["tech1", "tech2"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "year": "string"
    }
  ],
  "certifications": ["cert1", "cert2"],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "keywords": ["keyword1", "keyword2"]
}`;

    try {
      const response = await unifiedAI.process({
      operation: 'general_completion',
      content: prompt
    });
      if (!response || !(typeof response.data === 'string' ? response.data : JSON.stringify(response.data))) {
        throw new Error('Failed to get valid response from AI service');
      }

      const cleanedContent = this.cleanJsonResponse((typeof response.data === 'string' ? response.data : JSON.stringify(response.data)));
      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error('Failed to extract resume components:', error);
      return { skills: { technical: [], soft: [], tools: [], languages: [] } };
    }
  }

  /**
   * Extract structured components from job posting
   */
  private async extractJobComponents(
    jobTitle: string,
    company: string,
    description: string,
    requirements: string
  ): Promise<any> {

    const jobContent = `
Job Title: ${jobTitle}
Company: ${company}

Description:
${description}

Requirements:
${requirements}
    `;

    const prompt = `Analyze this job posting and extract structured requirements:

Job Posting:
${jobContent}

Extract and return JSON with:
{
  "basicInfo": {
    "title": "${jobTitle}",
    "company": "${company}",
    "seniority": "entry|junior|mid|senior|lead|principal",
    "workType": "remote|hybrid|onsite|flexible"
  },
  "requiredSkills": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"],
    "tools": ["tool1", "tool2"],
    "languages": ["lang1", "lang2"]
  },
  "preferredSkills": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"],
    "tools": ["tool1", "tool2"]
  },
  "experience": {
    "minimumYears": number,
    "preferredYears": number,
    "specificExperience": ["exp1", "exp2"]
  },
  "education": {
    "required": "string",
    "preferred": "string",
    "alternatives": ["alt1", "alt2"]
  },
  "responsibilities": ["resp1", "resp2"],
  "keywords": ["keyword1", "keyword2"],
  "mustHaveQualifications": ["qual1", "qual2"],
  "niceToHaveQualifications": ["qual1", "qual2"]
}`;

    try {
      const response = await unifiedAI.process({
      operation: 'general_completion',
      content: prompt
    });
      if (!response || !(typeof response.data === 'string' ? response.data : JSON.stringify(response.data))) {
        throw new Error('Failed to get valid response from AI service');
      }

      const cleanedContent = this.cleanJsonResponse((typeof response.data === 'string' ? response.data : JSON.stringify(response.data)));
      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error('Failed to extract job components:', error);
      return { requiredSkills: { technical: [], soft: [], tools: [], languages: [] } };
    }
  }

  /**
   * Clean AI response to extract JSON from markdown code blocks
   */
  private cleanJsonResponse(content: string): string {
    // Remove markdown code block syntax if present
    let cleaned = content.trim();

    // Remove ```json and ``` if present
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '');
    }
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '');
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.replace(/\s*```$/, '');
    }

    // Find the first [ or { and last ] or } to extract just the JSON part
    const firstBrace = Math.min(
      cleaned.indexOf('[') !== -1 ? cleaned.indexOf('[') : Infinity,
      cleaned.indexOf('{') !== -1 ? cleaned.indexOf('{') : Infinity
    );

    if (firstBrace !== Infinity) {
      cleaned = cleaned.substring(firstBrace);

      // Find the matching closing brace/bracket
      let depth = 0;
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '[' || char === '{') {
            depth++;
          } else if (char === ']' || char === '}') {
            depth--;
            if (depth === 0) {
              cleaned = cleaned.substring(0, i + 1);
              break;
            }
          }
        }
      }
    }

    return cleaned.trim();
  }

  /**
   * Calculate detailed match breakdown
   */
  private async calculateMatchBreakdown(
    resumeComponents: any,
    jobComponents: any,
    skillsAnalysis: SkillsAnalysisResult
  ): Promise<ResumeMatchResult['matchBreakdown']> {

    // Skills matching (30% weight)
    const skillsScore = skillsAnalysis.overallMatch.percentage;
    const skillsMatched = skillsAnalysis.matchingSkills.map(s => s.name);
    const skillsMissing = skillsAnalysis.skillGaps.map(g => g.skill.name);

    // Experience matching (25% weight)
    const experienceScore = this.calculateExperienceMatch(
      resumeComponents,
      jobComponents
    );

    // Education matching (15% weight)
    const educationScore = this.calculateEducationMatch(
      resumeComponents,
      jobComponents
    );

    // Achievements matching (20% weight)
    const achievementsScore = this.calculateAchievementsMatch(
      resumeComponents,
      jobComponents
    );

    // Keywords matching (10% weight)
    const keywordsScore = this.calculateKeywordsMatch(
      resumeComponents,
      jobComponents
    );

    return {
      skills: {
        score: skillsScore,
        weight: 30,
        details: `${skillsMatched.length} of ${skillsMatched.length + skillsMissing.length} required skills matched`,
        matchedItems: skillsMatched,
        missingItems: skillsMissing
      },
      experience: {
        score: experienceScore.score,
        weight: 25,
        details: experienceScore.details,
        matchedItems: experienceScore.matched,
        missingItems: experienceScore.missing
      },
      education: {
        score: educationScore.score,
        weight: 15,
        details: educationScore.details,
        matchedItems: educationScore.matched,
        missingItems: educationScore.missing
      },
      achievements: {
        score: achievementsScore.score,
        weight: 20,
        details: achievementsScore.details,
        matchedItems: achievementsScore.matched,
        missingItems: achievementsScore.missing
      },
      keywords: {
        score: keywordsScore.score,
        weight: 10,
        details: keywordsScore.details,
        matchedItems: keywordsScore.matched,
        missingItems: keywordsScore.missing
      }
    };
  }

  /**
   * Calculate experience match
   */
  private calculateExperienceMatch(resumeComponents: any, jobComponents: any): any {
    const resumeYears = resumeComponents.personalInfo?.yearsOfExperience || 0;
    const requiredYears = jobComponents.experience?.minimumYears || 0;
    const preferredYears = jobComponents.experience?.preferredYears || requiredYears;

    let score = 0;
    if (resumeYears >= preferredYears) {
      score = 100;
    } else if (resumeYears >= requiredYears) {
      score = 70 + ((resumeYears - requiredYears) / (preferredYears - requiredYears)) * 30;
    } else {
      score = Math.max(0, (resumeYears / requiredYears) * 70);
    }

    const matched = resumeYears >= requiredYears ? [`${resumeYears} years of experience`] : [];
    const missing = resumeYears < requiredYears ? [`Need ${requiredYears - resumeYears} more years`] : [];

    return {
      score: Math.round(score),
      details: `${resumeYears} years vs ${requiredYears} required`,
      matched,
      missing
    };
  }

  /**
   * Calculate education match
   */
  private calculateEducationMatch(resumeComponents: any, jobComponents: any): any {
    const userEducation = resumeComponents.education || [];
    const requiredEducation = jobComponents.education?.required || '';

    if (!requiredEducation || requiredEducation.toLowerCase().includes('equivalent')) {
      return {
        score: 90, // High score if education is flexible
        details: 'Education requirements are flexible',
        matched: ['Flexible requirements'],
        missing: []
      };
    }

    const hasRelevantDegree = userEducation.some((edu: any) =>
      edu.field && requiredEducation.toLowerCase().includes(edu.field.toLowerCase())
    );

    const hasAnyDegree = userEducation.length > 0;

    let score = 0;
    if (hasRelevantDegree) score = 100;
    else if (hasAnyDegree) score = 70;
    else score = 30; // Experience can compensate

    return {
      score,
      details: hasRelevantDegree ? 'Relevant degree found' :
               hasAnyDegree ? 'Degree in different field' : 'No degree listed',
      matched: hasRelevantDegree ? ['Relevant degree'] : hasAnyDegree ? ['Some degree'] : [],
      missing: !hasRelevantDegree ? ['Relevant degree'] : []
    };
  }

  /**
   * Calculate achievements match
   */
  private calculateAchievementsMatch(resumeComponents: any, jobComponents: any): any {
    const achievements = resumeComponents.experience?.flatMap((exp: any) => exp.achievements || []) || [];
    const responsibilities = jobComponents.responsibilities || [];

    const relevantAchievements = achievements.filter((achievement: string) =>
      responsibilities.some((resp: string) =>
        this.textSimilarity(achievement, resp) > 0.3
      )
    );

    const score = achievements.length > 0 ?
      Math.min(100, (relevantAchievements.length / Math.max(responsibilities.length, 1)) * 100 + 40) :
      40;

    return {
      score: Math.round(score),
      details: `${relevantAchievements.length} relevant achievements found`,
      matched: relevantAchievements,
      missing: achievements.length === 0 ? ['Quantified achievements'] : []
    };
  }

  /**
   * Calculate keywords match
   */
  private calculateKeywordsMatch(resumeComponents: any, jobComponents: any): any {
    const resumeKeywords = (resumeComponents.keywords || []).map((k: string) => k.toLowerCase());
    const jobKeywords = (jobComponents.keywords || []).map((k: string) => k.toLowerCase());

    const matchedKeywords = resumeKeywords.filter((keyword: string) =>
      jobKeywords.some((jobKeyword: string) =>
        keyword.includes(jobKeyword) || jobKeyword.includes(keyword)
      )
    );

    const score = jobKeywords.length > 0 ?
      (matchedKeywords.length / jobKeywords.length) * 100 :
      80;

    return {
      score: Math.round(score),
      details: `${matchedKeywords.length} of ${jobKeywords.length} keywords matched`,
      matched: matchedKeywords,
      missing: jobKeywords.filter((k: string) => !matchedKeywords.includes(k))
    };
  }

  /**
   * Calculate overall match score
   */
  private calculateOverallMatch(
    breakdown: ResumeMatchResult['matchBreakdown']
  ): ResumeMatchResult['overallMatch'] {

    const weightedScore =
      (breakdown.skills.score * breakdown.skills.weight +
       breakdown.experience.score * breakdown.experience.weight +
       breakdown.education.score * breakdown.education.weight +
       breakdown.achievements.score * breakdown.achievements.weight +
       breakdown.keywords.score * breakdown.keywords.weight) / 100;

    const percentage = Math.round(weightedScore);

    let level: 'excellent' | 'good' | 'fair' | 'poor';
    if (percentage >= 85) level = 'excellent';
    else if (percentage >= 70) level = 'good';
    else if (percentage >= 55) level = 'fair';
    else level = 'poor';

    const confidence = Math.min(0.95, 0.6 + (percentage / 200));

    return {
      percentage,
      confidence,
      level
    };
  }

  /**
   * Identify missing elements
   */
  private async identifyMissingElements(
    resumeComponents: any,
    jobComponents: any,
    skillsAnalysis: SkillsAnalysisResult
  ): Promise<ResumeMatchResult['missingElements']> {

    const criticalGaps: MissingElement[] = [];
    const importantGaps: MissingElement[] = [];
    const suggestedImprovements: MissingElement[] = [];

    // Add critical skill gaps
    for (const gap of skillsAnalysis.skillGaps.filter(g => g.priority === 'critical')) {
      criticalGaps.push({
        element: gap.skill.name,
        importance: 'critical',
        category: 'skill',
        impact: `Could increase salary by ${gap.salaryImpact.percentage}%`,
        howToAddress: `Learn through ${gap.learningPath.resources[0]?.type || 'online courses'}`,
        timeToFix: gap.learningPath.timeToLearn.includes('week') ? 'short_term' : 'long_term'
      });
    }

    // Add important skill gaps
    for (const gap of skillsAnalysis.skillGaps.filter(g => g.priority === 'important')) {
      importantGaps.push({
        element: gap.skill.name,
        importance: 'important',
        category: 'skill',
        impact: `Could increase salary by ${gap.salaryImpact.percentage}%`,
        howToAddress: `Learn through ${gap.learningPath.resources[0]?.type || 'online courses'}`,
        timeToFix: gap.learningPath.timeToLearn.includes('week') ? 'short_term' : 'long_term'
      });
    }

    // Add other improvements
    if (!resumeComponents.certifications || resumeComponents.certifications.length === 0) {
      suggestedImprovements.push({
        element: 'Professional certifications',
        importance: 'nice_to_have',
        category: 'education',
        impact: 'Demonstrates commitment to professional development',
        howToAddress: 'Obtain relevant industry certifications',
        timeToFix: 'long_term'
      });
    }

    return {
      criticalGaps,
      importantGaps,
      suggestedImprovements
    };
  }

  /**
   * Identify strengths and advantages
   */
  private async identifyStrengths(
    resumeComponents: any,
    jobComponents: any,
    skillsAnalysis: SkillsAnalysisResult
  ): Promise<ResumeMatchResult['strengthsHighlights']> {

    const topStrengths: Strength[] = [];
    const uniqueAdvantages: Strength[] = [];
    const competitiveEdge: string[] = [];

    // Add top matching skills as strengths
    for (const skill of skillsAnalysis.matchingSkills.slice(0, 3)) {
      topStrengths.push({
        element: skill.name,
        category: 'skill',
        advantage: `Strong match for required ${skill.category} skill`,
        howToLeverage: 'Highlight this prominently in your application'
      });
    }

    // Check for unique advantages
    const userSkills = resumeComponents.skills?.technical || [];
    const requiredSkills = jobComponents.requiredSkills?.technical || [];

    for (const skill of userSkills) {
      if (!requiredSkills.includes(skill)) {
        uniqueAdvantages.push({
          element: skill,
          category: 'skill',
          advantage: 'Additional valuable skill not explicitly required',
          howToLeverage: 'Mention how this adds extra value to the role'
        });
      }
    }

    // Add competitive edge factors (as proper objects, not strings)
    if (resumeComponents.personalInfo?.yearsOfExperience > jobComponents.experience?.preferredYears) {
      topStrengths.push({
        element: `${resumeComponents.personalInfo.yearsOfExperience} years experience`,
        category: 'experience',
        advantage: 'Exceeds preferred experience requirements',
        howToLeverage: 'Emphasize your extensive experience in cover letter'
      });
    }

    if (resumeComponents.certifications?.length > 0) {
      topStrengths.push({
        element: resumeComponents.certifications[0],
        category: 'education',
        advantage: 'Professional certifications demonstrate expertise',
        howToLeverage: 'List prominently in certifications section'
      });
    }

    // Add education strengths
    if (resumeComponents.education?.length > 0) {
      const edu = resumeComponents.education[0];
      if (edu.degree) {
        topStrengths.push({
          element: `${edu.degree}${edu.field ? ` in ${edu.field}` : ''}`,
          category: 'education',
          advantage: 'Relevant educational background',
          howToLeverage: 'Mention in summary section'
        });
      }
    }

    // Add soft skills/achievements if available
    if (resumeComponents.achievements?.length > 0) {
      const achievement = resumeComponents.achievements[0];
      topStrengths.push({
        element: achievement,
        category: 'achievements',
        advantage: 'Demonstrated track record of success',
        howToLeverage: 'Use in behavioral interview examples'
      });
    }

    return {
      topStrengths,
      uniqueAdvantages: uniqueAdvantages.slice(0, 3),
      competitiveEdge: [] // Remove string array, all items are now in topStrengths as objects
    };
  }

  /**
   * Create improvement plan
   */
  private async createImprovementPlan(
    missingElements: ResumeMatchResult['missingElements'],
    matchBreakdown: ResumeMatchResult['matchBreakdown'],
    currentScore: number
  ): Promise<ResumeMatchResult['improvementPlan']> {

    const quickWins: ImprovementAction[] = [];
    const shortTerm: ImprovementAction[] = [];
    const longTerm: ImprovementAction[] = [];

    // Quick wins (immediate improvements)
    if (matchBreakdown.keywords.score < 80) {
      quickWins.push({
        action: 'Add missing keywords to resume',
        category: 'keywords',
        effort: 'low',
        impact: 'medium',
        specificSteps: [
          'Review job posting for key terms',
          'Naturally incorporate missing keywords',
          'Update skills and experience sections'
        ],
        expectedImprovement: 5
      });
    }

    // Short term improvements
    for (const gap of missingElements.criticalGaps.filter(g => g.timeToFix === 'short_term')) {
      shortTerm.push({
        action: `Learn ${gap.element}`,
        category: 'content',
        effort: 'medium',
        impact: 'high',
        specificSteps: [
          'Find relevant online course or tutorial',
          'Complete basic certification if available',
          'Add to resume with proficiency level'
        ],
        expectedImprovement: 10
      });
    }

    // Long term improvements
    for (const gap of missingElements.criticalGaps.filter(g => g.timeToFix === 'long_term')) {
      longTerm.push({
        action: `Develop expertise in ${gap.element}`,
        category: 'content',
        effort: 'high',
        impact: 'high',
        specificSteps: [
          'Enroll in comprehensive course or bootcamp',
          'Complete relevant projects',
          'Obtain professional certification',
          'Gain hands-on experience'
        ],
        expectedImprovement: 15
      });
    }

    return {
      quickWins,
      shortTerm,
      longTerm
    };
  }

  /**
   * Check ATS compatibility
   */
  private async checkATSCompatibility(
    resumeContent: string,
    jobComponents: any
  ): Promise<ResumeMatchResult['atsCompatibility']> {

    const issues: ATSIssue[] = [];
    let score = 100;

    // Check for common ATS issues
    if (resumeContent.includes('│') || resumeContent.includes('┌')) {
      issues.push({
        issue: 'Complex formatting detected',
        severity: 'high',
        description: 'Tables and special characters may not parse correctly',
        solution: 'Use simple formatting with standard fonts'
      });
      score -= 20;
    }

    if (!resumeContent.toLowerCase().includes('experience')) {
      issues.push({
        issue: 'No clear experience section',
        severity: 'medium',
        description: 'ATS systems look for standard section headers',
        solution: 'Add clear "Experience" or "Work Experience" header'
      });
      score -= 10;
    }

    const recommendations = [
      'Use standard section headers (Experience, Education, Skills)',
      'Include keywords from job posting naturally',
      'Use chronological format',
      'Save as .docx or .pdf format'
    ];

    return {
      score: Math.max(0, score),
      issues,
      recommendations
    };
  }

  /**
   * Generate tailoring recommendations
   */
  private async generateTailoringRecommendations(
    resumeComponents: any,
    jobComponents: any,
    missingElements: ResumeMatchResult['missingElements']
  ): Promise<ResumeMatchResult['tailoringRecommendations']> {

    const keywordsToAdd = jobComponents.keywords?.filter((keyword: string) =>
      !resumeComponents.keywords?.includes(keyword)
    ) || [];

    const sectionsToEmphasize = [];
    if (jobComponents.requiredSkills?.technical?.length > 0) {
      sectionsToEmphasize.push('Technical Skills');
    }
    if (jobComponents.responsibilities?.length > 0) {
      sectionsToEmphasize.push('Relevant Experience');
    }

    const phrasesToInclude = [
      `${jobComponents.basicInfo?.title} experience`,
      'Cross-functional collaboration',
      'Project leadership'
    ];

    const metricsToHighlight = [
      'Team size managed',
      'Project completion rate',
      'Performance improvements',
      'Cost savings achieved'
    ];

    return {
      keywordsToAdd: keywordsToAdd.slice(0, 5),
      sectionsToEmphasize,
      phrasesToInclude,
      metricsToHighlight
    };
  }

  /**
   * Calculate text similarity (simple implementation)
   */
  private textSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);

    return commonWords.length / totalWords;
  }
}

// Export singleton
export const resumeMatchingService = new ResumeMatchingService();