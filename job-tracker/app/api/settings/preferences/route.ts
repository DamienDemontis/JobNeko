import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import {
  withErrorHandling,
  AuthenticationError,
} from '@/lib/error-handling';

export const runtime = 'nodejs';

/**
 * GET /api/settings/preferences
 * Get user's AI and UI preferences
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  // Get or create user profile and preferences
  let profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    include: { preferences: true }
  });

  if (!profile) {
    // Create default profile
    profile = await prisma.userProfile.create({
      data: {
        userId: user.id,
        preferences: {
          create: {
            userId: user.id,
          }
        }
      },
      include: { preferences: true }
    });
  } else if (!profile.preferences) {
    // Create default preferences if missing
    await prisma.userPreferences.create({
      data: {
        userId: user.id,
        userProfileId: profile.id,
      }
    });

    profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: { preferences: true }
    });
  }

  return NextResponse.json({
    success: true,
    preferences: profile?.preferences || {}
  });
});

/**
 * PUT /api/settings/preferences
 * Update user's preferences
 */
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  const body = await request.json();

  // Get or create profile
  let profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    include: { preferences: true }
  });

  if (!profile) {
    profile = await prisma.userProfile.create({
      data: {
        userId: user.id,
        preferences: {
          create: {
            userId: user.id,
            ...body
          }
        }
      },
      include: { preferences: true }
    });
  } else if (!profile.preferences) {
    await prisma.userPreferences.create({
      data: {
        userId: user.id,
        userProfileId: profile.id,
        ...body
      }
    });
  } else {
    // Update existing preferences
    await prisma.userPreferences.update({
      where: { id: profile.preferences.id },
      data: body
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Preferences updated successfully'
  });
});