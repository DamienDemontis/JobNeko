import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// PATCH - Update session (add response, complete session)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { sessionId } = params;
    const body = await request.json();

    // Verify session belongs to user
    const existingSession = await prisma.interviewPracticeSession.findUnique({
      where: { id: sessionId }
    });

    if (!existingSession || existingSession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};

    if (body.responsesData !== undefined) {
      updateData.responsesData = JSON.stringify(body.responsesData);
    }

    if (body.currentQuestionIndex !== undefined) {
      updateData.currentQuestionIndex = body.currentQuestionIndex;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'completed') {
        updateData.completedAt = new Date();
      }
    }

    if (body.totalDuration !== undefined) {
      updateData.totalDuration = body.totalDuration;
    }

    if (body.overallFeedback !== undefined) {
      updateData.overallFeedback = JSON.stringify(body.overallFeedback);
    }

    const updatedSession = await prisma.interviewPracticeSession.update({
      where: { id: sessionId },
      data: updateData
    });

    return NextResponse.json({
      session: {
        ...updatedSession,
        questionsData: JSON.parse(updatedSession.questionsData),
        responsesData: updatedSession.responsesData ? JSON.parse(updatedSession.responsesData) : null,
        overallFeedback: updatedSession.overallFeedback ? JSON.parse(updatedSession.overallFeedback) : null
      }
    });
  } catch (error) {
    console.error('Error updating practice session:', error);
    return NextResponse.json(
      { error: 'Failed to update practice session' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { sessionId } = params;

    // Verify session belongs to user
    const existingSession = await prisma.interviewPracticeSession.findUnique({
      where: { id: sessionId }
    });

    if (!existingSession || existingSession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await prisma.interviewPracticeSession.delete({
      where: { id: sessionId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting practice session:', error);
    return NextResponse.json(
      { error: 'Failed to delete practice session' },
      { status: 500 }
    );
  }
}
