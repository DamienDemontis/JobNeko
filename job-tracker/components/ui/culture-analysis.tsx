"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Heart,
  TrendingUp,
  Clock,
  MapPin,
  Award,
  AlertTriangle,
  CheckCircle,
  Brain,
  BarChart3,
  Calendar,
  Target,
  Star,
  Globe,
  Home
} from 'lucide-react';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';
import { webIntelligenceService } from '@/lib/services/web-intelligence';

interface CultureMetrics {
  workLifeBalance: {
    score: number; // 1-10
    flexibilityLevel: 'low' | 'medium' | 'high';
    remoteWorkSupport: 'none' | 'hybrid' | 'fully_remote';
    averageHours: number;
    burnoutRisk: 'low' | 'medium' | 'high';
  };
  careerGrowth: {
    promotionRate: number; // percentage
    internalMobility: 'low' | 'medium' | 'high';
    learningOpportunities: number; // 1-10
    mentorshipPrograms: boolean;
    skillDevelopment: number; // 1-10
  };
  compensation: {
    competitiveness: 'below_market' | 'market_rate' | 'above_market';
    benefitsRating: number; // 1-10
    equityOffered: boolean;
    bonusStructure: 'none' | 'performance' | 'profit_sharing' | 'comprehensive';
    transparencyLevel: number; // 1-10
  };
  diversity: {
    genderBalance: {
      male: number;
      female: number;
      other: number;
    };
    ageDistribution: {
      under30: number;
      between30_50: number;
      over50: number;
    };
    leadershipDiversity: number; // 1-10
    inclusionScore: number; // 1-10
  };
}

interface TeamComposition {
  totalEmployees: number;
  departmentBreakdown: {
    department: string;
    count: number;
    percentage: number;
    growthTrend: 'growing' | 'stable' | 'shrinking';
  }[];
  experienceDistribution: {
    junior: number;
    mid: number;
    senior: number;
    leadership: number;
  };
  tenureAnalysis: {
    averageTenure: number; // years
    turnoverRate: number; // percentage
    retentionTrend: 'improving' | 'stable' | 'declining';
  };
  remoteCulture: {
    remotePercentage: number;
    hybridPercentage: number;
    officePercentage: number;
    cultureAdaptation: number; // 1-10
  };
}

interface CultureInsights {
  strengths: string[];
  concerns: string[];
  cultureType: 'innovative' | 'traditional' | 'fast_paced' | 'collaborative' | 'hierarchical' | 'flat';
  values: string[];
  communication: {
    style: 'formal' | 'casual' | 'mixed';
    transparency: number; // 1-10
    feedback_culture: 'strong' | 'moderate' | 'weak';
  };
  environment: {
    competitiveness: number; // 1-10
    collaboration: number; // 1-10
    innovation: number; // 1-10
    stability: number; // 1-10
  };
  redFlags: string[];
  recommendations: string[];
}

interface CultureAnalysisData {
  companyName: string;
  analysisDate: string;
  overallScore: number; // 1-10
  metrics: CultureMetrics;
  composition: TeamComposition;
  insights: CultureInsights;
  fitAssessment: {
    cultureFitScore: number; // 1-10
    alignmentAreas: string[];
    potentialChallenges: string[];
    recommendations: string[];
  };
}

interface CultureAnalysisProps {
  companyName: string;
  jobTitle: string;
  userId: string;
}

export function CultureAnalysis({ companyName, jobTitle, userId }: CultureAnalysisProps) {
  const [analysis, setAnalysis] = useState<CultureAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const generateCultureAnalysis = async () => {
    if (!companyName) {
      setError('Company name is required for culture analysis');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const companyIntel = await webIntelligenceService.getCompanyIntelligence(companyName, userId);

      const analysisPrompt = `
You are an expert organizational culture analyst. Analyze the company culture and team composition.

COMPANY INFORMATION:
Company: ${companyName}
Position: ${jobTitle}
Industry: ${companyIntel.industry}
Company Size: ${companyIntel.teamComposition.totalEmployees} employees
Founded: ${companyIntel.foundedYear || 'Unknown'}
Business Model: ${companyIntel.businessModel}
Financial Health: ${companyIntel.financialData.financialHealth}

Based on company size, industry, and business model, generate a comprehensive culture analysis.

Return a JSON object with this exact structure:
{
  "companyName": "${companyName}",
  "analysisDate": "${new Date().toISOString()}",
  "overallScore": 7.5,
  "metrics": {
    "workLifeBalance": {
      "score": 7,
      "flexibilityLevel": "medium",
      "remoteWorkSupport": "hybrid",
      "averageHours": 45,
      "burnoutRisk": "medium"
    },
    "careerGrowth": {
      "promotionRate": 15,
      "internalMobility": "medium",
      "learningOpportunities": 8,
      "mentorshipPrograms": true,
      "skillDevelopment": 7
    },
    "compensation": {
      "competitiveness": "market_rate",
      "benefitsRating": 8,
      "equityOffered": true,
      "bonusStructure": "performance",
      "transparencyLevel": 6
    },
    "diversity": {
      "genderBalance": {
        "male": 60,
        "female": 38,
        "other": 2
      },
      "ageDistribution": {
        "under30": 40,
        "between30_50": 50,
        "over50": 10
      },
      "leadershipDiversity": 6,
      "inclusionScore": 7
    }
  },
  "composition": {
    "totalEmployees": ${companyIntel.teamComposition.totalEmployees},
    "departmentBreakdown": [
      {
        "department": "Engineering",
        "count": 150,
        "percentage": 35,
        "growthTrend": "growing"
      },
      {
        "department": "Sales",
        "count": 80,
        "percentage": 20,
        "growthTrend": "stable"
      },
      {
        "department": "Marketing",
        "count": 40,
        "percentage": 10,
        "growthTrend": "growing"
      },
      {
        "department": "Operations",
        "count": 60,
        "percentage": 15,
        "growthTrend": "stable"
      },
      {
        "department": "Other",
        "count": 70,
        "percentage": 20,
        "growthTrend": "stable"
      }
    ],
    "experienceDistribution": {
      "junior": 30,
      "mid": 45,
      "senior": 20,
      "leadership": 5
    },
    "tenureAnalysis": {
      "averageTenure": 3.2,
      "turnoverRate": 12,
      "retentionTrend": "stable"
    },
    "remoteCulture": {
      "remotePercentage": 25,
      "hybridPercentage": 50,
      "officePercentage": 25,
      "cultureAdaptation": 7
    }
  },
  "insights": {
    "strengths": [
      "Strong technical culture",
      "Good work-life balance",
      "Innovative environment",
      "Collaborative teams"
    ],
    "concerns": [
      "Rapid growth may strain culture",
      "Communication challenges in remote work",
      "Limited diversity in leadership"
    ],
    "cultureType": "innovative",
    "values": [
      "Innovation",
      "Collaboration",
      "Customer focus",
      "Integrity",
      "Growth mindset"
    ],
    "communication": {
      "style": "casual",
      "transparency": 7,
      "feedback_culture": "strong"
    },
    "environment": {
      "competitiveness": 6,
      "collaboration": 8,
      "innovation": 9,
      "stability": 6
    },
    "redFlags": [
      "High growth may lead to burnout",
      "Potential communication gaps"
    ],
    "recommendations": [
      "Ask about team communication practices",
      "Inquire about growth support systems",
      "Understand remote work policies",
      "Explore mentorship opportunities"
    ]
  },
  "fitAssessment": {
    "cultureFitScore": 8,
    "alignmentAreas": [
      "Innovation focus aligns with your growth mindset",
      "Collaborative environment matches your teamwork style",
      "Technical excellence culture fits your skills"
    ],
    "potentialChallenges": [
      "Fast-paced environment may require adjustment",
      "Remote work culture may affect networking"
    ],
    "recommendations": [
      "Emphasize your adaptability in interviews",
      "Prepare examples of remote collaboration",
      "Show enthusiasm for innovation and learning"
    ]
  }
}

REQUIREMENTS:
- Base analysis on company size and industry norms
- Consider business model impact on culture
- Include realistic metrics based on company stage
- Provide actionable insights for ${jobTitle} role
- Consider industry-specific culture patterns
- Include both opportunities and challenges
- Suggest specific interview questions about culture
`;

      const response = await aiServiceManagerClient.generateCompletion(
        analysisPrompt,
        'company_research',
        userId,
        { temperature: 0.3, max_tokens: 3500 }
      );

      const analysisData = JSON.parse(response.content);
      setAnalysis(analysisData);

    } catch (error) {
      console.error('Error generating culture analysis:', error);
      setError(error instanceof Error ? error.message : 'Culture analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyName && jobTitle) {
      generateCultureAnalysis();
    }
  }, [companyName, jobTitle, userId]);

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'growing': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'stable': return <BarChart3 className="h-3 w-3 text-blue-500" />;
      case 'shrinking': return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
      default: return null;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Culture & Team Analysis
        </CardTitle>
        <CardDescription>
          Deep insights into company culture, team composition, and work environment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">
              Analyzing company culture and team dynamics...
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 border border-red-200 rounded-md bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={generateCultureAnalysis}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Retry Analysis
            </Button>
          </div>
        )}

        {analysis && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="metrics" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Metrics
              </TabsTrigger>
              <TabsTrigger value="composition" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team
              </TabsTrigger>
              <TabsTrigger value="fit" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Culture Fit
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Overall Score */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                      {analysis.overallScore}/10
                    </div>
                    <p className="text-sm text-gray-600">Overall Culture Score</p>
                    <Badge variant="outline" className="mt-2">
                      {analysis.insights.cultureType} Culture
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Culture Environment */}
              <Card>
                <CardHeader>
                  <CardTitle>Culture Environment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{analysis.insights.environment.collaboration}/10</div>
                      <p className="text-sm text-gray-600">Collaboration</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{analysis.insights.environment.innovation}/10</div>
                      <p className="text-sm text-gray-600">Innovation</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{analysis.insights.environment.competitiveness}/10</div>
                      <p className="text-sm text-gray-600">Competitive</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{analysis.insights.environment.stability}/10</div>
                      <p className="text-sm text-gray-600">Stability</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Core Values */}
              <Card>
                <CardHeader>
                  <CardTitle>Core Values</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.insights.values.map((value, index) => (
                      <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700">
                        {value}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Strengths & Concerns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      Culture Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.insights.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-700">
                      <AlertTriangle className="h-5 w-5" />
                      Areas of Concern
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.insights.concerns.map((concern, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                          {concern}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="space-y-6">
              {/* Work-Life Balance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Work-Life Balance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium">Overall Score</p>
                      <p className={`text-2xl font-bold ${getScoreColor(analysis.metrics.workLifeBalance.score)}`}>
                        {analysis.metrics.workLifeBalance.score}/10
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Average Hours</p>
                      <p className="text-2xl font-bold text-blue-600">{analysis.metrics.workLifeBalance.averageHours}/week</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Burnout Risk</p>
                      <Badge className={getRiskColor(analysis.metrics.workLifeBalance.burnoutRisk)}>
                        {analysis.metrics.workLifeBalance.burnoutRisk}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Flexibility Level</p>
                      <Badge variant="outline">{analysis.metrics.workLifeBalance.flexibilityLevel}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Remote Work</p>
                      <Badge variant="outline" className="bg-green-50">
                        {analysis.metrics.workLifeBalance.remoteWorkSupport.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Career Growth */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Career Growth
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{analysis.metrics.careerGrowth.promotionRate}%</div>
                      <p className="text-sm text-gray-600">Promotion Rate</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{analysis.metrics.careerGrowth.learningOpportunities}/10</div>
                      <p className="text-sm text-gray-600">Learning</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{analysis.metrics.careerGrowth.skillDevelopment}/10</div>
                      <p className="text-sm text-gray-600">Skill Dev</p>
                    </div>
                    <div className="text-center">
                      <Badge variant={analysis.metrics.careerGrowth.mentorshipPrograms ? 'default' : 'secondary'}>
                        {analysis.metrics.careerGrowth.mentorshipPrograms ? 'Yes' : 'No'}
                      </Badge>
                      <p className="text-sm text-gray-600">Mentorship</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Internal Mobility</p>
                    <Badge variant="outline">{analysis.metrics.careerGrowth.internalMobility}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Compensation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Compensation & Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium">Market Position</p>
                      <Badge variant={
                        analysis.metrics.compensation.competitiveness === 'above_market' ? 'default' :
                        analysis.metrics.compensation.competitiveness === 'market_rate' ? 'secondary' : 'destructive'
                      }>
                        {analysis.metrics.compensation.competitiveness.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Benefits Rating</p>
                      <p className={`text-xl font-bold ${getScoreColor(analysis.metrics.compensation.benefitsRating)}`}>
                        {analysis.metrics.compensation.benefitsRating}/10
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Equity Offered</p>
                      <Badge variant={analysis.metrics.compensation.equityOffered ? 'default' : 'secondary'}>
                        {analysis.metrics.compensation.equityOffered ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Bonus Structure</p>
                      <Badge variant="outline">{analysis.metrics.compensation.bonusStructure.replace('_', ' ')}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Transparency</p>
                      <p className={`text-xl font-bold ${getScoreColor(analysis.metrics.compensation.transparencyLevel)}`}>
                        {analysis.metrics.compensation.transparencyLevel}/10
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Team Composition Tab */}
            <TabsContent value="composition" className="space-y-6">
              {/* Department Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Department Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.composition.departmentBreakdown.map((dept, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div>
                            <h4 className="font-medium">{dept.department}</h4>
                            <p className="text-sm text-gray-600">{dept.count} employees</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm">{dept.percentage}%</span>
                          {getTrendIcon(dept.growthTrend)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Experience Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Experience Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{analysis.composition.experienceDistribution.junior}%</div>
                      <p className="text-sm text-gray-600">Junior</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{analysis.composition.experienceDistribution.mid}%</div>
                      <p className="text-sm text-gray-600">Mid-Level</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{analysis.composition.experienceDistribution.senior}%</div>
                      <p className="text-sm text-gray-600">Senior</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{analysis.composition.experienceDistribution.leadership}%</div>
                      <p className="text-sm text-gray-600">Leadership</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Remote Culture */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Remote Work Culture
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{analysis.composition.remoteCulture.remotePercentage}%</div>
                      <p className="text-sm text-gray-600">Fully Remote</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{analysis.composition.remoteCulture.hybridPercentage}%</div>
                      <p className="text-sm text-gray-600">Hybrid</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{analysis.composition.remoteCulture.officePercentage}%</div>
                      <p className="text-sm text-gray-600">Office-Based</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Culture Adaptation Score</p>
                    <p className={`text-xl font-bold ${getScoreColor(analysis.composition.remoteCulture.cultureAdaptation)}`}>
                      {analysis.composition.remoteCulture.cultureAdaptation}/10
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Tenure Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Retention & Tenure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{analysis.composition.tenureAnalysis.averageTenure} years</div>
                      <p className="text-sm text-gray-600">Average Tenure</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{analysis.composition.tenureAnalysis.turnoverRate}%</div>
                      <p className="text-sm text-gray-600">Turnover Rate</p>
                    </div>
                    <div className="text-center">
                      <Badge variant="outline" className="bg-green-50">
                        {analysis.composition.tenureAnalysis.retentionTrend}
                      </Badge>
                      <p className="text-sm text-gray-600">Retention Trend</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Culture Fit Tab */}
            <TabsContent value="fit" className="space-y-6">
              {/* Fit Score */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getScoreColor(analysis.fitAssessment.cultureFitScore)}`}>
                      {analysis.fitAssessment.cultureFitScore}/10
                    </div>
                    <p className="text-sm text-gray-600">Culture Fit Score</p>
                  </div>
                </CardContent>
              </Card>

              {/* Alignment Areas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    Cultural Alignment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.fitAssessment.alignmentAreas.map((area, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        {area}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Potential Challenges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-700">
                    <AlertTriangle className="h-5 w-5" />
                    Potential Challenges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.fitAssessment.potentialChallenges.map((challenge, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                        {challenge}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Interview Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.fitAssessment.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Star className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {analysis && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Analysis generated: {new Date(analysis.analysisDate).toLocaleDateString()}</span>
            <Button
              onClick={generateCultureAnalysis}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <Brain className="h-4 w-4 mr-2" />
              Refresh Analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}