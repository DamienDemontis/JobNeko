'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Trash, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { token } = useAuth();

  const handleDeleteAllJobs = async () => {
    const confirmed = window.confirm(
      'Are you absolutely sure?\n\nThis action cannot be undone. This will permanently delete all your saved job offers, including ratings, notes, and analysis data.'
    );

    if (!confirmed) return;

    const currentToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!currentToken) {
      toast.error('Authentication required. Please log in again.');
      router.push('/login');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/jobs/delete-all', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete jobs');
      }

      const result = await response.json();
      toast.success(`Successfully deleted ${result.deletedCount} jobs`);

      // Redirect to dashboard after deletion
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting jobs:', error);
      toast.error('Failed to delete jobs. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-gray-600" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">Manage your job tracker preferences and data</p>
        </div>

        <div className="space-y-6">
          {/* Data Management Section */}
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Manage your stored job data and application history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Delete All Jobs</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Permanently delete all saved job offers and their associated data. This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="flex items-center gap-2"
                  disabled={isDeleting}
                  onClick={handleDeleteAllJobs}
                >
                  <Trash className="h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete All Jobs'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Section */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Navigate to other sections of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/dashboard')}
              >
                Back to Dashboard
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/profile')}
              >
                View Profile
              </Button>
            </CardContent>
          </Card>

          {/* App Information */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>
                Job Tracker application information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Version:</strong> 1.0.0</p>
                <p><strong>Built with:</strong> Next.js, TypeScript, Tailwind CSS</p>
                <p><strong>Features:</strong> AI-powered job analysis, Resume matching, Salary intelligence</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}