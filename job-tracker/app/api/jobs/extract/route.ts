import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { extractJobDataWithAI } from '@/lib/ai-service';
import { webEnhancedSalaryIntelligence } from '@/lib/services/web-enhanced-salary-intelligence';
import {
  withErrorHandling,
  AuthenticationError
} from '@/lib/error-handling';

// Force this API route to use Node.js runtime instead of Edge Runtime
export const runtime = 'nodejs';

const extractSchema = z.object({
  url: z.string().url(),
  html: z.string().optional(),
  text: z.string().optional(),
  title: z.string().optional(),
  structured: z.any().optional(),
});

/**
 * Start web-enhanced salary analysis in background after job extraction
 */
async function startBackgroundWebAnalysis(
  jobId: string,
  extractedData: Record<string, unknown>,
  location?: string,
  company?: string
) {
  try {
    console.log(`Starting web-enhanced salary analysis for job ${jobId}...`);

    // Use web-enhanced salary intelligence
    const analysis = await webEnhancedSalaryIntelligence.analyzeSalary(
      String(extractedData.title || 'Software Engineer'),
      company || 'Unknown Company',
      location || 'Remote',
      String(extractedData.description || ''),
      extractedData.salary as string | undefined
    );

    // Store analysis results in job record
    await prisma.job.update({
      where: { id: jobId },
      data: {
        extractedData: JSON.stringify({
          ...extractedData,
          webEnhancedAnalysis: analysis,
          analysisDate: new Date(),
          version: '2.0.0-web-enhanced',
          dataSource: 'web_search_ai'
        }),
        totalCompMin: analysis.compensation?.salaryRange?.min || null,
        totalCompMax: analysis.compensation?.salaryRange?.max || null,
        matchScore: analysis.confidence?.overall || null,
        updatedAt: new Date()
      }
    });

    console.log(`Web-enhanced salary analysis completed for job ${jobId} with confidence: ${(analysis.confidence?.overall * 100 || 0)}%`);
  } catch (error) {
    console.error(`Web-enhanced salary analysis failed for job ${jobId}:`, error);
    // Don't throw - this is background processing
  }
}

// Removed unused buildJobDescription function

export const POST = withErrorHandling(async (request: NextRequest) => {
    // Validate authentication - check both header and cookie
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const cookieToken = request.cookies.get('token')?.value;
    const token = authHeader || cookieToken;
    
    console.log('Job extraction: Auth header token:', authHeader ? authHeader.substring(0, 20) + '...' : 'None');
    console.log('Job extraction: Cookie token:', cookieToken ? cookieToken.substring(0, 20) + '...' : 'None');
    console.log('Job extraction: Using token:', token ? token.substring(0, 20) + '...' : 'None');
    
    if (!token) {
      throw new AuthenticationError('Authentication token required');
    }

    const user = await validateToken(token);
    if (!user) {
      console.log('Job extraction: Token validation failed for token:', token.substring(0, 20) + '...');
      throw new AuthenticationError('Invalid or expired token');
    }
    
    console.log('Job extraction: Token validated for user:', user.email);

    // Parse and validate request body
    const body = await request.json();
    const pageData = extractSchema.parse(body);

    // Check if job already exists for this user and URL
    const existingJob = await prisma.job.findFirst({
      where: {
        userId: user.id,
        url: pageData.url,
      },
    });

    if (existingJob) {
      return NextResponse.json({
        job: existingJob,
        message: 'Job already extracted',
      });
    }

    // Extract job data using AI
    const extractedData = await extractJobDataWithAI(pageData);

    // Create job record
    const job = await prisma.job.create({
      data: {
        userId: user.id,
        url: pageData.url,
        title: extractedData.title,
        company: extractedData.company,
        companyLogoUrl: extractedData.companyLogoUrl,
        location: extractedData.location,
        salary: extractedData.salary,
        salaryMin: extractedData.salaryMin,
        salaryMax: extractedData.salaryMax,
        contractType: extractedData.contractType,
        skills: extractedData.skills?.join(', '),
        description: extractedData.description,
        requirements: extractedData.requirements,
        perks: extractedData.perks,
        workMode: extractedData.workMode,
        summary: extractedData.summary,
        postedDate: extractedData.postedDate ? new Date(extractedData.postedDate) : null,
        applicationDeadline: extractedData.applicationDeadline ? new Date(extractedData.applicationDeadline) : null,
        extractedData: JSON.stringify(extractedData),
      },
    });

    // Calculate match score if user has an active resume
    const activeResume = await prisma.resume.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
    });

    if (activeResume) {
      // This would be calculated with AI, but for now we'll set a placeholder
      const matchScore = 75; // Placeholder
      await prisma.job.update({
        where: { id: job.id },
        data: { matchScore },
      });
    }

    // Auto-start web-enhanced salary analysis in background
    console.log('Starting background web-enhanced salary analysis for job:', job.id);
    startBackgroundWebAnalysis(job.id, extractedData as unknown as Record<string, unknown>, job.location || undefined, job.company).catch(error => {
      console.error('Background web-enhanced salary analysis failed for job', job.id, ':', error);
    });

  return NextResponse.json({
    job,
    message: 'Job extracted successfully with web intelligence',
    webAnalysisStarted: true,
    analysisType: 'web-enhanced'
  });
});