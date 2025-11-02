import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET - Fetch all practice sessions for a user/job
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    const where: any = { userId: user.id };
    if (jobId) {
      where.jobId = jobId;
    }

    const sessions = await prisma.interviewPracticeSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to 50 most recent sessions
    });

    // Parse JSON fields
    const parsedSessions = sessions.map(session => ({
      ...session,
      questionsData: JSON.parse(session.questionsData),
      responsesData: session.responsesData ? JSON.parse(session.responsesData) : null,
      overallFeedback: session.overallFeedback ? JSON.parse(session.overallFeedback) : null
    }));

    return NextResponse.json({ sessions: parsedSessions });
  } catch (error) {
    console.error('Error fetching practice sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch practice sessions' },
      { status: 500 }
    );
  }
}

// POST - Create new practice session
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, sessionType, difficulty, questions } = body;

    if (!jobId || !sessionType || !difficulty || !questions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const session = await prisma.interviewPracticeSession.create({
      data: {
        userId: user.id,
        jobId,
        sessionType,
        difficulty,
        questionsData: JSON.stringify(questions),
        status: 'in_progress'
      }
    });

    return NextResponse.json({
      session: {
        ...session,
        questionsData: JSON.parse(session.questionsData),
        responsesData: null,
        overallFeedback: null
      }
    });
  } catch (error) {
    console.error('Error creating practice session:', error);
    return NextResponse.json(
      { error: 'Failed to create practice session' },
      { status: 500 }
    );
  }
}
