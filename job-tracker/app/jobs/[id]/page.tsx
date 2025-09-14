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
import PerfectAISalaryHub from '@/components/ui/perfect-ai-salary-hub';
import JobEditForm from '@/components/ui/job-edit-form';
import { toast } from 'sonner';
import {
  ArrowTopRightOnSquareIcon as ExternalLinkIcon,
  MapPinIcon,
  BuildingOffice2Icon as BuildingIcon,
  CurrencyDollarIcon,
  ClockIcon,
  StarIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  PhoneIcon,
  UserIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayCircleIcon,
  SparklesIcon,
  InformationCircleIcon,
  UsersIcon,
  AwardIcon,
} from '@heroicons/react/24/outline';

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
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
  phoneScreeningAt?: string;
  firstInterviewAt?: string;
  secondInterviewAt?: string;
  finalInterviewAt?: string;
  offerReceivedAt?: string;
  followUpDate?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterPhone?: string;
  companyContact?: string;
  notes?: string;
  privateNotes?: string;
  companyResearch?: string;
  preparationNotes?: string;
  rejectionFeedback?: string;
  matchScore?: number;
  extractedData?: string;  // JSON string of extracted job data
  extractedAt: string;
  createdAt: string;
  activities: JobActivity[];
}

interface JobActivity {
  id: string;
  type: string;
  title: string;
  description?: string;
  date: string;
  metadata?: string;
}

const applicationStatusLabels: Record<string, { label: string; color: string; icon: any }> = {
  not_applied: { label: 'Not Applied', color: 'bg-gray-100 text-gray-800', icon: ClockIcon },
  applied: { label: 'Applied', color: 'bg-blue-100 text-blue-800', icon: PlayCircleIcon },
  phone_screening: { label: 'Phone Screening', color: 'bg-yellow-100 text-yellow-800', icon: PhoneIcon },
  phone_screening_completed: { label: 'Phone Screening Done', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  technical_assessment: { label: 'Technical Assessment', color: 'bg-purple-100 text-purple-800', icon: BriefcaseIcon },
  first_interview: { label: 'First Interview', color: 'bg-indigo-100 text-indigo-800', icon: UserIcon },
  second_interview: { label: 'Second Interview', color: 'bg-indigo-100 text-indigo-800', icon: UserIcon },
  final_interview: { label: 'Final Interview', color: 'bg-orange-100 text-orange-800', icon: UserIcon },
  reference_check: { label: 'Reference Check', color: 'bg-teal-100 text-teal-800', icon: CheckCircleIcon },
  offer_extended: { label: 'Offer Extended', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircleIcon },
  offer_accepted: { label: 'Offer Accepted', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  offer_rejected: { label: 'Offer Rejected', color: 'bg-red-100 text-red-800', icon: XCircleIcon },
  application_rejected: { label: 'Application Rejected', color: 'bg-red-100 text-red-800', icon: XCircleIcon },
  withdrawn: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-800', icon: XCircleIcon },
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

// Smart salary display - replaces generic terms with meaningful information
const getSmartSalaryDisplay = (rawSalary: string | null | undefined, aiAnalysis?: any): { display: string; isGeneric: boolean } => {
  if (!rawSalary?.trim()) {
    // No salary provided, check if we have AI analysis
    if (aiAnalysis?.expected_salary_range?.min && aiAnalysis?.expected_salary_range?.max) {
      const min = Math.round(aiAnalysis.expected_salary_range.min).toLocaleString();
      const max = Math.round(aiAnalysis.expected_salary_range.max).toLocaleString();
      const currency = aiAnalysis.currency || 'USD';
      return { 
        display: `${currency === 'USD' ? '$' : currency + ' '}${min} - ${currency === 'USD' ? '$' : ''}${max}`, 
        isGeneric: false 
      };
    }
    return { display: 'Salary not disclosed', isGeneric: true };
  }

  // Check for generic/unhelpful terms
  const genericTerms = [
    'variable', 'competitive', 'negotiable', 'doe', 'dependent on experience',
    'tbd', 'to be discussed', 'market rate', 'based on experience',
    'commensurate', 'attractive', 'excellent', 'fair', 'open'
  ];
  
  const isGenericSalary = genericTerms.some(term => 
    rawSalary.toLowerCase().includes(term.toLowerCase())
  ) || !(/\d/.test(rawSalary)); // Must contain at least one digit to be considered specific

  if (isGenericSalary) {
    // Generic salary term detected, use AI analysis if available
    if (aiAnalysis?.expected_salary_range?.min && aiAnalysis?.expected_salary_range?.max) {
      const min = Math.round(aiAnalysis.expected_salary_range.min).toLocaleString();
      const max = Math.round(aiAnalysis.expected_salary_range.max).toLocaleString();
      const currency = aiAnalysis.currency || 'USD';
      return { 
        display: `${currency === 'USD' ? '$' : currency + ' '}${min} - ${currency === 'USD' ? '$' : ''}${max}`, 
        isGeneric: false 
      };
    }
    // No AI analysis available, show more meaningful generic message
    return { display: 'Salary to be determined', isGeneric: true };
  }

  // Salary appears to be specific, return as-is
  return { display: rawSalary, isGeneric: false };
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [userProfile, setUserProfile] = useState<any>(null);

  // Parse extracted data from job
  const extractedData = job?.extractedData ? (() => {
    try {
      return JSON.parse(job.extractedData);
    } catch (error) {
      console.error('Failed to parse extractedData:', error);
      return {};
    }
  })() : {};

  const fetchUserProfile = async () => {
    if (!token || !user?.id) return;

    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile({
          id: user.id,
          name: user.name,
          email: user.email,
          experience_years: data.profile?.experienceYears,
          skills: data.profile?.skills ? data.profile.skills.split(',').map((s: string) => s.trim()) : [],
          preferred_salary_min: data.profile?.preferredSalaryMin,
          preferred_salary_max: data.profile?.preferredSalaryMax,
          current_salary: data.profile?.currentSalary,
          career_level: data.profile?.careerLevel,
          industry_experience: data.profile?.industryExperience ? data.profile.industryExperience.split(',').map((s: string) => s.trim()) : []
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchJob = async () => {
    if (!token) return;

    try {
      const response = await fetch(`/api/jobs/${params.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setJob(data.job);
      } else {
        toast.error('Failed to fetch job details');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error('Failed to fetch job details');
    } finally {
      setLoading(false);
    }
  };

  const updateJob = async (updates: Partial<Job>) => {
    if (!token || !job) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setJob(data.job);
        toast.success('Job updated successfully');
      } else {
        toast.error('Failed to update job');
      }
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error('Failed to update job');
    } finally {
      setUpdating(false);
    }
  };

  const deleteJob = async () => {
    if (!token || !job) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${job.title}" at ${job.company}? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Job deleted successfully');
        router.push('/dashboard');
      } else {
        toast.error('Failed to delete job');
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchJob();
      fetchUserProfile();
    }
  }, [user, token, params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse mb-4" />
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
                    <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-6 mb-4">
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
                  <div className="h-9 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-9 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="space-y-6">
            <div className="h-12 bg-white rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-white rounded-lg animate-pulse" />
                <div className="h-48 bg-white rounded-lg animate-pulse" />
              </div>
              <div className="space-y-6">
                <div className="h-32 bg-white rounded-lg animate-pulse" />
                <div className="h-40 bg-white rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Job not found</h1>
          <p className="text-gray-600 mt-2">The job you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = applicationStatusLabels[job.applicationStatus] || applicationStatusLabels.not_applied;
  const StatusIcon = statusInfo.icon;

  // Show edit form if in editing mode
  if (isEditing) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <JobEditForm
            job={job}
            onSave={(updatedJob) => {
              setJob(updatedJob);
              setIsEditing(false);
              toast.success('Job updated successfully!');
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

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
                    <BuildingIcon className="h-5 w-5" />
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
                    <StatusIcon className="h-4 w-4" />
                    {statusInfo.label}
                  </div>
                  {(() => {
                    const salaryInfo = getSmartSalaryDisplay(job.salary, null);
                    return salaryInfo.display !== 'Salary not disclosed' && (
                      <div className={`flex items-center gap-2 font-semibold ${salaryInfo.isGeneric ? 'text-gray-500' : 'text-green-600'}`}>
                        <CurrencyDollarIcon className="h-5 w-5" />
                        {salaryInfo.display}
                        {salaryInfo.isGeneric && (
                          <span className="text-xs text-gray-400 ml-1">(estimate available below)</span>
                        )}
                      </div>
                    );
                  })()}
                  {job.matchScore && (
                    <div className="flex items-center gap-2">
                      <StarIcon className="h-5 w-5 text-yellow-500" />
                      <span className="font-semibold">{job.matchScore}% match</span>
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
                  onClick={() => setIsEditing(true)}
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={deleteJob}
                  disabled={updating}
                  className="text-red-600 hover:text-red-700 hover:border-red-300 hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 bg-white border rounded-lg p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200 transition-all duration-200"
            >
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger
              value="salary"
              className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200 transition-all duration-200"
            >
              <span className="hidden sm:inline">💰 Salary</span>
              <span className="sm:hidden">💰</span>
            </TabsTrigger>
            <TabsTrigger
              value="application"
              className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-purple-200 transition-all duration-200"
            >
              <span className="hidden sm:inline">Application</span>
              <span className="sm:hidden">App</span>
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border-orange-200 transition-all duration-200"
            >
              <span className="hidden md:inline">Timeline</span>
              <span className="md:hidden">Time</span>
            </TabsTrigger>
            <TabsTrigger
              value="contacts"
              className="hidden md:flex data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-700 data-[state=active]:border-cyan-200 transition-all duration-200"
            >
              <span className="hidden lg:inline">Contacts</span>
              <span className="lg:hidden">People</span>
            </TabsTrigger>
            <TabsTrigger
              value="research"
              className="hidden lg:flex data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:border-indigo-200 transition-all duration-200"
            >
              Research
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="hidden lg:flex data-[state=active]:bg-pink-50 data-[state=active]:text-pink-700 data-[state=active]:border-pink-200 transition-all duration-200"
            >
              Notes
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
                      <p className="text-gray-700 whitespace-pre-wrap">
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
                      <div className="prose max-w-none">
                        <p className="text-gray-700 whitespace-pre-wrap">{job.requirements}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Enhanced Skills & Technologies */}
                {(job.skills || extractedData?.programmingLanguages || extractedData?.frameworks) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Skills & Technologies</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* All Skills */}
                      {job.skills && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Required Skills</Label>
                          <div className="flex flex-wrap gap-2">
                            {job.skills.split(',').map((skill, index) => (
                              <Badge key={index} variant="outline" className="bg-blue-50">
                                {skill.trim()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Programming Languages */}
                      {extractedData?.programmingLanguages?.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Programming Languages</Label>
                          <div className="flex flex-wrap gap-2">
                            {extractedData.programmingLanguages.map((lang: string, index: number) => (
                              <Badge key={index} variant="outline" className="bg-green-50">
                                {lang}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Frameworks */}
                      {extractedData?.frameworks?.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Frameworks</Label>
                          <div className="flex flex-wrap gap-2">
                            {extractedData.frameworks.map((framework: string, index: number) => (
                              <Badge key={index} variant="outline" className="bg-purple-50">
                                {framework}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tools */}
                      {extractedData?.tools?.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Tools & Platforms</Label>
                          <div className="flex flex-wrap gap-2">
                            {extractedData.tools.map((tool: string, index: number) => (
                              <Badge key={index} variant="outline" className="bg-orange-50">
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Responsibilities */}
                {extractedData?.responsibilities?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Responsibilities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {extractedData.responsibilities.map((responsibility: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                            <span className="text-gray-700">{responsibility}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Benefits & Perks */}
                {(job.perks || extractedData?.benefits?.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Benefits & Perks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {job.perks && (
                        <p className="text-gray-700 mb-4">{job.perks}</p>
                      )}
                      {extractedData?.benefits?.length > 0 && (
                        <ul className="space-y-2">
                          {extractedData.benefits.map((benefit: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <StarIcon className="w-4 h-4 text-yellow-500 mt-1 flex-shrink-0" />
                              <span className="text-gray-700">{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select 
                      value={job.applicationStatus} 
                      onValueChange={(value) => updateJob({ applicationStatus: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Update Status" />
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
                        <p className="text-sm text-red-600">{new Date(job.applicationDeadline).toLocaleDateString()}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Perks */}
                {job.perks && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Perks & Benefits</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.perks}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Perfect AI RAG Salary Hub Tab */}
          <TabsContent value="salary" className="space-y-6">
            <div className="bg-gradient-to-br from-white via-yellow-50/30 to-purple-50/30 rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Header with perfect RAG branding */}
              <div className="relative p-8 border-b border-gray-100/50 bg-gradient-to-r from-yellow-500/5 via-purple-500/5 to-blue-500/5">
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 via-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                      <SparklesIcon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Perfect AI RAG Intelligence
                      </h2>
                      <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                        <CurrencyDollarIcon className="w-4 h-4 text-yellow-500" />
                        Zero hardcoded values • Live market data • Perfect RAG
                      </p>
                    </div>
                  </div>

                  {/* Perfect RAG status badges */}
                  <div className="hidden md:flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50/80 backdrop-blur-sm rounded-full border border-yellow-200/50 shadow-sm">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-yellow-700">Live AI Analysis</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50/80 backdrop-blur-sm rounded-full border border-purple-200/50 shadow-sm">
                      <CheckCircleIcon className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium text-purple-700">Zero Hardcoded</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Perfect RAG content area */}
              <div className="relative">
                <div className="p-6 md:p-8">
                  <PerfectAISalaryHub
                    jobId={job.id}
                    token={token}
                    className="max-w-none"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Other tabs will be implemented similarly... */}
          <TabsContent value="application">
            <Card>
              <CardHeader>
                <CardTitle>Application Tracking</CardTitle>
                <CardDescription>Track your application progress and important dates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Application tracking interface coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>Track all activities and updates for this application</CardDescription>
              </CardHeader>
              <CardContent>
                {job.activities && job.activities.length > 0 ? (
                  <div className="space-y-4">
                    {job.activities.map((activity) => (
                      <div key={activity.id} className="flex gap-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <ClockIcon className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium">{activity.title}</h4>
                          {activity.description && (
                            <p className="text-sm text-gray-600">{activity.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(activity.date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No activities recorded yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Keep track of recruiters and company contacts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Contact management interface coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="research">
            <Card>
              <CardHeader>
                <CardTitle>Company Research</CardTitle>
                <CardDescription>Research notes and company information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Company research interface coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Notes & Thoughts</CardTitle>
                <CardDescription>Keep track of your thoughts, interview prep, and private notes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Notes interface coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}