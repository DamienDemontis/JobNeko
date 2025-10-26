/**
 * Secure API Key Helper
 *
 * Provides a centralized, secure way to retrieve user API keys
 * with proper encryption handling and fallback to platform keys.
 *
 * Security features:
 * - Uses encrypted storage (AES-256-GCM)
 * - Proper decryption through AI Gateway
 * - Platform key fallback for SaaS mode
 * - No API keys exposed in logs
 */

import { prisma } from '@/lib/prisma';
import { AIGateway } from '@/lib/services/ai-gateway';

/**
 * Get the appropriate API key for a user
 *
 * @param userId - The user's ID
 * @returns The decrypted API key or platform key
 * @throws Error if no API key is available
 */
export async function getUserApiKey(userId: string): Promise<string> {
  // Get user's API key configuration from database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      apiKeyMode: true,
      encryptedApiKey: true
    }
  });

  let apiKey: string | undefined;

  // If user has their own API key (self-hosted mode)
  if (user?.apiKeyMode === 'self_hosted' && user.encryptedApiKey) {
    // Decrypt user's API key using AI Gateway's secure decryption
    const gateway = AIGateway.getInstance();
    apiKey = (gateway as any).decryptApiKey(user.encryptedApiKey);

    console.log(`🔑 Using user's encrypted API key for user ${userId.substring(0, 8)}...`);
  } else {
    // Use platform API key (SaaS mode)
    apiKey = process.env.OPENAI_API_KEY;

    console.log(`🔑 Using platform API key for user ${userId.substring(0, 8)}...`);
  }

  if (!apiKey) {
    throw new Error('AI service not configured. Please configure your OpenAI API key in settings.');
  }

  return apiKey;
}

/**
 * Check if user has a configured API key
 *
 * @param userId - The user's ID
 * @returns true if user has an API key configured
 */
export async function hasUserApiKey(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      apiKeyMode: true,
      encryptedApiKey: true
    }
  });

  // User has own key if in self-hosted mode with encrypted key
  if (user?.apiKeyMode === 'self_hosted' && user.encryptedApiKey) {
    return true;
  }

  // Otherwise check if platform key exists
  return !!process.env.OPENAI_API_KEY;
}
