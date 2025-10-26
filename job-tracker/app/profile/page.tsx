'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { User, ArrowLeft, MapPin, DollarSign, Heart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Link from 'next/link';
import { ResumeManager } from '@/components/ui/resume-manager';
import { SiteHeader } from '@/components/ui/site-header';

export default function ProfilePage() {
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
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
      <SiteHeader />
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



            {/* Resume Management - Multi-Resume Support */}
            <ResumeManager userId={user?.id || ''} token={token || ''} />

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