'use client';

import React, { useState, useEffect } from 'react';
import { AIAnalysisPanel } from './ai-analysis-panel';
import { MatchScoreDonut } from './match-score-donut';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { CheckCircle, XCircle, TrendingUp, AlertCircle } from 'lucide-react';

interface UnifiedMatchTabProps {
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  jobDescription?: string;
  jobRequirements?: string;
  currentScore?: number;
  currentAnalysis?: any;
  userId: string;
  token: string;
  autoAnalyze?: boolean;
  onAnalysisComplete?: (data: any) => void;
}

export function UnifiedMatchTab({
  jobId,
  jobTitle,
  jobCompany,
  jobDescription,
  jobRequirements,
  currentScore,
  currentAnalysis,
  userId,
  token,
  autoAnalyze = false,
  onAnalysisComplete,
}: UnifiedMatchTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Initialize with current data if available
  useEffect(() => {
    if (currentScore && currentAnalysis) {
      setMatchData({
        matchScore: currentScore,
        detailedAnalysis: currentAnalysis,
      });
    }
  }, [currentScore, currentAnalysis]);

  const handleAnalyze = async () => {
    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          operation: 'match_score',
          forceRefresh: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate match score');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setMatchData(result.data);
        onAnalysisComplete?.(result.data);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'An error occurred during analysis');
        console.error('Match analysis error:', err);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setLoading(false);
    }
  };

  const renderMatchAnalysis = () => {
    if (!matchData?.detailedAnalysis) return null;

    const { missingElements, strengthsHighlights } = matchData.detailedAnalysis;

    return (
      <div className="space-y-6">
        {/* Match Score Display */}
        <div className="flex items-center justify-center mb-6">
          <div className="text-center">
            <MatchScoreDonut score={matchData.matchScore} size={120} strokeWidth={8} />
            <p className="mt-2 text-sm text-gray-600">
              Overall Match Score
            </p>
          </div>
        </div>

        {/* Strengths Section */}
        {strengthsHighlights && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                What You Have
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Top Strengths */}
              {strengthsHighlights.topStrengths?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Key Strengths</h4>
                  <div className="space-y-1">
                    {strengthsHighlights.topStrengths.map((strength: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{strength.element}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unique Advantages */}
              {strengthsHighlights.uniqueAdvantages?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Unique Advantages</h4>
                  <div className="space-y-1">
                    {strengthsHighlights.uniqueAdvantages.map((advantage: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <TrendingUp className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{advantage.element}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Competitive Edge */}
              {strengthsHighlights.competitiveEdge?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Competitive Edge</h4>
                  <div className="space-y-1">
                    {strengthsHighlights.competitiveEdge.map((edge: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{edge.element}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Missing Elements Section */}
        {missingElements && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                What's Missing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Critical Gaps */}
              {missingElements.criticalGaps?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Critical Gaps</h4>
                  <div className="space-y-1">
                    {missingElements.criticalGaps.map((gap: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{gap.element}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Important Gaps */}
              {missingElements.importantGaps?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Important to Add</h4>
                  <div className="space-y-1">
                    {missingElements.importantGaps.map((gap: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{gap.element}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <AIAnalysisPanel
      title="Resume Match Analysis"
      description="See how well your resume matches this job"
      loading={loading}
      error={error}
      success={!!matchData}
      onAnalyze={handleAnalyze}
      onCancel={handleCancel}
      analyzeLabel="Calculate Match"
      autoAnalyze={autoAnalyze && !matchData}
      disabled={!jobDescription && !jobRequirements}
    >
      {renderMatchAnalysis()}
    </AIAnalysisPanel>
  );
}