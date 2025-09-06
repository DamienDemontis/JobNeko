import React, { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

interface TestWrapperProps {
  children: ReactNode;
}

export function TestWrapper({ children }: TestWrapperProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}