/**
 * Enhanced Skills Match Service
 *
 * Single source of truth for resume-to-job skills matching across all tabs.
 * Uses advanced AI analysis with partial match detection for highest quality results.
 *
 * Key Features:
 * - Unified algorithm used everywhere (Overview, Salary, Application tabs)
 * - Partial match detection (recognizes related/similar skills)
 * - Smart caching (48-hour TTL, invalidates on resume change)
 * - AI Activity Monitor integration
 * - Uses centralized AI system (gpt5Service)
 *
 * ⚠️ SERVER-SIDE ONLY - Do not use in client components
 */

import { prisma } from '@/lib/prisma';
import { gpt5Service } from './gpt5-service';
import { aiTaskTracker, AITaskType, AITaskStatus } from './ai-task-tracker';

// ============================================================================
// TYPES
// ============================================================================

export interface EnhancedSkillsMatchInput {
  userId: string;
  jobId: string;

  // Resume data
  resumeId: string;
  resumeContent: string;
  resumeSkills?: string[];
  resumeExperience?: any;
  resumeEducation?: any;

  // Job data
  jobTitle: string;
  jobCompany: string;
  jobDescription: string;
  jobRequirements: string;
  jobSkills?: string[];
  jobLocation?: string;

  // Options
  forceRecalculate?: boolean; // Bypass cache
  apiKey?: string; // User's API key for AI operations
}

export interface EnhancedSkillsMatchResult {
  // Summary scores (for Overview tab)
  overallScore: number;              // 0-100, weighted AI-calculated score
  confidence: number;                // 0-1, AI's confidence in the assessment

  // Detailed breakdown (for Salary & Application tabs)
  matchingSkills: string[];          // Exact matches found in resume
  missingSkills: string[];           // Required but not in resume
  partialMatches: string[];          // Similar/related skills (e.g., "Docker (has containerization experience)")
  matchExplanation: string;          // Human-readable explanation of the score

  // Component scores (for Overview tab compatibility)
  components: {
    skills: number;                  // Technical skills match %
    keywords: number;                // Job description keywords %
    experience: number;              // Experience level match %
    education: number;               // Education requirements %
    achievements: number;            // Quantifiable achievements %
  };

  // ATS optimization (for Application tab)
  atsKeywords: {
    matched: string[];               // Keywords found in resume
    missing: string[];               // Keywords missing from resume
    recommendations: string[];       // Specific optimization tips
  };

  // Metadata
  calculatedAt: Date;
  resumeId: string;                  // Track which resume was used
  version: number;                   // Format version (for future migrations)
  cacheKey: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class EnhancedSkillsMatchService {

  /**
   * Calculate enhanced skills match with smart caching
   *
   * This is the ONLY method that should be called for skills matching.
   * It handles caching, AI analysis, and result storage automatically.
   */
  async calculateMatch(input: EnhancedSkillsMatchInput): Promise<EnhancedSkillsMatchResult> {
    console.log(`🎯 [EnhancedSkillsMatch] Calculating for: ${input.jobTitle} at ${input.jobCompany}`);

    // Generate cache key
    const cacheKey = this.generateCacheKey(input);

    // Check if we should use cache
    if (!input.forceRecalculate) {
      const cached = await this.getFromCache(input.jobId, input.resumeId);
      if (cached) {
        console.log(`✅ [EnhancedSkillsMatch] Retrieved from cache (age: ${this.getCacheAge(cached.calculatedAt)})`);
        return cached;
      }
    } else {
      console.log(`🔄 [EnhancedSkillsMatch] Force recalculate - bypassing cache`);
    }

    // Cache miss - perform AI analysis
    console.log(`🤖 [EnhancedSkillsMatch] Cache miss - performing AI analysis...`);

    // CREATE AI TASK for tracking
    const aiTask = await aiTaskTracker.createTask({
      userId: input.userId,
      type: AITaskType.MATCH_CALCULATION,
      jobId: input.jobId,
      jobTitle: input.jobTitle,
      company: input.jobCompany,
      navigationPath: `/jobs/${input.jobId}`,
      navigationTab: 'overview',
      estimatedDuration: 18000, // 18 seconds
    });

    try {
      // UPDATE AI TASK: PROCESSING
      await aiTaskTracker.updateProgress(aiTask.id, {
        status: AITaskStatus.PROCESSING,
        currentStep: 'Analyzing skills match with AI...',
        progress: 30
      });

      // Perform AI-powered analysis
      const result = await this.performAIAnalysis(input);

      // Save to cache
      await this.saveToCache(input.jobId, result);

      // COMPLETE AI TASK
      await aiTaskTracker.completeTask(aiTask.id, {
        matchScore: result.overallScore,
        confidence: result.confidence
      });

      console.log(`✅ [EnhancedSkillsMatch] Calculated: ${result.overallScore}% (confidence: ${(result.confidence * 100).toFixed(1)}%)`);

      return result;

    } catch (error) {
      // FAIL AI TASK
      await aiTaskTracker.failTask(aiTask.id, error instanceof Error ? error.message : 'Skills match calculation failed');
      console.error(`❌ [EnhancedSkillsMatch] Error:`, error);
      throw error;
    }
  }

  /**
   * Perform AI-powered skills analysis
   * Uses GPT-5 with the proven algorithm from Salary Intel tab
   */
  private async performAIAnalysis(input: EnhancedSkillsMatchInput): Promise<EnhancedSkillsMatchResult> {

    // Prepare resume context
    const resumeContext = `
**CANDIDATE RESUME:**
${input.resumeContent}

**STRUCTURED RESUME DATA:**
- Skills: ${input.resumeSkills?.join(', ') || 'Not extracted'}
- Experience: ${input.resumeExperience ? JSON.stringify(input.resumeExperience, null, 2) : 'Not extracted'}
- Education: ${input.resumeEducation ? JSON.stringify(input.resumeEducation, null, 2) : 'Not extracted'}
`.trim();

    // Prepare job context
    const jobContext = `
**JOB POSTING:**
- Title: ${input.jobTitle}
- Company: ${input.jobCompany}
- Location: ${input.jobLocation || 'Not specified'}

**JOB DESCRIPTION:**
${input.jobDescription}

**JOB REQUIREMENTS:**
${input.jobRequirements}

**EXTRACTED JOB SKILLS:**
${input.jobSkills?.join(', ') || 'Not extracted'}
`.trim();

    // AI Prompt - Based on proven Salary Intel algorithm
    const prompt = `
You are an expert technical recruiter and ATS (Applicant Tracking System) specialist. Analyze the candidate's resume against the job posting to provide a comprehensive skills match assessment.

${resumeContext}

${jobContext}

**YOUR TASK:**
Perform a detailed skills match analysis with the following requirements:

1. **Matching Skills:** Identify ONLY skills from the resume that EXACTLY match job requirements
2. **Missing Skills:** Identify required skills from the job that are NOT present in the resume
3. **Partial Matches:** Identify skills where the candidate has RELATED or SIMILAR experience but not an exact match
   - Example: Job requires "Kubernetes" but resume shows "Docker containerization" = partial match
   - Example: Job requires "GraphQL" but resume shows "REST API design" = partial match
4. **Overall Score:** Calculate weighted score: (exact_matches × 1.0 + partial_matches × 0.6) / total_required × 100
5. **Component Breakdown:** Analyze skills, keywords, experience, education, achievements separately
6. **ATS Keywords:** Extract key terms for ATS optimization

**CRITICAL REQUIREMENTS:**
- Be SPECIFIC - list actual skill names, not categories
- Partial matches MUST include explanation: "Skill X (has related experience Y)"
- Overall score must be data-driven: explain calculation clearly
- Include ALL required fields in JSON response
- No hallucination - only use data from provided resume and job description

**RESPONSE FORMAT (EXACT JSON structure required):**
{
  "overallScore": <number 0-100, weighted calculation>,
  "confidence": <number 0-1, your confidence in this assessment>,
  "matchingSkills": [
    "Skill 1 (exact match)",
    "Skill 2 (exact match)"
  ],
  "missingSkills": [
    "Required skill 1 not in resume",
    "Required skill 2 not in resume"
  ],
  "partialMatches": [
    "Kubernetes (has Docker and containerization experience)",
    "GraphQL (has REST API and API design experience)"
  ],
  "matchExplanation": "Detailed explanation: X exact matches + Y partial matches out of Z total required = overall score. Explain the weighting.",
  "components": {
    "skills": <0-100, technical skills match>,
    "keywords": <0-100, job description keyword presence>,
    "experience": <0-100, years and level match>,
    "education": <0-100, degree and field match>,
    "achievements": <0-100, quantifiable results presence>
  },
  "atsKeywords": {
    "matched": ["keyword1", "keyword2", "keyword3"],
    "missing": ["missing1", "missing2"],
    "recommendations": [
      "Add 'keyword X' to resume in context of Y",
      "Emphasize 'skill Z' more prominently",
      "Include quantifiable metric for achievement A"
    ]
  }
}

Respond ONLY with valid JSON. No markdown, no explanation outside JSON.
`.trim();

    // Call GPT-5 with user's API key (using centralized gpt5Service)
    const response = await gpt5Service.complete(prompt, {
      model: 'gpt-5-mini', // Fast and cost-effective for this task
      reasoning: 'medium', // Need good reasoning for accurate matching
      verbosity: 'low', // Keep it concise
      apiKey: input.apiKey
    });

    // Parse AI response
    let aiResult: any;
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      aiResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', response);
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate and construct result
    const result: EnhancedSkillsMatchResult = {
      overallScore: this.clamp(aiResult.overallScore || 0, 0, 100),
      confidence: this.clamp(aiResult.confidence || 0.7, 0, 1),

      matchingSkills: Array.isArray(aiResult.matchingSkills) ? aiResult.matchingSkills : [],
      missingSkills: Array.isArray(aiResult.missingSkills) ? aiResult.missingSkills : [],
      partialMatches: Array.isArray(aiResult.partialMatches) ? aiResult.partialMatches : [],
      matchExplanation: aiResult.matchExplanation || 'Analysis completed',

      components: {
        skills: this.clamp(aiResult.components?.skills || 0, 0, 100),
        keywords: this.clamp(aiResult.components?.keywords || 0, 0, 100),
        experience: this.clamp(aiResult.components?.experience || 0, 0, 100),
        education: this.clamp(aiResult.components?.education || 0, 0, 100),
        achievements: this.clamp(aiResult.components?.achievements || 0, 0, 100),
      },

      atsKeywords: {
        matched: Array.isArray(aiResult.atsKeywords?.matched) ? aiResult.atsKeywords.matched : [],
        missing: Array.isArray(aiResult.atsKeywords?.missing) ? aiResult.atsKeywords.missing : [],
        recommendations: Array.isArray(aiResult.atsKeywords?.recommendations) ? aiResult.atsKeywords.recommendations : [],
      },

      calculatedAt: new Date(),
      resumeId: input.resumeId,
      version: 2, // Enhanced format version
      cacheKey: this.generateCacheKey(input),
    };

    return result;
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Get match result from database cache
   */
  private async getFromCache(jobId: string, resumeId: string): Promise<EnhancedSkillsMatchResult | null> {
    try {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: {
          matchAnalysis: true,
          matchAnalysisVersion: true,
          matchResumeId: true,
        }
      });

      if (!job?.matchAnalysis) {
        return null;
      }

      // Check if cache is for correct resume
      if (job.matchResumeId !== resumeId) {
        console.log(`⚠️ [EnhancedSkillsMatch] Cache invalid: resume changed`);
        return null;
      }

      // Check format version
      if (job.matchAnalysisVersion !== 2) {
        console.log(`⚠️ [EnhancedSkillsMatch] Cache invalid: old format (v${job.matchAnalysisVersion})`);
        return null;
      }

      const cached = JSON.parse(job.matchAnalysis);

      // Check cache age (48 hours TTL)
      const ageHours = (Date.now() - new Date(cached.calculatedAt).getTime()) / (1000 * 60 * 60);
      if (ageHours > 48) {
        console.log(`⚠️ [EnhancedSkillsMatch] Cache expired: ${ageHours.toFixed(1)}h old`);
        return null;
      }

      // Convert dates from strings
      cached.calculatedAt = new Date(cached.calculatedAt);

      return cached as EnhancedSkillsMatchResult;

    } catch (error) {
      console.error('❌ [EnhancedSkillsMatch] Cache retrieval error:', error);
      return null;
    }
  }

  /**
   * Save match result to database cache
   */
  private async saveToCache(jobId: string, result: EnhancedSkillsMatchResult): Promise<void> {
    try {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          matchScore: result.overallScore,
          matchAnalysis: JSON.stringify(result),
          matchAnalysisVersion: 2,
          matchResumeId: result.resumeId,
        }
      });

      console.log(`💾 [EnhancedSkillsMatch] Saved to cache`);
    } catch (error) {
      console.error('❌ [EnhancedSkillsMatch] Cache save error:', error);
      // Don't throw - cache failure shouldn't break the response
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Generate cache key for a match calculation
   */
  private generateCacheKey(input: EnhancedSkillsMatchInput): string {
    return `enhanced-match:${input.jobId}:${input.resumeId}:v2`;
  }

  /**
   * Get human-readable cache age
   */
  private getCacheAge(calculatedAt: Date): string {
    const ageMs = Date.now() - calculatedAt.getTime();
    const ageMinutes = Math.floor(ageMs / (1000 * 60));
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));

    if (ageMinutes < 60) {
      return `${ageMinutes}m`;
    }
    return `${ageHours}h`;
  }

  /**
   * Clamp value between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const enhancedSkillsMatchService = new EnhancedSkillsMatchService();
