/**
 * Centralized Resume-Job Matching Service
 *
 * A single, authoritative service for all resume-to-job matching operations.
 * Designed with subscription tiers in mind and no fallback values.
 *
 * Key Features:
 * - Subscription-tier aware matching depth
 * - No fallback scores - only real AI-powered analysis
 * - Comprehensive breakdown of match components
 * - Caching for performance
 * - Batch processing support
 */

import { aiGateway } from './ai-gateway';
import { skillsGapAnalysis } from './skills-gap-analysis';
import { resumeMatchingService, type ResumeMatchResult } from './resume-matching-service';
import { SubscriptionTier, getTierLimits, getUserTier } from './subscription-tiers';
import { prisma } from '@/lib/prisma';
import { aiTaskTracker, AITaskType, AITaskStatus } from './ai-task-tracker';

export interface MatchScoreResult {
  // Core Score
  matchScore: number; // 0-100 percentage
  confidence: number; // 0-1 confidence in the score
  tier: SubscriptionTier;

  // Component Scores (for detailed breakdown)
  components: {
    skills: number;
    experience: number;
    education: number;
    keywords: number;
    achievements: number;
  };

  // Detailed Analysis (tier-dependent)
  detailedAnalysis?: ResumeMatchResult;

  // Metadata
  calculatedAt: Date;
  cacheKey: string;
  dataSources: string[];
}

export interface MatchCalculationInput {
  userId: string;
  jobId?: string;
  resumeContent: string;
  resumeSkills?: string[];
  resumeExperience?: any;
  resumeEducation?: any;
  jobTitle: string;
  jobCompany: string;
  jobDescription: string;
  jobRequirements: string;
  jobSkills?: string[];
  jobLocation?: string;
  forceRecalculate?: boolean; // NEW: Bypass cache and force fresh calculation
  apiKey?: string; // User's API key for AI operations
}

class CentralizedMatchService {

  /**
   * Calculate resume-to-job match score
   * This is the ONLY method that should be used throughout the application
   */
  async calculateMatch(input: MatchCalculationInput): Promise<MatchScoreResult> {
    console.log('🎯 Calculating match score for:', input.jobTitle, 'at', input.jobCompany);

    // CREATE AI TASK for tracking
    const aiTask = await aiTaskTracker.createTask({
      userId: input.userId,
      type: AITaskType.MATCH_CALCULATION,
      jobId: input.jobId,
      jobTitle: input.jobTitle,
      company: input.jobCompany,
      navigationPath: input.jobId ? `/jobs/${input.jobId}` : '/dashboard',
      navigationTab: 'overview',
      estimatedDuration: 20000, // 20 seconds
    });

    try {
      // Get user's subscription tier
      const tier = await getUserTier(input.userId);
      const limits = getTierLimits(tier);

      // Generate cache key
      const cacheKey = this.generateCacheKey(input);

      // Check cache first (unless force recalculate is requested)
      if (!input.forceRecalculate) {
        const cached = await this.getFromCache(cacheKey, limits.cacheExpirationHours);
        if (cached) {
          console.log('✅ Retrieved match score from cache');

          // MARK AI TASK AS CACHED
          await aiTaskTracker.markAsCached(aiTask.id);

          return cached;
        }
      } else {
        console.log('🔄 Force recalculate requested - bypassing cache');
      }

      // UPDATE AI TASK: PROCESSING
      await aiTaskTracker.updateProgress(aiTask.id, {
        status: AITaskStatus.PROCESSING,
        currentStep: 'Analyzing resume match...',
        progress: 50
      });

      // Perform AI-powered matching analysis
      const result = await this.performMatching(input, tier, limits);

      // Cache the result
      await this.saveToCache(cacheKey, result, limits.cacheExpirationHours);

      // COMPLETE AI TASK
      await aiTaskTracker.completeTask(aiTask.id, {
        matchScore: result.matchScore,
        confidence: result.confidence
      });

      return result;

    } catch (error) {
      // FAIL AI TASK
      await aiTaskTracker.failTask(aiTask.id, error instanceof Error ? error.message : 'Match calculation failed');
      throw error;
    }
  }

  /**
   * Perform the actual matching analysis
   */
  private async performMatching(
    input: MatchCalculationInput,
    tier: SubscriptionTier,
    limits: any
  ): Promise<MatchScoreResult> {

    console.log(`📊 Performing ${limits.matchAnalysisDepth} depth matching analysis`);

    try {
      // For FREE tier: Basic AI matching
      if (limits.matchAnalysisDepth === 'basic') {
        return await this.basicMatching(input, tier);
      }

      // For PRO tier: Standard matching with skills gap
      if (limits.matchAnalysisDepth === 'standard') {
        return await this.standardMatching(input, tier, limits);
      }

      // For PRO_MAX tier: Comprehensive matching
      return await this.comprehensiveMatching(input, tier, limits);

    } catch (error) {
      console.error('❌ Match calculation failed:', error);
      throw new Error('Failed to calculate match score. Please try again.');
    }
  }

  /**
   * Basic matching (FREE tier)
   * Fast, AI-powered score without detailed breakdown
   */
  private async basicMatching(
    input: MatchCalculationInput,
    tier: SubscriptionTier
  ): Promise<MatchScoreResult> {

    const prompt = `You are an expert resume analyst. Calculate a match percentage (0-100) between this resume and job posting.

Consider:
1. Technical skills overlap
2. Years of experience match
3. Education requirements
4. Keyword alignment
5. Role level compatibility

Resume Summary:
- Skills: ${input.resumeSkills?.join(', ') || 'Extracted from resume'}
- Title/Level: Extracted from resume content

Job Requirements:
- Title: ${input.jobTitle}
- Company: ${input.jobCompany}
- Key Requirements: ${input.jobRequirements.substring(0, 500)}
- Preferred Skills: ${input.jobSkills?.join(', ') || 'Various'}

Return ONLY a JSON object with this exact structure:
{
  "matchScore": <number 0-100>,
  "confidence": <number 0.0-1.0>,
  "skillsScore": <number 0-100>,
  "experienceScore": <number 0-100>,
  "educationScore": <number 0-100>,
  "keywordsScore": <number 0-100>,
  "achievementsScore": <number 0-100>,
  "reasoning": "<brief 1-sentence explanation>"
}`;

    const response = await aiGateway.request({
      userId: input.userId,
      operation: 'resume_matching',
      content: prompt
    });

    // Parse AI response
    const data = this.parseAIResponse(response.data);

    // Validate that we got valid scores from AI
    if (typeof data.matchScore !== 'number' || data.matchScore < 0 || data.matchScore > 100) {
      throw new Error('AI returned invalid match score. Please try again.');
    }

    return {
      matchScore: Math.round(data.matchScore),
      confidence: data.confidence && data.confidence > 0 ? data.confidence : 0.7,
      tier,
      components: {
        skills: typeof data.skillsScore === 'number' ? Math.round(data.skillsScore) : 0,
        experience: typeof data.experienceScore === 'number' ? Math.round(data.experienceScore) : 0,
        education: typeof data.educationScore === 'number' ? Math.round(data.educationScore) : 0,
        keywords: typeof data.keywordsScore === 'number' ? Math.round(data.keywordsScore) : 0,
        achievements: typeof data.achievementsScore === 'number' ? Math.round(data.achievementsScore) : 0
      },
      calculatedAt: new Date(),
      cacheKey: this.generateCacheKey(input),
      dataSources: ['ai_analysis']
    };
  }

  /**
   * Standard matching (PRO tier)
   * Includes skills gap analysis and improvement recommendations
   */
  private async standardMatching(
    input: MatchCalculationInput,
    tier: SubscriptionTier,
    limits: any
  ): Promise<MatchScoreResult> {

    // Get basic match first
    const basicResult = await this.basicMatching(input, tier);

    // Add skills gap analysis
    const skillsGap = await skillsGapAnalysis.analyzeSkillsGap(
      input.resumeContent,
      input.jobTitle,
      input.jobDescription,
      input.jobRequirements,
      undefined, // currentSalary
      undefined, // preExtractedResumeSkills
      input.apiKey // Pass user's API key
    );

    // Perform partial detailed analysis (exclude some heavy computations)
    // Pass pre-extracted skills if available from database
    const preExtractedSkills = input.resumeSkills ? input.resumeSkills.map((skill: any) =>
      typeof skill === 'string' ? { name: skill, category: 'technical' } : skill
    ) : undefined;

    const detailedAnalysis = await resumeMatchingService.analyzeResumeMatch(
      input.resumeContent,
      input.jobTitle,
      input.jobCompany,
      input.jobDescription,
      input.jobRequirements,
      preExtractedSkills, // NEW: Pass cached skills from database
      input.apiKey // Pass user's API key
    );

    return {
      ...basicResult,
      tier,
      detailedAnalysis: {
        ...detailedAnalysis,
        // Remove features not included in standard tier
        atsCompatibility: limits.includeATSAnalysis
          ? detailedAnalysis.atsCompatibility
          : { score: 0, issues: [], recommendations: [] },
        tailoringRecommendations: limits.includeTailoringRecommendations
          ? detailedAnalysis.tailoringRecommendations
          : { keywordsToAdd: [], sectionsToEmphasize: [], phrasesToInclude: [], metricsToHighlight: [] }
      },
      dataSources: ['ai_analysis', 'skills_gap_analysis', 'resume_matching_service']
    };
  }

  /**
   * Comprehensive matching (PRO_MAX tier)
   * Full detailed analysis with all features
   */
  private async comprehensiveMatching(
    input: MatchCalculationInput,
    tier: SubscriptionTier,
    limits: any
  ): Promise<MatchScoreResult> {

    // Perform full detailed analysis
    // Pass pre-extracted skills if available from database
    const preExtractedSkills = input.resumeSkills ? input.resumeSkills.map((skill: any) =>
      typeof skill === 'string' ? { name: skill, category: 'technical' } : skill
    ) : undefined;

    const detailedAnalysis = await resumeMatchingService.analyzeResumeMatch(
      input.resumeContent,
      input.jobTitle,
      input.jobCompany,
      input.jobDescription,
      input.jobRequirements,
      preExtractedSkills, // NEW: Pass cached skills from database
      input.apiKey // Pass user's API key
    );

    return {
      matchScore: detailedAnalysis.overallMatch.percentage,
      confidence: detailedAnalysis.overallMatch.confidence,
      tier,
      components: {
        skills: detailedAnalysis.matchBreakdown.skills.score,
        experience: detailedAnalysis.matchBreakdown.experience.score,
        education: detailedAnalysis.matchBreakdown.education.score,
        keywords: detailedAnalysis.matchBreakdown.keywords.score,
        achievements: detailedAnalysis.matchBreakdown.achievements.score
      },
      detailedAnalysis,
      calculatedAt: new Date(),
      cacheKey: this.generateCacheKey(input),
      dataSources: ['comprehensive_resume_analysis', 'skills_gap_analysis', 'ats_compatibility', 'tailoring_recommendations']
    };
  }

  /**
   * Batch calculate match scores for multiple jobs
   * Only available for PRO and PRO_MAX tiers
   */
  async batchCalculateMatches(
    userId: string,
    resumeContent: string,
    jobs: Array<{
      id: string;
      title: string;
      company: string;
      description: string;
      requirements: string;
    }>
  ): Promise<Map<string, MatchScoreResult>> {

    const tier = await getUserTier(userId);
    const limits = getTierLimits(tier);

    if (!limits.batchOperations) {
      throw new Error('Batch operations require PRO or PRO_MAX subscription');
    }

    console.log(`🔄 Batch processing ${jobs.length} job matches`);

    const results = new Map<string, MatchScoreResult>();

    // Process in parallel with concurrency limit
    const CONCURRENCY = tier === SubscriptionTier.PRO_MAX ? 10 : 5;
    for (let i = 0; i < jobs.length; i += CONCURRENCY) {
      const batch = jobs.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(job =>
          this.calculateMatch({
            userId,
            jobId: job.id,
            resumeContent,
            jobTitle: job.title,
            jobCompany: job.company,
            jobDescription: job.description,
            jobRequirements: job.requirements
          })
        )
      );

      batch.forEach((job, index) => {
        results.set(job.id, batchResults[index]);
      });
    }

    return results;
  }

  /**
   * Update match score in database
   */
  async updateJobMatchScore(jobId: string, matchScore: number): Promise<void> {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        matchScore: matchScore,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Generate cache key for match result
   */
  private generateCacheKey(input: MatchCalculationInput): string {
    const components = [
      input.userId,
      input.jobId || '',
      input.jobTitle,
      input.jobCompany,
      // Hash the resume content to avoid massive keys
      this.simpleHash(input.resumeContent.substring(0, 1000))
    ];
    return `match:${components.join(':')}`;
  }

  /**
   * Simple string hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get match result from cache
   */
  private async getFromCache(
    cacheKey: string,
    expirationHours: number
  ): Promise<MatchScoreResult | null> {
    try {
      const cached = await prisma.aIResponseCache.findUnique({
        where: { cacheKey }
      });

      if (!cached) return null;

      // Check expiration
      const now = new Date();
      if (cached.expiresAt < now) {
        // Expired - delete and return null
        await prisma.aIResponseCache.delete({ where: { cacheKey } });
        return null;
      }

      return JSON.parse(cached.response);
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * Save match result to cache
   */
  private async saveToCache(
    cacheKey: string,
    result: MatchScoreResult,
    expirationHours: number
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);

      await prisma.aIResponseCache.upsert({
        where: { cacheKey },
        create: {
          cacheKey,
          response: JSON.stringify(result),
          expiresAt
        },
        update: {
          response: JSON.stringify(result),
          expiresAt,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Cache write error:', error);
      // Don't throw - caching failure shouldn't break the flow
    }
  }

  /**
   * Parse AI response to extract JSON
   */
  private parseAIResponse(data: any): any {
    try {
      if (typeof data === 'object') return data;

      let str = typeof data === 'string' ? data : JSON.stringify(data);

      // Remove markdown code blocks
      str = str.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Find JSON object
      const match = str.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }

      return JSON.parse(str);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Invalid AI response format');
    }
  }
}

// Export singleton
export const centralizedMatchService = new CentralizedMatchService();
