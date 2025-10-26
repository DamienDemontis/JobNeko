/**
 * Unified Interview Center
 * Consolidates Interview Pipeline, Company Analysis, and Coaching into one interface
 */

"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Brain,
  Building2,
  TrendingUp,
  Star,
  Award,
  Play,
  RotateCcw,
  Code
} from 'lucide-react';

// Import the individual components
import InterviewPipelineManagerSmart from './interview-pipeline-manager-smart';
import { CompanyInterviewAnalysis } from './company-interview-analysis';
import { InterviewCoach } from './interview-coach';

interface UnifiedInterviewCenterProps {
  jobId: string;
  jobTitle: string;
  company: string;
  userId: string;
  token: string;
  jobData: {
    title: string;
    company: string;
    description: string;
    requirements: string;
  };
}

export function UnifiedInterviewCenter({
  jobId,
  jobTitle,
  company,
  userId,
  token,
  jobData
}: UnifiedInterviewCenterProps) {
  const [activeSection, setActiveSection] = useState('overview');

  // Quick stats for the overview
  const quickStats = [
    {
      icon: <Calendar className="h-5 w-5 text-blue-600" />,
      label: "Interview Pipeline",
      description: "Track your interview stages",
      action: "Manage Pipeline",
      section: "pipeline"
    },
    {
      icon: <Building2 className="h-5 w-5 text-purple-600" />,
      label: "Company Insights",
      description: "Interview experiences & tips",
      action: "View Insights",
      section: "company"
    },
    {
      icon: <Brain className="h-5 w-5 text-green-600" />,
      label: "Practice Coach",
      description: "AI-powered interview practice",
      action: "Start Practice",
      section: "coach"
    }
  ];

  if (activeSection !== 'overview') {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Interview Preparation - {company}
              </CardTitle>
              <CardDescription>
                {activeSection === 'pipeline' && 'Manage your interview pipeline and timeline'}
                {activeSection === 'company' && 'Company-specific interview insights and experiences'}
                {activeSection === 'coach' && 'AI-powered interview practice and coaching'}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setActiveSection('overview')}
            >
              ← Back to Overview
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeSection === 'pipeline' && (
            <InterviewPipelineManagerSmart
              jobId={jobId}
              jobTitle={jobTitle}
              company={company}
              userId={userId}
              token={token}
            />
          )}
          {activeSection === 'company' && (
            <CompanyInterviewAnalysis
              companyName={company}
              jobTitle={jobTitle}
              userId={userId}
            />
          )}
          {activeSection === 'coach' && (
            <InterviewCoach
              jobId={jobId}
              userId={userId}
              jobData={jobData}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Interview Preparation Center
        </CardTitle>
        <CardDescription>
          Comprehensive interview preparation for {company} - {jobTitle}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Access Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickStats.map((stat, index) => (
            <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  {stat.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{stat.label}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {stat.description}
                  </p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setActiveSection(stat.section)}
                  >
                    {stat.action}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Interview Preparation Checklist */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Interview Preparation Checklist
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-blue-500"></div>
              <span className="text-sm">Set up interview pipeline tracking</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSection('pipeline')}
                className="ml-auto"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Manage
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-purple-500"></div>
              <span className="text-sm">Research company interview process</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSection('company')}
                className="ml-auto"
              >
                <Building2 className="h-3 w-3 mr-1" />
                Research
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-green-500"></div>
              <span className="text-sm">Practice with AI interview coach</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSection('coach')}
                className="ml-auto"
              >
                <Brain className="h-3 w-3 mr-1" />
                Practice
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-700">
            <Lightbulb className="h-4 w-4" />
            Interview Success Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-600">
            <div className="flex items-start gap-2">
              <Star className="h-3 w-3 mt-1 flex-shrink-0" />
              <span>Use the STAR method for behavioral questions</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-3 w-3 mt-1 flex-shrink-0" />
              <span>Practice timing - aim for 2-3 minute responses</span>
            </div>
            <div className="flex items-start gap-2">
              <MessageSquare className="h-3 w-3 mt-1 flex-shrink-0" />
              <span>Prepare thoughtful questions about the role</span>
            </div>
            <div className="flex items-start gap-2">
              <Target className="h-3 w-3 mt-1 flex-shrink-0" />
              <span>Research the company's recent news and values</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3">
          <Button
            onClick={() => setActiveSection('pipeline')}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Start Interview Tracking
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveSection('coach')}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Begin Practice Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}