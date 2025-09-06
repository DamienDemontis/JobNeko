import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { extractResumeData } from '@/lib/ai-service';

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

    // Extract text from PDF
    let pdfText = '';
    try {
      // Dynamic import to avoid build issues
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(buffer);
      pdfText = pdfData.text;
    } catch (error) {
      console.error('PDF parsing error:', error);
      // Continue without text extraction
    }

    // Use AI to extract structured data from resume
    const extractedData = await extractResumeData(pdfText);

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
        content: pdfText.substring(0, 5000), // Limit content length
        skills: JSON.stringify(extractedData.skills || []),
        experience: JSON.stringify(extractedData.experience || []),
        education: JSON.stringify(extractedData.education || []),
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
        skills: extractedData.skills,
        experience: extractedData.experience,
        education: extractedData.education,
      },
      message: 'Resume uploaded and processed successfully',
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload resume' },
      { status: 500 }
    );
  }
}