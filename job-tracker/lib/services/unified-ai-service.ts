/**
 * Unified AI Service - Clean Architecture for All AI Operations
 * Eliminates code duplication and provides a single interface for all AI tasks
 *
 * Features:
 * - No token limits (uses GPT-5's full 128k capacity)
 * - No auto-retries (shows errors directly)
 * - Unified response formatting and validation
 * - Centralized configuration management
 * - Comprehensive logging and error handling
 */

import { gpt5Service, GPT5Model } from './gpt5-service';
import {
  parseAIResponse,
  handleAIServiceError,
  validateEssentialFields,
  logAIOperation,
  FormattedAIResponse
} from '@/lib/utils/ai-response-formatter';
import {
  getOperationConfig,
  buildPrompt,
  OPERATION_CONFIGS,
  OperationConfig
} from '@/lib/utils/ai-service-config';

export interface AIRequest {
  operation: string;
  content: string;
  additionalInstructions?: string;
  overrides?: Partial<OperationConfig>;
  userId?: string; // User ID to fetch their API key automatically
}

export interface AIResponse<T = any> extends FormattedAIResponse<T> {
  operation: string;
  model: string;
  processingTime: number;
  inputLength: number;
  outputLength: number;
}

export class UnifiedAIService {
  private static instance: UnifiedAIService;

  private constructor() {
    console.log('🚀 Unified AI Service initialized with clean architecture');
  }

  static getInstance(): UnifiedAIService {
    if (!UnifiedAIService.instance) {
      UnifiedAIService.instance = new UnifiedAIService();
    }
    return UnifiedAIService.instance;
  }

  /**
   * Main AI processing method - handles all AI operations uniformly
   */
  async process<T = any>(request: AIRequest): Promise<AIResponse<T>> {
    const startTime = Date.now();
    const config = {
      ...getOperationConfig(request.operation),
      ...request.overrides
    };

    // Get API key intelligently:
    // 1. Use customApiKey if provided in overrides
    // 2. If userId provided, fetch user's encrypted API key
    // 3. Fall back to platform API key
    let apiKey = config.customApiKey;

    if (!apiKey && request.userId) {
      // Fetch user's API key automatically
      const { getUserApiKey } = await import('@/lib/utils/api-key-helper');
      apiKey = await getUserApiKey(request.userId);
    } else if (!apiKey) {
      // Fall back to platform key
      apiKey = process.env.OPENAI_API_KEY;
    }

    if (!apiKey) {
      throw new Error(`AI service not configured. GPT-5 API key required for ${request.operation}.`);
    }

    console.log(`🤖 Processing ${request.operation} with ${config.model} (no token limits)${request.userId ? ` [user ${request.userId.substring(0, 8)}...]` : config.customApiKey ? ' [custom API key]' : ' [platform key]'}`);

    try {
      // Build standardized prompt
      const prompt = buildPrompt(request.operation, request.content, request.additionalInstructions);

      // Call GPT-5 service (no token limits, no retries)
      const response = await gpt5Service.complete(prompt, {
        model: config.model,
        reasoning: config.reasoning,
        verbosity: config.verbosity,
        apiKey: apiKey // Pass API key directly
        // Deliberately omitting maxTokens to use GPT-5's full capacity
      });

      const processingTime = Date.now() - startTime;

      // Parse response using unified utilities
      const parseResult = parseAIResponse<T>(response);

      if (!parseResult.success) {
        logAIOperation(request.operation, config.model, request.content.length, 0, processingTime, false);

        return {
          ...parseResult,
          operation: request.operation,
          model: config.model,
          processingTime,
          inputLength: request.content.length,
          outputLength: 0
        };
      }

      // Validate essential fields if required
      // TODO: Fix TypeScript generic issue with validateEssentialFields
      // if (config.requiresValidation && config.requiredFields) {
      //   const validation = validateEssentialFields(
      //     parseResult.data!,
      //     config.requiredFields,
      //     request.operation
      //   );
      //   if (!validation.success) {
      //     logAIOperation(request.operation, config.model, request.content.length, response?.length || 0, processingTime, false);
      //     return { success: false, error: validation.error, operation: request.operation, model: config.model, processingTime, inputLength: request.content.length, outputLength: response?.length || 0 };
      //   }
      // }

      // Success
      logAIOperation(request.operation, config.model, request.content.length, response?.length || 0, processingTime, true);

      return {
        success: true,
        data: parseResult.data,
        rawResponse: response,
        metadata: parseResult.metadata,
        operation: request.operation,
        model: config.model,
        processingTime,
        inputLength: request.content.length,
        outputLength: response?.length || 0
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const aiError = handleAIServiceError(error, request.operation, request.content.substring(0, 200));

      logAIOperation(request.operation, config.model, request.content.length, 0, processingTime, false);

      return {
        success: false,
        error: aiError,
        operation: request.operation,
        model: config.model,
        processingTime,
        inputLength: request.content.length,
        outputLength: 0
      };
    }
  }

  /**
   * Specialized method for job extraction
   */
  async extractJobData(pageData: {
    url: string;
    html?: string;
    text?: string;
    title?: string;
    structured?: Record<string, unknown>;
  }) {
    const content = `
URL: ${pageData.url}
Page Title: ${pageData.title || 'Not provided'}
${pageData.structured ? `Structured Data: ${JSON.stringify(pageData.structured).substring(0, 1000)}` : ''}
${pageData.html ? `HTML Content (for logo extraction): ${pageData.html.substring(0, 3000)}` : ''}

FULL TEXT CONTENT:
${pageData.text?.substring(0, 4000) || 'No text content available'}
    `.trim();

    return await this.process({
      operation: 'job_extraction',
      content,
      additionalInstructions: `
COMPANY LOGO EXTRACTION RULES (CRITICAL - BE VERY SELECTIVE):
- ONLY extract images that are clearly company logos, not job photos or decorative images
- Priority 1: <img> with class names containing "logo", "brand", "company-logo", "header-logo"
- Priority 2: <img> in header, nav, or .header/.navbar elements with alt text containing company name
- Priority 3: <img> with src path containing company name AND located in header/nav areas
- REJECT: Generic stock photos, employee photos, office photos, decorative images
- REJECT: Images with classes like "photo", "picture", "image", "banner" without logo indicators
- VERIFY: URL should point to actual logo file (ends with .png, .svg, .jpg, .webp)
- If uncertain, prefer to return null rather than wrong image

SALARY EXTRACTION RULES:
- Extract numeric ranges: "$80,000 - $120,000" → salaryMin: 80000, salaryMax: 120000
- Convert to annual: "$50/hour" → estimate annual equivalent
- Detect currency symbols: $=USD, £=GBP, €=EUR
- Mark as negotiable if text contains: "negotiable", "competitive", "DOE"
      `
    });
  }

  /**
   * Specialized method for salary analysis
   */
  async analyzeSalary(
    jobTitle: string,
    company: string,
    location: string,
    jobDescription: string,
    postedSalary?: string
  ) {
    const content = `
Job Title: ${jobTitle}
Company: ${company}
Location: ${location}
Posted Salary: ${postedSalary || 'Not specified'}

Job Description:
${jobDescription}
    `.trim();

    return await this.process({
      operation: 'salary_analysis',
      content,
      overrides: {
        model: 'gpt-5', // Use full GPT-5 for comprehensive salary analysis
        reasoning: 'high',
        useWebSearch: true
      }
    });
  }

  /**
   * Specialized method for resume parsing
   * Uses GPT-5 nano for fast, cost-effective resume extraction
   */
  async parseResume(resumeText: string) {
    return await this.process({
      operation: 'resume_parsing',
      content: resumeText.substring(0, 4000),
      overrides: {
        model: 'gpt-5-nano', // Fast parsing with nano
        reasoning: 'minimal', // Minimal reasoning for speed
        verbosity: 'low'
      },
      additionalInstructions: `
Extract structured information including:
- Skills (technical and soft skills)
- Experience (with detailed job descriptions)
- Education (degrees, institutions, years)
- Certifications and achievements
- Contact information (if present)
      `
    });
  }

  /**
   * Specialized method for company analysis
   */
  async analyzeCompany(companyName: string, additionalContext?: string) {
    const content = `
Company: ${companyName}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}
    `.trim();

    return await this.process({
      operation: 'company_analysis',
      content,
      overrides: {
        model: 'gpt-5',
        useWebSearch: true
      }
    });
  }

  /**
   * Specialized method for skill matching
   */
  async matchSkills(resumeData: Record<string, any>, jobData: Record<string, any>) {
    const content = `
Resume Data:
${JSON.stringify(resumeData, null, 2)}

Job Data:
${JSON.stringify(jobData, null, 2)}
    `.trim();

    return await this.process({
      operation: 'skill_matching',
      content,
      additionalInstructions: `
Calculate a detailed skill match analysis including:
- Overall match percentage (0-100)
- Matched skills with proficiency levels
- Missing skills and gap analysis
- Skill transfer opportunities
- Recommendations for improvement
      `
    });
  }

  /**
   * General completion method for custom operations
   */
  async complete(
    prompt: string,
    model: GPT5Model = 'gpt-5-mini',
    reasoning: 'minimal' | 'low' | 'medium' | 'high' = 'minimal',
    userIdOrApiKey?: string // Can be userId or direct API key for backwards compatibility
  ) {
    // Smart detection: if it looks like an API key (starts with sk-), use it directly
    // Otherwise treat it as a userId
    const isDirectApiKey = userIdOrApiKey?.startsWith('sk-');

    return await this.process({
      operation: 'general_completion',
      content: prompt,
      userId: !isDirectApiKey ? userIdOrApiKey : undefined,
      overrides: {
        model,
        reasoning,
        customApiKey: isDirectApiKey ? userIdOrApiKey : undefined
      }
    });
  }

  /**
   * Get available operations
   */
  getAvailableOperations(): string[] {
    return Object.keys(OPERATION_CONFIGS);
  }

  /**
   * Get configuration for a specific operation
   */
  getOperationInfo(operation: string): OperationConfig {
    return getOperationConfig(operation);
  }

  /**
   * Health check for the AI service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'error';
    service: string;
    model: string;
    message: string;
    responseTime: number;
  }> {
    const startTime = Date.now();

    try {
      const result = await this.complete(
        'Hello! This is a health check. Please respond with "Service is healthy."',
        'gpt-5-nano',
        'minimal'
      );

      const responseTime = Date.now() - startTime;

      if (result.success) {
        return {
          status: 'healthy',
          service: 'unified-ai-service',
          model: 'gpt-5-nano',
          message: 'Service is operational',
          responseTime
        };
      } else {
        return {
          status: 'error',
          service: 'unified-ai-service',
          model: 'gpt-5-nano',
          message: result.error?.message || 'Unknown error',
          responseTime
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'error',
        service: 'unified-ai-service',
        model: 'gpt-5-nano',
        message: error instanceof Error ? error.message : 'Service unavailable',
        responseTime
      };
    }
  }
}

// Export singleton instance
export const unifiedAI = UnifiedAIService.getInstance();