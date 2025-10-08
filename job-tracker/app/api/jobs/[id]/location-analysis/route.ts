import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { unifiedAI } from '@/lib/services/unified-ai-service';
import { gpt5Service } from '@/lib/services/gpt5-service';

export const runtime = 'nodejs';

// GET method for location analysis - cache check and fresh analysis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🌍 [${requestId}] Location analysis API called`);

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

    console.log(`📍 Location: ${job.location || 'Unknown'}`);

    // Handle cache check parameter
    const checkCache = request.nextUrl.searchParams.get('checkCache') === 'true';
    const forceRefresh = request.nextUrl.searchParams.get('forceRefresh') === 'true';

    // If this is just a cache check, only check cache and return
    if (checkCache) {
      if (job.extractedData) {
        try {
          const cached = JSON.parse(job.extractedData);
          if (cached.locationAnalysis && cached.locationAnalysisDate) {
            const hoursSinceAnalysis = (Date.now() - new Date(cached.locationAnalysisDate).getTime()) / (1000 * 60 * 60);

            if (hoursSinceAnalysis < 48) { // 48 hours cache for location data
              // Validate cached structure
              const cachedAnalysis = cached.locationAnalysis;
              if (!cachedAnalysis?.location?.city) {
                console.warn(`⚠️ [${requestId}] Cached analysis has invalid structure, forcing refresh`);
                // Continue to indicate no cache
              } else {
                console.log(`🏠 [${requestId}] Returning cached location analysis (${hoursSinceAnalysis.toFixed(1)}h old)`);
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
      console.log(`📭 [${requestId}] No cached location analysis found`);
      return NextResponse.json({
        cached: false,
        analysis: null
      });
    }

    // Check cache unless force refresh
    if (!forceRefresh && job.extractedData) {
      try {
        const cached = JSON.parse(job.extractedData);
        if (cached.locationAnalysis && cached.locationAnalysisDate) {
          const hoursSinceAnalysis = (Date.now() - new Date(cached.locationAnalysisDate).getTime()) / (1000 * 60 * 60);

          if (hoursSinceAnalysis < 48) {
            // Validate cached structure
            const cachedAnalysis = cached.locationAnalysis;
            if (!cachedAnalysis?.location?.city) {
              console.warn(`⚠️ [${requestId}] Cached analysis has invalid structure, forcing refresh`);
              // Continue to fresh analysis
            } else {
              console.log(`🏠 [${requestId}] Using cached location analysis (${hoursSinceAnalysis.toFixed(1)}h old)`);
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

    console.log(`🔍 Starting REAL web search for location data: ${job.location}`);

    // Get salary data if available
    let salaryInfo = 'Not provided';
    if (job.extractedData) {
      try {
        const extracted = JSON.parse(job.extractedData);
        if (extracted.enhancedSalaryAnalysis?.salaryIntelligence?.range) {
          const range = extracted.enhancedSalaryAnalysis.salaryIntelligence.range;
          salaryInfo = `${range.currency} ${range.min.toLocaleString()}-${range.max.toLocaleString()}`;
        } else if (job.salaryMin || job.salaryMax) {
          salaryInfo = `${job.salaryMin || '?'}-${job.salaryMax || '?'}`;
        }
      } catch (e) {
        if (job.salaryMin || job.salaryMax) {
          salaryInfo = `${job.salaryMin || '?'}-${job.salaryMax || '?'}`;
        }
      }
    }

    // STEP 1 & 2: Run web searches in PARALLEL for speed (same pattern as salary intel)
    const costOfLivingQuery = `"${job.location}" cost of living 2025 rent prices transportation food utilities numbeo expatistan`;
    const qualityOfLifeQuery = `"${job.location}" quality of life 2025 safety healthcare infrastructure environment teleport mercer`;

    console.log(`💰 Searching cost of living: ${costOfLivingQuery.substring(0, 100)}...`);
    console.log(`🏥 Searching quality of life: ${qualityOfLifeQuery.substring(0, 100)}...`);

    const [costSearchResults, qualitySearchResults] = await Promise.all([
      gpt5Service.searchWeb(costOfLivingQuery, {
        userId: user.id,
        maxResults: 5,
        domains: [
          'numbeo.com',
          'expatistan.com',
          'livingcost.org',
          'costofliving.net'
        ],
        searchType: 'general',
        reasoning: 'low' // Low reasoning for speed
      }),
      gpt5Service.searchWeb(qualityOfLifeQuery, {
        userId: user.id,
        maxResults: 5,
        domains: [
          'teleport.org',
          'numbeo.com',
          'mercer.com',
          'economist.com',
          'expatistan.com'
        ],
        searchType: 'general',
        reasoning: 'low' // Low reasoning for speed
      })
    ]);

    console.log(`✅ Found ${costSearchResults.results.length} cost of living sources`);
    console.log(`✅ Found ${qualitySearchResults.results.length} quality of life sources`);

    // Deduplicate sources by URL (keep highest relevance)
    const allSourcesMap = new Map();

    [...costSearchResults.results, ...qualitySearchResults.results].forEach(result => {
      if (result.url) {
        const existing = allSourcesMap.get(result.url);
        if (!existing || (result.relevance || 0) > (existing.relevance || 0)) {
          allSourcesMap.set(result.url, result);
        }
      }
    });

    console.log(`📊 Sources: ${Array.from(allSourcesMap.keys())}`);

    // STEP 3: Analyze with AI using REAL web search data
    console.log(`🤖 Analyzing with AI using real web search data...`);

    const analysisPrompt = `
You are a location and quality of life analyst. Analyze the following REAL web search data to provide comprehensive location intelligence.

**Job Information:**
- Location: ${job.location}
- Job Title: ${job.title}
- Company: ${job.company}
- Salary: ${salaryInfo}
- User Current Location: ${job.user.profile?.currentLocation || 'Not specified'}
- User Experience: ${job.user.profile?.yearsOfExperience || 'Not specified'} years

**REAL WEB SEARCH DATA - Cost of Living:**
${costSearchResults.summary}

**REAL WEB SEARCH DATA - Quality of Life:**
${qualitySearchResults.summary}

**CRITICAL INSTRUCTIONS:**
1. Use ONLY the real web search data provided above - NO MADE-UP NUMBERS
2. For missing data, use reasonable estimates based on location knowledge (e.g., timezone, languages)
3. Extract actual numbers and facts from the web search summaries
4. Be specific and cite the data sources when making claims
5. Factor in the salary amount ${salaryInfo} for affordability analysis
6. **Quality scores MUST be 0-100 range** - if sum exceeds 100, normalize it
7. **Fill ALL fields** - do not leave fields as 0 or "Data not available" unless absolutely no data exists

**Response Format (EXACT JSON structure required):**
{
  "location": {
    "city": "Extract city name from '${job.location}'",
    "country": "Extract country from '${job.location}'",
    "region": "Geographic region (e.g., East Asia, Western Europe)",
    "timezone": "Standard timezone for this location (e.g., KST, EST, CET) - use common knowledge"
  },
  "costOfLiving": {
    "overallIndex": <number from web data, 100 = world average>,
    "housingCostPercentage": <% of salary for housing from web data OR reasonable estimate>,
    "transportationIndex": <from web data OR estimate based on city type>,
    "foodIndex": <from web data OR estimate based on city type>,
    "utilitiesIndex": <from web data OR estimate based on city type>,
    "comparison": "MUST cite specific data from web searches. Format: 'According to [source], cost of living is X% higher/lower than [reference]. Monthly expenses approximately [amount].'",
    "affordabilityRating": "excellent|good|fair|challenging - MUST be based on salary vs cost data"
  },
  "qualityOfLife": {
    "overallScore": <AVERAGE of all subscores below, MUST be 0-100>,
    "healthcare": <from web data OR reasonable estimate 0-100>,
    "safety": <from web data OR reasonable estimate 0-100>,
    "education": <from web data OR reasonable estimate 0-100>,
    "environment": <from web data OR reasonable estimate 0-100>,
    "infrastructure": <from web data OR reasonable estimate 0-100>,
    "workLifeBalance": <from web data OR reasonable estimate 0-100>
  },
  "culturalFactors": {
    "languages": ["List primary language(s) - use common knowledge if not in data"],
    "workCulture": "Describe typical work culture (e.g., hierarchical, work-life balance focus)",
    "socialIntegration": "How easy for expats to integrate (easy/moderate/challenging + brief reason)",
    "expatCommunity": "Size and presence of expat community (large/moderate/small + details)"
  },
  "practicalInfo": {
    "visaRequirements": "General visa guidance for work permit (e.g., 'Work visa typically sponsored by employer')",
    "taxImplications": "General tax info (e.g., 'Progressive tax system 15-45%' or cite from data)",
    "bankingAccess": "Banking accessibility (e.g., 'Easy to open accounts with work visa')",
    "healthcareAccess": "Healthcare system info from web data or general knowledge"
  },
  "recommendations": {
    "neighborhoods": ["3 specific neighborhood recommendations with brief descriptions"],
    "transportationTips": ["3 practical transportation tips with specifics"],
    "culturalTips": ["3 cultural adaptation tips"],
    "financialAdvice": ["3 financial tips based on salary ${salaryInfo} and cost data"]
  }
}

**VALIDATION RULES:**
- overallScore = round(average of healthcare, safety, education, environment, infrastructure, workLifeBalance)
- All quality scores: 0-100 only
- NEVER say "Data not available in sources" - provide reasonable estimates
- ALL array fields must have 3 items minimum
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
    if (!analysisData.location?.city) {
      throw new Error('Invalid analysis format: missing location city');
    }
    if (!analysisData.costOfLiving) {
      throw new Error('Invalid analysis format: missing cost of living data');
    }

    // Build web sources array with proper deduplication and relevance conversion
    const webSources = Array.from(allSourcesMap.values()).map(result => ({
      title: result.title || 'Web Source',
      url: result.url,
      type: costSearchResults.results.some(r => r.url === result.url) ? 'Cost of Living' : 'Quality of Life',
      relevance: Math.round((result.relevance || 0.5) * 100) // Convert to percentage
    }));

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
            locationAnalysis: finalAnalysis,
            locationAnalysisDate: new Date()
          }),
          updatedAt: new Date()
        }
      });
      console.log('💾 Cached location analysis');
    } catch (cacheError) {
      console.warn('Failed to cache analysis:', cacheError);
    }

    console.log(`✅ [${requestId}] Location analysis completed in ${processingTime}ms`);
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
    console.error('Location analysis failed:', error);

    return NextResponse.json({
      error: 'Location analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST method - just calls GET for consistency with salary analysis
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // POST and GET do the same thing - just trigger the analysis
  // Component expects POST for new analysis, GET for cache checks
  return GET(request, { params });
}
