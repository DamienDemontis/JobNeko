/**
 * AI Activity Monitor Button
 * Small square button showing count of ongoing AI tasks with real-time updates
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIActivityButtonProps {
  onOpenDropdown: () => void;
}

export function AIActivityButton({ onOpenDropdown }: AIActivityButtonProps) {
  const [taskCount, setTaskCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    const connectSSE = () => {
      if (!isSubscribed) return;

      // Real-time updates via Server-Sent Events
      eventSource = new EventSource('/api/ai-tasks/stream');

      eventSource.onmessage = (event) => {
        if (!isSubscribed) return;
        try {
          const tasks = JSON.parse(event.data);
          setTaskCount(tasks.length);
          setIsProcessing(tasks.some((t: any) => t.status === 'PROCESSING'));
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
        console.log('SSE connection established (button)');
      };
    };

    // Initial connection
    connectSSE();

    // Handle visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Tab visible, refreshing button state...');
        // Fetch current state when tab becomes visible
        fetch('/api/ai-tasks/active')
          .then(res => res.json())
          .then(data => {
            if (isSubscribed && data.tasks) {
              setTaskCount(data.tasks.length);
              setIsProcessing(data.tasks.some((t: any) => t.status === 'PROCESSING'));
            }
          })
          .catch(err => console.error('Error fetching tasks on visibility change:', err));
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
  }, []);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onOpenDropdown}
      className="relative w-10 h-10 p-0"
      title="AI Activity Monitor"
    >
      {/* Brain icon with pulse animation when processing */}
      <Brain
        className={cn(
          'w-4 h-4',
          isProcessing && 'animate-pulse text-blue-600'
        )}
      />

      {/* Badge showing count of active tasks */}
      {taskCount > 0 && (
        <Badge
          variant="outline"
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs font-bold bg-black text-white border-white"
        >
          {taskCount > 9 ? '9+' : taskCount}
        </Badge>
      )}
    </Button>
  );
}
