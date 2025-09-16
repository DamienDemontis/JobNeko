/**
 * Optimized Salary Intelligence Service
 * Reduces API calls from 8+ to just 1-2 while maintaining quality
 */

import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface OptimizedSalaryAnalysis {
  compensation: {
    estimated: {
      min: number;
      max: number;
      median: number;
      confidence: number; // 0-1 scale
    };
    breakdown: {
      baseSalary: number;
      bonus: number;
      equity: number;
      benefits: number;
      total: number;
    };
    marketPosition: 'below_market' | 'at_market' | 'above_market';
  };
  location: {
    city: string;
    costOfLiving: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    salaryAdjustment: number; // Multiplier for location
    remoteFriendly: boolean;
  };
  analysis: {
    pros: string[];
    cons: string[];
    recommendation: string;
    negotiationTips: string[];
    overallScore: number; // 0-100
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
  };
  metadata: {
    analysisType: 'ai_estimated' | 'posted_salary';
    timestamp: string;
    processingTime: number;
  };
}

export class OptimizedSalaryIntelligence {
  /**
   * Performs comprehensive salary analysis with a single optimized AI call
   */
  async analyzeSalary(
    jobTitle: string,
    company: string,
    location: string,
    jobDescription: string,
    postedSalary?: string,
    userLocation?: string
  ): Promise<OptimizedSalaryAnalysis> {
    if (!openai) {
      throw new Error('OpenAI API key not configured');
    }

    const startTime = Date.now();

    try {
      // Single comprehensive prompt that gets all needed data in one call
      const prompt = this.buildComprehensivePrompt(
        jobTitle,
        company,
        location,
        jobDescription,
        postedSalary,
        userLocation
      );

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert salary analyst and career advisor with deep knowledge of:
- Current market salary ranges across industries and locations
- Cost of living variations between cities
- Compensation package structures
- Budget planning and financial advice
- Negotiation strategies

Provide realistic, data-informed estimates based on:
1. Job title seniority and responsibilities
2. Company size and industry
3. Location and cost of living
4. Current market conditions (as of 2024)
5. Skills and requirements mentioned

Be transparent about confidence levels. Higher confidence for well-known roles and locations, lower for niche positions.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent estimates
        response_format: { type: 'json_object' }
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');

      // Ensure all required fields are present
      const analysis = this.validateAndEnrichResponse(response);

      return {
        ...analysis,
        metadata: {
          analysisType: postedSalary ? 'posted_salary' : 'ai_estimated',
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };
    } catch (error) {
      console.error('Salary analysis failed:', error);
      throw new Error('Failed to analyze salary information');
    }
  }

  private buildComprehensivePrompt(
    jobTitle: string,
    company: string,
    location: string,
    jobDescription: string,
    postedSalary?: string,
    userLocation?: string
  ): string {
    const effectiveLocation = userLocation || location;

    return `Analyze this job opportunity and provide comprehensive salary intelligence:

JOB DETAILS:
- Title: ${jobTitle}
- Company: ${company}
- Location: ${location}
- User Location: ${effectiveLocation}
${postedSalary ? `- Posted Salary: ${postedSalary}` : '- Salary: Not posted (estimate needed)'}

JOB DESCRIPTION:
${jobDescription.substring(0, 2000)} // Limit to prevent token overflow

REQUIRED ANALYSIS:

1. COMPENSATION ESTIMATION:
${postedSalary ?
  'Use the posted salary as the base, but also provide market comparison' :
  'Estimate salary range based on title, company, location, and requirements'}
- Provide min, max, and median estimates
- Break down total compensation (base, bonus, equity, benefits)
- Rate confidence level (0-1) based on data availability
- Compare to market (below/at/above)

2. LOCATION ANALYSIS:
- Assess cost of living (very_low/low/medium/high/very_high)
- Calculate location-based salary adjustment multiplier
- Consider remote work implications

3. JOB ANALYSIS:
- List 3-4 key advantages
- List 2-3 potential concerns
- Provide overall recommendation
- Suggest 3-4 negotiation strategies
- Score overall opportunity (0-100)

4. BUDGET CALCULATION:
- Calculate monthly budget for single person
- Break down: housing (30%), food (15%), transportation (15%), healthcare (10%), utilities (5%), savings (20%), discretionary (5%)
- Assess comfort level (struggling/tight/comfortable/very_comfortable)

Return as JSON with this exact structure:
{
  "compensation": {
    "estimated": {
      "min": <number>,
      "max": <number>,
      "median": <number>,
      "confidence": <0-1>
    },
    "breakdown": {
      "baseSalary": <number>,
      "bonus": <number>,
      "equity": <number>,
      "benefits": <number>,
      "total": <number>
    },
    "marketPosition": "<below_market|at_market|above_market>"
  },
  "location": {
    "city": "<city name>",
    "costOfLiving": "<very_low|low|medium|high|very_high>",
    "salaryAdjustment": <multiplier>,
    "remoteFriendly": <boolean>
  },
  "analysis": {
    "pros": [<3-4 advantages>],
    "cons": [<2-3 concerns>],
    "recommendation": "<overall recommendation>",
    "negotiationTips": [<3-4 tips>],
    "overallScore": <0-100>
  },
  "budgetCalculation": {
    "scenario": "single",
    "monthlyBreakdown": {
      "housing": <number>,
      "food": <number>,
      "transportation": <number>,
      "healthcare": <number>,
      "utilities": <number>,
      "savings": <number>,
      "discretionary": <number>
    },
    "comfortLevel": "<struggling|tight|comfortable|very_comfortable>"
  }
}`;
  }

  private validateAndEnrichResponse(response: any): Omit<OptimizedSalaryAnalysis, 'metadata'> {
    // Ensure all required fields exist with sensible defaults
    return {
      compensation: {
        estimated: {
          min: response.compensation?.estimated?.min || 50000,
          max: response.compensation?.estimated?.max || 80000,
          median: response.compensation?.estimated?.median || 65000,
          confidence: response.compensation?.estimated?.confidence || 0.5
        },
        breakdown: {
          baseSalary: response.compensation?.breakdown?.baseSalary || 65000,
          bonus: response.compensation?.breakdown?.bonus || 6500,
          equity: response.compensation?.breakdown?.equity || 0,
          benefits: response.compensation?.breakdown?.benefits || 15000,
          total: response.compensation?.breakdown?.total || 86500
        },
        marketPosition: response.compensation?.marketPosition || 'at_market'
      },
      location: {
        city: response.location?.city || 'Unknown',
        costOfLiving: response.location?.costOfLiving || 'medium',
        salaryAdjustment: response.location?.salaryAdjustment || 1.0,
        remoteFriendly: response.location?.remoteFriendly || false
      },
      analysis: {
        pros: response.analysis?.pros || ['Competitive compensation', 'Growth opportunity'],
        cons: response.analysis?.cons || ['Limited information available'],
        recommendation: response.analysis?.recommendation || 'Consider applying with more research',
        negotiationTips: response.analysis?.negotiationTips || ['Research market rates', 'Highlight your experience'],
        overallScore: response.analysis?.overallScore || 70
      },
      budgetCalculation: {
        scenario: 'single',
        monthlyBreakdown: {
          housing: response.budgetCalculation?.monthlyBreakdown?.housing || 2000,
          food: response.budgetCalculation?.monthlyBreakdown?.food || 800,
          transportation: response.budgetCalculation?.monthlyBreakdown?.transportation || 500,
          healthcare: response.budgetCalculation?.monthlyBreakdown?.healthcare || 400,
          utilities: response.budgetCalculation?.monthlyBreakdown?.utilities || 200,
          savings: response.budgetCalculation?.monthlyBreakdown?.savings || 1000,
          discretionary: response.budgetCalculation?.monthlyBreakdown?.discretionary || 600
        },
        comfortLevel: response.budgetCalculation?.comfortLevel || 'comfortable'
      }
    };
  }

  /**
   * Quick salary estimate for job cards (lighter weight)
   */
  async quickEstimate(jobTitle: string, location: string): Promise<{ min: number; max: number; confidence: number }> {
    if (!openai) {
      // Fallback to rule-based estimation
      return this.ruleBasedEstimate(jobTitle, location);
    }

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a salary estimation expert. Provide quick, realistic salary ranges.'
          },
          {
            role: 'user',
            content: `Estimate salary range for: ${jobTitle} in ${location}. Return JSON: { "min": number, "max": number, "confidence": 0-1 }`
          }
        ],
        temperature: 0.3,
        max_tokens: 100
      });

      return JSON.parse(completion.choices[0].message.content || '{"min": 50000, "max": 80000, "confidence": 0.5}');
    } catch (error) {
      console.warn('Quick estimate failed, using rule-based fallback');
      return this.ruleBasedEstimate(jobTitle, location);
    }
  }

  private ruleBasedEstimate(jobTitle: string, location: string): { min: number; max: number; confidence: number } {
    // Simple rule-based estimation as fallback
    const titleLower = jobTitle.toLowerCase();

    // Base ranges by seniority
    let baseMin = 50000;
    let baseMax = 80000;

    if (titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('principal')) {
      baseMin = 120000;
      baseMax = 180000;
    } else if (titleLower.includes('manager') || titleLower.includes('director')) {
      baseMin = 130000;
      baseMax = 200000;
    } else if (titleLower.includes('junior') || titleLower.includes('entry')) {
      baseMin = 40000;
      baseMax = 60000;
    } else if (titleLower.includes('intern')) {
      baseMin = 20000;
      baseMax = 40000;
    }

    // Location adjustment
    const locationLower = location.toLowerCase();
    let locationMultiplier = 1.0;

    if (locationLower.includes('san francisco') || locationLower.includes('new york') || locationLower.includes('seattle')) {
      locationMultiplier = 1.4;
    } else if (locationLower.includes('los angeles') || locationLower.includes('boston') || locationLower.includes('washington')) {
      locationMultiplier = 1.2;
    } else if (locationLower.includes('austin') || locationLower.includes('denver') || locationLower.includes('chicago')) {
      locationMultiplier = 1.1;
    } else if (locationLower.includes('remote')) {
      locationMultiplier = 1.0;
    }

    return {
      min: Math.round(baseMin * locationMultiplier),
      max: Math.round(baseMax * locationMultiplier),
      confidence: 0.3 // Low confidence for rule-based
    };
  }
}

// Export singleton instance
export const optimizedSalaryIntelligence = new OptimizedSalaryIntelligence();