import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/user/profile
 * Update user profile information
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const {
      name,
      currentLocation,
      currentCountry,
      careerLevel,
      yearsOfExperience,
      openToRelocation,
      preferredCountries
    } = await request.json();

    // Update user's name
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || user.name,
        profileCompleted: true
      }
    });

    // Update or create user profile
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        currentLocation: currentLocation || null,
        currentCountry: currentCountry || null,
        careerLevel: careerLevel || null,
        yearsOfExperience: yearsOfExperience || null,
        openToRelocation: openToRelocation || false,
        preferredCountries: preferredCountries || null
      },
      update: {
        currentLocation: currentLocation || undefined,
        currentCountry: currentCountry || undefined,
        careerLevel: careerLevel || undefined,
        yearsOfExperience: yearsOfExperience || undefined,
        openToRelocation: openToRelocation !== undefined ? openToRelocation : undefined,
        preferredCountries: preferredCountries || undefined
      }
    });

    console.log(`✅ Profile updated for user ${user.id}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
