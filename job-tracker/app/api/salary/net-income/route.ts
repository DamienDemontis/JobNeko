import { NextRequest, NextResponse } from 'next/server';
import { netIncomeCalculator } from '@/lib/services/net-income-calculator';
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
    if (!body.grossSalary || !body.location) {
      return NextResponse.json(
        { error: 'Missing required fields: grossSalary, location' },
        { status: 400 }
      );
    }

    // Add userId to request
    const netIncomeRequest = {
      ...body,
      userId: user.id
    };

    // Calculate net income
    const result = await netIncomeCalculator.calculate(netIncomeRequest);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Net income calculation error:', error);

    return NextResponse.json(
      {
        error: 'Calculation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}