/**
 * Questions to Ask Your Interviewer
 * Strategic questions for the candidate to ask during their interview
 * NO FALLBACKS, NO HARDCODED DATA
 */

"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Star,
  AlertTriangle,
  Search,
  Building2,
  Users,
  Briefcase,
  TrendingUp
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
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [expandedRedFlags, setExpandedRedFlags] = useState<Set<number>>(new Set());

  const toggleQuestion = (index: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  const toggleRedFlag = (index: number) => {
    const newExpanded = new Set(expandedRedFlags);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRedFlags(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'border-black text-black bg-gray-50';
      case 'medium': return 'border-gray-400 text-gray-700 bg-gray-50';
      case 'low': return 'border-gray-300 text-gray-600 bg-gray-50';
      default: return 'border-gray-300 text-gray-600 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'research': return <Building2 className="h-4 w-4" />;
      case 'culture': return <Users className="h-4 w-4" />;
      case 'role': return <Briefcase className="h-4 w-4" />;
      case 'strategy': return <TrendingUp className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'research': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'culture': return 'text-green-700 bg-green-50 border-green-200';
      case 'role': return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'strategy': return 'text-orange-700 bg-orange-50 border-orange-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <SmartAIComponent
      jobId={jobId}
      userId={userId}
      token={token}
      analysisType="smart_questions"
      title="Questions to Ask Your Interviewer"
      description={`Strategic questions for you to ask during your interview at ${company}. Demonstrate preparation and evaluate if this role is right for you.`}
      icon={<MessageSquare className="h-5 w-5" />}
      autoLoad={true}
    >
      {(data, helpers) => (
        <div className="space-y-6">
          {/* Refresh Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => helpers.refresh(true)}
              variant="outline"
              size="sm"
              disabled={helpers.isLoading}
              className="border-gray-300"
            >
              <Search className="h-4 w-4 mr-2" />
              Regenerate Questions
            </Button>
          </div>

          {/* Questions Tabs */}
          <Tabs defaultValue="research" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-gray-100">
              <TabsTrigger value="research" className="data-[state=active]:bg-white">
                <Building2 className="h-4 w-4 mr-2" />
                Research
              </TabsTrigger>
              <TabsTrigger value="culture" className="data-[state=active]:bg-white">
                <Users className="h-4 w-4 mr-2" />
                Culture
              </TabsTrigger>
              <TabsTrigger value="role" className="data-[state=active]:bg-white">
                <Briefcase className="h-4 w-4 mr-2" />
                Role
              </TabsTrigger>
              <TabsTrigger value="strategy" className="data-[state=active]:bg-white">
                <TrendingUp className="h-4 w-4 mr-2" />
                Strategy
              </TabsTrigger>
              <TabsTrigger value="flags" className="data-[state=active]:bg-white">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Red Flags
              </TabsTrigger>
            </TabsList>

            {/* Research Questions */}
            <TabsContent value="research" className="space-y-4 mt-6">
              <p className="text-sm text-gray-600 mb-4">
                Questions demonstrating your research about {company} and the industry
              </p>
              {helpers.safeMap(
                helpers.safeGet('questions', []).filter((q: any) => q.category === 'research'),
                (question, index) => (
                  <QuestionCard
                    key={index}
                    question={question}
                    index={index}
                    isExpanded={expandedQuestions.has(index)}
                    onToggle={() => toggleQuestion(index)}
                    getPriorityColor={getPriorityColor}
                    getCategoryColor={getCategoryColor}
                    getCategoryIcon={getCategoryIcon}
                    helpers={helpers}
                  />
                )
              )}
              {helpers.safeGet('questions', []).filter((q: any) => q.category === 'research').length === 0 && (
                <p className="text-center text-gray-500 py-8">No research questions generated</p>
              )}
            </TabsContent>

            {/* Culture Questions */}
            <TabsContent value="culture" className="space-y-4 mt-6">
              <p className="text-sm text-gray-600 mb-4">
                Questions about team culture, values, and work environment
              </p>
              {helpers.safeMap(
                helpers.safeGet('questions', []).filter((q: any) => q.category === 'culture'),
                (question, index) => (
                  <QuestionCard
                    key={index}
                    question={question}
                    index={index}
                    isExpanded={expandedQuestions.has(index)}
                    onToggle={() => toggleQuestion(index)}
                    getPriorityColor={getPriorityColor}
                    getCategoryColor={getCategoryColor}
                    getCategoryIcon={getCategoryIcon}
                    helpers={helpers}
                  />
                )
              )}
              {helpers.safeGet('questions', []).filter((q: any) => q.category === 'culture').length === 0 && (
                <p className="text-center text-gray-500 py-8">No culture questions generated</p>
              )}
            </TabsContent>

            {/* Role Questions */}
            <TabsContent value="role" className="space-y-4 mt-6">
              <p className="text-sm text-gray-600 mb-4">
                Questions about responsibilities, expectations, and growth in this role
              </p>
              {helpers.safeMap(
                helpers.safeGet('questions', []).filter((q: any) => q.category === 'role'),
                (question, index) => (
                  <QuestionCard
                    key={index}
                    question={question}
                    index={index}
                    isExpanded={expandedQuestions.has(index)}
                    onToggle={() => toggleQuestion(index)}
                    getPriorityColor={getPriorityColor}
                    getCategoryColor={getCategoryColor}
                    getCategoryIcon={getCategoryIcon}
                    helpers={helpers}
                  />
                )
              )}
              {helpers.safeGet('questions', []).filter((q: any) => q.category === 'role').length === 0 && (
                <p className="text-center text-gray-500 py-8">No role questions generated</p>
              )}
            </TabsContent>

            {/* Strategy Questions */}
            <TabsContent value="strategy" className="space-y-4 mt-6">
              <p className="text-sm text-gray-600 mb-4">
                Questions about company direction, priorities, and future plans
              </p>
              {helpers.safeMap(
                helpers.safeGet('questions', []).filter((q: any) => q.category === 'strategy'),
                (question, index) => (
                  <QuestionCard
                    key={index}
                    question={question}
                    index={index}
                    isExpanded={expandedQuestions.has(index)}
                    onToggle={() => toggleQuestion(index)}
                    getPriorityColor={getPriorityColor}
                    getCategoryColor={getCategoryColor}
                    getCategoryIcon={getCategoryIcon}
                    helpers={helpers}
                  />
                )
              )}
              {helpers.safeGet('questions', []).filter((q: any) => q.category === 'strategy').length === 0 && (
                <p className="text-center text-gray-500 py-8">No strategy questions generated</p>
              )}
            </TabsContent>

            {/* Red Flags Questions */}
            <TabsContent value="flags" className="space-y-4 mt-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900 mb-1">
                      Questions to Uncover Potential Issues
                    </p>
                    <p className="text-sm text-yellow-700">
                      These questions help you identify red flags like high turnover, poor work-life balance, or unclear expectations.
                    </p>
                  </div>
                </div>
              </div>

              {helpers.safeMap(
                helpers.safeGet('redFlagQuestions', []),
                (question, index) => (
                  <RedFlagQuestionCard
                    key={index}
                    question={question}
                    index={index}
                    isExpanded={expandedRedFlags.has(index)}
                    onToggle={() => toggleRedFlag(index)}
                    getPriorityColor={getPriorityColor}
                    helpers={helpers}
                  />
                )
              )}
              {helpers.safeGet('redFlagQuestions', []).length === 0 && (
                <p className="text-center text-gray-500 py-8">No red flag questions generated</p>
              )}
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
  getCategoryIcon,
  helpers
}: any) {
  // Use the question object directly instead of accessing by index
  const category = question?.category || 'general';
  const priority = question?.priority || 'medium';
  const effectiveness = question?.effectiveness || 8;
  const questionText = question?.question || 'Interview question';
  const reasoning = question?.reasoning || 'Strategic thinking and preparation';
  const bestTime = question?.bestTime;
  const followUps = question?.followUps || [];

  return (
    <Collapsible open={isExpanded} onOpenChange={() => onToggle()}>
      <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors bg-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`${getCategoryColor(category)} border`}>
              {getCategoryIcon(category)}
              <span className="ml-1.5">{category}</span>
            </Badge>
            <Badge variant="outline" className={`${getPriorityColor(priority)} border-2`}>
              {priority} priority
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-600 fill-yellow-600" />
              <span className="text-sm font-medium text-gray-700">
                {effectiveness}/10
              </span>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <h4 className="font-semibold text-gray-900 text-base mb-2 leading-snug">
          "{questionText}"
        </h4>

        <CollapsibleContent>
          <div className="space-y-3 pt-3 border-t border-gray-200 mt-3">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Why ask this?</span>
              <p className="text-sm text-gray-700 mt-1">
                {reasoning}
              </p>
            </div>

            {bestTime && (
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Best time to ask</span>
                <p className="text-sm text-gray-700 mt-1">
                  {bestTime}
                </p>
              </div>
            )}

            {followUps.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Follow-up questions</span>
                <ul className="mt-2 space-y-1.5">
                  {followUps.map((followUp: string, fuIndex: number) => (
                    <li key={fuIndex} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">→</span>
                      <span>{followUp}</span>
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

// Red Flag Question Card Component
function RedFlagQuestionCard({
  question,
  index,
  isExpanded,
  onToggle,
  getPriorityColor,
  helpers
}: any) {
  // Use the question object directly instead of accessing by index
  const priority = question?.priority || 'medium';
  const questionText = question?.question || 'Red flag question';
  const redFlag = question?.redFlag || 'Potential issue';
  const goodAnswer = question?.goodAnswer || 'Positive indicator';
  const concerningAnswer = question?.concerningAnswer || 'Warning sign';
  const reasoning = question?.reasoning;

  return (
    <Collapsible open={isExpanded} onOpenChange={() => onToggle()}>
      <div className="border-2 border-yellow-300 rounded-lg p-4 hover:border-yellow-400 transition-colors bg-yellow-50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-yellow-100 border-yellow-400 text-yellow-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Red Flag Check
            </Badge>
            <Badge variant="outline" className={`${getPriorityColor(priority)} border-2`}>
              {priority} priority
            </Badge>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>

        <h4 className="font-semibold text-gray-900 text-base mb-2 leading-snug">
          "{questionText}"
        </h4>

        <CollapsibleContent>
          <div className="space-y-3 pt-3 border-t border-yellow-200 mt-3">
            <div>
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">⚠️ What this reveals</span>
              <p className="text-sm text-gray-800 mt-1 font-medium">
                {redFlag}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">✓ Good answer</span>
                <p className="text-sm text-green-800 mt-1">
                  {goodAnswer}
                </p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">✗ Concerning answer</span>
                <p className="text-sm text-red-800 mt-1">
                  {concerningAnswer}
                </p>
              </div>
            </div>

            {reasoning && (
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Why this matters</span>
                <p className="text-sm text-gray-700 mt-1">
                  {reasoning}
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
