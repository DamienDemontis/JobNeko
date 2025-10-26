// Enhanced Salary RAG Service
// Integrates user profile context with live web search for personalized salary intelligence

import { aiWebSearch } from './ai-web-search';
import { unifiedAI } from './unified-ai-service';
import { profileContextService, type UserProfileContext, type AIContextPrompt } from './profile-context-service';
import { salaryAnalysisCache } from './salary-analysis-cache';
import { geographicSalaryIntelligence, type GeographicSalaryAnalysis } from './geographic-salary-intelligence';
import { skillsGapAnalysis, type SkillsAnalysisResult } from './skills-gap-analysis';
import { resumeMatchingService, type ResumeMatchResult } from './resume-matching-service';

export interface SalaryAnalysisRequest {
  jobTitle: string;
  company: string;
  location?: string;
  description?: string;
  requirements?: string;
  userId: string;
  postedSalary?: string;
  forceRefresh?: boolean;
}

export interface PersonalizedSalaryAnalysis {
  salaryIntelligence: {
    range: {
      min: number;
      max: number;
      median: number;
      currency: string;
      confidence: number;
      originalValues?: {
        min: number;
        max: number;
        median: number;
      };
    };
    marketPosition: 'below_market' | 'at_market' | 'above_market';
    negotiationPower: number; // 0-100
    dataQuality: 'excellent' | 'good' | 'limited';
  };
  personalizedInsights: {
    fitForProfile: 'excellent' | 'good' | 'fair' | 'poor';
    careerProgression: string;
    skillsMatch: number; // 0-100
    skillsBreakdown: {
      matchingSkills: string[];
      missingSkills: string[];
      partialMatches: string[];
      strengthAreas: string[];
      improvementAreas: string[];
      matchExplanation: string;
    };
    experienceAlignment: string;
    experiencePositioning?: number; // 0-1 where user falls in range
    experienceJustification: string;
    locationAnalysis: string;
    negotiationRange?: {
      walkAway: number;
      target: number;
      stretch: number;
      reasoning: string;
    };
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
    dataUsed?: {
      resumeUsed: boolean;
      skillsUsed: boolean;
      experienceUsed: boolean;
      salaryHistoryUsed: boolean;
    };
  };

  // New comprehensive analysis sections
  geographicAnalysis?: GeographicSalaryAnalysis;
  skillsAnalysis?: SkillsAnalysisResult;
  resumeMatch?: ResumeMatchResult;

  // Enhanced for edge cases
  edgeCaseHandling: {
    isRemotePosition: boolean;
    hasSalaryInfo: boolean;
    confidence_adjustments: string[];
    data_limitations: string[];
    analysis_scope: 'full' | 'limited' | 'basic';
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

      // Step 2: Check cache first (unless forcing refresh)
      if (!request.forceRefresh) {
        const userProfileHash = this.generateUserProfileHash(userContext);
        const inputHash = salaryAnalysisCache.generateInputHash({
          title: request.jobTitle,
          company: request.company,
          location: request.location || 'Remote/Not specified',
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
      } else {
        console.log('🔄 Bypassing cache due to forceRefresh flag');
      }

      // Step 3: Detect edge cases
      const edgeCaseInfo = this.detectEdgeCases(request);
      console.log('🔍 Edge case analysis:', edgeCaseInfo);

      // Step 4: Perform intelligent web searches - MUST HAVE REAL DATA
      const webIntelligence = await this.performContextualWebSearch(request, userContext);

      // Handle edge case: Limited web data for remote or niche positions
      const validSources = webIntelligence.combinedSources.filter(source =>
        source.url && source.title && source.url.startsWith('http')
      );

      if (validSources.length === 0 && !edgeCaseInfo.isRemotePosition) {
        throw new Error('No web search data available. Cannot generate analysis without real market data.');
      }

      // Step 5: Run comprehensive analysis in parallel
      const [
        geographicAnalysis,
        skillsAnalysis,
        resumeMatch
      ] = await Promise.allSettled([
        // Geographic analysis
        this.runGeographicAnalysis(request, userContext, edgeCaseInfo),

        // Skills gap analysis (if we have job description)
        this.runSkillsAnalysis(request, userContext),

        // Resume matching (if user has resume)
        this.runResumeMatching(request, userContext)
      ]);

      // Step 6: Generate core salary analysis using ONLY web search data
      const coreAnalysis = await this.generatePersonalizedAnalysis(
        request,
        userContext,
        aiContext,
        webIntelligence,
        edgeCaseInfo
      );

      // Validate analysis has real numerical data
      if (typeof coreAnalysis.salaryIntelligence?.range?.min !== 'number' ||
          typeof coreAnalysis.salaryIntelligence?.range?.max !== 'number' ||
          typeof coreAnalysis.salaryIntelligence?.range?.median !== 'number' ||
          typeof coreAnalysis.salaryIntelligence?.range?.confidence !== 'number' ||
          isNaN(coreAnalysis.salaryIntelligence.range.min) ||
          isNaN(coreAnalysis.salaryIntelligence.range.max) ||
          isNaN(coreAnalysis.salaryIntelligence.range.median) ||
          isNaN(coreAnalysis.salaryIntelligence.range.confidence) ||
          coreAnalysis.salaryIntelligence.range.min < 0 ||
          coreAnalysis.salaryIntelligence.range.max < 0) {
        console.error('Invalid salary data:', {
          min: coreAnalysis.salaryIntelligence?.range?.min,
          max: coreAnalysis.salaryIntelligence?.range?.max,
          median: coreAnalysis.salaryIntelligence?.range?.median,
          confidence: coreAnalysis.salaryIntelligence?.range?.confidence
        });
        throw new Error('Invalid salary data returned. Analysis must contain real market-based numbers.');
      }

      // Fix salary values if they appear to be in thousands
      // This handles cases where AI returns 56, 89, 120 instead of 56000, 89000, 120000
      const detectAndFixSalaryValues = (range: any) => {
        const { min, max, median, currency } = range;

        // Determine if values need multiplication based on currency and magnitude
        let multiplier = 1;

        // For USD, EUR, GBP, CAD, AUD - salaries under 10,000 are likely in thousands
        const majorCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'CHF'];
        if (majorCurrencies.includes(currency) && median < 10000) {
          multiplier = 1000;
          console.log(`Detected salary in thousands for ${currency}, multiplying by 1000`);
        }

        // For KRW, JPY - salaries under 1,000,000 are likely in thousands
        const asianCurrencies = ['KRW', 'JPY'];
        if (asianCurrencies.includes(currency) && median < 1000000) {
          multiplier = 1000;
          console.log(`Detected salary in thousands for ${currency}, multiplying by 1000`);
        }

        // For INR - salaries under 100,000 are likely in thousands
        if (currency === 'INR' && median < 100000) {
          multiplier = 1000;
          console.log(`Detected salary in thousands for ${currency}, multiplying by 1000`);
        }

        return {
          ...range,
          min: min * multiplier,
          max: max * multiplier,
          median: median * multiplier,
          originalValues: multiplier > 1 ? { min, max, median } : undefined
        };
      };

      // Apply salary value fixes
      coreAnalysis.salaryIntelligence.range = detectAndFixSalaryValues(
        coreAnalysis.salaryIntelligence.range
      );

      // Also fix negotiation range if present
      if (coreAnalysis.personalizedInsights?.negotiationRange) {
        const multiplier = coreAnalysis.salaryIntelligence.range.originalValues ? 1000 : 1;
        if (multiplier > 1) {
          coreAnalysis.personalizedInsights.negotiationRange.walkAway *= multiplier;
          coreAnalysis.personalizedInsights.negotiationRange.target *= multiplier;
          coreAnalysis.personalizedInsights.negotiationRange.stretch *= multiplier;
        }
      }

      // Step 7: Combine all analysis results
      const finalAnalysis: PersonalizedSalaryAnalysis = {
        ...coreAnalysis,

        // Add comprehensive analysis results
        geographicAnalysis: geographicAnalysis.status === 'fulfilled' ? geographicAnalysis.value : undefined,
        skillsAnalysis: skillsAnalysis.status === 'fulfilled' ? skillsAnalysis.value : undefined,
        resumeMatch: resumeMatch.status === 'fulfilled' ? resumeMatch.value : undefined,

        // Edge case handling
        edgeCaseHandling: edgeCaseInfo,

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

      // Step 8: Cache the successful analysis (generate hash for caching)
      const userProfileHash = this.generateUserProfileHash(userContext);
      const inputHash = salaryAnalysisCache.generateInputHash({
        title: request.jobTitle,
        company: request.company,
        location: request.location || 'Remote/Not specified',
        description: request.description,
        requirements: request.requirements,
        salary: request.postedSalary
      }, userProfileHash);

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
    const { jobTitle, location, company } = request;
    const { professionalProfile, currentLocation } = context;

    // Include experience level
    const experienceLevel = this.mapCareerLevelToSearchTerm(professionalProfile.careerLevel);

    // Parse location for better specificity
    const locationParts = this.parseLocation(location || currentLocation.fullLocation || 'United States');
    const searchLocation = locationParts.city ?
      `${locationParts.city} ${locationParts.country}` :
      locationParts.country;

    // Auto-detect currency from location
    const currency = this.detectCurrencyFromLocation(searchLocation);

    // Build hierarchical search
    const baseQuery = `${experienceLevel} ${jobTitle} salary ${searchLocation} ${new Date().getFullYear()}`;
    const companyQuery = `${company} ${jobTitle} salary compensation`;

    return baseQuery;
  }

  /**
   * Parse location string into components
   */
  private parseLocation(location: string): { city?: string; state?: string; country: string } {
    const parts = location.split(',').map(p => p.trim());
    if (parts.length === 3) {
      return { city: parts[0], state: parts[1], country: parts[2] };
    } else if (parts.length === 2) {
      return { city: parts[0], country: parts[1] };
    }
    return { country: location };
  }

  /**
   * Auto-detect currency from location
   */
  private detectCurrencyFromLocation(location: string): string {
    const currencyMap: Record<string, string> = {
      'korea': 'KRW',
      'seoul': 'KRW',
      'japan': 'JPY',
      'tokyo': 'JPY',
      'uk': 'GBP',
      'united kingdom': 'GBP',
      'london': 'GBP',
      'europe': 'EUR',
      'germany': 'EUR',
      'france': 'EUR',
      'spain': 'EUR',
      'italy': 'EUR',
      'canada': 'CAD',
      'toronto': 'CAD',
      'australia': 'AUD',
      'sydney': 'AUD',
      'singapore': 'SGD',
      'india': 'INR',
      'mumbai': 'INR',
      'bangalore': 'INR',
      'china': 'CNY',
      'beijing': 'CNY',
      'shanghai': 'CNY',
      'hong kong': 'HKD',
      'mexico': 'MXN',
      'brazil': 'BRL',
      'switzerland': 'CHF',
      'sweden': 'SEK',
      'stockholm': 'SEK'
    };

    const lowerLocation = location.toLowerCase();
    for (const [key, currency] of Object.entries(currencyMap)) {
      if (lowerLocation.includes(key)) {
        return currency;
      }
    }
    return 'USD';
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
   * Detect edge cases in the analysis request
   */
  private detectEdgeCases(request: SalaryAnalysisRequest): PersonalizedSalaryAnalysis['edgeCaseHandling'] {
    const isRemotePosition =
      request.location?.toLowerCase().includes('remote') ||
      request.description?.toLowerCase().includes('remote') ||
      request.description?.toLowerCase().includes('work from home') ||
      false;

    const hasSalaryInfo = Boolean(request.postedSalary);

    const confidence_adjustments: string[] = [];
    const data_limitations: string[] = [];

    if (isRemotePosition) {
      confidence_adjustments.push('Remote position: using global salary data');
      data_limitations.push('Location-specific cost adjustments may not apply');
    }

    if (!hasSalaryInfo) {
      confidence_adjustments.push('No posted salary: relying on market estimates');
      data_limitations.push('Cannot validate against company-specific compensation');
    }

    if (!request.description || request.description.length < 100) {
      confidence_adjustments.push('Limited job description: using role-based analysis');
      data_limitations.push('Skills gap analysis may be incomplete');
    }

    const analysis_scope: 'full' | 'limited' | 'basic' =
      isRemotePosition && hasSalaryInfo && request.description ? 'full' :
      (!isRemotePosition && hasSalaryInfo) || (isRemotePosition && request.description) ? 'limited' :
      'basic';

    return {
      isRemotePosition,
      hasSalaryInfo,
      confidence_adjustments,
      data_limitations,
      analysis_scope
    };
  }

  /**
   * Run geographic salary analysis
   */
  private async runGeographicAnalysis(
    request: SalaryAnalysisRequest,
    userContext: UserProfileContext,
    edgeCaseInfo: PersonalizedSalaryAnalysis['edgeCaseHandling']
  ): Promise<GeographicSalaryAnalysis> {
    try {
      return await geographicSalaryIntelligence.analyzeGeographicOpportunities(
        request.jobTitle,
        request.location || userContext.currentLocation.fullLocation || 'United States',
        userContext.currentLocation.fullLocation,
        edgeCaseInfo.isRemotePosition,
        request.postedSalary
      );
    } catch (error) {
      console.warn('Geographic analysis failed:', error);
      throw new Error('Geographic analysis not available');
    }
  }

  /**
   * Run skills gap analysis
   */
  private async runSkillsAnalysis(
    request: SalaryAnalysisRequest,
    userContext: UserProfileContext
  ): Promise<SkillsAnalysisResult> {
    if (!userContext.professionalProfile.hasResume) {
      throw new Error('Resume required for skills analysis');
    }

    if (!request.description) {
      throw new Error('Job description required for skills analysis');
    }

    try {
      return await skillsGapAnalysis.analyzeSkillsGap(
        userContext.professionalProfile.resumeContent || '',
        request.jobTitle,
        request.description,
        request.requirements || '',
        userContext.salaryContext.currentSalary || undefined
      );
    } catch (error) {
      console.warn('Skills analysis failed:', error);
      throw new Error('Skills gap analysis not available');
    }
  }

  /**
   * Run resume matching analysis
   */
  private async runResumeMatching(
    request: SalaryAnalysisRequest,
    userContext: UserProfileContext
  ): Promise<ResumeMatchResult> {
    if (!userContext.professionalProfile.hasResume) {
      throw new Error('Resume required for matching analysis');
    }

    if (!request.description) {
      throw new Error('Job description required for resume matching');
    }

    try {
      return await resumeMatchingService.analyzeResumeMatch(
        userContext.professionalProfile.resumeContent || '',
        request.jobTitle,
        request.company,
        request.description,
        request.requirements || ''
      );
    } catch (error) {
      console.warn('Resume matching failed:', error);
      throw new Error('Resume matching analysis not available');
    }
  }

  /**
   * Generate comprehensive personalized analysis
   */
  private async generatePersonalizedAnalysis(
    request: SalaryAnalysisRequest,
    userContext: UserProfileContext,
    aiContext: AIContextPrompt,
    webIntelligence: any,
    edgeCaseInfo?: PersonalizedSalaryAnalysis['edgeCaseHandling']
  ): Promise<Omit<PersonalizedSalaryAnalysis, 'sources' | 'metadata' | 'geographicAnalysis' | 'skillsAnalysis' | 'resumeMatch' | 'edgeCaseHandling'>> {
    const prompt = this.buildAnalysisPrompt(request, userContext, aiContext, webIntelligence);

    const response = await unifiedAI.process({
      operation: 'general_completion',
      content: prompt
    });
    if (!response || !(typeof response.data === 'string' ? response.data : JSON.stringify(response.data))) {
      throw new Error('Failed to get valid response from AI service');
    }

    console.log('🤖 AI Response length:', (typeof response.data === 'string' ? response.data : JSON.stringify(response.data)).length);
    console.log('🤖 AI Response preview:', (typeof response.data === 'string' ? response.data : JSON.stringify(response.data)).substring(0, 200) + '...');

    try {
      const cleanedContent = this.cleanJsonResponse((typeof response.data === 'string' ? response.data : JSON.stringify(response.data)));
      const parsed = JSON.parse(cleanedContent);

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
      console.error('❌ Raw AI response:', (typeof response.data === 'string' ? response.data : JSON.stringify(response.data)));
      throw new Error('Failed to generate analysis - invalid JSON format');
    }
  }

  /**
   * Clean AI response to extract JSON from markdown code blocks
   */
  private cleanJsonResponse(content: string): string {
    // Remove markdown code block syntax if present
    let cleaned = content.trim();

    // Remove ```json and ``` if present
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '');
    }
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '');
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.replace(/\s*```$/, '');
    }

    // Find the first [ or { and last ] or } to extract just the JSON part
    const firstBrace = Math.min(
      cleaned.indexOf('[') !== -1 ? cleaned.indexOf('[') : Infinity,
      cleaned.indexOf('{') !== -1 ? cleaned.indexOf('{') : Infinity
    );

    if (firstBrace !== Infinity) {
      cleaned = cleaned.substring(firstBrace);

      // Find the matching closing brace/bracket
      let depth = 0;
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '[' || char === '{') {
            depth++;
          } else if (char === ']' || char === '}') {
            depth--;
            if (depth === 0) {
              cleaned = cleaned.substring(0, i + 1);
              break;
            }
          }
        }
      }
    }

    return cleaned.trim();
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
3. Weight sources by relevance score: 80%+ relevance = 3x weight, 60-79% = 2x weight, <60% = 1x weight
4. If salary values appear unrealistically low (< 10,000), they are likely in thousands - multiply by 1000
5. Calculate confidence as weighted average: (source_count * 0.3) + (avg_relevance * 0.4) + (consistency * 0.3)
6. NEVER return confidence as null, undefined, or NaN - always use a valid decimal number
7. Position salary based on experience: If user has MORE experience than required, position at 60-70th percentile
8. Use the user's complete profile for personalized insights
9. Compare against user's current/expected salary if available
10. Provide specific negotiation range based on all factors

## DETAILED SKILLS ANALYSIS REQUIREMENTS
1. **Skills Match Breakdown**: Analyze EXACTLY which skills from user's profile match job requirements
2. **Missing Skills Assessment**: Identify specific skills mentioned in job requirements that user lacks
3. **Experience Level Justification**: Explain WHY user is positioned at their skill match percentage
4. **Leadership Recognition**: If user has leadership/management experience, factor this into positioning
5. **Technical Depth Analysis**: Assess depth of technical skills vs job requirements
6. **Skill Transferability**: Identify related skills that partially match requirements
7. **Growth Recommendations**: Provide specific skills to develop for better fit

## CONFIDENCE CALCULATION GUIDE
- High confidence (0.8-0.9): 5+ quality sources with consistent salary data
- Medium confidence (0.6-0.8): 3-4 sources with some variation
- Low confidence (0.3-0.6): 1-2 sources or inconsistent data
- Minimum confidence (0.3): Always use at least 0.3, never lower

## EDGE CASE HANDLING
1. **Remote positions**: Use global salary data, mention location flexibility impact
2. **No salary posted**: Use market data only, provide wider range
3. **Startup/Unknown company**: Use industry averages, mention equity potential
4. **Senior role with junior pay**: Flag as red flag, suggest verification
5. **Currency conversion**: Always detect and use local currency based on job location
6. **Limited data**: Clearly state confidence is lower, suggest additional research

## RESPONSE FORMAT
Provide analysis in this exact JSON structure (no additional text, ensure all numbers are valid decimals):

IMPORTANT: All salary values must be FULL AMOUNTS in the specified currency, NOT thousands or abbreviated.
Example: For a $85,000 salary, use 85000, NOT 85 or 85k

CRITICAL: If you detect values that seem to be in thousands (like 56, 89, 120 for salaries), multiply by 1000!

{
  "salaryIntelligence": {
    "range": {
      "min": number (full amount, e.g., 75000 for $75,000),
      "max": number (full amount, e.g., 120000 for $120,000),
      "median": number (full amount, e.g., 95000 for $95,000),
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
    "skillsBreakdown": {
      "matchingSkills": ["skill1", "skill2", "skill3"],
      "missingSkills": ["missing1", "missing2"],
      "partialMatches": ["partial1: explanation", "partial2: explanation"],
      "strengthAreas": ["area1", "area2"],
      "improvementAreas": ["area1", "area2"],
      "matchExplanation": "detailed explanation of why this percentage was calculated"
    },
    "experienceAlignment": "how role aligns with user's experience level",
    "experiencePositioning": number (0.0-1.0, where user falls in salary range based on experience),
    "experienceJustification": "specific explanation of experience level assessment",
    "locationAnalysis": "analysis considering user's location context",
    "negotiationRange": {
      "walkAway": number (minimum acceptable),
      "target": number (ideal salary to negotiate for),
      "stretch": number (maximum possible with strong negotiation),
      "reasoning": "specific justification for these numbers"
    },
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
    "keyFactors": ["list actual factors used like resume, skills, experience"],
    "improvementSuggestions": ["specific missing data like 'Add current salary', 'Upload resume'"],
    "dataUsed": {
      "resumeUsed": ${userContext.professionalProfile.hasResume},
      "skillsUsed": ${userContext.professionalProfile.keySkills.length > 0},
      "experienceUsed": ${userContext.professionalProfile.yearsOfExperience > 0},
      "salaryHistoryUsed": ${userContext.salaryContext.hasCurrentSalary}
    }
  }
}

## EXAMPLE RESPONSE
Here's a complete example of the expected response for a Software Engineer role in Seoul, South Korea:

{
  "salaryIntelligence": {
    "range": {
      "min": 75000000,
      "max": 130000000,
      "median": 95000000,
      "currency": "KRW",
      "confidence": 0.85
    },
    "marketPosition": "at_market",
    "negotiationPower": 70,
    "dataQuality": "excellent"
  },
  "personalizedInsights": {
    "fitForProfile": "good",
    "careerProgression": "This senior backend engineering role aligns well with your 4 years of experience and leadership background",
    "skillsMatch": 85,
    "skillsBreakdown": {
      "matchingSkills": ["Node.js", "TypeScript", "React", "API Development", "Database Management", "Git"],
      "missingSkills": ["Kubernetes", "Microservices Architecture"],
      "partialMatches": ["AI/ML: You have AI integration experience, role needs ML model deployment", "Leadership: You have team lead experience, role involves mentoring junior developers"],
      "strengthAreas": ["Full-stack development", "Project management", "Team leadership"],
      "improvementAreas": ["Cloud infrastructure", "Large-scale system design"],
      "matchExplanation": "85% match based on strong technical foundation with Node.js/TypeScript (exact match), leadership experience (valued for senior role), and transferable AI skills. Missing some infrastructure skills but your startup experience and full-stack background compensate well."
    },
    "experienceAlignment": "4 years with leadership experience positions you as strong mid-senior level",
    "experiencePositioning": 0.65,
    "experienceJustification": "Your 4 years of experience plus Technical Lead role puts you above typical mid-level (2-3 years) and approaching senior level (5+ years). Leadership experience and startup background accelerate your positioning.",
    "locationAnalysis": "Seoul has a competitive tech market with high demand for backend engineers",
    "salaryProgression": {
      "currentVsOffer": "The median offer represents a 20% increase from your current salary",
      "expectedVsOffer": "The range overlaps with your expected salary of 100M KRW",
      "growthPotential": "Strong growth potential with AI/ML skills development and leadership path"
    }
  },
  "contextualRecommendations": {
    "negotiationStrategy": [
      "Highlight your 4 years of backend experience",
      "Emphasize any AI/ML projects or learning",
      "Research Coupang's compensation structure"
    ],
    "careerAdvice": [
      "Focus on gaining AI/LLM experience",
      "Consider certifications in cloud platforms",
      "Build portfolio projects with generative AI"
    ],
    "actionItems": [
      "Update resume with quantified achievements",
      "Prepare STAR examples for behavioral questions",
      "Research team and product deeply"
    ],
    "redFlags": [],
    "opportunities": [
      "Growing AI/ML team with learning opportunities",
      "Potential for rapid career progression"
    ]
  },
  "marketIntelligence": {
    "demandLevel": 85,
    "competitionLevel": 65,
    "industryOutlook": "Strong growth in AI/ML roles in Korean tech sector",
    "timeToHire": "2-4 weeks typical for senior roles",
    "alternativeOpportunities": 150
  },
  "profileContext": {
    "contextCompleteness": 85,
    "keyFactors": ["Strong backend experience", "Location match", "Salary expectations aligned"],
    "improvementSuggestions": ["Add AI/ML skills", "Obtain cloud certifications"]
  }
}

Remember: ALWAYS provide salary values as full amounts in the specified currency, never as thousands or abbreviated.`;
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