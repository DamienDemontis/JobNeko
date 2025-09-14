import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { validateToken } from '../../../../../lib/auth';
import { perfectAIRAG } from '../../../../../lib/services/perfect-ai-rag';

// Force this API route to use Node.js runtime instead of Edge Runtime
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract token from Authorization header or cookies
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

    // Get job details
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

    // Check for cached analysis first
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    const userLocation = searchParams.get('userLocation') || job.user.profile?.currentLocation;

    // Try to get cached analysis from extractedData
    let cachedAnalysis = null;
    if (!forceRefresh && job.extractedData) {
      try {
        const parsedData = JSON.parse(job.extractedData);
        if (parsedData.perfectRAGAnalysis && parsedData.analysisDate) {
          const analysisDate = new Date(parsedData.analysisDate);
          const hoursSinceAnalysis = (Date.now() - analysisDate.getTime()) / (1000 * 60 * 60);

          // Use cached analysis if it's less than 24 hours old
          if (hoursSinceAnalysis < 24) {
            cachedAnalysis = parsedData.perfectRAGAnalysis;
            console.log(`Using cached salary analysis for job ${jobId} (${hoursSinceAnalysis.toFixed(1)} hours old)`);
          } else {
            console.log(`Cached analysis for job ${jobId} is ${hoursSinceAnalysis.toFixed(1)} hours old - refreshing`);
          }
        }
      } catch (error) {
        console.warn('Failed to parse cached analysis data:', error);
      }
    }

    let analysis;
    let processingTimeMs = 0;

    if (cachedAnalysis) {
      // Use cached analysis
      analysis = cachedAnalysis;
    } else {
      // Perform fresh analysis
      const comprehensiveJobDescription = buildJobDescription(job);
      const startTime = Date.now();

      analysis = await perfectAIRAG.analyzeJobOffer(
        comprehensiveJobDescription,
        job.location,
        job.company,
        userLocation
      );

      processingTimeMs = Date.now() - startTime;

      // Cache the analysis in the job record
      try {
        const existingData = job.extractedData ? JSON.parse(job.extractedData) : {};
        await prisma.job.update({
          where: { id: jobId },
          data: {
            extractedData: JSON.stringify({
              ...existingData,
              perfectRAGAnalysis: analysis,
              analysisDate: new Date(),
              version: '1.0.0-perfect'
            }),
            totalCompMin: analysis.compensation?.salaryRange?.min || null,
            totalCompMax: analysis.compensation?.salaryRange?.max || null,
            matchScore: analysis.analysis?.overallScore || null,
            updatedAt: new Date()
          }
        });
        console.log(`Cached fresh salary analysis for job ${jobId}`);
      } catch (error) {
        console.warn('Failed to cache analysis results:', error);
      }
    }

    // Add job-specific context
    const enrichedAnalysis = {
      ...analysis,
      jobContext: {
        jobId: job.id,
        postedDate: job.createdAt,
        applicationStatus: job.applicationStatus,
        userProfile: {
          currentSalary: job.user.profile?.currentSalary,
          expectedSalaryMin: job.user.profile?.expectedSalaryMin,
          expectedSalaryMax: job.user.profile?.expectedSalaryMax,
          yearsOfExperience: job.user.profile?.yearsOfExperience,
          currentLocation: job.user.profile?.currentLocation
        }
      },
      metadata: {
        analysisTimestamp: new Date().toISOString(),
        ragVersion: '1.0.0-perfect',
        processingTime: processingTimeMs,
        processingTimeFormatted: processingTimeMs > 0 ? `${(processingTimeMs / 1000).toFixed(3)}s` : 'cached',
        cached: cachedAnalysis !== null,
        cacheAge: cachedAnalysis && job.extractedData ? (() => {
          try {
            const parsedData = JSON.parse(job.extractedData);
            if (parsedData.analysisDate) {
              const analysisDate = new Date(parsedData.analysisDate);
              const hoursSinceAnalysis = (Date.now() - analysisDate.getTime()) / (1000 * 60 * 60);
              return `${hoursSinceAnalysis.toFixed(1)} hours`;
            }
          } catch {}
          return 'unknown';
        })() : null
      }
    };

    return NextResponse.json(enrichedAnalysis);

  } catch (error) {
    console.error('Perfect RAG analysis failed:', error);

    // No fallbacks - if perfect RAG fails, return error with explanation
    return NextResponse.json({
      error: 'Perfect AI RAG analysis failed',
      message: error instanceof Error ? error.message : 'Unknown analysis error',
      recommendation: 'Please ensure all external data sources are available or try again later',
      fallbackUsed: false // We never use fallbacks in perfect RAG
    }, { status: 500 });
  }
}

/**
 * Build comprehensive job description from all available job data
 */
function buildJobDescription(job: any): string {
  const parts: string[] = [];

  // Basic job information
  parts.push(`Job Title: ${job.title}`);
  parts.push(`Company: ${job.company}`);

  if (job.location) {
    parts.push(`Location: ${job.location}`);
  }

  if (job.workMode) {
    parts.push(`Work Mode: ${job.workMode}`);
  }

  // Enhanced job classification context
  if (job.contractType) {
    parts.push(`Contract Type: ${job.contractType}`);
  }

  // Help AI understand job type from title and context
  const titleLower = job.title.toLowerCase();
  if (titleLower.includes('intern') || titleLower.includes('internship')) {
    parts.push('Job Type: Internship position');
  } else if (titleLower.includes('contractor') || titleLower.includes('freelance') || titleLower.includes('consultant')) {
    parts.push('Job Type: Contract/Freelance position');
  } else if (titleLower.includes('part-time') || titleLower.includes('part time')) {
    parts.push('Job Type: Part-time position');
  } else {
    parts.push('Job Type: Full-time position');
  }

  // Enhanced salary information with compensation model detection
  let hasSalaryInfo = false;
  if (job.salary) {
    parts.push(`Posted Salary Information: ${job.salary}`);
    hasSalaryInfo = true;
  } else if (job.salaryMin && job.salaryMax) {
    const currency = job.salaryCurrency || 'USD';
    const frequency = job.salaryFrequency || 'annual';
    parts.push(`Posted Salary Range: ${currency} ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()} ${frequency}`);
    hasSalaryInfo = true;

    // Help AI understand compensation model
    if (frequency === 'hourly') {
      parts.push('Compensation Model: Hourly rate');
    } else {
      parts.push('Compensation Model: Annual salary');
    }
  } else if (job.salaryMin) {
    const currency = job.salaryCurrency || 'USD';
    const frequency = job.salaryFrequency || 'annual';
    parts.push(`Minimum Posted Salary: ${currency} ${job.salaryMin.toLocaleString()} ${frequency}`);
    hasSalaryInfo = true;
  }

  if (hasSalaryInfo) {
    parts.push('Salary Source: Posted in job listing (high confidence)');
  } else {
    parts.push('Salary Source: Not posted - requires market estimation');
  }

  // Enhanced compensation details

  if (job.bonusStructure) {
    try {
      const bonus = JSON.parse(job.bonusStructure);
      parts.push(`Bonus Structure: ${JSON.stringify(bonus)}`);
    } catch {
      parts.push(`Bonus Structure: ${job.bonusStructure}`);
    }
  }

  if (job.equityOffered) {
    try {
      const equity = JSON.parse(job.equityOffered);
      parts.push(`Equity Offered: ${JSON.stringify(equity)}`);
    } catch {
      parts.push(`Equity Offered: ${job.equityOffered}`);
    }
  }

  // Job content
  if (job.description) {
    parts.push(`Job Description: ${job.description}`);
  }

  if (job.requirements) {
    parts.push(`Requirements: ${job.requirements}`);
  }

  if (job.skills) {
    parts.push(`Required Skills: ${job.skills}`);
  }

  if (job.perks) {
    parts.push(`Perks and Benefits: ${job.perks}`);
  }

  // Additional context
  if (job.summary) {
    parts.push(`Summary: ${job.summary}`);
  }

  if (job.notes) {
    parts.push(`Additional Notes: ${job.notes}`);
  }

  return parts.join('\n\n');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract token from Authorization header or cookies
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

    const { forceRefresh, customContext, userLocation } = await request.json();
    const resolvedParams = await params;
    const jobId = resolvedParams.id;

    // Get job details
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

    // Build job description with custom context if provided
    let jobDescription = buildJobDescription(job);
    if (customContext) {
      jobDescription += `\n\nAdditional Context: ${customContext}`;
    }

    // Force fresh analysis (perfect RAG always uses fresh data anyway)
    const analysis = await perfectAIRAG.analyzeJobOffer(
      jobDescription,
      job.location,
      job.company,
      userLocation || job.user.profile?.currentLocation
    );

    // Store analysis results in job record for future reference
    await prisma.job.update({
      where: { id: jobId },
      data: {
        extractedData: JSON.stringify({
          perfectRAGAnalysis: analysis,
          analysisDate: new Date(),
          version: '1.0.0-perfect'
        }),
        matchScore: analysis.analysis.overallScore,
        totalCompMin: analysis.compensation.salaryRange.min,
        totalCompMax: analysis.compensation.salaryRange.max,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      ...analysis,
      metadata: {
        ...analysis.metadata,
        stored: true,
        jobUpdated: true
      }
    });

  } catch (error) {
    console.error('Perfect RAG POST analysis failed:', error);

    return NextResponse.json({
      error: 'Perfect AI RAG analysis failed',
      message: error instanceof Error ? error.message : 'Unknown analysis error',
      fallbackUsed: false
    }, { status: 500 });
  }
}