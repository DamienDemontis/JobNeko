import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { centralizedMatchService } from '@/lib/services/centralized-match-service';
import {
  withErrorHandling,
  AuthenticationError,
  NotFoundError,
  ValidationError
} from '@/lib/error-handling';

export const runtime = 'nodejs';

/**
 * POST /api/jobs/[id]/calculate-match
 * Calculate or recalculate the resume-to-job match score
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Validate authentication
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  const { id: jobId } = await params;

  // Get the job
  const job = await prisma.job.findUnique({
    where: { id: jobId }
  });

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  // Verify ownership
  if (job.userId !== user.id) {
    throw new AuthenticationError('Not authorized to access this job');
  }

  // Get user's active resume
  const resume = await prisma.resume.findFirst({
    where: {
      userId: user.id,
      isActive: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  if (!resume || !resume.content) {
    throw new ValidationError('No active resume found. Please upload a resume first.');
  }

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

  // Parse job skills if available
  let jobSkills: string[] | undefined;
  if (job.skills) {
    jobSkills = job.skills.split(',').map(s => s.trim()).filter(Boolean);
  }

  console.log(`🎯 Calculating match score for job: ${job.title} at ${job.company}`);
  console.log(`🔄 Force recalculation - bypassing cache`);

  // Get user's API key (handles encryption and platform fallback securely)
  const { getUserApiKey } = await import('@/lib/utils/api-key-helper');
  const apiKey = await getUserApiKey(user.id);

  // Calculate match using centralized service with force flag to bypass cache
  const matchResult = await centralizedMatchService.calculateMatch({
    userId: user.id,
    jobId: job.id,
    resumeContent: resume.content,
    resumeSkills,
    resumeExperience,
    resumeEducation,
    jobTitle: job.title,
    jobCompany: job.company,
    jobDescription: job.description || '',
    jobRequirements: job.requirements || '',
    jobSkills,
    jobLocation: job.location || undefined,
    forceRecalculate: true, // NEW: Force fresh calculation
    apiKey // Pass user's API key for AI operations
  });

  // Update job with match score AND detailed analysis
  await centralizedMatchService.updateJobMatchScore(job.id, matchResult.matchScore);

  // Save detailed analysis to database
  if (matchResult.detailedAnalysis) {
    await prisma.job.update({
      where: { id: job.id },
      data: {
        matchAnalysis: JSON.stringify(matchResult.detailedAnalysis)
      }
    });
  }

  console.log(`✅ Match score calculated: ${matchResult.matchScore}% (confidence: ${(matchResult.confidence * 100).toFixed(1)}%)`);

  // Debug: Log improvement plan
  if (matchResult.detailedAnalysis?.improvementPlan) {
    const plan = matchResult.detailedAnalysis.improvementPlan;
    console.log('📋 Improvement Plan:', {
      quickWins: plan.quickWins?.length || 0,
      shortTerm: plan.shortTerm?.length || 0,
      longTerm: plan.longTerm?.length || 0,
      total: (plan.quickWins?.length || 0) + (plan.shortTerm?.length || 0) + (plan.longTerm?.length || 0)
    });
  } else {
    console.log('⚠️ No improvement plan generated');
  }

  return NextResponse.json({
    success: true,
    matchScore: matchResult.matchScore,
    confidence: matchResult.confidence,
    tier: matchResult.tier,
    components: matchResult.components,
    detailedAnalysis: matchResult.detailedAnalysis ? {
      overallMatch: matchResult.detailedAnalysis.overallMatch,
      matchBreakdown: matchResult.detailedAnalysis.matchBreakdown,
      improvementPlan: matchResult.detailedAnalysis.improvementPlan,
      missingElements: matchResult.detailedAnalysis.missingElements,
      strengthsHighlights: matchResult.detailedAnalysis.strengthsHighlights,
      hasDetailedAnalysis: true
    } : null,
    calculatedAt: matchResult.calculatedAt,
    dataSources: matchResult.dataSources
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
});
