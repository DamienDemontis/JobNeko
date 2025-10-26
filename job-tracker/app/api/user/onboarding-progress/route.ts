import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/user/onboarding-progress
 * Update user's current onboarding step
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

    const { step } = await request.json();

    if (typeof step !== 'number' || step < 0 || step > 5) {
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
    }

    // Update onboarding step
    await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingStep: step
      }
    });

    return NextResponse.json({ success: true, step });

  } catch (error) {
    console.error('Error updating onboarding progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
