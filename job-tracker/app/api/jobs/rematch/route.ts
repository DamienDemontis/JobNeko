import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { centralizedMatchService } from '@/lib/services/centralized-match-service';
import {
  withErrorHandling,
  AuthenticationError,
  ValidationError
} from '@/lib/error-handling';

export const runtime = 'nodejs';

/**
 * POST /api/jobs/rematch
 * Recalculate match scores for all user's jobs
 * Uses centralized matching service with subscription-aware features
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate authentication
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  // Get user's latest active resume
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
  try {
    if (resume.skills) resumeSkills = JSON.parse(resume.skills);
  } catch (error) {
    console.warn('Failed to parse resume skills:', error);
  }

  // Get all user's jobs
  const jobs = await prisma.job.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      title: true,
      company: true,
      description: true,
      requirements: true,
      skills: true,
      location: true
    }
  });

  if (jobs.length === 0) {
    return NextResponse.json({
      message: 'No jobs to rematch',
      updatedJobs: 0
    });
  }

  console.log(`🔄 Rematching ${jobs.length} jobs for user ${user.email}`);

  // Prepare jobs for batch processing
  const jobsForBatch = jobs.map(job => ({
    id: job.id,
    title: job.title,
    company: job.company,
    description: job.description || '',
    requirements: job.requirements || ''
  }));

  let updatedCount = 0;

  try {
    // Use batch processing if available (PRO/PRO_MAX tiers)
    const matchResults = await centralizedMatchService.batchCalculateMatches(
      user.id,
      resume.content,
      jobsForBatch
    );

    // Update all job scores
    for (const [jobId, matchResult] of matchResults) {
      try {
        await centralizedMatchService.updateJobMatchScore(jobId, matchResult.matchScore);
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update job ${jobId}:`, error);
      }
    }

    console.log(`✅ Successfully rematched ${updatedCount}/${jobs.length} jobs`);

    return NextResponse.json({
      success: true,
      message: 'Job matching completed',
      totalJobs: jobs.length,
      updatedJobs: updatedCount,
      skippedJobs: jobs.length - updatedCount
    });

  } catch (batchError: any) {
    // If batch processing fails (FREE tier or error), fall back to sequential
    console.warn('Batch processing not available, using sequential processing:', batchError.message);

    for (const job of jobs) {
      try {
        const jobSkills = job.skills ? job.skills.split(',').map(s => s.trim()) : undefined;

        const matchResult = await centralizedMatchService.calculateMatch({
          userId: user.id,
          jobId: job.id,
          resumeContent: resume.content,
          resumeSkills,
          jobTitle: job.title,
          jobCompany: job.company,
          jobDescription: job.description || '',
          jobRequirements: job.requirements || '',
          jobSkills,
          jobLocation: job.location || undefined
        });

        await centralizedMatchService.updateJobMatchScore(job.id, matchResult.matchScore);
        updatedCount++;

        // Log progress
        if (updatedCount % 10 === 0) {
          console.log(`Progress: ${updatedCount}/${jobs.length} jobs rematched`);
        }
      } catch (error) {
        console.error(`Failed to rematch job ${job.id}:`, error);
      }
    }

    console.log(`✅ Sequential rematch completed: ${updatedCount}/${jobs.length} jobs`);

    return NextResponse.json({
      success: true,
      message: 'Job matching completed (sequential)',
      totalJobs: jobs.length,
      updatedJobs: updatedCount,
      skippedJobs: jobs.length - updatedCount
    });
  }
});