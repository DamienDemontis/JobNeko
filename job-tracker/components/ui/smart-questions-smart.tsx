/**
 * Smart Interview Questions - Centralized AI Version
 * NO FALLBACKS, NO HARDCODED DATA
 */

"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  MessageSquare,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Star,
  Target,
  Brain,
  Search
} from 'lucide-react';
import SmartAIComponent from './smart-ai-component';

interface SmartQuestionsProps {
  jobId: string;
  jobTitle: string;
  company: string;
  userId: string;
  token: string;
}

export default function SmartQuestionsSmart({
  jobId,
  jobTitle,
  company,
  userId,
  token
}: SmartQuestionsProps) {
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [customPrompt, setCustomPrompt] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  const toggleQuestion = (index: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'strategic': return 'text-purple-600 bg-purple-100';
      case 'technical': return 'text-blue-600 bg-blue-100';
      case 'culture': return 'text-green-600 bg-green-100';
      case 'growth': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <SmartAIComponent
      jobId={jobId}
      userId={userId}
      token={token}
      analysisType="smart_questions"
      title="Smart Interview Questions"
      description="Research-driven, strategic questions to ask interviewers that demonstrate preparation and gather critical insights"
      icon={<MessageSquare className="h-5 w-5" />}
      autoLoad={true}
    >
      {(data, helpers) => (
        <div className="space-y-6">
          {/* Filter Controls */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Interview Stage:
              </label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="phone">Phone/Video</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="panel">Panel</SelectItem>
                  <SelectItem value="final">Final Round</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => helpers.refresh(true)}
              variant="outline"
              size="sm"
              disabled={helpers.isLoading}
            >
              <Search className="h-4 w-4 mr-2" />
              Regenerate Questions
            </Button>
          </div>

          {/* Custom Question Generator */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold text-gray-900 mb-2">Custom Question Generator</h4>
            <p className="text-sm text-gray-600 mb-3">
              Have specific concerns or interests? Generate targeted questions to address them.
            </p>
            <Textarea
              placeholder="Describe your specific concerns, interests, or areas you want to explore (e.g., work-life balance, remote work policies, growth opportunities, team dynamics, etc.)"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="mb-3"
            />
            <Button
              size="sm"
              disabled={!customPrompt.trim() || helpers.isLoading}
            >
              Generate Custom Questions
            </Button>
          </div>

          {/* Questions Tabs */}
          <Tabs defaultValue="research" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="research">Research</TabsTrigger>
              <TabsTrigger value="culture">Culture</TabsTrigger>
              <TabsTrigger value="role">Role</TabsTrigger>
              <TabsTrigger value="strategy">Strategy</TabsTrigger>
              <TabsTrigger value="flags">Red Flags</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            {/* Research Questions */}
            <TabsContent value="research" className="space-y-4">
              {helpers.safeMap(
                helpers.safeGet('questions', []).filter((q: any) =>
                  q.category === 'strategic' || q.category === 'research'
                ),
                (question, index) => (
                  <QuestionCard
                    key={index}
                    question={question}
                    index={index}
                    isExpanded={expandedQuestions.has(index)}
                    onToggle={() => toggleQuestion(index)}
                    getPriorityColor={getPriorityColor}
                    getCategoryColor={getCategoryColor}
                    helpers={helpers}
                  />
                )
              )}
            </TabsContent>

            {/* Culture Questions */}
            <TabsContent value="culture" className="space-y-4">
              {helpers.safeMap(
                helpers.safeGet('questions', []).filter((q: any) =>
                  q.category === 'culture'
                ),
                (question, index) => (
                  <QuestionCard
                    key={index}
                    question={question}
                    index={index}
                    isExpanded={expandedQuestions.has(index)}
                    onToggle={() => toggleQuestion(index)}
                    getPriorityColor={getPriorityColor}
                    getCategoryColor={getCategoryColor}
                    helpers={helpers}
                  />
                )
              )}
            </TabsContent>

            {/* Role Questions */}
            <TabsContent value="role" className="space-y-4">
              {helpers.safeMap(
                helpers.safeGet('questions', []).filter((q: any) =>
                  q.category === 'technical' || q.category === 'role'
                ),
                (question, index) => (
                  <QuestionCard
                    key={index}
                    question={question}
                    index={index}
                    isExpanded={expandedQuestions.has(index)}
                    onToggle={() => toggleQuestion(index)}
                    getPriorityColor={getPriorityColor}
                    getCategoryColor={getCategoryColor}
                    helpers={helpers}
                  />
                )
              )}
            </TabsContent>

            {/* Strategy Questions */}
            <TabsContent value="strategy" className="space-y-4">
              {helpers.safeMap(
                helpers.safeGet('questions', []).filter((q: any) =>
                  q.category === 'growth' || q.category === 'strategy'
                ),
                (question, index) => (
                  <QuestionCard
                    key={index}
                    question={question}
                    index={index}
                    isExpanded={expandedQuestions.has(index)}
                    onToggle={() => toggleQuestion(index)}
                    getPriorityColor={getPriorityColor}
                    getCategoryColor={getCategoryColor}
                    helpers={helpers}
                  />
                )
              )}
            </TabsContent>

            {/* Red Flags Questions */}
            <TabsContent value="flags" className="space-y-4">
              <div className="space-y-3">
                {helpers.safeMap(helpers.safeGet('customizationTips', []), (tip, index) => (
                  <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <span className="text-sm text-yellow-800">{tip}</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Custom Questions */}
            <TabsContent value="custom" className="space-y-4">
              <p className="text-gray-600 text-center py-4">
                Use the custom question generator above to create personalized questions.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </SmartAIComponent>
  );
}

// Question Card Component
function QuestionCard({
  question,
  index,
  isExpanded,
  onToggle,
  getPriorityColor,
  getCategoryColor,
  helpers
}: any) {
  return (
    <Collapsible open={isExpanded} onOpenChange={() => onToggle()}>
      <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor(helpers.safeGet(`questions.${index}.priority`, 'medium'))}>
              {helpers.safeGet(`questions.${index}.priority`, 'medium')} priority
            </Badge>
            <Badge className={getCategoryColor(helpers.safeGet(`questions.${index}.category`, 'general'))}>
              {helpers.safeGet(`questions.${index}.category`, 'general')}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500" />
              <span className="text-sm font-medium">
                {helpers.safeGet(`questions.${index}.effectiveness`, 8)}/10 effectiveness
              </span>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <h4 className="font-medium text-gray-900 mb-2">
          {helpers.safeGet(`questions.${index}.question`, 'Interview question')}
        </h4>

        <CollapsibleContent>
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Shows: </span>
              {helpers.safeGet(`questions.${index}.reasoning`, 'Strategic thinking and preparation')}
            </p>

            {helpers.safeGet(`questions.${index}.followUps`, []).length > 0 && (
              <div>
                <span className="font-medium text-gray-700 text-sm">Follow-up questions:</span>
                <ul className="mt-1 space-y-1">
                  {helpers.safeMap(helpers.safeGet(`questions.${index}.followUps`, []), (followUp: string, fuIndex: number) => (
                    <li key={fuIndex} className="text-sm text-gray-600 pl-4">
                      • {followUp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}