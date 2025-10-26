"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Target,
  FileText,
  Mail,
  CheckSquare,
  Clock,
  AlertTriangle,
  Users,
  RefreshCw,
  Sparkles,
  Award,
  Zap,
  TrendingUp,
  MessageSquare,
  Calendar,
  Star
} from 'lucide-react';
import { DataSourcesSection, InfoGrid } from '@/components/shared';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Strategy data from ApplicationStrategyIntelligence API
interface StrategyAnalysis {
  timing: {
    urgency: 'low' | 'medium' | 'high' | 'critical';
    daysRemaining: number | null;
    optimalApplicationWindow: string;
    bestDaysToApply: string[];
    reasoning: string;
  };
  atsOptimization: {
    keywordsFromJob: string[];
    missingFromResume: string[];
    matchScore: number;
    recommendations: string[];
  };
  resumeOptimization: {
    strengthsToHighlight: string[];
    gapsToAddress: string[];
    customizationTips: string[];
  };
  coverLetterGuidance: {
    keyPoints: string[];
    companyResearch: string[];
    suggestedStructure: string[];
  };
  applicationProcess: {
    expectedTimeline: {
      application: string;
      initialReview: string;
      firstInterview: string;
      totalProcess: string;
    };
    companySpecificInsights: string[];
    interviewProcess: Array<{
      stage: string;
      duration: string;
      focus: string;
    }>;
  };
  competitionAnalysis: {
    estimatedCompetition: 'low' | 'medium' | 'high';
    reasoning: string;
    differentiationStrategy: string[];
  };
  actionItems: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    estimatedTime: string;
    rationale: string;
  }>;
  sources: {
    webSources: Array<{
      title: string;
      url: string;
      type: string;
      relevance: number;
    }>;
  };
  // Enhanced skills match data from centralized service
  enhancedSkillsMatch?: {
    matchingSkills: string[];
    partialMatches: string[];
    missingSkills: string[];
    overallScore: number;
    confidence: number;
  };
  usedResume?: {
    id: string;
    displayName: string;
    isPrimary: boolean;
  };
}

interface Resume {
  id: string;
  displayName: string;
  fileName: string;
  isPrimary: boolean;
  fileSizeBytes: number;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UnifiedApplicationStrategyProps {
  jobId: string;
  jobTitle: string;
  company: string;
  token: string;
}

export default function UnifiedApplicationStrategy({
  jobId,
  jobTitle,
  company,
  token
}: UnifiedApplicationStrategyProps) {
  const [analysis, setAnalysis] = useState<StrategyAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingCache, setCheckingCache] = useState(true);
  const [cached, setCached] = useState(false);
  const [cacheAge, setCacheAge] = useState<string>('');
  const [activeTab, setActiveTab] = useState('resume');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [loadingResumes, setLoadingResumes] = useState(true);

  const lastJobIdRef = useRef<string | null>(null);
  const hasAutoLoadedRef = useRef(false);

  // Fetch user's resumes on mount
  useEffect(() => {
    fetchResumes();
  }, []);

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

  const fetchResumes = async () => {
    setLoadingResumes(true);
    try {
      const response = await fetch('/api/resumes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch resumes:', response.status);
        setLoadingResumes(false);
        return;
      }

      const data = await response.json();
      setResumes(data.resumes || []);

      // Auto-select primary resume
      const primaryResume = data.resumes?.find((r: Resume) => r.isPrimary);
      if (primaryResume) {
        setSelectedResumeId(primaryResume.id);
      } else if (data.resumes?.length > 0) {
        setSelectedResumeId(data.resumes[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
    } finally {
      setLoadingResumes(false);
    }
  };

  const checkForCachedAnalysis = async () => {
    setCheckingCache(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/application-strategy-analysis?checkCache=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('Cache check failed:', response.status);
        setCheckingCache(false);
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
    } finally {
      setCheckingCache(false);
    }
  };

  const runAnalysis = async (forceRefresh: boolean = false) => {
    setLoading(true);
    setCached(false);

    try {
      // Build URL with resumeId parameter if selected
      let url = `/api/jobs/${jobId}/application-strategy-analysis`;
      const params = new URLSearchParams();

      if (forceRefresh) {
        params.append('forceRefresh', 'true');
      }

      if (selectedResumeId) {
        params.append('resumeId', selectedResumeId);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <Zap className="w-4 h-4 text-red-600" />;
      case 'medium': return <Target className="w-4 h-4 text-yellow-600" />;
      case 'low': return <CheckSquare className="w-4 h-4 text-green-600" />;
      default: return <CheckSquare className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Application Strategy</CardTitle>
              <CardDescription className="mt-1">
                Complete application guidance: timing, resume, materials, and action plan
              </CardDescription>
            </div>
          </div>
          {analysis && !loading && (
            <Button
              onClick={() => runAnalysis(true)}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
        {cached && cacheAge && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border">
            <Clock className="w-4 h-4" />
            <span>Cached analysis ({cacheAge} old)</span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Cache Checking State */}
        {checkingCache && (
          <div className="space-y-4 py-8">
            <div className="text-center text-sm text-gray-600 mb-6">
              Checking for cached analysis...
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {/* Empty State */}
        {!analysis && !loading && !checkingCache && (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-6">No application strategy yet</p>

            {/* Resume Selector */}
            {!loadingResumes && resumes.length > 0 && (
              <div className="max-w-md mx-auto mb-6">
                <div className="text-left mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Select Resume
                  </label>
                </div>
                <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                  <SelectTrigger className="w-full text-left border-gray-300">
                    <SelectValue placeholder="Choose a resume..." />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id}>
                        <div className="flex items-center gap-2">
                          <span>{resume.displayName}</span>
                          {resume.isPrimary && (
                            <Badge variant="outline" className="text-xs border-black text-black">
                              <Star className="w-3 h-3 fill-black mr-1" />
                              Primary
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1 text-left">
                  Strategy will be generated using the selected resume
                </p>
              </div>
            )}

            {loadingResumes && (
              <div className="text-sm text-gray-500 mb-6">Loading resumes...</div>
            )}

            {!loadingResumes && resumes.length === 0 && (
              <div className="max-w-md mx-auto mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Please upload a resume in your Profile page to generate an application strategy.
                </p>
              </div>
            )}

            <Button
              onClick={() => runAnalysis(false)}
              disabled={loading || loadingResumes || resumes.length === 0 || !selectedResumeId}
            >
              <Target className="w-4 h-4 mr-2" />
              Generate Strategy
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && !analysis && (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600 mb-2">Analyzing application strategy...</p>
            <p className="text-sm text-gray-500">Searching real data and optimizing approach</p>
          </div>
        )}

        {/* Analysis Results with Tabs */}
        {analysis && (
          <>
            {/* Show which resume was used */}
            {analysis.usedResume && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700">
                  Generated with:{' '}
                  <span className="font-medium text-black">{analysis.usedResume.displayName}</span>
                </span>
                {analysis.usedResume.isPrimary && (
                  <Badge variant="outline" className="text-xs border-black text-black ml-1">
                    <Star className="w-3 h-3 fill-black mr-1" />
                    Primary
                  </Badge>
                )}
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="resume">
                  <FileText className="w-4 h-4 mr-2" />
                  Resume & ATS
                </TabsTrigger>
                <TabsTrigger value="materials">
                  <Mail className="w-4 h-4 mr-2" />
                  Materials
                </TabsTrigger>
                <TabsTrigger value="action">
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Action Plan
                </TabsTrigger>
              </TabsList>

            {/* TAB 2: Resume & ATS - Combined optimization */}
            <TabsContent value="resume" className="space-y-6 mt-6">
              {/* ATS Match Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    ATS Compatibility
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Resume Match Score</span>
                      <span className="text-sm font-medium">{Math.round(analysis.atsOptimization.matchScore)}/100</span>
                    </div>
                    <Progress value={Math.round(analysis.atsOptimization.matchScore)} className="h-2" />
                  </div>

                  {/* Enhanced Skills Match (from centralized service) */}
                  {analysis.enhancedSkillsMatch && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                      <div className="text-sm font-semibold text-gray-800 mb-2">Skills Match Analysis</div>

                      {/* Matching Skills */}
                      {analysis.enhancedSkillsMatch.matchingSkills.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-green-700 mb-1">✓ Matching Skills</div>
                          <div className="flex flex-wrap gap-1">
                            {analysis.enhancedSkillsMatch.matchingSkills.map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Partial Matches */}
                      {analysis.enhancedSkillsMatch.partialMatches.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-orange-700 mb-1">⚡ Partial Matches</div>
                          <div className="space-y-1">
                            {analysis.enhancedSkillsMatch.partialMatches.map((match, index) => (
                              <div key={index} className="text-xs text-orange-700 bg-orange-50 p-1 rounded">
                                {match}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing Skills */}
                      {analysis.enhancedSkillsMatch.missingSkills.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-red-700 mb-1">◯ Missing Skills</div>
                          <div className="flex flex-wrap gap-1">
                            {analysis.enhancedSkillsMatch.missingSkills.map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-xs text-red-700 border-red-200">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                        <div className="text-sm font-medium text-red-700 mb-2">Missing from Resume</div>
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

                  {/* ATS Recommendations */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">ATS Recommendations</div>
                    <div className="space-y-2">
                      {analysis.atsOptimization.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckSquare className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resume Optimization */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
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
                          <CheckSquare className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
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
                    <div className="text-sm font-medium text-blue-700 mb-2">Job-Specific Customization</div>
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
            </TabsContent>

            {/* TAB 3: Materials - Cover Letter & Communication */}
            <TabsContent value="materials" className="space-y-6 mt-6">
              {/* Cover Letter */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
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
                          <CheckSquare className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Company Research */}
                  {analysis.coverLetterGuidance.companyResearch.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Company Research to Include</div>
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

                  {/* Structure */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Suggested Structure</div>
                    <div className="space-y-2">
                      {analysis.coverLetterGuidance.suggestedStructure.map((section, index) => (
                        <div key={index} className="p-3 border rounded-lg text-sm text-gray-700">
                          <span className="font-medium text-blue-600 mr-2">§{index + 1}</span>
                          {section}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Interview Process */}
              {analysis.applicationProcess.interviewProcess.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                      Expected Interview Process
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}

              {/* Company Insights */}
              {analysis.applicationProcess.companySpecificInsights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-gray-600" />
                      Company-Specific Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysis.applicationProcess.companySpecificInsights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm text-gray-700 p-3 bg-gray-50 rounded-lg border">
                          <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB 4: Action Plan - Prioritized tasks */}
            <TabsContent value="action" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-gray-600" />
                    Prioritized Action Items
                  </CardTitle>
                  <CardDescription>Complete these tasks in order for best results</CardDescription>
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
            </TabsContent>
          </Tabs>
          </>
        )}

        {/* Data Sources */}
        {analysis?.sources?.webSources && analysis.sources.webSources.length > 0 && (
          <div className="mt-6">
            <DataSourcesSection sources={analysis.sources.webSources} defaultExpanded={false} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
