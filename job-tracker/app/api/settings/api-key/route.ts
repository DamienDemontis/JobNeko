import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { aiGateway } from '@/lib/services/ai-gateway';
import {
  withErrorHandling,
  AuthenticationError,
  ValidationError
} from '@/lib/error-handling';

export const runtime = 'nodejs';

/**
 * GET /api/settings/api-key
 * Get current API key status (not the key itself for security)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid token');
  }

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      apiKeyMode: true,
      encryptedApiKey: true,
      subscriptionTier: true
    }
  });

  return NextResponse.json({
    hasApiKey: !!userData?.encryptedApiKey,
    mode: userData?.apiKeyMode || 'platform',
    tier: userData?.subscriptionTier || 'free',
    // Return partial key for verification (last 4 chars only)
    keyPreview: userData?.encryptedApiKey
      ? '••••••••••••••••' + userData.encryptedApiKey.slice(-4)
      : null
  });
});

/**
 * POST /api/settings/api-key
 * Save or update user's OpenAI API key
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid token');
  }

  const body = await request.json();
  const { apiKey } = body;

  // Validate API key format
  if (!apiKey || typeof apiKey !== 'string') {
    throw new ValidationError('API key is required');
  }

  // OpenAI API keys start with 'sk-' or 'sk-proj-'
  if (!apiKey.startsWith('sk-')) {
    throw new ValidationError('Invalid OpenAI API key format. Keys should start with "sk-"');
  }

  // Check minimum length
  if (apiKey.length < 20) {
    throw new ValidationError('API key appears to be incomplete');
  }

  console.log(`🔑 Validating API key for user ${user.email}...`);

  // Test the API key by making a simple request using OpenAI directly
  try {
    // Import OpenAI client directly
    const OpenAI = (await import('openai')).default;
    const testClient = new OpenAI({ apiKey });

    // Make a minimal test request with the user's key
    const completion = await testClient.chat.completions.create({
      model: 'gpt-4o-mini', // Use a reliable, fast model for testing
      messages: [{ role: 'user', content: 'Reply with just "OK"' }],
      max_tokens: 5
    });

    if (!completion.choices?.[0]?.message?.content) {
      throw new Error('API key test failed - no response');
    }

    console.log('✅ API key validated successfully');

  } catch (error: any) {
    console.error('❌ API key validation failed:', error);

    throw new ValidationError(
      `Invalid API key: ${error.message || 'Unable to authenticate with OpenAI'}. ` +
      'Please verify your key at https://platform.openai.com/api-keys'
    );
  }

  // Save the encrypted API key
  await aiGateway.saveUserApiKey(user.id, apiKey);

  console.log(`🔐 API key saved for user ${user.email}`);

  return NextResponse.json({
    success: true,
    message: 'API key saved successfully',
    mode: 'self_hosted',
    tier: 'self_hosted',
    warning: 'You are now in self-hosted mode. All AI costs will be charged to your OpenAI account. Please set spending limits at https://platform.openai.com/account/limits'
  });
});

/**
 * DELETE /api/settings/api-key
 * Remove user's API key and switch back to platform mode
 */
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid token');
  }

  await aiGateway.removeUserApiKey(user.id);

  console.log(`🔓 API key removed for user ${user.email}`);

  return NextResponse.json({
    success: true,
    message: 'API key removed. You are now using platform AI services.',
    mode: 'platform',
    tier: 'free'
  });
});
