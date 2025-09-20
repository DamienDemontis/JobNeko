'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Lightbulb, Target, TrendingUp, User, Star, CheckCircle,
  ArrowRight, Clock, Zap, BookOpen, Users, Award,
  Calendar, MessageSquare, Eye, ThumbsUp, ThumbsDown,
  X, Plus, ExternalLink, Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileOptimization {
  id: string;
  category: 'resume' | 'linkedin' | 'skills' | 'portfolio';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  priority: number;
  completed: boolean;
  actionItems: string[];
  estimatedTime: string;
}

interface MarketPositioning {
  id: string;
  title: string;
  description: string;
  currentPosition: string;
  recommendedPosition: string;
  rationale: string;
  marketData: {
    demandLevel: number;
    salaryRange: string;
    competitionLevel: 'low' | 'medium' | 'high';
  };
  actionRequired: boolean;
}

interface SkillDevelopment {
  id: string;
  skill: string;
  currentLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  targetLevel: 'intermediate' | 'advanced' | 'expert';
  marketDemand: number;
  salaryImpact: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  resources: {
    type: 'course' | 'certification' | 'project' | 'book';
    name: string;
    url?: string;
    duration: string;
    cost: 'free' | 'paid';
  }[];
  completionTime: string;
}

interface CareerPath {
  id: string;
  title: string;
  description: string;
  currentRole: string;
  targetRole: string;
  timeline: string;
  probability: number;
  keyMilestones: {
    milestone: string;
    timeframe: string;
    requirements: string[];
  }[];
  salaryProgression: {
    current: number;
    target: number;
    timeline: string;
  };
}

interface SmartRecommendationsData {
  profileOptimizations: ProfileOptimization[];
  marketPositioning: MarketPositioning[];
  skillDevelopment: SkillDevelopment[];
  careerPaths: CareerPath[];
  overallScore: number;
  completedRecommendations: number;
  totalRecommendations: number;
  priorityActions: string[];
}

export function SmartRecommendations() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SmartRecommendationsData | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'profile' | 'positioning' | 'skills' | 'career'>('overview');
  const [dismissedRecommendations, setDismissedRecommendations] = useState<string[]>([]);

  useEffect(() => {
    if (user && token) {
      generateRecommendationsData();
    }
  }, [user, token]);

  const generateRecommendationsData = async () => {
    try {
      setLoading(true);

      // Simulate AI-powered recommendations generation
      // In production, this would call your AI Service Manager
      const mockData: SmartRecommendationsData = {
        profileOptimizations: [
          {
            id: '1',
            category: 'resume',
            title: 'Add Quantified Achievements',
            description: 'Include specific metrics and numbers to demonstrate impact in your previous roles.',
            impact: 'high',
            effort: 'medium',
            priority: 1,
            completed: false,
            actionItems: [
              'Add revenue/cost savings numbers to your current role',
              'Include team size or project scope metrics',
              'Quantify efficiency improvements you\'ve made'
            ],
            estimatedTime: '2-3 hours'
          },
          {
            id: '2',
            category: 'linkedin',
            title: 'Optimize LinkedIn Headline',
            description: 'Your headline should include key skills and target role to improve visibility.',
            impact: 'medium',
            effort: 'low',
            priority: 2,
            completed: false,
            actionItems: [
              'Include target role (e.g., "Senior Full Stack Developer")',
              'Add 2-3 key technologies you specialize in',
              'Include years of experience or notable achievement'
            ],
            estimatedTime: '30 minutes'
          },
          {
            id: '3',
            category: 'skills',
            title: 'Highlight Emerging Technologies',
            description: 'Emphasize experience with AI/ML, cloud platforms, and modern frameworks.',
            impact: 'high',
            effort: 'low',
            priority: 3,
            completed: false,
            actionItems: [
              'Create a dedicated "Emerging Tech" section',
              'Add AI/ML projects to your portfolio',
              'Get certification in cloud platforms (AWS/Azure)'
            ],
            estimatedTime: '1-2 weeks'
          }
        ],
        marketPositioning: [
          {
            id: '1',
            title: 'Senior Full Stack Developer',
            description: 'Based on your experience, you\'re well-positioned for senior-level roles.',
            currentPosition: 'Mid-level Developer',
            recommendedPosition: 'Senior Full Stack Developer',
            rationale: 'Your 4+ years of experience and leadership qualities align with senior role requirements.',
            marketData: {
              demandLevel: 85,
              salaryRange: '$130k - $180k',
              competitionLevel: 'medium'
            },
            actionRequired: true
          },
          {
            id: '2',
            title: 'Technical Lead',
            description: 'Consider targeting technical leadership roles to leverage your mentoring experience.',
            currentPosition: 'Individual Contributor',
            recommendedPosition: 'Technical Lead / Team Lead',
            rationale: 'Your experience mentoring juniors and architectural decisions show leadership potential.',
            marketData: {
              demandLevel: 72,
              salaryRange: '$150k - $200k',
              competitionLevel: 'high'
            },
            actionRequired: false
          }
        ],
        skillDevelopment: [
          {
            id: '1',
            skill: 'System Design',
            currentLevel: 'intermediate',
            targetLevel: 'advanced',
            marketDemand: 92,
            salaryImpact: 25,
            priority: 'critical',
            resources: [
              {
                type: 'course',
                name: 'System Design Interview Course',
                url: 'https://example.com/system-design',
                duration: '6 weeks',
                cost: 'paid'
              },
              {
                type: 'book',
                name: 'Designing Data-Intensive Applications',
                duration: '8 weeks',
                cost: 'paid'
              }
            ],
            completionTime: '2-3 months'
          },
          {
            id: '2',
            skill: 'Machine Learning',
            currentLevel: 'beginner',
            targetLevel: 'intermediate',
            marketDemand: 88,
            salaryImpact: 30,
            priority: 'high',
            resources: [
              {
                type: 'course',
                name: 'Machine Learning Specialization',
                url: 'https://example.com/ml-course',
                duration: '12 weeks',
                cost: 'paid'
              },
              {
                type: 'project',
                name: 'Build ML Portfolio Projects',
                duration: '4 weeks',
                cost: 'free'
              }
            ],
            completionTime: '3-4 months'
          },
          {
            id: '3',
            skill: 'Kubernetes',
            currentLevel: 'beginner',
            targetLevel: 'intermediate',
            marketDemand: 78,
            salaryImpact: 18,
            priority: 'medium',
            resources: [
              {
                type: 'certification',
                name: 'Certified Kubernetes Administrator',
                url: 'https://example.com/cka',
                duration: '8 weeks',
                cost: 'paid'
              }
            ],
            completionTime: '2 months'
          }
        ],
        careerPaths: [
          {
            id: '1',
            title: 'Senior Developer → Tech Lead → Engineering Manager',
            description: 'Traditional progression through technical leadership into people management.',
            currentRole: 'Mid-level Developer',
            targetRole: 'Engineering Manager',
            timeline: '3-5 years',
            probability: 78,
            keyMilestones: [
              {
                milestone: 'Promotion to Senior Developer',
                timeframe: '6-12 months',
                requirements: ['System design skills', 'Mentoring experience', 'Project leadership']
              },
              {
                milestone: 'Technical Lead Role',
                timeframe: '18-24 months',
                requirements: ['Cross-team collaboration', 'Architecture decisions', 'Team leadership']
              },
              {
                milestone: 'Engineering Manager',
                timeframe: '36-48 months',
                requirements: ['People management', 'Strategic planning', 'Business acumen']
              }
            ],
            salaryProgression: {
              current: 120000,
              target: 220000,
              timeline: '4 years'
            }
          },
          {
            id: '2',
            title: 'Senior Developer → Principal Engineer',
            description: 'Deep technical expertise path with high individual contributor impact.',
            currentRole: 'Mid-level Developer',
            targetRole: 'Principal Engineer',
            timeline: '4-6 years',
            probability: 65,
            keyMilestones: [
              {
                milestone: 'Senior Developer',
                timeframe: '6-12 months',
                requirements: ['Advanced technical skills', 'System design', 'Code quality leadership']
              },
              {
                milestone: 'Staff Engineer',
                timeframe: '24-36 months',
                requirements: ['Technical strategy', 'Cross-team influence', 'Innovation leadership']
              },
              {
                milestone: 'Principal Engineer',
                timeframe: '48-72 months',
                requirements: ['Company-wide technical leadership', 'Industry recognition', 'Innovation']
              }
            ],
            salaryProgression: {
              current: 120000,
              target: 280000,
              timeline: '5 years'
            }
          }
        ],
        overallScore: 72,
        completedRecommendations: 3,
        totalRecommendations: 15,
        priorityActions: [
          'Complete system design course to qualify for senior roles',
          'Update resume with quantified achievements',
          'Start building ML portfolio to enter AI market',
          'Schedule informational interviews with tech leads'
        ]
      };

      setData(mockData);
    } catch (error) {
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRecommendation = (id: string) => {
    if (!data) return;

    setData({
      ...data,
      profileOptimizations: data.profileOptimizations.map(rec =>
        rec.id === id ? { ...rec, completed: true } : rec
      ),
      completedRecommendations: data.completedRecommendations + 1
    });
    toast.success('Recommendation marked as completed');
  };

  const handleDismissRecommendation = (id: string) => {
    setDismissedRecommendations([...dismissedRecommendations, id]);
    toast.info('Recommendation dismissed');
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-orange-600" />
            <CardTitle>Smart Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-600 border-t-transparent"></div>
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
            <Lightbulb className="w-5 h-5 text-orange-600" />
            <CardTitle>Smart Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">Unable to load recommendations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-orange-600" />
            <div>
              <CardTitle>Smart Recommendations</CardTitle>
              <CardDescription>AI-powered suggestions to optimize your job search</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Sparkles className="w-3 h-3" />
              Score: {data.overallScore}/100
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              {data.completedRecommendations}/{data.totalRecommendations} completed
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Progress Overview */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-lg">Optimization Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Overall Profile Strength</span>
                      <span>{data.overallScore}/100</span>
                    </div>
                    <Progress value={data.overallScore} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Completed Recommendations</span>
                      <span>{data.completedRecommendations}/{data.totalRecommendations}</span>
                    </div>
                    <Progress
                      value={(data.completedRecommendations / data.totalRecommendations) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Priority Actions */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Priority Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.priorityActions.map((action, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-orange-600">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{action}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Start
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Wins */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Quick Wins (Low Effort, High Impact)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.profileOptimizations
                    .filter(rec => rec.effort === 'low' && rec.impact === 'high' && !rec.completed)
                    .map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{rec.title}</h4>
                          <p className="text-sm text-gray-600">{rec.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getImpactColor(rec.impact)}>
                              {rec.impact} impact
                            </Badge>
                            <Badge className={getEffortColor(rec.effort)}>
                              {rec.effort} effort
                            </Badge>
                            <span className="text-xs text-gray-500">~{rec.estimatedTime}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCompleteRecommendation(rec.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Career Path Preview */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Recommended Career Paths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.careerPaths.slice(0, 2).map((path) => (
                    <div key={path.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{path.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{path.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-600">Timeline: {path.timeline}</span>
                            <span className="text-green-600">Probability: {path.probability}%</span>
                            <span className="text-blue-600">
                              Salary: ${(path.salaryProgression.current / 1000).toFixed(0)}k → ${(path.salaryProgression.target / 1000).toFixed(0)}k
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mt-6">
          <Button
            variant={selectedTab === 'overview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('overview')}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={selectedTab === 'profile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('profile')}
            className="flex-1"
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </Button>
          <Button
            variant={selectedTab === 'positioning' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('positioning')}
            className="flex-1"
          >
            <Target className="w-4 h-4 mr-2" />
            Positioning
          </Button>
          <Button
            variant={selectedTab === 'skills' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('skills')}
            className="flex-1"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Skills
          </Button>
          <Button
            variant={selectedTab === 'career' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('career')}
            className="flex-1"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Career Path
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}