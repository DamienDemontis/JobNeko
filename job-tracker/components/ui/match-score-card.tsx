'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MatchScoreDonut } from '@/components/ui/match-score-donut';
import {
  Target,
  TrendingUp,
  Award,
  BookOpen,
  Code,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock
} from 'lucide-react';

interface MissingElement {
  element: string;
  category: 'skills' | 'experience' | 'education' | 'certifications' | 'keywords';
  importance: 'critical' | 'important' | 'nice-to-have';
  details: string;
}

interface Strength {
  element: string;
  category: 'skills' | 'experience' | 'education' | 'achievements' | 'keywords';
  relevance: 'high' | 'medium' | 'low';
  details: string;
}

interface DetailedAnalysis {
  missingElements?: {
    criticalGaps?: MissingElement[];
    importantGaps?: MissingElement[];
    suggestedImprovements?: MissingElement[];
  };
  strengthsHighlights?: {
    topStrengths?: Strength[];
    uniqueAdvantages?: Strength[];
    competitiveEdge?: Strength[];
  };
}

interface MatchScoreCardProps {
  matchScore: number | null | undefined;
  confidence?: number;
  components?: {
    skills: number;
    experience: number;
    education: number;
    keywords: number;
    achievements: number;
  };
  detailedAnalysis?: DetailedAnalysis;
  tier?: 'free' | 'pro' | 'pro_max';
  isCalculating?: boolean;
  onRecalculate?: () => void;
  onCancel?: () => void;
  compact?: boolean;
  showDetails?: boolean;
}

const TIER_LABELS = {
  free: { name: 'Free', color: 'text-gray-600', icon: Target },
  pro: { name: 'Pro', color: 'text-blue-600', icon: Award },
  pro_max: { name: 'Pro Max', color: 'text-purple-600', icon: Sparkles }
};

const COMPONENT_ICONS = {
  skills: Code,
  experience: TrendingUp,
  education: BookOpen,
  keywords: Target,
  achievements: Award
};

const COMPONENT_LABELS = {
  skills: 'Technical Skills',
  experience: 'Experience',
  education: 'Education',
  keywords: 'Keywords',
  achievements: 'Achievements'
};

export function MatchScoreCard({
  matchScore,
  confidence,
  components,
  detailedAnalysis,
  tier = 'free',
  isCalculating = false,
  onRecalculate,
  onCancel,
  compact = false,
  showDetails = true
}: MatchScoreCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const tierInfo = TIER_LABELS[tier];
  const TierIcon = tierInfo.icon;

  // Flatten arrays from nested structure and filter out empty elements
  const allStrengths = detailedAnalysis ? [
    ...(detailedAnalysis.strengthsHighlights?.topStrengths || []),
    ...(detailedAnalysis.strengthsHighlights?.uniqueAdvantages || []),
    ...(detailedAnalysis.strengthsHighlights?.competitiveEdge || [])
  ].filter(s => s.element && s.element.trim()) : [];

  const allMissing = detailedAnalysis ? [
    ...(detailedAnalysis.missingElements?.criticalGaps || []),
    ...(detailedAnalysis.missingElements?.importantGaps || [])
  ].filter(m => m.element && m.element.trim()) : [];

  // Debug: Log detailed analysis
  console.log('🔍 MatchScoreCard props:', {
    hasDetailedAnalysis: !!detailedAnalysis,
    detailedAnalysis,
    missingCount: allMissing.length,
    strengthsCount: allStrengths.length
  });

  // Get match level and color
  const getMatchLevel = (score: number) => {
    if (score >= 85) return { label: 'Excellent Match', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (score >= 70) return { label: 'Good Match', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    if (score >= 55) return { label: 'Fair Match', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { label: 'Weak Match', color: 'text-red-600', bgColor: 'bg-red-50' };
  };

  const getConfidenceDisplay = (conf: number) => {
    if (conf >= 0.8) return { label: 'High Confidence', icon: CheckCircle, color: 'text-green-600' };
    if (conf >= 0.6) return { label: 'Medium Confidence', icon: AlertCircle, color: 'text-yellow-600' };
    return { label: 'Low Confidence', icon: AlertCircle, color: 'text-red-600' };
  };

  if (isCalculating) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <div className="text-center">
                <p className="font-medium text-gray-900">Calculating Match Score...</p>
                <p className="text-sm text-gray-500">Analyzing resume compatibility with AI</p>
              </div>
            </div>
            {onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Cancel Analysis
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!matchScore && matchScore !== 0) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <Target className="w-12 h-12 mx-auto text-gray-300" />
            <div>
              <p className="font-medium text-gray-900 mb-1">No Match Score Yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Upload your resume to see how well you match this job
              </p>
              {onRecalculate && (
                <Button size="sm" variant="outline" onClick={onRecalculate}>
                  Calculate Match Score
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const score = matchScore || 0;
  const matchLevel = getMatchLevel(score);
  const confidenceInfo = confidence ? getConfidenceDisplay(confidence) : null;
  const ConfidenceIcon = confidenceInfo?.icon;

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <MatchScoreDonut score={score} size={50} strokeWidth={6} />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-semibold ${matchLevel.color}`}>
              {score}% Match
            </span>
            {tier !== 'free' && (
              <Badge variant="outline" className="text-xs">
                <TierIcon className="w-3 h-3 mr-1" />
                {tierInfo.name}
              </Badge>
            )}
          </div>
          {confidence && ConfidenceIcon && (
            <div className={`flex items-center space-x-1 text-xs ${confidenceInfo.color}`}>
              <ConfidenceIcon className="w-3 h-3" />
              <span>{Math.round(confidence * 100)}% confident</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Resume Match Score</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {tier !== 'free' && (
              <Badge variant="outline" className={tierInfo.color}>
                <TierIcon className="w-3 h-3 mr-1" />
                {tierInfo.name}
              </Badge>
            )}
            {onRecalculate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRecalculate}
                className="h-8"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <MatchScoreDonut score={score} size={80} strokeWidth={8} />
            <div>
              <div className={`text-3xl font-bold ${matchLevel.color}`}>
                {score}%
              </div>
              <div className={`text-sm font-medium ${matchLevel.color}`}>
                {matchLevel.label}
              </div>
              {confidence && ConfidenceIcon && (
                <div className={`flex items-center space-x-1 text-xs mt-1 ${confidenceInfo.color}`}>
                  <ConfidenceIcon className="w-3 h-3" />
                  <span>{confidenceInfo.label}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Component Breakdown */}
        {showDetails && components && (
          <div className="space-y-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <span>Match Breakdown</span>
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expanded && (
              <div className="space-y-3 pt-2">
                {Object.entries(components).map(([key, value]) => {
                  const Icon = COMPONENT_ICONS[key as keyof typeof components];
                  const label = COMPONENT_LABELS[key as keyof typeof components];
                  const componentLevel = getMatchLevel(value);

                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{label}</span>
                        </div>
                        <span className={`font-semibold ${componentLevel.color}`}>
                          {value}%
                        </span>
                      </div>
                      <Progress value={value} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upgrade Prompt for Free Tier */}
            {tier === 'free' && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start space-x-2">
                  <Lock className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-700 mb-1">
                      Want more insights?
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      Upgrade to Pro for skills gap analysis, improvement recommendations, and ATS compatibility checks.
                    </p>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      Upgrade to Pro
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Match Analysis Feedback */}
        {matchScore && matchScore > 0 ? (
          <div className="mt-4 space-y-2">
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-md hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  Match Analysis
                </span>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  {allStrengths.length > 0 && (
                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                      {allStrengths.length} strengths
                    </span>
                  )}
                  {allMissing.length > 0 && (
                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                      {allMissing.length} missing
                    </span>
                  )}
                </div>
              </div>
              {showFeedback ? (
                <ChevronUp className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              )}
            </button>

            {showFeedback && (
              <div className="space-y-3 p-4 border border-gray-200 rounded-md bg-white animate-in slide-in-from-top duration-200">
                {/* No analysis available yet */}
                {allStrengths.length === 0 && allMissing.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600">
                      Click "Calculate Match Score" to generate detailed feedback
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Strengths */}
                    {allStrengths.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      What You Have
                    </h4>
                    <div className="space-y-1.5">
                      {allStrengths.map((strength, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{strength.element}</span>
                            {strength.details && (
                              <span className="text-gray-600"> - {strength.details}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider */}
                {allStrengths.length > 0 && allMissing.length > 0 && (
                  <div className="border-t border-gray-200" />
                )}

                {/* Missing Elements */}
                {allMissing.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                      What's Missing
                    </h4>
                    <div className="space-y-1.5">
                      {allMissing.map((missing, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <span className="text-red-500 mt-0.5">✗</span>
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{missing.element}</span>
                            {missing.details && (
                              <span className="text-gray-600"> - {missing.details}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
