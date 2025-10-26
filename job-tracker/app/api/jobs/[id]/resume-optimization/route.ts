import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { unifiedAI } from '@/lib/services/unified-ai-service';
import { aiTaskTracker, AITaskType, AITaskStatus } from '@/lib/services/ai-task-tracker';

export const runtime = 'nodejs';

// GET method for resume optimization - cache check and fresh analysis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`📋 [${requestId}] Resume optimization API called`);

  try {
    // Authentication
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const cookieToken = request.cookies.get('token')?.value;
    const token = authHeader || cookieToken;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const resolvedParams = await params;
    const jobId = resolvedParams.id;

    // Get job data
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        userId: user.id
      },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    console.log(`📍 Job: ${job.title} at ${job.company}`);

    // Handle cache check parameter
    const checkCache = request.nextUrl.searchParams.get('checkCache') === 'true';
    const forceRefresh = request.nextUrl.searchParams.get('forceRefresh') === 'true';

    // If this is just a cache check, only check cache and return
    if (checkCache) {
      if (job.extractedData) {
        try {
          const cached = JSON.parse(job.extractedData);
          if (cached.resumeOptimization && cached.resumeOptimizationDate) {
            const hoursSinceAnalysis = (Date.now() - new Date(cached.resumeOptimizationDate).getTime()) / (1000 * 60 * 60);

            if (hoursSinceAnalysis < 48) { // 48 hours cache
              // Validate cached structure - must have all required fields
              const cachedOptimization = cached.resumeOptimization;
              const hasRequiredFields = cachedOptimization?.overallScore
                && cachedOptimization?.gapAnalysis
                && cachedOptimization?.keywordOptimization
                && cachedOptimization?.atsCompatibility;

              if (!hasRequiredFields) {
                console.warn(`⚠️ [${requestId}] Cached optimization has invalid/old structure, forcing refresh`);
              } else {
                console.log(`📋 [${requestId}] Returning cached resume optimization (${hoursSinceAnalysis.toFixed(1)}h old)`);
                return NextResponse.json({
                  cached: true,
                  optimization: cachedOptimization,
                  cacheAge: `${hoursSinceAnalysis.toFixed(1)} hours`,
                  job: {
                    id: job.id,
                    title: job.title,
                    company: job.company
                  }
                });
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ [${requestId}] Failed to parse cached data:`, error);
        }
      }

      // No cache found
      console.log(`📭 [${requestId}] No cached resume optimization found`);
      return NextResponse.json({
        cached: false,
        optimization: null
      });
    }

    // Check cache unless force refresh
    if (!forceRefresh && job.extractedData) {
      try {
        const cached = JSON.parse(job.extractedData);
        if (cached.resumeOptimization && cached.resumeOptimizationDate) {
          const hoursSinceAnalysis = (Date.now() - new Date(cached.resumeOptimizationDate).getTime()) / (1000 * 60 * 60);

          if (hoursSinceAnalysis < 48) {
            // Validate cached structure - must have all required fields
            const cachedOptimization = cached.resumeOptimization;
            const hasRequiredFields = cachedOptimization?.overallScore
              && cachedOptimization?.gapAnalysis
              && cachedOptimization?.keywordOptimization
              && cachedOptimization?.atsCompatibility;

            if (!hasRequiredFields) {
              console.warn(`⚠️ [${requestId}] Cached optimization has invalid/old structure, forcing refresh`);
            } else {
              console.log(`📋 [${requestId}] Using cached resume optimization (${hoursSinceAnalysis.toFixed(1)}h old)`);
              return NextResponse.json({
                cached: true,
                optimization: cachedOptimization,
                cacheAge: `${hoursSinceAnalysis.toFixed(1)} hours`,
                job: {
                  id: job.id,
                  title: job.title,
                  company: job.company
                }
              });
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ [${requestId}] Failed to parse cached data:`, error);
      }
    }

    console.log(`🔍 Starting resume optimization analysis: ${job.title} at ${job.company}`);

    // Get actual uploaded resume from database
    const resume = await prisma.resume.findFirst({
      where: {
        userId: user.id,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!resume || !resume.content) {
      return NextResponse.json({
        error: 'No resume found. Please upload a resume first.'
      }, { status: 400 });
    }

    const resumeData = resume.content;

    // Get job description
    const jobDescription = job.description || 'No description available';
    const jobRequirements = job.requirements || 'Not specified';

    // Build optimization prompt - using same format as component expects
    const optimizationPrompt = `Analyze and optimize the resume for this specific job opportunity:

RESUME CONTEXT: This is the user's general profile resume

JOB DETAILS:
Title: ${job.title}
Company: ${job.company}
Description: ${jobDescription}
Requirements: ${jobRequirements}

CURRENT RESUME:
${resumeData}

OPTIMIZATION ANALYSIS:
Provide comprehensive resume optimization covering all sections below. Return AS VALID JSON ONLY.

REQUIRED JSON STRUCTURE (fill ALL fields):
{
  "overallScore": 85,
  "atsCompatibility": {
    "score": 82,
    "issues": [
      {"type": "missing_keywords", "severity": "high", "description": "Missing critical keyword X", "solution": "Add X to skills section"},
      {"type": "formatting", "severity": "medium", "description": "Issue description", "solution": "How to fix"}
    ],
    "recommendations": ["Recommendation 1", "Recommendation 2"],
    "keywordDensity": {"keyword1": 0.02, "keyword2": 0.015},
    "formatIssues": ["Format issue 1", "Format issue 2"],
    "improvementPriority": "high"
  },
  "keywordOptimization": {
    "missingKeywords": [
      {"keyword": "TypeScript", "importance": "critical", "suggestedContext": "Where to add", "alternativeTerms": ["TS"], "where": "skills"}
    ],
    "weakKeywords": [
      {"keyword": "JavaScript", "currentUsage": "Current context", "suggestedImprovement": "Better usage", "impactLevel": "high"}
    ],
    "strongKeywords": ["keyword1", "keyword2"],
    "suggestedPlacements": [
      {"keyword": "React", "section": "experience", "suggestedText": "How to use", "reasoning": "Why"}
    ],
    "densityAnalysis": {"optimal": 0.03, "current": 0.02, "target": 0.025}
  },
  "experienceOptimization": {
    "reorderSuggestions": [
      {"originalOrder": 1, "suggestedOrder": 2, "experience": "Job title at Company", "reasoning": "Why reorder", "relevanceScore": 85}
    ],
    "bulletPointOptimizations": [
      {"originalBullet": "Original text", "optimizedBullet": "Improved text", "improvements": ["Improvement 1"], "impactIncrease": 25}
    ],
    "quantificationSuggestions": [
      {"experience": "Job title", "originalText": "Managed team", "suggestedText": "Managed team of 5 engineers", "metricType": "number", "reasoning": "Why"}
    ],
    "relevanceScores": {"Experience 1": 90, "Experience 2": 75}
  },
  "skillsOptimization": {
    "skillsToAdd": [
      {"skill": "Docker", "category": "technical", "priority": "high", "reasoning": "Why", "whereToAdd": "skills section"}
    ],
    "skillsToEmphasize": ["Skill1", "Skill2"],
    "skillsToReword": [
      {"originalSkill": "JS", "suggestedSkill": "JavaScript (ES6+)", "reasoning": "Why", "industryStandard": true}
    ],
    "technicalVsSoft": {"technical": 70, "soft": 30, "ideal": {"technical": 80, "soft": 20}}
  },
  "gapAnalysis": {
    "criticalGaps": [
      {"requirement": "5+ years React", "gapSeverity": "moderate", "compensationOptions": ["Option 1"], "learningPath": "Path", "timeToAcquire": "3 months"}
    ],
    "minorGaps": [
      {"requirement": "Docker", "alternatives": ["Alternative 1"], "priority": "medium"}
    ],
    "strengthAreas": [
      {"area": "Full-stack", "advantage": "What advantage", "howToEmphasize": "How to emphasize"}
    ],
    "compensationStrategies": [
      {"gap": "Gap description", "strategy": "How to compensate", "effectiveness": "medium", "implementation": "How to implement"}
    ],
    "overallFitScore": 78
  },
  "optimizedSections": {
    "summary": {"original": "...", "optimized": "...", "changes": ["Change 1"], "improvements": ["Improvement 1"], "score": 85},
    "experience": {"original": "...", "optimized": "...", "changes": ["Change 1"], "improvements": ["Improvement 1"], "score": 80},
    "skills": {"original": "...", "optimized": "...", "changes": ["Change 1"], "improvements": ["Improvement 1"], "score": 88},
    "education": {"original": "...", "optimized": "...", "changes": ["Change 1"], "improvements": ["Improvement 1"], "score": 75}
  },
  "improvementSuggestions": [
    {"category": "keywords", "priority": "high", "suggestion": "Add X", "implementation": "How", "expectedImpact": "40% improvement"}
  ],
  "confidence": 0.85
}

IMPORTANT:
- Base all suggestions on actual job requirements and resume content
- Provide specific, actionable recommendations
- Fill ALL fields with real analysis (no placeholders or "...")
- Return ONLY valid JSON, no markdown formatting
`;

    const startTime = Date.now();

    const response = await unifiedAI.complete(
      optimizationPrompt,
      'gpt-5-mini',
      'low', // Use low reasoning for speed and to avoid token exhaustion
      user.id // Pass userId - AI service fetches API key automatically
    );

    const processingTime = Date.now() - startTime;

    if (!response.success) {
      const errorMsg = response.error?.message || 'Unknown error';
      const errorDetails = response.error?.details ? JSON.stringify(response.error.details) : '';
      console.error('❌ AI Optimization Failed:', {
        type: response.error?.type,
        message: response.error?.message,
        details: response.error?.details
      });
      throw new Error(`AI optimization failed: ${errorMsg}${errorDetails ? ' - ' + errorDetails : ''}`);
    }

    // Parse JSON response with proper error handling
    let optimizationData;
    try {
      const rawContent = response.rawResponse || response.data;

      if (typeof rawContent !== 'string') {
        console.error('Unexpected response format:', typeof rawContent, rawContent);
        throw new Error('AI response is not a string');
      }

      const cleanedResponse = rawContent.replace(/```json\n?|\n?```/g, '').trim();
      optimizationData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      throw new Error('AI returned invalid JSON format');
    }

    // Validate response structure - NO FALLBACKS, throw errors
    if (!optimizationData.overallScore && optimizationData.overallScore !== 0) {
      throw new Error('Invalid optimization format: missing overall score');
    }
    if (!optimizationData.atsCompatibility) {
      throw new Error('Invalid optimization format: missing ATS compatibility data');
    }

    // Cache the results
    try {
      const existingData = job.extractedData ? JSON.parse(job.extractedData) : {};
      await prisma.job.update({
        where: { id: jobId },
        data: {
          extractedData: JSON.stringify({
            ...existingData,
            resumeOptimization: optimizationData,
            resumeOptimizationDate: new Date()
          }),
          updatedAt: new Date()
        }
      });
      console.log('💾 Cached resume optimization');
    } catch (cacheError) {
      console.warn('Failed to cache optimization:', cacheError);
    }

    console.log(`✅ [${requestId}] Resume optimization completed in ${processingTime}ms`);

    return NextResponse.json({
      cached: false,
      optimization: optimizationData,
      job: {
        id: job.id,
        title: job.title,
        company: job.company
      }
    });

  } catch (error) {
    console.error('Resume optimization failed:', error);

    return NextResponse.json({
      error: 'Resume optimization failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST method - just calls GET for consistency
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return GET(request, { params });
}
