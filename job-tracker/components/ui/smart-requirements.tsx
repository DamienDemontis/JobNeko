/**
 * Smart Requirements Categorization - Intelligent requirement analysis
 * Categorizes requirements by importance and identifies inflated/unrealistic expectations
 * NO FALLBACKS - Only AI-driven categorization
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Target,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Info,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';

export interface SmartRequirementsData {
  mustHave: CategorizedRequirement[];
  niceToHave: CategorizedRequirement[];
  redFlags: CategorizedRequirement[];
  marketAnalysis: RequirementMarketAnalysis;
  userFitAnalysis: UserFitAnalysis;
  lastAnalyzed: Date;
  confidence: number;
}

export interface CategorizedRequirement {
  requirement: string;
  category: 'technical' | 'experience' | 'education' | 'certification' | 'soft_skills' | 'legal';
  reasoning: string;
  marketStandard: 'standard' | 'above_average' | 'unrealistic' | 'rare';
  userHasThis: boolean;
  alternativeOptions?: string[];
  importanceScore: number; // 0-100
}

export interface RequirementMarketAnalysis {
  overallRealism: 'realistic' | 'somewhat_inflated' | 'heavily_inflated' | 'unrealistic';
  inflationFactors: string[];
  marketBenchmark: string;
  industryStandards: IndustryStandard[];
  competitionLevel: 'low' | 'medium' | 'high';
}

export interface IndustryStandard {
  requirement: string;
  typicalRequirement: string;
  thisJobRequirement: string;
  analysis: string;
}

export interface UserFitAnalysis {
  overallFit: number; // 0-100
  mustHaveMatch: number;
  niceToHaveMatch: number;
  gapAnalysis: RequirementGap[];
  strengthAreas: string[];
  developmentSuggestions: DevelopmentSuggestion[];
}

export interface RequirementGap {
  requirement: string;
  gapSeverity: 'minor' | 'moderate' | 'major';
  howToAcquire: string;
  timeToAcquire: string;
  workarounds: string[];
}

export interface DevelopmentSuggestion {
  skill: string;
  priority: 'high' | 'medium' | 'low';
  timeframe: string;
  resources: string[];
  careerImpact: string;
}

interface SmartRequirementsProps {
  jobId: string;
  jobTitle: string;
  company: string;
  requirements?: string;
  description?: string;
  userId: string;
  token: string;
}

export function SmartRequirements({
  jobId,
  jobTitle,
  company,
  requirements,
  description,
  userId,
  token
}: SmartRequirementsProps) {
  const [analysis, setAnalysis] = useState<SmartRequirementsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-load analysis on mount if we have requirements
  useEffect(() => {
    if (requirements && requirements.length > 20) {
      loadAnalysis();
    }
  }, [jobId, requirements]);

  const loadAnalysis = async () => {
    if (!requirements || requirements.length < 20) {
      setError('Requirements too short for meaningful analysis');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cachedAnalysis = await checkCachedAnalysis();
      if (cachedAnalysis) {
        setAnalysis(cachedAnalysis);
        setIsLoading(false);
        return;
      }

      // Generate new analysis
      const analysisPrompt = buildRequirementsAnalysisPrompt();

      const response = await aiServiceManagerClient.generateCompletion(
        analysisPrompt,
        'requirement_analysis',
        userId,
        {
          temperature: 0.1,
          max_tokens: 2000,
          format: 'json'
        }
      );

      const parsedAnalysis = parseAnalysisResponse(response.content);

      // Save to cache
      await saveAnalysisToCache(parsedAnalysis);

      setAnalysis(parsedAnalysis);
      toast.success('Requirements analysis completed!');

    } catch (error) {
      console.error('Requirements analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setError(errorMessage);
      toast.error(`Analysis failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const buildRequirementsAnalysisPrompt = (): string => {
    return `Analyze and categorize the job requirements for intelligent assessment:

JOB DETAILS:
Title: ${jobTitle}
Company: ${company}

REQUIREMENTS:
${requirements}

ADDITIONAL CONTEXT:
${description || 'No additional context provided'}

ANALYSIS TASKS:

1. CATEGORIZE REQUIREMENTS into three groups:
   - MUST-HAVE (Deal breakers, legal requirements, critical skills)
   - NICE-TO-HAVE (Preferred but not essential, commonly inflated)
   - RED FLAGS (Unrealistic combinations, market outliers, potential issues)

2. MARKET ANALYSIS:
   - Assess overall realism of requirements for this role level
   - Identify inflated or unrealistic expectations
   - Compare against industry standards
   - Evaluate competition level this creates

3. USER FIT ANALYSIS:
   - Calculate fit percentages for each category
   - Identify skill gaps and development paths
   - Suggest alternative ways to demonstrate qualifications
   - Recommend focus areas for application

For each requirement, provide:
- Category classification with reasoning
- Market standard assessment
- Importance score (0-100)
- Alternative options if applicable

Return as JSON with this EXACT structure:
{
  "mustHave": [
    {
      "requirement": "specific requirement text",
      "category": "technical|experience|education|certification|soft_skills|legal",
      "reasoning": "why this is must-have",
      "marketStandard": "standard|above_average|unrealistic|rare",
      "userHasThis": false,
      "alternativeOptions": ["alternative way to meet this"],
      "importanceScore": 95
    }
  ],
  "niceToHave": [
    {
      "requirement": "requirement text",
      "category": "technical|experience|education|certification|soft_skills|legal",
      "reasoning": "why this is nice-to-have",
      "marketStandard": "standard|above_average|unrealistic|rare",
      "userHasThis": false,
      "alternativeOptions": ["alternative"],
      "importanceScore": 60
    }
  ],
  "redFlags": [
    {
      "requirement": "problematic requirement",
      "category": "technical|experience|education|certification|soft_skills|legal",
      "reasoning": "why this is concerning",
      "marketStandard": "unrealistic",
      "userHasThis": false,
      "alternativeOptions": [],
      "importanceScore": 30
    }
  ],
  "marketAnalysis": {
    "overallRealism": "realistic|somewhat_inflated|heavily_inflated|unrealistic",
    "inflationFactors": ["factor1", "factor2"],
    "marketBenchmark": "comparison to market standards",
    "industryStandards": [
      {
        "requirement": "requirement",
        "typicalRequirement": "what's typically required",
        "thisJobRequirement": "what this job requires",
        "analysis": "gap analysis"
      }
    ],
    "competitionLevel": "low|medium|high"
  },
  "userFitAnalysis": {
    "overallFit": 75,
    "mustHaveMatch": 80,
    "niceToHaveMatch": 70,
    "gapAnalysis": [
      {
        "requirement": "missing requirement",
        "gapSeverity": "minor|moderate|major",
        "howToAcquire": "how to get this skill",
        "timeToAcquire": "time estimate",
        "workarounds": ["workaround options"]
      }
    ],
    "strengthAreas": ["area1", "area2"],
    "developmentSuggestions": [
      {
        "skill": "skill to develop",
        "priority": "high|medium|low",
        "timeframe": "time needed",
        "resources": ["resource1", "resource2"],
        "careerImpact": "impact description"
      }
    ]
  },
  "confidence": 0.85
}

IMPORTANT:
- Be realistic about market standards
- Identify genuinely unrealistic requirements
- Consider alternative ways to demonstrate qualifications
- Focus on actionable insights for job seekers`;
  };

  const parseAnalysisResponse = (content: string): SmartRequirementsData => {
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        ...parsed,
        lastAnalyzed: new Date(),
        confidence: parsed.confidence || 0.7
      };
    } catch (error) {
      console.error('Failed to parse requirements analysis:', error);
      throw new Error('Invalid analysis response format');
    }
  };

  const checkCachedAnalysis = async (): Promise<SmartRequirementsData | null> => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/analysis-cache?type=requirements_analysis`, {
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

  const saveAnalysisToCache = async (analysisData: SmartRequirementsData): Promise<void> => {
    try {
      await fetch(`/api/jobs/${jobId}/analysis-cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'requirements_analysis',
          analysis: analysisData
        })
      });
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'mustHave': return 'bg-red-100 text-red-800 border-red-200';
      case 'niceToHave': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'redFlags': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMarketStandardColor = (standard: string) => {
    switch (standard) {
      case 'standard': return 'text-green-600';
      case 'above_average': return 'text-blue-600';
      case 'unrealistic': return 'text-red-600';
      case 'rare': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getRealismColor = (realism: string) => {
    switch (realism) {
      case 'realistic': return 'text-green-600';
      case 'somewhat_inflated': return 'text-yellow-600';
      case 'heavily_inflated': return 'text-orange-600';
      case 'unrealistic': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!requirements || requirements.length < 20) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Smart Requirements Analysis
            <Badge variant="outline" className="text-blue-600">
              Intelligent
            </Badge>
          </CardTitle>
          <CardDescription>
            AI-powered categorization requires detailed job requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Requirements too short for meaningful analysis</p>
            <p className="text-sm">Need detailed requirements list for AI categorization</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Smart Requirements Analysis
          <Badge variant="outline" className="text-blue-600">
            <Zap className="w-3 h-3 mr-1" />
            Intelligent
          </Badge>
        </CardTitle>
        <CardDescription>
          AI categorization of requirements by importance and market realism
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
            <Target className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600 mb-4">Ready to analyze requirements</p>
            <Button onClick={loadAnalysis} className="bg-blue-600 hover:bg-blue-700">
              <Zap className="w-4 h-4 mr-2" />
              Start Analysis
            </Button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-12 h-12 mx-auto mb-4">
              <Target className="w-12 h-12 text-blue-500" />
            </div>
            <p className="text-gray-600">Analyzing requirements...</p>
            <p className="text-sm text-gray-500">Categorizing by importance and market standards</p>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {/* Overview Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{analysis.mustHave.length}</div>
                <div className="text-sm text-gray-600">Must-Have</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analysis.niceToHave.length}</div>
                <div className="text-sm text-gray-600">Nice-to-Have</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{analysis.redFlags.length}</div>
                <div className="text-sm text-gray-600">Red Flags</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analysis.userFitAnalysis.overallFit}%</div>
                <div className="text-sm text-gray-600">Overall Fit</div>
              </div>
            </div>

            {/* Market Reality Check */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-gray-600" />
                <span className="font-medium">Market Reality Check</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Requirements Realism:</span>
                <Badge className={getRealismColor(analysis.marketAnalysis.overallRealism)}>
                  {analysis.marketAnalysis.overallRealism.replace('_', ' ')}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Competition Level: <span className="font-medium">{analysis.marketAnalysis.competitionLevel}</span>
              </div>
            </div>

            {/* Quick Requirements Overview */}
            <div className="space-y-3">
              {/* Must-Have Requirements */}
              {analysis.mustHave.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-700 flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Must-Have Requirements ({analysis.mustHave.length})
                  </h4>
                  <div className="grid gap-2">
                    {analysis.mustHave.slice(0, 3).map((req, index) => (
                      <div key={index} className="p-2 bg-red-50 rounded border border-red-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-red-900">{req.requirement}</div>
                            <div className="text-xs text-red-700 mt-1">{req.reasoning}</div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Badge variant="outline" className={getMarketStandardColor(req.marketStandard)}>
                              {req.marketStandard.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    {analysis.mustHave.length > 3 && (
                      <div className="text-sm text-gray-500 text-center">
                        +{analysis.mustHave.length - 3} more requirements
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Red Flags */}
              {analysis.redFlags.length > 0 && (
                <div>
                  <h4 className="font-semibold text-orange-700 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Potential Red Flags ({analysis.redFlags.length})
                  </h4>
                  <div className="space-y-2">
                    {analysis.redFlags.map((flag, index) => (
                      <div key={index} className="p-2 bg-orange-50 rounded border border-orange-200">
                        <div className="text-sm font-medium text-orange-900">{flag.requirement}</div>
                        <div className="text-xs text-orange-700 mt-1">{flag.reasoning}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Fit Analysis */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-700 flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4" />
                Your Fit Analysis
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700">Must-Have Match:</span>
                  <div className="flex items-center gap-2">
                    <Progress value={analysis.userFitAnalysis.mustHaveMatch} className="w-20 h-2" />
                    <span className="text-sm font-medium">{analysis.userFitAnalysis.mustHaveMatch}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700">Nice-to-Have Match:</span>
                  <div className="flex items-center gap-2">
                    <Progress value={analysis.userFitAnalysis.niceToHaveMatch} className="w-20 h-2" />
                    <span className="text-sm font-medium">{analysis.userFitAnalysis.niceToHaveMatch}%</span>
                  </div>
                </div>
              </div>
              {analysis.userFitAnalysis.strengthAreas.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm text-green-600 mb-1">Your Strength Areas:</div>
                  <div className="text-sm text-green-800">
                    {analysis.userFitAnalysis.strengthAreas.join(' • ')}
                  </div>
                </div>
              )}
            </div>

            {/* Expandable Detailed Analysis */}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  View Detailed Breakdown
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 mt-4">
                {/* All Requirements Detailed */}
                <div className="space-y-4">
                  {/* Nice-to-Have Details */}
                  {analysis.niceToHave.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-blue-700 flex items-center gap-2 mb-3">
                        <Info className="w-4 h-4" />
                        Nice-to-Have Requirements ({analysis.niceToHave.length})
                      </h4>
                      <div className="space-y-2">
                        {analysis.niceToHave.map((req, index) => (
                          <div key={index} className="p-3 bg-blue-50 rounded border border-blue-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-blue-900">{req.requirement}</div>
                                <div className="text-sm text-blue-700 mt-1">{req.reasoning}</div>
                                {req.alternativeOptions && req.alternativeOptions.length > 0 && (
                                  <div className="text-xs text-blue-600 mt-2">
                                    <strong>Alternatives:</strong> {req.alternativeOptions.join(', ')}
                                  </div>
                                )}
                              </div>
                              <div className="text-right ml-2">
                                <Badge variant="outline" className={getMarketStandardColor(req.marketStandard)}>
                                  {req.marketStandard.replace('_', ' ')}
                                </Badge>
                                <div className="text-xs text-blue-600 mt-1">
                                  Score: {req.importanceScore}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gap Analysis */}
                  {analysis.userFitAnalysis.gapAnalysis.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-purple-700 flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4" />
                        Skill Gap Analysis
                      </h4>
                      <div className="space-y-2">
                        {analysis.userFitAnalysis.gapAnalysis.map((gap, index) => (
                          <div key={index} className="p-3 bg-purple-50 rounded border border-purple-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-purple-900">{gap.requirement}</div>
                                <div className="text-sm text-purple-700 mt-1">
                                  <strong>How to acquire:</strong> {gap.howToAcquire}
                                </div>
                                <div className="text-sm text-purple-700">
                                  <strong>Time needed:</strong> {gap.timeToAcquire}
                                </div>
                                {gap.workarounds.length > 0 && (
                                  <div className="text-sm text-purple-600 mt-1">
                                    <strong>Workarounds:</strong> {gap.workarounds.join(', ')}
                                  </div>
                                )}
                              </div>
                              <Badge variant="outline" className={
                                gap.gapSeverity === 'major' ? 'text-red-600' :
                                gap.gapSeverity === 'moderate' ? 'text-orange-600' : 'text-yellow-600'
                              }>
                                {gap.gapSeverity}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Development Suggestions */}
                  {analysis.userFitAnalysis.developmentSuggestions.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-indigo-700 flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4" />
                        Development Recommendations
                      </h4>
                      <div className="space-y-2">
                        {analysis.userFitAnalysis.developmentSuggestions.map((suggestion, index) => (
                          <div key={index} className="p-3 bg-indigo-50 rounded border border-indigo-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-indigo-900">{suggestion.skill}</div>
                                <div className="text-sm text-indigo-700 mt-1">{suggestion.careerImpact}</div>
                                <div className="text-sm text-indigo-600 mt-1">
                                  <strong>Timeframe:</strong> {suggestion.timeframe}
                                </div>
                                {suggestion.resources.length > 0 && (
                                  <div className="text-xs text-indigo-600 mt-1">
                                    <strong>Resources:</strong> {suggestion.resources.join(', ')}
                                  </div>
                                )}
                              </div>
                              <Badge variant="outline" className={
                                suggestion.priority === 'high' ? 'text-red-600' :
                                suggestion.priority === 'medium' ? 'text-orange-600' : 'text-green-600'
                              }>
                                {suggestion.priority} priority
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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