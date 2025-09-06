import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';

// Force this API route to use Node.js runtime instead of Edge Runtime
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Try to get token from Authorization header or cookie
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const cookieToken = request.cookies.get('token')?.value;
    const token = authHeader || cookieToken;

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const user = await validateToken(token);

    if (!user) {
      console.log('Token validation failed for token:', token.substring(0, 20) + '...');
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}