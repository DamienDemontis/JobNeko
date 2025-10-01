import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing browser safety - this endpoint simulates server-side usage');

    // Test that we can import ai-service safely on server-side
    const { extractJobDataWithAI, generateCompletion } = await import('@/lib/ai-service');

    // This should work fine on server-side
    const testResult = await generateCompletion('Hello, this is a test prompt to verify server-side AI functionality.', {
      max_tokens: 50,
      temperature: 0.5
    });

    return NextResponse.json({
      success: true,
      message: 'Browser safety test passed - AI service works correctly on server-side',
      testResponse: testResult?.content?.substring(0, 100) + '...',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Browser safety test failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Browser safety test failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}