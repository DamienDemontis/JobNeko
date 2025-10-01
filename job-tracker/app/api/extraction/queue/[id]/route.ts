import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { extractionQueue } from '@/lib/services/extraction-queue';

export const runtime = 'nodejs';

// GET - Get specific extraction status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const status = await extractionQueue.getExtractionStatus(resolvedParams.id, user.id);

    if (!status) {
      return NextResponse.json({ error: 'Extraction not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Failed to get extraction status:', error);
    return NextResponse.json(
      { error: 'Failed to get extraction status' },
      { status: 500 }
    );
  }
}