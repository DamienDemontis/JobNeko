import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { unifiedAI } from '@/lib/services/unified-ai-service';
import { gpt5Service } from '@/lib/services/gpt5-service';
import { enhancedSkillsMatchService } from '@/lib/services/enhanced-skills-match-service';
import { aiTaskTracker, AITaskType, AITaskStatus } from '@/lib/services/ai-task-tracker';

export const runtime = 'nodejs';

// GET method for application strategy analysis - cache check and fresh analysis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`📋 [${requestId}] Application strategy analysis API called`);

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

    // Get job data with user profile
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
          if (cached.applicationStrategyAnalysis && cached.applicationStrategyAnalysisDate) {
            const hoursSinceAnalysis = (Date.now() - new Date(cached.applicationStrategyAnalysisDate).getTime()) / (1000 * 60 * 60);

            if (hoursSinceAnalysis < 48) { // 48 hours cache
              // Validate cached structure
              const cachedAnalysis = cached.applicationStrategyAnalysis;
              if (!cachedAnalysis?.timing?.urgency) {
                console.warn(`⚠️ [${requestId}] Cached analysis has invalid structure, forcing refresh`);
              } else {
                console.log(`📋 [${requestId}] Returning cached application strategy (${hoursSinceAnalysis.toFixed(1)}h old)`);
                return NextResponse.json({
                  cached: true,
                  analysis: cachedAnalysis,
                  cacheAge: `${hoursSinceAnalysis.toFixed(1)} hours`,
                  job: {
                    id: job.id,
                    title: job.title,
                    company: job.company,
                    location: job.location
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
      console.log(`📭 [${requestId}] No cached application strategy found`);
      return NextResponse.json({
        cached: false,
        analysis: null
      });
    }

    // Check cache unless force refresh
    if (!forceRefresh && job.extractedData) {
      try {
        const cached = JSON.parse(job.extractedData);
        if (cached.applicationStrategyAnalysis && cached.applicationStrategyAnalysisDate) {
          const hoursSinceAnalysis = (Date.now() - new Date(cached.applicationStrategyAnalysisDate).getTime()) / (1000 * 60 * 60);

          if (hoursSinceAnalysis < 48) {
            // Validate cached structure
            const cachedAnalysis = cached.applicationStrategyAnalysis;
            if (!cachedAnalysis?.timing?.urgency) {
              console.warn(`⚠️ [${requestId}] Cached analysis has invalid structure, forcing refresh`);
            } else {
              console.log(`📋 [${requestId}] Using cached application strategy (${hoursSinceAnalysis.toFixed(1)}h old)`);
              return NextResponse.json({
                cached: true,
                analysis: cachedAnalysis,
                cacheAge: `${hoursSinceAnalysis.toFixed(1)} hours`,
                job: {
                  id: job.id,
                  title: job.title,
                  company: job.company,
                  location: job.location
                }
              });
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ [${requestId}] Failed to parse cached data:`, error);
      }
    }

    console.log(`🔍 Starting REAL web search for application strategy: ${job.title} at ${job.company}`);

    // Get actual uploaded resume from database (same as resume-optimization)
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
        error: 'No resume found. Please upload a resume first to get application strategy.'
      }, { status: 400 });
    }

    const resumeContent = resume.content;
    const resumeSummary = resumeContent.substring(0, 2000);

    // Get job description
    const jobDescription = job.description || 'No description available';

    // STEP 1 & 2: Run web searches in PARALLEL for speed
    const atsOptimizationQuery = `"${job.title}" ATS optimization keywords resume 2025 applicant tracking system best practices`;
    const applicationStrategyQuery = `"${job.company}" application process hiring timeline interview process 2025`;
    const industryTimingQuery = `"${job.title}" best time to apply job posting response rate hiring timeline`;

    console.log(`🎯 Searching ATS optimization: ${atsOptimizationQuery.substring(0, 100)}...`);
    console.log(`🏢 Searching company application process: ${applicationStrategyQuery.substring(0, 100)}...`);
    console.log(`⏰ Searching timing strategies: ${industryTimingQuery.substring(0, 100)}...`);

    const [atsSearchResults, companySearchResults, timingSearchResults] = await Promise.all([
      gpt5Service.searchWeb(atsOptimizationQuery, {
        userId: user.id,
        maxResults: 5,
        searchType: 'general',
        reasoning: 'low' // Low reasoning for speed
      }),
      gpt5Service.searchWeb(applicationStrategyQuery, {
        userId: user.id,
        maxResults: 5,
        searchType: 'general',
        reasoning: 'low'
      }),
      gpt5Service.searchWeb(industryTimingQuery, {
        userId: user.id,
        maxResults: 5,
        searchType: 'general',
        reasoning: 'low'
      })
    ]);

    console.log(`✅ Found ${atsSearchResults.results.length} ATS optimization sources`);
    console.log(`✅ Found ${companySearchResults.results.length} company application sources`);
    console.log(`✅ Found ${timingSearchResults.results.length} timing strategy sources`);

    // Deduplicate sources by URL (keep highest relevance)
    const allSourcesMap = new Map();

    [...atsSearchResults.results, ...companySearchResults.results, ...timingSearchResults.results].forEach(result => {
      if (result.url) {
        const existing = allSourcesMap.get(result.url);
        if (!existing || (result.relevance || 0) > (existing.relevance || 0)) {
          allSourcesMap.set(result.url, result);
        }
      }
    });

    console.log(`📊 Sources: ${Array.from(allSourcesMap.keys())}`);

    // STEP 3: Get enhanced skills match analysis (shared across all tabs)
    console.log(`🎯 Calculating enhanced skills match...`);

    // Get user's API key
    const { getUserApiKey } = await import('@/lib/utils/api-key-helper');
    const apiKey = await getUserApiKey(user.id);

    // Parse resume data
    let resumeSkills: string[] = [];
    let resumeExperience: any = null;
    let resumeEducation: any = null;
    try {
      if (resume.skills) resumeSkills = JSON.parse(resume.skills);
      if (resume.experience) resumeExperience = JSON.parse(resume.experience);
      if (resume.education) resumeEducation = JSON.parse(resume.education);
    } catch (error) {
      console.warn('Failed to parse resume structured data:', error);
    }

    // Parse job skills
    let jobSkills: string[] | undefined;
    if (job.skills) {
      jobSkills = job.skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    const matchResult = await enhancedSkillsMatchService.calculateMatch({
      userId: user.id,
      jobId: jobId,
      resumeId: resume.id,
      resumeContent: resumeContent,
      resumeSkills,
      resumeExperience,
      resumeEducation,
      jobTitle: job.title,
      jobCompany: job.company,
      jobDescription: jobDescription,
      jobRequirements: job.requirements || '',
      jobSkills,
      jobLocation: job.location,
      forceRecalculate: false, // Use cache if available
      apiKey
    });

    console.log(`✅ Skills match: ${matchResult.overallScore}% (${matchResult.matchingSkills.length} exact, ${matchResult.partialMatches.length} partial, ${matchResult.missingSkills.length} missing)`);

    // STEP 4: Analyze with AI using REAL web search data + enhanced match
    console.log(`🤖 Analyzing with AI using real web search data + match analysis...`);

    const analysisPrompt = `
You are an application strategy and career coach expert. Analyze the following REAL web search data to provide comprehensive application strategy intelligence.

**Job Information:**
- Job Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Posted Date: ${job.postedDate ? new Date(job.postedDate).toLocaleDateString() : 'Unknown'}
- Application Deadline: ${job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'Not specified'}

**User Profile:**
- Experience: ${job.user.profile?.yearsOfExperience || 'Not specified'} years
- Current Location: ${job.user.profile?.currentLocation || 'Not specified'}

**Resume Summary:**
${resumeSummary}

**Job Description:**
${jobDescription.substring(0, 2000)}

**REAL WEB SEARCH DATA - ATS Optimization:**
${atsSearchResults.summary}

**REAL WEB SEARCH DATA - Company Application Process:**
${companySearchResults.summary}

**REAL WEB SEARCH DATA - Timing Strategies:**
${timingSearchResults.summary}

**ENHANCED SKILLS MATCH ANALYSIS (Pre-calculated - USE THESE EXACT VALUES):**
- Overall Match Score: ${matchResult.overallScore}%
- Confidence: ${(matchResult.confidence * 100).toFixed(1)}%
- Matching Skills (${matchResult.matchingSkills.length}): ${matchResult.matchingSkills.join(', ') || 'None'}
- Partial Matches (${matchResult.partialMatches.length}): ${matchResult.partialMatches.join(', ') || 'None'}
- Missing Skills (${matchResult.missingSkills.length}): ${matchResult.missingSkills.join(', ') || 'None'}
- Matched ATS Keywords: ${matchResult.atsKeywords.matched.join(', ') || 'None'}
- Missing ATS Keywords: ${matchResult.atsKeywords.missing.join(', ') || 'None'}
- Experience Match: ${matchResult.components.experience}%
- Education Match: ${matchResult.components.education}%
- Explanation: ${matchResult.matchExplanation}

**CRITICAL INSTRUCTIONS:**
1. Use ONLY the real web search data and enhanced skills match analysis - NO MADE-UP INFORMATION
2. For ATS data, use the EXACT pre-calculated values above - DO NOT recalculate
3. Focus on actionable recommendations based on missing skills and ATS keywords
4. Use matched vs missing keywords to optimize resume for ATS
5. For timing recommendations, use actual data from timing strategies search
6. Be specific and cite sources when making claims

**Response Format (EXACT JSON structure required):**
{
  "timing": {
    "urgency": "low|medium|high|critical",
    "daysRemaining": <number or null if no deadline>,
    "optimalApplicationWindow": "Apply within 2-3 days of posting|Apply this week|Apply immediately",
    "bestDaysToApply": ["Tuesday", "Wednesday"],
    "reasoning": "Detailed explanation based on posting date, deadline, and timing research data"
  },
  "atsOptimization": {
    "keywordsFromJob": ${JSON.stringify(matchResult.atsKeywords.matched)},
    "missingFromResume": ${JSON.stringify(matchResult.atsKeywords.missing)},
    "matchScore": ${matchResult.overallScore},
    "recommendations": ${JSON.stringify(matchResult.atsKeywords.recommendations)}
  },
  "applicationProcess": {
    "expectedTimeline": {
      "application": "Submit within X days",
      "initialReview": "X-Y days after submission",
      "firstInterview": "X-Y weeks after application",
      "totalProcess": "X-Y weeks total"
    },
    "companySpecificInsights": [
      "Insight 1 from company search data",
      "Insight 2 from company search data",
      "Insight 3 from company search data"
    ],
    "interviewProcess": [
      {
        "stage": "Phone Screen",
        "duration": "30 minutes",
        "focus": "Background and motivation"
      },
      {
        "stage": "Technical Interview",
        "duration": "60-90 minutes",
        "focus": "Skills assessment"
      },
      {
        "stage": "Final Interview",
        "duration": "45-60 minutes",
        "focus": "Culture fit and offer discussion"
      }
    ]
  },
  "resumeOptimization": {
    "strengthsToHighlight": [
      "Strength 1 from user resume that matches job",
      "Strength 2 from user resume that matches job",
      "Strength 3 from user resume that matches job"
    ],
    "gapsToAddress": [
      "Gap 1 with suggested approach",
      "Gap 2 with suggested approach"
    ],
    "customizationTips": [
      "Specific tip 1 for this job/company",
      "Specific tip 2 for this job/company",
      "Specific tip 3 for this job/company"
    ]
  },
  "coverLetterGuidance": {
    "keyPoints": [
      "Point 1 to emphasize based on job description",
      "Point 2 to emphasize based on company research",
      "Point 3 to emphasize based on user background"
    ],
    "companyResearch": [
      "Fact 1 about company from web search",
      "Fact 2 about company from web search",
      "Fact 3 about company from web search"
    ],
    "suggestedStructure": [
      "Opening: Hook related to company mission or recent news",
      "Body 1: Highlight relevant experience matching job requirement X",
      "Body 2: Demonstrate understanding of company challenge Y",
      "Closing: Express enthusiasm and propose specific value add"
    ]
  },
  "competitionAnalysis": {
    "estimatedCompetition": "low|medium|high",
    "reasoning": "Explanation based on timing, job requirements, and market data",
    "differentiationStrategy": [
      "Strategy 1 to stand out",
      "Strategy 2 to stand out",
      "Strategy 3 to stand out"
    ]
  },
  "actionItems": [
    {
      "priority": "high|medium|low",
      "action": "Specific action item",
      "estimatedTime": "X minutes/hours",
      "rationale": "Why this matters"
    }
  ]
}

**VALIDATION RULES:**
- timing.urgency must be one of: low|medium|high|critical
- atsOptimization.matchScore must be 0-100
- ALL array fields must have at least 2-3 items
- interviewProcess must have at least 2 stages
- actionItems must be prioritized (at least 1 high priority)
- NEVER say "Data not available" - provide reasonable estimates based on industry standards
- Return ONLY the JSON object, no additional text
`;

    const startTime = Date.now();

    const response = await unifiedAI.complete(
      analysisPrompt,
      'gpt-5-mini',
      'medium',
      user.id // Pass userId - AI service fetches API key automatically
    );

    const processingTime = Date.now() - startTime;

    if (!response.success) {
      const errorMsg = response.error?.message || 'Unknown error';
      const errorDetails = response.error?.details ? JSON.stringify(response.error.details) : '';
      console.error('❌ AI Analysis Failed:', {
        type: response.error?.type,
        message: response.error?.message,
        details: response.error?.details,
        originalResponse: response.error?.originalResponse
      });
      throw new Error(`AI analysis failed: ${errorMsg}${errorDetails ? ' - ' + errorDetails : ''}`);
    }

    // Parse JSON response with proper error handling
    let analysisData;
    try {
      const rawContent = response.rawResponse || response.data;

      if (typeof rawContent !== 'string') {
        console.error('Unexpected response format:', typeof rawContent, rawContent);
        throw new Error('AI response is not a string');
      }

      const cleanedResponse = rawContent.replace(/```json\n?|\n?```/g, '').trim();
      analysisData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Response structure:', {
        hasData: !!response.data,
        hasRawResponse: !!response.rawResponse,
        dataType: typeof response.data,
        rawResponseType: typeof response.rawResponse
      });
      throw new Error('AI returned invalid JSON format');
    }

    // Validate response structure - NO FALLBACKS, throw errors
    if (!analysisData.timing?.urgency) {
      throw new Error('Invalid analysis format: missing timing urgency');
    }
    if (!analysisData.atsOptimization) {
      throw new Error('Invalid analysis format: missing ATS optimization data');
    }

    // Build web sources array with proper deduplication and relevance conversion
    const webSources = Array.from(allSourcesMap.values()).map(result => {
      let type = 'General';
      if (atsSearchResults.results.some(r => r.url === result.url)) {
        type = 'ATS Optimization';
      } else if (companySearchResults.results.some(r => r.url === result.url)) {
        type = 'Company Process';
      } else if (timingSearchResults.results.some(r => r.url === result.url)) {
        type = 'Timing Strategy';
      }

      return {
        title: result.title || 'Web Source',
        url: result.url,
        type,
        relevance: Math.round((result.relevance || 0.5) * 100)
      };
    });

    // Add sources to analysis
    const finalAnalysis = {
      ...analysisData,
      sources: {
        webSources
      }
    };

    // Cache the results
    try {
      const existingData = job.extractedData ? JSON.parse(job.extractedData) : {};
      await prisma.job.update({
        where: { id: jobId },
        data: {
          extractedData: JSON.stringify({
            ...existingData,
            applicationStrategyAnalysis: finalAnalysis,
            applicationStrategyAnalysisDate: new Date()
          }),
          updatedAt: new Date()
        }
      });
      console.log('💾 Cached application strategy analysis');
    } catch (cacheError) {
      console.warn('Failed to cache analysis:', cacheError);
    }

    console.log(`✅ [${requestId}] Application strategy analysis completed in ${processingTime}ms`);
    console.log(`📤 [${requestId}] Returning analysis with ${webSources.length} sources`);

    return NextResponse.json({
      cached: false,
      analysis: finalAnalysis,
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location
      }
    });

  } catch (error) {
    console.error('Application strategy analysis failed:', error);

    return NextResponse.json({
      error: 'Application strategy analysis failed',
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
