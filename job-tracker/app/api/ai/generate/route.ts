/**
 * AI Generation API - Server-side endpoint for all AI generation tasks
 * Handles AI content generation with proper server-side API key access
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai-service';
import {
  withErrorHandling,
  AuthenticationError,
  ValidationError
} from '@/lib/error-handling';
import { prisma } from '@/lib/prisma';

interface GenerationRequest {
  taskType: string;
  prompt: string;
  options?: {
    max_tokens?: number;
    temperature?: number;
    model?: string;
  };
  metadata?: Record<string, any>;
}

// Track usage for billing
async function trackAIUsage(
  userId: string,
  taskType: string,
  tokensUsed: number,
  success: boolean
) {
  try {
    const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM format

    // Try to update existing record or create new one
    await prisma.aIUsageTracking.upsert({
      where: {
        userId_taskType_monthKey: {
          userId,
          taskType,
          monthKey
        }
      },
      update: {
        requestCount: { increment: 1 },
        tokensUsed: { increment: tokensUsed },
        lastUsedAt: new Date()
      },
      create: {
        userId,
        taskType,
        monthKey,
        requestCount: 1,
        tokensUsed
      }
    });
  } catch (error) {
    console.error('Failed to track AI usage:', error);
  }
}

// Estimate tokens (rough approximation)
function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('Authorization token required');
  }

  const token = authHeader.slice(7);
  const user = await validateToken(token);

  if (!user) {
    throw new AuthenticationError('Invalid authentication token');
  }

  let body: GenerationRequest;

  try {
    body = await request.json();
  } catch {
    throw new ValidationError('Invalid JSON in request body');
  }

  const { taskType, prompt, options = {} } = body;

  if (!taskType || !prompt) {
    throw new ValidationError('taskType and prompt are required');
  }

  console.log(`🤖 AI Generation requested: ${taskType} for user ${user.id}`);

  try {
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
      throw new Error('AI service not configured. Please set OPENAI_API_KEY in environment variables.');
    }

    // Generate completion
    const startTime = Date.now();
    const response = await generateCompletion(prompt, {
      max_tokens: options.max_tokens || 2000,
      temperature: options.temperature || 0.7
    });

    const processingTime = Date.now() - startTime;

    if (!response || !response.content) {
      console.error(`❌ No content received from AI for ${taskType}`);
      await trackAIUsage(user.id, taskType, 0, false);
      throw new Error(`AI service failed to generate content for ${taskType}`);
    }

    // Track successful usage
    const estimatedTokens = estimateTokens(prompt + response.content);
    await trackAIUsage(user.id, taskType, estimatedTokens, true);

    console.log(`✅ AI Generation completed: ${taskType} (${processingTime}ms, ~${estimatedTokens} tokens)`);

    return NextResponse.json(
      {
        content: response.content,
        taskType,
        processingTime,
        estimatedTokens
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=60' // Cache for 1 minute
        }
      }
    );
  } catch (error) {
    console.error(`❌ AI Generation failed for ${taskType}:`, error);

    // Track failed usage
    await trackAIUsage(user.id, taskType, 0, false);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('AI generation failed');
  }
});