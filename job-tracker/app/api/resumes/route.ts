import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';

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

    const resumes = await prisma.resume.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const formattedResumes = resumes.map(resume => ({
      id: resume.id,
      userId: resume.userId,
      filename: resume.fileName,
      fileUrl: resume.fileUrl,
      content: resume.content || '', // Return raw content as string
      skills: resume.skills ? JSON.parse(resume.skills) : [],
      experience: resume.experience ? JSON.parse(resume.experience) : [],
      education: resume.education ? JSON.parse(resume.education) : [],
      isActive: resume.isActive,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
    }));

    return NextResponse.json({ resumes: formattedResumes });
  } catch (error) {
    console.error('Get resumes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resumes' },
      { status: 500 }
    );
  }
}

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

    const deleted = await prisma.resume.deleteMany({
      where: {
        id: resumeId,
        userId: user.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Delete resume error:', error);
    return NextResponse.json(
      { error: 'Failed to delete resume' },
      { status: 500 }
    );
  }
}