/**
 * Skills Gap Analysis Service
 * Analyzes resume vs job requirements to identify skill gaps and salary impact
 */

import { unifiedAI } from './unified-ai-service';
import { aiWebSearch } from './ai-web-search';

export interface SkillProfile {
  name: string;
  category: 'technical' | 'soft' | 'domain' | 'certification' | 'language' | 'tool';
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
  lastUsed?: string;
  confidence: number; // 0-1, how confident we are this skill exists
  extractedFrom: 'resume' | 'job_description' | 'inferred';
}

export interface SkillGap {
  skill: SkillProfile;
  gapLevel: 'missing' | 'beginner' | 'needs_improvement';
  priority: 'critical' | 'important' | 'nice_to_have';
  salaryImpact: {
    percentage: number; // How much this skill could increase salary
    absoluteValue: number; // Dollar amount based on current market
    confidence: number;
  };
  marketDemand: {
    demandLevel: number; // 0-100
    growthTrend: number; // -100 to 100
    competitiveAdvantage: number; // 0-100
  };
  learningPath: {
    timeToLearn: string;
    difficulty: 'easy' | 'medium' | 'hard';
    resources: LearningResource[];
    certifications: Certification[];
  };
}

export interface LearningResource {
  type: 'course' | 'book' | 'tutorial' | 'bootcamp' | 'practice';
  title: string;
  provider: string;
  estimatedTime: string;
  cost: 'free' | 'paid' | 'premium';
  url?: string;
  rating?: number;
}

export interface Certification {
  name: string;
  provider: string;
  salaryBoost: number;
  difficulty: string;
  timeToComplete: string;
  cost: string;
  recognition: 'industry_standard' | 'vendor_specific' | 'niche';
}

export interface SkillsAnalysisResult {
  userSkills: SkillProfile[];
  requiredSkills: SkillProfile[];
  skillGaps: SkillGap[];
  matchingSkills: SkillProfile[];
  overallMatch: {
    percentage: number;
    confidence: number;
    breakdown: {
      technical: number;
      soft: number;
      domain: number;
      certifications: number;
    };
  };
  improvementRoadmap: {
    phase1: SkillGap[]; // 1-3 months
    phase2: SkillGap[]; // 3-6 months
    phase3: SkillGap[]; // 6+ months
  };
  salaryImpactSummary: {
    currentMatchSalary: number;
    phase1CompleteSalary: number;
    fullPotentialSalary: number;
    totalUpside: number;
  };
}

export class SkillsGapAnalysisService {

  /**
   * Perform comprehensive skills gap analysis
   */
  async analyzeSkillsGap(
    resumeContent: string,
    jobTitle: string,
    jobDescription: string,
    jobRequirements: string,
    currentSalary?: number
  ): Promise<SkillsAnalysisResult> {

    console.log('🔍 Starting skills gap analysis...');

    try {
      // Step 1: Extract skills from resume
      const userSkills = await this.extractSkillsFromResume(resumeContent);

      // Step 2: Extract required skills from job
      const requiredSkills = await this.extractSkillsFromJob(
        jobTitle,
        jobDescription,
        jobRequirements
      );

      // Step 3: Identify matching skills
      const matchingSkills = this.findMatchingSkills(userSkills, requiredSkills);

      // Step 4: Identify skill gaps
      const skillGaps = await this.identifySkillGaps(
        userSkills,
        requiredSkills,
        matchingSkills,
        jobTitle
      );

      // Step 5: Calculate overall match percentage
      const overallMatch = this.calculateOverallMatch(
        userSkills,
        requiredSkills,
        matchingSkills
      );

      // Step 6: Create improvement roadmap
      const improvementRoadmap = this.createImprovementRoadmap(skillGaps);

      // Step 7: Calculate salary impact
      const salaryImpactSummary = await this.calculateSalaryImpact(
        overallMatch.percentage,
        skillGaps,
        currentSalary || 75000,
        jobTitle
      );

      return {
        userSkills,
        requiredSkills,
        skillGaps,
        matchingSkills,
        overallMatch,
        improvementRoadmap,
        salaryImpactSummary
      };

    } catch (error) {
      console.error('Skills gap analysis failed:', error);
      throw new Error('Failed to analyze skills gap');
    }
  }

  /**
   * Extract skills from resume using AI
   */
  private async extractSkillsFromResume(resumeContent: string): Promise<SkillProfile[]> {
    const prompt = `Extract all skills from this resume. For each skill, determine:
1. Category (technical/soft/domain/certification/language/tool)
2. Proficiency level based on context
3. Years of experience if mentioned
4. When it was last used

Resume:
${resumeContent}

Return a JSON array of skills with this structure:
[{
  "name": "skill name",
  "category": "technical|soft|domain|certification|language|tool",
  "proficiency": "beginner|intermediate|advanced|expert",
  "yearsOfExperience": number or null,
  "lastUsed": "recent|1-2 years|3+ years" or null,
  "confidence": 0.8,
  "extractedFrom": "resume"
}]

Focus on concrete, specific skills. Avoid generic terms.`;

    try {
      const response = await unifiedAI.process({
      operation: 'general_completion',
      content: prompt
    });
      if (!response || !(typeof response.data === 'string' ? response.data : JSON.stringify(response.data))) {
        throw new Error('Failed to get valid response from AI service');
      }

      // Clean the response to extract JSON from markdown code blocks
      const cleanedContent = this.cleanJsonResponse((typeof response.data === 'string' ? response.data : JSON.stringify(response.data)));

      if (!cleanedContent) {
        console.error('No valid JSON content found in AI response');
        throw new Error('Invalid AI response format');
      }

      let skills;
      try {
        skills = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        console.error('Cleaned content:', cleanedContent);
        console.error('Original content:', (typeof response.data === 'string' ? response.data : JSON.stringify(response.data)));

        // Try to salvage partial data by looking for valid JSON fragments
        try {
          const salvaged = this.salvageJsonFragments(cleanedContent);
          if (salvaged && salvaged.length > 0) {
            console.log('Salvaged partial JSON data:', salvaged);
            skills = salvaged;
          } else {
            throw new Error('No salvageable JSON found');
          }
        } catch (salvageError) {
          console.error('Failed to salvage JSON:', salvageError);
          throw new Error('Failed to parse AI response as JSON');
        }
      }
      return skills.map((skill: any) => ({
        ...skill,
        extractedFrom: 'resume' as const
      }));
    } catch (error) {
      console.error('Failed to extract skills from resume:', error);
      return [];
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

    // Additional cleanup: fix common JSON issues
    cleaned = this.fixCommonJsonIssues(cleaned);

    return cleaned.trim();
  }

  /**
   * Fix common JSON formatting issues that AI might generate
   */
  private fixCommonJsonIssues(json: string): string {
    // Fix trailing commas before closing brackets/braces
    json = json.replace(/,(\s*[}\]])/g, '$1');

    // Fix unescaped quotes in strings
    json = json.replace(/(?<!\\)"([^"\\]*)(?<!\\)"/g, (match, content) => {
      // Only escape quotes that aren't already escaped
      const escaped = content.replace(/(?<!\\)"/g, '\\"');
      return `"${escaped}"`;
    });

    // Remove incomplete trailing elements (common when AI response is truncated)
    // Look for incomplete objects/arrays at the end
    json = json.replace(/,\s*$/, ''); // Remove trailing comma
    json = json.replace(/,\s*[^}\]]*$/, ''); // Remove incomplete trailing elements

    // Fix incomplete property names or values
    json = json.replace(/,\s*"[^"]*$/, ''); // Remove incomplete property at end
    json = json.replace(/:\s*"[^"]*$/, ': ""'); // Close incomplete string values
    json = json.replace(/:\s*[^,}\]]*$/, ': null'); // Replace incomplete non-string values

    // Fix incomplete JSON by ensuring it ends properly
    let depth = 0;
    let inString = false;
    let lastChar = '';

    for (let i = 0; i < json.length; i++) {
      const char = json[i];

      if (char === '"' && lastChar !== '\\') {
        inString = !inString;
      } else if (!inString) {
        if (char === '{' || char === '[') {
          depth++;
        } else if (char === '}' || char === ']') {
          depth--;
        }
      }

      lastChar = char;
    }

    // If we have unclosed braces/brackets, try to close them
    while (depth > 0) {
      json += json.trim().startsWith('[') ? ']' : '}';
      depth--;
    }

    // If we have an unclosed string, close it
    if (inString) {
      json += '"';
    }

    return json;
  }

  /**
   * Attempt to salvage JSON fragments from incomplete or malformed content
   */
  private salvageJsonFragments(content: string): any[] {
    const salvaged: any[] = [];

    // Look for complete JSON objects within the content
    const objectRegex = /\{[^{}]*\}/g;
    const matches = content.match(objectRegex);

    if (matches) {
      for (const match of matches) {
        try {
          const parsed = JSON.parse(match);
          // Validate that it looks like a skill object
          if (parsed.name && typeof parsed.name === 'string') {
            salvaged.push({
              name: parsed.name,
              category: parsed.category || 'technical',
              proficiency: parsed.proficiency || 'intermediate',
              yearsOfExperience: parsed.yearsOfExperience || null,
              lastUsed: parsed.lastUsed || null,
              confidence: parsed.confidence || 0.5,
              extractedFrom: parsed.extractedFrom || 'salvaged'
            });
          }
        } catch (e) {
          // Skip invalid fragments
          continue;
        }
      }
    }

    return salvaged;
  }

  /**
   * Extract required skills from job posting
   */
  private async extractSkillsFromJob(
    jobTitle: string,
    description: string,
    requirements: string
  ): Promise<SkillProfile[]> {

    const jobContent = `
Job Title: ${jobTitle}

Description:
${description}

Requirements:
${requirements}
    `;

    const prompt = `Extract all required and preferred skills from this job posting. Categorize each skill and estimate the required proficiency level.

Job Posting:
${jobContent}

Return a JSON array of skills with this structure:
[{
  "name": "skill name",
  "category": "technical|soft|domain|certification|language|tool",
  "proficiency": "beginner|intermediate|advanced|expert",
  "confidence": 0.9,
  "extractedFrom": "job_description"
}]

Include both explicitly mentioned skills and commonly required skills for this role.`;

    try {
      const response = await unifiedAI.process({
      operation: 'general_completion',
      content: prompt
    });
      if (!response || !(typeof response.data === 'string' ? response.data : JSON.stringify(response.data))) {
        throw new Error('Failed to get valid response from AI service');
      }

      const cleanedContent = this.cleanJsonResponse((typeof response.data === 'string' ? response.data : JSON.stringify(response.data)));

      if (!cleanedContent) {
        console.error('No valid JSON content found in AI response');
        throw new Error('Invalid AI response format');
      }

      let skills;
      try {
        skills = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        console.error('Cleaned content:', cleanedContent);
        console.error('Original content:', (typeof response.data === 'string' ? response.data : JSON.stringify(response.data)));

        // Try to salvage partial data by looking for valid JSON fragments
        try {
          const salvaged = this.salvageJsonFragments(cleanedContent);
          if (salvaged && salvaged.length > 0) {
            console.log('Salvaged partial JSON data:', salvaged);
            skills = salvaged;
          } else {
            throw new Error('No salvageable JSON found');
          }
        } catch (salvageError) {
          console.error('Failed to salvage JSON:', salvageError);
          throw new Error('Failed to parse AI response as JSON');
        }
      }
      return skills.map((skill: any) => ({
        ...skill,
        extractedFrom: 'job_description' as const
      }));
    } catch (error) {
      console.error('Failed to extract skills from job:', error);
      return [];
    }
  }

  /**
   * Find skills that match between resume and job requirements
   */
  private findMatchingSkills(
    userSkills: SkillProfile[],
    requiredSkills: SkillProfile[]
  ): SkillProfile[] {

    const matches: SkillProfile[] = [];

    for (const required of requiredSkills) {
      for (const user of userSkills) {
        if (this.skillsMatch(user.name, required.name)) {
          // Create a merged skill profile showing the match
          matches.push({
            name: required.name,
            category: required.category,
            proficiency: user.proficiency,
            yearsOfExperience: user.yearsOfExperience,
            lastUsed: user.lastUsed,
            confidence: Math.min(user.confidence, required.confidence),
            extractedFrom: 'resume'
          });
          break;
        }
      }
    }

    return matches;
  }

  /**
   * Check if two skill names match (handles variations and synonyms)
   */
  private skillsMatch(skill1: string, skill2: string): boolean {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const s1 = normalize(skill1);
    const s2 = normalize(skill2);

    // Exact match
    if (s1 === s2) return true;

    // Common synonyms
    const synonyms: Record<string, string[]> = {
      'javascript': ['js', 'nodejs', 'node'],
      'typescript': ['ts'],
      'python': ['py'],
      'react': ['reactjs'],
      'vue': ['vuejs'],
      'angular': ['angularjs'],
      'aws': ['amazon web services'],
      'gcp': ['google cloud platform'],
      'kubernetes': ['k8s'],
      'docker': ['containerization'],
      'postgresql': ['postgres'],
      'mongodb': ['mongo']
    };

    for (const [key, variants] of Object.entries(synonyms)) {
      if ((s1 === key && variants.includes(s2)) ||
          (s2 === key && variants.includes(s1)) ||
          (variants.includes(s1) && variants.includes(s2))) {
        return true;
      }
    }

    // Partial match for compound skills
    if (s1.includes(s2) || s2.includes(s1)) {
      return s1.length > 2 && s2.length > 2;
    }

    return false;
  }

  /**
   * Identify skill gaps and their impact
   */
  private async identifySkillGaps(
    userSkills: SkillProfile[],
    requiredSkills: SkillProfile[],
    matchingSkills: SkillProfile[],
    jobTitle: string
  ): Promise<SkillGap[]> {

    const gaps: SkillGap[] = [];
    const matchedSkillNames = matchingSkills.map(s => s.name.toLowerCase());

    for (const required of requiredSkills) {
      if (!matchedSkillNames.includes(required.name.toLowerCase())) {
        // This is a gap
        const gap = await this.analyzeSkillGap(required, jobTitle);
        gaps.push(gap);
      } else {
        // Check if proficiency gap exists
        const userSkill = matchingSkills.find(m =>
          this.skillsMatch(m.name, required.name)
        );

        if (userSkill && this.isProficiencyGap(userSkill, required)) {
          const gap = await this.analyzeSkillGap(required, jobTitle, userSkill);
          gaps.push(gap);
        }
      }
    }

    // Sort by priority and salary impact
    return gaps.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { critical: 3, important: 2, nice_to_have: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.salaryImpact.percentage - a.salaryImpact.percentage;
    });
  }

  /**
   * Check if there's a proficiency gap
   */
  private isProficiencyGap(userSkill: SkillProfile, requiredSkill: SkillProfile): boolean {
    const proficiencyLevels = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    const userLevel = proficiencyLevels[userSkill.proficiency];
    const requiredLevel = proficiencyLevels[requiredSkill.proficiency];

    return userLevel < requiredLevel;
  }

  /**
   * Analyze individual skill gap
   */
  private async analyzeSkillGap(
    requiredSkill: SkillProfile,
    jobTitle: string,
    userSkill?: SkillProfile
  ): Promise<SkillGap> {

    const gapLevel = userSkill ? 'needs_improvement' : 'missing';

    // Get market data for this skill
    const marketData = await this.getSkillMarketData(requiredSkill.name, jobTitle);

    // Determine priority based on skill category and market demand
    const priority = this.determineSkillPriority(requiredSkill, marketData);

    // Calculate salary impact
    const salaryImpact = this.calculateSkillSalaryImpact(requiredSkill, marketData);

    // Generate learning path
    const learningPath = await this.generateLearningPath(requiredSkill);

    return {
      skill: requiredSkill,
      gapLevel: gapLevel as 'missing' | 'needs_improvement',
      priority,
      salaryImpact,
      marketDemand: marketData,
      learningPath
    };
  }

  /**
   * Get market demand data for a skill
   */
  private async getSkillMarketData(skillName: string, jobTitle: string): Promise<SkillGap['marketDemand']> {
    try {
      // Search for skill demand and salary data
      const query = `${skillName} skill demand salary impact ${jobTitle} 2025`;
      const results = await aiWebSearch.searchWeb(query, 3);

      // Parse results for demand indicators
      const hasHighDemand = results.results.some(r =>
        r.content.toLowerCase().includes('high demand') ||
        r.content.toLowerCase().includes('in-demand') ||
        r.content.toLowerCase().includes('sought after')
      );

      const hasGrowth = results.results.some(r =>
        r.content.toLowerCase().includes('growing') ||
        r.content.toLowerCase().includes('increasing') ||
        r.content.toLowerCase().includes('trend')
      );

      return {
        demandLevel: hasHighDemand ? 85 : 60,
        growthTrend: hasGrowth ? 20 : 0,
        competitiveAdvantage: hasHighDemand ? 80 : 50
      };
    } catch (error) {
      // Return default values if search fails
      return {
        demandLevel: 60,
        growthTrend: 0,
        competitiveAdvantage: 50
      };
    }
  }

  /**
   * Determine skill priority
   */
  private determineSkillPriority(
    skill: SkillProfile,
    marketData: SkillGap['marketDemand']
  ): 'critical' | 'important' | 'nice_to_have' {

    if (skill.category === 'technical' && marketData.demandLevel > 80) {
      return 'critical';
    }

    if (skill.category === 'certification' ||
        (skill.category === 'technical' && marketData.demandLevel > 60)) {
      return 'important';
    }

    return 'nice_to_have';
  }

  /**
   * Calculate salary impact of a skill
   */
  private calculateSkillSalaryImpact(
    skill: SkillProfile,
    marketData: SkillGap['marketDemand']
  ): SkillGap['salaryImpact'] {

    // Base impact by category
    const categoryImpact: Record<string, number> = {
      technical: 8,
      certification: 12,
      domain: 6,
      tool: 4,
      language: 3,
      soft: 2
    };

    let basePercentage = categoryImpact[skill.category] || 5;

    // Adjust based on market demand
    if (marketData.demandLevel > 80) basePercentage *= 1.5;
    else if (marketData.demandLevel > 60) basePercentage *= 1.2;

    // Growth trend bonus
    if (marketData.growthTrend > 15) basePercentage += 3;

    const percentage = Math.min(basePercentage, 25); // Cap at 25%
    const absoluteValue = 75000 * (percentage / 100); // Assume 75k base

    return {
      percentage,
      absoluteValue,
      confidence: marketData.demandLevel / 100
    };
  }

  /**
   * Generate learning path for a skill
   */
  private async generateLearningPath(skill: SkillProfile): Promise<SkillGap['learningPath']> {

    // Time estimates by skill category
    const timeEstimates: Record<string, string> = {
      technical: '2-6 months',
      certification: '1-3 months',
      domain: '3-12 months',
      tool: '2-8 weeks',
      language: '6-18 months',
      soft: '1-6 months'
    };

    const difficulty: Record<string, 'easy' | 'medium' | 'hard'> = {
      technical: 'medium',
      certification: 'easy',
      domain: 'hard',
      tool: 'easy',
      language: 'hard',
      soft: 'medium'
    };

    // Generate sample resources (in real implementation, this would search for actual resources)
    const resources: LearningResource[] = [
      {
        type: 'course',
        title: `Learn ${skill.name}`,
        provider: 'Online Platform',
        estimatedTime: '4-8 weeks',
        cost: 'paid',
        rating: 4.5
      },
      {
        type: 'tutorial',
        title: `${skill.name} Tutorials`,
        provider: 'YouTube/Blog',
        estimatedTime: '2-4 weeks',
        cost: 'free',
        rating: 4.0
      }
    ];

    const certifications: Certification[] = skill.category === 'certification' ? [
      {
        name: `${skill.name} Certification`,
        provider: 'Industry Body',
        salaryBoost: 10,
        difficulty: 'Medium',
        timeToComplete: '2-3 months',
        cost: '$200-500',
        recognition: 'industry_standard'
      }
    ] : [];

    return {
      timeToLearn: timeEstimates[skill.category] || '1-3 months',
      difficulty: difficulty[skill.category] || 'medium',
      resources,
      certifications
    };
  }

  /**
   * Calculate overall skill match percentage
   */
  private calculateOverallMatch(
    userSkills: SkillProfile[],
    requiredSkills: SkillProfile[],
    matchingSkills: SkillProfile[]
  ): SkillsAnalysisResult['overallMatch'] {

    if (requiredSkills.length === 0) {
      return {
        percentage: 100,
        confidence: 0.5,
        breakdown: { technical: 100, soft: 100, domain: 100, certifications: 100 }
      };
    }

    const totalRequired = requiredSkills.length;
    const totalMatched = matchingSkills.length;
    const overallPercentage = Math.round((totalMatched / totalRequired) * 100);

    // Calculate breakdown by category
    const breakdown = {
      technical: this.calculateCategoryMatch('technical', requiredSkills, matchingSkills),
      soft: this.calculateCategoryMatch('soft', requiredSkills, matchingSkills),
      domain: this.calculateCategoryMatch('domain', requiredSkills, matchingSkills),
      certifications: this.calculateCategoryMatch('certification', requiredSkills, matchingSkills)
    };

    // Confidence based on number of skills analyzed
    const confidence = Math.min(0.95, 0.5 + (totalRequired / 20));

    return {
      percentage: overallPercentage,
      confidence,
      breakdown
    };
  }

  /**
   * Calculate match percentage for a specific skill category
   */
  private calculateCategoryMatch(
    category: string,
    requiredSkills: SkillProfile[],
    matchingSkills: SkillProfile[]
  ): number {
    const requiredInCategory = requiredSkills.filter(s => s.category === category);
    const matchedInCategory = matchingSkills.filter(s => s.category === category);

    if (requiredInCategory.length === 0) return 100;

    return Math.round((matchedInCategory.length / requiredInCategory.length) * 100);
  }

  /**
   * Create improvement roadmap
   */
  private createImprovementRoadmap(skillGaps: SkillGap[]): SkillsAnalysisResult['improvementRoadmap'] {

    const phase1: SkillGap[] = [];
    const phase2: SkillGap[] = [];
    const phase3: SkillGap[] = [];

    for (const gap of skillGaps) {
      const timeToLearn = gap.learningPath.timeToLearn.toLowerCase();

      if (gap.priority === 'critical' || timeToLearn.includes('week')) {
        phase1.push(gap);
      } else if (gap.priority === 'important' || timeToLearn.includes('1-3 months')) {
        phase2.push(gap);
      } else {
        phase3.push(gap);
      }
    }

    return {
      phase1: phase1.slice(0, 3), // Limit to 3 skills per phase
      phase2: phase2.slice(0, 4),
      phase3: phase3.slice(0, 5)
    };
  }

  /**
   * Calculate salary impact summary
   */
  private async calculateSalaryImpact(
    currentMatchPercentage: number,
    skillGaps: SkillGap[],
    currentSalary: number,
    jobTitle: string
  ): Promise<SkillsAnalysisResult['salaryImpactSummary']> {

    // Base salary for this match percentage
    const currentMatchSalary = currentSalary * (currentMatchPercentage / 100);

    // Calculate potential after phase 1 (critical skills)
    const phase1Skills = skillGaps.filter(g => g.priority === 'critical').slice(0, 3);
    const phase1Boost = phase1Skills.reduce((sum, gap) => sum + gap.salaryImpact.percentage, 0);
    const phase1CompleteSalary = currentSalary * (1 + phase1Boost / 100);

    // Calculate full potential (all gaps addressed)
    const totalBoost = skillGaps.reduce((sum, gap) => sum + gap.salaryImpact.percentage, 0);
    const fullPotentialSalary = currentSalary * (1 + Math.min(totalBoost, 50) / 100); // Cap at 50%

    return {
      currentMatchSalary,
      phase1CompleteSalary,
      fullPotentialSalary,
      totalUpside: fullPotentialSalary - currentMatchSalary
    };
  }
}

// Export singleton
export const skillsGapAnalysis = new SkillsGapAnalysisService();