import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSession } from '@/lib/auth';
import { 
  withErrorHandling, 
  ConflictError 
} from '@/lib/error-handling';

// Force this API route to use Node.js runtime instead of Edge Runtime
export const runtime = 'nodejs';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { email, password, name } = registerSchema.parse(body);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  const token = await createSession(user.id);

  // Create response with JSON data
  const response = NextResponse.json({
    user,
    token,
  });

  // Also set token as httpOnly cookie for better security and sharing
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return response;
});