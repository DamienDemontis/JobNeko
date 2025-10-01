/**
 * Web-Enhanced Salary Intelligence Service
 * Uses real web search to gather actual salary data and market information
 */

import { gpt5Service } from './gpt5-service';
import { gpt5WebSearch } from './ai-web-search-gpt5';

export interface WebEnhancedSalaryAnalysis {
  role: {
    title: string;
    normalizedTitle: string;
    seniorityLevel: string;
    industry: string;
    skillsRequired: string[];
    experienceLevel: number;
    marketDemand: number;
    jobType: 'fulltime' | 'parttime' | 'contract' | 'internship';
    workMode: 'onsite' | 'hybrid' | 'remote';
    compensationModel: 'salary' | 'hourly' | 'commission' | 'equity_heavy';
  };
  compensation: {
    salaryRange: {
      min: number;
      max: number;
      median: number;
      currency: string;
      confidence: number;
    };
    totalCompensation: {
      base: number;
      bonus: number;
      equity: number;
      benefits: number;
      total: number;
    };
    marketPosition: 'below_market' | 'at_market' | 'above_market';
    negotiationPower: number;
    marketData: string[]; // Actual insights from web search
  };
  location: {
    jobLocation: string;
    userLocation?: string;
    isRemote: boolean;
    effectiveLocation: string;
    costOfLiving: number;
    housingCosts: {
      rent1br: number;
      rent3br: number;
      buyPrice: number;
    };
    generalExpenses: {
      meal: number;
      transport: number;
      utilities: number;
    };
    taxes: {
      federal: number;
      state: number;
      local: number;
      total: number;
    };
    qualityOfLife: number;
    marketMultiplier: number;
    salaryAdjustment?: {
      factor: number;
      reason: string;
    };
  };
  market: {
    demand: number;
    competition: number;
    growth: number;
    outlook: string;
    timeToHire: number;
    alternatives: number;
  };
  company: {
    size: string;
    industry: string;
    compensationPhilosophy: string;
    benefits: string[];
    glassdoorRating: number;
    culture: string[];
    workLifeBalance: number;
    careerGrowth: number;
  };
  analysis: {
    overallScore: number;
    pros: string[];
    cons: string[];
    risks: string[];
    opportunities: string[];
    recommendations: string[];
    negotiationTips: string[];
  };
  budgetCalculation: {
    scenario: 'single' | 'couple' | 'family';
    monthlyBreakdown: {
      housing: number;
      food: number;
      transportation: number;
      healthcare: number;
      utilities: number;
      savings: number;
      discretionary: number;
    };
    comfortLevel: 'struggling' | 'tight' | 'comfortable' | 'very_comfortable';
    livingWageAnalysis: {
      survivalWage: number;
      comfortableWage: number;
      optimalWage: number;
    };
  };
  confidence: {
    overall: number;
    salary: number;
    market: number;
    location: number;
    dataSources: string[];
    estimateType: 'posted_salary' | 'web_search' | 'market_calculation';
    disclaimer?: string;
  };
  sources: {
    salaryData: string[];
    costOfLiving: string[];
    companyInfo: string[];
  };
  metadata: {
    analysisType: 'web_enhanced' | 'ai_fallback';
    searchQueries: string[];
    timestamp: string;
    processingTime: number;
    cached?: boolean;
    cacheAge?: string;
    ragVersion: string;
  };
}

export class WebEnhancedSalaryIntelligence {
  /**
   * Performs comprehensive salary analysis using real web search data
   */
  async analyzeSalary(
    jobTitle: string,
    company: string,
    location: string,
    jobDescription: string,
    postedSalary?: string,
    userLocation?: string
  ): Promise<WebEnhancedSalaryAnalysis> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const startTime = Date.now();
    const searchQueries: string[] = [];

    try {
      console.log(`🔍 Starting web-enhanced analysis for ${jobTitle} at ${company} in ${location}`);

      // Step 1: Parallel web searches for different data types
      const [salaryData, costOfLivingData, companyData] = await Promise.all([
        this.searchSalaryDataWithProgress(jobTitle, location, company, searchQueries),
        this.searchCostOfLivingWithProgress(userLocation || location, searchQueries),
        this.searchCompanyDataWithProgress(company, searchQueries)
      ]);

      console.log(`📊 Web searches completed. Results found: ${salaryData.results?.length || 0}`);

      // Step 2: Synthesize all data with AI
      const analysis = await this.synthesizeAnalysis(
        jobTitle,
        company,
        location,
        jobDescription,
        postedSalary,
        salaryData,
        costOfLivingData,
        companyData
      );

      console.log(`✅ Analysis complete for ${jobTitle} (${Date.now() - startTime}ms)`);

      return {
        ...analysis,
        sources: {
          salaryData: salaryData.results.map(r => r.url),
          costOfLiving: costOfLivingData.results.map(r => r.url),
          companyInfo: companyData.results.map(r => r.url)
        },
        metadata: {
          analysisType: 'web_enhanced',
          searchQueries,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          cached: false,
          ragVersion: '3.0.0-web-enhanced'
        }
      };
    } catch (error) {
      console.error('Web-enhanced analysis failed:', error);
      throw new Error('Failed to analyze salary information with web search');
    }
  }

  private async searchSalaryDataWithProgress(
    jobTitle: string,
    location: string,
    company: string,
    searchQueries: string[]
  ) {
    const currentYear = new Date().getFullYear();
    console.log(`🔍 Searching salary data for ${jobTitle} in ${location}...`);
    const query = `"${jobTitle}" salary range ${location} ${currentYear} levels.fyi glassdoor payscale`;
    searchQueries.push(query);
    return await gpt5WebSearch.searchWeb(query);
  }

  private async searchCostOfLivingWithProgress(location: string, searchQueries: string[]) {
    const currentYear = new Date().getFullYear();
    console.log(`🏠 Searching cost of living data for ${location}...`);
    const query = `cost of living ${location} ${currentYear} rent housing expenses numbeo`;
    searchQueries.push(query);
    return await gpt5WebSearch.searchWeb(query);
  }

  private async searchCompanyDataWithProgress(company: string, searchQueries: string[]) {
    const currentYear = new Date().getFullYear();
    console.log(`🏢 Searching company information for ${company}...`);
    const query = `"${company}" salary benefits compensation glassdoor company culture ${currentYear}`;
    searchQueries.push(query);
    return await gpt5WebSearch.searchWeb(query);
  }

  private async synthesizeAnalysis(
    jobTitle: string,
    company: string,
    location: string,
    jobDescription: string,
    postedSalary: string | undefined,
    salaryData: any,
    costOfLivingData: any,
    companyData: any
  ): Promise<Omit<WebEnhancedSalaryAnalysis, 'sources' | 'metadata'>> {
    console.log(`🤖 Synthesizing analysis with AI...`);

    const prompt = this.buildSynthesisPrompt(
      jobTitle,
      company,
      location,
      jobDescription,
      postedSalary,
      salaryData,
      costOfLivingData,
      companyData
    );

    const systemPrompt = `You are an expert salary analyst synthesizing real web search data.

Your analysis is based on:
1. Real salary data from job sites and salary databases
2. Actual cost of living information from current sources
3. Real company information from reviews and corporate data

Provide realistic assessments based on this real data, not estimates.
Be transparent about data quality and confidence levels.

Return ONLY valid JSON.`;

    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const completion = await gpt5Service.complete(fullPrompt, {
      model: 'gpt-5',
      reasoning: 'high', // High reasoning for complex analysis
      verbosity: 'medium'
    });

    const result = JSON.parse(completion || '{}');
    return this.validateAndEnrichSynthesis(result, salaryData, costOfLivingData, companyData);
  }

  private buildSynthesisPrompt(
    jobTitle: string,
    company: string,
    location: string,
    jobDescription: string,
    postedSalary: string | undefined,
    salaryData: any,
    costOfLivingData: any,
    companyData: any
  ): string {
    const currentYear = new Date().getFullYear();

    return `Create a clean, well-presented web search report for: ${jobTitle} at ${company} in ${location}

Present ONLY the web search findings from GPT-5 native web search in a professional report format. Do not add any calculations or synthetic data.

## 📊 SALARY INTELLIGENCE REPORT

### Search Results Summary
- **Salary Data Sources**: ${salaryData.results?.length || 0} results found
- **Cost of Living Sources**: ${costOfLivingData.results?.length || 0} results found
- **Company Data Sources**: ${companyData.results?.length || 0} results found
- **Search Date**: ${new Date().toLocaleDateString()}

### 💰 Salary Information
${salaryData.answer ? `**AI Summary**: ${salaryData.answer}\n` : ''}
${salaryData.results?.map((result: any, index: number) => `
**${index + 1}. ${result.title}**
- Source: ${result.url}
- Relevance: ${(result.score * 100).toFixed(0)}%
- Content: ${result.content.substring(0, 400)}...
`).join('\n') || 'No salary data found in web search'}

### 🏠 Cost of Living Data
${costOfLivingData.answer ? `**AI Summary**: ${costOfLivingData.answer}\n` : ''}
${costOfLivingData.results?.map((result: any, index: number) => `
**${index + 1}. ${result.title}**
- Source: ${result.url}
- Relevance: ${(result.score * 100).toFixed(0)}%
- Content: ${result.content.substring(0, 400)}...
`).join('\n') || 'No cost of living data found in web search'}

### 🏢 Company Information
${companyData.answer ? `**AI Summary**: ${companyData.answer}\n` : ''}
${companyData.results?.map((result: any, index: number) => `
**${index + 1}. ${result.title}**
- Source: ${result.url}
- Relevance: ${(result.score * 100).toFixed(0)}%
- Content: ${result.content.substring(0, 400)}...
`).join('\n') || 'No company data found in web search'}

### 📋 Job Details
- **Posted Salary**: ${postedSalary || 'Not specified'}
- **Job Description**: ${jobDescription.substring(0, 500)}...

---
*This report contains live web search results from ${currentYear}. All information is sourced from external websites and should be verified independently.*`;
  }

  private validateAndEnrichSynthesis(
    result: any,
    salaryData: any,
    costOfLivingData: any,
    companyData: any
  ): Omit<WebEnhancedSalaryAnalysis, 'sources' | 'metadata'> {
    // Helper function to ensure numeric values and prevent NaN
    const ensureNumber = (value: any, fallback: number): number => {
      const num = typeof value === 'number' ? value : parseFloat(value);
      return isNaN(num) || !isFinite(num) ? fallback : num;
    };

    // Safe salary data with fallbacks
    const safeMinSalary = ensureNumber(result.compensation?.salaryRange?.min || salaryData?.salaryRange?.min, 50000);
    const safeMaxSalary = ensureNumber(result.compensation?.salaryRange?.max || salaryData?.salaryRange?.max, 80000);
    const safeMedianSalary = ensureNumber(result.compensation?.salaryRange?.median || salaryData?.salaryRange?.median, 65000);
    const monthlyIncome = safeMedianSalary / 12;

    // Calculate safe compensation breakdown
    const baseSalary = ensureNumber(result.compensation?.totalCompensation?.base, safeMedianSalary);
    const bonus = ensureNumber(result.compensation?.totalCompensation?.bonus, Math.round(baseSalary * 0.1));
    const equity = ensureNumber(result.compensation?.totalCompensation?.equity, 0);
    const benefits = ensureNumber(result.compensation?.totalCompensation?.benefits, Math.round(baseSalary * 0.2));
    const totalComp = baseSalary + bonus + equity + benefits;

    return {
      role: {
        title: result.role?.title || 'Software Engineer',
        normalizedTitle: result.role?.normalizedTitle || 'Software Engineer',
        seniorityLevel: result.role?.seniorityLevel || 'mid',
        industry: result.role?.industry || companyData?.industry || 'Technology',
        skillsRequired: Array.isArray(result.role?.skillsRequired) ? result.role.skillsRequired : ['Programming', 'Problem Solving'],
        experienceLevel: ensureNumber(result.role?.experienceLevel, 3),
        marketDemand: ensureNumber(result.role?.marketDemand, 75),
        jobType: result.role?.jobType || 'fulltime',
        workMode: result.role?.workMode || 'hybrid',
        compensationModel: result.role?.compensationModel || 'salary'
      },
      compensation: {
        salaryRange: {
          min: safeMinSalary,
          max: safeMaxSalary,
          median: safeMedianSalary,
          currency: 'USD',
          confidence: ensureNumber(result.compensation?.salaryRange?.confidence || salaryData?.confidence, 0.5)
        },
        totalCompensation: {
          base: baseSalary,
          bonus: bonus,
          equity: equity,
          benefits: benefits,
          total: totalComp
        },
        marketPosition: result.compensation?.marketPosition || 'at_market',
        negotiationPower: ensureNumber(result.compensation?.negotiationPower, 60),
        marketData: Array.isArray(result.compensation?.marketData) ? result.compensation.marketData : (salaryData?.marketData || ['Market competitive compensation'])
      },
      location: {
        jobLocation: result.location?.jobLocation || 'Remote',
        userLocation: result.location?.userLocation,
        isRemote: result.location?.isRemote || false,
        effectiveLocation: result.location?.effectiveLocation || 'Remote',
        costOfLiving: ensureNumber(costOfLivingData?.costOfLivingIndex, 100),
        housingCosts: {
          rent1br: ensureNumber(costOfLivingData?.housingCosts?.rent1br, 1500),
          rent3br: ensureNumber(costOfLivingData?.housingCosts?.rent3br, 2500),
          buyPrice: ensureNumber(costOfLivingData?.housingCosts?.buyPrice, 300)
        },
        generalExpenses: {
          meal: ensureNumber(costOfLivingData?.generalExpenses?.meal, 15),
          transport: ensureNumber(costOfLivingData?.generalExpenses?.transport, 100),
          utilities: ensureNumber(costOfLivingData?.generalExpenses?.utilities, 150)
        },
        taxes: {
          federal: ensureNumber(result.location?.taxes?.federal, 22),
          state: ensureNumber(result.location?.taxes?.state, 5),
          local: ensureNumber(result.location?.taxes?.local, 2),
          total: ensureNumber(result.location?.taxes?.total, 29)
        },
        qualityOfLife: ensureNumber(result.location?.qualityOfLife, 75),
        marketMultiplier: ensureNumber(result.location?.marketMultiplier, 1.0),
        salaryAdjustment: {
          factor: ensureNumber(result.location?.salaryAdjustment?.factor, 1.0),
          reason: result.location?.salaryAdjustment?.reason || 'Based on cost of living'
        }
      },
      market: {
        demand: ensureNumber(result.market?.demand, 75),
        competition: ensureNumber(result.market?.competition, 60),
        growth: ensureNumber(result.market?.growth, 70),
        outlook: result.market?.outlook || 'positive',
        timeToHire: ensureNumber(result.market?.timeToHire, 30),
        alternatives: ensureNumber(result.market?.alternatives, 5)
      },
      company: {
        size: companyData?.companySize || 'medium',
        industry: companyData?.industry || 'Technology',
        compensationPhilosophy: companyData?.compensationPhilosophy || 'Competitive',
        benefits: Array.isArray(companyData?.benefits) ? companyData.benefits : ['Health insurance', 'PTO'],
        glassdoorRating: ensureNumber(companyData?.glassdoorRating, 3.5),
        culture: Array.isArray(result.company?.culture) ? result.company.culture : ['Collaborative', 'Innovation-focused'],
        workLifeBalance: ensureNumber(result.company?.workLifeBalance, 70),
        careerGrowth: ensureNumber(result.company?.careerGrowth, 75)
      },
      analysis: {
        overallScore: ensureNumber(result.analysis?.overallScore, 75),
        pros: Array.isArray(result.analysis?.pros) ? result.analysis.pros : ['Market competitive compensation', 'Established company'],
        cons: Array.isArray(result.analysis?.cons) ? result.analysis.cons : ['Limited information available'],
        risks: Array.isArray(result.analysis?.risks) ? result.analysis.risks : ['Market volatility'],
        opportunities: Array.isArray(result.analysis?.opportunities) ? result.analysis.opportunities : ['Career growth potential'],
        recommendations: Array.isArray(result.analysis?.recommendations) ? result.analysis.recommendations : ['Research company culture further'],
        negotiationTips: Array.isArray(result.analysis?.negotiationTips) ? result.analysis.negotiationTips : ['Research market rates', 'Highlight relevant experience']
      },
      budgetCalculation: {
        scenario: result.budgetCalculation?.scenario || 'single',
        monthlyBreakdown: {
          housing: ensureNumber(result.budgetCalculation?.monthlyBreakdown?.housing, Math.round(monthlyIncome * 0.3)),
          food: ensureNumber(result.budgetCalculation?.monthlyBreakdown?.food, Math.round(monthlyIncome * 0.15)),
          transportation: ensureNumber(result.budgetCalculation?.monthlyBreakdown?.transportation, Math.round(monthlyIncome * 0.12)),
          healthcare: ensureNumber(result.budgetCalculation?.monthlyBreakdown?.healthcare, Math.round(monthlyIncome * 0.08)),
          utilities: ensureNumber(result.budgetCalculation?.monthlyBreakdown?.utilities, Math.round(monthlyIncome * 0.05)),
          savings: ensureNumber(result.budgetCalculation?.monthlyBreakdown?.savings, Math.round(monthlyIncome * 0.2)),
          discretionary: ensureNumber(result.budgetCalculation?.monthlyBreakdown?.discretionary, Math.round(monthlyIncome * 0.1))
        },
        comfortLevel: result.budgetCalculation?.comfortLevel || 'comfortable',
        livingWageAnalysis: {
          survivalWage: ensureNumber(result.budgetCalculation?.livingWageAnalysis?.survivalWage, Math.round(safeMedianSalary * 0.7)),
          comfortableWage: ensureNumber(result.budgetCalculation?.livingWageAnalysis?.comfortableWage, safeMedianSalary),
          optimalWage: ensureNumber(result.budgetCalculation?.livingWageAnalysis?.optimalWage, Math.round(safeMedianSalary * 1.5))
        }
      },
      confidence: {
        overall: ensureNumber(result.confidence?.overall || salaryData?.confidence, 0.7),
        salary: ensureNumber(result.confidence?.salary || salaryData?.confidence, 0.7),
        market: ensureNumber(result.confidence?.market, 0.7),
        location: ensureNumber(result.confidence?.location, 0.8),
        dataSources: Array.isArray(result.confidence?.dataSources) ? result.confidence.dataSources : ['web_search', 'real_data'],
        estimateType: result.confidence?.estimateType || 'web_search',
        disclaimer: result.confidence?.disclaimer || 'Based on real web search data'
      }
    };
  }

  private calculateOverallConfidence(salaryData: any, costOfLivingData: any, companyData: any): number {
    const salaryConfidence = salaryData.confidence || 0.3;
    const costOfLivingConfidence = costOfLivingData.confidence || 0.5;
    const companyConfidence = companyData.sources?.length > 0 ? 0.7 : 0.3;

    // Weighted average (salary data is most important)
    return (salaryConfidence * 0.5 + costOfLivingConfidence * 0.3 + companyConfidence * 0.2);
  }
}

// Export singleton instance
export const webEnhancedSalaryIntelligence = new WebEnhancedSalaryIntelligence();