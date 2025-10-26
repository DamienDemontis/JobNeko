/**
 * AI Job Analysis Card - Intelligent job posting analysis
 * Provides red flag detection, hidden requirements, and opportunity assessment
 * NO FALLBACKS - Only AI-driven analysis
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Target,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';

export interface JobAnalysisData {
  redFlags: RedFlag[];
  hiddenRequirements: HiddenRequirement[];
  opportunityAssessment: OpportunityAssessment;
  qualityScore: QualityScore;
  marketInsights: MarketInsights;
  negotiationAdvice: NegotiationAdvice;
  lastAnalyzed: Date;
  confidence: number;
}

export interface RedFlag {
  type: 'vague_description' | 'unrealistic_requirements' | 'culture_issues' | 'salary_mismatch' | 'scam_indicators';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  evidence: string[];
  impact: string;
}

export interface HiddenRequirement {
  category: 'technical' | 'cultural' | 'experience' | 'soft_skills';
  requirement: string;
  evidence: string;
  importance: 'nice_to_have' | 'preferred' | 'likely_required';
  userHasThis: boolean;
}

export interface OpportunityAssessment {
  careerGrowth: {
    score: number; // 0-100
    factors: string[];
    timeline: string;
  };
  learningOpportunities: {
    score: number;
    technologies: string[];
    skills: string[];
  };
  networkValue: {
    score: number;
    industryConnections: string[];
    companyPrestige: number;
  };
  workLifeBalance: {
    score: number;
    indicators: string[];
    riskFactors: string[];
  };
}

export interface QualityScore {
  overall: number; // 0-100
  transparency: number;
  completeness: number;
  professionalismScore: number;
  factors: {
    positive: string[];
    negative: string[];
  };
}

export interface MarketInsights {
  demandLevel: 'low' | 'medium' | 'high' | 'very_high';
  competitionLevel: 'low' | 'medium' | 'high';
  marketTrends: string[];
  industryContext: string;
}

export interface NegotiationAdvice {
  leveragePoints: string[];
  weaknesses: string[];
  strategy: string;
  timingAdvice: string;
}

interface JobAnalysisCardProps {
  jobId: string;
  jobTitle: string;
  company: string;
  description?: string;
  requirements?: string;
  salary?: string;
  location?: string;
  userId: string;
  token: string;
}

export function JobAnalysisCard({
  jobId,
  jobTitle,
  company,
  description,
  requirements,
  salary,
  location,
  userId,
  token
}: JobAnalysisCardProps) {
  const [analysis, setAnalysis] = useState<JobAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-load analysis on mount if we have sufficient data
  useEffect(() => {
    if (description && description.length > 50) {
      loadAnalysis();
    }
  }, [jobId, description]);

  const loadAnalysis = async () => {
    if (!description || description.length < 50) {
      setError('Job description too short for meaningful analysis');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if we have cached analysis first
      const cachedAnalysis = await checkCachedAnalysis();
      if (cachedAnalysis) {
        setAnalysis(cachedAnalysis);
        setIsLoading(false);
        return;
      }

      // Generate new analysis
      const analysisPrompt = buildJobAnalysisPrompt();

      const response = await aiServiceManagerClient.generateCompletion(
        analysisPrompt,
        'job_analysis',
        userId,
        {
          temperature: 0.1,
          max_tokens: 2500,
          format: 'json'
        }
      );

      const parsedAnalysis = parseAnalysisResponse(response.content);

      // Save to cache
      await saveAnalysisToCache(parsedAnalysis);

      setAnalysis(parsedAnalysis);
      toast.success('Job analysis completed successfully!');

    } catch (error) {
      console.error('Job analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setError(errorMessage);
      toast.error(`Analysis failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const buildJobAnalysisPrompt = (): string => {
    return `Analyze this job posting for potential issues, hidden requirements, and opportunities:

JOB DETAILS:
Title: ${jobTitle}
Company: ${company}
Location: ${location || 'Not specified'}
Salary: ${salary || 'Not specified'}

DESCRIPTION:
${description}

REQUIREMENTS:
${requirements || 'Not specified'}

ANALYSIS REQUIREMENTS:
Provide a comprehensive analysis covering:

1. RED FLAGS - Identify potential issues:
   - Vague or misleading descriptions
   - Unrealistic requirement combinations
   - Potential culture red flags from language
   - Salary vs responsibility mismatches
   - Scam indicators

2. HIDDEN REQUIREMENTS - Extract implied needs:
   - Technical skills mentioned in context but not listed
   - Cultural fit expectations from language tone
   - Experience levels implied by responsibilities
   - Soft skills needed for success

3. OPPORTUNITY ASSESSMENT - Evaluate potential:
   - Career growth possibilities
   - Learning and skill development opportunities
   - Networking and industry value
   - Work-life balance indicators

4. QUALITY SCORE - Rate posting quality:
   - Transparency and clarity
   - Completeness of information
   - Professional presentation
   - Overall trustworthiness

5. MARKET INSIGHTS - Industry context:
   - Role demand in current market
   - Competition level for this type of position
   - Industry trends affecting this role
   - Market positioning advice

6. NEGOTIATION ADVICE - Strategic guidance:
   - Leverage points for negotiation
   - Potential weaknesses in offer
   - Recommended negotiation strategy
   - Timing considerations

Return as JSON with this EXACT structure:
{
  "redFlags": [
    {
      "type": "vague_description|unrealistic_requirements|culture_issues|salary_mismatch|scam_indicators",
      "severity": "low|medium|high",
      "title": "concise title",
      "description": "detailed explanation",
      "evidence": ["evidence1", "evidence2"],
      "impact": "potential impact on job seeker"
    }
  ],
  "hiddenRequirements": [
    {
      "category": "technical|cultural|experience|soft_skills",
      "requirement": "specific requirement",
      "evidence": "where this was implied",
      "importance": "nice_to_have|preferred|likely_required",
      "userHasThis": false
    }
  ],
  "opportunityAssessment": {
    "careerGrowth": {
      "score": 85,
      "factors": ["factor1", "factor2"],
      "timeline": "expected progression timeline"
    },
    "learningOpportunities": {
      "score": 75,
      "technologies": ["tech1", "tech2"],
      "skills": ["skill1", "skill2"]
    },
    "networkValue": {
      "score": 80,
      "industryConnections": ["connection1"],
      "companyPrestige": 75
    },
    "workLifeBalance": {
      "score": 70,
      "indicators": ["positive indicator"],
      "riskFactors": ["risk factor"]
    }
  },
  "qualityScore": {
    "overall": 75,
    "transparency": 80,
    "completeness": 70,
    "professionalismScore": 85,
    "factors": {
      "positive": ["good factor1"],
      "negative": ["concerning factor1"]
    }
  },
  "marketInsights": {
    "demandLevel": "high",
    "competitionLevel": "medium",
    "marketTrends": ["trend1", "trend2"],
    "industryContext": "context description"
  },
  "negotiationAdvice": {
    "leveragePoints": ["point1", "point2"],
    "weaknesses": ["weakness1"],
    "strategy": "recommended approach",
    "timingAdvice": "when to negotiate"
  },
  "confidence": 0.85
}

IMPORTANT: Provide realistic, evidence-based analysis. No speculation without supporting evidence from the job posting.`;
  };

  const parseAnalysisResponse = (content: string): JobAnalysisData => {
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        ...parsed,
        lastAnalyzed: new Date(),
        confidence: parsed.confidence || 0.7
      };
    } catch (error) {
      console.error('Failed to parse analysis response:', error);
      throw new Error('Invalid analysis response format');
    }
  };

  const checkCachedAnalysis = async (): Promise<JobAnalysisData | null> => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/analysis-cache?type=job_analysis`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.analysis;
      }
    } catch (error) {
      console.error('Error checking cache:', error);
    }
    return null;
  };

  const saveAnalysisToCache = async (analysisData: JobAnalysisData): Promise<void> => {
    try {
      await fetch(`/api/jobs/${jobId}/analysis-cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'job_analysis',
          analysis: analysisData
        })
      });
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const getSeverityColor = (severity: RedFlag['severity']) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!description || description.length < 50) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Job Analysis
            <Badge variant="outline" className="text-purple-600">
              Intelligent
            </Badge>
          </CardTitle>
          <CardDescription>
            AI-powered analysis requires a detailed job description
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Job description too short for meaningful analysis</p>
            <p className="text-sm">Need at least 50 characters for AI analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          AI Job Analysis
          <Badge variant="outline" className="text-purple-600">
            <Sparkles className="w-3 h-3 mr-1" />
            Intelligent
          </Badge>
        </CardTitle>
        <CardDescription>
          AI-powered analysis of job quality, opportunities, and potential issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadAnalysis} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Analysis
            </Button>
          </div>
        ) : !analysis && !isLoading ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 mx-auto mb-4 text-purple-500" />
            <p className="text-gray-600 mb-4">Ready to analyze this job posting</p>
            <Button onClick={loadAnalysis} className="bg-purple-600 hover:bg-purple-700">
              <Sparkles className="w-4 h-4 mr-2" />
              Start AI Analysis
            </Button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-12 h-12 mx-auto mb-4">
              <Brain className="w-12 h-12 text-purple-500" />
            </div>
            <p className="text-gray-600">Analyzing job posting...</p>
            <p className="text-sm text-gray-500">This may take a few moments</p>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {/* Quality Score Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(analysis.qualityScore.overall)}`}>
                  {analysis.qualityScore.overall}
                </div>
                <div className="text-sm text-gray-600">Quality Score</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(analysis.opportunityAssessment.careerGrowth.score)}`}>
                  {analysis.opportunityAssessment.careerGrowth.score}
                </div>
                <div className="text-sm text-gray-600">Growth Potential</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700">
                  {analysis.redFlags.length}
                </div>
                <div className="text-sm text-gray-600">Red Flags</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(analysis.confidence * 100)}%
                </div>
                <div className="text-sm text-gray-600">Confidence</div>
              </div>
            </div>

            {/* Red Flags (Always Visible if Present) */}
            {analysis.redFlags.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Red Flags ({analysis.redFlags.length})
                </h4>
                <div className="space-y-2">
                  {analysis.redFlags.map((flag, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${getSeverityColor(flag.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{flag.title}</div>
                          <div className="text-sm mt-1">{flag.description}</div>
                        </div>
                        <Badge variant="outline" className={getSeverityColor(flag.severity)}>
                          {flag.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expandable Detailed Analysis */}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  View Detailed Analysis
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 mt-4">
                {/* Hidden Requirements */}
                {analysis.hiddenRequirements.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-blue-700 flex items-center gap-2 mb-3">
                      <Eye className="w-4 h-4" />
                      Hidden Requirements ({analysis.hiddenRequirements.length})
                    </h4>
                    <div className="space-y-2">
                      {analysis.hiddenRequirements.map((req, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium text-blue-900">{req.requirement}</div>
                              <div className="text-sm text-blue-700 mt-1">{req.evidence}</div>
                            </div>
                            <Badge variant="outline" className="text-blue-600 border-blue-300">
                              {req.importance.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opportunity Assessment */}
                <div>
                  <h4 className="font-semibold text-green-700 flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4" />
                    Opportunity Assessment
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="font-medium text-green-900">Career Growth</div>
                      <div className={`text-lg font-bold ${getScoreColor(analysis.opportunityAssessment.careerGrowth.score)}`}>
                        {analysis.opportunityAssessment.careerGrowth.score}/100
                      </div>
                      <div className="text-sm text-green-700 mt-1">
                        {analysis.opportunityAssessment.careerGrowth.timeline}
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="font-medium text-green-900">Learning Opportunities</div>
                      <div className={`text-lg font-bold ${getScoreColor(analysis.opportunityAssessment.learningOpportunities.score)}`}>
                        {analysis.opportunityAssessment.learningOpportunities.score}/100
                      </div>
                      <div className="text-sm text-green-700 mt-1">
                        {analysis.opportunityAssessment.learningOpportunities.technologies.slice(0, 3).join(', ')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Market Insights */}
                <div>
                  <h4 className="font-semibold text-indigo-700 flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4" />
                    Market Insights
                  </h4>
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-indigo-600">Role Demand</div>
                        <Badge className="bg-indigo-100 text-indigo-800">
                          {analysis.marketInsights.demandLevel.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-sm text-indigo-600">Competition Level</div>
                        <Badge className="bg-indigo-100 text-indigo-800">
                          {analysis.marketInsights.competitionLevel}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-sm text-indigo-600">Market Trends</div>
                      <div className="text-sm text-indigo-800">
                        {analysis.marketInsights.marketTrends.join(' • ')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Negotiation Advice */}
                <div>
                  <h4 className="font-semibold text-amber-700 flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4" />
                    Negotiation Strategy
                  </h4>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <div className="text-sm text-amber-800 mb-2">
                      <strong>Strategy:</strong> {analysis.negotiationAdvice.strategy}
                    </div>
                    <div className="text-sm text-amber-800">
                      <strong>Timing:</strong> {analysis.negotiationAdvice.timingAdvice}
                    </div>
                    {analysis.negotiationAdvice.leveragePoints.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm text-amber-600">Leverage Points:</div>
                        <div className="text-sm text-amber-800">
                          • {analysis.negotiationAdvice.leveragePoints.join(' • ')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Analysis Meta */}
            <div className="text-xs text-gray-500 pt-2 border-t">
              Analyzed on {new Date(analysis.lastAnalyzed).toLocaleDateString()} •
              Confidence: {Math.round(analysis.confidence * 100)}%
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}