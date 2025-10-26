import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * GET /api/resumes
 * List all active resumes for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if includeContent query param is true (for full data)
    const { searchParams } = new URL(request.url);
    const includeContent = searchParams.get('includeContent') === 'true';

    // Fetch all active resumes for user
    const resumes = await prisma.resume.findMany({
      where: {
        userId: user.id,
        isActive: true
      },
      select: {
        id: true,
        displayName: true,
        fileName: true,
        fileSizeBytes: true,
        isPrimary: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
        updatedAt: true,
        // Conditionally include full content
        content: includeContent,
        skills: includeContent,
        experience: includeContent,
        education: includeContent
      },
      orderBy: [
        { isPrimary: 'desc' }, // Primary first
        { createdAt: 'desc' }  // Then newest first
      ]
    });

    const formattedResumes = resumes.map(resume => ({
      id: resume.id,
      displayName: resume.displayName,
      fileName: resume.fileName,
      fileSizeBytes: resume.fileSizeBytes,
      isPrimary: resume.isPrimary,
      lastUsedAt: resume.lastUsedAt?.toISOString(),
      usageCount: resume.usageCount,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
      ...(includeContent && {
        content: resume.content || '',
        skills: resume.skills ? JSON.parse(resume.skills) : [],
        experience: resume.experience ? JSON.parse(resume.experience) : [],
        education: resume.education ? JSON.parse(resume.education) : []
      })
    }));

    return NextResponse.json({
      success: true,
      resumes: formattedResumes,
      count: resumes.length
    });
  } catch (error) {
    console.error('Get resumes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resumes' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/resumes?id=xxx
 * Soft delete a resume (sets isActive = false)
 * Cannot delete primary resume
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const resumeId = searchParams.get('id');

    if (!resumeId) {
      return NextResponse.json({ error: 'Resume ID required' }, { status: 400 });
    }

    // Check if resume exists and belongs to user
    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId: user.id,
        isActive: true
      }
    });

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    // Prevent deleting primary resume
    if (resume.isPrimary) {
      return NextResponse.json(
        { error: 'Cannot delete primary resume. Set another resume as primary first.' },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.resume.update({
      where: { id: resumeId },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('Delete resume error:', error);
    return NextResponse.json(
      { error: 'Failed to delete resume' },
      { status: 500 }
    );
  }
}