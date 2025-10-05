'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { platformConfig, getDeploymentText } from '@/lib/config';
import { COUNTRIES, CAREER_LEVELS } from '@/lib/countries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import {
  User,
  FileText,
  Key,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  DollarSign,
  Eye,
  EyeOff,
  Upload,
  MapPin,
  Globe
} from 'lucide-react';

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface OnboardingState {
  currentStep: number;
  profileData: {
    name: string;
    currentLocation: string;
    currentCountry: string;
    careerLevel: string;
    yearsOfExperience: string;
    openToRelocation: boolean;
    preferredCountries: string[];
  };
  resumeData: {
    file: File | null;
    uploaded: boolean;
  };
  apiKeyData: {
    apiKey: string;
    configured: boolean;
  };
}

const TOTAL_STEPS = platformConfig.isSelfHosted ? 4 : 3;

export default function OnboardingPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const deploymentText = getDeploymentText();

  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [blackCatAnimation, setBlackCatAnimation] = useState<any>(null);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const [state, setState] = useState<OnboardingState>({
    currentStep: 1,
    profileData: {
      name: user?.name || '',
      currentLocation: '',
      currentCountry: '',
      careerLevel: '',
      yearsOfExperience: '',
      openToRelocation: false,
      preferredCountries: []
    },
    resumeData: {
      file: null,
      uploaded: false
    },
    apiKeyData: {
      apiKey: '',
      configured: false
    }
  });

  // Load black cat animation
  useEffect(() => {
    fetch('/neko/black-cat.json')
      .then(res => res.json())
      .then(data => setBlackCatAnimation(data))
      .catch(err => console.error('Failed to load animation:', err));
  }, []);

  // Close country dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showCountryDropdown && !target.closest('[data-country-selector]')) {
        setShowCountryDropdown(false);
        setCountrySearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCountryDropdown]);

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const response = await fetch('/api/user/onboarding-status', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.onboardingCompleted) {
            router.push('/dashboard');
          } else if (data.onboardingStep > 0) {
            setState(prev => ({ ...prev, currentStep: data.onboardingStep }));
          }
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
      }
    };

    if (user && token) {
      checkOnboarding();
    }
  }, [user, token, router]);

  const updateOnboardingProgress = async (step: number) => {
    try {
      await fetch('/api/user/onboarding-progress', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ step })
      });
    } catch (error) {
      console.error('Failed to update onboarding progress:', error);
    }
  };

  const toggleCountry = (country: string) => {
    setState(prev => ({
      ...prev,
      profileData: {
        ...prev.profileData,
        preferredCountries: prev.profileData.preferredCountries.includes(country)
          ? prev.profileData.preferredCountries.filter(c => c !== country)
          : [...prev.profileData.preferredCountries, country]
      }
    }));
  };

  const filteredCountries = countrySearch
    ? COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES;

  const handleNext = async () => {
    setLoading(true);

    try {
      switch (state.currentStep) {
        case 1:
          // Welcome screen - no validation needed
          break;

        case 2:
          // Profile information
          if (!state.profileData.name.trim()) {
            toast.error('Please enter your name');
            setLoading(false);
            return;
          }

          // Save profile
          const profileResponse = await fetch('/api/user/profile', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: state.profileData.name,
              currentLocation: state.profileData.currentLocation || null,
              currentCountry: state.profileData.currentCountry || null,
              careerLevel: state.profileData.careerLevel || null,
              yearsOfExperience: state.profileData.yearsOfExperience ? parseInt(state.profileData.yearsOfExperience) : null,
              openToRelocation: state.profileData.openToRelocation,
              preferredCountries: state.profileData.preferredCountries.length > 0
                ? JSON.stringify(state.profileData.preferredCountries)
                : null
            })
          });

          if (!profileResponse.ok) {
            const error = await profileResponse.json();
            throw new Error(error.error || 'Failed to save profile');
          }
          break;

        case 3:
          // Resume upload
          if (!state.resumeData.file && !state.resumeData.uploaded) {
            // Allow skipping
            break;
          }

          if (state.resumeData.file && !state.resumeData.uploaded) {
            const formData = new FormData();
            formData.append('resume', state.resumeData.file);

            const resumeResponse = await fetch('/api/resume/upload', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: formData
            });

            if (!resumeResponse.ok) {
              throw new Error('Failed to upload resume');
            }

            setState(prev => ({
              ...prev,
              resumeData: { ...prev.resumeData, uploaded: true }
            }));
          }
          break;

        case 4:
          // API Key (self-hosted mode only)
          if (platformConfig.isSelfHosted) {
            if (!state.apiKeyData.apiKey.trim()) {
              toast.error('Please enter your OpenAI API key');
              setLoading(false);
              return;
            }

            if (!state.apiKeyData.apiKey.startsWith('sk-')) {
              toast.error('Invalid API key format');
              setLoading(false);
              return;
            }

            const apiKeyResponse = await fetch('/api/settings/api-key', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ apiKey: state.apiKeyData.apiKey })
            });

            if (!apiKeyResponse.ok) {
              const error = await apiKeyResponse.json();
              throw new Error(error.error || 'Failed to configure API key');
            }

            setState(prev => ({
              ...prev,
              apiKeyData: { ...prev.apiKeyData, configured: true }
            }));
          }
          break;
      }

      const nextStep = state.currentStep + 1;

      if (nextStep > TOTAL_STEPS) {
        await fetch('/api/user/complete-onboarding', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        toast.success('Welcome to JobNeko! 🎉');
        router.push('/dashboard');
      } else {
        setState(prev => ({ ...prev, currentStep: nextStep }));
        await updateOnboardingProgress(nextStep);
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (state.currentStep > 1) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  };

  const handleSkip = async () => {
    if (state.currentStep === 3) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
      await updateOnboardingProgress(state.currentStep + 1);
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <Card className="border-gray-900 bg-white shadow-xl">
            <CardHeader className="text-center pb-6 pt-8">
              <div className="flex justify-center mb-6">
                {blackCatAnimation ? (
                  <div className="w-32 h-32">
                    <Lottie animationData={blackCatAnimation} loop={true} />
                  </div>
                ) : (
                  <div className="bg-black p-6 rounded-full">
                    <User className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>
              <CardTitle className="text-4xl font-bold text-black">
                Welcome to {deploymentText.appName}
              </CardTitle>
              <CardDescription className="text-lg mt-3 text-gray-700">
                {deploymentText.appTagline}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              <p className="text-center text-gray-800 text-lg">
                Let's get you set up in just a few steps. This will take less than 3 minutes.
              </p>

              <div className="space-y-4 mt-8">
                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <CheckCircle className="w-6 h-6 text-black mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-black">Track your job applications</p>
                    <p className="text-sm text-gray-600 mt-1">Organize all your job opportunities in one place</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <CheckCircle className="w-6 h-6 text-black mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-black">AI-powered matching</p>
                    <p className="text-sm text-gray-600 mt-1">Get instant compatibility scores for each job</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <CheckCircle className="w-6 h-6 text-black mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-black">Smart insights</p>
                    <p className="text-sm text-gray-600 mt-1">Salary analysis, company research, and interview prep</p>
                  </div>
                </div>

                {platformConfig.isSelfHosted && (
                  <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <CheckCircle className="w-6 h-6 text-black mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-black">Self-hosted & private</p>
                      <p className="text-sm text-gray-600 mt-1">Your data stays on your server, you control everything</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="border-gray-900 bg-white shadow-xl">
            <CardHeader className="pb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-black p-3 rounded-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-black">Your Profile</CardTitle>
                  <CardDescription>Tell us about yourself</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-black font-medium">Full Name *</Label>
                <Input
                  id="name"
                  value={state.profileData.name}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    profileData: { ...prev.profileData, name: e.target.value }
                  }))}
                  placeholder="John Doe"
                  disabled={loading}
                  className="border-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="currentLocation" className="text-black font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Current City (Optional)
                  </Label>
                  <Input
                    id="currentLocation"
                    value={state.profileData.currentLocation}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      profileData: { ...prev.profileData, currentLocation: e.target.value }
                    }))}
                    placeholder="San Francisco"
                    disabled={loading}
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="currentCountry" className="text-black font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Current Country (Optional)
                  </Label>
                  <select
                    id="currentCountry"
                    value={state.profileData.currentCountry}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      profileData: { ...prev.profileData, currentCountry: e.target.value }
                    }))}
                    disabled={loading}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="careerLevel" className="text-black font-medium">Career Level (Optional)</Label>
                  <select
                    id="careerLevel"
                    value={state.profileData.careerLevel}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      profileData: { ...prev.profileData, careerLevel: e.target.value }
                    }))}
                    disabled={loading}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
                  >
                    <option value="">Select level</option>
                    {CAREER_LEVELS.map(level => (
                      <option key={level} value={level.toLowerCase()}>{level}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="yearsOfExperience" className="text-black font-medium">Years of Experience (Optional)</Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    min="0"
                    max="50"
                    value={state.profileData.yearsOfExperience}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      profileData: { ...prev.profileData, yearsOfExperience: e.target.value }
                    }))}
                    placeholder="3"
                    disabled={loading}
                    className="border-gray-300"
                  />
                </div>
              </div>

              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="openToRelocation"
                    checked={state.profileData.openToRelocation}
                    onCheckedChange={(checked) => setState(prev => ({
                      ...prev,
                      profileData: { ...prev.profileData, openToRelocation: checked as boolean }
                    }))}
                    disabled={loading}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="openToRelocation" className="text-black font-medium cursor-pointer">
                      Open to relocation
                    </Label>
                    <p className="text-xs text-gray-600">
                      Check this if you're willing to move for the right opportunity
                    </p>
                  </div>
                </div>

                {state.profileData.openToRelocation && (
                  <div className="space-y-3 mt-4" data-country-selector>
                    <Label className="text-black font-medium">
                      Where would you consider relocating? (Optional)
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Search countries..."
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        onFocus={() => setShowCountryDropdown(true)}
                        className="border-gray-300"
                      />
                      {showCountryDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredCountries.map(country => (
                            <div
                              key={country}
                              className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => {
                                toggleCountry(country);
                                setCountrySearch('');
                              }}
                            >
                              <Checkbox
                                checked={state.profileData.preferredCountries.includes(country)}
                                onCheckedChange={() => toggleCountry(country)}
                              />
                              <span className="text-sm">{country}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {state.profileData.preferredCountries.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {state.profileData.preferredCountries.map(country => (
                          <div
                            key={country}
                            className="flex items-center space-x-1 bg-black text-white px-3 py-1 rounded-full text-xs"
                          >
                            <span>{country}</span>
                            <button
                              onClick={() => toggleCountry(country)}
                              className="hover:text-gray-300"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="border-gray-900 bg-white shadow-xl">
            <CardHeader className="pb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-black p-3 rounded-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-black">Upload Your Resume</CardTitle>
                  <CardDescription>This helps us match you with the right opportunities</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-gray-200 bg-gray-50">
                <FileText className="h-4 w-4 text-black" />
                <AlertTitle className="text-black">Why do we need your resume?</AlertTitle>
                <AlertDescription className="text-gray-700">
                  Your resume is used to calculate match percentages with job offers, identify skills gaps,
                  and provide personalized recommendations. It never leaves your server.
                </AlertDescription>
              </Alert>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-black transition-colors">
                <input
                  type="file"
                  id="resume-upload"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setState(prev => ({
                        ...prev,
                        resumeData: { file, uploaded: false }
                      }));
                    }
                  }}
                  className="hidden"
                  disabled={loading}
                />
                <label htmlFor="resume-upload" className="cursor-pointer">
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-black mb-2">
                    {state.resumeData.file ? state.resumeData.file.name : 'Click to upload your resume'}
                  </p>
                  <p className="text-sm text-gray-600">
                    PDF, DOC, DOCX, or TXT (Max 10MB)
                  </p>
                </label>
              </div>

              {state.resumeData.file && (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">{state.resumeData.file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setState(prev => ({
                      ...prev,
                      resumeData: { file: null, uploaded: false }
                    }))}
                    className="text-green-900 hover:text-green-700"
                  >
                    Remove
                  </Button>
                </div>
              )}

              <p className="text-xs text-gray-500 text-center">
                You can upload or update your resume later in the Profile section
              </p>
            </CardContent>
          </Card>
        );

      case 4:
        if (platformConfig.isSelfHosted) {
          return (
            <Card className="border-gray-900 bg-white shadow-xl">
              <CardHeader className="pb-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-black p-3 rounded-lg">
                    <Key className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-black">Configure Your API Key</CardTitle>
                    <CardDescription>{deploymentText.apiKeyDescription}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert variant="destructive" className="border-red-300 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-900">⚠️ IMPORTANT: Set Spending Limits First!</AlertTitle>
                  <AlertDescription className="space-y-3 text-red-800">
                    <p className="font-semibold">
                      Before entering your API key, set spending limits on your OpenAI account to prevent unexpected charges.
                    </p>
                    <Button
                      variant="default"
                      size="sm"
                      asChild
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <a
                        href="https://platform.openai.com/account/limits"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Set Spending Limits (Do This First!)
                      </a>
                    </Button>
                    <p className="text-xs">
                      <strong>Recommended limit:</strong> $10-20/month for typical usage
                    </p>
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Label htmlFor="apiKey" className="text-black font-medium">OpenAI API Key *</Label>
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <Input
                        id="apiKey"
                        type={showApiKey ? 'text' : 'password'}
                        value={state.apiKeyData.apiKey}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          apiKeyData: { ...prev.apiKeyData, apiKey: e.target.value }
                        }))}
                        placeholder="sk-proj-..."
                        disabled={loading}
                        className="pr-10 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Get your API key from{' '}
                    <a href="https://platform.openai.com/api-keys" target="_blank" className="text-black underline hover:text-gray-700">
                      OpenAI Dashboard
                    </a>
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h5 className="font-medium text-sm mb-3 text-black">Quick Setup:</h5>
                  <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside">
                    <li><strong>FIRST:</strong> Set spending limits at OpenAI</li>
                    <li>Get your API key from OpenAI</li>
                    <li>Paste it above</li>
                    <li>We'll test it before saving</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          );
        }
        return null;

      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-600">Please log in to continue.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-medium text-gray-600">
              Step {state.currentStep} of {TOTAL_STEPS}
            </p>
            <p className="text-sm font-medium text-gray-600">
              {Math.round((state.currentStep / TOTAL_STEPS) * 100)}% Complete
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-black h-full transition-all duration-300 ease-out"
              style={{ width: `${(state.currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Current step content */}
        {renderStep()}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={state.currentStep === 1 || loading}
            className="border-gray-300 text-black hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex space-x-2">
            {state.currentStep === 3 && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={loading}
                className="text-gray-600 hover:text-gray-800"
              >
                Skip for now
              </Button>
            )}

            <Button
              onClick={handleNext}
              disabled={loading}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {loading ? 'Processing...' : state.currentStep === TOTAL_STEPS ? 'Complete Setup' : 'Continue'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
