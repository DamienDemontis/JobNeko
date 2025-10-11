/**
 * GET /api/ai-tasks/active
 * Returns user's active AI tasks (PENDING, PROCESSING)
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiTaskTracker } from '@/lib/services/ai-task-tracker';
import { validateToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    const cookieToken = req.cookies.get('token')?.value;
    const token = authHeader || cookieToken;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = user.id;

    // Get active tasks
    const tasks = await aiTaskTracker.getActiveTasks(userId);

    return NextResponse.json({
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error('Error fetching active AI tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active tasks' },
      { status: 500 }
    );
  }
}
