import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { enhancedSkillsMatchService } from '@/lib/services/enhanced-skills-match-service';
import {
  withErrorHandling,
  AuthenticationError,
  NotFoundError,
  ValidationError
} from '@/lib/error-handling';

export const runtime = 'nodejs';

/**
 * POST /api/jobs/[id]/calculate-match
 * Calculate or recalculate the resume-to-job match score using enhanced skills match service
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

  // Calculate match using ENHANCED skills match service with force flag to bypass cache
  const matchResult = await enhancedSkillsMatchService.calculateMatch({
    userId: user.id,
    jobId: job.id,
    resumeId: resume.id,
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
    forceRecalculate: true, // Force fresh calculation
    apiKey // Pass user's API key for AI operations
  });

  console.log(`✅ Match score calculated: ${matchResult.overallScore}% (confidence: ${(matchResult.confidence * 100).toFixed(1)}%)`);
  console.log(`📊 Skills breakdown: ${matchResult.matchingSkills.length} exact, ${matchResult.partialMatches.length} partial, ${matchResult.missingSkills.length} missing`);

  // Return enhanced match result
  return NextResponse.json({
    success: true,
    matchScore: matchResult.overallScore,
    confidence: matchResult.confidence,
    components: matchResult.components,
    // Detailed analysis for UI
    detailedAnalysis: {
      matchingSkills: matchResult.matchingSkills,
      missingSkills: matchResult.missingSkills,
      partialMatches: matchResult.partialMatches,
      matchExplanation: matchResult.matchExplanation,
      atsKeywords: matchResult.atsKeywords,
      hasDetailedAnalysis: true
    },
    calculatedAt: matchResult.calculatedAt,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
});
