import { NextRequest, NextResponse } from 'next/server';

// Temporarily disable middleware to avoid Edge Runtime JWT issues
// Each API route will handle its own authentication
export async function middleware(request: NextRequest) {
  // Allow all requests - auth is handled in individual API routes
  return NextResponse.next();
}

export const config = {
  matcher: [],
};