import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { enhancedSalaryRAG } from '@/lib/services/enhanced-salary-rag';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    console.log(`🔍 Starting enhanced salary analysis for job: ${job.title} at ${job.company}`);

    // Perform enhanced salary analysis with full profile context
    const analysis = await enhancedSalaryRAG.analyzeWithContext({
      jobTitle: job.title,
      company: job.company,
      location: job.location || undefined,
      description: job.description || undefined,
      requirements: job.requirements || undefined,
      userId: user.id,
      postedSalary: job.salary || undefined,
    });

    console.log(`✅ Enhanced salary analysis completed for ${job.title}`);

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