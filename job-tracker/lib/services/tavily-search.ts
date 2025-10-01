/**
 * Tavily Web Search Service - Real Web Search Implementation
 * Uses Tavily API for actual web searches instead of simulating
 *
 * ⚠️ SERVER-SIDE ONLY - Do not use in client-side components
 */

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilySearchOptions {
  search_depth?: 'basic' | 'advanced';
  max_results?: number;
  include_domains?: string[];
  exclude_domains?: string[];
  include_answer?: boolean;
  include_raw_content?: boolean;
  include_images?: boolean;
}

interface TavilyResponse {
  query: string;
  answer?: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
    raw_content?: string;
  }>;
}

export class TavilySearchService {
  private apiKey: string;
  private baseUrl = 'https://api.tavily.com';

  constructor() {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY is not configured');
    }
    this.apiKey = apiKey;
  }

  /**
   * Perform a real web search using Tavily API
   */
  async search(
    query: string,
    options: TavilySearchOptions = {}
  ): Promise<TavilyResponse> {
    try {
      console.log(`🔍 Tavily Search: "${query.substring(0, 100)}..."`);

      const requestBody = {
        api_key: this.apiKey,
        query,
        search_depth: options.search_depth || 'advanced',
        max_results: options.max_results || 5,
        include_domains: options.include_domains || [],
        exclude_domains: options.exclude_domains || [],
        include_answer: options.include_answer !== false,
        include_raw_content: options.include_raw_content || false,
        include_images: options.include_images || false
      };

      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Tavily search failed:', response.status, errorText);
        throw new Error(`Tavily search failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      console.log(`✅ Tavily found ${data.results?.length || 0} results`);

      return {
        query: data.query,
        answer: data.answer,
        results: data.results || []
      };
    } catch (error) {
      console.error('Tavily search error:', error);
      throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for salary-specific data
   */
  async searchSalaryData(
    jobTitle: string,
    location: string,
    company?: string,
    experience?: string
  ): Promise<TavilyResponse> {
    const query = [
      `"${jobTitle}" salary ${location} ${new Date().getFullYear()}`,
      company ? `"${company}" compensation` : '',
      experience ? `${experience} years experience` : '',
      'total compensation package benefits'
    ].filter(q => q).join(' ');

    return this.search(query, {
      search_depth: 'advanced',
      max_results: 8,
      include_domains: [
        'glassdoor.com',
        'salary.com',
        'payscale.com',
        'levels.fyi',
        'indeed.com',
        'linkedin.com',
        'comparably.com',
        'blind.teamblind.com',
        'h1bdata.info'
      ],
      include_answer: true
    });
  }

  /**
   * Search for company information
   */
  async searchCompanyInfo(
    company: string,
    topics: string[] = ['culture', 'reviews', 'benefits', 'work-life balance']
  ): Promise<TavilyResponse> {
    const query = `"${company}" ${topics.join(' ')} employee reviews ${new Date().getFullYear()}`;

    return this.search(query, {
      search_depth: 'advanced',
      max_results: 6,
      include_domains: [
        'glassdoor.com',
        'indeed.com',
        'comparably.com',
        'blind.teamblind.com',
        'levels.fyi',
        'linkedin.com'
      ],
      include_answer: true
    });
  }

  /**
   * Search for location and cost of living data
   */
  async searchLocationData(
    location: string,
    topics: string[] = ['cost of living', 'quality of life', 'expat', 'housing']
  ): Promise<TavilyResponse> {
    const query = `${location} ${topics.join(' ')} ${new Date().getFullYear()}`;

    return this.search(query, {
      search_depth: 'advanced',
      max_results: 8,
      include_domains: [
        'numbeo.com',
        'expatistan.com',
        'teleport.org',
        'nomadlist.com',
        'internations.org',
        'mercer.com',
        'oecd.org'
      ],
      include_answer: true
    });
  }

  /**
   * Search for VIE (French international volunteer) information
   */
  async searchVIEData(
    country: string
  ): Promise<TavilyResponse> {
    const query = `VIE gratification ${country} ${new Date().getFullYear()} monthly amount EUR`;

    return this.search(query, {
      search_depth: 'advanced',
      max_results: 5,
      include_domains: [
        'civiweb.com',
        'diplomatie.gouv.fr',
        'businessfrance.fr',
        'service-public.fr',
        'ambafrance.org'
      ],
      include_answer: true
    });
  }

  /**
   * Search for interview questions and preparation
   */
  async searchInterviewData(
    jobTitle: string,
    company: string
  ): Promise<TavilyResponse> {
    const query = `"${company}" "${jobTitle}" interview questions process ${new Date().getFullYear()}`;

    return this.search(query, {
      search_depth: 'advanced',
      max_results: 6,
      include_domains: [
        'glassdoor.com',
        'leetcode.com',
        'indeed.com',
        'careercup.com',
        'levels.fyi',
        'blind.teamblind.com'
      ],
      include_answer: true
    });
  }
}

// Export singleton instance
export const tavilySearch = new TavilySearchService();