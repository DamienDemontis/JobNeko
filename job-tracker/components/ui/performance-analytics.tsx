'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  BarChart3, TrendingUp, Calendar, Target, Award, Clock,
  CheckCircle, XCircle, DollarSign, Users, ArrowUp, ArrowDown,
  Eye, MessageSquare, Phone, Briefcase, Star, Trophy,
  Download, RefreshCw, Filter, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ApplicationMetrics {
  totalApplications: number;
  successRate: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  averageTimeToResponse: number;
  averageTimeToInterview: number;
  averageTimeToOffer: number;
}

interface InterviewMetrics {
  totalInterviews: number;
  conversionRate: number;
  averageRating: number;
  phoneScreens: number;
  technicalInterviews: number;
  finalInterviews: number;
  successByType: {
    phone: number;
    technical: number;
    final: number;
  };
}

interface SalaryMetrics {
  negotiationSuccessRate: number;
  averageIncrease: number;
  totalOffers: number;
  acceptedOffers: number;
  rejectedOffers: number;
  averageOfferValue: number;
  salaryRange: {
    min: number;
    max: number;
    average: number;
  };
}

interface NetworkMetrics {
  totalConnections: number;
  newConnectionsThisMonth: number;
  responseRate: number;
  coffeeChats: number;
  referrals: number;
  networkGrowthRate: number;
}

interface TimelineData {
  date: string;
  applications: number;
  responses: number;
  interviews: number;
  offers: number;
}

interface PerformanceAnalyticsData {
  applications: ApplicationMetrics;
  interviews: InterviewMetrics;
  salary: SalaryMetrics;
  network: NetworkMetrics;
  timeline: TimelineData[];
  insights: string[];
  recommendations: string[];
  goals: {
    applicationsThisMonth: { current: number; target: number };
    interviewsThisMonth: { current: number; target: number };
    networkingThisMonth: { current: number; target: number };
  };
}

export function PerformanceAnalytics() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PerformanceAnalyticsData | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'applications' | 'interviews' | 'salary' | 'networking'>('overview');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    if (user && token) {
      generateAnalyticsData();
    }
  }, [user, token, timeRange]);

  const generateAnalyticsData = async () => {
    try {
      setLoading(true);

      // Simulate analytics data generation
      // In production, this would call your AI Service Manager and database
      const mockData: PerformanceAnalyticsData = {
        applications: {
          totalApplications: 47,
          successRate: 12.8,
          responseRate: 31.9,
          interviewRate: 25.5,
          offerRate: 8.5,
          averageTimeToResponse: 7.2,
          averageTimeToInterview: 14.5,
          averageTimeToOffer: 21.3
        },
        interviews: {
          totalInterviews: 12,
          conversionRate: 41.7,
          averageRating: 4.2,
          phoneScreens: 8,
          technicalInterviews: 5,
          finalInterviews: 3,
          successByType: {
            phone: 75,
            technical: 60,
            final: 66.7
          }
        },
        salary: {
          negotiationSuccessRate: 66.7,
          averageIncrease: 12.5,
          totalOffers: 4,
          acceptedOffers: 2,
          rejectedOffers: 2,
          averageOfferValue: 165000,
          salaryRange: {
            min: 140000,
            max: 195000,
            average: 165000
          }
        },
        network: {
          totalConnections: 247,
          newConnectionsThisMonth: 18,
          responseRate: 34.5,
          coffeeChats: 6,
          referrals: 3,
          networkGrowthRate: 7.8
        },
        timeline: [
          { date: '2025-08-18', applications: 3, responses: 1, interviews: 0, offers: 0 },
          { date: '2025-08-25', applications: 5, responses: 2, interviews: 1, offers: 0 },
          { date: '2025-09-01', applications: 7, responses: 3, interviews: 2, offers: 1 },
          { date: '2025-09-08', applications: 6, responses: 2, interviews: 1, offers: 0 },
          { date: '2025-09-15', applications: 8, responses: 4, interviews: 3, offers: 1 },
          { date: '2025-09-18', applications: 4, responses: 1, interviews: 1, offers: 0 }
        ],
        insights: [
          'Your interview conversion rate is 15% above industry average',
          'Best application days are Tuesday-Thursday (67% higher response rate)',
          'Companies respond fastest to applications submitted between 10-11 AM',
          'Your networking efforts show 23% better results than passive applications'
        ],
        recommendations: [
          'Focus on quality over quantity - your high interview rate suggests good targeting',
          'Schedule 2-3 coffee chats per week to maintain networking momentum',
          'Consider following up on applications after 1 week for better response rates',
          'Your salary negotiation success rate suggests you can aim 10-15% higher'
        ],
        goals: {
          applicationsThisMonth: { current: 23, target: 30 },
          interviewsThisMonth: { current: 7, target: 10 },
          networkingThisMonth: { current: 12, target: 15 }
        }
      };

      setData(mockData);
    } catch (error) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrendIcon = (value: number, isGood = true) => {
    const isPositive = value > 0;
    const color = (isPositive && isGood) || (!isPositive && !isGood) ? 'text-green-600' : 'text-red-600';
    const Icon = isPositive ? ArrowUp : ArrowDown;
    return <Icon className={`w-4 h-4 ${color}`} />;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <CardTitle>Performance Analytics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
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
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <CardTitle>Performance Analytics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">Unable to load analytics data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Track your job search performance and progress</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={generateAnalyticsData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Time Range Selector */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 max-w-md">
          {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="flex-1 text-xs"
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>

        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-green-600">{data.applications.successRate}%</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Interview Rate</p>
                      <p className="text-2xl font-bold text-blue-600">{data.applications.interviewRate}%</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Offer</p>
                      <p className="text-2xl font-bold text-purple-600">${(data.salary.averageOfferValue / 1000).toFixed(0)}k</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Network Growth</p>
                      <p className="text-2xl font-bold text-orange-600">{data.network.networkGrowthRate}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Goals Progress */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-lg">Monthly Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Applications ({data.goals.applicationsThisMonth.current}/{data.goals.applicationsThisMonth.target})</span>
                      <span>{Math.round((data.goals.applicationsThisMonth.current / data.goals.applicationsThisMonth.target) * 100)}%</span>
                    </div>
                    <Progress
                      value={(data.goals.applicationsThisMonth.current / data.goals.applicationsThisMonth.target) * 100}
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Interviews ({data.goals.interviewsThisMonth.current}/{data.goals.interviewsThisMonth.target})</span>
                      <span>{Math.round((data.goals.interviewsThisMonth.current / data.goals.interviewsThisMonth.target) * 100)}%</span>
                    </div>
                    <Progress
                      value={(data.goals.interviewsThisMonth.current / data.goals.interviewsThisMonth.target) * 100}
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Networking ({data.goals.networkingThisMonth.current}/{data.goals.networkingThisMonth.target})</span>
                      <span>{Math.round((data.goals.networkingThisMonth.current / data.goals.networkingThisMonth.target) * 100)}%</span>
                    </div>
                    <Progress
                      value={(data.goals.networkingThisMonth.current / data.goals.networkingThisMonth.target) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insights */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.insights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{insight}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{rec}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Application Funnel */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-lg">Application Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Applications Sent</p>
                        <p className="text-sm text-gray-600">{data.applications.totalApplications} total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{data.applications.totalApplications}</p>
                      <p className="text-sm text-gray-500">100%</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Responses Received</p>
                        <p className="text-sm text-gray-600">{data.applications.responseRate}% response rate</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{Math.round(data.applications.totalApplications * data.applications.responseRate / 100)}</p>
                      <p className="text-sm text-gray-500">{data.applications.responseRate}%</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Phone className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Interviews Scheduled</p>
                        <p className="text-sm text-gray-600">{data.applications.interviewRate}% interview rate</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{data.interviews.totalInterviews}</p>
                      <p className="text-sm text-gray-500">{data.applications.interviewRate}%</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium">Offers Received</p>
                        <p className="text-sm text-gray-600">{data.applications.offerRate}% offer rate</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{data.salary.totalOffers}</p>
                      <p className="text-sm text-gray-500">{data.applications.offerRate}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab Navigation at Bottom */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mt-6">
          <Button
            variant={selectedTab === 'overview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('overview')}
            className="flex-1"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={selectedTab === 'applications' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('applications')}
            className="flex-1"
          >
            <Briefcase className="w-4 h-4 mr-2" />
            Applications
          </Button>
          <Button
            variant={selectedTab === 'interviews' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('interviews')}
            className="flex-1"
          >
            <Users className="w-4 h-4 mr-2" />
            Interviews
          </Button>
          <Button
            variant={selectedTab === 'salary' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('salary')}
            className="flex-1"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Salary
          </Button>
          <Button
            variant={selectedTab === 'networking' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('networking')}
            className="flex-1"
          >
            <Users className="w-4 h-4 mr-2" />
            Network
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}