import { NextRequest, NextResponse } from 'next/server';
import { gpt5Service } from '@/lib/services/gpt5-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing GPT-5 service via API endpoint...');

    // Test service initialization
    const testResult = await gpt5Service.testService();

    return NextResponse.json({
      success: true,
      serviceTest: testResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ GPT-5 service test failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing GPT-5 completion via API endpoint...');

    const response = await gpt5Service.complete(prompt, {
      model: 'gpt-5-mini',
      maxTokens: 200
    });

    return NextResponse.json({
      success: true,
      response,
      prompt,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ GPT-5 completion test failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}