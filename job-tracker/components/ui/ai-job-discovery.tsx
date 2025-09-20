'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Sparkles, TrendingUp, Clock, DollarSign, Target, AlertTriangle,
  MapPin, Building, ExternalLink, Search, Filter, BookmarkPlus,
  Calendar, Briefcase, Zap, Star, Eye, Heart, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { MatchScoreDonut } from '@/components/ui/match-score-donut';

interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  matchScore: number;
  urgency: 'high' | 'medium' | 'low';
  reason: string;
  postedDate: string;
  applicationDeadline?: string;
  url?: string;
  skills: string[];
  workMode: 'remote' | 'hybrid' | 'onsite';
  isNew: boolean;
  salaryTrend: 'increasing' | 'stable' | 'decreasing';
  competitionLevel: 'low' | 'medium' | 'high';
}

interface MarketAlert {
  id: string;
  type: 'salary_increase' | 'new_companies' | 'skill_demand' | 'market_shift';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  createdAt: string;
}

interface SalaryTrend {
  skill: string;
  currentRange: string;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
  timeframe: string;
}

interface AIJobDiscoveryData {
  opportunities: JobOpportunity[];
  marketAlerts: MarketAlert[];
  salaryTrends: SalaryTrend[];
  totalMatches: number;
  newToday: number;
  urgentDeadlines: number;
}

export function AIJobDiscovery() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AIJobDiscoveryData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'opportunities' | 'alerts' | 'trends'>('opportunities');

  useEffect(() => {
    if (user && token) {
      generateJobDiscoveryData();
    }
  }, [user, token]);

  const generateJobDiscoveryData = async () => {
    try {
      setLoading(true);

      // Simulate AI-powered job discovery data generation
      // In production, this would call your AI Service Manager
      const mockData: AIJobDiscoveryData = {
        opportunities: [
          {
            id: '1',
            title: 'Senior Full Stack Developer',
            company: 'TechFlow Solutions',
            location: 'San Francisco, CA',
            salary: '$140k - $180k',
            matchScore: 92,
            urgency: 'high',
            reason: 'Perfect skill match with React, Node.js, and AI experience',
            postedDate: '2025-09-18',
            applicationDeadline: '2025-09-25',
            url: 'https://example.com/job1',
            skills: ['React', 'Node.js', 'TypeScript', 'AI/ML', 'PostgreSQL'],
            workMode: 'hybrid',
            isNew: true,
            salaryTrend: 'increasing',
            competitionLevel: 'medium'
          },
          {
            id: '2',
            title: 'AI Product Manager',
            company: 'InnovateLabs',
            location: 'Remote',
            salary: '$160k - $200k',
            matchScore: 87,
            urgency: 'medium',
            reason: 'Strong product management background with AI focus',
            postedDate: '2025-09-17',
            skills: ['Product Management', 'AI Strategy', 'Data Analysis', 'Agile'],
            workMode: 'remote',
            isNew: true,
            salaryTrend: 'increasing',
            competitionLevel: 'high'
          },
          {
            id: '3',
            title: 'Frontend Engineer',
            company: 'Design Systems Inc',
            location: 'New York, NY',
            salary: '$120k - $150k',
            matchScore: 84,
            urgency: 'low',
            reason: 'Frontend expertise with design system experience',
            postedDate: '2025-09-16',
            applicationDeadline: '2025-10-01',
            skills: ['React', 'Design Systems', 'TypeScript', 'Figma'],
            workMode: 'onsite',
            isNew: false,
            salaryTrend: 'stable',
            competitionLevel: 'low'
          }
        ],
        marketAlerts: [
          {
            id: '1',
            type: 'salary_increase',
            title: 'AI Engineering Salaries Up 15%',
            description: 'AI engineering roles have seen a 15% salary increase this quarter, particularly in machine learning and LLM development.',
            impact: 'high',
            actionable: true,
            createdAt: '2025-09-18'
          },
          {
            id: '2',
            type: 'new_companies',
            title: '12 New Startups Hiring in Your Area',
            description: 'Several well-funded startups have opened engineering positions in your skill areas.',
            impact: 'medium',
            actionable: true,
            createdAt: '2025-09-17'
          },
          {
            id: '3',
            type: 'skill_demand',
            title: 'TypeScript Demand Surging',
            description: 'TypeScript appears in 78% more job postings compared to last quarter.',
            impact: 'medium',
            actionable: false,
            createdAt: '2025-09-16'
          }
        ],
        salaryTrends: [
          {
            skill: 'AI/Machine Learning',
            currentRange: '$140k - $220k',
            trend: 'up',
            percentageChange: 15,
            timeframe: 'Last 3 months'
          },
          {
            skill: 'React Development',
            currentRange: '$110k - $160k',
            trend: 'up',
            percentageChange: 8,
            timeframe: 'Last 3 months'
          },
          {
            skill: 'Product Management',
            currentRange: '$130k - $190k',
            trend: 'stable',
            percentageChange: 2,
            timeframe: 'Last 3 months'
          }
        ],
        totalMatches: 127,
        newToday: 8,
        urgentDeadlines: 3
      };

      setData(mockData);
    } catch (error) {
      toast.error('Failed to load job discovery data');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'salary_increase': return DollarSign;
      case 'new_companies': return Building;
      case 'skill_demand': return TrendingUp;
      case 'market_shift': return Target;
      default: return AlertTriangle;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />;
      case 'stable': return <TrendingUp className="w-4 h-4 text-gray-600 rotate-90" />;
      default: return <TrendingUp className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <CardTitle>AI Job Discovery</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <CardTitle>AI Job Discovery</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">Unable to load job discovery data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <div>
              <CardTitle>AI Job Discovery</CardTitle>
              <CardDescription>Intelligent job matching and market insights</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Zap className="w-3 h-3" />
              {data.totalMatches} matches
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Clock className="w-3 h-3" />
              {data.newToday} new today
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 border rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{data.totalMatches}</div>
            <div className="text-sm text-gray-600">Total Matches</div>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <div className="text-2xl font-bold text-green-600">{data.newToday}</div>
            <div className="text-sm text-gray-600">New Today</div>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <div className="text-2xl font-bold text-red-600">{data.urgentDeadlines}</div>
            <div className="text-sm text-gray-600">Urgent Deadlines</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6">
          <Button
            variant={selectedTab === 'opportunities' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('opportunities')}
            className="flex-1"
          >
            <Target className="w-4 h-4 mr-2" />
            Opportunities
          </Button>
          <Button
            variant={selectedTab === 'alerts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('alerts')}
            className="flex-1"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Market Alerts
          </Button>
          <Button
            variant={selectedTab === 'trends' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('trends')}
            className="flex-1"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Salary Trends
          </Button>
        </div>

        {/* Opportunities Tab */}
        {selectedTab === 'opportunities' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search opportunities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            {data.opportunities.map((job) => (
              <Card key={job.id} className="border hover:border-purple-200 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{job.title}</h3>
                        {job.isNew && (
                          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                            NEW
                          </Badge>
                        )}
                        <Badge className={`text-xs ${getUrgencyColor(job.urgency)}`}>
                          {job.urgency.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          {job.company}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </div>
                        {job.salary && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {job.salary}
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-gray-700 mb-3">{job.reason}</p>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {job.skills.slice(0, 4).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {job.skills.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{job.skills.length - 4} more
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Posted {new Date(job.postedDate).toLocaleDateString()}</span>
                          {job.applicationDeadline && (
                            <span className="text-red-600">
                              Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <BookmarkPlus className="w-4 h-4" />
                          </Button>
                          {job.url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={job.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          <Button size="sm">
                            Apply Now
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      <MatchScoreDonut score={job.matchScore} size={60} strokeWidth={6} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Market Alerts Tab */}
        {selectedTab === 'alerts' && (
          <div className="space-y-4">
            {data.marketAlerts.map((alert) => {
              const AlertIcon = getAlertIcon(alert.type);
              return (
                <Card key={alert.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        alert.impact === 'high' ? 'bg-red-100' :
                        alert.impact === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        <AlertIcon className={`w-5 h-5 ${
                          alert.impact === 'high' ? 'text-red-600' :
                          alert.impact === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                        }`} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{alert.title}</h3>
                          <Badge variant="outline" className={`text-xs ${
                            alert.impact === 'high' ? 'text-red-600' :
                            alert.impact === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                          }`}>
                            {alert.impact.toUpperCase()}
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">{alert.description}</p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {new Date(alert.createdAt).toLocaleDateString()}
                          </span>
                          {alert.actionable && (
                            <Button variant="outline" size="sm">
                              Take Action
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Salary Trends Tab */}
        {selectedTab === 'trends' && (
          <div className="space-y-4">
            {data.salaryTrends.map((trend, index) => (
              <Card key={index} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{trend.skill}</h3>
                        {getTrendIcon(trend.trend)}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{trend.currentRange}</p>
                      <p className="text-xs text-gray-500">{trend.timeframe}</p>
                    </div>

                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        trend.trend === 'up' ? 'text-green-600' :
                        trend.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {trend.trend === 'up' ? '+' : trend.trend === 'down' ? '-' : ''}
                        {trend.percentageChange}%
                      </div>
                      <div className="text-xs text-gray-500">change</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}