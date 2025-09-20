"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  Target,
  Brain,
  Copy,
  Check,
  Star,
  TrendingUp,
  Users,
  Building2,
  Clock,
  Award
} from 'lucide-react';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';
import { webIntelligenceService } from '@/lib/services/web-intelligence';

interface SmartQuestion {
  id: string;
  category: 'research' | 'culture' | 'role' | 'growth' | 'strategy' | 'red_flag' | 'compensation' | 'team';
  question: string;
  purpose: string;
  stage: 'screening' | 'technical' | 'panel' | 'final' | 'any';
  priority: 'high' | 'medium' | 'low';
  followUp?: string[];
  redFlag?: boolean;
  effectiveness: number; // 1-10
  tags: string[];
}

interface QuestionGeneration {
  researchBased: SmartQuestion[];
  cultureAssessment: SmartQuestion[];
  roleSpecific: SmartQuestion[];
  redFlagDetection: SmartQuestion[];
  strategicInquiry: SmartQuestion[];
  customGenerated: SmartQuestion[];
}

interface QuestionEffectiveness {
  questionId: string;
  timesUsed: number;
  responseQuality: number; // 1-10
  interviewerFeedback: number; // 1-10
  informationValue: number; // 1-10
  overallScore: number; // 1-10
}

interface SmartQuestionsData {
  companyName: string;
  jobTitle: string;
  generatedAt: string;
  questions: QuestionGeneration;
  interviewStageMapping: {
    screening: string[];
    technical: string[];
    panel: string[];
    final: string[];
  };
  questioningStrategy: {
    approach: string;
    keyAreas: string[];
    priorities: string[];
    timing: string[];
  };
}

interface SmartQuestionsProps {
  companyName: string;
  jobTitle: string;
  userId: string;
}

export function SmartQuestions({ companyName, jobTitle, userId }: SmartQuestionsProps) {
  const [questionsData, setQuestionsData] = useState<SmartQuestionsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("research");
  const [selectedStage, setSelectedStage] = useState<string>("any");
  const [customConcerns, setCustomConcerns] = useState<string>("");
  const [copiedQuestions, setCopiedQuestions] = useState<Set<string>>(new Set());

  const generateSmartQuestions = async (userConcerns?: string) => {
    if (!companyName || !jobTitle) {
      setError('Company name and job title are required for question generation');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const companyIntel = await webIntelligenceService.getCompanyIntelligence(companyName, userId);

      const questionsPrompt = `
You are an expert interview strategist and career coach. Generate highly targeted, intelligent questions for a candidate to ask during interviews.

COMPANY INFORMATION:
Company: ${companyName}
Position: ${jobTitle}
Industry: ${companyIntel.industry}
Company Size: ${companyIntel.teamComposition.totalEmployees} employees
Founded: ${companyIntel.foundedYear || 'Unknown'}
Business Model: ${companyIntel.businessModel}
Financial Health: ${companyIntel.financialData.financialHealth}

USER CONCERNS/INTERESTS:
${userConcerns || 'No specific concerns provided'}

Generate comprehensive, strategic questions across multiple categories that will:
1. Demonstrate deep research and preparation
2. Assess company culture and fit
3. Uncover potential red flags
4. Position the candidate as strategic and thoughtful
5. Gather critical decision-making information

Return a JSON object with this exact structure:
{
  "companyName": "${companyName}",
  "jobTitle": "${jobTitle}",
  "generatedAt": "${new Date().toISOString()}",
  "questions": {
    "researchBased": [
      {
        "id": "rb1",
        "category": "research",
        "question": "I noticed ${companyName} recently [specific recent development]. How is this impacting your strategic priorities for ${jobTitle}?",
        "purpose": "Shows research depth and connects recent developments to role",
        "stage": "panel",
        "priority": "high",
        "followUp": ["What role would this position play in that strategy?"],
        "redFlag": false,
        "effectiveness": 9,
        "tags": ["strategic", "research", "current_events"]
      }
    ],
    "cultureAssessment": [
      {
        "id": "ca1",
        "category": "culture",
        "question": "How does ${companyName} define success for someone in this role after the first 90 days?",
        "purpose": "Understands expectations and success metrics",
        "stage": "any",
        "priority": "high",
        "followUp": ["What would need to happen for you to consider the hire a great success after one year?"],
        "redFlag": false,
        "effectiveness": 8,
        "tags": ["expectations", "success_metrics", "timeline"]
      }
    ],
    "roleSpecific": [
      {
        "id": "rs1",
        "category": "role",
        "question": "What are the biggest challenges the ${jobTitle} team is currently facing?",
        "purpose": "Identifies immediate problems and challenges to solve",
        "stage": "technical",
        "priority": "high",
        "followUp": ["What approaches have been tried so far?", "What would success look like in addressing these challenges?"],
        "redFlag": false,
        "effectiveness": 9,
        "tags": ["challenges", "problem_solving", "priorities"]
      }
    ],
    "redFlagDetection": [
      {
        "id": "rf1",
        "category": "red_flag",
        "question": "What's the typical career progression for someone in this role at ${companyName}?",
        "purpose": "Assesses growth opportunities and internal mobility",
        "stage": "any",
        "priority": "medium",
        "followUp": ["Can you share examples of people who've grown from this role?"],
        "redFlag": true,
        "effectiveness": 7,
        "tags": ["career_growth", "mobility", "examples"]
      }
    ],
    "strategicInquiry": [
      {
        "id": "si1",
        "category": "strategy",
        "question": "How do you see ${companyName}'s position evolving in the ${companyIntel.industry} space over the next 2-3 years?",
        "purpose": "Shows industry awareness and long-term thinking",
        "stage": "final",
        "priority": "high",
        "followUp": ["What role would this position play in that evolution?"],
        "redFlag": false,
        "effectiveness": 8,
        "tags": ["strategy", "industry", "future_planning"]
      }
    ],
    "customGenerated": []
  },
  "interviewStageMapping": {
    "screening": ["ca1", "rs1"],
    "technical": ["rs1", "rb1"],
    "panel": ["rb1", "si1", "ca1"],
    "final": ["si1", "rf1"]
  },
  "questioningStrategy": {
    "approach": "Research-driven with strategic depth",
    "keyAreas": [
      "Company strategy and market position",
      "Role expectations and success metrics",
      "Team dynamics and culture",
      "Growth opportunities and challenges"
    ],
    "priorities": [
      "Demonstrate thorough preparation",
      "Assess cultural fit both ways",
      "Understand growth potential",
      "Identify potential concerns early"
    ],
    "timing": [
      "Start with research-based questions to show preparation",
      "Move to role-specific questions to understand expectations",
      "Ask strategic questions to demonstrate business acumen",
      "End with culture and growth questions for mutual assessment"
    ]
  }
}

REQUIREMENTS FOR QUESTION GENERATION:
- Generate 6-8 questions per category (except custom)
- Make questions specific to ${companyName} and ${jobTitle}
- Include industry-specific terminology and concerns
- Reference company size, business model, and financial status appropriately
- Create follow-up questions that dig deeper
- Mark questions that might reveal red flags
- Assign realistic effectiveness scores based on question quality
- Tag questions for easy filtering and categorization
- Ensure questions demonstrate research and strategic thinking
- Make questions appropriate for company stage and industry
- Include questions that assess both hard and soft factors
- Balance information gathering with impression management

QUESTION CATEGORIES EXPLAINED:
- Research-based: Questions showing deep company/industry research
- Culture Assessment: Questions evaluating fit and work environment
- Role-specific: Questions about immediate responsibilities and challenges
- Red Flag Detection: Questions designed to uncover potential issues
- Strategic Inquiry: Questions showing business acumen and long-term thinking
- Custom Generated: Based on user's specific concerns (if provided)

Generate questions that will help the candidate make an informed decision while positioning them as a thoughtful, strategic hire.
`;

      const questionsData = await aiServiceManagerClient.generateJSON(
        questionsPrompt,
        'interview_prep',
        userId,
        { temperature: 0.4, max_tokens: 4000 }
      );
      setQuestionsData(questionsData);

    } catch (error) {
      console.error('Error generating smart questions:', error);
      setError(error instanceof Error ? error.message : 'Question generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const generateCustomQuestions = async () => {
    if (!customConcerns.trim() || !questionsData) return;

    setIsLoading(true);

    try {
      const customPrompt = `
Based on these specific user concerns: "${customConcerns}"

Generate 3-4 targeted questions that address these concerns for the ${jobTitle} role at ${companyName}.

Return a JSON array of questions with this structure:
[
  {
    "id": "custom1",
    "category": "custom",
    "question": "Specific question addressing the concern",
    "purpose": "What this question aims to uncover",
    "stage": "any",
    "priority": "high",
    "followUp": ["Follow-up question"],
    "redFlag": false,
    "effectiveness": 8,
    "tags": ["custom", "concern_specific"]
  }
]
`;

      const customQuestions = await aiServiceManagerClient.generateJSON(
        customPrompt,
        'interview_prep',
        userId,
        { temperature: 0.3, max_tokens: 1500 }
      );

      setQuestionsData({
        ...questionsData,
        questions: {
          ...questionsData.questions,
          customGenerated: customQuestions
        }
      });

      setCustomConcerns("");

    } catch (error) {
      console.error('Error generating custom questions:', error);
      setError('Failed to generate custom questions');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (question: string, questionId: string) => {
    try {
      await navigator.clipboard.writeText(question);
      setCopiedQuestions(prev => new Set([...prev, questionId]));
      setTimeout(() => {
        setCopiedQuestions(prev => {
          const newSet = new Set(prev);
          newSet.delete(questionId);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy question:', error);
    }
  };

  const getFilteredQuestions = (questions: SmartQuestion[]) => {
    if (selectedStage === "any") return questions;
    return questions.filter(q => q.stage === selectedStage || q.stage === "any");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  useEffect(() => {
    if (companyName && jobTitle) {
      generateSmartQuestions();
    }
  }, [companyName, jobTitle, userId]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Smart Interview Questions
        </CardTitle>
        <CardDescription>
          Research-driven, strategic questions to ask interviewers that demonstrate preparation and gather critical insights
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">
              Generating intelligent questions tailored to your interview...
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 border border-red-200 rounded-md bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={() => generateSmartQuestions()}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Retry Generation
            </Button>
          </div>
        )}

        {questionsData && (
          <>
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium">Filter by Interview Stage:</label>
                  <Select value={selectedStage} onValueChange={setSelectedStage}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">All Stages</SelectItem>
                      <SelectItem value="screening">Phone/Video Screening</SelectItem>
                      <SelectItem value="technical">Technical Interview</SelectItem>
                      <SelectItem value="panel">Panel Interview</SelectItem>
                      <SelectItem value="final">Final Round</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() => generateSmartQuestions()}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <Brain className="h-4 w-4 mr-2" />
                Regenerate Questions
              </Button>
            </div>

            {/* Custom Questions Generator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Custom Question Generator
                </CardTitle>
                <CardDescription>
                  Have specific concerns or interests? Generate targeted questions to address them.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={customConcerns}
                  onChange={(e) => setCustomConcerns(e.target.value)}
                  placeholder="Describe your specific concerns, interests, or areas you want to explore (e.g., work-life balance, remote work policies, growth opportunities, team dynamics, etc.)"
                  rows={3}
                />
                <Button
                  onClick={generateCustomQuestions}
                  disabled={!customConcerns.trim() || isLoading}
                  size="sm"
                >
                  Generate Custom Questions
                </Button>
              </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="research" className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Research
                </TabsTrigger>
                <TabsTrigger value="culture" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Culture
                </TabsTrigger>
                <TabsTrigger value="role" className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Role
                </TabsTrigger>
                <TabsTrigger value="strategy" className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Strategy
                </TabsTrigger>
                <TabsTrigger value="red_flags" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Red Flags
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Custom
                </TabsTrigger>
              </TabsList>

              {/* Research-Based Questions */}
              <TabsContent value="research" className="space-y-4">
                <div className="space-y-4">
                  {getFilteredQuestions(questionsData.questions.researchBased).map((question) => (
                    <Card key={question.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getPriorityColor(question.priority)}>
                                  {question.priority} priority
                                </Badge>
                                <Badge variant="outline">{question.stage}</Badge>
                                <div className={`text-sm font-medium ${getEffectivenessColor(question.effectiveness)}`}>
                                  {question.effectiveness}/10 effectiveness
                                </div>
                              </div>
                              <p className="font-medium text-lg mb-2">{question.question}</p>
                              <p className="text-sm text-gray-600 mb-3">{question.purpose}</p>

                              {question.followUp && question.followUp.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-sm font-medium text-blue-700 mb-1">Follow-up questions:</p>
                                  <ul className="space-y-1">
                                    {question.followUp.map((followUp, index) => (
                                      <li key={index} className="text-sm text-blue-600 flex items-start gap-2">
                                        <HelpCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                        {followUp}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-1">
                                {question.tags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(question.question, question.id)}
                              className="ml-4"
                            >
                              {copiedQuestions.has(question.id) ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Culture Assessment Questions */}
              <TabsContent value="culture" className="space-y-4">
                <div className="space-y-4">
                  {getFilteredQuestions(questionsData.questions.cultureAssessment).map((question) => (
                    <Card key={question.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getPriorityColor(question.priority)}>
                                  {question.priority} priority
                                </Badge>
                                <Badge variant="outline">{question.stage}</Badge>
                                <div className={`text-sm font-medium ${getEffectivenessColor(question.effectiveness)}`}>
                                  {question.effectiveness}/10 effectiveness
                                </div>
                              </div>
                              <p className="font-medium text-lg mb-2">{question.question}</p>
                              <p className="text-sm text-gray-600 mb-3">{question.purpose}</p>

                              {question.followUp && question.followUp.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-sm font-medium text-blue-700 mb-1">Follow-up questions:</p>
                                  <ul className="space-y-1">
                                    {question.followUp.map((followUp, index) => (
                                      <li key={index} className="text-sm text-blue-600 flex items-start gap-2">
                                        <HelpCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                        {followUp}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-1">
                                {question.tags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(question.question, question.id)}
                              className="ml-4"
                            >
                              {copiedQuestions.has(question.id) ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Role-Specific Questions */}
              <TabsContent value="role" className="space-y-4">
                <div className="space-y-4">
                  {getFilteredQuestions(questionsData.questions.roleSpecific).map((question) => (
                    <Card key={question.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getPriorityColor(question.priority)}>
                                  {question.priority} priority
                                </Badge>
                                <Badge variant="outline">{question.stage}</Badge>
                                <div className={`text-sm font-medium ${getEffectivenessColor(question.effectiveness)}`}>
                                  {question.effectiveness}/10 effectiveness
                                </div>
                              </div>
                              <p className="font-medium text-lg mb-2">{question.question}</p>
                              <p className="text-sm text-gray-600 mb-3">{question.purpose}</p>

                              {question.followUp && question.followUp.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-sm font-medium text-blue-700 mb-1">Follow-up questions:</p>
                                  <ul className="space-y-1">
                                    {question.followUp.map((followUp, index) => (
                                      <li key={index} className="text-sm text-blue-600 flex items-start gap-2">
                                        <HelpCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                        {followUp}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-1">
                                {question.tags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(question.question, question.id)}
                              className="ml-4"
                            >
                              {copiedQuestions.has(question.id) ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Strategic Questions */}
              <TabsContent value="strategy" className="space-y-4">
                <div className="space-y-4">
                  {getFilteredQuestions(questionsData.questions.strategicInquiry).map((question) => (
                    <Card key={question.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getPriorityColor(question.priority)}>
                                  {question.priority} priority
                                </Badge>
                                <Badge variant="outline">{question.stage}</Badge>
                                <div className={`text-sm font-medium ${getEffectivenessColor(question.effectiveness)}`}>
                                  {question.effectiveness}/10 effectiveness
                                </div>
                              </div>
                              <p className="font-medium text-lg mb-2">{question.question}</p>
                              <p className="text-sm text-gray-600 mb-3">{question.purpose}</p>

                              {question.followUp && question.followUp.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-sm font-medium text-blue-700 mb-1">Follow-up questions:</p>
                                  <ul className="space-y-1">
                                    {question.followUp.map((followUp, index) => (
                                      <li key={index} className="text-sm text-blue-600 flex items-start gap-2">
                                        <HelpCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                        {followUp}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-1">
                                {question.tags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(question.question, question.id)}
                              className="ml-4"
                            >
                              {copiedQuestions.has(question.id) ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Red Flag Detection Questions */}
              <TabsContent value="red_flags" className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">Red Flag Detection Questions</p>
                      <p className="text-yellow-700">
                        These questions are designed to uncover potential issues while maintaining a positive tone.
                        Use them strategically and pay attention to responses that seem evasive or concerning.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {getFilteredQuestions(questionsData.questions.redFlagDetection).map((question) => (
                    <Card key={question.id} className="border-yellow-200">
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getPriorityColor(question.priority)}>
                                  {question.priority} priority
                                </Badge>
                                <Badge variant="outline">{question.stage}</Badge>
                                <Badge variant="destructive" className="text-xs">
                                  Red Flag Detection
                                </Badge>
                                <div className={`text-sm font-medium ${getEffectivenessColor(question.effectiveness)}`}>
                                  {question.effectiveness}/10 effectiveness
                                </div>
                              </div>
                              <p className="font-medium text-lg mb-2">{question.question}</p>
                              <p className="text-sm text-gray-600 mb-3">{question.purpose}</p>

                              {question.followUp && question.followUp.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-sm font-medium text-blue-700 mb-1">Follow-up questions:</p>
                                  <ul className="space-y-1">
                                    {question.followUp.map((followUp, index) => (
                                      <li key={index} className="text-sm text-blue-600 flex items-start gap-2">
                                        <HelpCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                        {followUp}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-1">
                                {question.tags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(question.question, question.id)}
                              className="ml-4"
                            >
                              {copiedQuestions.has(question.id) ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Custom Questions */}
              <TabsContent value="custom" className="space-y-4">
                {questionsData.questions.customGenerated.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No custom questions generated yet</p>
                    <p className="text-sm">Use the custom question generator above to create targeted questions based on your specific concerns</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questionsData.questions.customGenerated.map((question) => (
                      <Card key={question.id} className="border-purple-200">
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="text-purple-600 bg-purple-100">
                                    Custom Generated
                                  </Badge>
                                  <Badge variant="outline">{question.stage}</Badge>
                                  <div className={`text-sm font-medium ${getEffectivenessColor(question.effectiveness)}`}>
                                    {question.effectiveness}/10 effectiveness
                                  </div>
                                </div>
                                <p className="font-medium text-lg mb-2">{question.question}</p>
                                <p className="text-sm text-gray-600 mb-3">{question.purpose}</p>

                                {question.followUp && question.followUp.length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-sm font-medium text-blue-700 mb-1">Follow-up questions:</p>
                                    <ul className="space-y-1">
                                      {question.followUp.map((followUp, index) => (
                                        <li key={index} className="text-sm text-blue-600 flex items-start gap-2">
                                          <HelpCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                          {followUp}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-1">
                                  {question.tags.map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(question.question, question.id)}
                                className="ml-4"
                              >
                                {copiedQuestions.has(question.id) ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Questioning Strategy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Questioning Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Recommended Approach</h4>
                  <p className="text-sm text-gray-700">{questionsData.questioningStrategy.approach}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Key Focus Areas</h4>
                    <ul className="space-y-1">
                      {questionsData.questioningStrategy.keyAreas.map((area, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <Target className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Priorities</h4>
                    <ul className="space-y-1">
                      {questionsData.questioningStrategy.priorities.map((priority, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <Award className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {priority}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Timing Strategy</h4>
                  <ul className="space-y-1">
                    {questionsData.questioningStrategy.timing.map((timing, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <Clock className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0" />
                        {timing}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {questionsData && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Questions generated: {new Date(questionsData.generatedAt).toLocaleDateString()}</span>
            <span>
              Total questions: {
                Object.values(questionsData.questions).reduce((total, questions) => total + questions.length, 0)
              }
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}