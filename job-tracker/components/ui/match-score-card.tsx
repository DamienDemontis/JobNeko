'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MatchScoreDonut, getScoreColorClass } from '@/components/ui/match-score-donut';
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
  matchingSkills?: string[];
  missingSkills?: string[];
  partialMatches?: string[];
  matchExplanation?: string;
  atsKeywords?: {
    matched: string[];
    missing: string[];
    recommendations: string[];
  };
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
  const [showSkillsBreakdown, setShowSkillsBreakdown] = useState(false);

  const tierInfo = TIER_LABELS[tier];
  const TierIcon = tierInfo.icon;

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

  const score = Math.round(matchScore || 0);
  const matchLevel = getMatchLevel(score);
  const confidenceInfo = confidence ? getConfidenceDisplay(confidence) : null;
  const ConfidenceIcon = confidenceInfo?.icon;

  // Get match explanation data
  const matchingSkills = detailedAnalysis?.matchingSkills || [];
  const partialMatches = detailedAnalysis?.partialMatches || [];
  const missingSkills = detailedAnalysis?.missingSkills || [];
  const matchExplanation = detailedAnalysis?.matchExplanation || '';

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <MatchScoreDonut score={score} size={50} strokeWidth={6} />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-semibold ${getScoreColorClass(score)}`}>
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
              <div className={`text-3xl font-bold ${getScoreColorClass(score)}`}>
                {score}%
              </div>
              <div className={`text-sm font-medium ${getScoreColorClass(score)}`}>
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

        {/* Skills Breakdown - Collapsible, full width */}
        {(matchingSkills.length > 0 || partialMatches.length > 0 || missingSkills.length > 0) && (
          <div className="space-y-3 pt-2 border-t border-gray-200">
            <button
              onClick={() => setShowSkillsBreakdown(!showSkillsBreakdown)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <div className="flex items-center gap-2">
                <span>Skills Analysis</span>
                <div className="flex items-center gap-1.5 text-xs text-gray-600 font-normal">
                  {matchingSkills.length > 0 && (
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded">
                      {matchingSkills.length} matching
                    </span>
                  )}
                  {partialMatches.length > 0 && (
                    <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded">
                      {partialMatches.length} partial
                    </span>
                  )}
                  {missingSkills.length > 0 && (
                    <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded">
                      {missingSkills.length} missing
                    </span>
                  )}
                </div>
              </div>
              {showSkillsBreakdown ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showSkillsBreakdown && (
              <div className="space-y-3 pt-2">
                {matchingSkills.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-green-700 mb-1">✓ Matching Skills</div>
                    <div className="flex flex-wrap gap-1">
                      {matchingSkills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {partialMatches.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-orange-700 mb-1">⚡ Partial Matches</div>
                    <div className="space-y-1">
                      {partialMatches.map((match, index) => (
                        <div key={index} className="text-xs text-orange-700 bg-orange-50 p-1 rounded">
                          {match}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {missingSkills.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-red-700 mb-1">◯ Missing Skills</div>
                    <div className="flex flex-wrap gap-1">
                      {missingSkills.map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs text-red-700 border-red-200">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
                  const roundedValue = Math.round(value);
                  const componentLevel = getMatchLevel(roundedValue);

                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{label}</span>
                        </div>
                        <span className={`font-semibold ${getScoreColorClass(roundedValue)}`}>
                          {roundedValue}%
                        </span>
                      </div>
                      <Progress value={roundedValue} className="h-2" />
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

      </CardContent>
    </Card>
  );
}
