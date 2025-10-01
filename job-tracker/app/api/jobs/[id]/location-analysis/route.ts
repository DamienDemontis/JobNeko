import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { unifiedAI } from '@/lib/services/unified-ai-service';

export const runtime = 'nodejs';

// GET method for location analysis cache check
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

    // Check if this is a cache check
    const checkCache = request.nextUrl.searchParams.get('checkCache') === 'true';

    if (checkCache) {
      if (job.extractedData) {
        try {
          const cached = JSON.parse(job.extractedData);
          if (cached.locationAnalysis && cached.locationAnalysisDate) {
            const hoursSinceAnalysis = (Date.now() - new Date(cached.locationAnalysisDate).getTime()) / (1000 * 60 * 60);

            if (hoursSinceAnalysis < 48) { // 48 hours cache for location data
              console.log(`🏠 [${requestId}] Returning cached location analysis (${hoursSinceAnalysis.toFixed(1)}h old)`);
              return NextResponse.json({
                cached: true,
                analysis: cached.locationAnalysis,
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

    // This shouldn't happen for GET requests without cache check
    return NextResponse.json({ error: 'Use POST for new analysis' }, { status: 405 });

  } catch (error) {
    console.error('Location analysis cache check failed:', error);
    return NextResponse.json({
      error: 'Cache check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST method for generating new location analysis
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🌍 [${requestId}] Location analysis generation started`);

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

    // Get request body
    const body = await request.json();
    const { location, jobTitle, company, salaryData, forceRefresh } = body;

    // Check cache unless force refresh
    if (!forceRefresh && job.extractedData) {
      try {
        const cached = JSON.parse(job.extractedData);
        if (cached.locationAnalysis && cached.locationAnalysisDate) {
          const hoursSinceAnalysis = (Date.now() - new Date(cached.locationAnalysisDate).getTime()) / (1000 * 60 * 60);

          if (hoursSinceAnalysis < 48) {
            console.log(`🏠 [${requestId}] Using cached location analysis (${hoursSinceAnalysis.toFixed(1)}h old)`);
            return NextResponse.json({
              success: true,
              analysis: cached.locationAnalysis,
              cached: true,
              cacheAge: `${hoursSinceAnalysis.toFixed(1)} hours`
            });
          }
        }
      } catch (error) {
        console.warn(`⚠️ [${requestId}] Failed to parse cached data:`, error);
      }
    }

    // Generate comprehensive location analysis
    console.log(`🔍 Starting location analysis for: ${location}`);

    const analysisPrompt = `
You are a location and quality of life analyst with expertise in global cities and cost of living analysis.

**Location Analysis Request:**
- Location: ${location}
- Job Title: ${jobTitle}
- Company: ${company}
- Salary Data: ${salaryData ? `${salaryData.currency} ${salaryData.min}-${salaryData.max} (median: ${salaryData.median})${salaryData.isFixed ? ' - Fixed amount' : ''}` : 'Not provided'}
- User Profile: Current location: ${job.user.profile?.currentLocation || 'Not specified'}, Experience: ${job.user.profile?.yearsOfExperience || 'Not specified'} years

**Analysis Requirements:**
Provide comprehensive location intelligence including:
- Cost of living analysis with salary affordability
- Quality of life metrics across multiple dimensions
- Cultural factors and integration considerations
- Practical information for relocation/living
- Specific recommendations based on the role and salary

**CRITICAL: Generate realistic, specific data - no generic responses**

**Response Format (EXACT JSON structure required):**
{
  "location": {
    "city": "Extract specific city name",
    "country": "Country name",
    "region": "Region/state/prefecture",
    "timezone": "Timezone (e.g., JST, EST, CET)"
  },
  "costOfLiving": {
    "overallIndex": <number 50-150 relative to global average>,
    "housingCostPercentage": <realistic % of salary for decent housing>,
    "transportationIndex": <number 40-120>,
    "foodIndex": <number 40-120>,
    "utilitiesIndex": <number 40-120>,
    "comparison": "Detailed cost comparison: X% higher/lower than global average. With ${salaryData?.currency || 'USD'} ${salaryData?.median || 'X'}, expect comfortable/tight living standards.",
    "affordabilityRating": "excellent|good|fair|challenging"
  },
  "qualityOfLife": {
    "overallScore": <number 30-95>,
    "healthcare": <number 40-95>,
    "safety": <number 30-95>,
    "education": <number 40-95>,
    "environment": <number 30-90>,
    "infrastructure": <number 40-95>,
    "workLifeBalance": <number 30-90>
  },
  "culturalFactors": {
    "languages": ["Primary language", "Secondary languages"],
    "workCulture": "Brief description of work culture and expectations",
    "socialIntegration": "How easy it is to integrate socially",
    "expatCommunity": "Description of expat/international community presence"
  },
  "practicalInfo": {
    "visaRequirements": "Visa requirements for this location based on typical profile",
    "taxImplications": "Tax considerations and implications",
    "bankingAccess": "Banking and financial services access",
    "healthcareAccess": "Healthcare system and access information"
  },
  "recommendations": {
    "neighborhoods": ["Recommended area 1", "Recommended area 2", "Recommended area 3"],
    "transportationTips": ["Transportation tip 1", "Transportation tip 2", "Transportation tip 3"],
    "culturalTips": ["Cultural tip 1", "Cultural tip 2", "Cultural tip 3"],
    "financialAdvice": ["Financial advice 1", "Financial advice 2", "Financial advice 3"]
  },
  "sources": {
    "webSources": [
      {
        "title": "Numbeo - ${location} Cost of Living",
        "url": "https://www.numbeo.com",
        "relevance": 0.95,
        "type": "cost_data"
      },
      {
        "title": "Expatistan - ${location} Prices",
        "url": "https://www.expatistan.com",
        "relevance": 0.9,
        "type": "cost_data"
      },
      {
        "title": "Mercer Quality of Living Survey",
        "url": "https://www.mercer.com",
        "relevance": 0.85,
        "type": "quality_data"
      },
      {
        "title": "OECD Better Life Index",
        "url": "https://www.oecdbetterlifeindex.org",
        "relevance": 0.8,
        "type": "quality_data"
      },
      {
        "title": "Teleport Cities Database",
        "url": "https://teleport.org",
        "relevance": 0.85,
        "type": "city_data"
      },
      {
        "title": "Local government/tourism site",
        "url": "https://official-site.gov",
        "relevance": 0.75,
        "type": "official_data"
      },
      {
        "title": "Expat forums and communities",
        "url": "https://expat-community.com",
        "relevance": 0.7,
        "type": "community_data"
      },
      {
        "title": "International tax and visa guides",
        "url": "https://visa-guide.com",
        "relevance": 0.8,
        "type": "legal_data"
      }
    ]
  }
}

IMPORTANT:
- Provide realistic, location-specific data based on actual knowledge
- Factor in the salary amount for affordability analysis
- Consider the job type and industry for cultural fit
- Include practical advice relevant to the specific situation
- Return ONLY the JSON object, no additional text
`;

    const startTime = Date.now();

    const response = await unifiedAI.complete(
      analysisPrompt,
      'gpt-5-mini',
      'medium'
    );

    const processingTime = Date.now() - startTime;

    if (!response.success) {
      throw new Error(`AI analysis failed: ${response.error}`);
    }

    // Parse JSON response
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
      throw new Error('AI returned invalid JSON format');
    }

    // Validate response structure
    if (!analysisData.location?.city || !analysisData.costOfLiving) {
      throw new Error('Invalid analysis format: missing required fields');
    }

    // Cache the results
    try {
      const existingData = job.extractedData ? JSON.parse(job.extractedData) : {};
      await prisma.job.update({
        where: { id: jobId },
        data: {
          extractedData: JSON.stringify({
            ...existingData,
            locationAnalysis: analysisData,
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

    return NextResponse.json({
      success: true,
      analysis: analysisData,
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