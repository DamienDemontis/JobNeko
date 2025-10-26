import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/user/complete-onboarding
 * Mark user's onboarding as completed
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

    // Mark onboarding as completed
    await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: true,
        onboardingStep: 5 // Max step
      }
    });

    console.log(`✅ Onboarding completed for user ${user.id}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
