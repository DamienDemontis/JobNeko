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

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 5MB allowed.' },
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

    // Extract raw text from PDF (simple and reliable)
    const extractedData = await aiResumeExtractor.extractFromPDF(buffer, fileName);

    // Deactivate previous resumes
    await prisma.resume.updateMany({
      where: { userId: user.id },
      data: { isActive: false },
    });

    // Create resume record with raw text
    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileUrl,
        content: extractedData.rawText || extractedData.summary || '', // Store raw text content
        skills: '[]', // AI services will extract when needed
        experience: '[]', // AI services will extract when needed
        education: '[]', // AI services will extract when needed
        isActive: true,
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
      resume: {
        id: resume.id,
        filename: file.name,
        uploadedAt: resume.createdAt.toISOString(),
        extractedText: extractedData.rawText || extractedData.summary || '', // Return full content
        rawText: extractedData.rawText || '', // Return full raw text
        createdAt: resume.createdAt.toISOString(),
      },
      message: 'Resume uploaded and text extracted successfully',
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload resume' },
      { status: 500 }
    );
  }
}