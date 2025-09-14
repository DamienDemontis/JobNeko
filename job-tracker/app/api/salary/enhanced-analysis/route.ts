import { NextRequest, NextResponse } from 'next/server';
import { enhancedSalaryIntelligence } from '@/lib/services/enhanced-salary-intelligence';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      job,
      analysisLocation,
      expenseProfile,
      currency = 'USD',
      options = {}
    } = body;

    // Validate required fields
    if (!job?.id || !job?.title || !analysisLocation) {
      return NextResponse.json(
        { error: 'Missing required fields: job.id, job.title, analysisLocation' },
        { status: 400 }
      );
    }

    // Ensure job title is a string
    if (typeof job.title !== 'string' || job.title.trim() === '') {
      return NextResponse.json(
        { error: 'Job title must be a non-empty string' },
        { status: 400 }
      );
    }

    // Build analysis request matching EnhancedAnalysisRequest interface
    const analysisRequest = {
      jobId: job.id,
      jobTitle: job.title,
      company: job.company || undefined,
      location: analysisLocation,
      description: job.description || undefined,
      requirements: job.requirements || undefined,
      salaryInfo: job.salary || undefined,
      workMode: job.workMode as 'onsite' | 'hybrid' | 'remote_country' | 'remote_global' | undefined,
      userId: user.id,
      expenseProfile: expenseProfile ? {
        housing: { percentage: expenseProfile.housing * 100 },
        food: { percentage: expenseProfile.food * 100 },
        transportation: { percentage: expenseProfile.transportation * 100 },
        healthcare: { percentage: expenseProfile.healthcare * 100 },
        utilities: { percentage: expenseProfile.utilities * 100 },
        entertainment: { percentage: expenseProfile.entertainment * 100 },
        savings: { percentage: expenseProfile.savings * 100 },
        other: { percentage: expenseProfile.other * 100 }
      } : undefined,
      currency: currency || 'USD',
      forceRefresh: options?.forceRefresh || false
    };

    // Perform analysis
    const result = await enhancedSalaryIntelligence.analyze(analysisRequest);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Enhanced salary analysis error:', error);

    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}