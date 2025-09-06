import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';

const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
});

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

    const resolvedParams = await params;
    const body = await request.json();
    const { rating } = ratingSchema.parse(body);

    // Verify job exists and belongs to user
    const job = await prisma.job.findFirst({
      where: {
        id: resolvedParams.id,
        userId: user.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Create or update rating
    const ratingRecord = await prisma.rating.upsert({
      where: {
        userId_jobId: {
          userId: user.id,
          jobId: resolvedParams.id,
        },
      },
      update: { rating },
      create: {
        userId: user.id,
        jobId: resolvedParams.id,
        rating,
      },
    });

    return NextResponse.json({ rating: ratingRecord });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid rating', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Rating error:', error);
    return NextResponse.json(
      { error: 'Failed to rate job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const resolvedParams = await params;
    const deleted = await prisma.rating.deleteMany({
      where: {
        userId: user.id,
        jobId: resolvedParams.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    console.error('Delete rating error:', error);
    return NextResponse.json(
      { error: 'Failed to delete rating' },
      { status: 500 }
    );
  }
}