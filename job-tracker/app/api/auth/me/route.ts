import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { withErrorHandling, AuthenticationError } from '@/lib/error-handling';

// Force this API route to use Node.js runtime instead of Edge Runtime
export const runtime = 'nodejs';

export const GET = withErrorHandling(async (request: NextRequest) => {
    // Try to get token from Authorization header or cookie
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const cookieToken = request.cookies.get('token')?.value;
    const token = authHeader || cookieToken;

    if (!token) {
      throw new AuthenticationError('Authentication token required');
    }

    const user = await validateToken(token);

    if (!user) {
      console.log('Token validation failed for token:', token.substring(0, 20) + '...');
      throw new AuthenticationError('Invalid or expired token');
    }

  return NextResponse.json({ user });
});