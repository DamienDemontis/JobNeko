import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Debug environment variables (safely)
    const envDebug = {
      NODE_ENV: process.env.NODE_ENV,
      OPENAI_API_KEY_PRESENT: !!process.env.OPENAI_API_KEY,
      OPENAI_API_KEY_LENGTH: process.env.OPENAI_API_KEY?.length || 0,
      OPENAI_API_KEY_PREFIX: process.env.OPENAI_API_KEY?.substring(0, 10) || 'none',
      DATABASE_URL_PRESENT: !!process.env.DATABASE_URL,
      JWT_SECRET_PRESENT: !!process.env.JWT_SECRET,
    };

    return NextResponse.json(envDebug);
  } catch (error) {
    console.error('Environment debug error:', error);
    return NextResponse.json(
      { error: 'Failed to debug environment' },
      { status: 500 }
    );
  }
}