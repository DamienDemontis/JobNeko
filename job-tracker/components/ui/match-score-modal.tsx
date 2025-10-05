'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MatchScoreCard } from '@/components/ui/match-score-card';
import { DetailedMatchAnalysis } from '@/components/ui/detailed-match-analysis';
import { Download, X, Sparkles } from 'lucide-react';

interface MatchScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  company: string;
  matchScore: number;
  confidence?: number;
  components?: {
    skills: number;
    experience: number;
    education: number;
    keywords: number;
    achievements: number;
  };
  detailedAnalysis?: any;
  tier?: 'free' | 'pro' | 'pro_max';
  onRecalculate?: () => void;
}

export function MatchScoreModal({
  isOpen,
  onClose,
  jobTitle,
  company,
  matchScore,
  confidence,
  components,
  detailedAnalysis,
  tier = 'free',
  onRecalculate
}: MatchScoreModalProps) {
  const [activeView, setActiveView] = useState<'summary' | 'detailed'>('summary');

  const canViewDetailed = tier !== 'free' && detailedAnalysis;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">{jobTitle}</DialogTitle>
              <DialogDescription className="text-base mt-1">
                {company}
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              {tier !== 'free' && (
                <Badge variant="outline" className="capitalize">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {tier === 'pro_max' ? 'Pro Max' : 'Pro'}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* View Toggle */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div className="flex space-x-2">
            <Button
              variant={activeView === 'summary' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('summary')}
            >
              Summary
            </Button>
            <Button
              variant={activeView === 'detailed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('detailed')}
              disabled={!canViewDetailed}
            >
              Detailed Analysis
              {!canViewDetailed && ' (Pro)'}
            </Button>
          </div>

          <div className="flex space-x-2">
            {onRecalculate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRecalculate}
              >
                Recalculate
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: Implement PDF export
                alert('PDF export coming soon!');
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 py-4">
          {activeView === 'summary' ? (
            <div className="space-y-6">
              <MatchScoreCard
                matchScore={matchScore}
                confidence={confidence}
                components={components}
                tier={tier}
                showDetails={true}
              />

              {/* Quick Actions */}
              {matchScore < 70 && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-2">
                    How to Improve Your Match Score
                  </h4>
                  <ul className="space-y-2 text-sm text-yellow-800">
                    {components && components.skills < 70 && (
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span><strong>Skills Gap:</strong> Add missing technical skills from the job description to your resume</span>
                      </li>
                    )}
                    {components && components.keywords < 70 && (
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span><strong>Keywords:</strong> Incorporate more industry-specific terms and job posting keywords</span>
                      </li>
                    )}
                    {components && components.achievements < 70 && (
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span><strong>Achievements:</strong> Add quantifiable accomplishments with metrics and impact</span>
                      </li>
                    )}
                    {components && components.experience < 70 && (
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span><strong>Experience:</strong> Emphasize relevant work experience that aligns with job requirements</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {tier === 'free' && (
                <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="flex items-start space-x-4">
                    <Sparkles className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-2">
                        Unlock Detailed Analysis with Pro
                      </h4>
                      <ul className="space-y-1 text-sm text-blue-800 mb-4">
                        <li>✓ Skills gap identification with learning paths</li>
                        <li>✓ Personalized improvement recommendations</li>
                        <li>✓ ATS compatibility check and optimization</li>
                        <li>✓ Resume tailoring suggestions</li>
                        <li>✓ Strengths and competitive advantages analysis</li>
                      </ul>
                      <Button size="sm">
                        Upgrade to Pro - $9.99/month
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <DetailedMatchAnalysis
              detailedAnalysis={detailedAnalysis}
              tier={tier}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
