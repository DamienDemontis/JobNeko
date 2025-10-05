'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { JobNekoLogo } from '@/components/ui/jobneko-logo';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    console.log('Login useEffect triggered:', { authLoading, user });
    if (!authLoading && user) {
      console.log('User already logged in, redirecting to dashboard...');
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    console.log('Login handleSubmit started');

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      console.log('Sending login request...');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('Login response:', { ok: response.ok, data });

      if (response.ok) {
        console.log('Login successful, calling AuthContext login...');
        login(data.user, data.token);
        toast.success('Welcome back!');

        // Check if user needs onboarding
        const onboardingResponse = await fetch('/api/user/onboarding-status', {
          headers: { 'Authorization': `Bearer ${data.token}` }
        });

        if (onboardingResponse.ok) {
          const onboardingData = await onboardingResponse.json();
          if (!onboardingData.onboardingCompleted) {
            console.log('User needs onboarding, redirecting...');
            router.push('/onboarding');
            return;
          }
        }

        // Navigation will be handled by the useEffect after state updates
        console.log('Login successful, waiting for useEffect to handle navigation...');
      } else {
        console.log('Login failed:', data.error);
        toast.error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
      console.log('Login handleSubmit completed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <JobNekoLogo size={80} showText={false} />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to JobNeko</CardTitle>
          <CardDescription>Sign in to your AI-powered job search assistant</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}