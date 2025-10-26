'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  Award,
  BookOpen,
  FileText,
  Lightbulb,
  Clock,
  Zap,
  Lock,
  ArrowRight
} from 'lucide-react';

interface DetailedMatchAnalysisProps {
  detailedAnalysis: any;
  tier: 'free' | 'pro' | 'pro_max';
}

export function DetailedMatchAnalysis({ detailedAnalysis, tier }: DetailedMatchAnalysisProps) {
  if (!detailedAnalysis) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-6 text-center">
          <Lock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-900 mb-2">Detailed Analysis Unavailable</p>
          <p className="text-sm text-gray-500 mb-4">
            Upgrade to Pro to unlock comprehensive match analysis with skills gap identification,
            improvement recommendations, and ATS compatibility checks.
          </p>
          <Button>Upgrade to Pro</Button>
        </CardContent>
      </Card>
    );
  }

  const { overallMatch, matchBreakdown, missingElements, strengthsHighlights, improvementPlan, atsCompatibility, tailoringRecommendations } = detailedAnalysis;

  return (
    <div className="space-y-6">
      {/* Overall Match Summary */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Match Analysis Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-black">{overallMatch.percentage}%</div>
              <div className="text-sm text-gray-600 mt-1">Overall Match</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-black">{Math.round(overallMatch.confidence * 100)}%</div>
              <div className="text-sm text-gray-600 mt-1">Confidence</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Badge variant={
                overallMatch.level === 'excellent' ? 'default' :
                overallMatch.level === 'good' ? 'secondary' : 'outline'
              } className="text-lg">
                {overallMatch.level.charAt(0).toUpperCase() + overallMatch.level.slice(1)}
              </Badge>
              <div className="text-sm text-gray-600 mt-2">Match Level</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="strengths">Strengths</TabsTrigger>
          <TabsTrigger value="gaps">Gaps</TabsTrigger>
          <TabsTrigger value="improvements">Improve</TabsTrigger>
          <TabsTrigger value="ats">ATS</TabsTrigger>
        </TabsList>

        {/* Match Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Component Scores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(matchBreakdown).map(([key, section]: [string, any]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium capitalize">{key.replace('_', ' ')}</span>
                      <span className="text-xs text-gray-500 ml-2">({section.weight}% weight)</span>
                    </div>
                    <span className="font-semibold">{section.score}%</span>
                  </div>
                  <Progress value={section.score} className="h-2" />
                  <p className="text-xs text-gray-600">{section.details}</p>
                  {section.matchedItems?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {section.matchedItems.slice(0, 5).map((item: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {item}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {section.missingItems?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {section.missingItems.slice(0, 3).map((item: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs text-red-600">
                          <XCircle className="w-3 h-3 mr-1" />
                          {item}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strengths Tab */}
        <TabsContent value="strengths" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <Award className="w-5 h-5" />
                <span>Your Strengths</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {strengthsHighlights?.topStrengths?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Top Strengths</h4>
                  <div className="space-y-2">
                    {strengthsHighlights.topStrengths.map((strength: any, idx: number) => (
                      <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-sm text-green-900">{strength.element}</p>
                            <p className="text-xs text-green-700 mt-1">{strength.advantage}</p>
                            <p className="text-xs text-gray-600 mt-1 italic">{strength.howToLeverage}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {strengthsHighlights?.competitiveEdge?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Competitive Edge</h4>
                  <div className="space-y-2">
                    {strengthsHighlights.competitiveEdge.map((edge: string, idx: number) => (
                      <div key={idx} className="flex items-center space-x-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span>{edge}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gaps Tab */}
        <TabsContent value="gaps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Skills & Experience Gaps</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {missingElements?.criticalGaps?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-red-600">Critical Gaps</h4>
                  <div className="space-y-2">
                    {missingElements.criticalGaps.map((gap: any, idx: number) => (
                      <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-start space-x-2">
                          <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-sm text-red-900">{gap.element}</p>
                            <p className="text-xs text-red-700 mt-1">{gap.impact}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {gap.category}
                              </Badge>
                              <span className="text-xs text-gray-600">{gap.howToAddress}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {missingElements?.importantGaps?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-yellow-600">Important Gaps</h4>
                  <div className="space-y-2">
                    {missingElements.importantGaps.map((gap: any, idx: number) => (
                      <div key={idx} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-sm text-yellow-900">{gap.element}</p>
                            <p className="text-xs text-yellow-700 mt-1">{gap.impact}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Improvements Tab */}
        <TabsContent value="improvements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <Lightbulb className="w-5 h-5" />
                <span>Improvement Plan</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {improvementPlan?.quickWins?.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="w-4 h-4 text-green-600" />
                    <h4 className="font-medium text-sm">Quick Wins (Immediate)</h4>
                  </div>
                  <div className="space-y-2">
                    {improvementPlan.quickWins.map((action: any, idx: number) => (
                      <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="font-medium text-sm text-green-900">{action.action}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Impact: +{action.expectedImprovement}% match score
                        </p>
                        <ul className="mt-2 space-y-1">
                          {action.specificSteps?.map((step: string, stepIdx: number) => (
                            <li key={stepIdx} className="text-xs text-gray-700 flex items-start space-x-1">
                              <ArrowRight className="w-3 h-3 mt-0.5" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {improvementPlan?.shortTerm?.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <h4 className="font-medium text-sm">Short Term (1-4 weeks)</h4>
                  </div>
                  <div className="space-y-2">
                    {improvementPlan.shortTerm.map((action: any, idx: number) => (
                      <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="font-medium text-sm text-blue-900">{action.action}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Impact: +{action.expectedImprovement}% match score
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {improvementPlan?.longTerm?.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <h4 className="font-medium text-sm">Long Term (1-6 months)</h4>
                  </div>
                  <div className="space-y-2">
                    {improvementPlan.longTerm.map((action: any, idx: number) => (
                      <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="font-medium text-sm text-purple-900">{action.action}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Impact: +{action.expectedImprovement}% match score
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ATS Compatibility Tab */}
        <TabsContent value="ats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>ATS Compatibility</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-4xl font-bold text-black">{atsCompatibility?.score || 0}%</div>
                <div className="text-sm text-gray-600 mt-1">ATS Score</div>
              </div>

              {atsCompatibility?.issues?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Issues Found</h4>
                  <div className="space-y-2">
                    {atsCompatibility.issues.map((issue: any, idx: number) => (
                      <div key={idx} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                            issue.severity === 'high' ? 'text-red-600' :
                            issue.severity === 'medium' ? 'text-yellow-600' :
                            'text-gray-600'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-sm">{issue.issue}</p>
                              <Badge variant="outline" className="text-xs">
                                {issue.severity}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{issue.description}</p>
                            <p className="text-xs text-green-700 mt-1">✓ {issue.solution}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {atsCompatibility?.recommendations?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {atsCompatibility.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tailoring Recommendations */}
      {tailoringRecommendations && (
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Resume Tailoring Tips</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tailoringRecommendations.keywordsToAdd?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Keywords to Add:</p>
                <div className="flex flex-wrap gap-2">
                  {tailoringRecommendations.keywordsToAdd.map((keyword: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {tailoringRecommendations.sectionsToEmphasize?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Emphasize These Sections:</p>
                <div className="flex flex-wrap gap-2">
                  {tailoringRecommendations.sectionsToEmphasize.map((section: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {section}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
