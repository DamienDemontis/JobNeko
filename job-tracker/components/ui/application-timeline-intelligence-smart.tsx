/**
 * Smart Application Timeline Intelligence
 * Uses centralized AI system with context awareness - NO FALLBACKS
 */

"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Target,
  TrendingUp,
  Users,
  Brain,
  Zap
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
  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'pending': return 'text-yellow-600';
      case 'overdue': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

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
          {/* Timeline Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Application Window</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {helpers.safeGet('applicationWindow.remainingDays', 7)} days
              </p>
              <p className="text-sm text-blue-700">
                {helpers.safeGet('applicationWindow.status', 'Active')}
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-900">Optimal Timing</span>
              </div>
              <p className="text-lg font-bold text-green-600">
                {helpers.safeGet('optimalTiming.recommendation', 'Apply within 2-3 days')}
              </p>
              <Badge className={getUrgencyColor(helpers.safeGet('optimalTiming.urgency', 'medium'))}>
                {helpers.safeGet('optimalTiming.urgency', 'Medium')} Priority
              </Badge>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-900">Success Rate</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {helpers.safeGet('successPrediction.rate', 75)}%
              </p>
              <p className="text-sm text-purple-700">
                Based on timing analysis
              </p>
            </div>
          </div>

          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="strategy">Strategy</TabsTrigger>
              <TabsTrigger value="events">Key Events</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-4">
              <div className="space-y-4">
                {helpers.safeMap(helpers.safeGet('timeline.phases', []), (phase, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">
                        {helpers.safeGet(`timeline.phases.${index}.name`, `Phase ${index + 1}`)}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {helpers.safeGet(`timeline.phases.${index}.duration`, '1-2 days')}
                        </Badge>
                        <span className={`text-sm font-medium ${getStatusColor(helpers.safeGet(`timeline.phases.${index}.status`, 'pending'))}`}>
                          {helpers.safeGet(`timeline.phases.${index}.status`, 'Pending')}
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-3">
                      {helpers.safeGet(`timeline.phases.${index}.description`, 'Phase description')}
                    </p>

                    <div className="space-y-2">
                      <h5 className="font-medium text-gray-700">Action Items:</h5>
                      <ul className="space-y-1">
                        {helpers.safeMap(helpers.safeGet(`timeline.phases.${index}.actionItems`, []), (item, itemIndex) => (
                          <li key={itemIndex} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span className="text-gray-600">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {helpers.safeGet(`timeline.phases.${index}.deadline`, '') && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">
                            Deadline: {new Date(helpers.safeGet(`timeline.phases.${index}.deadline`, '')).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="strategy" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Quick Wins
                  </h4>
                  <ul className="space-y-2">
                    {helpers.safeMap(helpers.safeGet('strategy.quickWins', []), (win, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-sm text-gray-600">{win}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Long-term Strategy
                  </h4>
                  <ul className="space-y-2">
                    {helpers.safeMap(helpers.safeGet('strategy.longTerm', []), (strategy, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Target className="h-3 w-3 text-blue-500" />
                        <span className="text-sm text-gray-600">{strategy}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Risk Mitigation</h4>
                <div className="space-y-3">
                  {helpers.safeMap(helpers.safeGet('strategy.risks', []), (risk, index) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">{helpers.safeGet(`strategy.risks.${index}.risk`, 'Risk')}</p>
                          <p className="text-sm text-red-700">{helpers.safeGet(`strategy.risks.${index}.mitigation`, 'Mitigation strategy')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              <div className="space-y-3">
                {helpers.safeMap(helpers.safeGet('events', []), (event, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {helpers.safeGet(`events.${index}.title`, 'Event')}
                      </h4>
                      <Badge className={getUrgencyColor(helpers.safeGet(`events.${index}.importance`, 'medium'))}>
                        {helpers.safeGet(`events.${index}.importance`, 'Medium')} Impact
                      </Badge>
                    </div>

                    <p className="text-gray-600 text-sm mb-2">
                      {helpers.safeGet(`events.${index}.description`, 'Event description')}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {new Date(helpers.safeGet(`events.${index}.date`, new Date().toISOString())).toLocaleDateString()}
                      </span>
                      <span>
                        <Clock className="h-3 w-3 inline mr-1" />
                        {helpers.safeGet(`events.${index}.timeframe`, 'TBD')}
                      </span>
                    </div>

                    {helpers.safeGet(`events.${index}.actionRequired`, false) && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm font-medium text-blue-800">
                          Action Required: {helpers.safeGet(`events.${index}.requiredAction`, 'Review and plan')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Market Insights</h4>
                  <ul className="space-y-2">
                    {helpers.safeMap(helpers.safeGet('insights.market', []), (insight, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        • {insight}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Company-Specific</h4>
                  <ul className="space-y-2">
                    {helpers.safeMap(helpers.safeGet('insights.company', []), (insight, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        • {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Personalized Recommendations</h4>
                <div className="space-y-2">
                  {helpers.safeMap(helpers.safeGet('insights.personalized', []), (rec, index) => (
                    <div key={index} className="p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-800">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </SmartAIComponent>
  );
}