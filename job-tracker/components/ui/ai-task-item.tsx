/**
 * AI Task Item Component
 * Individual task display in the AI Activity dropdown
 */

'use client';

import React from 'react';
import { Clock, RefreshCw, CheckCircle, XCircle, Zap } from 'lucide-react';
import { AITask, AITaskStatus, AITaskType } from '@/lib/services/ai-task-tracker';
import { formatDistanceToNow } from 'date-fns';

interface AITaskItemProps {
  task: AITask;
  onClick: () => void;
}

export function AITaskItem({ task, onClick }: AITaskItemProps) {
  const getStatusIcon = () => {
    switch (task.status) {
      case AITaskStatus.PENDING:
        return <Clock className="w-4 h-4 text-gray-400" />;
      case AITaskStatus.PROCESSING:
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case AITaskStatus.COMPLETED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case AITaskStatus.CACHED:
        return <Zap className="w-4 h-4 text-purple-500" />;
      case AITaskStatus.FAILED:
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getTaskLabel = () => {
    const typeLabels: Record<AITaskType, string> = {
      [AITaskType.JOB_EXTRACTION]: 'Extracting job',
      [AITaskType.SALARY_ANALYSIS]: 'Salary analysis',
      [AITaskType.LOCATION_ANALYSIS]: 'Location analysis',
      [AITaskType.APPLICATION_STRATEGY]: 'Application strategy',
      [AITaskType.RESUME_OPTIMIZATION]: 'Resume optimization',
      [AITaskType.MATCH_CALCULATION]: 'Match calculation',
      [AITaskType.INTERVIEW_ANALYSIS]: 'Interview analysis',
      [AITaskType.NETWORK_ANALYSIS]: 'Network analysis',
      [AITaskType.INSIDER_INTELLIGENCE]: 'Insider intelligence',
      [AITaskType.TIMELINE_ANALYSIS]: 'Timeline analysis',
      [AITaskType.COMPANY_INTELLIGENCE]: 'Company intelligence',
      [AITaskType.CULTURE_ANALYSIS]: 'Culture analysis',
      [AITaskType.COMPETITIVE_ANALYSIS]: 'Competitive analysis',
      [AITaskType.INTERVIEW_PIPELINE]: 'Interview pipeline',
      [AITaskType.INTERVIEW_COACHING]: 'Interview coaching',
      [AITaskType.SMART_QUESTIONS]: 'Smart questions',
      [AITaskType.OUTREACH_GENERATION]: 'Outreach generation',
      [AITaskType.COMMUNICATION_GENERATION]: 'Communication generation',
    };
    return typeLabels[task.type] || task.type;
  };

  const formatRelativeTime = (date: Date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'just now';
    }
  };

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {/* Status Icon */}
      <div className="mt-0.5 flex-shrink-0">{getStatusIcon()}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm truncate">{getTaskLabel()}</p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(task.createdAt)}
          </span>
        </div>

        {task.jobTitle && (
          <p className="text-xs text-muted-foreground truncate">
            {task.jobTitle} at {task.company}
          </p>
        )}

        {task.currentStep && task.status === AITaskStatus.PROCESSING && (
          <p className="text-xs text-blue-600 mt-1">{task.currentStep}</p>
        )}

        {task.error && task.status === AITaskStatus.FAILED && (
          <p className="text-xs text-red-600 mt-1 truncate" title={task.error}>
            {task.error}
          </p>
        )}

        {/* Progress Bar */}
        {task.status === AITaskStatus.PROCESSING && task.progress > 0 && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
