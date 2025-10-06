/**
 * GPT-5 Service - Latest OpenAI model with native web search
 * Uses OpenAI Chat Completions API with GPT-5 models
 *
 * ⚠️ SERVER-SIDE ONLY - Do not use in client-side components
 * Use API routes to interact with this service from the frontend
 */

import OpenAI from 'openai';


export type GPT5Model = 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano';
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';
export type TextVerbosity = 'low' | 'medium' | 'high';

interface GPT5Options {
  model?: GPT5Model;
  reasoning?: {
    effort?: ReasoningEffort;
  };
  text?: {
    verbosity?: TextVerbosity;
  };
  tools?: Tool[];
  tool_choice?: ToolChoice;
  temperature?: number;
  max_tokens?: number;
  previous_response_id?: string; // For multi-turn conversations
}

interface Tool {
  type: 'function' | 'custom';
  name?: string;
  function?: {
    name: string;
    description: string;
    parameters?: any;
  };
  description?: string;
}

interface ToolChoice {
  type?: 'auto' | 'required' | 'allowed_tools';
  mode?: 'auto' | 'required';
  tools?: Array<{ type: string; name: string }>;
}

interface GPT5Response {
  id: string;
  object: string;
  created: number;
  model: string;
  output: Array<{
    id: string;
    type: 'reasoning' | 'message' | 'function_call';
    content?: Array<{
      type: 'output_text';
      text: string;
    }>;
    summary?: Array<{
      type: 'summary_text';
      text: string;
    }>;
    status?: string;
    role?: string;
    name?: string;
    arguments?: string;
    call_id?: string;
  }>;
  usage: {
    prompt_tokens: number;
    reasoning_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export class GPT5Service {
  private client: OpenAI | null = null;

  constructor() {
    // Don't initialize client in constructor - do it lazily when needed
    console.log('🤖 GPT5Service constructor called');
  }

  /**
   * Get or create OpenAI client with optional custom API key
   * @param customApiKey Optional API key to use instead of environment variable
   */
  private getClient(customApiKey?: string): OpenAI {
    // If custom API key provided, create a new client instance for this request
    if (customApiKey) {
      if (typeof window !== 'undefined') {
        throw new Error('GPT5Service cannot be used in browser environment. Use API routes instead.');
      }
      console.log('🔑 Using custom API key for this request');
      return new OpenAI({ apiKey: customApiKey });
    }

    // Otherwise use cached client with environment API key
    if (!this.client) {
      if (typeof window !== 'undefined') {
        throw new Error('GPT5Service cannot be used in browser environment. Use API routes instead.');
      }

      const apiKey = process.env.OPENAI_API_KEY;

      // Debug environment variables (only on server)
      console.log('🔍 Environment debug:');
      console.log('- NODE_ENV:', process.env.NODE_ENV);
      console.log('- OPENAI_API_KEY present:', !!apiKey);
      console.log('- OPENAI_API_KEY length:', apiKey?.length || 0);
      console.log('- OPENAI_API_KEY prefix:', apiKey?.substring(0, 10) || 'none');

      if (!apiKey) {
        throw new Error('OpenAI API key not found. Please set OPENAI_API_KEY environment variable.');
      }

      // Initialize client safely on server-side only
      this.client = new OpenAI({ apiKey });
      console.log('🤖 OpenAI client initialized successfully');
    }

    return this.client;
  }

  /**
   * Main method to interact with GPT-5 using standard Chat Completions API
   */
  async createResponse(
    input: string,
    options: GPT5Options & { apiKey?: string } = {}
  ): Promise<string> {
    const {
      model = 'gpt-5',
      max_tokens,
      tools = [],
      tool_choice,
      apiKey,
      reasoning,
      text
    } = options;

    try {
      console.log(`🤖 GPT-5 ${model}: Processing request...`);
      if (!max_tokens) {
        console.log('🚀 Using unlimited tokens (up to 128k max for GPT-5)');
      } else {
        console.log(`🔢 Token limit set to: ${max_tokens}`);
      }

      const requestOptions: any = {
        model,
        messages: [
          {
            role: 'user',
            content: input
          }
        ],
        // GPT-5 only supports default temperature of 1.0
        // No max_completion_tokens - let GPT-5 use up to 128k tokens
      };

      // Only set token limit if explicitly provided
      if (max_tokens) {
        requestOptions.max_completion_tokens = max_tokens;
      }

      // Add reasoning effort if specified (top-level parameter)
      if (reasoning?.effort) {
        requestOptions.reasoning_effort = reasoning.effort;
        console.log(`🧠 Reasoning effort: ${reasoning.effort}`);
      }

      // Add text verbosity if specified (top-level parameter)
      if (text?.verbosity) {
        requestOptions.verbosity = text.verbosity;
        console.log(`📝 Text verbosity: ${text.verbosity}`);
      }

      // Add tools if specified (for web search)
      if (tools.length > 0) {
        requestOptions.tools = tools.map(tool => ({
          type: 'function',
          function: {
            name: tool.name || 'search',
            description: tool.description || 'Search the web',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' }
              },
              required: ['query']
            }
          }
        }));

        if (tool_choice) {
          requestOptions.tool_choice = 'auto';
        }
      }

      const response = await this.getClient(apiKey).chat.completions.create(requestOptions);

      console.log('🔍 Full response structure:', {
        choices: response.choices?.length || 0,
        hasMessage: !!response.choices?.[0]?.message,
        messageRole: response.choices?.[0]?.message?.role,
        hasContent: !!response.choices?.[0]?.message?.content,
        contentLength: response.choices?.[0]?.message?.content?.length || 0,
        finishReason: response.choices?.[0]?.finish_reason,
        usage: response.usage
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        console.error('❌ GPT-5 returned empty content despite token usage');
        console.error('Full response object:', JSON.stringify(response, null, 2));
        throw new Error('GPT-5 returned empty content despite consuming tokens');
      }

      console.log(`✅ GPT-5 response completed (${response.usage?.total_tokens} tokens)`);
      console.log('📝 Content preview:', content.substring(0, 200));

      return content;
    } catch (error) {
      console.error('GPT-5 request failed:', error);
      throw error;
    }
  }

  /**
   * Perform REAL web search using GPT-5's native web_search tool
   * Uses OpenAI's Responses API with web search capability
   */
  async searchWeb(
    query: string,
    options: {
      maxResults?: number;
      domains?: string[];
      searchType?: 'general' | 'salary' | 'company' | 'technical';
      reasoning?: ReasoningEffort;
      verbosity?: TextVerbosity;
      userLocation?: {
        country?: string;
        city?: string;
        region?: string;
        timezone?: string;
      };
      apiKey?: string;
      userId?: string;
    } = {}
  ): Promise<{ results: any[]; summary: string; sources?: string[] }> {
    const {
      domains = [],
      searchType = 'general',
      reasoning = 'medium', // Changed from minimal - web search needs at least medium reasoning
      userLocation,
      apiKey,
      userId
    } = options;

    console.log(`🔍 GPT-5 Native Web Search: "${query.substring(0, 100)}..."`);

    try {
      // Get API key intelligently
      let finalApiKey = apiKey;

      if (!finalApiKey && userId) {
        const { getUserApiKey } = await import('@/lib/utils/api-key-helper');
        finalApiKey = await getUserApiKey(userId);
      }

      const client = this.getClient(finalApiKey);

      // Build web search tool configuration
      const webSearchTool: any = {
        type: 'web_search'
      };

      // Add domain filtering if specified
      if (domains.length > 0) {
        webSearchTool.filters = {
          allowed_domains: domains.slice(0, 20) // Max 20 domains
        };
      }

      // Add user location if specified
      if (userLocation) {
        webSearchTool.user_location = {
          type: 'approximate',
          ...userLocation
        };
      }

      // Prepare the search prompt
      const searchPrompt = `Please search for: "${query}"

      - Comprehensive analysis with specific data points
      - Real-time information from web sources
      - Include citations and sources`;

      // Use the RESPONSES API with web_search tool (official GPT-5 approach)
      // This is the correct API for web search with GPT-5
      const response = await (client as any).responses.create({
        model: 'gpt-5',
        input: searchPrompt,
        tools: [webSearchTool],
        reasoning: reasoning ? { effort: reasoning } : undefined
      });

      console.log('📊 Raw web search response:', JSON.stringify(response, null, 2).substring(0, 1000));

      // Parse GPT-5 Responses API structure
      // The response has an 'output' array with content items
      const output = response.output || [];
      let textContent = '';
      const citations: any[] = [];
      const results: any[] = [];
      const webSearchCalls: any[] = [];

      // Extract text content and citations from output array
      if (Array.isArray(output)) {
        for (const item of output) {
          // Web search call items contain the search queries
          if (item.type === 'web_search_call') {
            webSearchCalls.push(item);
            console.log('🔍 Web search query:', item.action?.query);
            continue;
          }

          // Web search result items might contain actual URLs
          if (item.type === 'web_search_result') {
            console.log('📄 Found web_search_result:', JSON.stringify(item, null, 2).substring(0, 500));
            if (item.results && Array.isArray(item.results)) {
              item.results.forEach((result: any) => {
                if (result.url) {
                  citations.push({
                    title: result.title || result.name || 'Web Source',
                    url: result.url,
                    text: result.snippet || result.description || '',
                    source: 'web_search_result'
                  });
                }
              });
            }
            continue;
          }

          // Message items contain the actual content with annotations (citations)
          if (item.type === 'message' && item.content) {
            console.log('💬 Found message item with', item.content?.length, 'content items');
            for (const contentItem of item.content) {
              // Check for both 'text' and 'output_text' types
              console.log('📄 Content item type:', contentItem.type);
              if (contentItem.type === 'text' || contentItem.type === 'output_text') {
                textContent += contentItem.text || '';

                // Log if annotations exist
                if (contentItem.annotations) {
                  console.log('📌 Found annotations:', contentItem.annotations.length, 'items');
                }

                // Extract URL citations from annotations
                if (contentItem.annotations && Array.isArray(contentItem.annotations)) {
                  for (const annotation of contentItem.annotations) {
                    console.log('🔖 Annotation type:', annotation.type, 'URL:', annotation.url ? 'YES' : 'NO');
                    if (annotation.type === 'url_citation' && annotation.url) {
                      citations.push({
                        title: annotation.title || 'Web Source',
                        url: annotation.url,
                        text: annotation.text || '',
                        startIndex: annotation.start_index,
                        endIndex: annotation.end_index,
                        source: 'url_citation'
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }

      // If no output array, try legacy fields
      if (!textContent) {
        textContent = response.output_text || response.text || '';
      }

      console.log(`📝 Extracted ${textContent.length} chars of text and ${citations.length} citations from ${webSearchCalls.length} searches`);

      // Convert citations to search results
      if (citations.length > 0) {
        citations.forEach((citation, index) => {
          // Extract content snippet from the text around this citation
          let content = citation.text || '';
          if (!content && textContent && citation.startIndex !== undefined) {
            const start = Math.max(0, citation.startIndex - 100);
            const end = Math.min(textContent.length, citation.endIndex + 100);
            content = textContent.substring(start, end);
          }

          results.push({
            title: citation.title,
            url: citation.url,
            content: content || textContent.substring(0, 300),
            relevance: 0.9 - (index * 0.05), // Higher relevance for earlier citations
            searchType,
            timestamp: new Date().toISOString()
          });
        });
      }

      // If no citations found but we have web search calls, note them
      if (results.length === 0 && textContent) {
        if (webSearchCalls.length > 0) {
          console.log(`⚠️ No URL citations found despite ${webSearchCalls.length} web searches being performed`);
          console.log('📋 Search queries executed:', webSearchCalls.map(c => c.action?.query).filter(Boolean).join(', ').substring(0, 200));

          // Create a note about the searches performed
          results.push({
            title: `Analysis based on ${webSearchCalls.length} web searches`,
            url: '',
            content: textContent,
            relevance: 0.8,
            searchType,
            timestamp: new Date().toISOString(),
            note: `GPT-5 performed ${webSearchCalls.length} searches but did not return specific URL citations. The analysis is based on web data but specific source URLs are not available.`
          });
        } else {
          console.log('⚠️ No citations or web searches found, creating fallback result');
          results.push({
            title: `Web Search: ${query.substring(0, 50)}`,
            url: '',
            content: textContent,
            relevance: 0.8,
            searchType,
            timestamp: new Date().toISOString()
          });
        }
      }

      console.log(`✅ GPT-5 Web Search: ${results.length} results, ${citations.length} URL citations, ${webSearchCalls.length} searches performed`);

      return {
        results,
        summary: textContent,
        sources: citations.map(c => c.url).filter(Boolean)
      };
    } catch (error) {
      console.error('GPT-5 Web Search failed:', error);
      throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search specifically for salary data using GPT-5 web search
   */
  async searchSalaryData(
    jobTitle: string,
    location: string,
    company?: string,
    experience?: string
  ): Promise<{
    salaryRange: { min: number; max: number; currency: string };
    sources: string[];
    confidence: number;
    details: string;
  }> {
    const query = `"${jobTitle}" salary ${location} ${new Date().getFullYear()} ${company || ''} ${experience || ''} compensation total package`;

    const searchResults = await this.searchWeb(query, {
      searchType: 'salary',
      domains: [
        'glassdoor.com',
        'salary.com',
        'payscale.com',
        'levels.fyi',
        'indeed.com',
        'h1bdata.info'
      ],
      reasoning: 'high'
    });

    // Parse salary data from web search results
    return this.parseSalaryFromText(searchResults.summary, searchResults.sources || []);
  }


  /**
   * Parse salary data from text response
   */
  private parseSalaryFromText(
    text: string,
    sources: string[] = []
  ): {
    salaryRange: { min: number; max: number; currency: string };
    sources: string[];
    confidence: number;
    details: string;
  } {
    // Extract numbers from text
    const numbers = text.match(/\$?[\d,]+k?/gi) || [];
    const parsed = numbers.map((n: string) => {
      let value = parseFloat(n.replace(/[$,]/g, ''));
      if (n.toLowerCase().includes('k')) {
        value *= 1000;
      }
      return value;
    }).filter((n: number) => n > 10000 && n < 1000000); // Reasonable salary range

    if (parsed.length >= 2) {
      return {
        salaryRange: {
          min: Math.min(...parsed),
          max: Math.max(...parsed),
          currency: 'USD'
        },
        sources: sources.length > 0 ? sources : ['GPT-5 Web Search Analysis'],
        confidence: 0.7, // Medium confidence for AI estimates
        details: text
      };
    }

    // Fallback - try to extract ranges like "80k-120k" or "80,000-120,000"
    const rangeMatch = text.match(/(\$?[\d,]+k?)\s*[-–—]\s*(\$?[\d,]+k?)/i);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1].replace(/[$,]/g, '')) * (rangeMatch[1].includes('k') ? 1000 : 1);
      const max = parseFloat(rangeMatch[2].replace(/[$,]/g, '')) * (rangeMatch[2].includes('k') ? 1000 : 1);

      if (min > 10000 && max > min) {
        return {
          salaryRange: { min: Math.round(min), max: Math.round(max), currency: 'USD' },
          sources: sources.length > 0 ? sources : ['GPT-5 Web Search Analysis'],
          confidence: 0.8,
          details: text
        };
      }
    }

    // Default fallback
    return {
      salaryRange: { min: 50000, max: 100000, currency: 'USD' },
      sources: ['GPT-5 Estimate'],
      confidence: 0.5,
      details: text
    };
  }

  /**
   * General purpose completion with GPT-5 (mapped to available models)
   */
  async complete(
    prompt: string,
    options: {
      model?: GPT5Model;
      reasoning?: ReasoningEffort;
      verbosity?: TextVerbosity;
      maxTokens?: number;
      apiKey?: string;
    } = {}
  ): Promise<string> {
    const {
      model = 'gpt-5-mini', // Default to mini for cost efficiency
      maxTokens, // No default - let GPT-5 use up to its max (128k)
      apiKey
    } = options;

    console.log(`🤖 GPT-5 Complete: Using model ${model} for general completion`);

    return await this.createResponse(prompt, {
      model,
      max_tokens: maxTokens,
      reasoning: options.reasoning ? { effort: options.reasoning } : undefined,
      text: options.verbosity ? { verbosity: options.verbosity } : undefined,
      apiKey
    });
  }

  /**
   * Test service availability and model access
   */
  async testService(): Promise<{ status: 'success' | 'error'; message: string; model: string }> {
    try {
      console.log('🧪 Testing GPT-5 service availability...');

      const testResponse = await this.createResponse(
        'Hello! This is a test message to verify the service is working.',
        {
          model: 'gpt-5-mini',
          // No token limits - using GPT-5 full capacity
        }
      );

      if (testResponse && testResponse.length > 0) {
        console.log('✅ GPT-5 service test successful');
        return {
          status: 'success',
          message: 'Service is working correctly',
          model: 'gpt-5-mini'
        };
      } else {
        throw new Error('Empty response received');
      }
    } catch (error) {
      console.error('❌ GPT-5 service test failed:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        model: 'none'
      };
    }
  }
}

// Export singleton instance
export const gpt5Service = new GPT5Service();