// Enhanced AI-Powered Salary Intelligence Service - MIGRATED TO UNIFIED ARCHITECTURE
// Provides comprehensive salary analysis with NO token limits and clean error handling

import { unifiedAI } from './unified-ai-service';
import { PrismaClient } from '@prisma/client';
// import { salaryCache } from './salary-cache';

const prisma = new PrismaClient();

// Types
export interface EnhancedAnalysisRequest {
  jobId: string;
  jobTitle: string;
  company?: string;
  location?: string;
  description?: string;
  requirements?: string;
  salaryInfo?: string;
  workMode?: 'onsite' | 'hybrid' | 'remote_country' | 'remote_global';
  userId: string;
  expenseProfile?: ExpenseProfile;
  currency?: string;
  forceRefresh?: boolean;
}

export interface ExpenseProfile {
  housing: { percentage: number; amount?: number };
  food: { percentage: number; amount?: number };
  transportation: { percentage: number; amount?: number };
  healthcare: { percentage: number; amount?: number };
  utilities: { percentage: number; amount?: number };
  entertainment: { percentage: number; amount?: number };
  savings: { percentage: number; amount?: number };
  other: { percentage: number; amount?: number };
}

export interface LocationData {
  input: string;
  normalized: {
    city: string;
    state?: string;
    country: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  costOfLivingIndex: number;
  source: 'user_input' | 'job_posting' | 'geocoding' | 'inference';
}

export interface EnhancedSalaryResponse {
  // Core salary data
  salary: {
    estimated: {
      min: number;
      max: number;
      median: number;
      confidence: number;
    };
    market: {
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      source: string;
    };
    listed?: {
      min: number;
      max: number;
      period: string;
      currency: string;
    };
  };

  // Enhanced expense breakdown
  expenses: {
    monthly: ExpenseBreakdown;
    annual: ExpenseBreakdown;
    customized: boolean;
    recommendations: string[];
  };

  // Location intelligence
  location: LocationData;

  // Affordability metrics
  affordability: {
    score: number; // -1 to 3
    label: 'unaffordable' | 'tight' | 'comfortable' | 'very_comfortable' | 'luxurious';
    monthlyNetIncome: number;
    monthlySurplus: number;
    savingsRate: number;
    explanation: string;
  };

  // Career insights
  career: {
    level: string;
    yearsExperience: number;
    marketPosition: 'entry' | 'below_market' | 'at_market' | 'above_market' | 'premium';
    growthPotential: string;
    negotiationLeverage: 'low' | 'medium' | 'high';
  };

  // RAG-enhanced insights
  insights: {
    similarJobs: Array<{
      title: string;
      company: string;
      salaryRange: string;
      location: string;
    }>;
    industryTrends: string[];
    negotiationTips: string[];
    warnings: string[];
    opportunities: string[];
  };

  // Metadata
  metadata: {
    analysisId: string;
    timestamp: string;
    version: string;
    confidence: {
      overall: number;
      salary: number;
      location: number;
      expenses: number;
    };
    dataSources: string[];
    cached: boolean;
    processingTimeMs: number;
  };
}

interface ExpenseBreakdown {
  housing: number;
  food: number;
  transportation: number;
  healthcare: number;
  utilities: number;
  entertainment: number;
  savings: number;
  other: number;
  total: number;
}

// RAG Context Builder
class RAGContextBuilder {
  async buildContext(request: EnhancedAnalysisRequest): Promise<string> {
    const contexts: string[] = [];

    // 1. User profile context
    const userContext = await this.getUserContext(request.userId);
    if (userContext) {
      contexts.push(`USER PROFILE CONTEXT:\n${userContext}`);
    }

    // 2. Similar jobs context
    const similarJobsContext = await this.getSimilarJobsContext(
      request.jobTitle,
      request.location,
      request.company
    );
    if (similarJobsContext) {
      contexts.push(`SIMILAR JOBS CONTEXT:\n${similarJobsContext}`);
    }

    // 3. Location market context
    const locationContext = await this.getLocationMarketContext(request.location);
    if (locationContext) {
      contexts.push(`LOCATION MARKET CONTEXT:\n${locationContext}`);
    }

    // 4. Company context (if available)
    if (request.company) {
      const companyContext = await this.getCompanyContext(request.company);
      if (companyContext) {
        contexts.push(`COMPANY CONTEXT:\n${companyContext}`);
      }
    }

    // 5. Industry trends context
    const industryContext = await this.getIndustryContext(request.jobTitle);
    if (industryContext) {
      contexts.push(`INDUSTRY TRENDS:\n${industryContext}`);
    }

    return contexts.join('\n\n---\n\n');
  }

  private async getUserContext(userId: string): Promise<string | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          resumes: {
            where: { isActive: true },
            take: 1
          },
          jobs: {
            where: {
              ratings: {
                some: {
                  rating: { gte: 4 }
                }
              }
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!user) return null;

      const parts: string[] = [];

      if (user.profile) {
        parts.push(`Current Location: ${user.profile.currentLocation || 'Not specified'}`);
        parts.push(`Years of Experience: ${user.profile.yearsOfExperience || 'Not specified'}`);
        parts.push(`Expected Salary: $${user.profile.expectedSalaryMin || 0} - $${user.profile.expectedSalaryMax || 0}`);
        parts.push(`Current Salary: $${user.profile.currentSalary || 'Not disclosed'}`);
      }

      if (user.resumes[0]) {
        const resume = user.resumes[0];
        if (resume.skills) {
          parts.push(`Key Skills: ${JSON.parse(resume.skills).slice(0, 10).join(', ')}`);
        }
      }

      if (user.jobs.length > 0) {
        const avgSalary = user.jobs
          .filter(j => j.salaryMin)
          .reduce((acc, j) => acc + (j.salaryMin || 0), 0) / user.jobs.length;
        parts.push(`Average salary of highly-rated jobs: $${Math.round(avgSalary)}`);
      }

      return parts.join('\n');
    } catch (error) {
      console.error('Error building user context:', error);
      return null;
    }
  }

  private async getSimilarJobsContext(
    jobTitle: string,
    location?: string,
    company?: string
  ): Promise<string | null> {
    try {
      // Handle undefined or empty job title
      if (!jobTitle || typeof jobTitle !== 'string') {
        return null;
      }

      // Find similar jobs in the database
      const similarJobs = await prisma.job.findMany({
        where: {
          OR: [
            { title: { contains: jobTitle } },
            { skills: { contains: jobTitle.split(' ')[0] || jobTitle } }
          ],
          NOT: { company },
          salaryMin: { not: null }
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      if (similarJobs.length === 0) return null;

      const jobSummaries = similarJobs.map(job =>
        `- ${job.title} at ${job.company}: $${job.salaryMin}-${job.salaryMax} (${job.location})`
      );

      return `Similar positions in the market:\n${jobSummaries.join('\n')}`;
    } catch (error) {
      console.error('Error getting similar jobs context:', error);
      return null;
    }
  }

  private async getLocationMarketContext(location?: string): Promise<string | null> {
    if (!location) return null;

    // This would integrate with external APIs for real-time market data
    // For now, return structured location analysis prompt
    return `Location "${location}" requires analysis for:
- Cost of living index relative to US average
- Typical salary adjustments for this market
- Housing costs and availability
- Local tax implications
- Remote work prevalence in this area`;
  }

  private async getCompanyContext(company: string): Promise<string | null> {
    try {
      // Check if we have any data about this company
      const companyJobs = await prisma.job.findMany({
        where: {
          company: { contains: company }
        },
        take: 5
      });

      if (companyJobs.length === 0) return null;

      const avgSalary = companyJobs
        .filter(j => j.salaryMin)
        .reduce((acc, j) => acc + (j.salaryMin || 0), 0) / companyJobs.length;

      return `Company "${company}" insights:
- Found ${companyJobs.length} positions in database
- Average salary: $${Math.round(avgSalary)}
- Typical roles: ${companyJobs.map(j => j.title).join(', ')}`;
    } catch (error) {
      console.error('Error getting company context:', error);
      return null;
    }
  }

  private async getIndustryContext(jobTitle: string): Promise<string | null> {
    // Handle undefined or empty job title
    if (!jobTitle || typeof jobTitle !== 'string') {
      return 'General market trends:\n- Salary growth varies by industry\n- Location significantly impacts compensation\n- Skills and experience are key factors';
    }

    // Extract key terms from job title for industry identification
    const techTerms = ['engineer', 'developer', 'architect', 'scientist', 'analyst'];
    const isTech = techTerms.some(term => jobTitle.toLowerCase().includes(term));

    if (isTech) {
      return `Technology industry trends:
- High demand for AI/ML skills (+25% salary premium)
- Remote work commonly offered (affects location requirements)
- Stock compensation typical for senior roles
- Rapid salary growth for specialized skills`;
    }

    return `General industry considerations for "${jobTitle}"`;
  }
}

// Main Service Class
export class EnhancedSalaryIntelligenceService {
  private ragBuilder = new RAGContextBuilder();

  async analyze(request: EnhancedAnalysisRequest): Promise<EnhancedSalaryResponse> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = `enhanced-${request.jobId}-${request.jobTitle}-${request.location}`;

    // Skip caching for now
    const cached = null;

    // Build RAG context
    const ragContext = await this.ragBuilder.buildContext(request);

    // Create enhanced prompt with RAG context
    const prompt = this.buildEnhancedPrompt(request, ragContext);

    // Call unified AI service for analysis - NO TOKEN LIMITS
    const aiResponse = await unifiedAI.process({
      operation: 'salary_analysis',
      content: prompt,
      overrides: {
        model: 'gpt-5', // Use full GPT-5 for comprehensive analysis
        reasoning: 'high'
      }
    });

    if (!aiResponse.success) {
      throw new Error(`Enhanced salary analysis failed: ${aiResponse.error?.message}`);
    }

    // Parse and validate response
    const responseContent = typeof aiResponse.data === 'string' ? aiResponse.data : JSON.stringify(aiResponse.data);
    const analysis = this.parseAIResponse(responseContent, request);

    // Apply expense profile if provided
    if (request.expenseProfile) {
      analysis.expenses = this.applyCustomExpenseProfile(
        analysis.expenses,
        request.expenseProfile,
        analysis.affordability.monthlyNetIncome
      );
    }

    // Add metadata
    analysis.metadata = {
      analysisId: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      confidence: analysis.metadata?.confidence || {
        overall: 0.8,
        salary: 0.85,
        location: 0.75,
        expenses: 0.9
      },
      dataSources: ['openai', 'user_profile', 'job_database', 'rag_context'],
      cached: false,
      processingTimeMs: Date.now() - startTime
    };

    // Cache the result
    // Skip caching for now

    return analysis;
  }

  private buildEnhancedPrompt(request: EnhancedAnalysisRequest, ragContext: string): string {
    const currency = request.currency || 'USD';
    return `You are an expert salary analyst with access to comprehensive market data. Analyze this job opportunity and provide detailed salary intelligence.

${ragContext}

JOB DETAILS:
- Title: ${request.jobTitle}
- Company: ${request.company || 'Not specified'}
- Location: ${request.location || 'Not specified'}
- Work Mode: ${request.workMode || 'Not specified'}
- Listed Salary: ${request.salaryInfo || 'Not provided'}
- Description: ${request.description || 'Not provided'}
- Target Currency: ${currency}

REQUIRED JSON STRUCTURE - You MUST provide ALL fields:
{
  "salary": {
    "estimated": {
      "min": number (in ${currency}),
      "max": number (in ${currency}),
      "median": number (in ${currency}),
      "confidence": number (0.0-1.0),
      "currency": "${currency}"
    },
    "market": {
      "p25": number (in ${currency}),
      "p50": number (in ${currency}),
      "p75": number (in ${currency}),
      "p90": number (in ${currency}),
      "source": "live_data|market_analysis",
      "currency": "${currency}"
    }
  },
  "expenses": {
    "monthly": {
      "housing": number,
      "food": number,
      "transportation": number,
      "healthcare": number,
      "utilities": number,
      "entertainment": number,
      "savings": number,
      "other": number,
      "total": number
    },
    "annual": {
      "housing": number,
      "food": number,
      "transportation": number,
      "healthcare": number,
      "utilities": number,
      "entertainment": number,
      "savings": number,
      "other": number,
      "total": number
    },
    "customized": false,
    "recommendations": ["string array"]
  },
  "location": {
    "input": "${request.location || 'Not specified'}",
    "normalized": {
      "city": "string",
      "country": "string"
    },
    "costOfLivingIndex": number,
    "source": "real_data"
  },
  "affordability": {
    "score": number (-1 to 3),
    "label": "unaffordable|tight|comfortable|very_comfortable|luxurious",
    "monthlyNetIncome": number,
    "monthlySurplus": number,
    "savingsRate": number,
    "explanation": "string"
  },
  "career": {
    "level": "junior|mid|senior|lead|principal|executive",
    "yearsExperience": number,
    "marketPosition": "entry|below_market|at_market|above_market|premium",
    "growthPotential": "string",
    "negotiationLeverage": "low|medium|high"
  },
  "insights": {
    "similarJobs": [{"title": "string", "company": "string", "salaryRange": "string", "location": "string"}],
    "industryTrends": ["string array"],
    "negotiationTips": ["string array - minimum 3 tips"],
    "warnings": ["string array"],
    "opportunities": ["string array"]
  }
}

CRITICAL REQUIREMENTS:
1. ALL monetary values MUST be in ${currency}
2. Use RAG context data for accuracy - NO GENERIC ESTIMATES
3. Base salary ranges on actual market data or similar roles from context
4. Calculate realistic expenses for the specific location
5. Provide at least 3 specific negotiation tips
6. Include market analysis from similar jobs in database
7. ALL fields are REQUIRED - do not omit any

Return ONLY the JSON object - no additional text or explanations.`;
  }

  private parseAIResponse(aiResponse: string, request: EnhancedAnalysisRequest): EnhancedSalaryResponse {
    try {
      const parsed = JSON.parse(aiResponse);

      // Validate that AI provided all required fields
      if (!parsed.salary) {
        throw new Error('AI response missing salary data');
      }
      if (!parsed.expenses) {
        throw new Error('AI response missing expenses data');
      }
      if (!parsed.location) {
        throw new Error('AI response missing location data');
      }
      if (!parsed.affordability) {
        throw new Error('AI response missing affordability data');
      }
      if (!parsed.career) {
        throw new Error('AI response missing career data');
      }
      if (!parsed.insights) {
        throw new Error('AI response missing insights data');
      }

      return {
        salary: parsed.salary,
        expenses: parsed.expenses,
        location: parsed.location,
        affordability: parsed.affordability,
        career: parsed.career,
        insights: parsed.insights,
        metadata: parsed.metadata || {
          analysisId: `ai_${Date.now()}`,
          timestamp: new Date().toISOString(),
          version: '2.0.0',
          confidence: { overall: 0.0, salary: 0.0, location: 0.0, expenses: 0.0 },
          dataSources: ['ai_only'],
          cached: false,
          processingTimeMs: 0
        }
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Invalid response format'}`);
    }
  }

  private applyCustomExpenseProfile(
    baseExpenses: any,
    profile: ExpenseProfile,
    monthlyIncome: number
  ): any {
    const monthly: ExpenseBreakdown = {
      housing: 0,
      food: 0,
      transportation: 0,
      healthcare: 0,
      utilities: 0,
      entertainment: 0,
      savings: 0,
      other: 0,
      total: 0
    };

    // Calculate each expense based on profile
    Object.keys(profile).forEach(category => {
      const config = profile[category as keyof ExpenseProfile];
      if (config.amount) {
        monthly[category as keyof ExpenseBreakdown] = config.amount;
      } else {
        monthly[category as keyof ExpenseBreakdown] =
          Math.round(monthlyIncome * (config.percentage / 100));
      }
    });

    monthly.total = Object.values(monthly).reduce((sum, val) => sum + (val || 0), 0);

    return {
      monthly,
      annual: Object.fromEntries(
        Object.entries(monthly).map(([key, val]) => [key, val * 12])
      ),
      customized: true,
      recommendations: this.generateExpenseRecommendations(monthly, monthlyIncome)
    };
  }

  private generateExpenseRecommendations(expenses: ExpenseBreakdown, income: number): string[] {
    const recommendations: string[] = [];
    const savingsRate = (expenses.savings / income) * 100;

    if (savingsRate < 10) {
      recommendations.push('Consider increasing savings to at least 10% of income');
    }
    if (expenses.housing / income > 0.3) {
      recommendations.push('Housing costs exceed recommended 30% of income');
    }
    if (expenses.food / income > 0.15) {
      recommendations.push('Food expenses are above typical 10-15% range');
    }

    return recommendations;
  }

  private expenseProfileToNumbers(profile?: ExpenseProfile): Record<string, number> | undefined {
    if (!profile) return undefined;

    const numbers: Record<string, number> = {};
    Object.entries(profile).forEach(([key, value]) => {
      numbers[key] = value.percentage;
    });
    return numbers;
  }

}

// Export singleton instance
export const enhancedSalaryIntelligence = new EnhancedSalaryIntelligenceService();