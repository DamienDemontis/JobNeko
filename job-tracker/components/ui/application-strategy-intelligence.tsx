"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Clock,
  Target,
  FileText,
  Mail,
  Users,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Award,
  Zap
} from 'lucide-react';
import { DataSourcesSection, InfoGrid, type DataSource, type InfoItem } from '@/components/shared';
import { toast } from 'sonner';

// TypeScript Interfaces
interface TimingAnalysis {
  urgency: 'low' | 'medium' | 'high' | 'critical';
  daysRemaining: number | null;
  optimalApplicationWindow: string;
  bestDaysToApply: string[];
  reasoning: string;
}

interface ATSOptimization {
  keywordsFromJob: string[];
  missingFromResume: string[];
  matchScore: number;
  recommendations: string[];
}

interface InterviewStage {
  stage: string;
  duration: string;
  focus: string;
}

interface ApplicationProcess {
  expectedTimeline: {
    application: string;
    initialReview: string;
    firstInterview: string;
    totalProcess: string;
  };
  companySpecificInsights: string[];
  interviewProcess: InterviewStage[];
}

interface ResumeOptimization {
  strengthsToHighlight: string[];
  gapsToAddress: string[];
  customizationTips: string[];
}

interface CoverLetterGuidance {
  keyPoints: string[];
  companyResearch: string[];
  suggestedStructure: string[];
}

interface CompetitionAnalysis {
  estimatedCompetition: 'low' | 'medium' | 'high';
  reasoning: string;
  differentiationStrategy: string[];
}

interface ActionItem {
  priority: 'high' | 'medium' | 'low';
  action: string;
  estimatedTime: string;
  rationale: string;
}

interface ApplicationStrategyAnalysis {
  timing: TimingAnalysis;
  atsOptimization: ATSOptimization;
  applicationProcess: ApplicationProcess;
  resumeOptimization: ResumeOptimization;
  coverLetterGuidance: CoverLetterGuidance;
  competitionAnalysis: CompetitionAnalysis;
  actionItems: ActionItem[];
  sources: {
    webSources: DataSource[];
  };
}

interface ApplicationStrategyIntelligenceProps {
  jobId: string;
  jobTitle: string;
  company: string;
  token: string;
}

export default function ApplicationStrategyIntelligence({
  jobId,
  jobTitle,
  company,
  token
}: ApplicationStrategyIntelligenceProps) {
  const [analysis, setAnalysis] = useState<ApplicationStrategyAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [cached, setCached] = useState(false);
  const [cacheAge, setCacheAge] = useState<string>('');

  const lastJobIdRef = useRef<string | null>(null);
  const hasAutoLoadedRef = useRef(false);

  // Auto-load cached analysis on mount (only once per jobId) - NO AUTO GENERATION
  useEffect(() => {
    if (!hasAutoLoadedRef.current) {
      hasAutoLoadedRef.current = true;
      lastJobIdRef.current = jobId;
      checkForCachedAnalysis();
    } else if (lastJobIdRef.current !== jobId) {
      lastJobIdRef.current = jobId;
      checkForCachedAnalysis();
    }
  }, [jobId]);

  const checkForCachedAnalysis = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/application-strategy-analysis?checkCache=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('Cache check failed:', response.status);
        return;
      }

      const data = await response.json();
      if (data.cached && data.analysis) {
        setAnalysis(data.analysis);
        setCached(true);
        setCacheAge(data.cacheAge || '');
        console.log('✅ Loaded cached application strategy analysis');
      }
    } catch (error) {
      console.error('Failed to check cache:', error);
    }
  };

  const runAnalysis = async (forceRefresh: boolean = false) => {
    setLoading(true);
    setCached(false);

    try {
      const url = forceRefresh
        ? `/api/jobs/${jobId}/application-strategy-analysis?forceRefresh=true`
        : `/api/jobs/${jobId}/application-strategy-analysis`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Analysis failed');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setCached(data.cached || false);
      setCacheAge(data.cacheAge || '');

      toast.success(`✅ Analysis complete with ${data.analysis.sources.webSources.length} real sources`);
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCompetitionColor = (competition: string) => {
    switch (competition) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <Zap className="w-4 h-4 text-red-600" />;
      case 'medium': return <Target className="w-4 h-4 text-yellow-600" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Application Strategy Intelligence</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  AI-powered application strategy, ATS optimization, and timeline analysis
                </p>
              </div>
            </div>
            <Button
              onClick={() => runAnalysis(true)}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {cached && cacheAge && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border">
              <Clock className="w-4 h-4" />
              <span>Cached analysis ({cacheAge} old)</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Empty State */}
      {!analysis && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No application strategy analysis yet</p>
            <Button onClick={() => runAnalysis(false)} disabled={loading}>
              <Target className="w-4 h-4 mr-2" />
              Generate Application Strategy
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && !analysis && (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600 mb-2">Analyzing application strategy...</p>
            <p className="text-sm text-gray-500">Searching real data sources and optimizing your approach</p>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && (
        <>
          {/* Timing & Urgency Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={`border-2 ${getUrgencyColor(analysis.timing.urgency)}`}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Urgency Level</span>
                </div>
                <p className="text-2xl font-bold capitalize mb-1">{analysis.timing.urgency}</p>
                {analysis.timing.daysRemaining !== null && (
                  <p className="text-sm">{analysis.timing.daysRemaining} days remaining</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Optimal Window</span>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-1">
                  {analysis.timing.optimalApplicationWindow}
                </p>
                <p className="text-sm text-gray-600">
                  Best days: {analysis.timing.bestDaysToApply.join(', ')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Users className={`w-5 h-5 ${getCompetitionColor(analysis.competitionAnalysis.estimatedCompetition)}`} />
                  <span className="font-medium">Competition</span>
                </div>
                <p className={`text-2xl font-bold capitalize ${getCompetitionColor(analysis.competitionAnalysis.estimatedCompetition)}`}>
                  {analysis.competitionAnalysis.estimatedCompetition}
                </p>
                <p className="text-sm text-gray-600">Based on market analysis</p>
              </CardContent>
            </Card>
          </div>

          {/* Timing Reasoning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-gray-600" />
                Why This Timing?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{analysis.timing.reasoning}</p>
            </CardContent>
          </Card>

          {/* ATS Optimization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-gray-600" />
                ATS Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Match Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Resume Match Score</span>
                  <span className="text-sm font-medium">{analysis.atsOptimization.matchScore}/100</span>
                </div>
                <Progress value={analysis.atsOptimization.matchScore} className="h-2" />
              </div>

              {/* Keywords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Key Job Keywords</div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.atsOptimization.keywordsFromJob.map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
                {analysis.atsOptimization.missingFromResume.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-red-700 mb-2">Missing From Resume</div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.atsOptimization.missingFromResume.map((keyword, index) => (
                        <Badge key={index} variant="outline" className="text-xs border-red-300 text-red-700">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">ATS Recommendations</div>
                <div className="space-y-2">
                  {analysis.atsOptimization.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application Process Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                Expected Application Process
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timeline */}
              <InfoGrid
                items={[
                  { label: 'Application', value: analysis.applicationProcess.expectedTimeline.application },
                  { label: 'Initial Review', value: analysis.applicationProcess.expectedTimeline.initialReview },
                  { label: 'First Interview', value: analysis.applicationProcess.expectedTimeline.firstInterview },
                  { label: 'Total Process', value: analysis.applicationProcess.expectedTimeline.totalProcess }
                ]}
                columns={4}
              />

              {/* Company Insights */}
              {analysis.applicationProcess.companySpecificInsights.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3">Company-Specific Insights</div>
                  <div className="space-y-2">
                    {analysis.applicationProcess.companySpecificInsights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm text-gray-700 p-3 bg-gray-50 rounded-lg border">
                        <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interview Stages */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-3">Interview Process</div>
                <div className="space-y-3">
                  {analysis.applicationProcess.interviewProcess.map((stage, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{stage.stage}</span>
                        <Badge variant="outline">{stage.duration}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{stage.focus}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resume Optimization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="w-5 h-5 text-gray-600" />
                Resume Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Strengths */}
              <div>
                <div className="text-sm font-medium text-green-700 mb-2">Strengths to Highlight</div>
                <div className="space-y-2">
                  {analysis.resumeOptimization.strengthsToHighlight.map((strength, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{strength}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gaps */}
              {analysis.resumeOptimization.gapsToAddress.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-orange-700 mb-2">Gaps to Address</div>
                  <div className="space-y-2">
                    {analysis.resumeOptimization.gapsToAddress.map((gap, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span>{gap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customization Tips */}
              <div>
                <div className="text-sm font-medium text-blue-700 mb-2">Customization Tips</div>
                <div className="space-y-2">
                  {analysis.resumeOptimization.customizationTips.map((tip, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-gray-700 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cover Letter Guidance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="w-5 h-5 text-gray-600" />
                Cover Letter Guidance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Points */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Key Points to Emphasize</div>
                <div className="space-y-2">
                  {analysis.coverLetterGuidance.keyPoints.map((point, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Company Research */}
              {analysis.coverLetterGuidance.companyResearch.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Company Research Insights</div>
                  <div className="space-y-2">
                    {analysis.coverLetterGuidance.companyResearch.map((fact, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm text-gray-700 p-3 bg-gray-50 rounded-lg border">
                        <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>{fact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Structure */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Suggested Structure</div>
                <div className="space-y-2">
                  {analysis.coverLetterGuidance.suggestedStructure.map((section, index) => (
                    <div key={index} className="p-3 border rounded-lg text-sm text-gray-700">
                      {section}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Competition & Differentiation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-gray-600" />
                Competition Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="text-sm text-gray-700">{analysis.competitionAnalysis.reasoning}</p>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Differentiation Strategies</div>
                <div className="space-y-2">
                  {analysis.competitionAnalysis.differentiationStrategy.map((strategy, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{strategy}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="w-5 h-5 text-gray-600" />
                Prioritized Action Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.actionItems
                  .sort((a, b) => {
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                  })
                  .map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        {getPriorityIcon(item.priority)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{item.action}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.estimatedTime}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{item.rationale}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Sources */}
          {analysis.sources?.webSources && analysis.sources.webSources.length > 0 && (
            <DataSourcesSection sources={analysis.sources.webSources} defaultExpanded={false} />
          )}
        </>
      )}
    </div>
  );
}
