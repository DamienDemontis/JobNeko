/**
 * Unified Interview Center - Simplified
 * Focus on AI Interview Practice Coach only
 * Removed: Interview Pipeline, Company Interview Analysis (too complex, not valuable)
 */

"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Brain
} from 'lucide-react';
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
  userId,
  jobData
}: UnifiedInterviewCenterProps) {
  return (
    <div className="space-y-6">
      {/* Interview Coach */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Interview Practice Coach
          </CardTitle>
          <CardDescription>
            AI-powered interview practice for {jobData.company} - {jobData.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InterviewCoach
            jobId={jobId}
            userId={userId}
            jobData={jobData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
