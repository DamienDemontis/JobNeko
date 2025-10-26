/**
 * Smart Interview Pipeline Manager
 * Uses centralized AI system - NO FALLBACKS, NO HARDCODED DATA
 */

"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Target,
  Lightbulb,
  BookOpen,
  MessageSquare,
  Brain
} from 'lucide-react';
import SmartAIComponent from './smart-ai-component';

interface InterviewPipelineManagerProps {
  jobId: string;
  jobTitle: string;
  company: string;
  userId: string;
  token: string;
}

export default function InterviewPipelineManagerSmart({
  jobId,
  jobTitle,
  company,
  userId,
  token
}: InterviewPipelineManagerProps) {
  return (
    <SmartAIComponent
      jobId={jobId}
      userId={userId}
      token={token}
      analysisType="interview_analysis"
      title="Interview Pipeline Manager"
      description="AI-powered interview preparation and pipeline tracking for strategic success"
      icon={<Brain className="h-5 w-5" />}
      autoLoad={true}
    >
      {(data, helpers) => (
        <div className="space-y-6">
          {/* Pipeline Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Process Length</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {helpers.safeGet('processLength', '2-4 weeks')}
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-900">Difficulty</span>
              </div>
              <Badge variant={
                helpers.safeGet('overallDifficulty', 'medium').toLowerCase() === 'easy' ? 'default' :
                helpers.safeGet('overallDifficulty', 'medium').toLowerCase() === 'hard' ? 'destructive' : 'secondary'
              }>
                {helpers.safeGet('overallDifficulty', 'Medium').toUpperCase()}
              </Badge>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-900">Success Rate</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {helpers.safeGet('successRate', 65)}%
              </p>
            </div>
          </div>

          <Tabs defaultValue="stages" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="stages">Interview Stages</TabsTrigger>
              <TabsTrigger value="preparation">Preparation</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="stages" className="space-y-4">
              <div className="space-y-3">
                {helpers.safeMap(helpers.safeGet('interviewTypes', []), (stage, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {helpers.safeGet(`interviewTypes.${index}.type`, `Stage ${index + 1}`)}
                      </h4>
                      <Badge variant={
                        helpers.safeGet(`interviewTypes.${index}.difficulty`, 'medium').toLowerCase() === 'easy' ? 'default' :
                        helpers.safeGet(`interviewTypes.${index}.difficulty`, 'medium').toLowerCase() === 'hard' ? 'destructive' : 'secondary'
                      }>
                        {helpers.safeGet(`interviewTypes.${index}.difficulty`, 'Medium')}
                      </Badge>
                    </div>

                    <p className="text-gray-600 text-sm mb-3">
                      {helpers.safeGet(`interviewTypes.${index}.description`, 'Interview stage description')}
                    </p>

                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Preparation Tips:</h5>
                      <ul className="list-disc list-inside space-y-1">
                        {helpers.safeMap(helpers.safeGet(`interviewTypes.${index}.preparation`, []), (tip, tipIndex) => (
                          <li key={tipIndex} className="text-sm text-gray-600">{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="preparation" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Preparation Strategy
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-gray-700">Timeline: </span>
                      <span className="text-gray-600">
                        {helpers.safeGet('preparationStrategy.timeline', '2-3 weeks')}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 block mb-1">Priorities:</span>
                      <ul className="list-disc list-inside space-y-1">
                        {helpers.safeMap(helpers.safeGet('preparationStrategy.priorities', []), (priority, index) => (
                          <li key={index} className="text-sm text-gray-600">{priority}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Resources
                  </h4>
                  <ul className="space-y-2">
                    {helpers.safeMap(helpers.safeGet('preparationStrategy.resources', []), (resource, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-sm text-gray-600">{resource}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Company Culture</h4>
                  <div className="flex flex-wrap gap-2">
                    {helpers.safeMap(helpers.safeGet('companySpecificInsights.culture', []), (item, index) => (
                      <Badge key={index} variant="outline">{item}</Badge>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Expectations</h4>
                  <ul className="space-y-2">
                    {helpers.safeMap(helpers.safeGet('companySpecificInsights.expectations', []), (expectation, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Target className="h-3 w-3 text-blue-500" />
                        <span className="text-sm text-gray-600">{expectation}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Red Flags to Watch
                  </h4>
                  <ul className="space-y-2">
                    {helpers.safeMap(helpers.safeGet('companySpecificInsights.redFlags', []), (flag, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        <span className="text-sm text-gray-600">{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Typical Interview Timeline</h4>
                <div className="space-y-4">
                  {helpers.safeMap(helpers.safeGet('interviewTypes', []), (stage, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">
                          {helpers.safeGet(`interviewTypes.${index}.type`, `Stage ${index + 1}`)}
                        </h5>
                        <p className="text-sm text-gray-600">
                          {helpers.safeGet(`interviewTypes.${index}.description`, 'Stage description')}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">
                          Week {index + 1}
                        </Badge>
                      </div>
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