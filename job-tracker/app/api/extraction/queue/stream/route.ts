/**
 * Server-Sent Events (SSE) endpoint for real-time queue updates
 * Replaces polling with efficient push-based updates
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { extractionQueue } from '@/lib/services/extraction-queue';

export const dynamic = 'force-dynamic';

// Store active SSE connections
const connections = new Map<string, ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = await verifyToken(token);

  if (!payload?.userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = payload.userId;

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Store connection
      connections.set(userId, controller);

      // Send initial connection message
      const message = `data: ${JSON.stringify({ type: 'connected' })}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));

      // Send initial queue state
      extractionQueue.getUserQueue(userId).then(queue => {
        const data = `data: ${JSON.stringify({ type: 'queue', data: queue })}\n\n`;
        controller.enqueue(new TextEncoder().encode(data));
      });

      // Set up periodic updates (every 5 seconds as fallback)
      const interval = setInterval(async () => {
        try {
          const queue = await extractionQueue.getUserQueue(userId);
          const data = `data: ${JSON.stringify({ type: 'queue', data: queue })}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));

          // If no items in queue or all completed/failed, reduce frequency
          const hasActive = queue.some(item =>
            item.status === 'PENDING' || item.status === 'PROCESSING'
          );

          if (!hasActive) {
            // Keep connection alive but reduce updates
            clearInterval(interval);

            // Send heartbeat every 30 seconds
            const heartbeat = setInterval(() => {
              try {
                controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
              } catch {
                clearInterval(heartbeat);
              }
            }, 30000);
          }
        } catch (error) {
          console.error('SSE update error:', error);
          clearInterval(interval);
          controller.close();
          connections.delete(userId);
        }
      }, 5000);

      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
        connections.delete(userId);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Broadcast update to specific user
 * Called from extraction-queue.ts when status changes
 */
export function broadcastToUser(userId: string, update: any) {
  const controller = connections.get(userId);
  if (controller) {
    try {
      const data = `data: ${JSON.stringify({ type: 'update', data: update })}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
    } catch (error) {
      console.error('Failed to broadcast to user:', userId, error);
      connections.delete(userId);
    }
  }
}