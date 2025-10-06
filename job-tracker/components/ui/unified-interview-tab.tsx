'use client';

import React, { useState } from 'react';
import { AIAnalysisPanel } from './ai-analysis-panel';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { MessageSquare, Target, Users, Brain, Clock, AlertTriangle } from 'lucide-react';

interface UnifiedInterviewTabProps {
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  jobDescription?: string;
  jobRequirements?: string;
  userId: string;
  token: string;
  autoAnalyze?: boolean;
  onAnalysisComplete?: (data: any) => void;
}

export function UnifiedInterviewTab({
  jobId,
  jobTitle,
  jobCompany,
  jobDescription,
  jobRequirements,
  userId,
  token,
  autoAnalyze = false,
  onAnalysisComplete,
}: UnifiedInterviewTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interviewData, setInterviewData] = useState<any>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleAnalyze = async () => {
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
          operation: 'interview_prep',
          forceRefresh: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate interview prep');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setInterviewData(result.data);
        onAnalysisComplete?.(result.data);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'An error occurred during analysis');
        console.error('Interview prep error:', err);
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

  const renderInterviewPrep = () => {
    if (!interviewData) return null;

    return (
      <div className="space-y-6">
        {/* Common Questions */}
        {interviewData.common_questions && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-gray-600" />
                Expected Interview Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Technical Questions */}
              {interviewData.common_questions.technical?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-gray-50">Technical</Badge>
                  </div>
                  <div className="space-y-3">
                    {interviewData.common_questions.technical.map((q: any, idx: number) => (
                      <div key={idx} className="border-l-2 border-gray-200 pl-3">
                        <p className="text-sm font-medium text-gray-900 mb-1">{q.question}</p>
                        {q.hint && (
                          <p className="text-xs text-gray-600">💡 {q.hint}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Behavioral Questions */}
              {interviewData.common_questions.behavioral?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-gray-50">Behavioral</Badge>
                  </div>
                  <div className="space-y-3">
                    {interviewData.common_questions.behavioral.map((q: any, idx: number) => (
                      <div key={idx} className="border-l-2 border-gray-200 pl-3">
                        <p className="text-sm font-medium text-gray-900 mb-1">{q.question}</p>
                        {q.framework && (
                          <p className="text-xs text-gray-600">📝 Use {q.framework} framework</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Company-Specific */}
              {interviewData.common_questions.company_specific?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-gray-50">Company Specific</Badge>
                  </div>
                  <div className="space-y-3">
                    {interviewData.common_questions.company_specific.map((q: any, idx: number) => (
                      <div key={idx} className="border-l-2 border-gray-200 pl-3">
                        <p className="text-sm font-medium text-gray-900 mb-1">{q.question}</p>
                        {q.research_tip && (
                          <p className="text-xs text-gray-600">🔍 {q.research_tip}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Key Topics to Prepare */}
        {interviewData.key_topics && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-gray-600" />
                Key Topics to Prepare
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {interviewData.key_topics.map((topic: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <Brain className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{topic.topic}</p>
                      {topic.importance && (
                        <p className="text-xs text-gray-600 mt-1">Priority: {topic.importance}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Interview Format & Process */}
        {interviewData.interview_process && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-600" />
                Interview Process
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {interviewData.interview_process.rounds?.map((round: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-gray-600">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{round.type}</p>
                    <p className="text-xs text-gray-600 mt-1">{round.duration} • {round.format}</p>
                    {round.focus && (
                      <p className="text-xs text-gray-500 mt-1">Focus: {round.focus}</p>
                    )}
                  </div>
                </div>
              ))}

              {interviewData.interview_process.timeline && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-gray-600">
                    ⏱️ Typical timeline: {interviewData.interview_process.timeline}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Red Flags & Tips */}
        {interviewData.tips && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-gray-600" />
                Interview Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {interviewData.tips.dos && (
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-2">✅ Do's</p>
                  <ul className="space-y-1">
                    {interviewData.tips.dos.map((tip: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-green-500">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {interviewData.tips.donts && (
                <div>
                  <p className="text-xs font-semibold text-red-700 mb-2">❌ Don'ts</p>
                  <ul className="space-y-1">
                    {interviewData.tips.donts.map((tip: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-red-500">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {interviewData.tips.company_culture && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-semibold text-gray-700 mb-1">🏢 Company Culture Notes</p>
                  <p className="text-sm text-gray-600">{interviewData.tips.company_culture}</p>
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
      title="Interview Preparation"
      description="AI-powered interview coaching and preparation"
      loading={loading}
      error={error}
      success={!!interviewData}
      onAnalyze={handleAnalyze}
      onCancel={handleCancel}
      analyzeLabel="Generate Prep"
      autoAnalyze={autoAnalyze && !interviewData}
      disabled={!jobDescription && !jobRequirements}
    >
      {renderInterviewPrep()}
    </AIAnalysisPanel>
  );
}