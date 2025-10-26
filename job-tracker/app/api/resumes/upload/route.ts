import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { aiResumeExtractor } from '@/lib/services/ai-resume-extractor';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('resume') as File;
    const displayName = formData.get('displayName') as string;
    const setPrimary = formData.get('setPrimary') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    // Check resume count limit (30 max)
    const resumeCount = await prisma.resume.count({
      where: {
        userId: user.id,
        isActive: true
      }
    });

    if (resumeCount >= 30) {
      return NextResponse.json(
        { error: 'Resume limit reached. Maximum 30 resumes allowed. Please delete some resumes first.' },
        { status: 400 }
      );
    }

    // Validate file type (PDF, DOC, DOCX)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, DOC, and DOCX files are supported.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 10MB allowed.' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'uploads');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const fileName = `${user.id}_${Date.now()}_${file.name}`;
    const filePath = join(uploadDir, fileName);
    const fileUrl = `/uploads/${fileName}`;

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Get user's API key (handles encryption and platform fallback securely)
    const { getUserApiKey } = await import('@/lib/utils/api-key-helper');
    const apiKey = await getUserApiKey(user.id);

    // Extract raw text from PDF (simple and reliable)
    console.log('Starting PDF extraction for:', fileName);
    const extractedData = await aiResumeExtractor.extractFromPDF(buffer, fileName, apiKey);
    console.log('PDF extraction completed successfully');

    // If setting as primary or this is the first resume, handle primary logic
    const shouldBePrimary = setPrimary || resumeCount === 0;

    if (shouldBePrimary) {
      // Unset all existing primary flags
      await prisma.resume.updateMany({
        where: {
          userId: user.id,
          isPrimary: true
        },
        data: { isPrimary: false }
      });
    }

    // Create resume record with raw text
    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        displayName: displayName.trim(),
        fileName: file.name,
        fileUrl,
        fileSizeBytes: file.size,
        content: extractedData.rawText || extractedData.summary || '', // Store raw text content
        skills: '[]', // AI services will extract when needed
        experience: '[]', // AI services will extract when needed
        education: '[]', // AI services will extract when needed
        isPrimary: shouldBePrimary,
        isActive: true,
        usageCount: 0
      },
    });

    // Update match scores for existing jobs
    const jobs = await prisma.job.findMany({
      where: { userId: user.id },
    });

    // This would normally use AI to calculate match scores
    // For now, we'll use a placeholder calculation
    for (const job of jobs) {
      const matchScore = Math.min(100, Math.max(0, Math.floor(Math.random() * 30) + 60));
      await prisma.job.update({
        where: { id: job.id },
        data: { matchScore },
      });
    }

    return NextResponse.json({
      success: true,
      resume: {
        id: resume.id,
        displayName: resume.displayName,
        fileName: file.name,
        fileSizeBytes: file.size,
        isPrimary: resume.isPrimary,
        uploadedAt: resume.createdAt.toISOString(),
        extractedText: extractedData.rawText || extractedData.summary || '', // Return full content
        rawText: extractedData.rawText || '', // Return full raw text
        createdAt: resume.createdAt.toISOString(),
      },
      message: 'Resume uploaded and extracted successfully',
    });
  } catch (error) {
    console.error('Resume upload error:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });

      // Check for specific error types
      if (error.message.includes('AI service not configured')) {
        return NextResponse.json(
          { error: 'AI service configuration error. Please contact support.' },
          { status: 503 }
        );
      }

      if (error.message.includes('Failed to extract text from PDF')) {
        return NextResponse.json(
          { error: 'Unable to extract text from PDF. Please ensure the file is not password protected.' },
          { status: 400 }
        );
      }

      if (error.message.includes('Resume extraction failed')) {
        return NextResponse.json(
          { error: 'Unable to process resume content. Please try again.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload resume' },
      { status: 500 }
    );
  }
}