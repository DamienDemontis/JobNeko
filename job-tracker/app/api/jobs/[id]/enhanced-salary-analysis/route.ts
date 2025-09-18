import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { enhancedSalaryRAG } from '@/lib/services/enhanced-salary-rag';
import { salaryAnalysisPersistence } from '@/lib/services/salary-analysis-persistence';

// Helper to generate user profile hash for cache key
function generateUserProfileHash(userId: string, profileData: any): string {
  const data = {
    userId,
    careerLevel: profileData?.careerLevel,
    yearsOfExperience: profileData?.yearsOfExperience,
    skills: profileData?.skills,
    location: profileData?.currentLocation,
    currentSalary: profileData?.currentSalary,
    expectedSalary: profileData?.expectedSalaryMin,
  };
  const input = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// GET method to check for cached analysis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const checkCache = searchParams.get('checkCache') === 'true';

    if (!checkCache) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Validate authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user profile for hash generation
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    const userProfileHash = generateUserProfileHash(user.id, userProfile);

    // Check for cached analysis
    const cachedAnalysis = await salaryAnalysisPersistence.getCachedAnalysis(
      id,
      user.id,
      userProfileHash
    );

    if (cachedAnalysis) {
      return NextResponse.json({
        cached: true,
        analysis: cachedAnalysis,
      });
    }

    return NextResponse.json({
      cached: false,
      analysis: null,
    });
  } catch (error) {
    console.error('Cache check error:', error);
    return NextResponse.json(
      { error: 'Failed to check cache' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check for forceRefresh parameter
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    // Check if Tavily API is configured for real web search
    if (!process.env.TAVILY_API_KEY) {
      return NextResponse.json(
        {
          error: 'Web search not configured',
          details: 'Tavily API key required for real salary data. Cannot provide hardcoded estimates.',
          suggestion: 'Please configure TAVILY_API_KEY environment variable for live market data.'
        },
        { status: 503 }
      );
    }

    // Validate authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get job details
    const job = await prisma.job.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    console.log(`🔍 Starting enhanced salary analysis for job: ${job.title} at ${job.company}${forceRefresh ? ' (bypassing cache)' : ''}`);

    // Perform enhanced salary analysis with full profile context
    const analysis = await enhancedSalaryRAG.analyzeWithContext({
      jobTitle: job.title,
      company: job.company,
      location: job.location || undefined,
      description: job.description || undefined,
      requirements: job.requirements || undefined,
      userId: user.id,
      postedSalary: job.salary || undefined,
      forceRefresh: forceRefresh,
    });

    console.log(`✅ Enhanced salary analysis completed for ${job.title}`);

    // Get user profile for cache key
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    const userProfileHash = generateUserProfileHash(user.id, userProfile);

    // Save analysis to cache
    await salaryAnalysisPersistence.saveAnalysis({
      jobId: job.id,
      userId: user.id,
      jobTitle: job.title,
      company: job.company,
      location: job.location || undefined,
      jobSalary: job.salary || undefined,
      analysisData: analysis,
      dataSources: analysis.sources?.webSources || [],
      confidence: analysis.salaryIntelligence?.range?.confidence || 0.5,
      userProfileHash,
    });

    console.log(`💾 Saved analysis to cache for job ${job.id}`);

    return NextResponse.json({
      success: true,
      analysis,
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location || undefined,
      },
    });
  } catch (error) {
    console.error('Enhanced salary analysis error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze salary',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}