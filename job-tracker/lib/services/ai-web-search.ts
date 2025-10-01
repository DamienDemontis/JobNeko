/**
 * AI Web Search Service - GPT-5 REAL Native Web Search
 * Uses GPT-5's built-in web_search tool via Responses API for actual web searches
 *
 * ⚠️ SERVER-SIDE ONLY - Do not use in client-side components
 * Use API routes to interact with this service from the frontend
 */

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
  timestamp?: string;
}

export class AIWebSearchService {
  /**
   * Search the web using GPT-5 native web search with different analysis levels
   */
  async searchWeb(
    query: string,
    maxResults = 5,
    analysisLevel: 'minimal' | 'low' | 'medium' | 'high' = 'medium'
  ): Promise<WebSearchResponse> {
    try {
      console.log(`🔍 GPT-5 Web Search (${analysisLevel}): "${query.substring(0, 100)}..."`);

      // Dynamic import to avoid client-side initialization
      const { gpt5Service } = await import('./gpt5-service');

      const searchResult = await gpt5Service.searchWeb(query, {
        maxResults,
        domains: [
          'glassdoor.com',
          'salary.com',
          'payscale.com',
          'levels.fyi',
          'numbeo.com',
          'indeed.com',
          'linkedin.com',
          'comparably.com',
          'teamblind.com'
        ],
        searchType: 'general',
        reasoning: analysisLevel,
        verbosity: analysisLevel === 'minimal' ? 'low' : analysisLevel === 'high' ? 'high' : 'medium'
      });

      console.log(`✅ GPT-5 found ${searchResult.results.length} web results`);

      return {
        query,
        results: searchResult.results,
        answer: searchResult.summary,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('GPT-5 web search failed:', error);
      throw new Error(`GPT-5 web search failed: ${error instanceof Error ? error.message : 'Unknown error'}. Real market data not available.`);
    }
  }

  /**
   * Search for salary-specific data using GPT-5 with high analysis level
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

    return this.searchWeb(query, 8, 'high'); // Use high analysis for salary data
  }

  /**
   * Search for company information using GPT-5 with medium analysis level
   */
  async searchCompanyInfo(
    company: string,
    topics: string[] = ['culture', 'reviews', 'benefits', 'work-life balance']
  ): Promise<WebSearchResponse> {
    const query = `"${company}" ${topics.join(' ')} employee reviews ${new Date().getFullYear()}`;

    return this.searchWeb(query, 6, 'medium'); // Use medium analysis for company info
  }
}

// Export singleton
export const aiWebSearch = new AIWebSearchService();