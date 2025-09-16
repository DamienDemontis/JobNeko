/**
 * AI Web Search Service
 * Provides real web search capabilities for salary intelligence
 */

import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Tavily Search API configuration
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface WebSearchResponse {
  query: string;
  results: SearchResult[];
  answer?: string;
}

export class AIWebSearchService {
  /**
   * Search the web using Tavily API - NO FALLBACKS FOR REAL DATA
   */
  async searchWeb(query: string, maxResults = 5): Promise<WebSearchResponse> {
    if (!TAVILY_API_KEY) {
      console.error('Tavily API key not configured - REAL WEB SEARCH REQUIRED');
      throw new Error('Web search API not configured. Cannot provide real salary data without live search capability.');
    }

    try {
      console.log(`🔍 Searching web: "${query.substring(0, 100)}..."`);

      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TAVILY_API_KEY}`
        },
        body: JSON.stringify({
          query: query.substring(0, 400),
          search_depth: 'advanced',
          include_answer: true,
          include_raw_content: false,
          max_results: Math.min(maxResults, 10),
          include_domains: [
            'glassdoor.com',
            'salary.com',
            'payscale.com',
            'levels.fyi',
            'numbeo.com',
            'indeed.com',
            'linkedin.com'
          ],
          time_range: 'year'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Tavily API error ${response.status}:`, errorText);
        throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from Tavily API');
      }

      const results = data.results?.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score || 0.5
      })) || [];

      console.log(`✅ Found ${results.length} web results for: "${query.substring(0, 50)}..."`);

      return {
        query,
        results,
        answer: data.answer
      };
    } catch (error) {
      console.error('Web search failed:', error);
      throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}. Real market data not available.`);
    }
  }

  /**
   * DEPRECATED: No fallbacks allowed for real market data
   * This ensures we never provide hardcoded or estimated values
   */
  private async noFallbackAllowed(query: string): Promise<never> {
    throw new Error('No fallback search allowed. Real web search is required for accurate salary data.');
  }
}

// Export singleton
export const aiWebSearch = new AIWebSearchService();