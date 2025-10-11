/**
 * AI Activity Dropdown
 * Dropdown showing all AI tasks with status and navigation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenuContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Trash2 } from 'lucide-react';
import { AITask } from '@/lib/services/ai-task-tracker';
import { AITaskItem } from './ai-task-item';
import { toast } from 'sonner';

export function AIActivityDropdown() {
  const router = useRouter();
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    fetchTasks();

    if (!showCompleted) {
      let eventSource: EventSource | null = null;
      let reconnectTimeout: NodeJS.Timeout | null = null;
      let isSubscribed = true;

      const connectSSE = () => {
        if (!isSubscribed) return;

        // Real-time updates for active tasks only
        eventSource = new EventSource('/api/ai-tasks/stream');

        eventSource.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const activeTasks: AITask[] = JSON.parse(event.data);
            setTasks(activeTasks);
            setIsLoading(false);
          } catch (error) {
            console.error('Error parsing SSE data:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error, reconnecting in 3s...', error);
          eventSource?.close();

          // Reconnect after 3 seconds
          if (isSubscribed) {
            reconnectTimeout = setTimeout(() => {
              console.log('Reconnecting SSE...');
              connectSSE();
            }, 3000);
          }
        };

        eventSource.onopen = () => {
          console.log('SSE connection established');
        };
      };

      // Initial connection
      connectSSE();

      // Handle visibility change (tab switching)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          console.log('Tab hidden, will refresh on return');
        } else {
          console.log('Tab visible, refreshing tasks...');
          // Refresh tasks when tab becomes visible
          fetchTasks();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        isSubscribed = false;
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        eventSource?.close();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [showCompleted]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const endpoint = showCompleted ? '/api/ai-tasks/recent' : '/api/ai-tasks/active';
      const response = await fetch(endpoint);
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskClick = (task: AITask) => {
    const path = task.navigationTab
      ? `${task.navigationPath}?tab=${task.navigationTab}`
      : task.navigationPath;
    router.push(path);
  };

  const toggleView = () => {
    setShowCompleted(!showCompleted);
  };

  const handleCleanup = async () => {
    try {
      setIsCleaningUp(true);
      const response = await fetch('/api/ai-tasks/cleanup', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        if (data.cleanedCount === 0) {
          toast.success('No stuck tasks found');
        } else {
          toast.success(`Cleaned up ${data.cleanedCount} stuck task${data.cleanedCount === 1 ? '' : 's'}`);
        }

        // Refresh the task list
        await fetchTasks();
      } else {
        throw new Error(data.error || 'Cleanup failed');
      }
    } catch (error) {
      console.error('Error cleaning up tasks:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cleanup tasks');
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <DropdownMenuContent className="w-96" align="end">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">AI Activity Monitor</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCleanup}
              disabled={isCleaningUp}
              className="h-8 px-2"
              title="Clean up stuck tasks"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleView}>
              {showCompleted ? 'Active Only' : 'View All'}
            </Button>
          </div>
        </div>
        {!showCompleted && tasks.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {tasks.length} active {tasks.length === 1 ? 'task' : 'tasks'}
          </p>
        )}
      </div>

      {/* Task List */}
      <ScrollArea className="max-h-96">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
            <p className="text-sm">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">
              {showCompleted ? 'No tasks found' : 'No active AI tasks'}
            </p>
            <p className="text-xs mt-1">
              {showCompleted
                ? 'Tasks are automatically cleaned up after 24 hours'
                : 'AI analyses will appear here when running'}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {tasks.map((task) => (
              <AITaskItem
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {tasks.length > 0 && !showCompleted && (
        <>
          <DropdownMenuSeparator />
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={toggleView}
            >
              View all tasks
            </Button>
          </div>
        </>
      )}
    </DropdownMenuContent>
  );
}
