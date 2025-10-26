"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Brain,
  FileText,
  Play,
  Plus,
  ChevronDown,
  Target,
  Lightbulb,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';
import { enhancedUserContextClient } from '@/lib/services/enhanced-user-context-client';
import { webIntelligenceService } from '@/lib/services/web-intelligence';

interface InterviewStage {
  id: string;
  type: 'phone_screening' | 'technical' | 'behavioral' | 'panel' | 'final' | 'custom';
  title: string;
  description: string;
  status: 'scheduled' | 'completed' | 'pending' | 'cancelled';
  scheduledDate?: Date;
  duration: number; // minutes
  interviewers: InterviewerInfo[];
  location: string; // in-person, zoom, teams, etc.
  requirements: string[];
  notes: string;
  preparation: InterviewPreparation;
  feedback?: InterviewFeedback;
}

interface InterviewerInfo {
  name: string;
  title: string;
  linkedIn?: string;
  background?: string;
  interviewStyle?: string;
  focusAreas: string[];
}

interface InterviewPreparation {
  aiGenerated: boolean;
  keyTopics: string[];
  techQuestions: TechnicalQuestion[];
  behavioralQuestions: BehavioralQuestion[];
  companyQuestions: string[];
  questionsToAsk: string[];
  researchPoints: string[];
  practiceAreas: string[];
  timeAllocation: { [activity: string]: number };
}

interface TechnicalQuestion {
  category: string;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  concepts: string[];
  hint?: string;
  sampleAnswer?: string;
}

interface BehavioralQuestion {
  category: string;
  question: string;
  starMethod: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  keyPoints: string[];
}

interface InterviewFeedback {
  overall: 'poor' | 'fair' | 'good' | 'excellent';
  technicalStrength: number; // 1-10
  communicationStrength: number;
  culturalFit: number;
  strengths: string[];
  improvementAreas: string[];
  nextSteps: string;
  interviwerNotes: string;
}

interface InterviewInsights {
  processAnalysis: {
    typicalStages: string[];
    averageDuration: string;
    successFactors: string[];
    commonChallenges: string[];
  };
  companySpecific: {
    interviewStyle: string;
    cultureEmphasis: string[];
    typicalQuestions: string[];
    decisionTimeframe: string;
  };
  preparation: {
    priorityTopics: string[];
    timeAllocation: { [activity: string]: number };
    resourceRecommendations: string[];
  };
}

interface InterviewPipelineManagerProps {
  jobId: string;
  userId: string;
  jobData: {
    title: string;
    company: string;
    description: string;
    requirements: string;
  };
}

export function InterviewPipelineManager({ jobId, userId, jobData }: InterviewPipelineManagerProps) {
  const [stages, setStages] = useState<InterviewStage[]>([]);
  const [insights, setInsights] = useState<InterviewInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [newStageType, setNewStageType] = useState<string>("phone_screening");
  const [error, setError] = useState<string | null>(null);

  const generateInterviewPipeline = async () => {
    if (!jobData.title || !jobData.company) {
      setError('Job title and company are required for pipeline generation');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [userContext, companyIntel] = await Promise.all([
        enhancedUserContextClient.buildEnhancedContext(),
        webIntelligenceService.getCompanyIntelligence(jobData.company, userId)
      ]);

      const pipelinePrompt = `
You are an expert interview strategist. Generate a comprehensive interview pipeline and preparation strategy.

JOB INFORMATION:
Title: ${jobData.title}
Company: ${jobData.company}
Description: ${jobData.description}
Requirements: ${jobData.requirements}

USER CONTEXT:
Experience Level: ${userContext.experienceLevel || 'Not specified'}
Key Skills: ${userContext.professionalProfile.skills?.join(', ') || 'Not specified'}
Industry Focus: ${userContext.industryFocus?.join(', ') || 'Not specified'}
Current Role: ${userContext.profile.currentRole || 'Not specified'}
Years Experience: ${userContext.professionalProfile.yearsOfExperience}

COMPANY INTELLIGENCE:
Industry: ${companyIntel.industry}
Business Model: ${companyIntel.businessModel}
Employee Count: ${companyIntel.teamComposition.totalEmployees}
Founded: ${companyIntel.foundedYear || 'Unknown'}
Financial Health: ${companyIntel.financialData.financialHealth}

Generate a comprehensive interview pipeline including:

1. TYPICAL INTERVIEW STAGES for this role and company
2. DETAILED PREPARATION for each stage
3. COMPANY-SPECIFIC INSIGHTS
4. TECHNICAL AND BEHAVIORAL QUESTIONS
5. INTERVIEWER RESEARCH POINTS

Return a JSON object with this exact structure:
{
  "stages": [
    {
      "id": "stage_1",
      "type": "phone_screening|technical|behavioral|panel|final",
      "title": "Stage title",
      "description": "Stage description",
      "status": "pending",
      "duration": 30,
      "interviewers": [
        {
          "name": "Expected interviewer or role",
          "title": "Their title",
          "background": "Background info",
          "interviewStyle": "Style description",
          "focusAreas": ["area1", "area2"]
        }
      ],
      "location": "video/phone/onsite",
      "requirements": ["requirement1", "requirement2"],
      "notes": "Additional notes",
      "preparation": {
        "aiGenerated": true,
        "keyTopics": ["topic1", "topic2"],
        "techQuestions": [
          {
            "category": "algorithms",
            "question": "Technical question",
            "difficulty": "medium",
            "concepts": ["concept1", "concept2"],
            "hint": "Helpful hint",
            "sampleAnswer": "Example approach"
          }
        ],
        "behavioralQuestions": [
          {
            "category": "leadership",
            "question": "Behavioral question",
            "starMethod": {
              "situation": "Example situation",
              "task": "Task description",
              "action": "Action taken",
              "result": "Result achieved"
            },
            "keyPoints": ["point1", "point2"]
          }
        ],
        "companyQuestions": ["company question1", "company question2"],
        "questionsToAsk": ["question1", "question2"],
        "researchPoints": ["research1", "research2"],
        "practiceAreas": ["area1", "area2"],
        "timeAllocation": {"technical_prep": 120, "behavioral_prep": 60, "company_research": 45}
      }
    }
  ],
  "insights": {
    "processAnalysis": {
      "typicalStages": ["Phone Screen", "Technical", "Panel", "Final"],
      "averageDuration": "2-3 weeks",
      "successFactors": ["factor1", "factor2"],
      "commonChallenges": ["challenge1", "challenge2"]
    },
    "companySpecific": {
      "interviewStyle": "style description",
      "cultureEmphasis": ["emphasis1", "emphasis2"],
      "typicalQuestions": ["question1", "question2"],
      "decisionTimeframe": "1-2 weeks"
    },
    "preparation": {
      "priorityTopics": ["topic1", "topic2"],
      "timeAllocation": {"study": 180, "practice": 120, "research": 60},
      "resourceRecommendations": ["resource1", "resource2"]
    }
  }
}

REQUIREMENTS:
- Generate 3-5 realistic interview stages based on role level and company size
- Include specific technical questions relevant to the job requirements
- Provide STAR method examples for behavioral questions
- Include company-specific preparation points
- Suggest realistic timeframes and preparation hours
- Tailor difficulty to user's experience level
- Include questions the candidate should ask interviewers
- Provide specific research points about the company and role
`;

      const response = await aiServiceManagerClient.generateCompletion(
        pipelinePrompt,
        'interview_prep',
        userId,
        { temperature: 0.3, max_tokens: 4000 }
      );

      const pipelineData = JSON.parse(response.content);

      // Process dates if any scheduled dates exist
      const processedStages = pipelineData.stages.map((stage: any) => ({
        ...stage,
        scheduledDate: stage.scheduledDate ? new Date(stage.scheduledDate) : undefined
      }));

      setStages(processedStages);
      setInsights(pipelineData.insights);

    } catch (error) {
      console.error('Error generating interview pipeline:', error);
      setError(error instanceof Error ? error.message : 'Pipeline generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomStage = () => {
    const newStage: InterviewStage = {
      id: `custom_${Date.now()}`,
      type: newStageType as any,
      title: `New ${newStageType.replace('_', ' ')} Interview`,
      description: 'Custom interview stage',
      status: 'pending',
      duration: 60,
      interviewers: [],
      location: 'video',
      requirements: [],
      notes: '',
      preparation: {
        aiGenerated: false,
        keyTopics: [],
        techQuestions: [],
        behavioralQuestions: [],
        companyQuestions: [],
        questionsToAsk: [],
        researchPoints: [],
        practiceAreas: [],
        timeAllocation: {}
      }
    };

    setStages([...stages, newStage]);
  };

  const updateStageStatus = (stageId: string, status: InterviewStage['status']) => {
    setStages(stages.map(stage =>
      stage.id === stageId ? { ...stage, status } : stage
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStageIcon = (type: string) => {
    switch (type) {
      case 'phone_screening': return <Clock className="h-4 w-4" />;
      case 'technical': return <Brain className="h-4 w-4" />;
      case 'behavioral': return <MessageSquare className="h-4 w-4" />;
      case 'panel': return <Users className="h-4 w-4" />;
      case 'final': return <Target className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getTotalPrepTime = (preparation: InterviewPreparation) => {
    return Object.values(preparation.timeAllocation).reduce((total, time) => total + time, 0);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Interview Pipeline Manager
        </CardTitle>
        <CardDescription>
          AI-powered interview preparation and pipeline tracking for strategic success
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!stages.length && !isLoading && (
          <div className="text-center py-8">
            <Button
              onClick={generateInterviewPipeline}
              className="w-full max-w-md"
              disabled={isLoading}
            >
              <Brain className="h-4 w-4 mr-2" />
              Generate AI Interview Pipeline
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">
              Generating personalized interview strategy...
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 border border-red-200 rounded-md bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={generateInterviewPipeline}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Retry Generation
            </Button>
          </div>
        )}

        {stages.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pipeline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="preparation" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Preparation
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Insights
              </TabsTrigger>
            </TabsList>

            {/* Pipeline Tab */}
            <TabsContent value="pipeline" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Interview Stages</h3>
                <div className="flex items-center gap-2">
                  <Select value={newStageType} onValueChange={setNewStageType}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone_screening">Phone Screen</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                      <SelectItem value="panel">Panel</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addCustomStage} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Stage
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {stages.map((stage, index) => (
                  <div key={stage.id} className="border rounded-lg">
                    <Collapsible
                      open={expandedStage === stage.id}
                      onOpenChange={(open) => setExpandedStage(open ? stage.id : null)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                              {getStageIcon(stage.type)}
                            </div>
                            <div>
                              <h4 className="font-medium">{stage.title}</h4>
                              <p className="text-sm text-gray-600">{stage.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={`${getStatusColor(stage.status)} border`}>
                              {stage.status.replace('_', ' ')}
                            </Badge>
                            <span className="text-sm text-gray-500">{stage.duration}min</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-4 pb-4 border-t bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <div>
                              <h5 className="font-medium mb-2">Details</h5>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium">Location:</span> {stage.location}
                                </div>
                                {stage.scheduledDate && (
                                  <div>
                                    <span className="font-medium">Scheduled:</span> {stage.scheduledDate.toLocaleString()}
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <span className="font-medium">Status:</span>
                                  <Select
                                    value={stage.status}
                                    onValueChange={(value) => updateStageStatus(stage.id, value as any)}
                                  >
                                    <SelectTrigger className="w-32 h-6 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="scheduled">Scheduled</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                      <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h5 className="font-medium mb-2">Preparation</h5>
                              <div className="text-sm space-y-1">
                                <div>
                                  <span className="font-medium">Prep Time:</span> {getTotalPrepTime(stage.preparation)} min
                                </div>
                                <div>
                                  <span className="font-medium">Key Topics:</span> {stage.preparation.keyTopics.length}
                                </div>
                                <div>
                                  <span className="font-medium">Questions:</span> {stage.preparation.techQuestions.length + stage.preparation.behavioralQuestions.length}
                                </div>
                              </div>
                            </div>
                          </div>

                          {stage.interviewers.length > 0 && (
                            <div className="mt-4">
                              <h5 className="font-medium mb-2">Interviewers</h5>
                              <div className="space-y-2">
                                {stage.interviewers.map((interviewer, idx) => (
                                  <div key={idx} className="p-2 bg-white rounded border text-sm">
                                    <div className="font-medium">{interviewer.name}</div>
                                    <div className="text-gray-600">{interviewer.title}</div>
                                    {interviewer.focusAreas.length > 0 && (
                                      <div className="mt-1">
                                        <span className="text-xs font-medium">Focus: </span>
                                        <span className="text-xs">{interviewer.focusAreas.join(', ')}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {stage.requirements.length > 0 && (
                            <div className="mt-4">
                              <h5 className="font-medium mb-2">Requirements</h5>
                              <ul className="text-sm space-y-1">
                                {stage.requirements.map((req, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                    {req}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Preparation Tab */}
            <TabsContent value="preparation" className="space-y-6">
              {stages.map((stage) => (
                <Card key={stage.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getStageIcon(stage.type)}
                      {stage.title} Preparation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Technical Questions */}
                    {stage.preparation.techQuestions.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Technical Questions</h4>
                        <div className="space-y-3">
                          {stage.preparation.techQuestions.map((q, idx) => (
                            <div key={idx} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {q.category}
                                </Badge>
                                <Badge variant={q.difficulty === 'hard' ? 'destructive' : q.difficulty === 'medium' ? 'default' : 'secondary'}>
                                  {q.difficulty}
                                </Badge>
                              </div>
                              <p className="font-medium text-sm mb-2">{q.question}</p>
                              {q.concepts.length > 0 && (
                                <div className="mb-2">
                                  <span className="text-xs font-medium">Concepts: </span>
                                  <span className="text-xs text-gray-600">{q.concepts.join(', ')}</span>
                                </div>
                              )}
                              {q.hint && (
                                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                  <strong>Hint:</strong> {q.hint}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Behavioral Questions */}
                    {stage.preparation.behavioralQuestions.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Behavioral Questions</h4>
                        <div className="space-y-3">
                          {stage.preparation.behavioralQuestions.map((q, idx) => (
                            <div key={idx} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {q.category}
                                </Badge>
                              </div>
                              <p className="font-medium text-sm mb-3">{q.question}</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div className="bg-yellow-50 p-2 rounded">
                                  <strong>Situation:</strong> {q.starMethod.situation}
                                </div>
                                <div className="bg-blue-50 p-2 rounded">
                                  <strong>Task:</strong> {q.starMethod.task}
                                </div>
                                <div className="bg-green-50 p-2 rounded">
                                  <strong>Action:</strong> {q.starMethod.action}
                                </div>
                                <div className="bg-purple-50 p-2 rounded">
                                  <strong>Result:</strong> {q.starMethod.result}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Questions to Ask */}
                    {stage.preparation.questionsToAsk.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Questions to Ask Interviewers</h4>
                        <ul className="space-y-2">
                          {stage.preparation.questionsToAsk.map((q, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Target className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Research Points */}
                    {stage.preparation.researchPoints.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Research Points</h4>
                        <ul className="space-y-2">
                          {stage.preparation.researchPoints.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Lightbulb className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="space-y-6">
              {insights && (
                <>
                  {/* Process Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Interview Process Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Typical Stages</h4>
                          <ul className="text-sm space-y-1">
                            {insights.processAnalysis.typicalStages.map((stage, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                {stage}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Success Factors</h4>
                          <ul className="text-sm space-y-1">
                            {insights.processAnalysis.successFactors.map((factor, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Target className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                                {factor}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Average Duration</h4>
                        <p className="text-sm text-gray-600">{insights.processAnalysis.averageDuration}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Company-Specific Insights */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Company-Specific Intelligence</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Interview Style</h4>
                        <p className="text-sm text-gray-700">{insights.companySpecific.interviewStyle}</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Cultural Emphasis</h4>
                        <div className="flex flex-wrap gap-2">
                          {insights.companySpecific.cultureEmphasis.map((emphasis, idx) => (
                            <Badge key={idx} variant="secondary">{emphasis}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Decision Timeframe</h4>
                        <p className="text-sm text-gray-600">{insights.companySpecific.decisionTimeframe}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Preparation Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Preparation Strategy</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Priority Topics</h4>
                        <div className="flex flex-wrap gap-2">
                          {insights.preparation.priorityTopics.map((topic, idx) => (
                            <Badge key={idx} variant="outline" className="bg-blue-50">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Time Allocation</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(insights.preparation.timeAllocation).map(([activity, time]) => (
                            <div key={activity} className="p-2 bg-gray-50 rounded text-center">
                              <div className="text-lg font-semibold text-blue-600">{time}min</div>
                              <div className="text-xs text-gray-600 capitalize">{activity.replace('_', ' ')}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Recommended Resources</h4>
                        <ul className="space-y-1">
                          {insights.preparation.resourceRecommendations.map((resource, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <BookOpen className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                              {resource}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        {stages.length > 0 && (
          <div className="flex justify-between">
            <Button
              onClick={generateInterviewPipeline}
              variant="outline"
              disabled={isLoading}
            >
              <Brain className="h-4 w-4 mr-2" />
              Regenerate Pipeline
            </Button>
            <div className="text-sm text-gray-500">
              Total Stages: {stages.length} |
              Completed: {stages.filter(s => s.status === 'completed').length}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}