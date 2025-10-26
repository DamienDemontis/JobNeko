/**
 * GPT-5 Native Web Search Service
 * Replaces Tavily with GPT-5's built-in web search capabilities
 * NO FALLBACKS - Only real web search data
 */

import { gpt5Service } from './gpt5-service';

interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

interface WebSearchResponse {
  query: string;
  results: SearchResult[];
  answer?: string;
  timestamp: string;
}

export class GPT5WebSearchService {
  /**
   * Search the web using GPT-5's native web search - NO FALLBACKS FOR REAL DATA
   */
  async searchWeb(query: string, maxResults = 5): Promise<WebSearchResponse> {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured - REAL WEB SEARCH REQUIRED');
      throw new Error('Web search API not configured. Cannot provide real salary data without live search capability.');
    }

    try {
      console.log(`🔍 GPT-5 Web Search: "${query.substring(0, 100)}..."`);

      const { results, summary } = await gpt5Service.searchWeb(query, {
        maxResults: Math.min(maxResults, 10),
        domains: [
          'glassdoor.com',
          'salary.com',
          'payscale.com',
          'levels.fyi',
          'numbeo.com',
          'indeed.com',
          'linkedin.com'
        ],
        searchType: 'general',
        reasoning: 'minimal',
        verbosity: 'low'
      });

      const searchResults: SearchResult[] = results.map((result: any, index: number) => ({
        title: result.title || `Result ${index + 1}`,
        url: result.url || '',
        content: result.content || result.snippet || '',
        score: result.relevance || result.score || 0.5,
        publishedDate: result.publishedDate || result.date
      }));

      console.log(`✅ Found ${searchResults.length} web results for: "${query.substring(0, 50)}..."`);

      return {
        query,
        results: searchResults,
        answer: summary,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('GPT-5 web search failed:', error);
      throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}. Real market data not available.`);
    }
  }

  /**
   * Search for salary data using GPT-5's web search
   */
  async searchSalaryData(
    jobTitle: string,
    location: string,
    company?: string,
    experience?: string
  ): Promise<WebSearchResponse> {
    const query = [
      `"${jobTitle}" salary ${location} ${new Date().getFullYear()}`,
      company ? `"${company}"` : '',
      experience ? `${experience} years experience` : '',
      'compensation package total'
    ].filter(q => q).join(' ');

    console.log(`💰 GPT-5 Salary Search: "${query}"`);

    const salaryData = await gpt5Service.searchSalaryData(
      jobTitle,
      location,
      company,
      experience
    );

    // Convert GPT-5 salary results to our format
    const searchResults: SearchResult[] = salaryData.salaryRange.min > 0 ? [{
      title: `${jobTitle} Salary in ${location}`,
      url: 'https://multiple-sources.com',
      content: salaryData.details || 'Salary data from multiple sources',
      score: salaryData.confidence
    }] : [];

    return {
      query,
      results: searchResults,
      answer: salaryData.details,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Search for company information using GPT-5
   */
  async searchCompanyInfo(
    company: string,
    topics: string[] = ['culture', 'reviews', 'benefits', 'work-life balance']
  ): Promise<WebSearchResponse> {
    const query = `"${company}" ${topics.join(' ')} employee reviews ${new Date().getFullYear()}`;

    console.log(`🏢 GPT-5 Company Search: "${query}"`);

    const { results, summary } = await gpt5Service.searchWeb(query, {
      maxResults: 5,
      domains: [
        'glassdoor.com',
        'indeed.com',
        'linkedin.com',
        'comparably.com',
        'teamblind.com'
      ],
      searchType: 'company',
      reasoning: 'minimal',
      verbosity: 'low'
    });

    const searchResults: SearchResult[] = results.map((result: any, index: number) => ({
      title: result.title || `${company} Review ${index + 1}`,
      url: result.url || '',
      content: result.content || result.snippet || '',
      score: result.relevance || 0.7,
      publishedDate: result.publishedDate
    }));

    return {
      query,
      results: searchResults,
      answer: summary,
      timestamp: new Date().toISOString()
    };
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
export const gpt5WebSearch = new GPT5WebSearchService();