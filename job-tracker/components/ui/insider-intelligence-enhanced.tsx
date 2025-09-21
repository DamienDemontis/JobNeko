/**
 * Enhanced Insider Intelligence with Unified Caching
 * Provides instant loading of insider information with smart cache management
 */

"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUnifiedCache } from '@/hooks/use-unified-cache';
import {
  Eye,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  RefreshCw,
  Shield,
  Target,
  MessageSquare,
  Building,
  CheckCircle,
  Info
} from 'lucide-react';

interface InsiderIntelligenceData {
  companyInsights: {
    hiringTrends: {
      recentHires: number;
      averageTimeToHire: string;
      preferredCandidateProfile: string;
      hiringVelocity: 'slow' | 'moderate' | 'fast';
    };
    teamDynamics: {
      teamSize: string;
      managementStyle: string;
      workCulture: string;
      remotePolicy: string;
    };
    recentChanges: Array<{
      type: 'leadership' | 'restructure' | 'expansion' | 'acquisition';
      description: string;
      impact: 'positive' | 'neutral' | 'negative';
      date: string;
    }>;
  };
  employeeInsights: {
    currentEmployees: Array<{
      name: string;
      title: string;
      tenure: string;
      background: string;
      linkedinUrl?: string;
    }>;
    formerEmployees: Array<{
      name: string;
      title: string;
      tenure: string;
      nextRole: string;
      reason?: string;
    }>;
    careerProgression: {
      promotionRate: string;
      averageTenure: string;
      skillDevelopment: string[];
    };
  };
  interviewIntelligence: {
    processOverview: {
      stages: string[];
      averageDuration: string;
      difficultyLevel: 'easy' | 'moderate' | 'challenging' | 'very challenging';
    };
    commonQuestions: Array<{
      category: string;
      questions: string[];
      frequency: 'common' | 'occasional' | 'rare';
    }>;
    interviewTips: Array<{
      tip: string;
      category: 'technical' | 'behavioral' | 'cultural' | 'preparation';
      source: string;
    }>;
  };
  salaryIntelligence: {
    roleCompensation: {
      baseSalaryRange: string;
      totalCompensation: string;
      equityDetails?: string;
      bonusStructure?: string;
    };
    negotiationInsights: {
      negotiable: string[];
      nonNegotiable: string[];
      bestPractices: string[];
    };
  };
  strategicAdvice: {
    applicationTiming: {
      bestTime: string;
      reasoning: string;
      urgency: 'low' | 'medium' | 'high';
    };
    differentiationStrategy: {
      keyDifferentiators: string[];
      competitiveAdvantages: string[];
      riskFactors: string[];
    };
    successProbability: {
      score: number;
      factors: string[];
      improvements: string[];
    };
  };
}

interface InsiderIntelligenceEnhancedProps {
  companyName: string;
  jobTitle: string;
  userId: string;
  token: string;
  jobId: string;
}

export function InsiderIntelligenceEnhanced({
  companyName,
  jobTitle,
  userId,
  token,
  jobId
}: InsiderIntelligenceEnhancedProps) {
  // Generate function for insider intelligence
  const generateInsiderIntelligence = async (): Promise<InsiderIntelligenceData> => {
    const response = await fetch(`/api/ai-analysis/insider_intelligence/${jobId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        companyName,
        jobTitle
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate insider intelligence');
    }

    const result = await response.json();
    return result.analysis;
  };

  // Use unified cache hook
  const {
    data,
    isLoading,
    isCached,
    isExpired,
    error,
    lastUpdated,
    shouldShowGenerateButton,
    generate,
    refresh
  } = useUnifiedCache<InsiderIntelligenceData>({
    type: 'insider_intelligence',
    jobId,
    userId,
    token,
    autoLoad: true,
    generateFunction: generateInsiderIntelligence,
    additionalParams: {
      companyName,
      jobTitle
    }
  });

  // Render loading state
  if (isLoading && !data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Insider Intelligence
            <Badge variant="outline" className="ml-auto">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Gathering Intel
            </Badge>
          </CardTitle>
          <CardDescription>
            Gathering insider information about {companyName}...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={45} className="w-full" />
            <div className="text-sm text-muted-foreground">
              Analyzing company culture, hiring patterns, and insider tips...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error && !data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Insider Intelligence
            <Badge variant="destructive" className="ml-auto">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Error
            </Badge>
          </CardTitle>
          <CardDescription>Unable to gather insider intelligence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => generate(true)} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render empty state (no cache, not loading)
  if (!data && shouldShowGenerateButton) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Insider Intelligence
          </CardTitle>
          <CardDescription>
            Get exclusive insider information about {companyName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Access insider knowledge about company culture, hiring patterns, interview processes,
              and strategic advice from current and former employees.
            </p>
            <Button onClick={() => generate()} className="w-full">
              <Shield className="h-4 w-4 mr-2" />
              Gather Insider Intelligence
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render data
  if (!data) return null;

  const urgencyColor = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600'
  };

  const difficultyColor = {
    easy: 'text-green-600',
    moderate: 'text-blue-600',
    challenging: 'text-yellow-600',
    'very challenging': 'text-red-600'
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Insider Intelligence
          <div className="ml-auto flex items-center gap-2">
            {isCached && !isExpired && (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Cached
              </Badge>
            )}
            {isExpired && (
              <Badge variant="outline">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Outdated
              </Badge>
            )}
            <Button
              onClick={() => refresh()}
              variant="ghost"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Insider intelligence for {companyName} - {jobTitle}
          {lastUpdated && (
            <span className="text-xs ml-2">
              Last updated: {new Date(lastUpdated).toLocaleDateString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Success Probability */}
        <div className="p-4 bg-primary/5 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Success Probability</h3>
            <div className="text-2xl font-bold text-primary">
              {data.strategicAdvice.successProbability.score}%
            </div>
          </div>
          <Progress value={data.strategicAdvice.successProbability.score} className="h-2 mb-3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-green-600 mb-1">Success Factors</h4>
              <ul className="space-y-1">
                {data.strategicAdvice.successProbability.factors.map((factor, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-600 mb-1">Improvement Areas</h4>
              <ul className="space-y-1">
                {data.strategicAdvice.successProbability.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Target className="h-3 w-3 text-blue-500 mt-1 flex-shrink-0" />
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Company Insights */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Building className="h-4 w-4" />
            Company Insights
          </h3>

          {/* Hiring Trends */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Hiring Trends</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Recent Hires:</span>
                <span className="ml-2 font-medium">{data.companyInsights.hiringTrends.recentHires}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Time to Hire:</span>
                <span className="ml-2 font-medium">{data.companyInsights.hiringTrends.averageTimeToHire}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Preferred Profile:</span>
                <p className="mt-1">{data.companyInsights.hiringTrends.preferredCandidateProfile}</p>
              </div>
            </div>
          </div>

          {/* Recent Changes */}
          {data.companyInsights.recentChanges.length > 0 && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Recent Company Changes</h4>
              <div className="space-y-3">
                {data.companyInsights.recentChanges.map((change, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Badge
                      variant={
                        change.impact === 'positive' ? 'default' :
                        change.impact === 'negative' ? 'destructive' : 'secondary'
                      }
                      className="mt-0.5"
                    >
                      {change.type}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm">{change.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{change.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Interview Intelligence */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Interview Intelligence
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Process Overview</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Stages:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {data.interviewIntelligence.processOverview.stages.map((stage, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {stage}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="ml-2 font-medium">{data.interviewIntelligence.processOverview.averageDuration}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Difficulty:</span>
                  <span className={`ml-2 font-medium ${difficultyColor[data.interviewIntelligence.processOverview.difficultyLevel]}`}>
                    {data.interviewIntelligence.processOverview.difficultyLevel}
                  </span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Application Timing</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Best Time:</span>
                  <span className="ml-2 font-medium">{data.strategicAdvice.applicationTiming.bestTime}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Urgency:</span>
                  <span className={`ml-2 font-medium ${urgencyColor[data.strategicAdvice.applicationTiming.urgency]}`}>
                    {data.strategicAdvice.applicationTiming.urgency}
                  </span>
                </div>
                <p className="mt-2">{data.strategicAdvice.applicationTiming.reasoning}</p>
              </div>
            </div>
          </div>

          {/* Common Questions */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Common Interview Questions</h4>
            <div className="space-y-3">
              {data.interviewIntelligence.commonQuestions.map((category, index) => (
                <div key={index}>
                  <div className="flex items-center gap-2 mb-2">
                    <h5 className="text-sm font-medium">{category.category}</h5>
                    <Badge variant="outline" className="text-xs">
                      {category.frequency}
                    </Badge>
                  </div>
                  <ul className="space-y-1 ml-4">
                    {category.questions.map((question, qIndex) => (
                      <li key={qIndex} className="text-sm text-muted-foreground">
                        • {question}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Interview Tips */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Insider Interview Tips</h4>
            <div className="space-y-3">
              {data.interviewIntelligence.interviewTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 text-xs">
                    {tip.category}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm">{tip.tip}</p>
                    <p className="text-xs text-muted-foreground mt-1">Source: {tip.source}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Salary Intelligence */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Compensation Intelligence
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Expected Compensation</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Base Salary:</span>
                  <span className="ml-2 font-medium">{data.salaryIntelligence.roleCompensation.baseSalaryRange}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Comp:</span>
                  <span className="ml-2 font-medium">{data.salaryIntelligence.roleCompensation.totalCompensation}</span>
                </div>
                {data.salaryIntelligence.roleCompensation.equityDetails && (
                  <div>
                    <span className="text-muted-foreground">Equity:</span>
                    <span className="ml-2 font-medium">{data.salaryIntelligence.roleCompensation.equityDetails}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Negotiation Intel</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <h5 className="font-medium text-green-600">Negotiable</h5>
                  <ul className="ml-4 mt-1">
                    {data.salaryIntelligence.negotiationInsights.negotiable.map((item, index) => (
                      <li key={index} className="text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-red-600">Non-Negotiable</h5>
                  <ul className="ml-4 mt-1">
                    {data.salaryIntelligence.negotiationInsights.nonNegotiable.map((item, index) => (
                      <li key={index} className="text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strategic Advice */}
        <div className="p-4 bg-secondary/50 rounded-lg">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Strategic Differentiation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-green-600 mb-2">Key Differentiators</h4>
              <ul className="space-y-1">
                {data.strategicAdvice.differentiationStrategy.keyDifferentiators.map((diff, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                    <span>{diff}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-600 mb-2">Competitive Advantages</h4>
              <ul className="space-y-1">
                {data.strategicAdvice.differentiationStrategy.competitiveAdvantages.map((advantage, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Target className="h-3 w-3 text-blue-500 mt-1 flex-shrink-0" />
                    <span>{advantage}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-yellow-600 mb-2">Risk Factors</h4>
              <ul className="space-y-1">
                {data.strategicAdvice.differentiationStrategy.riskFactors.map((risk, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-yellow-500 mt-1 flex-shrink-0" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}