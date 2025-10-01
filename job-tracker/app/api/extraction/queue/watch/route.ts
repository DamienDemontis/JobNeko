/**
 * Long-polling endpoint for queue updates
 * Server holds connection until queue changes or timeout
 * Much more efficient than rapid polling
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { extractionQueue } from '@/lib/services/extraction-queue';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 second requests

// Store last known queue state per user
const lastQueueState = new Map<string, string>();
const queueWatchers = new Map<string, Set<(data: any) => void>>();

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

  try {
    // Get current queue state
    const queue = await extractionQueue.getUserQueue(userId);
    const currentState = JSON.stringify(queue);

    // Check if state changed since last check
    const lastState = lastQueueState.get(userId);

    // ALWAYS register a watcher first, then check for immediate changes
    // This ensures we don't miss rapid state changes
    let cleanupWatcher: (() => void) | null = null;

    const updatePromise = new Promise<any>((resolve) => {
      const watchers = queueWatchers.get(userId) || new Set();

      const watcher = (data: any) => {
        console.log(`🔔 Watcher triggered for user ${userId}`);
        resolve(data);
      };

      watchers.add(watcher);
      queueWatchers.set(userId, watchers);

      console.log(`👀 Watching queue for user ${userId} (${watchers.size} watchers)`);

      // Store cleanup function
      cleanupWatcher = () => {
        watchers.delete(watcher);
        if (watchers.size === 0) {
          queueWatchers.delete(userId);
        }
      };
    });

    // Now check if state already changed (immediate response)
    if (lastState !== currentState) {
      // State changed, clean up watcher and return immediately
      console.log(`⚡ State already changed for user ${userId}, returning immediately`);
      if (cleanupWatcher) cleanupWatcher();
      lastQueueState.set(userId, currentState);
      return Response.json({ queue, timestamp: Date.now() });
    }

    // Timeout after 30 seconds
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 30000);
    });

    // Wait for either update or timeout
    const result = await Promise.race([updatePromise, timeoutPromise]);

    // Clean up watcher
    if (cleanupWatcher) {
      cleanupWatcher();
    }

    if (result === null) {
      // Timeout - return current state
      console.log(`⏱️ Long-poll timeout for user ${userId}`);
      return Response.json({ queue, timestamp: Date.now() });
    }

    // Update received - fetch fresh data
    console.log(`✅ Update triggered for user ${userId}`);
    const updatedQueue = await extractionQueue.getUserQueue(userId);
    const updatedState = JSON.stringify(updatedQueue);
    lastQueueState.set(userId, updatedState);

    return Response.json({ queue: updatedQueue, timestamp: Date.now() });
  } catch (error) {
    console.error('Long polling error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Notify watchers of queue update
 * Called from extraction-queue.ts when status changes
 */
export function notifyQueueUpdate(userId: string, data: any) {
  console.log(`📢 Notifying watchers for user ${userId}`, data);

  const watchers = queueWatchers.get(userId);

  if (!watchers || watchers.size === 0) {
    console.log(`⚠️ No watchers found for user ${userId}`);
    lastQueueState.delete(userId);
    return;
  }

  console.log(`📣 Triggering ${watchers.size} watchers for user ${userId}`);

  watchers.forEach(watcher => {
    try {
      watcher(data);
    } catch (error) {
      console.error('Watcher notification error:', error);
    }
  });

  // Clear cached state to force fresh fetch
  lastQueueState.delete(userId);
}