import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';
import { withErrorHandling } from '@/lib/error-handling';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (token) {
    await deleteSession();
  }

  // Create response
  const response = NextResponse.json({ message: 'Logged out successfully' });
  
  // Clear the cookie
  response.cookies.delete('token');
  
  return response;
});