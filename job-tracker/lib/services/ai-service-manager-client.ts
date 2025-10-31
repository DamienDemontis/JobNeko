/**
 * AI Service Manager Client - Client-side version that uses API endpoints
 * NO FALLBACKS - Only real AI generation through server API
 */

export type AITaskType =
  | 'job_analysis'
  | 'resume_optimization'
  | 'cover_letter'
  | 'interview_prep'
  | 'company_research'
  | 'network_analysis'
  | 'communication'
  | 'timeline_analysis'
  | 'culture_analysis'
  | 'market_analysis'
  | 'interview_questions'
  | 'notes_generation'
  | 'networking_analysis'
  | 'communication_generation'
  | 'requirement_analysis';

export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
  cached?: boolean;
}

export interface AIOptions {
  temperature?: number;
  max_tokens?: number;
  model?: string;
  format?: 'text' | 'json' | 'markdown';
  system_prompt?: string;
}

class AIServiceManagerClient {
  private static instance: AIServiceManagerClient;
  private cache: Map<string, { response: AIResponse; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): AIServiceManagerClient {
    if (!AIServiceManagerClient.instance) {
      AIServiceManagerClient.instance = new AIServiceManagerClient();
    }
    return AIServiceManagerClient.instance;
  }

  /**
   * Main method to generate AI content
   */
  async generateCompletion(
    prompt: string,
    taskType: AITaskType,
    userId: string,
    options: AIOptions = {}
  ): Promise<AIResponse> {
    // Check cache first
    const cacheKey = this.generateCacheKey(prompt, taskType);
    const cachedResponse = this.getCachedResponse(cacheKey);

    if (cachedResponse) {
      console.log(`✅ Cache hit for ${taskType}`);
      return {
        ...cachedResponse,
        cached: true
      };
    }

    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      console.log(`🤖 Requesting AI generation: ${taskType}`);

      // Create AbortController with 2 minute timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskType,
          prompt,
          options: {
            // No token limits - using unified AI architecture
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens,
            model: options.model
          },
          metadata: { userId }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to generate ${taskType}`);
      }

      const data = await response.json();

      const aiResponse: AIResponse = {
        content: data.content,
        usage: {
          prompt_tokens: Math.floor(data.estimatedTokens * 0.4),
          completion_tokens: Math.floor(data.estimatedTokens * 0.6),
          total_tokens: data.estimatedTokens
        },
        model: 'gpt-5',
        cached: false
      };

      // Cache the response
      this.cacheResponse(cacheKey, aiResponse);

      console.log(`✅ AI generation completed: ${taskType}`);
      return aiResponse;
    } catch (error) {
      console.error(`❌ AI generation failed for ${taskType}:`, error);

      // Better error message for abort/timeout
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out after 2 minutes. Please try again with a shorter prompt or simpler task.');
        }
        throw new Error(error.message || `AI generation failed for ${taskType}`);
      }

      throw error;
    }
  }

  /**
   * Generate content with automatic JSON parsing
   */
  async generateJSON<T = any>(
    prompt: string,
    taskType: AITaskType,
    userId: string,
    options: AIOptions = {}
  ): Promise<T> {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON, no markdown formatting, no explanations.`;

    const response = await this.generateCompletion(
      jsonPrompt,
      taskType,
      userId,
      { ...options, format: 'json' }
    );

    try {
      // Try to extract JSON from the response
      const content = response.content.trim();

      // Remove markdown code blocks if present
      const jsonStr = content
        .replace(/^```json\s*/m, '')
        .replace(/^```\s*/m, '')
        .replace(/\s*```$/m, '')
        .trim();

      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', error);
      console.error('Response content:', response.content);
      throw new Error(`Failed to parse ${taskType} response as JSON`);
    }
  }

  /**
   * Clear cache for specific task or all
   */
  clearCache(taskType?: AITaskType): void {
    if (taskType) {
      // Clear specific task type
      for (const [key] of this.cache) {
        if (key.includes(taskType)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
    console.log(`🗑️ Cache cleared${taskType ? ` for ${taskType}` : ''}`);
  }

  private generateCacheKey(prompt: string, taskType: AITaskType): string {
    // Create a simple hash from prompt and task type
    const str = `${taskType}:${prompt}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${taskType}_${hash}`;
  }

  private getCachedResponse(key: string): AIResponse | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.response;
    }
    if (cached) {
      this.cache.delete(key); // Remove expired cache
    }
    return null;
  }

  private cacheResponse(key: string, response: AIResponse): void {
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });

    // Limit cache size to 50 items
    if (this.cache.size > 50) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      // Try localStorage first
      const token = localStorage.getItem('token');
      if (token) return token;

      // Try sessionStorage
      const sessionToken = sessionStorage.getItem('token');
      if (sessionToken) return sessionToken;

      // Try cookies
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'token') return value;
      }
    }
    return null;
  }
}

// Export singleton instance
export const aiServiceManagerClient = AIServiceManagerClient.getInstance();