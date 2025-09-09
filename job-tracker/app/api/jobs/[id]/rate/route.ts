import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { 
  withErrorHandling, 
  AuthenticationError, 
  NotFoundError,
  validateId 
} from '@/lib/error-handling';

const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
});

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  const resolvedParams = await params;
  validateId(resolvedParams.id, 'Job ID');
  
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
    throw new NotFoundError('Job');
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
});

export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  const resolvedParams = await params;
  validateId(resolvedParams.id, 'Job ID');
  
  const deleted = await prisma.rating.deleteMany({
    where: {
      userId: user.id,
      jobId: resolvedParams.id,
    },
  });

  if (deleted.count === 0) {
    throw new NotFoundError('Rating');
  }

  return NextResponse.json({ message: 'Rating deleted successfully' });
});