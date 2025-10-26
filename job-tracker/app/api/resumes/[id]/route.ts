import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * GET /api/resumes/[id]
 * Get a specific resume with full content
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id: resumeId } = await params;

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

    return NextResponse.json({
      success: true,
      resume: {
        id: resume.id,
        displayName: resume.displayName,
        fileName: resume.fileName,
        fileSizeBytes: resume.fileSizeBytes,
        content: resume.content || '',
        skills: resume.skills ? JSON.parse(resume.skills) : [],
        experience: resume.experience ? JSON.parse(resume.experience) : [],
        education: resume.education ? JSON.parse(resume.education) : [],
        isPrimary: resume.isPrimary,
        lastUsedAt: resume.lastUsedAt?.toISOString(),
        usageCount: resume.usageCount,
        createdAt: resume.createdAt.toISOString(),
        updatedAt: resume.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Get resume error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resume' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/resumes/[id]
 * Update resume name
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id: resumeId } = await params;
    const body = await request.json();
    const { displayName } = body;

    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      );
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

    // Update display name
    const updated = await prisma.resume.update({
      where: { id: resumeId },
      data: { displayName: displayName.trim() }
    });

    return NextResponse.json({
      success: true,
      resume: {
        id: updated.id,
        displayName: updated.displayName,
        fileName: updated.fileName,
        isPrimary: updated.isPrimary
      }
    });
  } catch (error) {
    console.error('Update resume error:', error);
    return NextResponse.json(
      { error: 'Failed to update resume' },
      { status: 500 }
    );
  }
}
