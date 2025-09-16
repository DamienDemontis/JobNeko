import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { withErrorHandling, AuthenticationError } from '@/lib/error-handling';

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  // Validate authentication
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }
  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  // Delete all jobs for the authenticated user
  const deleteResult = await prisma.job.deleteMany({
    where: {
      userId: user.id
    }
  });

  return NextResponse.json({
    success: true,
    deletedCount: deleteResult.count,
    message: `Successfully deleted ${deleteResult.count} jobs`
  });
});