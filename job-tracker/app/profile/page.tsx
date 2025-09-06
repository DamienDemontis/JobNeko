'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, FileText, User, ArrowLeft } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Link from 'next/link';

interface Resume {
  id: string;
  filename: string;
  uploadedAt: string;
  extractedText?: string;
}

export default function ProfilePage() {
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [resume, setResume] = useState<Resume | null>(null);
  const [userProfile, setUserProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  useEffect(() => {
    if (user && token) {
      fetchUserResume();
    }
  }, [user, token]);

  const fetchUserResume = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/resumes', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.resumes && data.resumes.length > 0) {
          // Get the most recent resume
          const latestResume = data.resumes[0];
          setResume({
            id: latestResume.id,
            filename: latestResume.filename,
            uploadedAt: latestResume.createdAt,
            extractedText: latestResume.content,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch resume:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('/api/resumes/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResume(data.resume);
        toast.success('Resume uploaded successfully!');
        // Trigger job re-matching
        await triggerJobMatching();
      } else {
        toast.error(data.error || 'Failed to upload resume');
      }
    } catch (error) {
      toast.error('Failed to upload resume. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerJobMatching = async () => {
    if (!token) return;
    
    try {
      await fetch('/api/jobs/rematch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success('Job matching updated!');
    } catch (error) {
      console.error('Failed to trigger job matching:', error);
    }
  };

  const updateProfile = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userProfile),
      });

      if (response.ok) {
        toast.success('Profile updated successfully!');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
            </div>
            <p className="text-gray-600 mt-2">Manage your account and resume</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your account information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={userProfile.name}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                  />
                </div>
                <Button onClick={updateProfile} disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Profile'}
                </Button>
              </CardContent>
            </Card>

            {/* Resume Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Resume Management
                </CardTitle>
                <CardDescription>
                  Upload your resume for AI-powered job matching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {resume ? (
                  <div className="border rounded-lg p-4 bg-green-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-green-800">{resume.filename}</h4>
                        <p className="text-sm text-green-600">
                          Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-green-600">
                        <FileText className="w-6 h-6" />
                      </div>
                    </div>
                    {resume.extractedText && (
                      <div className="mt-3">
                        <Label>Extracted Content Preview:</Label>
                        <Textarea
                          value={resume.extractedText.substring(0, 200) + '...'}
                          readOnly
                          className="mt-2 h-20 text-sm"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No resume uploaded yet</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="resume-upload">
                    {resume ? 'Replace Resume' : 'Upload Resume'}
                  </Label>
                  <Input
                    id="resume-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={isLoading}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Upload a PDF file (max 5MB). This will be used for AI job matching.
                  </p>
                </div>

                {resume && (
                  <Button
                    variant="outline"
                    onClick={triggerJobMatching}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Re-calculate Job Matches
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
              <CardDescription>Your job tracking activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-gray-600">Jobs Extracted</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-gray-600">Applications</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">0</div>
                  <div className="text-sm text-gray-600">Interviews</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">0%</div>
                  <div className="text-sm text-gray-600">Avg Match Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}