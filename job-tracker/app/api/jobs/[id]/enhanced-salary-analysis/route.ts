import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { unifiedAI } from '@/lib/services/unified-ai-service';
import { gpt5Service } from '@/lib/services/gpt5-service';

export const runtime = 'nodejs';

// GET method for simplified salary analysis - NO COMPLEX CACHING
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🚀 [${requestId}] Enhanced salary analysis API called`);

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

    // Get user's active resume for skills analysis
    const resume = await prisma.resume.findFirst({
      where: {
        userId: user.id,
        isActive: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (!resume || !resume.content) {
      return NextResponse.json({
        error: 'No active resume found. Please upload a resume to get personalized salary analysis.'
      }, { status: 400 });
    }

    // Parse resume data
    let resumeSkills: string[] = [];
    let resumeExperience: any = null;

    try {
      if (resume.skills) resumeSkills = JSON.parse(resume.skills);
      if (resume.experience) resumeExperience = JSON.parse(resume.experience);
    } catch (error) {
      console.warn('Failed to parse resume structured data:', error);
    }

    console.log(`📄 Resume loaded: ${resumeSkills.length} skills extracted`);

    // Detect currency based on job location
    const detectCurrency = (location: string): string => {
      const loc = location.toLowerCase();
      if (loc.includes('korea') || loc.includes('seoul') || loc.includes('busan')) return 'KRW';
      if (loc.includes('japan') || loc.includes('tokyo')) return 'JPY';
      if (loc.includes('china') || loc.includes('beijing') || loc.includes('shanghai')) return 'CNY';
      if (loc.includes('india') || loc.includes('bangalore') || loc.includes('mumbai')) return 'INR';
      if (loc.includes('uk') || loc.includes('london') || loc.includes('united kingdom')) return 'GBP';
      if (loc.includes('france') || loc.includes('paris') || loc.includes('germany') || loc.includes('berlin') || loc.includes('europe')) return 'EUR';
      if (loc.includes('singapore')) return 'SGD';
      if (loc.includes('australia') || loc.includes('sydney')) return 'AUD';
      if (loc.includes('canada') || loc.includes('toronto')) return 'CAD';
      return 'USD'; // Default
    };

    const expectedCurrency = detectCurrency(job.location || 'US');
    console.log(`💱 Detected currency for ${job.location || 'Unknown'}: ${expectedCurrency}`);
    console.log(`💰 User salary info: Current=${job.user.profile?.currentSalary}, Expected=${job.user.profile?.expectedSalaryMin}-${job.user.profile?.expectedSalaryMax}, Currency=${job.user.profile?.preferredCurrency}`);

    // Handle cache check parameter
    const checkCache = request.nextUrl.searchParams.get('checkCache') === 'true';
    const forceRefresh = request.nextUrl.searchParams.get('forceRefresh') === 'true';

    // If this is just a cache check, only check cache and return
    if (checkCache) {
      if (job.extractedData) {
        try {
          const cached = JSON.parse(job.extractedData);
          if (cached.enhancedSalaryAnalysis && cached.salaryAnalysisDate) {
            const hoursSinceAnalysis = (Date.now() - new Date(cached.salaryAnalysisDate).getTime()) / (1000 * 60 * 60);

            if (hoursSinceAnalysis < 24) {
              // Check if cached data has the correct structure
              const cachedAnalysis = cached.enhancedSalaryAnalysis;
              if (!cachedAnalysis?.salaryIntelligence?.range) {
                console.warn(`⚠️ [${requestId}] Cached analysis has invalid structure, forcing refresh`);
                // Continue to fresh analysis instead of returning invalid cache
              } else {
                console.log(`📋 [${requestId}] Returning cached analysis (${hoursSinceAnalysis.toFixed(1)}h old)`);
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
      console.log(`📭 [${requestId}] No cached analysis found`);
      return NextResponse.json({
        cached: false,
        analysis: null
      });
    }

    if (!forceRefresh && job.extractedData) {
      try {
        const cached = JSON.parse(job.extractedData);
        if (cached.enhancedSalaryAnalysis && cached.salaryAnalysisDate) {
          const hoursSinceAnalysis = (Date.now() - new Date(cached.salaryAnalysisDate).getTime()) / (1000 * 60 * 60);

          if (hoursSinceAnalysis < 24) {
            // Validate cached structure
            const cachedAnalysis = cached.enhancedSalaryAnalysis;
            if (!cachedAnalysis?.salaryIntelligence?.range) {
              console.warn(`⚠️ [${requestId}] Cached analysis has invalid structure, forcing refresh`);
              // Continue to fresh analysis
            } else {
              console.log(`📋 [${requestId}] Using cached enhanced salary analysis (${hoursSinceAnalysis.toFixed(1)}h old)`);
              return NextResponse.json({
                success: true,
                analysis: cachedAnalysis,
                cached: true,
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

    // STEP 1: Perform REAL web searches for salary data (IN PARALLEL for speed)
    console.log(`🔍 Starting REAL web search for salary data: ${job.title} at ${job.company}`);

    const currentYear = new Date().getFullYear();

    // Search queries - emphasize location/country for better geo-targeting
    const jobLocation = job.location || 'Unknown';
    const locationEmphasis = jobLocation.includes('Remote')
      ? jobLocation.replace('Remote', '').trim() || jobLocation
      : jobLocation;
    const salaryQuery = `"${job.title}" salary "${locationEmphasis}" ${currentYear} ${job.company} ${expectedCurrency} compensation levels.fyi glassdoor`;
    const companyQuery = `"${job.company}" employee reviews benefits culture ${currentYear} glassdoor indeed`;

    console.log(`💰 Searching salary: ${salaryQuery}`);
    console.log(`🏢 Searching company: ${companyQuery}`);

    // Run BOTH searches in parallel to save time
    const [salarySearchResults, companySearchResults] = await Promise.all([
      gpt5Service.searchWeb(salaryQuery, {
        userId: user.id,
        maxResults: 5, // Reduced from 10 for speed
        domains: [
          'glassdoor.com',
          'levels.fyi',
          'salary.com',
          'payscale.com',
          'indeed.com',
          'linkedin.com'
        ],
        searchType: 'salary',
        reasoning: 'low' // Low reasoning for speed - GPT-5 will do fewer autonomous searches
      }),
      gpt5Service.searchWeb(companyQuery, {
        userId: user.id,
        maxResults: 3, // Reduced from 5 for speed
        domains: [
          'glassdoor.com',
          'indeed.com',
          'linkedin.com',
          'comparably.com'
        ],
        searchType: 'company',
        reasoning: 'low' // Low reasoning for speed
      })
    ]);

    console.log(`✅ Found ${salarySearchResults.results.length} salary sources`);
    console.log(`✅ Found ${companySearchResults.results.length} company sources`);
    console.log(`📊 Sources:`, salarySearchResults.results.map(r => r.url).filter(u => u));

    // STEP 2: Generate analysis using REAL web search data
    console.log(`🤖 Analyzing with AI using real web search data...`);

    const analysisPrompt = `
You are a senior compensation analyst. Provide CONCISE, STRUCTURED salary intelligence based on REAL web search data provided below.

**CRITICAL: Use ONLY the web search data provided. DO NOT make up sources or data.**

**WEB SEARCH RESULTS - SALARY DATA:**
${salarySearchResults.results.map((r, i) => `
Source ${i + 1}: ${r.title}
URL: ${r.url}
Data: ${r.content}
`).join('\n')}

Summary: ${salarySearchResults.summary}

**WEB SEARCH RESULTS - COMPANY DATA:**
${companySearchResults.results.map((r, i) => `
Source ${i + 1}: ${r.title}
URL: ${r.url}
Data: ${r.content}
`).join('\n')}

Summary: ${companySearchResults.summary}

**CRITICAL: First analyze the job type:**
- VIE/V.I.E: Look for "VIE", "V.I.E", "Volontariat International", "International Volunteer" OR job titles with "M/F" suffix at French companies - FIXED monthly gratification by country
- Check if title is "${job.title}" - if it contains "M/F" and company is French (like Amundi), likely VIE
- Internship: Look for "stage", "internship", "stagiaire" - legal minimums
- Contract: Look for "contractor", "consultant", "freelance" - hourly/daily rates
- Apprenticeship: Look for "apprentice", "alternance" - specific wage scales
- Government: Look for government/public sector indicators - grade scales

FOR VIE POSITIONS: Return FIXED amount! Look up CURRENT VIE monthly gratifications from official sources:
- Use civiweb.com, diplomatie.gouv.fr for accurate current rates
- VIE rates vary by country and are updated regularly by French government
- Include both base gratification + country-specific supplements
- Example format: Base €723 + Country supplement €XXX = Total €YYYY/month
For VIE: set min=max=median=ACCURATE_CURRENT_AMOUNT, isFixed=true, currency="EUR"

**Job Details:**
- Title: ${job.title}
You are a senior compensation analyst. Provide CONCISE, STRUCTURED salary intelligence.

**CRITICAL: First analyze the job type:**
- VIE/V.I.E: Look for "VIE", "V.I.E", "Volontariat International", "International Volunteer" OR job titles with "M/F" suffix at French companies - FIXED monthly gratification by country
- Check if title is "${job.title}" - if it contains "M/F" and company is French (like Amundi), likely VIE
- Internship: Look for "stage", "internship", "stagiaire" - legal minimums
- Contract: Look for "contractor", "consultant", "freelance" - hourly/daily rates
- Apprenticeship: Look for "apprentice", "alternance" - specific wage scales
- Government: Look for government/public sector indicators - grade scales

FOR VIE POSITIONS: Return FIXED amount! Look up CURRENT VIE monthly gratifications from official sources:
- Use civiweb.com, diplomatie.gouv.fr for accurate current rates
- VIE rates vary by country and are updated regularly by French government
- Include both base gratification + country-specific supplements
- Example format: Base €723 + Country supplement €XXX = Total €YYYY/month
For VIE: set min=max=median=ACCURATE_CURRENT_AMOUNT, isFixed=true, currency="EUR"

**Job Details:**
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Full Description: ${job.description || 'Not provided'}
- Salary Info: ${job.salary || job.salaryMin ? `${job.salaryMin || 'N/A'} - ${job.salaryMax || 'N/A'}` : 'Not specified'}

**User Profile:**
- Current Salary: ${job.user.profile?.currentSalary ? `${job.user.profile.currentSalary} ${job.user.profile?.preferredCurrency || 'USD'}` : 'Not specified'}
- Expected: ${job.user.profile?.expectedSalaryMin || job.user.profile?.expectedSalaryMax ? `${job.user.profile.expectedSalaryMin || job.user.profile.expectedSalaryMax} - ${job.user.profile.expectedSalaryMax || job.user.profile.expectedSalaryMin} ${job.user.profile?.preferredCurrency || 'USD'}` : 'Not specified'}
- Salary Currency: ${job.user.profile?.preferredCurrency || 'USD'}
- Experience: ${job.user.profile?.yearsOfExperience || resumeExperience?.totalYears || 'Not specified'} years
- Resume Skills: ${resumeSkills.length > 0 ? resumeSkills.join(', ') : 'No skills extracted from resume'}
- Resume Content: ${resume.content.substring(0, 3000)}...

**IMPORTANT:** You MUST use the resume content and skills above to analyze skill matches. The resume is provided - do NOT say skills are missing.

**CRITICAL REQUIREMENTS:**
1. DETECT special job types (VIE/internship/contract) and adjust analysis accordingly
2. For VIE: Use fixed country gratification rates, NOT market rates
3. Be CONCISE - use bullet points and short phrases
4. Focus ONLY on salary intelligence relevant to THIS job type
5. ALL fields required - adapt them to job type (e.g., VIE has no negotiation)
6. Generate sources relevant to job type (e.g., VIE sources: civiweb.com, diplomatie.gouv.fr)
7. NEVER use "N/A" in salaryProgression fields - if data missing, provide helpful message or omit field entirely
8. CURRENCY HANDLING: User's current/expected salary includes currency (e.g., "40000 EUR"). Job offer is in ${expectedCurrency}. You MUST calculate percentage comparisons by converting currencies if they differ. Use standard exchange rates.

**Response Format (EXACT JSON structure required):**
{
  "compensation": {
    "salaryRange": {
      "min": <For VIE: fixed amount (e.g., 2530 for Japan), For standard: realistic minimum>,
      "max": <For VIE: same as min, For standard: realistic maximum>,
      "median": <For VIE: same as min, For standard: realistic median>,
      "currency": <For VIE: "EUR", For standard: "${expectedCurrency}" (MUST match job location: ${job.location})>,
      "confidence": <For VIE: 0.95, For standard: 0.65-0.92>,
      "isFixed": <true for VIE/internship, false for standard>
    },
    "marketPosition": "below_market|at_market|above_market",
    "marketData": [
      "Specific market data point about ${job.title} salaries in ${job.location}",
      "Industry compensation trends for ${job.title} roles in 2024",
      "Location-specific salary premiums/discounts for ${job.location}",
      "Company size impact on ${job.title} compensation at ${job.company}",
      "Experience level adjustments for ${job.user.profile?.yearsOfExperience || 'X'} years experience",
      "Remote work impact on ${job.title} salaries",
      "Industry-specific bonus and equity structures for this role"
    ]
  },
  "market": {
    "demand": <20-95_realistic_demand_level>,
    "competition": <15-90_realistic_competition_level>,
    "growth": <10-85_realistic_growth_projection>,
    "outlook": "Market outlook: growth trends, automation risk, hiring projections (2-3 sentences max)",
    "timeToHire": "Typical ${job.title} hiring: X-Y weeks",
    "alternativeOpportunities": <5-15_number_of_similar_opportunities>
  },
  "company": {
    "size": "startup|small|medium|large|enterprise",
    "industry": "<specific_industry_for_${job.company}>",
    "compensationPhilosophy": "${job.company} compensation: pay bands, equity, benefits (2 sentences max)",
    "glassdoorRating": <realistic_rating_2.8-4.7>
  },
  "analysis": {
    "jobType": "standard|vie|internship|contract|apprenticeship|government",
    "jobTypeNotes": "For VIE: 'VIE position with fixed €2530/month gratification for Japan'",
    "overallScore": <CALCULATE from resume: (matching_skills / total_required_skills) * 100, realistic range 30-95, MUST be data-driven from actual resume analysis>,
    "careerProgression": "Adapt to job type: VIE->permanent hire pathway, or standard progression",
    "experienceAlignment": "How experience fits THIS job type (VIE requires <28yo, etc.)",
    "experienceJustification": "Justification based on job type constraints",
    "locationAnalysis": "For VIE: country coefficient. For standard: market analysis.",
    "skillsBreakdown": {
      "matchingSkills": ["MUST list ONLY skills found in user's resume that match job requirements - be specific"],
      "missingSkills": ["MUST list ONLY required skills from job description that are NOT in user's resume"],
      "partialMatches": ["MUST list ONLY skills where resume shows related/similar but not exact match"],
      "matchExplanation": "MUST explain: (X matching skills / Y total required) = Z% match, based on actual resume content"
    },
    "negotiationRange": {
      "reasoning": "Target median due to X. Stretch if Y."
    },
    "salaryProgression": {
      "currentVsOffer": "If user current salary provided WITH currency: MUST calculate % increase (convert currencies if needed). Format: 'X% increase from current [amount] [currency]'. If currency missing or cannot convert: state limitation clearly. If NOT provided: 'Current salary not provided in profile'",
      "expectedVsOffer": "If user expected salary provided WITH currency: MUST calculate % comparison (convert currencies if needed). Format: 'Meets/Exceeds/Below expected by X%'. If currency missing or cannot convert: state limitation clearly. If NOT provided: 'Expected salary not set in profile'",
      "growthPotential": "5-year projection in ${expectedCurrency}: [min] to [max] (Z% growth potential)"
    },
    "pros": [
      "Strong market position: X% growth",
      "Clear advancement path to senior roles",
      "Above-market compensation package",
      "Prime ${job.location} location benefits",
      "High-growth industry sector opportunity"
    ],
    "cons": [
      "High competition: X candidates per role",
      "Limited equity compensation",
      "${job.location} cost of living impact",
      "Narrow specialization risk"
    ],
    "recommendations": [
      "Adapt to job type - VIE: no negotiation, standard: anchor at $X",
      "For VIE: ask about conversion to permanent",
      "For standard: negotiate equity/bonus",
      "Job-type specific advice 1",
      "Job-type specific advice 2",
      "Job-type specific advice 3"
    ]
  },
  "contextualRecommendations": {
    "careerAdvice": [
      "Focus on cloud/AI certifications",
      "Network with product team",
      "Build portfolio of measurable wins"
    ],
    "actionItems": [
      "Check ${job.company} on Glassdoor",
      "Compare 3 similar ${job.title} roles",
      "List 5 quantified achievements",
      "Connect with 2 employees on LinkedIn",
      "Draft negotiation talking points",
      "Apply to 2 backup positions"
    ],
    "redFlags": [
      "No salary transparency - request range upfront",
      "High turnover reported - ask about retention"
    ],
    "opportunities": [
      "Market growing 15% annually",
      "Fast-track to lead in 2 years",
      "Learn emerging tech stack",
      "Access to executive network"
    ]
  },
  "profileContext": {
    "contextCompleteness": <70-95_percentage>,
    "keyFactors": ["factor1", "factor2", "factor3"],
    "improvementSuggestions": ["suggestion1", "suggestion2"],
    "dataUsed": {
      "resumeUsed": true,
      "skillsUsed": ${resumeSkills.length > 0},
      "experienceUsed": ${resumeExperience ? true : false},
      "salaryHistoryUsed": ${job.user.profile?.currentSalary ? true : false}
    }
  },
  "sources": {
    "webSources": [
      {
        "title": "Source 1 title based on job type",
        "url": "https://actual-url.com",
        "relevance": 0.9,
        "type": "salary_data|vie_data|market_data"
      },
      {
        "title": "Source 2 title",
        "url": "https://actual-url-2.com",
        "relevance": 0.85,
        "type": "appropriate_type"
      },
      {
        "title": "Generate 6-8 more sources",
        "url": "https://...",
        "relevance": 0.7-0.9,
        "type": "appropriate_type"
      }
    ],
    "dataSources": [
      "AI-powered market analysis",
      "Real-time salary intelligence",
      "Industry benchmarking data"
    ]
  }
}

IMPORTANT:
- Keep ALL text responses ultra-concise (no long sentences)
- Don't discuss interview prep, application tips, or timeline - other tabs cover those
- Focus ONLY on compensation data, market intelligence, and salary negotiation
- For VIE: Generate sources like civiweb.com, diplomatie.gouv.fr, business-france.fr
- For standard: Generate 8+ diverse salary sources (Glassdoor, Payscale, Levels.fyi, etc.)
- ALWAYS populate skillsBreakdown with actual job requirements, even if user has no profile
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
      // Get the actual response content - could be in data or rawResponse
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

    // Validate response structure
    if (!analysisData.compensation?.salaryRange) {
      throw new Error('Invalid analysis format: missing salary range');
    }

    // Transform to PersonalizedSalaryAnalysis format - ALL AI GENERATED DATA ONLY
    const transformedAnalysis = {
      jobType: analysisData.analysis.jobType,
      jobTypeNotes: analysisData.analysis.jobTypeNotes,
      salaryIntelligence: {
        range: {
          min: analysisData.compensation.salaryRange.min,
          max: analysisData.compensation.salaryRange.max,
          median: analysisData.compensation.salaryRange.median,
          currency: analysisData.compensation.salaryRange.currency,
          confidence: analysisData.compensation.salaryRange.confidence,
          isFixed: analysisData.compensation.salaryRange.isFixed || false
        },
        marketPosition: analysisData.compensation.marketPosition,
        negotiationPower: analysisData.analysis.overallScore,
        dataQuality: analysisData.compensation.salaryRange.confidence > 0.7 ? 'good' : 'limited'
      },
      personalizedInsights: {
        fitForProfile: analysisData.analysis.overallScore > 80 ? 'excellent' :
                      analysisData.analysis.overallScore > 65 ? 'good' :
                      analysisData.analysis.overallScore > 50 ? 'fair' : 'poor',
        careerProgression: analysisData.analysis.careerProgression,
        skillsMatch: analysisData.analysis.overallScore, // AI determines based on weighted analysis (partial matches, skill importance, experience depth)
        skillsBreakdown: {
          matchingSkills: analysisData.analysis.skillsBreakdown.matchingSkills || [],
          missingSkills: analysisData.analysis.skillsBreakdown.missingSkills || [],
          partialMatches: analysisData.analysis.skillsBreakdown.partialMatches || [],
          strengthAreas: analysisData.analysis.pros.slice(0, 3),
          improvementAreas: analysisData.analysis.cons.slice(0, 2),
          matchExplanation: analysisData.analysis.skillsBreakdown.matchExplanation
        },
        experienceAlignment: analysisData.analysis.experienceAlignment,
        experienceJustification: analysisData.analysis.experienceJustification,
        locationAnalysis: analysisData.analysis.locationAnalysis,
        negotiationRange: {
          walkAway: Math.round(analysisData.compensation.salaryRange.min * 0.9),
          target: analysisData.compensation.salaryRange.median,
          stretch: Math.round(analysisData.compensation.salaryRange.max * 1.1),
          reasoning: analysisData.analysis.negotiationRange.reasoning
        },
        salaryProgression: {
          currentVsOffer: analysisData.analysis.salaryProgression.currentVsOffer,
          expectedVsOffer: analysisData.analysis.salaryProgression.expectedVsOffer,
          growthPotential: analysisData.analysis.salaryProgression.growthPotential
        }
      },
      contextualRecommendations: {
        negotiationStrategy: analysisData.analysis.recommendations.slice(0, 4),
        careerAdvice: analysisData.contextualRecommendations.careerAdvice,
        actionItems: analysisData.contextualRecommendations.actionItems,
        redFlags: analysisData.contextualRecommendations.redFlags,
        opportunities: analysisData.contextualRecommendations.opportunities
      },
      marketIntelligence: {
        demandLevel: analysisData.market.demand,
        competitionLevel: analysisData.market.competition,
        industryOutlook: analysisData.market.outlook,
        timeToHire: analysisData.market.timeToHire,
        alternativeOpportunities: analysisData.market.alternativeOpportunities
      },
      profileContext: {
        contextCompleteness: analysisData.profileContext.contextCompleteness,
        keyFactors: analysisData.profileContext.keyFactors,
        improvementSuggestions: analysisData.profileContext.improvementSuggestions,
        dataUsed: analysisData.profileContext.dataUsed
      },
      sources: {
        // Use REAL web search sources, not AI-generated fake ones
        // Remove duplicates by URL and keep the highest relevance
        webSources: (() => {
          const allSources = [
            ...salarySearchResults.results.map(r => ({
              title: r.title,
              url: r.url,
              type: 'salary data' as const,
              relevance: Math.round((r.relevance || 0.8) * 100)
            })),
            ...companySearchResults.results.map(r => ({
              title: r.title,
              url: r.url,
              type: 'company reviews' as const,
              relevance: Math.round((r.relevance || 0.7) * 100)
            }))
          ].filter(s => s.url);

          // Deduplicate by URL, keeping highest relevance
          const urlMap = new Map();
          allSources.forEach(source => {
            const existing = urlMap.get(source.url);
            if (!existing || source.relevance > existing.relevance) {
              urlMap.set(source.url, source);
            }
          });

          return Array.from(urlMap.values());
        })(),
        dataSources: (() => {
          const allSources = [
            ...salarySearchResults.results.map(r => ({
              name: r.title,
              url: r.url,
              relevance: `${Math.round((r.relevance || 0.8) * 100)}%`,
              category: 'salary data' as const
            })),
            ...companySearchResults.results.map(r => ({
              name: r.title,
              url: r.url,
              relevance: `${Math.round((r.relevance || 0.7) * 100)}%`,
              category: 'company reviews' as const
            }))
          ].filter(s => s.url);

          // Deduplicate by URL, keeping highest relevance
          const urlMap = new Map();
          allSources.forEach(source => {
            const existing = urlMap.get(source.url);
            if (!existing || parseInt(source.relevance) > parseInt(existing.relevance)) {
              urlMap.set(source.url, source);
            }
          });

          return Array.from(urlMap.values());
        })()
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
            enhancedSalaryAnalysis: transformedAnalysis,
            salaryAnalysisDate: new Date()
          }),
          salaryMin: analysisData.compensation.salaryRange.min,
          salaryMax: analysisData.compensation.salaryRange.max,
          updatedAt: new Date()
        }
      });
      console.log('💾 Cached enhanced salary analysis');
    } catch (cacheError) {
      console.warn('Failed to cache analysis:', cacheError);
    }

    console.log(`✅ [${requestId}] Enhanced salary analysis completed in ${processingTime}ms`);
    console.log(`📤 [${requestId}] Returning transformed analysis with structure:`, {
      hasSalaryIntelligence: !!transformedAnalysis.salaryIntelligence,
      hasRange: !!transformedAnalysis.salaryIntelligence?.range,
      sampleData: {
        min: transformedAnalysis.salaryIntelligence?.range?.min,
        max: transformedAnalysis.salaryIntelligence?.range?.max
      }
    });

    return NextResponse.json({
      success: true,
      analysis: transformedAnalysis,
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location
      }
    });

  } catch (error) {
    console.error('Enhanced salary analysis failed:', error);

    return NextResponse.json({
      error: 'Salary analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST method for triggering new analysis (component expects this)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // POST and GET do the same thing - just trigger the analysis
  // Component expects POST for new analysis, GET for cache checks
  return GET(request, { params });
}