import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/resumes/[id]/set-primary
 * Set a resume as primary (unsets others atomically)
 */
export async function POST(
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

    // If already primary, return success
    if (resume.isPrimary) {
      return NextResponse.json({
        success: true,
        message: 'Resume is already primary'
      });
    }

    // Atomically update: unset all other primary, set this one as primary
    await prisma.$transaction([
      // Unset all primary flags for this user
      prisma.resume.updateMany({
        where: {
          userId: user.id,
          isPrimary: true
        },
        data: {
          isPrimary: false
        }
      }),
      // Set this resume as primary
      prisma.resume.update({
        where: { id: resumeId },
        data: { isPrimary: true }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Resume set as primary'
    });
  } catch (error) {
    console.error('Set primary resume error:', error);
    return NextResponse.json(
      { error: 'Failed to set primary resume' },
      { status: 500 }
    );
  }
}
