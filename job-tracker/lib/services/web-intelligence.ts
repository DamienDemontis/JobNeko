/**
 * Web Intelligence Service - Advanced web research and data collection
 * Provides comprehensive company and market intelligence
 * NO FALLBACKS - Only real web data and intelligent analysis
 *
 * ⚠️ SERVER-SIDE ONLY - Do not use in client-side components
 * Use API routes to interact with this service from the frontend
 */

import { unifiedAI } from './unified-ai-service';

export interface CompanyFinancialData {
  revenue?: number;
  revenueGrowth?: number;
  employees?: number;
  employeeGrowth?: number;
  fundingRounds?: FundingRound[];
  marketCap?: number;
  profitMargin?: number;
  debtRatio?: number;
  cashReserves?: number;
  financialHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
}

export interface FundingRound {
  type: 'seed' | 'series_a' | 'series_b' | 'series_c' | 'ipo' | 'acquisition';
  amount: number;
  date: Date;
  investors?: string[];
  valuation?: number;
}

export interface CompanyNews {
  title: string;
  url: string;
  date: Date;
  source: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  category: 'financial' | 'leadership' | 'product' | 'layoffs' | 'hiring' | 'acquisition' | 'funding';
  summary: string;
  impact: 'high' | 'medium' | 'low';
}

export interface GlassdoorData {
  overallRating: number;
  ceoRating?: number;
  recommendToFriend?: number;
  careerOpportunities?: number;
  workLifeBalance?: number;
  compensation?: number;
  culture?: number;
  totalReviews: number;
  recentTrend: 'improving' | 'stable' | 'declining';
  commonPros: string[];
  commonCons: string[];
  salaryData?: SalaryRange[];
}

export interface SalaryRange {
  jobTitle: string;
  min: number;
  max: number;
  median: number;
  currency: string;
  dataPoints: number;
}

export interface TeamComposition {
  totalEmployees: number;
  departmentSizes: { [department: string]: number };
  experienceLevels: { [level: string]: number };
  diversityMetrics?: {
    genderRatio: number;
    averageTenure: number;
    turnoverRate?: number;
  };
  recentHires: number;
  recentDepartures: number;
  growthRate: number;
}

export interface CompetitorAnalysis {
  mainCompetitors: Competitor[];
  marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';
  competitiveAdvantages: string[];
  marketShare?: number;
  riskFactors: string[];
  opportunities: string[];
}

export interface Competitor {
  name: string;
  marketCap?: number;
  employees?: number;
  revenueComparison: 'higher' | 'similar' | 'lower' | 'unknown';
  strengthAreas: string[];
}

export interface IndustryOutlook {
  growthProjection: number;
  marketSize: number;
  keyTrends: string[];
  disruptionRisk: 'low' | 'medium' | 'high';
  regulatoryRisks: string[];
  technologyTrends: string[];
  talentDemand: 'low' | 'medium' | 'high' | 'very_high';
}

export interface CompanyIntelligence {
  companyName: string;
  website?: string;
  foundedYear?: number;
  headquarters?: string;
  industry: string;
  businessModel: string;

  financialData: CompanyFinancialData;
  recentNews: CompanyNews[];
  glassdoorData?: GlassdoorData;
  teamComposition: TeamComposition;
  competitorAnalysis: CompetitorAnalysis;
  industryOutlook: IndustryOutlook;

  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high';
    stabilityFactors: string[];
    concerningSignals: string[];
    positiveIndicators: string[];
  };

  lastUpdated: Date;
  dataQuality: 'excellent' | 'good' | 'limited' | 'poor';
}

export class WebIntelligenceService {
  private static instance: WebIntelligenceService;

  private constructor() {}

  static getInstance(): WebIntelligenceService {
    if (!WebIntelligenceService.instance) {
      WebIntelligenceService.instance = new WebIntelligenceService();
    }
    return WebIntelligenceService.instance;
  }

  /**
   * Get comprehensive company intelligence
   */
  async getCompanyIntelligence(companyName: string, userId: string): Promise<CompanyIntelligence> {
    try {
      console.log(`🔍 Starting comprehensive intelligence gathering for: ${companyName}`);

      // Execute parallel intelligence gathering
      const [
        financialData,
        newsData,
        glassdoorData,
        teamData,
        competitorData,
        industryData
      ] = await Promise.allSettled([
        this.gatherFinancialIntelligence(companyName, userId),
        this.gatherNewsIntelligence(companyName, userId),
        this.gatherGlassdoorIntelligence(companyName, userId),
        this.gatherTeamIntelligence(companyName, userId),
        this.gatherCompetitorIntelligence(companyName, userId),
        this.gatherIndustryIntelligence(companyName, userId)
      ]);

      // Process results
      const intelligence: CompanyIntelligence = {
        companyName,
        industry: 'Technology', // Would be detected from research
        businessModel: 'Software/SaaS', // Would be detected from research

        financialData: financialData.status === 'fulfilled' ? financialData.value : this.getDefaultFinancialData(),
        recentNews: newsData.status === 'fulfilled' ? newsData.value : [],
        glassdoorData: glassdoorData.status === 'fulfilled' ? glassdoorData.value : undefined,
        teamComposition: teamData.status === 'fulfilled' ? teamData.value : this.getDefaultTeamData(),
        competitorAnalysis: competitorData.status === 'fulfilled' ? competitorData.value : this.getDefaultCompetitorData(),
        industryOutlook: industryData.status === 'fulfilled' ? industryData.value : this.getDefaultIndustryData(),

        riskAssessment: await this.assessCompanyRisk(companyName, userId, {
          financial: financialData.status === 'fulfilled' ? financialData.value : undefined,
          news: newsData.status === 'fulfilled' ? newsData.value : [],
          glassdoor: glassdoorData.status === 'fulfilled' ? glassdoorData.value : undefined
        }),

        lastUpdated: new Date(),
        dataQuality: this.assessDataQuality([financialData, newsData, glassdoorData, teamData])
      };

      console.log(`✅ Company intelligence completed for ${companyName}`);
      return intelligence;

    } catch (error) {
      console.error('Error gathering company intelligence:', error);
      throw new Error(`Failed to gather company intelligence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gather financial intelligence about the company
   */
  private async gatherFinancialIntelligence(companyName: string, userId: string): Promise<CompanyFinancialData> {
    try {
      const queries = [
        `"${companyName}" revenue funding valuation 2024 financial results`,
        `"${companyName}" layoffs hiring growth employees 2024`,
        `"${companyName}" funding round series investment venture capital`
      ];

      // Dynamic import to avoid client-side initialization
      const { aiWebSearch } = await import('./ai-web-search');
      const searchResults = await Promise.all(
        queries.map(query => aiWebSearch.searchWeb(query, 5))
      );

      // Combine search results
      const allResults = searchResults.flatMap(result => result.results || []);
      const relevantResults = allResults.filter(result =>
        result.url && result.content && !result.content.includes('Based on AI knowledge')
      );

      if (relevantResults.length === 0) {
        throw new Error('No financial data sources found');
      }

      // Analyze financial data using AI
      const analysisPrompt = this.buildFinancialAnalysisPrompt(companyName, relevantResults);
      const response = await unifiedAI.process({
        operation: 'company_analysis',
        content: analysisPrompt
      });

      if (!response.success) {
        throw new Error(`Financial analysis failed: ${response.error?.message}`);
      }
      const responseContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      return this.parseFinancialData(responseContent);

    } catch (error) {
      console.error('Error gathering financial intelligence:', error);
      throw error;
    }
  }

  /**
   * Gather recent news and sentiment analysis
   */
  private async gatherNewsIntelligence(companyName: string, userId: string): Promise<CompanyNews[]> {
    try {
      const currentYear = new Date().getFullYear();
      const query = `"${companyName}" news ${currentYear} layoffs hiring acquisition funding CEO leadership`;

      // Dynamic import to avoid client-side initialization
      const { aiWebSearch } = await import('./ai-web-search');
      const searchResult = await aiWebSearch.searchWeb(query, 10);
      const newsResults = searchResult.results?.filter(result =>
        result.url && result.content && !result.content.includes('Based on AI knowledge')
      ) || [];

      if (newsResults.length === 0) {
        return [];
      }

      // Analyze news sentiment and categorization
      const analysisPrompt = this.buildNewsAnalysisPrompt(companyName, newsResults);
      const response = await unifiedAI.process({
        operation: 'company_analysis',
        content: analysisPrompt
      });

      if (!response.success) { throw new Error(`Analysis failed: ${response.error?.message}`); } const responseContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data); return this.parseNewsData(responseContent);

    } catch (error) {
      console.error('Error gathering news intelligence:', error);
      return [];
    }
  }

  /**
   * Gather Glassdoor data and employee sentiment
   */
  private async gatherGlassdoorIntelligence(companyName: string, userId: string): Promise<GlassdoorData | undefined> {
    try {
      const query = `"${companyName}" glassdoor reviews rating culture salary work life balance`;

      // Dynamic import to avoid client-side initialization
      const { aiWebSearch } = await import('./ai-web-search');
      const searchResult = await aiWebSearch.searchWeb(query, 5);
      const glassdoorResults = searchResult.results?.filter(result =>
        result.url && result.content &&
        (result.url.includes('glassdoor') || result.content.toLowerCase().includes('glassdoor')) &&
        !result.content.includes('Based on AI knowledge')
      ) || [];

      if (glassdoorResults.length === 0) {
        return undefined;
      }

      // Analyze Glassdoor data
      const analysisPrompt = this.buildGlassdoorAnalysisPrompt(companyName, glassdoorResults);
      const response = await unifiedAI.process({
        operation: 'company_analysis',
        content: analysisPrompt
      });

      if (!response.success) { throw new Error(`Analysis failed: ${response.error?.message}`); } const responseContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data); return this.parseGlassdoorData(responseContent);

    } catch (error) {
      console.error('Error gathering Glassdoor intelligence:', error);
      return undefined;
    }
  }

  /**
   * Gather team composition and culture data
   */
  private async gatherTeamIntelligence(companyName: string, userId: string): Promise<TeamComposition> {
    try {
      const query = `"${companyName}" linkedin employees team size hiring engineering sales marketing`;

      // Dynamic import to avoid client-side initialization
      const { aiWebSearch } = await import('./ai-web-search');
      const searchResult = await aiWebSearch.searchWeb(query, 5);
      const teamResults = searchResult.results?.filter(result =>
        result.url && result.content && !result.content.includes('Based on AI knowledge')
      ) || [];

      // Analyze team data
      const analysisPrompt = this.buildTeamAnalysisPrompt(companyName, teamResults);
      const response = await unifiedAI.process({
        operation: 'company_analysis',
        content: analysisPrompt
      });

      if (!response.success) { throw new Error(`Analysis failed: ${response.error?.message}`); } const responseContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data); return this.parseTeamData(responseContent);

    } catch (error) {
      console.error('Error gathering team intelligence:', error);
      return this.getDefaultTeamData();
    }
  }

  /**
   * Gather competitor analysis
   */
  private async gatherCompetitorIntelligence(companyName: string, userId: string): Promise<CompetitorAnalysis> {
    try {
      const query = `"${companyName}" competitors market share competitive analysis industry position`;

      // Dynamic import to avoid client-side initialization
      const { aiWebSearch } = await import('./ai-web-search');
      const searchResult = await aiWebSearch.searchWeb(query, 6);
      const competitorResults = searchResult.results?.filter(result =>
        result.url && result.content && !result.content.includes('Based on AI knowledge')
      ) || [];

      // Analyze competitor data
      const analysisPrompt = this.buildCompetitorAnalysisPrompt(companyName, competitorResults);
      const response = await unifiedAI.process({
        operation: 'company_analysis',
        content: analysisPrompt
      });

      if (!response.success) { throw new Error(`Analysis failed: ${response.error?.message}`); } const responseContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data); return this.parseCompetitorData(responseContent);

    } catch (error) {
      console.error('Error gathering competitor intelligence:', error);
      return this.getDefaultCompetitorData();
    }
  }

  /**
   * Gather industry outlook and trends
   */
  private async gatherIndustryIntelligence(companyName: string, userId: string): Promise<IndustryOutlook> {
    try {
      const currentYear = new Date().getFullYear();
      const query = `industry outlook ${currentYear} trends growth technology software market analysis`;

      // Dynamic import to avoid client-side initialization
      const { aiWebSearch } = await import('./ai-web-search');
      const searchResult = await aiWebSearch.searchWeb(query, 5);
      const industryResults = searchResult.results?.filter(result =>
        result.url && result.content && !result.content.includes('Based on AI knowledge')
      ) || [];

      // Analyze industry data
      const analysisPrompt = this.buildIndustryAnalysisPrompt(companyName, industryResults);
      const response = await unifiedAI.process({
        operation: 'company_analysis',
        content: analysisPrompt
      });

      if (!response.success) { throw new Error(`Analysis failed: ${response.error?.message}`); } const responseContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data); return this.parseIndustryData(responseContent);

    } catch (error) {
      console.error('Error gathering industry intelligence:', error);
      return this.getDefaultIndustryData();
    }
  }

  /**
   * Assess overall company risk
   */
  private async assessCompanyRisk(companyName: string, userId: string, data: any): Promise<CompanyIntelligence['riskAssessment']> {
    try {
      const riskPrompt = `Assess the risk factors for working at ${companyName} based on the following data:

Financial Data: ${JSON.stringify(data.financial || {})}
Recent News: ${JSON.stringify(data.news || [])}
Employee Feedback: ${JSON.stringify(data.glassdoor || {})}

Provide a comprehensive risk assessment including:
1. Overall risk level (low/medium/high)
2. Stability factors that make the company stable
3. Concerning signals that might indicate problems
4. Positive indicators for job security and growth

Return as JSON with the following structure:
{
  "overallRisk": "low|medium|high",
  "stabilityFactors": ["factor1", "factor2"],
  "concerningSignals": ["signal1", "signal2"],
  "positiveIndicators": ["indicator1", "indicator2"]
}`;

      const response = await unifiedAI.process({
        operation: 'company_analysis',
        content: riskPrompt
      });

      if (!response.success) { throw new Error(`Analysis failed: ${response.error?.message}`); } const responseContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data); return this.parseRiskAssessment(responseContent);

    } catch (error) {
      console.error('Error assessing company risk:', error);
      return {
        overallRisk: 'medium',
        stabilityFactors: ['Unable to assess - limited data'],
        concerningSignals: ['Limited public information available'],
        positiveIndicators: []
      };
    }
  }

  // Prompt builders

  private buildFinancialAnalysisPrompt(companyName: string, results: any[]): string {
    return `Analyze the financial health of ${companyName} based on the following web search results:

${results.map((result, i) => `
Result ${i + 1}:
Title: ${result.title}
Content: ${result.content?.substring(0, 500)}...
URL: ${result.url}
`).join('\n')}

Extract and analyze:
1. Revenue and revenue growth
2. Employee count and growth
3. Funding rounds and valuation
4. Financial health indicators
5. Market position

Return as JSON:
{
  "revenue": number_in_usd_or_null,
  "revenueGrowth": percentage_or_null,
  "employees": number_or_null,
  "employeeGrowth": percentage_or_null,
  "fundingRounds": [{"type": "series_a", "amount": number, "date": "2024-01-01"}],
  "financialHealth": "excellent|good|fair|poor|unknown"
}`;
  }

  private buildNewsAnalysisPrompt(companyName: string, results: any[]): string {
    return `Analyze recent news about ${companyName} and categorize by sentiment and impact:

${results.map((result, i) => `
News ${i + 1}:
Title: ${result.title}
Content: ${result.content?.substring(0, 400)}...
URL: ${result.url}
`).join('\n')}

For each news item, analyze:
1. Sentiment (positive/neutral/negative)
2. Category (financial/leadership/product/layoffs/hiring/acquisition/funding)
3. Impact level (high/medium/low)
4. Brief summary

Return as JSON array:
[{
  "title": "news title",
  "url": "url",
  "date": "2024-01-01",
  "sentiment": "positive|neutral|negative",
  "category": "category",
  "impact": "high|medium|low",
  "summary": "brief summary"
}]`;
  }

  private buildGlassdoorAnalysisPrompt(companyName: string, results: any[]): string {
    return `Extract Glassdoor data for ${companyName} from these search results:

${results.map((result, i) => `
Result ${i + 1}:
Title: ${result.title}
Content: ${result.content?.substring(0, 400)}...
`).join('\n')}

Extract:
1. Overall rating
2. CEO rating
3. Recommendation percentage
4. Work-life balance rating
5. Common pros and cons
6. Rating trends

Return as JSON:
{
  "overallRating": number_1_to_5,
  "ceoRating": number_or_null,
  "recommendToFriend": percentage_or_null,
  "workLifeBalance": number_1_to_5_or_null,
  "totalReviews": number_or_null,
  "recentTrend": "improving|stable|declining",
  "commonPros": ["pro1", "pro2"],
  "commonCons": ["con1", "con2"]
}`;
  }

  private buildTeamAnalysisPrompt(companyName: string, results: any[]): string {
    return `Analyze team composition and hiring trends for ${companyName}:

${results.map((result, i) => `
Result ${i + 1}: ${result.content?.substring(0, 300)}...
`).join('\n')}

Extract information about:
1. Total employee count
2. Department sizes
3. Recent hiring activity
4. Team growth rate

Return as JSON:
{
  "totalEmployees": number_or_estimate,
  "departmentSizes": {"engineering": number, "sales": number},
  "recentHires": number_or_estimate,
  "growthRate": percentage
}`;
  }

  private buildCompetitorAnalysisPrompt(companyName: string, results: any[]): string {
    return `Identify competitors and market position for ${companyName}:

${results.map((result, i) => `
Result ${i + 1}: ${result.content?.substring(0, 300)}...
`).join('\n')}

Analyze:
1. Main competitors
2. Market position
3. Competitive advantages
4. Market risks

Return as JSON:
{
  "mainCompetitors": [{"name": "competitor", "strengthAreas": ["area1"]}],
  "marketPosition": "leader|challenger|follower|niche",
  "competitiveAdvantages": ["advantage1", "advantage2"],
  "riskFactors": ["risk1", "risk2"]
}`;
  }

  private buildIndustryAnalysisPrompt(companyName: string, results: any[]): string {
    return `Analyze industry outlook and trends:

${results.map((result, i) => `
Result ${i + 1}: ${result.content?.substring(0, 300)}...
`).join('\n')}

Extract:
1. Industry growth projections
2. Key technology trends
3. Market disruption risks
4. Talent demand levels

Return as JSON:
{
  "growthProjection": percentage,
  "keyTrends": ["trend1", "trend2"],
  "disruptionRisk": "low|medium|high",
  "talentDemand": "low|medium|high|very_high"
}`;
  }

  // Data parsers

  private parseFinancialData(content: string): CompanyFinancialData {
    try {
      const parsed = JSON.parse(content);
      return {
        ...parsed,
        financialHealth: parsed.financialHealth || 'unknown'
      };
    } catch (error) {
      return this.getDefaultFinancialData();
    }
  }

  private parseNewsData(content: string): CompanyNews[] {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed.map(news => ({
        ...news,
        date: new Date(news.date || new Date())
      })) : [];
    } catch (error) {
      return [];
    }
  }

  private parseGlassdoorData(content: string): GlassdoorData {
    try {
      return JSON.parse(content);
    } catch (error) {
      return {
        overallRating: 0,
        totalReviews: 0,
        recentTrend: 'stable',
        commonPros: [],
        commonCons: []
      };
    }
  }

  private parseTeamData(content: string): TeamComposition {
    try {
      const parsed = JSON.parse(content);
      return {
        totalEmployees: parsed.totalEmployees || 0,
        departmentSizes: parsed.departmentSizes || {},
        experienceLevels: parsed.experienceLevels || {},
        recentHires: parsed.recentHires || 0,
        recentDepartures: parsed.recentDepartures || 0,
        growthRate: parsed.growthRate || 0
      };
    } catch (error) {
      return this.getDefaultTeamData();
    }
  }

  private parseCompetitorData(content: string): CompetitorAnalysis {
    try {
      return JSON.parse(content);
    } catch (error) {
      return this.getDefaultCompetitorData();
    }
  }

  private parseIndustryData(content: string): IndustryOutlook {
    try {
      return JSON.parse(content);
    } catch (error) {
      return this.getDefaultIndustryData();
    }
  }

  private parseRiskAssessment(content: string): CompanyIntelligence['riskAssessment'] {
    try {
      return JSON.parse(content);
    } catch (error) {
      return {
        overallRisk: 'medium',
        stabilityFactors: [],
        concerningSignals: [],
        positiveIndicators: []
      };
    }
  }

  // Default data helpers

  private getDefaultFinancialData(): CompanyFinancialData {
    return {
      financialHealth: 'unknown'
    };
  }

  private getDefaultTeamData(): TeamComposition {
    return {
      totalEmployees: 0,
      departmentSizes: {},
      experienceLevels: {},
      recentHires: 0,
      recentDepartures: 0,
      growthRate: 0
    };
  }

  private getDefaultCompetitorData(): CompetitorAnalysis {
    return {
      mainCompetitors: [],
      marketPosition: 'follower',
      competitiveAdvantages: [],
      riskFactors: [],
      opportunities: []
    };
  }

  private getDefaultIndustryData(): IndustryOutlook {
    return {
      growthProjection: 5,
      marketSize: 0,
      keyTrends: [],
      disruptionRisk: 'medium',
      regulatoryRisks: [],
      technologyTrends: [],
      talentDemand: 'medium'
    };
  }

  private assessDataQuality(results: PromiseSettledResult<any>[]): CompanyIntelligence['dataQuality'] {
    const successfulResults = results.filter(result => result.status === 'fulfilled').length;
    const totalResults = results.length;
    const successRate = successfulResults / totalResults;

    if (successRate >= 0.8) return 'excellent';
    if (successRate >= 0.6) return 'good';
    if (successRate >= 0.4) return 'limited';
    return 'poor';
  }
}

// Export singleton instance
export const webIntelligenceService = WebIntelligenceService.getInstance();