import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { extractionQueue } from '@/lib/services/extraction-queue';

export const runtime = 'nodejs';

// GET - Get user's extraction queue
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const cookieToken = request.cookies.get('token')?.value;
    const token = authHeader || cookieToken;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const queue = await extractionQueue.getUserQueue(user.id);

    return NextResponse.json({
      success: true,
      queue
    });
  } catch (error) {
    console.error('Failed to get extraction queue:', error);
    return NextResponse.json(
      { error: 'Failed to get extraction queue' },
      { status: 500 }
    );
  }
}

// POST - Add URLs to extraction queue
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const cookieToken = request.cookies.get('token')?.value;
    const token = authHeader || cookieToken;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { urls, url, priority = 0, preExtractedHtml } = body;

    if (!urls && !url) {
      return NextResponse.json(
        { error: 'URL or URLs required' },
        { status: 400 }
      );
    }

    let result;
    if (urls && Array.isArray(urls)) {
      // Batch add
      result = await extractionQueue.addBatchToQueue(user.id, urls);
    } else {
      // Single add with optional pre-extracted HTML
      result = await extractionQueue.addToQueue(user.id, url, priority, preExtractedHtml);

      // Check if it's a duplicate
      if ((result as any).isDuplicate) {
        return NextResponse.json({
          success: false,
          isDuplicate: true,
          existingJobId: (result as any).existingJobId,
          message: (result as any).message
        }, { status: 409 }); // 409 Conflict
      }
    }

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Failed to add to extraction queue:', error);
    return NextResponse.json(
      { error: 'Failed to add to extraction queue' },
      { status: 500 }
    );
  }
}