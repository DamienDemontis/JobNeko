"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Clock,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Star,
  Calendar,
  Target,
  BarChart3,
  MessageSquare,
  Brain,
  Award
} from 'lucide-react';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';
import { webIntelligenceService } from '@/lib/services/web-intelligence';

interface InterviewReview {
  id: string;
  source: 'glassdoor' | 'linkedin' | 'indeed' | 'blind';
  rating: number; // 1-5
  difficulty: 'easy' | 'medium' | 'hard';
  experience: 'positive' | 'neutral' | 'negative';
  jobTitle: string;
  interviewDate: string;
  processLength: string;
  stages: string[];
  questions: string[];
  feedback: string;
  tips: string[];
  outcome: 'offer' | 'rejected' | 'pending' | 'withdrew';
}

interface InterviewPattern {
  commonStages: {
    stage: string;
    frequency: number; // percentage
    averageDuration: string;
    difficulty: number; // 1-5
  }[];
  typicalQuestions: {
    category: string;
    questions: string[];
    frequency: number;
  }[];
  processMetrics: {
    averageLength: string;
    responseTime: string;
    successRate: number;
    offerRate: number;
  };
  difficultyBreakdown: {
    easy: number;
    medium: number;
    hard: number;
  };
}

interface CompanyInterviewIntelligence {
  companyName: string;
  analysisDate: string;
  totalReviews: number;
  averageRating: number;
  patterns: InterviewPattern;
  insights: {
    strengths: string[];
    weaknesses: string[];
    redFlags: string[];
    recommendations: string[];
  };
  interviewer: {
    commonInterviewers: string[];
    interviewerStyles: string[];
    focusAreas: string[];
  };
  preparation: {
    mustKnow: string[];
    commonMistakes: string[];
    successFactors: string[];
    resourceRecommendations: string[];
  };
}

interface CompanyInterviewAnalysisProps {
  companyName: string;
  jobTitle: string;
  userId: string;
}

export function CompanyInterviewAnalysis({ companyName, jobTitle, userId }: CompanyInterviewAnalysisProps) {
  const [analysis, setAnalysis] = useState<CompanyInterviewIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const generateInterviewAnalysis = async () => {
    if (!companyName) {
      setError('Company name is required for interview analysis');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const companyIntel = await webIntelligenceService.getCompanyIntelligence(companyName, userId);

      const analysisPrompt = `
You are an expert interview intelligence analyst. Analyze the interview process and patterns for this company.

COMPANY INFORMATION:
Company: ${companyName}
Position: ${jobTitle}
Industry: ${companyIntel.industry}
Company Size: ${companyIntel.teamComposition.totalEmployees} employees
Founded: ${companyIntel.foundedYear || 'Unknown'}
Business Model: ${companyIntel.businessModel}
Financial Health: ${companyIntel.financialData.financialHealth}

Based on typical patterns for companies of this size and industry, generate a comprehensive interview analysis.

Return a JSON object with this exact structure:
{
  "companyName": "${companyName}",
  "analysisDate": "${new Date().toISOString()}",
  "totalReviews": 85,
  "averageRating": 3.8,
  "patterns": {
    "commonStages": [
      {
        "stage": "Phone/Video Screening",
        "frequency": 95,
        "averageDuration": "30-45 minutes",
        "difficulty": 2
      },
      {
        "stage": "Technical Assessment",
        "frequency": 80,
        "averageDuration": "1-2 hours",
        "difficulty": 4
      },
      {
        "stage": "Panel Interview",
        "frequency": 70,
        "averageDuration": "60-90 minutes",
        "difficulty": 4
      },
      {
        "stage": "Final Round",
        "frequency": 60,
        "averageDuration": "45-60 minutes",
        "difficulty": 3
      }
    ],
    "typicalQuestions": [
      {
        "category": "Technical Skills",
        "questions": [
          "Question relevant to ${jobTitle}",
          "Another technical question",
          "System design question"
        ],
        "frequency": 85
      },
      {
        "category": "Behavioral",
        "questions": [
          "Tell me about a challenging project",
          "How do you handle conflict?",
          "Describe your leadership style"
        ],
        "frequency": 90
      },
      {
        "category": "Company Culture",
        "questions": [
          "Why do you want to work here?",
          "How do you fit our values?",
          "What attracts you to our mission?"
        ],
        "frequency": 75
      }
    ],
    "processMetrics": {
      "averageLength": "2-3 weeks",
      "responseTime": "1-2 weeks",
      "successRate": 65,
      "offerRate": 25
    },
    "difficultyBreakdown": {
      "easy": 15,
      "medium": 60,
      "hard": 25
    }
  },
  "insights": {
    "strengths": [
      "Well-structured process",
      "Transparent communication",
      "Professional interviewers"
    ],
    "weaknesses": [
      "Process can be lengthy",
      "Multiple rounds can be exhausting",
      "Feedback sometimes delayed"
    ],
    "redFlags": [
      "Watch for unrealistic timeline expectations",
      "Be prepared for intense technical scrutiny"
    ],
    "recommendations": [
      "Prepare thoroughly for technical deep-dives",
      "Research company culture extensively",
      "Practice behavioral examples using STAR method",
      "Be ready for multiple stakeholder meetings"
    ]
  },
  "interviewer": {
    "commonInterviewers": [
      "Hiring Manager",
      "Team Lead",
      "Senior Developer",
      "HR Representative",
      "Director/VP"
    ],
    "interviewerStyles": [
      "Technical deep-dive focused",
      "Culture fit emphasis",
      "Problem-solving oriented",
      "Collaborative approach"
    ],
    "focusAreas": [
      "Technical expertise",
      "Problem-solving ability",
      "Team collaboration",
      "Cultural alignment",
      "Growth potential"
    ]
  },
  "preparation": {
    "mustKnow": [
      "Core technical skills for ${jobTitle}",
      "Company mission and values",
      "Recent company news and developments",
      "Industry trends and challenges",
      "Specific project examples"
    ],
    "commonMistakes": [
      "Insufficient technical preparation",
      "Lack of company research",
      "Poor behavioral examples",
      "Not asking thoughtful questions",
      "Underestimating process length"
    ],
    "successFactors": [
      "Strong technical foundation",
      "Clear communication",
      "Cultural alignment",
      "Enthusiasm for role",
      "Well-prepared questions"
    ],
    "resourceRecommendations": [
      "Company website and blog",
      "Glassdoor reviews",
      "LinkedIn employee profiles",
      "Technical documentation",
      "Industry reports"
    ]
  }
}

REQUIREMENTS:
- Base analysis on company size, industry, and business model
- Include realistic difficulty levels and timeframes
- Provide actionable preparation advice
- Consider industry-specific interview patterns
- Include both technical and cultural elements
- Suggest specific areas of focus for ${jobTitle}
- Provide practical tips based on company characteristics
`;

      const analysisData = await aiServiceManagerClient.generateJSON(
        analysisPrompt,
        'company_research',
        userId,
        { temperature: 0.3, max_tokens: 3000 }
      );
      setAnalysis(analysisData);

    } catch (error) {
      console.error('Error generating interview analysis:', error);
      setError(error instanceof Error ? error.message : 'Analysis generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyName && jobTitle) {
      generateInterviewAnalysis();
    }
  }, [companyName, jobTitle, userId]);

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'text-green-600 bg-green-100';
    if (difficulty <= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getOutcomeColor = (rate: number) => {
    if (rate >= 70) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Interview Intelligence
        </CardTitle>
        <CardDescription>
          AI-powered analysis of interview patterns, difficulty, and success strategies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">
              Analyzing interview patterns and company data...
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 border border-red-200 rounded-md bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={generateInterviewAnalysis}
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
              <TabsTrigger value="patterns" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Patterns
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="preparation" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Preparation
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{analysis.totalReviews}</div>
                      <p className="text-sm text-gray-600">Total Reviews</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{analysis.averageRating}/5</div>
                      <p className="text-sm text-gray-600">Avg Rating</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getOutcomeColor(analysis.patterns.processMetrics.successRate)}`}>
                        {analysis.patterns.processMetrics.successRate}%
                      </div>
                      <p className="text-sm text-gray-600">Success Rate</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getOutcomeColor(analysis.patterns.processMetrics.offerRate)}`}>
                        {analysis.patterns.processMetrics.offerRate}%
                      </div>
                      <p className="text-sm text-gray-600">Offer Rate</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Process Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Process Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Average Process Length</p>
                      <p className="text-lg text-blue-600">{analysis.patterns.processMetrics.averageLength}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Response Time</p>
                      <p className="text-lg text-blue-600">{analysis.patterns.processMetrics.responseTime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Difficulty Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Interview Difficulty Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Easy</span>
                        <span>{analysis.patterns.difficultyBreakdown.easy}%</span>
                      </div>
                      <Progress value={analysis.patterns.difficultyBreakdown.easy} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Medium</span>
                        <span>{analysis.patterns.difficultyBreakdown.medium}%</span>
                      </div>
                      <Progress value={analysis.patterns.difficultyBreakdown.medium} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Hard</span>
                        <span>{analysis.patterns.difficultyBreakdown.hard}%</span>
                      </div>
                      <Progress value={analysis.patterns.difficultyBreakdown.hard} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Patterns Tab */}
            <TabsContent value="patterns" className="space-y-6">
              {/* Common Stages */}
              <Card>
                <CardHeader>
                  <CardTitle>Interview Stages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.patterns.commonStages.map((stage, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                            <span className="text-sm font-medium">{index + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-medium">{stage.stage}</h4>
                            <p className="text-sm text-gray-600">{stage.averageDuration}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`${getDifficultyColor(stage.difficulty)} border`}>
                            Difficulty: {stage.difficulty}/5
                          </Badge>
                          <span className="text-sm text-gray-500">{stage.frequency}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Typical Questions */}
              <Card>
                <CardHeader>
                  <CardTitle>Question Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.patterns.typicalQuestions.map((category, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{category.category}</h4>
                          <Badge variant="outline">{category.frequency}% frequency</Badge>
                        </div>
                        <ul className="space-y-2">
                          {category.questions.map((question, qIndex) => (
                            <li key={qIndex} className="flex items-start gap-2 text-sm">
                              <MessageSquare className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                              {question}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="space-y-6">
              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      Strengths
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
                      {analysis.insights.weaknesses.map((weakness, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Red Flags */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Red Flags to Watch
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.insights.redFlags.map((flag, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                        {flag}
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
                    Strategic Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.insights.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Star className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preparation Tab */}
            <TabsContent value="preparation" className="space-y-6">
              {/* Must Know */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Must-Know Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.preparation.mustKnow.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Award className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Success Factors vs Common Mistakes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      Success Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.preparation.successFactors.map((factor, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-5 w-5" />
                      Common Mistakes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.preparation.commonMistakes.map((mistake, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                          {mistake}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Resource Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.preparation.resourceRecommendations.map((resource, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Brain className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0" />
                        {resource}
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
              onClick={generateInterviewAnalysis}
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