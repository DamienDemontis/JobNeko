import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

export interface UserPayload {
  id: string;
  email: string;
  name?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: string, email: string, name?: string): string {
  return jwt.sign(
    { id: userId, email, name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token: string): UserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error instanceof Error ? error.message : error);
    return null;
  }
}

// Simplified: Just generate a JWT token for the user
export async function createToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return generateToken(userId, user.email, user.name || undefined);
}

// Simplified: Validate JWT and return user data
export async function validateToken(token: string) {  
  const payload = verifyToken(token);
  
  if (!payload) {
    console.log('Token verification failed - invalid JWT');
    return null;
  }
  
  // Verify user still exists in database
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
  
  if (!user) {
    console.log('User not found in database for id:', payload.id);
  }

  return user;
}

// Backward compatibility aliases
export const createSession = createToken;
export const validateSession = validateToken;
export const deleteSession = async (): Promise<void> => {
  // No-op: JWT tokens are stateless, no need to delete
};