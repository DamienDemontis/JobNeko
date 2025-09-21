'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Search, Star, MapPin, Building, DollarSign, LogOut, User,
  Clock, CheckCircle, XCircle, PlayCircle, Phone, Filter,
  Briefcase, TrendingUp, Calendar, ExternalLink, ArrowRight,
  Settings, Plus, Download, FileText, BarChart3, Target
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { MatchScoreDonut } from '@/components/ui/match-score-donut';
import { AIJobDiscovery } from '@/components/ui/ai-job-discovery';
import { PerformanceAnalytics } from '@/components/ui/performance-analytics';
import { SmartRecommendations } from '@/components/ui/smart-recommendations';
import { JobNekoLogo } from '@/components/ui/jobneko-logo';

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  salary?: string;
  workMode?: string;
  matchScore?: number;
  rating?: number;
  createdAt: string;
  applicationStatus: string;
  priority?: string;
  url?: string;
  skills?: string;
  contractType?: string;
  appliedAt?: string;
  applicationDeadline?: string;
  summary?: string;
}

// Professional black and white status configuration
const applicationStatusConfig: Record<string, {
  label: string;
  variant: 'default' | 'secondary' | 'outline';
  icon: React.ComponentType<{ className?: string }>;
  priority: number;
}> = {
  not_applied: { label: 'Not Applied', variant: 'outline', icon: Clock, priority: 0 },
  applied: { label: 'Applied', variant: 'secondary', icon: PlayCircle, priority: 1 },
  phone_screening: { label: 'Phone Screen', variant: 'secondary', icon: Phone, priority: 2 },
  phone_screening_completed: { label: 'Screen Complete', variant: 'default', icon: CheckCircle, priority: 3 },
  technical_assessment: { label: 'Technical Test', variant: 'secondary', icon: Briefcase, priority: 4 },
  first_interview: { label: 'First Interview', variant: 'secondary', icon: User, priority: 5 },
  second_interview: { label: 'Second Interview', variant: 'secondary', icon: User, priority: 6 },
  final_interview: { label: 'Final Interview', variant: 'default', icon: User, priority: 7 },
  reference_check: { label: 'References', variant: 'secondary', icon: CheckCircle, priority: 8 },
  offer_extended: { label: 'Offer Received', variant: 'default', icon: CheckCircle, priority: 9 },
  offer_accepted: { label: 'Offer Accepted', variant: 'default', icon: CheckCircle, priority: 10 },
  offer_rejected: { label: 'Offer Declined', variant: 'outline', icon: XCircle, priority: -1 },
  application_rejected: { label: 'Rejected', variant: 'outline', icon: XCircle, priority: -2 },
  withdrawn: { label: 'Withdrawn', variant: 'outline', icon: XCircle, priority: -3 },
};

const getMatchScoreDisplay = (score?: number) => {
  if (!score) return { text: 'No Score', className: 'text-gray-400' };
  if (score >= 85) return { text: `${score}%`, className: 'text-black font-semibold' };
  if (score >= 70) return { text: `${score}%`, className: 'text-gray-700 font-medium' };
  if (score >= 50) return { text: `${score}%`, className: 'text-gray-500' };
  return { text: `${score}%`, className: 'text-gray-400' };
};

const getSalaryDisplay = (salary?: string): { display: string; hasAmount: boolean } => {
  if (!salary?.trim()) return { display: 'Not disclosed', hasAmount: false };

  const genericTerms = ['variable', 'competitive', 'negotiable', 'doe', 'dependent on experience', 'tbd', 'to be discussed', 'market rate', 'based on experience', 'commensurate', 'attractive', 'excellent', 'fair', 'open'];
  const isGeneric = genericTerms.some(term => salary.toLowerCase().includes(term.toLowerCase())) || !(/\d/.test(salary));

  if (isGeneric) return { display: 'To be determined', hasAmount: false };
  return { display: salary, hasAmount: true };
};

export default function ProfessionalDashboard() {
  const router = useRouter();
  const { user, token, logout, isLoading: authLoading } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [hasResume, setHasResume] = useState(false);
  const [resumePromptDismissed, setResumePromptDismissed] = useState(false);
  const [dashboardView, setDashboardView] = useState<'jobs' | 'discovery' | 'analytics' | 'recommendations'>('jobs');

  useEffect(() => {
    setMounted(true);
    // Check if resume prompt was dismissed
    const dismissed = localStorage.getItem('resumePromptDismissed') === 'true';
    setResumePromptDismissed(dismissed);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    if (!user && !storedUser) {
      router.replace('/login');
      return;
    }

    if (!token && !storedToken) {
      router.replace('/login');
      return;
    }

    fetchJobs();
    checkResumeStatus();
  }, [user, token, authLoading, router]);

  const fetchJobs = async () => {
    const currentToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!currentToken) return;

    try {
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(sortBy && { sortBy }),
      });

      const response = await fetch(`/api/jobs?${params}`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs);
      } else {
        throw new Error('Failed to fetch jobs');
      }
    } catch (error) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const checkResumeStatus = async () => {
    const currentToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!currentToken || !user?.id) return;

    try {
      const response = await fetch(`/api/resume/upload?userId=${user.id}`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      console.log('Resume status response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Resume status data:', data);
        setHasResume(Boolean(data.hasResume));
      } else {
        console.log('Resume check failed with status:', response.status);
        setHasResume(false);
      }
    } catch (error) {
      console.error('Failed to check resume status:', error);
    }
  };

  const handleRating = async (jobId: string, rating: number) => {
    if (!token) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating }),
      });

      if (response.ok) {
        setJobs(jobs.map(job =>
          job.id === jobId ? { ...job, rating } : job
        ));
        toast.success('Rating saved');
      } else {
        toast.error('Failed to save rating');
      }
    } catch (error) {
      toast.error('Failed to save rating');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, sortBy]);

  const renderStars = (jobId: string, currentRating?: number) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 cursor-pointer ${
              star <= (currentRating || 0) ? 'fill-black text-black' : 'text-gray-300 hover:text-gray-400'
            }`}
            onClick={() => handleRating(jobId, star)}
          />
        ))}
      </div>
    );
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your jobs...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(j => ['applied', 'phone_screening', 'phone_screening_completed', 'technical_assessment', 'first_interview', 'second_interview', 'final_interview', 'reference_check', 'offer_extended'].includes(j.applicationStatus)).length;
  const interviews = jobs.filter(j => ['first_interview', 'second_interview', 'final_interview'].includes(j.applicationStatus)).length;
  const offers = jobs.filter(j => ['offer_extended', 'offer_accepted'].includes(j.applicationStatus)).length;
  const averageMatch = jobs.length > 0 ? Math.round(jobs.reduce((sum, job) => sum + (job.matchScore || 0), 0) / jobs.length) : 0;
  const successRate = jobs.length > 0 ? Math.round((offers / Math.max(jobs.filter(j => j.applicationStatus !== 'not_applied').length, 1)) * 100) : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <JobNekoLogo size={60} textClassName="text-3xl" />
              <div>
                <p className="text-gray-600 text-sm">Welcome back, {user?.name || user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/profile">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-8 max-w-2xl">
          <Button
            variant={dashboardView === 'jobs' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDashboardView('jobs')}
            className="flex-1"
          >
            <Briefcase className="w-4 h-4 mr-2" />
            My Jobs
          </Button>
          <Button
            variant={dashboardView === 'discovery' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDashboardView('discovery')}
            className="flex-1"
          >
            <Target className="w-4 h-4 mr-2" />
            Job Discovery
          </Button>
          <Button
            variant={dashboardView === 'analytics' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDashboardView('analytics')}
            className="flex-1"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button
            variant={dashboardView === 'recommendations' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDashboardView('recommendations')}
            className="flex-1"
          >
            <Star className="w-4 h-4 mr-2" />
            Recommendations
          </Button>
        </div>

        {/* Jobs View */}
        {dashboardView === 'jobs' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Jobs</p>
                  <p className="text-2xl font-bold text-black">{totalJobs}</p>
                </div>
                <Briefcase className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-black">{activeJobs}</p>
                </div>
                <TrendingUp className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Interviews</p>
                  <p className="text-2xl font-bold text-black">{interviews}</p>
                </div>
                <User className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Offers</p>
                  <p className="text-2xl font-bold text-black">{offers}</p>
                </div>
                <CheckCircle className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Match</p>
                  <p className="text-2xl font-bold text-black">{averageMatch}%</p>
                </div>
                <Target className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-black">{successRate}%</p>
                </div>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resume Status */}
        {!hasResume && !resumePromptDismissed && (
          <Card className="mb-8 border border-gray-200 bg-gray-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-black mb-1">Upload Your Resume</h3>
                  <p className="text-sm text-gray-600">Enable AI-powered job matching and salary analysis</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setResumePromptDismissed(true);
                      localStorage.setItem('resumePromptDismissed', 'true');
                    }}
                  >
                    Don't ask again
                  </Button>
                  <Button asChild>
                    <Link href="/profile#resume">
                      <FileText className="w-4 h-4 mr-2" />
                      Upload Resume
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="mb-8 border border-gray-200">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search jobs, companies, skills..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-black"
                />
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48 border-gray-200 focus:border-black">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Most Recent</SelectItem>
                  <SelectItem value="matchScore">Best Match</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="applicationStatus">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Jobs List */}
        {jobs.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="text-center py-16">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold mb-3 text-black">Ready to find your dream job?</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Install our Chrome extension and start extracting job offers from any website.
              </p>
              <div className="space-y-4">
                <Button size="lg" asChild>
                  <a href="/chrome-extension.zip" download>
                    <Download className="w-5 h-5 mr-2" />
                    Download Extension
                  </a>
                </Button>
                <div>
                  <Button variant="outline" asChild>
                    <Link href="/profile">
                      Upload your resume for AI matching →
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const statusConfig = applicationStatusConfig[job.applicationStatus] || applicationStatusConfig.not_applied;
              const StatusIcon = statusConfig.icon;
              const matchDisplay = getMatchScoreDisplay(job.matchScore);
              const salaryDisplay = getSalaryDisplay(job.salary);

              return (
                <Card
                  key={job.id}
                  className="border border-gray-200 hover:border-black transition-colors cursor-pointer group"
                  onClick={() => router.push(`/jobs/${job.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant={statusConfig.variant} className="gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </Badge>
                          {job.priority === 'high' && (
                            <Badge variant="outline" className="text-xs">High Priority</Badge>
                          )}
                        </div>

                        {/* Job Title and Company */}
                        <h3 className="text-xl font-semibold text-black mb-1 group-hover:underline">
                          {job.title}
                        </h3>

                        <div className="flex items-center gap-4 text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            {(job as any).companyLogoUrl ? (
                              <img
                                src={(job as any).companyLogoUrl}
                                alt={`${job.company} logo`}
                                className="w-5 h-5 object-contain rounded"
                                onError={(e) => {
                                  // Hide broken image and show building icon instead
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const buildingIcon = target.nextElementSibling;
                                  if (buildingIcon) {
                                    (buildingIcon as HTMLElement).style.display = 'block';
                                  }
                                }}
                              />
                            ) : null}
                            <Building
                              className="w-4 h-4"
                              style={{ display: (job as any).companyLogoUrl ? 'none' : 'block' }}
                            />
                            <span className="font-medium">{job.company}</span>
                          </div>
                          {job.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{job.location}</span>
                            </div>
                          )}
                        </div>

                        {/* Salary */}
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className={`text-sm ${salaryDisplay.hasAmount ? 'font-medium text-black' : 'text-gray-500'}`}>
                            {salaryDisplay.display}
                          </span>
                          {!salaryDisplay.hasAmount && (
                            <span className="text-xs text-gray-400">• Analysis available</span>
                          )}
                        </div>

                        {/* Summary */}
                        {job.summary && (
                          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                            {job.summary}
                          </p>
                        )}

                        {/* Skills */}
                        {job.skills && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {job.skills.split(',').slice(0, 5).map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill.trim()}
                              </Badge>
                            ))}
                            {job.skills.split(',').length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{job.skills.split(',').length - 5} more
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Rating */}
                            <div className="flex items-center gap-1">
                              {renderStars(job.id, job.rating)}
                            </div>

                            {/* Created Date */}
                            <span className="text-xs text-gray-500">
                              {new Date(job.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Match Score */}
                            {job.matchScore && (
                              <MatchScoreDonut score={job.matchScore} size={50} strokeWidth={6} />
                            )}

                            {/* External Link */}
                            {job.url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(job.url, '_blank');
                                }}
                                className="text-gray-400 hover:text-black"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}

                            {/* Arrow */}
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
          </>
        )}

        {/* AI Job Discovery View */}
        {dashboardView === 'discovery' && (
          <AIJobDiscovery />
        )}

        {/* Performance Analytics View */}
        {dashboardView === 'analytics' && (
          <PerformanceAnalytics />
        )}

        {/* Smart Recommendations View */}
        {dashboardView === 'recommendations' && (
          <SmartRecommendations />
        )}
      </div>
    </div>
  );
}