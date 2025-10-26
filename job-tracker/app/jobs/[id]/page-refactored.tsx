'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SiteHeader } from '@/components/ui/site-header';
import { toast } from 'sonner';

// Unified AI Components
import { UnifiedMatchTab } from '@/components/ui/unified-match-tab';
import { UnifiedSalaryTab } from '@/components/ui/unified-salary-tab';
import { UnifiedInterviewTab } from '@/components/ui/unified-interview-tab';
import { UnifiedCompanyTab } from '@/components/ui/unified-company-tab';

// Icons
import {
  ArrowTopRightOnSquareIcon as ExternalLinkIcon,
  MapPinIcon,
  BuildingOffice2Icon as BuildingIcon,
  CurrencyDollarIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline';

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  contractType?: string;
  skills?: string;
  description?: string;
  requirements?: string;
  perks?: string;
  workMode?: string;
  url?: string;
  applicationStatus: string;
  priority: string;
  rating?: number;
  appliedAt?: string;
  applicationDeadline?: string;
  postedDate?: string;
  matchScore?: number;
  matchAnalysis?: string;
  extractedData?: string;
  extractedAt: string;
  createdAt: string;
  companyLogoUrl?: string;
}

const applicationStatusLabels: Record<string, { label: string; color: string; icon: any }> = {
  not_applied: { label: 'Not Applied', color: 'bg-gray-100 text-gray-800', icon: ClockIcon },
  applied: { label: 'Applied', color: 'bg-blue-100 text-blue-800', icon: PlayCircleIcon },
  phone_screening: { label: 'Phone Screening', color: 'bg-yellow-100 text-yellow-800', icon: null },
  first_interview: { label: 'First Interview', color: 'bg-indigo-100 text-indigo-800', icon: null },
  offer_extended: { label: 'Offer Extended', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircleIcon },
  application_rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircleIcon },
};

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

const workModeIcons: Record<string, string> = {
  remote: '🏠 Remote',
  hybrid: '🏢 Hybrid',
  onsite: '🏬 On-site',
};

export default function JobDetailPageRefactored() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [hasResume, setHasResume] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetchJob();
      fetchPreferences();
      checkResume();
    }
  }, [params.id, user, token]);

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/jobs/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setJob(data);

        // Parse match analysis if stored as string
        if (data.matchAnalysis && typeof data.matchAnalysis === 'string') {
          try {
            data.detailedAnalysis = JSON.parse(data.matchAnalysis);
          } catch (e) {
            console.error('Failed to parse match analysis:', e);
          }
        }
      } else {
        toast.error('Failed to load job');
        router.push('/dashboard');
      }
    } catch (error) {
      toast.error('Failed to load job');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/settings/preferences', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUserPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    }
  };

  const checkResume = async () => {
    try {
      const response = await fetch('/api/resumes/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setHasResume(!!data.resume);
      }
    } catch (error) {
      console.error('Failed to check resume:', error);
    }
  };

  const updateJob = async (updates: Partial<Job>) => {
    if (!job || updating) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedJob = await response.json();
        setJob(updatedJob);
        toast.success('Job updated');
      } else {
        toast.error('Failed to update job');
      }
    } catch (error) {
      toast.error('Failed to update job');
    } finally {
      setUpdating(false);
    }
  };

  const deleteJob = async () => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/jobs/${job?.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Job deleted');
        router.push('/dashboard');
      } else {
        toast.error('Failed to delete job');
      }
    } catch (error) {
      toast.error('Failed to delete job');
    } finally {
      setUpdating(false);
    }
  };

  const handleAnalysisComplete = (analysisType: string, data: any) => {
    // Update job state with new analysis data
    if (job) {
      const updatedJob = { ...job };

      if (analysisType === 'match_score' && data.matchScore) {
        updatedJob.matchScore = data.matchScore;
        updatedJob.matchAnalysis = JSON.stringify(data.detailedAnalysis);
        (updatedJob as any).detailedAnalysis = data.detailedAnalysis;
      }

      setJob(updatedJob);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-900 rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  const statusInfo = applicationStatusLabels[job.applicationStatus] || applicationStatusLabels.not_applied;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Job Header */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
                  <Badge className={priorityColors[job.priority]} variant="outline">
                    {job.priority.toUpperCase()} PRIORITY
                  </Badge>
                </div>

                <div className="flex items-center gap-6 text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    {job.companyLogoUrl ? (
                      <img
                        src={job.companyLogoUrl}
                        alt={`${job.company} logo`}
                        className="h-10 w-10 object-contain rounded"
                      />
                    ) : (
                      <BuildingIcon className="h-5 w-5" />
                    )}
                    <span className="text-xl font-semibold">{job.company}</span>
                  </div>
                  {job.location && (
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-5 w-5" />
                      <span>{job.location}</span>
                    </div>
                  )}
                  {job.workMode && (
                    <Badge variant="outline">
                      {workModeIcons[job.workMode] || job.workMode}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                    {StatusIcon && <StatusIcon className="h-4 w-4" />}
                    {statusInfo.label}
                  </div>
                  {job.salary && (
                    <div className="flex items-center gap-2 font-semibold text-green-600">
                      <CurrencyDollarIcon className="h-5 w-5" />
                      {job.salary}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {job.url && (
                  <Button variant="outline" asChild>
                    <a href={job.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLinkIcon className="h-4 w-4 mr-2" />
                      View Original
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteJob}
                  disabled={updating}
                  className="text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white border rounded-lg p-2 gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gray-50">
              📋 Overview
            </TabsTrigger>
            <TabsTrigger value="match" className="data-[state=active]:bg-gray-50">
              🎯 Match Analysis
            </TabsTrigger>
            <TabsTrigger value="salary" className="data-[state=active]:bg-gray-50">
              💰 Salary Intel
            </TabsTrigger>
            <TabsTrigger value="company" className="data-[state=active]:bg-gray-50">
              🏢 Company
            </TabsTrigger>
            <TabsTrigger value="interview" className="data-[state=active]:bg-gray-50">
              🎤 Interview Prep
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Job Description */}
                <Card>
                  <CardHeader>
                    <CardTitle>Job Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap text-gray-700">
                        {job.description || 'No description available'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Requirements */}
                {job.requirements && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Requirements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-gray-700">{job.requirements}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select
                      value={job.applicationStatus}
                      onValueChange={(value) => updateJob({ applicationStatus: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Application Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(applicationStatusLabels).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={job.priority}
                      onValueChange={(value) => updateJob({ priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Set Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Key Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Key Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {job.contractType && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Contract Type</Label>
                        <p className="text-sm">{job.contractType}</p>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-medium text-gray-500">Extracted</Label>
                      <p className="text-sm">{new Date(job.extractedAt).toLocaleDateString()}</p>
                    </div>

                    {job.applicationDeadline && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Application Deadline</Label>
                        <p className="text-sm text-red-600">
                          {new Date(job.applicationDeadline).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Match Analysis Tab */}
          <TabsContent value="match" className="space-y-6">
            <UnifiedMatchTab
              jobId={job.id}
              jobTitle={job.title}
              jobCompany={job.company}
              jobDescription={job.description}
              jobRequirements={job.requirements}
              currentScore={job.matchScore}
              currentAnalysis={(job as any).detailedAnalysis}
              userId={user?.id || ''}
              token={token || ''}
              autoAnalyze={userPreferences?.autoMatchScore && !job.matchScore}
              onAnalysisComplete={(data) => handleAnalysisComplete('match_score', data)}
            />
          </TabsContent>

          {/* Salary Intelligence Tab */}
          <TabsContent value="salary" className="space-y-6">
            <UnifiedSalaryTab
              jobId={job.id}
              jobTitle={job.title}
              jobCompany={job.company}
              jobLocation={job.location}
              jobSalary={job.salary}
              salaryMin={job.salaryMin}
              salaryMax={job.salaryMax}
              salaryCurrency={job.salaryCurrency}
              userId={user?.id || ''}
              token={token || ''}
              autoAnalyze={userPreferences?.autoSalaryAnalysis}
              onAnalysisComplete={(data) => handleAnalysisComplete('salary', data)}
            />
          </TabsContent>

          {/* Company Intelligence Tab */}
          <TabsContent value="company" className="space-y-6">
            <UnifiedCompanyTab
              jobId={job.id}
              jobTitle={job.title}
              jobCompany={job.company}
              jobLocation={job.location}
              userId={user?.id || ''}
              token={token || ''}
              autoAnalyze={userPreferences?.autoCompanyResearch}
              onAnalysisComplete={(data) => handleAnalysisComplete('company', data)}
            />
          </TabsContent>

          {/* Interview Prep Tab */}
          <TabsContent value="interview" className="space-y-6">
            <UnifiedInterviewTab
              jobId={job.id}
              jobTitle={job.title}
              jobCompany={job.company}
              jobDescription={job.description}
              jobRequirements={job.requirements}
              userId={user?.id || ''}
              token={token || ''}
              autoAnalyze={userPreferences?.autoInterviewPrep}
              onAnalysisComplete={(data) => handleAnalysisComplete('interview', data)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}