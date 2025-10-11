import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * POST /api/ai-tasks/cleanup
 *
 * Cleans up stuck AI tasks that are in PENDING or PROCESSING state for more than 5 minutes.
 * This endpoint is useful for recovering from edge cases where tasks don't complete properly.
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('🧹 Starting task cleanup...');

    // Find tasks that are stuck in PENDING or PROCESSING for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const stuckTasks = await prisma.aITask.findMany({
      where: {
        userId: user.id,
        status: {
          in: ['PENDING', 'PROCESSING']
        },
        createdAt: {
          lt: fiveMinutesAgo
        }
      },
      select: {
        id: true,
        type: true,
        status: true,
        jobTitle: true,
        company: true,
        createdAt: true
      }
    });

    console.log(`Found ${stuckTasks.length} stuck tasks for user ${user.id}`);

    if (stuckTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stuck tasks found',
        cleanedCount: 0,
        tasks: []
      });
    }

    // Mark them as FAILED with appropriate error message
    const result = await prisma.aITask.updateMany({
      where: {
        id: {
          in: stuckTasks.map(t => t.id)
        }
      },
      data: {
        status: 'FAILED',
        error: 'Task cleanup: Stuck in pending/processing state',
        updatedAt: new Date()
      }
    });

    console.log(`✅ Cleaned up ${result.count} stuck tasks`);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.count} stuck tasks`,
      cleanedCount: result.count,
      tasks: stuckTasks.map(t => ({
        id: t.id,
        type: t.type,
        status: t.status,
        jobTitle: t.jobTitle,
        company: t.company,
        createdAt: t.createdAt
      }))
    });

  } catch (error) {
    console.error('❌ Error cleaning up tasks:', error);
    return NextResponse.json(
      {
        error: 'Failed to cleanup tasks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
