/**
 * Unified AI Response Formatting Utilities
 * Eliminates code duplication across AI services for response cleaning and parsing
 */

export interface AIResponseError {
  type: 'parsing_error' | 'empty_response' | 'invalid_json' | 'service_error';
  message: string;
  originalResponse?: string;
  details?: any;
}

export interface FormattedAIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AIResponseError;
  rawResponse?: string;
  metadata?: {
    cleaningApplied: string[];
    parseAttempts: number;
    processingTime: number;
  };
}

/**
 * Unified JSON response cleaner - handles all common AI response formatting issues
 */
export function cleanJsonResponse(response: string): string {
  if (!response || typeof response !== 'string') {
    return '{}';
  }

  let cleaned = response.trim();

  // Remove markdown code blocks (multiple variants)
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  // Remove common AI response prefixes
  cleaned = cleaned.replace(/^(Here's the|Here is the|Response:|JSON:|Result:)\s*/i, '');

  // Remove trailing explanations after JSON
  const jsonEndIndex = cleaned.lastIndexOf('}');
  if (jsonEndIndex !== -1 && jsonEndIndex < cleaned.length - 1) {
    cleaned = cleaned.substring(0, jsonEndIndex + 1);
  }

  // Fix common JSON formatting issues
  cleaned = cleaned.replace(/,\s*}/g, '}'); // Remove trailing commas
  cleaned = cleaned.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays

  // Ensure it starts with { or [
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  if (firstBrace === -1 && firstBracket === -1) {
    return '{}';
  }

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    cleaned = cleaned.substring(firstBrace);
  } else if (firstBracket !== -1) {
    cleaned = cleaned.substring(firstBracket);
  }

  return cleaned.trim();
}

/**
 * Safe JSON parser with automatic cleaning and error handling
 */
export function parseAIResponse<T = any>(
  response: string,
  fallbackValue?: T
): FormattedAIResponse<T> {
  const startTime = Date.now();
  const cleaningSteps: string[] = [];
  let parseAttempts = 0;

  if (!response) {
    return {
      success: false,
      error: {
        type: 'empty_response',
        message: 'AI returned empty response'
      },
      metadata: {
        cleaningApplied: [],
        parseAttempts: 0,
        processingTime: Date.now() - startTime
      }
    };
  }

  // First attempt: Parse as-is
  parseAttempts++;
  try {
    const parsed = JSON.parse(response);
    return {
      success: true,
      data: parsed,
      rawResponse: response,
      metadata: {
        cleaningApplied: [],
        parseAttempts,
        processingTime: Date.now() - startTime
      }
    };
  } catch (error) {
    cleaningSteps.push('raw_parse_failed');
  }

  // Second attempt: Clean and parse
  parseAttempts++;
  try {
    const cleaned = cleanJsonResponse(response);
    cleaningSteps.push('json_cleaning_applied');

    const parsed = JSON.parse(cleaned);
    return {
      success: true,
      data: parsed,
      rawResponse: response,
      metadata: {
        cleaningApplied: cleaningSteps,
        parseAttempts,
        processingTime: Date.now() - startTime
      }
    };
  } catch (error) {
    cleaningSteps.push('cleaned_parse_failed');
  }

  // Third attempt: Extract JSON objects with regex
  parseAttempts++;
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaningSteps.push('regex_extraction');
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        data: parsed,
        rawResponse: response,
        metadata: {
          cleaningApplied: cleaningSteps,
          parseAttempts,
          processingTime: Date.now() - startTime
        }
      };
    }
  } catch (error) {
    cleaningSteps.push('regex_extraction_failed');
  }

  // If all parsing attempts failed, return fallback or error
  if (fallbackValue !== undefined) {
    return {
      success: true,
      data: fallbackValue,
      rawResponse: response,
      metadata: {
        cleaningApplied: [...cleaningSteps, 'fallback_used'],
        parseAttempts,
        processingTime: Date.now() - startTime
      }
    };
  }

  return {
    success: false,
    error: {
      type: 'parsing_error',
      message: 'Failed to parse AI response as JSON after multiple attempts',
      originalResponse: response.substring(0, 500) + (response.length > 500 ? '...' : ''),
      details: { cleaningSteps, parseAttempts }
    },
    rawResponse: response,
    metadata: {
      cleaningApplied: cleaningSteps,
      parseAttempts,
      processingTime: Date.now() - startTime
    }
  };
}

/**
 * Standardized error handling for AI service responses
 */
export function handleAIServiceError(
  error: any,
  context: string,
  originalPrompt?: string
): AIResponseError {
  const errorMessage = error instanceof Error ? error.message : String(error);

  console.error(`❌ AI Service Error in ${context}:`, error);

  // Categorize error types
  if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
    return {
      type: 'parsing_error',
      message: `JSON parsing failed in ${context}: ${errorMessage}`,
      details: { originalPrompt: originalPrompt?.substring(0, 200) }
    };
  }

  if (errorMessage.includes('empty') || errorMessage.includes('no content')) {
    return {
      type: 'empty_response',
      message: `AI returned empty response in ${context}`,
      details: { originalPrompt: originalPrompt?.substring(0, 200) }
    };
  }

  if (errorMessage.includes('API') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return {
      type: 'service_error',
      message: `AI service error in ${context}: ${errorMessage}`,
      details: { originalPrompt: originalPrompt?.substring(0, 200) }
    };
  }

  return {
    type: 'service_error',
    message: `Unknown error in ${context}: ${errorMessage}`,
    details: { originalPrompt: originalPrompt?.substring(0, 200) }
  };
}

/**
 * Validate essential fields are present in extracted data
 */
export function validateEssentialFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[],
  context: string
): FormattedAIResponse<T> {
  const missingFields = requiredFields.filter(field => !data[field]);

  if (missingFields.length > 0) {
    return {
      success: false,
      error: {
        type: 'invalid_json',
        message: `Missing essential fields in ${context}: ${missingFields.join(', ')}`,
        details: { missingFields, providedData: Object.keys(data) }
      }
    };
  }

  return {
    success: true,
    data
  };
}

/**
 * Unified logging for AI service operations
 */
export function logAIOperation(
  operation: string,
  model: string,
  inputLength: number,
  outputLength: number,
  processingTime: number,
  success: boolean
): void {
  const status = success ? '✅' : '❌';
  const emoji = getOperationEmoji(operation);

  console.log(
    `${emoji} ${status} ${operation} [${model}] ` +
    `Input: ${inputLength}chars, Output: ${outputLength}chars, ` +
    `Time: ${processingTime}ms`
  );
}

function getOperationEmoji(operation: string): string {
  const emojiMap: Record<string, string> = {
    'job_extraction': '📋',
    'salary_analysis': '💰',
    'resume_parsing': '📄',
    'skill_matching': '🎯',
    'company_analysis': '🏢',
    'negotiation_tips': '🤝',
    'web_search': '🔍',
    'completion': '🤖'
  };

  return emojiMap[operation] || '🔧';
}

/**
 * Clean and format AI responses specifically for display
 */
export function formatAIResponseForDisplay(
  response: string,
  maxLength?: number
): string {
  if (!response) return 'No response generated';

  let formatted = response.trim();

  // Remove technical markers
  formatted = formatted.replace(/^(Assistant:|AI:|Response:)\s*/i, '');
  formatted = formatted.replace(/```(json|javascript|typescript)?\s*/gi, '');
  formatted = formatted.replace(/```\s*$/g, '');

  // Clean up extra whitespace
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  formatted = formatted.replace(/\s{2,}/g, ' ');

  // Truncate if needed
  if (maxLength && formatted.length > maxLength) {
    formatted = formatted.substring(0, maxLength - 3) + '...';
  }

  return formatted;
}