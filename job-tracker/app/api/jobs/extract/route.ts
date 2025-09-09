import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { extractJobDataWithAI } from '@/lib/ai-service';
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

  return NextResponse.json({
    job,
    message: 'Job extracted successfully',
  });
});