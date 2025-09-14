import { NextRequest, NextResponse } from 'next/server';
import { aiNegotiationCoach } from '@/lib/services/ai-negotiation-coach';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.jobId || !body.jobTitle || !body.company || !body.location) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, jobTitle, company, location' },
        { status: 400 }
      );
    }

    // Ensure userId matches authenticated user
    const negotiationRequest = {
      ...body,
      userId: user.id
    };

    // Generate negotiation strategy
    const result = await aiNegotiationCoach.generateStrategy(negotiationRequest);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Negotiation strategy generation error:', error);

    return NextResponse.json(
      {
        error: 'Strategy generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}