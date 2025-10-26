/**
 * GET /api/ai-tasks/stream
 * Server-Sent Events endpoint for real-time AI task updates
 * Uses polling since SQLite doesn't support native pub/sub
 */

import { NextRequest } from 'next/server';
import { aiTaskTracker } from '@/lib/services/ai-task-tracker';
import { validateToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verify authentication
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
  const cookieToken = req.cookies.get('token')?.value;
  const token = authHeader || cookieToken;

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const user = await validateToken(token);
  if (!user) {
    return new Response('Invalid token', { status: 401 });
  }

  const userId = user.id;

  // Create a readable stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial data
      try {
        const tasks = await aiTaskTracker.getActiveTasks(userId);
        const data = JSON.stringify(tasks);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      } catch (error) {
        console.error('Error sending initial SSE data:', error);
      }

      // Poll for updates every 2 seconds
      const intervalId = setInterval(async () => {
        try {
          const tasks = await aiTaskTracker.getActiveTasks(userId);
          const data = JSON.stringify(tasks);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (error) {
          console.error('Error sending SSE update:', error);
          clearInterval(intervalId);
          controller.close();
        }
      }, 2000);

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}
