import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { calculateJobMatch } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const session = await validateToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get user's latest resume
    const resume = await prisma.resume.findFirst({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!resume) {
      return NextResponse.json(
        { error: 'No resume found. Please upload a resume first.' },
        { status: 400 }
      );
    }

    // Get all user's jobs
    const jobs = await prisma.job.findMany({
      where: { userId: session.id },
    });

    let updatedCount = 0;

    // Recalculate match score for each job
    for (const job of jobs) {
      try {
        const matchScore = await calculateJobMatch(
          { content: resume.content || '' },
          {
            title: job.title,
            company: job.company,
            description: job.description || '',
            requirements: job.requirements || '',
          }
        );

        await prisma.job.update({
          where: { id: job.id },
          data: { matchScore },
        });

        updatedCount++;
      } catch (error) {
        console.error(`Failed to update match score for job ${job.id}:`, error);
      }
    }

    return NextResponse.json({
      message: 'Job matching completed',
      updatedJobs: updatedCount,
    });
  } catch (error) {
    console.error('Job rematch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}