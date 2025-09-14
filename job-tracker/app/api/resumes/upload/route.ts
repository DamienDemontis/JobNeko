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

    // Use AI to extract ALL data directly from PDF
    const extractedData = await aiResumeExtractor.extractFromPDF(buffer, fileName);

    // Deactivate previous resumes
    await prisma.resume.updateMany({
      where: { userId: user.id },
      data: { isActive: false },
    });

    // Create resume record
    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileUrl,
        content: JSON.stringify(extractedData), // Store complete AI extraction
        skills: JSON.stringify(extractedData.technicalSkills.concat(extractedData.softSkills)),
        experience: JSON.stringify(extractedData.experience),
        education: JSON.stringify(extractedData.education),
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
        ...resume,
        extractedData, // Include full AI extraction
      },
      message: 'Resume uploaded and AI-processed successfully',
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload resume' },
      { status: 500 }
    );
  }
}