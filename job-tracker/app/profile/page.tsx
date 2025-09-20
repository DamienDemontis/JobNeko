'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, FileText, User, ArrowLeft, MapPin, DollarSign, Heart, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [showFullResumeContent, setShowFullResumeContent] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    // Location Information
    currentCity: '',
    currentCountry: '',
    currentState: '',
    // Financial Context
    currentSalary: 0,
    expectedSalary: 0,
    currencyPreference: 'USD',
    // Preferences
    workModePreference: 'hybrid',
    willingToRelocate: false,
    // Professional Networks
    linkedinUrl: '',
  });

  useEffect(() => {
    if (user && token) {
      fetchUserProfile();
      fetchUserResume();
    }
  }, [user, token]);

  const fetchUserProfile = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          // Update the user profile state with the fetched data
          setUserProfile(prev => ({
            ...prev,
            ...data.profile,
            // Handle location parsing if needed
            currentCity: data.profile.currentCity || '',
            currentCountry: data.profile.currentCountry || '',
            currentState: data.profile.currentState || '',
            linkedinUrl: data.profile.linkedinUrl || '',
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

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
            filename: latestResume.filename || latestResume.fileName,
            uploadedAt: latestResume.createdAt,
            extractedText: latestResume.content, // This should now be the full raw text
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
        toast.success('Resume uploaded successfully!');
        // Refresh the resume data to get the full content
        await fetchUserResume();
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
        // Refresh the profile data to show the updated values
        await fetchUserProfile();
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

          <div className="grid lg:grid-cols-1 gap-8">
            {/* Basic Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Your account and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
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
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Location & Work Preferences
                </CardTitle>
                <CardDescription>
                  Help us provide accurate salary intelligence for your location
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="currentCity">Current City</Label>
                    <Input
                      id="currentCity"
                      value={userProfile.currentCity}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, currentCity: e.target.value }))}
                      placeholder="e.g., San Francisco"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentState">State/Province</Label>
                    <Input
                      id="currentState"
                      value={userProfile.currentState}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, currentState: e.target.value }))}
                      placeholder="e.g., California"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentCountry">Country</Label>
                    <Input
                      id="currentCountry"
                      value={userProfile.currentCountry}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, currentCountry: e.target.value }))}
                      placeholder="e.g., United States"
                    />
                  </div>
                </div>

                {/* Professional Networks */}
                <div>
                  <Label htmlFor="linkedinUrl">LinkedIn Profile URL</Label>
                  <Input
                    id="linkedinUrl"
                    value={userProfile.linkedinUrl}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                    placeholder="https://linkedin.com/in/your-profile"
                    type="url"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used for network analysis and intelligent outreach features
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="workModePreference">Preferred Work Mode</Label>
                    <Select value={userProfile.workModePreference} onValueChange={(value) => setUserProfile(prev => ({ ...prev, workModePreference: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="onsite">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="willingToRelocate"
                      checked={userProfile.willingToRelocate}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, willingToRelocate: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <Label htmlFor="willingToRelocate" className="text-sm font-medium">
                      Willing to relocate for the right opportunity
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Financial Context */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Financial Context
                </CardTitle>
                <CardDescription>
                  Salary information helps us provide personalized job recommendations and comparisons
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="currentSalary">Current Salary</Label>
                    <Input
                      id="currentSalary"
                      type="number"
                      value={userProfile.currentSalary || ''}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, currentSalary: parseFloat(e.target.value) || 0 }))}
                      placeholder="80000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expectedSalary">Expected Salary</Label>
                    <Input
                      id="expectedSalary"
                      type="number"
                      value={userProfile.expectedSalary || ''}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, expectedSalary: parseFloat(e.target.value) || 0 }))}
                      placeholder="100000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currencyPreference">Currency</Label>
                    <Select value={userProfile.currencyPreference} onValueChange={(value) => setUserProfile(prev => ({ ...prev, currencyPreference: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD (C$)</SelectItem>
                        <SelectItem value="AUD">AUD (A$)</SelectItem>
                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                        <SelectItem value="CHF">CHF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Heart className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Privacy Note</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Your salary information is kept private and secure. It&apos;s used only to provide personalized job matching and salary intelligence.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* Resume Management */}
            <Card className="mt-8">
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
                      <div className="mt-4 border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Extracted Content
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFullResumeContent(!showFullResumeContent)}
                            className="flex items-center gap-2"
                          >
                            {showFullResumeContent ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                Hide Full Content
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                View Full Content
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Preview (always shown) */}
                        <div className="mb-3">
                          <Label className="text-xs text-gray-600">Preview (first 200 characters):</Label>
                          <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-700 border">
                            {String(resume.extractedText).substring(0, 200)}
                            {String(resume.extractedText).length > 200 && (
                              <span className="text-gray-500">...</span>
                            )}
                          </div>
                        </div>

                        {/* Full content (collapsible) */}
                        {showFullResumeContent && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-gray-600">
                                Full Content ({String(resume.extractedText).length} characters):
                              </Label>
                              <Badge variant="outline" className="text-xs">
                                AI-Extracted Text
                              </Badge>
                            </div>
                            <Textarea
                              value={String(resume.extractedText)}
                              readOnly
                              className="min-h-[300px] text-sm font-mono"
                              placeholder="No content available"
                            />
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(String(resume.extractedText));
                                  toast.success('Resume content copied to clipboard');
                                }}
                                className="text-xs"
                              >
                                Copy to Clipboard
                              </Button>
                            </div>
                          </div>
                        )}
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

            {/* Save All Changes Button - Moved to end of page */}
            <div className="flex justify-center mt-8">
              <Button
                onClick={updateProfile}
                disabled={isLoading}
                className="px-12 py-3 text-lg font-semibold"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Saving Changes...
                  </>
                ) : (
                  'Save All Changes'
                )}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}