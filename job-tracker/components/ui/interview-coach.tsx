"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play,
  Pause,
  RotateCcw,
  Brain,
  MessageSquare,
  Code,
  Users,
  Target,
  Award,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react';
import { aiServiceManagerClient } from '@/lib/services/ai-service-manager-client';
import { enhancedUserContextClient } from '@/lib/services/enhanced-user-context-client';

interface CoachingQuestion {
  id: string;
  type: 'behavioral' | 'technical' | 'situational' | 'system_design';
  category: string;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  expectedDuration: number; // minutes
  keywords: string[];
  evaluationCriteria: string[];
  hints: string[];
  sampleFramework?: string;
}

interface CoachingResponse {
  questionId: string;
  userResponse: string;
  responseTime: number; // seconds
  submittedAt: Date;
  evaluation: ResponseEvaluation;
}

interface ResponseEvaluation {
  overallScore: number; // 1-10
  breakdown: {
    clarity: number;
    completeness: number;
    relevance: number;
    structure: number;
    confidence: number;
  };
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  followUpQuestions: string[];
  keywordsUsed: string[];
  missingKeywords: string[];
}

interface CoachingSession {
  id: string;
  sessionType: 'mock_interview' | 'practice_drill' | 'skill_focus';
  questions: CoachingQuestion[];
  responses: CoachingResponse[];
  startedAt: Date;
  completedAt?: Date;
  overallFeedback?: SessionFeedback;
}

interface SessionFeedback {
  overallPerformance: number; // 1-10
  readiness: 'not_ready' | 'needs_practice' | 'ready' | 'well_prepared';
  keyStrengths: string[];
  priorityImprovements: string[];
  recommendedPractice: string[];
  nextSteps: string[];
}

interface InterviewCoachProps {
  jobId: string;
  userId: string;
  jobData: {
    title: string;
    company: string;
    description: string;
    requirements: string;
  };
}

export function InterviewCoach({ jobId, userId, jobData }: InterviewCoachProps) {
  const [currentSession, setCurrentSession] = useState<CoachingSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionType, setSessionType] = useState<string>('mock_interview');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("coach");

  const generateCoachingQuestions = async (type: string, difficultyLevel: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const userContext = await enhancedUserContextClient.buildEnhancedContext();

      const questionsPrompt = `
You are an expert interview coach. Generate a set of interview questions for practice.

JOB INFORMATION:
Title: ${jobData.title}
Company: ${jobData.company}
Description: ${jobData.description}
Requirements: ${jobData.requirements}

USER CONTEXT:
Experience Level: ${userContext.experienceLevel || 'Not specified'}
Key Skills: ${userContext.professionalProfile.skills?.join(', ') || 'Not specified'}
Industry Focus: ${userContext.industryFocus?.join(', ') || 'Not specified'}

SESSION TYPE: ${type}
DIFFICULTY: ${difficultyLevel}

Generate appropriate questions based on the session type:
- mock_interview: Mix of behavioral, technical, and situational questions
- practice_drill: Focused technical questions
- skill_focus: Targeted questions for specific skills

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "id": "q1",
      "type": "behavioral|technical|situational|system_design",
      "category": "Leadership|Problem Solving|Technical Skills|etc",
      "question": "The interview question",
      "difficulty": "easy|medium|hard",
      "expectedDuration": 5,
      "keywords": ["keyword1", "keyword2"],
      "evaluationCriteria": ["criteria1", "criteria2"],
      "hints": ["hint1", "hint2"],
      "sampleFramework": "Optional framework or structure"
    }
  ]
}

REQUIREMENTS:
- Generate 5-8 questions appropriate for ${difficultyLevel} difficulty
- Include variety of question types for mock interviews
- Tailor questions to ${jobData.title} role requirements
- Include realistic time expectations
- Provide evaluation criteria for each question
- Add helpful hints without giving away answers
- Consider user's experience level: ${userContext.experienceLevel || 'Not specified'}
`;

      const response = await aiServiceManagerClient.generateCompletion(
        questionsPrompt,
        'interview_prep',
        userId,
        { temperature: 0.4, max_tokens: 2500 }
      );

      const questionsData = JSON.parse(response.content);

      const newSession: CoachingSession = {
        id: `session_${Date.now()}`,
        sessionType: type as any,
        questions: questionsData.questions,
        responses: [],
        startedAt: new Date()
      };

      setCurrentSession(newSession);
      setCurrentQuestionIndex(0);
      setTimeRemaining(questionsData.questions[0]?.expectedDuration * 60 || 300);

    } catch (error) {
      console.error('Error generating coaching questions:', error);
      setError(error instanceof Error ? error.message : 'Question generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const evaluateResponse = async (questionId: string, response: string, timeSpent: number) => {
    if (!currentSession) return;

    setIsLoading(true);

    try {
      const question = currentSession.questions.find(q => q.id === questionId);
      if (!question) return;

      const evaluationPrompt = `
You are an expert interview coach evaluating a candidate's response.

QUESTION DETAILS:
Type: ${question.type}
Category: ${question.category}
Question: "${question.question}"
Expected Duration: ${question.expectedDuration} minutes
Keywords: ${question.keywords.join(', ')}
Evaluation Criteria: ${question.evaluationCriteria.join(', ')}

CANDIDATE RESPONSE:
"${response}"

TIME SPENT: ${Math.round(timeSpent / 60)} minutes (expected: ${question.expectedDuration} minutes)

Provide a comprehensive evaluation with this exact JSON structure:
{
  "overallScore": 7,
  "breakdown": {
    "clarity": 8,
    "completeness": 6,
    "relevance": 7,
    "structure": 7,
    "confidence": 8
  },
  "strengths": [
    "Clear communication",
    "Good examples provided"
  ],
  "improvements": [
    "Could be more specific",
    "Missing key technical details"
  ],
  "suggestions": [
    "Try using the STAR method",
    "Include quantifiable results"
  ],
  "followUpQuestions": [
    "Can you elaborate on the technical approach?",
    "What would you do differently next time?"
  ],
  "keywordsUsed": ["keyword1", "keyword2"],
  "missingKeywords": ["keyword3", "keyword4"]
}

EVALUATION CRITERIA:
- Clarity: How well-articulated and understandable was the response?
- Completeness: Did they address all aspects of the question?
- Relevance: How relevant was the response to the question asked?
- Structure: Was the response well-organized and logical?
- Confidence: Did they demonstrate confidence and conviction?

Scores should be 1-10 where:
- 1-3: Poor/Needs significant improvement
- 4-6: Fair/Needs some improvement
- 7-8: Good/Minor improvements needed
- 9-10: Excellent/Interview-ready

Be constructive but honest in feedback.
`;

      const evalResponse = await aiServiceManagerClient.generateCompletion(
        evaluationPrompt,
        'interview_prep',
        userId,
        { temperature: 0.3, max_tokens: 1500 }
      );

      const evaluation = JSON.parse(evalResponse.content);

      const newResponse: CoachingResponse = {
        questionId,
        userResponse: response,
        responseTime: timeSpent,
        submittedAt: new Date(),
        evaluation
      };

      const updatedSession = {
        ...currentSession,
        responses: [...currentSession.responses, newResponse]
      };

      setCurrentSession(updatedSession);
      setShowFeedback(true);

    } catch (error) {
      console.error('Error evaluating response:', error);
      setError('Failed to evaluate response');
    } finally {
      setIsLoading(false);
    }
  };

  const submitResponse = async () => {
    if (!currentSession || !userResponse.trim()) return;

    const currentQuestion = currentSession.questions[currentQuestionIndex];
    const timeSpent = (currentQuestion.expectedDuration * 60) - timeRemaining;

    await evaluateResponse(currentQuestion.id, userResponse, timeSpent);
  };

  const nextQuestion = () => {
    if (!currentSession) return;

    setShowFeedback(false);
    setUserResponse('');

    if (currentQuestionIndex < currentSession.questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setTimeRemaining(currentSession.questions[nextIndex].expectedDuration * 60);
    } else {
      // Session complete
      generateSessionFeedback();
    }
  };

  const generateSessionFeedback = async () => {
    if (!currentSession) return;

    setIsLoading(true);

    try {
      const responses = currentSession.responses;
      const avgScore = responses.reduce((sum, r) => sum + r.evaluation.overallScore, 0) / responses.length;

      const feedbackPrompt = `
Analyze this interview coaching session and provide comprehensive feedback.

SESSION DETAILS:
Type: ${currentSession.sessionType}
Questions Answered: ${responses.length}
Average Score: ${avgScore.toFixed(1)}/10

RESPONSE SCORES:
${responses.map((r, i) => `Q${i + 1}: ${r.evaluation.overallScore}/10 (${r.evaluation.breakdown.clarity}/10 clarity, ${r.evaluation.breakdown.completeness}/10 completeness)`).join('\n')}

ALL STRENGTHS IDENTIFIED:
${responses.flatMap(r => r.evaluation.strengths).join(', ')}

ALL IMPROVEMENT AREAS:
${responses.flatMap(r => r.evaluation.improvements).join(', ')}

Provide overall session feedback with this JSON structure:
{
  "overallPerformance": 7,
  "readiness": "ready|needs_practice|not_ready|well_prepared",
  "keyStrengths": [
    "Consistent clear communication",
    "Good technical knowledge"
  ],
  "priorityImprovements": [
    "Work on providing more specific examples",
    "Practice structuring responses better"
  ],
  "recommendedPractice": [
    "Practice STAR method responses",
    "Mock technical deep-dives"
  ],
  "nextSteps": [
    "Schedule follow-up session in 1 week",
    "Focus on system design questions"
  ]
}

READINESS LEVELS:
- well_prepared: 8.5+ average, ready for interviews
- ready: 7-8.4 average, minor polish needed
- needs_practice: 5-6.9 average, significant practice needed
- not_ready: <5 average, substantial preparation required
`;

      const feedbackResponse = await aiServiceManagerClient.generateCompletion(
        feedbackPrompt,
        'interview_prep',
        userId,
        { temperature: 0.3, max_tokens: 1000 }
      );

      const sessionFeedback = JSON.parse(feedbackResponse.content);

      const completedSession = {
        ...currentSession,
        completedAt: new Date(),
        overallFeedback: sessionFeedback
      };

      setCurrentSession(completedSession);

    } catch (error) {
      console.error('Error generating session feedback:', error);
      setError('Failed to generate session feedback');
    } finally {
      setIsLoading(false);
    }
  };

  const startNewSession = () => {
    setCurrentSession(null);
    setCurrentQuestionIndex(0);
    setUserResponse('');
    setShowFeedback(false);
    setError(null);
  };

  const getCurrentQuestion = () => {
    if (!currentSession) return null;
    return currentSession.questions[currentQuestionIndex];
  };

  const getReadinessColor = (readiness: string) => {
    switch (readiness) {
      case 'well_prepared': return 'text-green-700 bg-green-100';
      case 'ready': return 'text-blue-700 bg-blue-100';
      case 'needs_practice': return 'text-yellow-700 bg-yellow-100';
      case 'not_ready': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && currentSession && !showFeedback) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining, currentSession, showFeedback]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Interview Coach
        </CardTitle>
        <CardDescription>
          Personalized interview practice with real-time feedback and improvement recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!currentSession && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="coach">Start Practice</TabsTrigger>
              <TabsTrigger value="history">Practice History</TabsTrigger>
            </TabsList>

            <TabsContent value="coach" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Session Type</label>
                  <Select value={sessionType} onValueChange={setSessionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mock_interview">Full Mock Interview</SelectItem>
                      <SelectItem value="practice_drill">Technical Practice</SelectItem>
                      <SelectItem value="skill_focus">Behavioral Focus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty Level</label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy - Entry Level</SelectItem>
                      <SelectItem value="medium">Medium - Mid Level</SelectItem>
                      <SelectItem value="hard">Hard - Senior Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => generateCoachingQuestions(sessionType, difficulty)}
                  className="w-full"
                  disabled={isLoading}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Coaching Session
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No practice sessions yet</p>
                <p className="text-sm">Complete your first session to see progress tracking</p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">
              Generating personalized coaching session...
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 border border-red-200 rounded-md bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={startNewSession}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Active Session */}
        {currentSession && !currentSession.completedAt && (
          <div className="space-y-6">
            {/* Session Progress */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="outline">
                  Question {currentQuestionIndex + 1} of {currentSession.questions.length}
                </Badge>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">
                    {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
              <Button onClick={startNewSession} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                New Session
              </Button>
            </div>

            <Progress value={(currentQuestionIndex / currentSession.questions.length) * 100} />

            {!showFeedback && getCurrentQuestion() && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {getCurrentQuestion()!.type === 'behavioral' && <MessageSquare className="h-5 w-5" />}
                      {getCurrentQuestion()!.type === 'technical' && <Code className="h-5 w-5" />}
                      {getCurrentQuestion()!.type === 'situational' && <Users className="h-5 w-5" />}
                      {getCurrentQuestion()!.category}
                    </CardTitle>
                    <Badge variant={getCurrentQuestion()!.difficulty === 'hard' ? 'destructive' :
                                  getCurrentQuestion()!.difficulty === 'medium' ? 'default' : 'secondary'}>
                      {getCurrentQuestion()!.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="font-medium">{getCurrentQuestion()!.question}</p>
                  </div>

                  {getCurrentQuestion()!.hints.length > 0 && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Hints:</p>
                          <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                            {getCurrentQuestion()!.hints.map((hint, index) => (
                              <li key={index}>• {hint}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <Textarea
                    value={userResponse}
                    onChange={(e) => setUserResponse(e.target.value)}
                    placeholder="Type your response here..."
                    className="min-h-32"
                  />

                  <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsRecording(!isRecording)}
                      >
                        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        {isRecording ? 'Stop' : 'Record'}
                      </Button>
                    </div>
                    <Button
                      onClick={submitResponse}
                      disabled={!userResponse.trim() || isLoading}
                    >
                      Submit Response
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Response Feedback */}
            {showFeedback && currentSession.responses[currentQuestionIndex] && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Response Evaluation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const response = currentSession.responses[currentQuestionIndex];
                    const eval_ = response.evaluation;
                    return (
                      <>
                        {/* Overall Score */}
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-3xl font-bold text-blue-600">{eval_.overallScore}/10</div>
                          <p className="text-sm text-blue-700">Overall Score</p>
                        </div>

                        {/* Breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          {Object.entries(eval_.breakdown).map(([key, value]) => (
                            <div key={key} className="text-center">
                              <div className="text-lg font-semibold">{value}/10</div>
                              <p className="text-xs text-gray-600 capitalize">{key}</p>
                            </div>
                          ))}
                        </div>

                        {/* Strengths & Improvements */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Strengths
                            </h4>
                            <ul className="space-y-1">
                              {eval_.strengths.map((strength, index) => (
                                <li key={index} className="text-sm flex items-start gap-2">
                                  <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                  {strength}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-medium text-yellow-700 mb-2 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Improvements
                            </h4>
                            <ul className="space-y-1">
                              {eval_.improvements.map((improvement, index) => (
                                <li key={index} className="text-sm flex items-start gap-2">
                                  <AlertCircle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                  {improvement}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Suggestions */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Suggestions
                          </h4>
                          <ul className="space-y-1">
                            {eval_.suggestions.map((suggestion, index) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <Lightbulb className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex justify-between">
                          <Button variant="outline" onClick={startNewSession}>
                            End Session
                          </Button>
                          <Button onClick={nextQuestion}>
                            {currentQuestionIndex < currentSession.questions.length - 1 ? 'Next Question' : 'Complete Session'}
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Session Complete */}
        {currentSession?.completedAt && currentSession.overallFeedback && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Session Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {currentSession.overallFeedback.overallPerformance}/10
                </div>
                <Badge className={getReadinessColor(currentSession.overallFeedback.readiness)}>
                  {currentSession.overallFeedback.readiness.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Key Strengths
                  </h4>
                  <ul className="space-y-2">
                    {currentSession.overallFeedback.keyStrengths.map((strength, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-yellow-700 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Priority Improvements
                  </h4>
                  <ul className="space-y-2">
                    {currentSession.overallFeedback.priorityImprovements.map((improvement, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <Target className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Recommended Practice
                </h4>
                <ul className="space-y-2">
                  {currentSession.overallFeedback.recommendedPractice.map((practice, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <TrendingUp className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      {practice}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-3">Next Steps</h4>
                <ul className="space-y-2">
                  {currentSession.overallFeedback.nextSteps.map((step, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              <Button onClick={startNewSession} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Start New Session
              </Button>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}