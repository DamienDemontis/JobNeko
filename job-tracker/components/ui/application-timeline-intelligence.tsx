"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Clock, Calendar, AlertTriangle, CheckCircle, Target, TrendingUp } from 'lucide-react';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';
import { enhancedUserContextClient } from '@/lib/services/enhanced-user-context-client';

interface TimelineEvent {
  date: Date;
  type: 'deadline' | 'recommendation' | 'milestone' | 'warning';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionRequired: boolean;
  source: 'detected' | 'ai_recommended' | 'user_defined';
}

interface ApplicationWindow {
  optimal: {
    start: Date;
    end: Date;
    reason: string;
  };
  acceptable: {
    start: Date;
    end: Date;
    reason: string;
  };
  risky: {
    conditions: string[];
    recommendations: string[];
  };
}

interface TimingStrategy {
  strategy: 'early_bird' | 'sweet_spot' | 'last_chance' | 'rolling_basis';
  confidence: number;
  reasoning: string;
  marketContext: string;
  competitionLevel: 'low' | 'medium' | 'high' | 'very_high';
}

interface ApplicationTimelineData {
  events: TimelineEvent[];
  applicationWindow: ApplicationWindow;
  timingStrategy: TimingStrategy;
  deadlineAnalysis: {
    explicitDeadline?: Date;
    impliedDeadline?: Date;
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
    timeRemaining: string;
    recommendations: string[];
  };
  marketTiming: {
    hiringSeasonality: string;
    industryTrends: string[];
    competitorActivity: string;
    optimalDays: string[];
  };
}

interface ApplicationTimelineIntelligenceProps {
  jobId: string;
  userId: string;
  jobData: {
    title: string;
    company: string;
    description: string;
    requirements: string;
    applicationDeadline?: Date;
    postedDate?: Date;
  };
}

export function ApplicationTimelineIntelligence({ jobId, userId, jobData }: ApplicationTimelineIntelligenceProps) {
  const [timelineData, setTimelineData] = useState<ApplicationTimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeApplicationTiming = async () => {
    if (!jobData.description || !jobData.requirements) {
      setError('Job description and requirements are required for timeline analysis');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userContext = await enhancedUserContextClient.buildEnhancedContext();

      const analysisPrompt = `
You are an expert application timing strategist. Analyze the job posting and provide intelligent timeline recommendations.

JOB POSTING:
Title: ${jobData.title}
Company: ${jobData.company}
Description: ${jobData.description}
Requirements: ${jobData.requirements}
Posted Date: ${jobData.postedDate ? jobData.postedDate.toISOString() : 'Unknown'}
Application Deadline: ${jobData.applicationDeadline ? jobData.applicationDeadline.toISOString() : 'Not specified'}

USER CONTEXT:
Industry Focus: ${userContext.professionalProfile.industryFocus?.join(', ') || 'Not specified'}
Career Level: ${userContext.marketPositioning.experienceLevel}
Market Demand: ${userContext.marketPositioning.marketDemand}
Location: ${userContext.currentLocation.fullLocation || 'Not specified'}

ANALYSIS REQUIREMENTS:
1. Detect explicit and implied application deadlines
2. Identify optimal application timing windows
3. Analyze market competition and hiring patterns
4. Provide strategic timing recommendations
5. Create a timeline of key events and milestones
6. Assess urgency level and time pressure

Return a JSON object with this exact structure:
{
  "events": [
    {
      "date": "ISO date string",
      "type": "deadline|recommendation|milestone|warning",
      "title": "Event title",
      "description": "Detailed description",
      "priority": "low|medium|high|critical",
      "actionRequired": boolean,
      "source": "detected|ai_recommended|user_defined"
    }
  ],
  "applicationWindow": {
    "optimal": {
      "start": "ISO date string",
      "end": "ISO date string",
      "reason": "Why this is optimal"
    },
    "acceptable": {
      "start": "ISO date string",
      "end": "ISO date string",
      "reason": "Why this is acceptable"
    },
    "risky": {
      "conditions": ["Risk factors"],
      "recommendations": ["How to mitigate risks"]
    }
  },
  "timingStrategy": {
    "strategy": "early_bird|sweet_spot|last_chance|rolling_basis",
    "confidence": 0-100,
    "reasoning": "Why this strategy",
    "marketContext": "Market conditions affecting timing",
    "competitionLevel": "low|medium|high|very_high"
  },
  "deadlineAnalysis": {
    "explicitDeadline": "ISO date string or null",
    "impliedDeadline": "ISO date string or null",
    "urgencyLevel": "low|medium|high|critical",
    "timeRemaining": "Human readable time",
    "recommendations": ["Specific timing advice"]
  },
  "marketTiming": {
    "hiringSeasonality": "Current hiring season context",
    "industryTrends": ["Relevant industry trends"],
    "competitorActivity": "Assessment of competition",
    "optimalDays": ["Best days of week to apply"]
  }
}

IMPORTANT:
- All dates must be valid ISO strings
- Provide realistic timeline analysis based on actual market patterns
- Consider company size, industry, and role seniority
- Account for holidays, weekends, and business cycles
- Be specific and actionable in recommendations
`;

      const analysisData = await aiServiceManagerClient.generateJSON(
        analysisPrompt,
        'job_analysis',
        userId,
        { temperature: 0.3, max_tokens: 3000 }
      );

      // Validate and parse dates
      const processedData: ApplicationTimelineData = {
        ...analysisData,
        events: analysisData.events.map((event: any) => ({
          ...event,
          date: new Date(event.date)
        })),
        applicationWindow: {
          ...analysisData.applicationWindow,
          optimal: {
            ...analysisData.applicationWindow.optimal,
            start: new Date(analysisData.applicationWindow.optimal.start),
            end: new Date(analysisData.applicationWindow.optimal.end)
          },
          acceptable: {
            ...analysisData.applicationWindow.acceptable,
            start: new Date(analysisData.applicationWindow.acceptable.start),
            end: new Date(analysisData.applicationWindow.acceptable.end)
          }
        },
        deadlineAnalysis: {
          ...analysisData.deadlineAnalysis,
          explicitDeadline: analysisData.deadlineAnalysis.explicitDeadline
            ? new Date(analysisData.deadlineAnalysis.explicitDeadline)
            : undefined,
          impliedDeadline: analysisData.deadlineAnalysis.impliedDeadline
            ? new Date(analysisData.deadlineAnalysis.impliedDeadline)
            : undefined
        }
      };

      setTimelineData(processedData);

    } catch (error) {
      console.error('Error analyzing application timeline:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <Target className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Application Timeline Intelligence
        </CardTitle>
        <CardDescription>
          AI-powered timing strategy and deadline analysis for optimal application success
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!timelineData && !isLoading && (
          <Button
            onClick={analyzeApplicationTiming}
            className="w-full"
            disabled={isLoading}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Analyze Application Timeline
          </Button>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">Analyzing optimal timing strategy...</span>
          </div>
        )}

        {error && (
          <div className="p-4 border border-red-200 rounded-md bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={analyzeApplicationTiming}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Retry Analysis
            </Button>
          </div>
        )}

        {timelineData && (
          <div className="space-y-6">
            {/* Urgency Overview */}
            <div className={`p-4 rounded-lg border ${getUrgencyColor(timelineData.deadlineAnalysis.urgencyLevel)}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Application Urgency</h3>
                <Badge variant="outline" className={getUrgencyColor(timelineData.deadlineAnalysis.urgencyLevel)}>
                  {timelineData.deadlineAnalysis.urgencyLevel.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm mb-2">
                <strong>Time Remaining:</strong> {timelineData.deadlineAnalysis.timeRemaining}
              </p>
              {timelineData.deadlineAnalysis.explicitDeadline && (
                <p className="text-sm">
                  <strong>Deadline:</strong> {formatDate(timelineData.deadlineAnalysis.explicitDeadline)}
                </p>
              )}
            </div>

            {/* Timing Strategy */}
            <div className="p-4 border rounded-lg bg-blue-50">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Recommended Strategy: {timelineData.timingStrategy.strategy.replace('_', ' ').toUpperCase()}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="mb-2">{timelineData.timingStrategy.reasoning}</p>
                  <p><strong>Confidence:</strong> {timelineData.timingStrategy.confidence}%</p>
                </div>
                <div>
                  <p className="mb-2">{timelineData.timingStrategy.marketContext}</p>
                  <p><strong>Competition Level:</strong> {timelineData.timingStrategy.competitionLevel}</p>
                </div>
              </div>
            </div>

            {/* Application Windows */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-green-50">
                <h4 className="font-semibold text-green-700 mb-2">Optimal Window</h4>
                <p className="text-sm mb-2">
                  {formatDate(timelineData.applicationWindow.optimal.start)} - {formatDate(timelineData.applicationWindow.optimal.end)}
                </p>
                <p className="text-xs text-green-600">{timelineData.applicationWindow.optimal.reason}</p>
              </div>
              <div className="p-4 border rounded-lg bg-yellow-50">
                <h4 className="font-semibold text-yellow-700 mb-2">Acceptable Window</h4>
                <p className="text-sm mb-2">
                  {formatDate(timelineData.applicationWindow.acceptable.start)} - {formatDate(timelineData.applicationWindow.acceptable.end)}
                </p>
                <p className="text-xs text-yellow-600">{timelineData.applicationWindow.acceptable.reason}</p>
              </div>
            </div>

            {/* Market Timing Insights */}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Market Timing Insights
                  <span className="ml-auto text-xs">
                    {isExpanded ? 'Hide' : 'Show'} Details
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">Hiring Seasonality</h4>
                    <p className="text-sm text-gray-600">{timelineData.marketTiming.hiringSeasonality}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">Competition Assessment</h4>
                    <p className="text-sm text-gray-600">{timelineData.marketTiming.competitorActivity}</p>
                  </div>
                </div>

                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-2">Industry Trends</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {timelineData.marketTiming.industryTrends.map((trend, index) => (
                      <li key={index}>• {trend}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-2">Optimal Application Days</h4>
                  <div className="flex flex-wrap gap-2">
                    {timelineData.marketTiming.optimalDays.map((day, index) => (
                      <Badge key={index} variant="secondary">{day}</Badge>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Timeline Events */}
            <div className="space-y-3">
              <h3 className="font-semibold">Key Timeline Events</h3>
              {timelineData.events
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((event, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getPriorityIcon(event.priority)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                        {event.actionRequired && (
                          <Badge variant="destructive" className="text-xs">
                            Action Required
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{event.description}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(event.date)} at {formatTime(event.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            <div className="p-4 border rounded-lg bg-blue-50">
              <h3 className="font-semibold mb-2">Strategic Recommendations</h3>
              <ul className="text-sm space-y-1">
                {timelineData.deadlineAnalysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            {/* Risk Factors */}
            {timelineData.applicationWindow.risky.conditions.length > 0 && (
              <div className="p-4 border rounded-lg bg-red-50">
                <h3 className="font-semibold mb-2 text-red-700">Risk Factors</h3>
                <div className="space-y-2">
                  <div>
                    <h4 className="font-medium text-sm">Conditions:</h4>
                    <ul className="text-sm text-red-600 space-y-1">
                      {timelineData.applicationWindow.risky.conditions.map((condition, index) => (
                        <li key={index}>• {condition}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Mitigation:</h4>
                    <ul className="text-sm text-red-600 space-y-1">
                      {timelineData.applicationWindow.risky.recommendations.map((rec, index) => (
                        <li key={index}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={analyzeApplicationTiming}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              Re-analyze Timeline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}