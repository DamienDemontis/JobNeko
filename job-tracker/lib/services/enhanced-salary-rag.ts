// Enhanced Salary RAG Service
// Integrates user profile context with live web search for personalized salary intelligence

import { aiWebSearch } from './ai-web-search';
import { generateCompletion } from '../ai-service';
import { profileContextService, type UserProfileContext, type AIContextPrompt } from './profile-context-service';
import { salaryAnalysisCache } from './salary-analysis-cache';

export interface SalaryAnalysisRequest {
  jobTitle: string;
  company: string;
  location: string;
  description?: string;
  requirements?: string;
  userId: string;
  postedSalary?: string;
}

export interface PersonalizedSalaryAnalysis {
  salaryIntelligence: {
    range: {
      min: number;
      max: number;
      median: number;
      currency: string;
      confidence: number;
    };
    marketPosition: 'below_market' | 'at_market' | 'above_market';
    negotiationPower: number; // 0-100
    dataQuality: 'excellent' | 'good' | 'limited';
  };
  personalizedInsights: {
    fitForProfile: 'excellent' | 'good' | 'fair' | 'poor';
    careerProgression: string;
    skillsMatch: number; // 0-100
    experienceAlignment: string;
    locationAnalysis: string;
    salaryProgression: {
      currentVsOffer?: string;
      expectedVsOffer?: string;
      growthPotential: string;
    };
  };
  contextualRecommendations: {
    negotiationStrategy: string[];
    careerAdvice: string[];
    actionItems: string[];
    redFlags: string[];
    opportunities: string[];
  };
  marketIntelligence: {
    demandLevel: number; // 0-100
    competitionLevel: number; // 0-100
    industryOutlook: string;
    timeToHire: string;
    alternativeOpportunities: number;
  };
  profileContext: {
    contextCompleteness: number; // 0-100
    keyFactors: string[];
    improvementSuggestions: string[];
  };
  sources: {
    webSources: Array<{
      title: string;
      url: string;
      relevance: number;
      type: 'salary_data' | 'company_info' | 'market_trends';
    }>;
    searchQueries: string[];
    profileDataUsed: string[];
  };
  metadata: {
    analysisId: string;
    timestamp: string;
    processingTime: number;
    version: string;
  };
}

export class EnhancedSalaryRAG {
  /**
   * Perform comprehensive personalized salary analysis - NO HARDCODED VALUES
   * Now with intelligent caching for better performance
   */
  async analyzeWithContext(request: SalaryAnalysisRequest): Promise<PersonalizedSalaryAnalysis> {
    const startTime = Date.now();
    const analysisId = `sal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Step 1: Get comprehensive user context
      const userContext = await profileContextService.getUserProfileContext(request.userId);
      const aiContext = profileContextService.generateAIContextPrompt(userContext);

      // Step 2: Check cache first
      const userProfileHash = this.generateUserProfileHash(userContext);
      const inputHash = salaryAnalysisCache.generateInputHash({
        title: request.jobTitle,
        company: request.company,
        location: request.location,
        description: request.description,
        requirements: request.requirements,
        salary: request.postedSalary
      }, userProfileHash);

      const cachedAnalysis = await salaryAnalysisCache.getCachedAnalysis(
        request.jobTitle + '_' + request.company, // Use job identifier
        request.userId,
        inputHash
      );

      if (cachedAnalysis) {
        console.log('🚀 Returning cached salary analysis');
        return cachedAnalysis.analysis;
      }

      // Step 3: Perform intelligent web searches - MUST HAVE REAL DATA
      const webIntelligence = await this.performContextualWebSearch(request, userContext);

      // FAIL FAST: If no real web search results, throw error instead of using fallbacks
      if (!webIntelligence.combinedSources.length) {
        throw new Error('No web search data available. Cannot generate analysis without real market data.');
      }

      // Validate we have actual search results with content
      const validSources = webIntelligence.combinedSources.filter(source =>
        source.url && source.title && source.url.startsWith('http')
      );

      if (validSources.length === 0) {
        throw new Error('No valid web sources found. Analysis requires real market data.');
      }

      // Step 3: Generate personalized analysis using ONLY web search data
      const analysis = await this.generatePersonalizedAnalysis(
        request,
        userContext,
        aiContext,
        webIntelligence
      );

      // Validate analysis has real numerical data
      if (typeof analysis.salaryIntelligence?.range?.min !== 'number' ||
          typeof analysis.salaryIntelligence?.range?.max !== 'number' ||
          typeof analysis.salaryIntelligence?.range?.median !== 'number' ||
          typeof analysis.salaryIntelligence?.range?.confidence !== 'number' ||
          isNaN(analysis.salaryIntelligence.range.min) ||
          isNaN(analysis.salaryIntelligence.range.max) ||
          isNaN(analysis.salaryIntelligence.range.median) ||
          isNaN(analysis.salaryIntelligence.range.confidence) ||
          analysis.salaryIntelligence.range.min < 0 ||
          analysis.salaryIntelligence.range.max < 0) {
        console.error('Invalid salary data:', {
          min: analysis.salaryIntelligence?.range?.min,
          max: analysis.salaryIntelligence?.range?.max,
          median: analysis.salaryIntelligence?.range?.median,
          confidence: analysis.salaryIntelligence?.range?.confidence
        });
        throw new Error('Invalid salary data returned. Analysis must contain real market-based numbers.');
      }

      const finalAnalysis: PersonalizedSalaryAnalysis = {
        ...analysis,
        sources: {
          webSources: validSources,
          searchQueries: webIntelligence.queries,
          profileDataUsed: this.getProfileDataUsed(userContext),
        },
        metadata: {
          analysisId,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          version: '5.0.0-no-fallbacks',
        },
      };

      // Step 5: Cache the successful analysis
      await salaryAnalysisCache.cacheAnalysis(
        request.jobTitle + '_' + request.company,
        request.userId,
        finalAnalysis,
        inputHash,
        24 // Cache for 24 hours
      );

      console.log('💾 Salary analysis cached successfully');
      return finalAnalysis;
    } catch (error) {
      console.error('Enhanced salary analysis failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate personalized salary analysis');
    }
  }

  /**
   * Perform intelligent web searches based on user context - STRICT NO FALLBACKS
   */
  private async performContextualWebSearch(
    request: SalaryAnalysisRequest,
    context: UserProfileContext
  ) {
    const queries: string[] = [];
    const currentYear = new Date().getFullYear();

    // Build context-aware search queries
    const baseQuery = this.buildBaseSearchQuery(request, context);
    const salaryQuery = `${baseQuery} salary compensation ${currentYear}`;
    const companyQuery = `"${request.company}" employee reviews salary benefits glassdoor`;
    const marketQuery = `${request.jobTitle} job market demand trends ${context.currentLocation.country} ${currentYear}`;

    queries.push(salaryQuery, companyQuery, marketQuery);

    console.log('🔍 Executing web searches:', queries);

    // Execute searches in parallel - NO FALLBACKS ALLOWED
    const [salaryResults, companyResults, marketResults] = await Promise.all([
      aiWebSearch.searchWeb(salaryQuery, 8),
      aiWebSearch.searchWeb(companyQuery, 5),
      aiWebSearch.searchWeb(marketQuery, 4),
    ]);

    console.log('📊 Search results:', {
      salary: salaryResults.results?.length || 0,
      company: companyResults.results?.length || 0,
      market: marketResults.results?.length || 0
    });

    // Only include real web search results - filter out AI fallbacks
    const realSalaryResults = salaryResults.results?.filter(r =>
      r.url && r.url.startsWith('http') && !r.content?.includes('Based on AI knowledge')
    ) || [];
    const realCompanyResults = companyResults.results?.filter(r =>
      r.url && r.url.startsWith('http') && !r.content?.includes('Based on AI knowledge')
    ) || [];
    const realMarketResults = marketResults.results?.filter(r =>
      r.url && r.url.startsWith('http') && !r.content?.includes('Based on AI knowledge')
    ) || [];

    // Combine and categorize ONLY real results
    const combinedSources = [
      ...realSalaryResults.map((r: any) => ({ ...r, type: 'salary_data' as const })),
      ...realCompanyResults.map((r: any) => ({ ...r, type: 'company_info' as const })),
      ...realMarketResults.map((r: any) => ({ ...r, type: 'market_trends' as const })),
    ].map((source, index) => ({
      title: source.title,
      url: source.url,
      relevance: source.score || 0.5,
      type: source.type,
    }));

    console.log('✅ Valid web sources found:', combinedSources.length);

    return {
      salaryResults: { ...salaryResults, results: realSalaryResults },
      companyResults: { ...companyResults, results: realCompanyResults },
      marketResults: { ...marketResults, results: realMarketResults },
      combinedSources,
      queries,
    };
  }

  /**
   * Build intelligent search query based on user context
   */
  private buildBaseSearchQuery(request: SalaryAnalysisRequest, context: UserProfileContext): string {
    const { jobTitle, location } = request;
    const { professionalProfile, currentLocation, salaryContext } = context;

    // Include experience level
    const experienceLevel = this.mapCareerLevelToSearchTerm(professionalProfile.careerLevel);

    // Use best available location
    const searchLocation = location || currentLocation.fullLocation || 'United States';

    // Include currency preference
    const currency = salaryContext.currency;

    return `${experienceLevel} ${jobTitle} ${searchLocation} ${currency}`;
  }

  /**
   * Map career level to search terms
   */
  private mapCareerLevelToSearchTerm(careerLevel: string): string {
    const levelMap: Record<string, string> = {
      entry: 'entry level junior',
      junior: 'junior',
      mid: 'mid level',
      senior: 'senior',
      lead: 'lead senior',
      principal: 'principal staff',
      executive: 'director VP executive',
    };

    return levelMap[careerLevel] || 'mid level';
  }

  /**
   * Generate comprehensive personalized analysis
   */
  private async generatePersonalizedAnalysis(
    request: SalaryAnalysisRequest,
    userContext: UserProfileContext,
    aiContext: AIContextPrompt,
    webIntelligence: any
  ): Promise<Omit<PersonalizedSalaryAnalysis, 'sources' | 'metadata'>> {
    const prompt = this.buildAnalysisPrompt(request, userContext, aiContext, webIntelligence);

    const response = await generateCompletion(prompt, {
      temperature: 0.1,
      max_tokens: 2500,
    });

    console.log('🤖 AI Response length:', response.content.length);
    console.log('🤖 AI Response preview:', response.content.substring(0, 200) + '...');

    try {
      const parsed = JSON.parse(response.content);

      // Log the parsed confidence to debug NaN issue
      console.log('🔍 Parsed confidence value:', parsed?.salaryIntelligence?.range?.confidence);
      console.log('🔍 Confidence type:', typeof parsed?.salaryIntelligence?.range?.confidence);

      // Post-process to ensure confidence is always a valid number
      if (parsed?.salaryIntelligence?.range) {
        const conf = parsed.salaryIntelligence.range.confidence;
        if (typeof conf !== 'number' || isNaN(conf) || conf < 0 || conf > 1) {
          console.warn('⚠️ Invalid confidence value detected:', conf, '- calculating from web sources');
          // Calculate confidence based on number and quality of web sources
          const sourceCount = webIntelligence.combinedSources.length;
          const avgRelevance = webIntelligence.combinedSources.reduce((sum: number, s: any) => sum + (s.relevance || 0.5), 0) / Math.max(sourceCount, 1);
          parsed.salaryIntelligence.range.confidence = Math.min(0.9, Math.max(0.3, (sourceCount / 10) * avgRelevance));
          console.log('✅ Calculated confidence:', parsed.salaryIntelligence.range.confidence);
        }
      }

      return parsed;
    } catch (error) {
      console.error('❌ Failed to parse AI analysis:', error);
      console.error('❌ Raw AI response:', response.content);
      throw new Error('Failed to generate analysis - invalid JSON format');
    }
  }

  /**
   * Build comprehensive analysis prompt
   */
  private buildAnalysisPrompt(
    request: SalaryAnalysisRequest,
    userContext: UserProfileContext,
    aiContext: AIContextPrompt,
    webIntelligence: any
  ): string {
    return `You are a senior compensation analyst providing personalized salary intelligence. Use ALL provided context for accurate, relevant insights.

## USER PROFILE CONTEXT
${aiContext.fullContextSummary}

## JOB OPPORTUNITY
- **Title**: ${request.jobTitle}
- **Company**: ${request.company}
- **Location**: ${request.location}
- **Posted Salary**: ${request.postedSalary || 'Not specified'}
- **Description**: ${request.description || 'Not provided'}
- **Requirements**: ${request.requirements || 'Not provided'}

## WEB SEARCH INTELLIGENCE

### Salary Data
${webIntelligence.salaryResults.results?.map((r: any, i: number) => `
**${i + 1}. ${r.title}**
- URL: ${r.url}
- Relevance: ${(r.score * 100).toFixed(0)}%
- Content: ${r.content.substring(0, 300)}...
`).join('\n') || 'No salary data found'}

### Company Intelligence
${webIntelligence.companyResults.results?.map((r: any, i: number) => `
**${i + 1}. ${r.title}**
- URL: ${r.url}
- Content: ${r.content.substring(0, 250)}...
`).join('\n') || 'No company data found'}

### Market Trends
${webIntelligence.marketResults.results?.map((r: any, i: number) => `
**${i + 1}. ${r.title}**
- URL: ${r.url}
- Content: ${r.content.substring(0, 250)}...
`).join('\n') || 'No market data found'}

## CRITICAL REQUIREMENTS - NO HARDCODED VALUES ALLOWED
1. Base salary ranges EXCLUSIVELY on the web search results provided above
2. Use ONLY numerical values found in the actual web content
3. Calculate confidence as a decimal between 0.0 and 1.0 based on quantity and quality of web sources
4. NEVER return confidence as null, undefined, or NaN - always use a valid decimal number
5. Use the user's complete profile for personalized insights
6. Compare against user's current/expected salary if available
7. Provide actionable career progression advice based on real market data

## CONFIDENCE CALCULATION GUIDE
- High confidence (0.8-0.9): 5+ quality sources with consistent salary data
- Medium confidence (0.6-0.8): 3-4 sources with some variation
- Low confidence (0.3-0.6): 1-2 sources or inconsistent data
- Minimum confidence (0.3): Always use at least 0.3, never lower

## RESPONSE FORMAT
Provide analysis in this exact JSON structure (no additional text, ensure all numbers are valid decimals):

{
  "salaryIntelligence": {
    "range": {
      "min": number,
      "max": number,
      "median": number,
      "currency": "${userContext.salaryContext.currency}",
      "confidence": number (0-1)
    },
    "marketPosition": "below_market|at_market|above_market",
    "negotiationPower": number (0-100),
    "dataQuality": "excellent|good|limited"
  },
  "personalizedInsights": {
    "fitForProfile": "excellent|good|fair|poor",
    "careerProgression": "detailed analysis of career fit and growth potential",
    "skillsMatch": number (0-100),
    "experienceAlignment": "how role aligns with user's experience level",
    "locationAnalysis": "analysis considering user's location context",
    "salaryProgression": {
      ${userContext.salaryContext.hasCurrentSalary ?
        `"currentVsOffer": "comparison with current salary",` : ''}
      ${userContext.salaryContext.hasExpectedSalary ?
        `"expectedVsOffer": "comparison with expected salary",` : ''}
      "growthPotential": "salary growth trajectory analysis"
    }
  },
  "contextualRecommendations": {
    "negotiationStrategy": ["strategy1", "strategy2", "strategy3"],
    "careerAdvice": ["advice1", "advice2", "advice3"],
    "actionItems": ["action1", "action2", "action3"],
    "redFlags": ["flag1", "flag2"] (if any),
    "opportunities": ["opportunity1", "opportunity2"]
  },
  "marketIntelligence": {
    "demandLevel": number (0-100),
    "competitionLevel": number (0-100),
    "industryOutlook": "market outlook description",
    "timeToHire": "typical hiring timeline",
    "alternativeOpportunities": number (estimate of similar roles available)
  },
  "profileContext": {
    "contextCompleteness": ${userContext.contextCompleteness.score},
    "keyFactors": ["factor1", "factor2", "factor3"],
    "improvementSuggestions": ["suggestion1", "suggestion2"]
  }
}`;
  }

  /**
   * Get list of profile data used in analysis
   */
  private getProfileDataUsed(context: UserProfileContext): string[] {
    const dataUsed: string[] = [];

    if (context.name) dataUsed.push('Name');
    if (context.currentLocation.fullLocation) dataUsed.push('Location');
    if (context.salaryContext.hasCurrentSalary) dataUsed.push('Current Salary');
    if (context.salaryContext.hasExpectedSalary) dataUsed.push('Expected Salary');
    if (context.professionalProfile.hasResume) dataUsed.push('Resume Content');
    if (context.professionalProfile.keySkills.length > 0) dataUsed.push('Skills');
    if (context.professionalProfile.careerLevel) dataUsed.push('Career Level');
    if (context.professionalProfile.yearsOfExperience > 0) dataUsed.push('Years of Experience');
    if (context.preferences.workMode) dataUsed.push('Work Mode Preference');
    if (context.preferences.willingToRelocate !== undefined) dataUsed.push('Relocation Preference');

    return dataUsed;
  }

  /**
   * Generate hash of user profile for cache invalidation
   */
  private generateUserProfileHash(context: UserProfileContext): string {
    const profileData = {
      careerLevel: context.professionalProfile.careerLevel,
      yearsOfExperience: context.professionalProfile.yearsOfExperience,
      skills: context.professionalProfile.keySkills.sort(),
      location: context.currentLocation.fullLocation,
      hasResume: context.professionalProfile.hasResume,
      currentSalary: context.salaryContext.currentSalary,
      expectedSalary: context.salaryContext.expectedSalary,
      currency: context.salaryContext.currency,
      workMode: context.preferences.workMode,
      willingToRelocate: context.preferences.willingToRelocate
    };

    const input = JSON.stringify(profileData);
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

// Export singleton
export const enhancedSalaryRAG = new EnhancedSalaryRAG();