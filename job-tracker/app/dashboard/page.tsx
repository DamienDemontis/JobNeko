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
  Clock, CheckCircle, AlertCircle, XCircle, PlayCircle, Phone,
  Briefcase, TrendingUp, Calendar, ExternalLink, ArrowUpRight,
  Filter as FilterIcon
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

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
}

// Application status configuration with beautiful colors and icons
const applicationStatusConfig: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string;
  textColor: string;
  icon: any;
  priority: number;
}> = {
  not_applied: { 
    label: 'Not Applied', 
    color: 'border-gray-200 bg-gray-50', 
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: Clock, 
    priority: 0 
  },
  applied: { 
    label: 'Applied', 
    color: 'border-blue-200 bg-blue-50', 
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    icon: PlayCircle, 
    priority: 1 
  },
  phone_screening: { 
    label: 'Phone Screening', 
    color: 'border-yellow-200 bg-yellow-50', 
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    icon: Phone, 
    priority: 2 
  },
  phone_screening_completed: { 
    label: 'Screening Done', 
    color: 'border-green-200 bg-green-50', 
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    icon: CheckCircle, 
    priority: 3 
  },
  technical_assessment: { 
    label: 'Technical Test', 
    color: 'border-purple-200 bg-purple-50', 
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    icon: Briefcase, 
    priority: 4 
  },
  first_interview: { 
    label: 'First Interview', 
    color: 'border-indigo-200 bg-indigo-50', 
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
    icon: User, 
    priority: 5 
  },
  second_interview: { 
    label: 'Second Interview', 
    color: 'border-indigo-200 bg-indigo-50', 
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
    icon: User, 
    priority: 6 
  },
  final_interview: { 
    label: 'Final Interview', 
    color: 'border-orange-200 bg-orange-50', 
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    icon: User, 
    priority: 7 
  },
  reference_check: { 
    label: 'Reference Check', 
    color: 'border-teal-200 bg-teal-50', 
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-700',
    icon: CheckCircle, 
    priority: 8 
  },
  offer_extended: { 
    label: 'Offer Extended', 
    color: 'border-emerald-200 bg-emerald-50', 
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    icon: CheckCircle, 
    priority: 9 
  },
  offer_accepted: { 
    label: 'Offer Accepted ✨', 
    color: 'border-green-300 bg-green-100', 
    bgColor: 'bg-green-200',
    textColor: 'text-green-800',
    icon: CheckCircle, 
    priority: 10 
  },
  offer_rejected: { 
    label: 'Offer Declined', 
    color: 'border-red-200 bg-red-50', 
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    icon: XCircle, 
    priority: -1 
  },
  application_rejected: { 
    label: 'Rejected', 
    color: 'border-red-200 bg-red-50', 
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    icon: XCircle, 
    priority: -2 
  },
  withdrawn: { 
    label: 'Withdrawn', 
    color: 'border-gray-200 bg-gray-50', 
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: XCircle, 
    priority: -3 
  },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Low' },
  medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Medium' },
  high: { color: 'bg-red-100 text-red-800 border-red-200', label: 'High' },
};

const workModeConfig: Record<string, { icon: string; color: string }> = {
  remote: { icon: '🏠', color: 'bg-blue-100 text-blue-800' },
  hybrid: { icon: '🏢', color: 'bg-purple-100 text-purple-800' },
  onsite: { icon: '🏬', color: 'bg-orange-100 text-orange-800' },
};

export default function DashboardPage() {
  console.log('=== DASHBOARD PAGE COMPONENT LOADED ===');
  
  const router = useRouter();
  const { user, token, logout, isLoading: authLoading } = useAuth();
  
  console.log('Dashboard: Initial state on load:', { 
    authLoading, 
    hasUser: !!user, 
    hasToken: !!token 
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');

  useEffect(() => {
    console.log('Dashboard useEffect triggered:', { authLoading, user: !!user, token: !!token });
    
    // Wait for auth to finish loading before redirecting
    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }
    
    // Double-check localStorage if context doesn't have user/token yet
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    
    console.log('Stored data:', { storedToken: !!storedToken, storedUser: !!storedUser });
    
    if (!user && !storedUser) {
      console.log('No user in context or localStorage, redirecting to login');
      router.replace('/login');
      return;
    }
    
    if (!token && !storedToken) {
      console.log('No token in context or localStorage, redirecting to login');
      router.replace('/login');
      return;
    }
    
    console.log('User authenticated, fetching jobs...');
    // User is authenticated, fetch jobs
    fetchJobs();
  }, [user, token, authLoading, router]);

  const fetchJobs = async () => {
    const currentToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!currentToken) {
      console.log('No token available for fetchJobs');
      return;
    }
    
    try {
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(workModeFilter && workModeFilter !== 'all' && { workMode: workModeFilter }),
        ...(sortBy && { sortBy }),
      });

      const response = await fetch(`/api/jobs?${params}`, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
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

  const handleLogout = () => {
    logout();
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
        toast.success('Rating saved!');
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
  }, [search, workModeFilter, sortBy]);

  const renderStars = (jobId: string, currentRating?: number) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 cursor-pointer ${
              star <= (currentRating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
            onClick={() => handleRating(jobId, star)}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading your jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Job Tracker</h1>
              <p className="text-gray-600">Welcome back, {user?.name || user?.email}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/profile">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{jobs.length}</div>
              <p className="text-xs text-blue-600 mt-1">
                +{jobs.filter(j => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return new Date(j.createdAt) > weekAgo;
                }).length} this week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Active Pipeline</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">
                {jobs.filter(j => ['applied', 'phone_screening', 'phone_screening_completed', 'technical_assessment', 'first_interview', 'second_interview', 'final_interview', 'reference_check', 'offer_extended'].includes(j.applicationStatus)).length}
              </div>
              <p className="text-xs text-green-600 mt-1">In progress</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">Interviews</CardTitle>
              <User className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-900">
                {jobs.filter(j => ['first_interview', 'second_interview', 'final_interview'].includes(j.applicationStatus)).length}
              </div>
              <p className="text-xs text-yellow-600 mt-1">Scheduled</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Avg Match</CardTitle>
              <Star className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">
                {jobs.length > 0 
                  ? Math.round(jobs.reduce((sum, job) => sum + (job.matchScore || 0), 0) / jobs.length)
                  : 0}%
              </div>
              <p className="text-xs text-purple-600 mt-1">AI match score</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Offers</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-900">
                {jobs.filter(j => ['offer_extended', 'offer_accepted'].includes(j.applicationStatus)).length}
              </div>
              <p className="text-xs text-emerald-600 mt-1">Received</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-900">
                {jobs.length > 0 
                  ? Math.round((jobs.filter(j => ['offer_extended', 'offer_accepted'].includes(j.applicationStatus)).length / jobs.filter(j => j.applicationStatus !== 'not_applied').length) * 100) || 0
                  : 0}%
              </div>
              <p className="text-xs text-red-600 mt-1">Offer rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filters & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search jobs, companies..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={workModeFilter} onValueChange={setWorkModeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Work Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Work Modes</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Recent</SelectItem>
                  <SelectItem value="matchScore">Match Score</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Grid */}
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold mb-3">Ready to find your dream job?</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Install our Chrome extension and start extracting job offers from any website. 
                Build your personalized job database today!
              </p>
              <div className="space-y-4">
                <Button size="lg" className="text-lg px-8 py-6" asChild>
                  <a href="/chrome-extension.zip" download>
                    <Building className="w-5 h-5 mr-2" />
                    Download Extension
                  </a>
                </Button>
                <div>
                  <Button variant="ghost" asChild>
                    <Link href="/profile">
                      Upload your resume for AI matching →
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {jobs.map((job) => {
              const statusConfig = applicationStatusConfig[job.applicationStatus] || applicationStatusConfig.not_applied;
              const StatusIcon = statusConfig.icon;
              const priorityInfo = priorityConfig[job.priority || 'medium'];
              const workModeInfo = workModeConfig[job.workMode || ''];
              
              return (
                <Card 
                  key={job.id} 
                  className="group hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 hover:scale-[1.02] cursor-pointer border-0 bg-white shadow-md"
                  onClick={() => router.push(`/jobs/${job.id}`)}
                >
                  <CardContent className="p-0">
                    {/* Header with Status */}
                    <div className={`px-6 py-4 border-b ${statusConfig.color} relative overflow-hidden`}>
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500" />
                      
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                              <StatusIcon className="w-4 h-4" />
                              {statusConfig.label}
                            </div>
                            {job.priority && job.priority !== 'medium' && (
                              <Badge className={`${priorityInfo.color} text-xs`} variant="outline">
                                {priorityInfo.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {job.matchScore && (
                            <div className="flex items-center gap-1 text-sm">
                              <TrendingUp className={`w-4 h-4 ${
                                job.matchScore >= 80 ? 'text-green-600' : 
                                job.matchScore >= 60 ? 'text-yellow-600' : 
                                'text-gray-600'
                              }`} />
                              <span className={`font-semibold ${
                                job.matchScore >= 80 ? 'text-green-700' : 
                                job.matchScore >= 60 ? 'text-yellow-700' : 
                                'text-gray-700'
                              }`}>
                                {job.matchScore}%
                              </span>
                            </div>
                          )}
                          <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="p-6">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {job.title}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-gray-600 mb-3">
                          <div className="flex items-center gap-2 font-medium">
                            <Building className="w-4 h-4" />
                            <span className="text-lg">{job.company}</span>
                          </div>
                          {job.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{job.location}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Job Summary */}
                        {job.summary && (
                          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mt-2">
                            {job.summary}
                          </p>
                        )}
                      </div>

                      {/* Details Row */}
                      <div className="flex flex-wrap gap-3 mb-4">
                        {job.workMode && workModeInfo && (
                          <Badge className={`${workModeInfo.color} text-xs`} variant="outline">
                            {workModeInfo.icon} {job.workMode}
                          </Badge>
                        )}
                        {job.contractType && (
                          <Badge variant="outline" className="text-xs">
                            {job.contractType}
                          </Badge>
                        )}
                        {job.salary && (
                          <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {job.salary}
                          </Badge>
                        )}
                      </div>

                      {/* Skills Preview */}
                      {job.skills && (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-2">
                            {job.skills.split(',').slice(0, 4).map((skill, index) => (
                              <Badge 
                                key={index} 
                                variant="secondary" 
                                className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
                              >
                                {skill.trim()}
                              </Badge>
                            ))}
                            {job.skills.split(',').length > 4 && (
                              <Badge variant="outline" className="text-xs text-gray-500">
                                +{job.skills.split(',').length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            {renderStars(job.id, job.rating)}
                          </div>
                          {job.applicationDeadline && (
                            <div className="flex items-center gap-1 text-sm text-amber-600">
                              <Calendar className="w-4 h-4" />
                              <span>Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {job.url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(job.url, '_blank');
                              }}
                              className="text-xs opacity-70 hover:opacity-100"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}