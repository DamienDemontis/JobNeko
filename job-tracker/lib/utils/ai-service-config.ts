/**
 * Unified AI Service Configuration
 * Centralizes AI service settings and eliminates token limits everywhere
 */

import { GPT5Model } from '@/lib/services/gpt5-service';

export interface AIServiceConfig {
  model: GPT5Model;
  reasoning?: 'minimal' | 'low' | 'medium' | 'high';
  verbosity?: 'low' | 'medium' | 'high';
  temperature?: number; // Only for non-GPT-5 models
  useWebSearch?: boolean;
  maxRetries?: number; // Default to 0 to eliminate auto-retries
  customApiKey?: string; // Optional custom API key (for self-hosted users)
}

export interface OperationConfig extends AIServiceConfig {
  operation: string;
  description: string;
  requiresValidation?: boolean;
  requiredFields?: string[];
}

/**
 * Standard AI model configurations without token limits
 * GPT-5 can use up to 128k tokens, so we let it use what it needs
 */
export const AI_MODEL_CONFIGS: Record<string, AIServiceConfig> = {
  // Primary GPT-5 models - no token limits, minimal reasoning for speed
  'gpt-5': {
    model: 'gpt-5',
    reasoning: 'minimal',
    verbosity: 'low',
    maxRetries: 0 // No auto-retries - show errors directly
  },
  'gpt-5-mini': {
    model: 'gpt-5-mini',
    reasoning: 'minimal',
    verbosity: 'low',
    maxRetries: 0
  },
  'gpt-5-nano': {
    model: 'gpt-5-nano',
    reasoning: 'minimal',
    verbosity: 'low',
    maxRetries: 0
  }
};

/**
 * Operation-specific configurations
 */
export const OPERATION_CONFIGS: Record<string, OperationConfig> = {
  job_extraction: {
    operation: 'job_extraction',
    description: 'Extract comprehensive job data from job postings',
    model: 'gpt-5-nano',
    reasoning: 'minimal',
    verbosity: 'low',
    requiresValidation: true,
    requiredFields: ['title', 'company'],
    maxRetries: 0
  },
  salary_analysis: {
    operation: 'salary_analysis',
    description: 'Analyze salary data and market information',
    model: 'gpt-5-mini',
    reasoning: 'minimal',
    verbosity: 'low',
    useWebSearch: true,
    maxRetries: 0
  },
  resume_parsing: {
    operation: 'resume_parsing',
    description: 'Extract structured data from resume text',
    model: 'gpt-5-nano',
    reasoning: 'minimal',
    verbosity: 'low',
    requiresValidation: true,
    requiredFields: ['skills', 'experience'],
    maxRetries: 0
  },
  company_analysis: {
    operation: 'company_analysis',
    description: 'Analyze company information and culture',
    model: 'gpt-5-mini',
    reasoning: 'minimal',
    verbosity: 'low',
    useWebSearch: true,
    maxRetries: 0
  },
  skill_matching: {
    operation: 'skill_matching',
    description: 'Match job requirements with user skills',
    model: 'gpt-5-nano',
    reasoning: 'minimal',
    verbosity: 'low',
    maxRetries: 0
  },
  negotiation_coaching: {
    operation: 'negotiation_coaching',
    description: 'Generate negotiation strategies and tips',
    model: 'gpt-5-mini',
    reasoning: 'minimal',
    verbosity: 'low',
    maxRetries: 0
  },
  web_search: {
    operation: 'web_search',
    description: 'Search web for current market data',
    model: 'gpt-5-mini',
    reasoning: 'minimal',
    verbosity: 'low',
    useWebSearch: true,
    maxRetries: 0
  },
  general_completion: {
    operation: 'general_completion',
    description: 'General AI text completion',
    model: 'gpt-5-nano',
    reasoning: 'minimal',
    verbosity: 'low',
    maxRetries: 0
  }
};

/**
 * Get configuration for a specific operation
 */
export function getOperationConfig(operation: string): OperationConfig {
  return OPERATION_CONFIGS[operation] || OPERATION_CONFIGS.general_completion;
}

/**
 * Get model configuration without operation-specific settings
 */
export function getModelConfig(model: GPT5Model): AIServiceConfig {
  return AI_MODEL_CONFIGS[model] || AI_MODEL_CONFIGS['gpt-5-mini'];
}

/**
 * Create a standardized configuration for AI operations
 * This eliminates the need for passing individual parameters everywhere
 */
export function createAIConfig(
  operation: string,
  overrides?: Partial<OperationConfig>
): OperationConfig {
  const baseConfig = getOperationConfig(operation);

  return {
    ...baseConfig,
    ...overrides,
    // Force no token limits and no auto-retries regardless of overrides
    maxRetries: 0
  };
}

/**
 * Standard prompt templates to eliminate duplication
 */
export const PROMPT_TEMPLATES = {
  json_response: 'Return ONLY a valid JSON object. No explanations, no markdown, no code blocks. Start with { and end with }.',

  extraction_rules: `
CRITICAL EXTRACTION RULES:
- Extract ALL available information completely
- Do not summarize or shorten content
- Use null for missing information, never use generic defaults
- Preserve specific details that would be valuable to job seekers
- Follow JSON format exactly
`,

  validation_notice: `
VALIDATION REQUIREMENTS:
- Ensure all required fields are populated
- Use realistic data based on actual content
- Maintain professional language and formatting
- Double-check JSON syntax before responding
`,

  no_fallbacks: `
IMPORTANT: No fallbacks or hardcoded values allowed.
If information is not available in the source, use null or empty arrays.
This ensures data accuracy and prevents misleading information.
`
};

/**
 * Build standardized prompts with consistent formatting
 */
export function buildPrompt(
  operation: string,
  content: string,
  additionalInstructions?: string
): string {
  const config = getOperationConfig(operation);

  return `
${PROMPT_TEMPLATES.json_response}

OPERATION: ${config.description}
${PROMPT_TEMPLATES.extraction_rules}
${config.requiresValidation ? PROMPT_TEMPLATES.validation_notice : ''}
${PROMPT_TEMPLATES.no_fallbacks}

${additionalInstructions || ''}

CONTENT TO PROCESS:
${content}

JSON OUTPUT:
`.trim();
}

/**
 * Centralized logging configuration
 */
export interface AIOperationLog {
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  processingTime: number;
  success: boolean;
  errorType?: string;
  retryCount?: number;
}

/**
 * Standard log format for all AI operations
 */
export function logAIOperation(log: AIOperationLog): void {
  const status = log.success ? '✅' : '❌';
  const emoji = getOperationEmoji(log.operation);

  console.log(
    `${emoji} ${status} ${log.operation} [${log.model}] ` +
    `Input: ${log.inputTokens}chars, Output: ${log.outputTokens}chars, ` +
    `Time: ${log.processingTime}ms` +
    (log.errorType ? ` Error: ${log.errorType}` : '') +
    (log.retryCount ? ` Retries: ${log.retryCount}` : '')
  );
}

function getOperationEmoji(operation: string): string {
  const emojiMap: Record<string, string> = {
    'job_extraction': '📋',
    'salary_analysis': '💰',
    'resume_parsing': '📄',
    'skill_matching': '🎯',
    'company_analysis': '🏢',
    'negotiation_coaching': '🤝',
    'web_search': '🔍',
    'general_completion': '🤖'
  };

  return emojiMap[operation] || '🔧';
}