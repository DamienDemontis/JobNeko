import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { extractJobDataWithAI } from '@/lib/ai-service';
import { perfectAIRAG } from '@/lib/services/perfect-ai-rag';
import {
  withErrorHandling,
  AuthenticationError,
  ConflictError,
  ExternalServiceError
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
 * Start salary analysis in background after job extraction
 */
async function startBackgroundSalaryAnalysis(
  jobId: string,
  extractedData: any,
  location?: string,
  company?: string,
  userId?: string
) {
  try {
    // Build comprehensive job description
    const jobDescription = buildJobDescription(extractedData, location, company);

    // Perform Perfect AI RAG analysis
    const analysis = await perfectAIRAG.analyzeJobOffer(
      jobDescription,
      location,
      company
    );

    // Store analysis results in job record
    await prisma.job.update({
      where: { id: jobId },
      data: {
        extractedData: JSON.stringify({
          ...extractedData,
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

    console.log(`Background salary analysis completed for job ${jobId}`);
  } catch (error) {
    console.error(`Background salary analysis failed for job ${jobId}:`, error);
    // Don't throw - this is background processing
  }
}

/**
 * Build comprehensive job description for AI analysis
 */
function buildJobDescription(extractedData: any, location?: string, company?: string): string {
  const parts: string[] = [];

  if (extractedData.title) parts.push(`Job Title: ${extractedData.title}`);
  if (company) parts.push(`Company: ${company}`);
  if (location) parts.push(`Location: ${location}`);
  if (extractedData.workMode) parts.push(`Work Mode: ${extractedData.workMode}`);
  if (extractedData.salary) parts.push(`Salary Information: ${extractedData.salary}`);
  if (extractedData.contractType) parts.push(`Contract Type: ${extractedData.contractType}`);
  if (extractedData.description) parts.push(`Job Description: ${extractedData.description}`);
  if (extractedData.requirements) parts.push(`Requirements: ${extractedData.requirements}`);
  if (extractedData.skills) parts.push(`Required Skills: ${Array.isArray(extractedData.skills) ? extractedData.skills.join(', ') : extractedData.skills}`);
  if (extractedData.perks) parts.push(`Perks and Benefits: ${extractedData.perks}`);
  if (extractedData.summary) parts.push(`Summary: ${extractedData.summary}`);

  return parts.join('\n\n');
}

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

    // Auto-start Perfect AI RAG salary analysis in background
    console.log('Starting background salary analysis for job:', job.id);
    startBackgroundSalaryAnalysis(job.id, extractedData, job.location, job.company, user.id).catch(error => {
      console.error('Background salary analysis failed for job', job.id, ':', error);
    });

  return NextResponse.json({
    job,
    message: 'Job extracted successfully',
    salaryAnalysisStarted: true
  });
});