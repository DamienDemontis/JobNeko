import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { aiExecutor, AIOperationType } from '@/lib/services/ai-executor';
import {
  withErrorHandling,
  AuthenticationError,
  NotFoundError,
  ValidationError
} from '@/lib/error-handling';

export const runtime = 'nodejs';

/**
 * POST /api/jobs/[id]/analyze
 * Execute AI analysis operations for a job
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
  const body = await request.json();
  const { operation, forceRefresh = false } = body;

  if (!operation) {
    throw new ValidationError('Operation type is required');
  }

  // Validate operation type
  const validOperations: AIOperationType[] = [
    'match_score',
    'salary_analysis',
    'company_research',
    'skills_gap',
    'interview_prep',
    'negotiation',
    'career_advice'
  ];

  if (!validOperations.includes(operation)) {
    throw new ValidationError(`Invalid operation: ${operation}`);
  }

  // Get the job with user profile
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      user: {
        include: {
          profile: true,
          resumes: {
            where: { isActive: true },
            orderBy: { updatedAt: 'desc' },
            take: 1
          }
        }
      }
    }
  });

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  // Verify ownership
  if (job.userId !== user.id) {
    throw new AuthenticationError('Not authorized to access this job');
  }

  // Prepare data based on operation type
  let operationData: any = {
    jobTitle: job.title,
    jobCompany: job.company,
    jobDescription: job.description || '',
    jobRequirements: job.requirements || '',
    jobLocation: job.location || '',
    userProfile: job.user.profile,
  };

  // Add operation-specific data
  switch (operation) {
    case 'match_score':
      const resume = job.user.resumes[0];
      if (!resume || !resume.content) {
        throw new ValidationError('No active resume found. Please upload a resume first.');
      }

      // Parse resume skills if available
      let resumeSkills: any[] = [];
      try {
        if (resume.skills) resumeSkills = JSON.parse(resume.skills);
      } catch (error) {
        console.warn('Failed to parse resume skills:', error);
      }

      operationData = {
        ...operationData,
        resumeText: resume.content,
        resumeSkills,
      };
      break;

    case 'salary_analysis':
      operationData = {
        ...operationData,
        salary: job.salary,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        location: job.location || '',
        company: job.company,
      };
      break;

    case 'skills_gap':
      const resumeForSkills = job.user.resumes[0];
      if (!resumeForSkills) {
        throw new ValidationError('No active resume found for skills gap analysis.');
      }

      let userSkills: string[] = [];
      try {
        if (resumeForSkills.skills) userSkills = JSON.parse(resumeForSkills.skills);
      } catch (error) {
        console.warn('Failed to parse user skills:', error);
      }

      operationData = {
        ...operationData,
        userSkills,
        jobRequirements: job.requirements || '',
      };
      break;

    case 'company_research':
      operationData = {
        company: job.company,
        jobTitle: job.title,
        location: job.location || '',
      };
      break;

    case 'interview_prep':
      operationData = {
        ...operationData,
        company: job.company,
      };
      break;

    case 'negotiation':
      operationData = {
        ...operationData,
        salary: job.salary,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
      };
      break;

    case 'career_advice':
      operationData = {
        currentRole: job.user.profile?.careerLevel || 'mid',
        targetRole: job.title,
        userProfile: job.user.profile,
      };
      break;
  }

  console.log(`🎯 Executing AI operation: ${operation} for job: ${job.title}`);
  console.log(`🔄 Force refresh: ${forceRefresh}`);

  // Execute the AI operation
  const result = await aiExecutor.execute({
    userId: user.id,
    jobId,
    operation: operation as AIOperationType,
    data: operationData,
    forceRefresh,
    subscriptionTier: user.subscriptionTier,
  });

  if (!result.success) {
    throw new ValidationError(result.error || 'AI operation failed');
  }

  // Update job with results if applicable
  if (operation === 'match_score' && result.data) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        matchScore: result.data.matchScore,
        matchAnalysis: JSON.stringify(result.data.detailedAnalysis),
      },
    });
  }

  return NextResponse.json({
    success: true,
    operation,
    cached: result.cached || false,
    executionTime: result.executionTime,
    data: result.data,
  });
});

/**
 * GET /api/jobs/[id]/analyze
 * Get cached analysis results
 */
export const GET = withErrorHandling(async (
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
  const searchParams = request.nextUrl.searchParams;
  const operation = searchParams.get('operation');

  if (!operation) {
    throw new ValidationError('Operation type is required');
  }

  // Get cached results
  const cache = await prisma.jobAnalysisCache.findUnique({
    where: {
      jobId_userId_analysisType: {
        jobId,
        userId: user.id,
        analysisType: operation,
      },
    },
  });

  if (!cache || new Date(cache.expiresAt) < new Date()) {
    return NextResponse.json({
      success: false,
      cached: false,
      data: null,
    });
  }

  return NextResponse.json({
    success: true,
    cached: true,
    data: JSON.parse(cache.analysisData),
    cachedAt: cache.createdAt,
    expiresAt: cache.expiresAt,
  });
});