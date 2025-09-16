import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { validateToken } from '../../../../../lib/auth';
import { webEnhancedSalaryIntelligence } from '../../../../../lib/services/web-enhanced-salary-intelligence';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Get job with user profile
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

    // Check for cached web-enhanced analysis (24 hour TTL)
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    const userLocation = searchParams.get('userLocation') || job.user.profile?.currentLocation;

    if (!forceRefresh && job.extractedData) {
      try {
        const cached = JSON.parse(job.extractedData);
        if (cached.webEnhancedAnalysis && cached.webAnalysisDate) {
          const hoursSinceAnalysis = (Date.now() - new Date(cached.webAnalysisDate).getTime()) / (1000 * 60 * 60);

          // Use cached analysis if it's less than 24 hours old
          if (hoursSinceAnalysis < 24) {
            console.log(`📋 Using cached web-enhanced analysis for job ${jobId} (${hoursSinceAnalysis.toFixed(1)} hours old)`);
            return NextResponse.json({
              ...cached.webEnhancedAnalysis,
              metadata: {
                ...cached.webEnhancedAnalysis.metadata,
                cached: true,
                cacheAge: `${hoursSinceAnalysis.toFixed(1)} hours`
              }
            });
          } else {
            console.log(`🔄 Cached analysis for job ${jobId} is ${hoursSinceAnalysis.toFixed(1)} hours old - refreshing with web search`);
          }
        }
      } catch (error) {
        console.warn('Failed to parse cached web analysis data:', error);
      }
    }

    // Perform fresh web-enhanced analysis
    console.log(`🌐 Performing web-enhanced salary analysis for job ${jobId}`);
    console.log(`📍 Job: ${job.title} at ${job.company} in ${job.location}`);

    const startTime = Date.now();

    const analysis = await webEnhancedSalaryIntelligence.analyzeSalary(
      job.title,
      job.company,
      job.location || 'Remote',
      job.description || job.summary || '',
      job.salary || undefined,
      userLocation || undefined
    );

    const processingTime = Date.now() - startTime;
    console.log(`✅ Web-enhanced analysis completed in ${processingTime}ms`);
    console.log(`🔍 Search queries used: ${analysis.metadata.searchQueries.length}`);

    // Cache the analysis
    try {
      const existingData = job.extractedData ? JSON.parse(job.extractedData) : {};
      await prisma.job.update({
        where: { id: jobId },
        data: {
          extractedData: JSON.stringify({
            ...existingData,
            webEnhancedAnalysis: analysis,
            webAnalysisDate: new Date()
          }),
          // Update job fields with web-enhanced data
          salaryMin: analysis.compensation.salaryRange.min,
          salaryMax: analysis.compensation.salaryRange.max,
          matchScore: analysis.analysis.overallScore,
          updatedAt: new Date()
        }
      });
      console.log(`💾 Cached web-enhanced analysis for job ${jobId}`);
    } catch (error) {
      console.warn('Failed to cache web analysis:', error);
    }

    return NextResponse.json({
      ...analysis,
      metadata: {
        ...analysis.metadata,
        cached: false,
        processingTime
      }
    });

  } catch (error) {
    console.error('Web-enhanced salary analysis failed:', error);

    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConfigError = errorMessage.includes('API key') || errorMessage.includes('not configured');

    return NextResponse.json({
      error: 'Web-enhanced analysis failed',
      message: errorMessage,
      suggestion: isConfigError
        ? 'Please configure Tavily API key for web search capabilities'
        : 'Try again or use the optimized analysis instead',
      fallbackAvailable: true
    }, { status: 500 });
  }
}