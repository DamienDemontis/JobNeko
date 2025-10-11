/**
 * GET /api/ai-tasks/recent
 * Returns user's recent AI tasks (all statuses, paginated)
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

    // Get pagination parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Get recent tasks
    const tasks = await aiTaskTracker.getRecentTasks(userId, limit);

    return NextResponse.json({
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error('Error fetching recent AI tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent tasks' },
      { status: 500 }
    );
  }
}
