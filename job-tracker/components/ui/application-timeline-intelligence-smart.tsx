/**
 * Smart Application Timeline Intelligence
 * Uses centralized AI system with context awareness - Simplified version with key insights only
 */

"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Target,
  Users,
  Brain
} from 'lucide-react';
import SmartAIComponent from './smart-ai-component';

interface ApplicationTimelineIntelligenceProps {
  jobId: string;
  jobTitle: string;
  company: string;
  userId: string;
  token: string;
  jobData?: {
    applicationDeadline?: Date;
    postedDate?: Date;
    location?: string;
    requirements?: string;
  };
}

export default function ApplicationTimelineIntelligenceSmart({
  jobId,
  jobTitle,
  company,
  userId,
  token,
  jobData = {}
}: ApplicationTimelineIntelligenceProps) {
  return (
    <SmartAIComponent
      jobId={jobId}
      userId={userId}
      token={token}
      analysisType="timeline_analysis"
      title="Application Timeline Intelligence"
      description="AI-powered timing strategy and deadline analysis for optimal application success"
      icon={<Calendar className="h-5 w-5" />}
      autoLoad={true}
      additionalData={{
        jobData,
        analysisType: 'application_timeline'
      }}
    >
      {(data, helpers) => (
        <div className="space-y-6">
          {/* Simplified Timeline Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Urgency Level</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 capitalize">
                {helpers.safeGet('urgency.level', 'Medium')}
              </p>
              <p className="text-sm text-blue-700">
                {helpers.safeGet('urgency.daysRemaining', 'N/A')} days remaining
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-900">Recommendation</span>
              </div>
              <p className="text-lg font-bold text-green-600">
                {helpers.safeGet('optimalTiming.recommendation', 'Apply within 3-5 days')}
              </p>
              <p className="text-sm text-green-700">
                Best days: {helpers.safeGet('optimalTiming.bestDays', []).join(', ') || 'Any weekday'}
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-900">Competition</span>
              </div>
              <p className="text-2xl font-bold text-purple-600 capitalize">
                {helpers.safeGet('competition.level', 'Medium')}
              </p>
              <p className="text-sm text-purple-700">
                Based on timing analysis
              </p>
            </div>
          </div>

          {/* Simplified Key Information */}
          <div className="space-y-4">
            {/* Deadline Information */}
            {helpers.safeGet('deadline.hasDeadline', false) && (
              <div className="border rounded-lg p-4 bg-yellow-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-900">Application Deadline</span>
                </div>
                <p className="text-lg font-bold text-yellow-700">
                  {helpers.safeGet('deadline.timeLeft', 'Check job posting')}
                </p>
                <p className="text-sm text-yellow-600">
                  Source: {helpers.safeGet('deadline.source', 'Job posting')}
                </p>
              </div>
            )}

            {/* Key Insights */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-900">Key Insights</span>
              </div>
              <div className="space-y-2">
                {helpers.safeMap(helpers.safeGet('keyInsights', []), (insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reasoning */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Why This Timing?</h4>
                <p className="text-sm text-gray-600">
                  {helpers.safeGet('optimalTiming.reason', 'Based on market analysis and posting timeline')}
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Competition Level</h4>
                <p className="text-sm text-gray-600">
                  {helpers.safeGet('competition.reasoning', 'Standard competition expected for this role')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </SmartAIComponent>
  );
}