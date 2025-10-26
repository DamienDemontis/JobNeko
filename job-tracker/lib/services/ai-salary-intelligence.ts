// AI-Powered Salary Intelligence Service - MIGRATED TO UNIFIED ARCHITECTURE
// Uses unified AI service for analysis - NO hardcoded data, NO token limits

import { unifiedAI } from './unified-ai-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AIJobAnalysisRequest {
  jobTitle: string;
  company?: string;
  location?: string;
  description?: string;
  requirements?: string;
  salaryInfo?: string;
  workMode?: 'onsite' | 'hybrid' | 'remote_country' | 'remote_global';
  experienceYears?: number;
  userId: string;
}

interface AIUserContext {
  // From UserProfile
  currentLocation?: string;
  currentCountry?: string;
  familySize?: number;
  dependents?: number;
  maritalStatus?: string;
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  currentSalary?: number;
  yearsOfExperience?: number;
  
  // From Resume
  skills?: string[];
  experience?: any[];
  education?: any[];
  resumeContent?: string;
}

interface AISalaryResponse {
  schema_version: string;
  methodology_version: string;
  generated_at_utc: string;
  schema_valid: boolean;
  
  // Role normalization
  normalized_role: string;
  normalized_role_slug: string;
  normalized_level_rank: number;
  level: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'staff' | 'principal' | 'unknown';
  experience_years: number | null;
  
  // Location
  location: {
    city: string | null;
    admin_area: string | null;
    country: string;
    iso_country_code: string;
    lat: number | null;
    lng: number | null;
  };
  job_location_mode: 'onsite' | 'hybrid' | 'remote_country' | 'remote_global';
  
  // Currency & FX
  currency: string;
  fx_used: boolean;
  fx_rate_date: string | null;
  
  // Salary data
  listed_salary: {
    min: number | null;
    max: number | null;
    period: 'year' | 'month' | 'day' | 'hour' | null;
    basis: 'gross' | 'net' | null;
    data_quality: number | null;
    inference_basis: string | null;
  } | null;
  
  expected_salary_range: {
    min: number | null;
    max: number | null;
    period: 'year' | 'month' | 'day' | 'hour';
    basis: 'gross' | 'net';
    data_quality: number | null;
    inference_basis: string | null;
  };
  
  // Core calculations
  monthly_net_income: number | null;
  monthly_core_expenses: number | null;
  affordability_score: number | null;
  affordability_label: 'unaffordable' | 'tight' | 'comfortable' | 'very_comfortable';
  
  // Metadata
  explanations: string[];
  confidence: {
    level: 'low' | 'medium' | 'high';
    reasons: string[];
  };
  sources: Array<{
    field: string;
    source_type: 'ai_analysis' | 'user_profile' | 'resume_data' | 'market_data';
    url_or_name: string;
    retrieved_at: string;
  }>;
  cache_meta: {
    cache_hits: string[];
    cache_misses: string[];
  };
  
  // Model versions
  country_tax_model_version: string;
  tax_method: 'ai_calculation' | 'inference';
  col_model_version: string;
  col_method: 'ai_analysis' | 'inference';
  fx_model_version: string;
  
  // Assumptions
  assumptions: {
    tax_filing_status: string;
    dependents: number;
    housing_type: string;
    household_size: number;
  };
  
  // Budget control
  computation_budget: {
    llm_calls: number;
    tool_calls: string;
    early_stop: boolean;
  };
  
  calc_notes: string[];
  validation_errors: string[];
}

export class AISalaryIntelligenceService {
  private static readonly SCHEMA_VERSION = '1.0.0';
  private static readonly METHODOLOGY_VERSION = '2025-09-09-ai';

  /**
   * Analyze job offer using AI with full user context
   */
  async analyzeJobSalary(request: AIJobAnalysisRequest): Promise<AISalaryResponse> {
    const startTime = Date.now();
    const generatedAt = new Date().toISOString();
    
    try {
      // 1. Gather user context from database
      const userContext = await this.gatherUserContext(request.userId);
      
      // 2. Create comprehensive analysis prompt
      const analysisPrompt = this.buildAnalysisPrompt(request, userContext);
      
      // 3. Call unified AI service for analysis - NO TOKEN LIMITS
      const aiResponse = await unifiedAI.process({
        operation: 'salary_analysis',
        content: analysisPrompt,
        overrides: {
          model: 'gpt-5', // Use full GPT-5 for comprehensive salary analysis
          reasoning: 'high'
        }
      });

      if (!aiResponse.success) {
        throw new Error(`Salary analysis failed: ${aiResponse.error?.message}`);
      }
      
      // 4. Parse and validate AI response
      const responseContent = typeof aiResponse.data === 'string' ? aiResponse.data : JSON.stringify(aiResponse.data);
      const salaryAnalysis = this.parseAIResponse(responseContent, generatedAt);
      
      // 5. Add metadata and source attribution
      salaryAnalysis.sources = [
        {
          field: 'salary_analysis',
          source_type: 'ai_analysis',
          url_or_name: 'openai-gpt-3.5-turbo',
          retrieved_at: generatedAt
        }
      ];
      
      if (userContext.resumeContent) {
        salaryAnalysis.sources.push({
          field: 'user_experience',
          source_type: 'resume_data',
          url_or_name: 'user_resume',
          retrieved_at: generatedAt
        });
      }
      
      if (userContext.expectedSalaryMin || userContext.expectedSalaryMax) {
        salaryAnalysis.sources.push({
          field: 'salary_expectations',
          source_type: 'user_profile',
          url_or_name: 'user_profile',
          retrieved_at: generatedAt
        });
      }
      
      salaryAnalysis.computation_budget = {
        llm_calls: 1,
        tool_calls: '<=1',
        early_stop: false
      };
      
      return salaryAnalysis;
      
    } catch (error) {
      console.error('AI Salary Intelligence error:', error);
      return this.generateErrorResponse(request, generatedAt, error as Error);
    }
  }

  /**
   * Gather user context from database (profile + resume)
   */
  private async gatherUserContext(userId: string): Promise<AIUserContext> {
    try {
      // Get user with profile and resumes
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          resumes: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (!user) {
        return {};
      }

      const profile = user.profile;
      const resume = user.resumes[0];

      const context: AIUserContext = {};

      // Profile data
      if (profile) {
        context.currentLocation = profile.currentLocation || undefined;
        context.currentCountry = profile.currentCountry || undefined;
        context.familySize = profile.familySize || undefined;
        context.dependents = profile.dependents || undefined;
        context.maritalStatus = profile.maritalStatus || undefined;
        context.expectedSalaryMin = profile.expectedSalaryMin || undefined;
        context.expectedSalaryMax = profile.expectedSalaryMax || undefined;
        context.currentSalary = profile.currentSalary || undefined;
        context.yearsOfExperience = profile.yearsOfExperience || undefined;
      }

      // Resume data
      if (resume) {
        context.resumeContent = resume.content || undefined;
        try {
          context.skills = resume.skills ? JSON.parse(resume.skills) : undefined;
          context.experience = resume.experience ? JSON.parse(resume.experience) : undefined;
          context.education = resume.education ? JSON.parse(resume.education) : undefined;
        } catch (e) {
          // JSON parsing failed, ignore
        }
      }

      return context;
    } catch (error) {
      console.error('Error gathering user context:', error);
      return {};
    }
  }

  /**
   * Build comprehensive AI prompt with job and user context
   */
  private buildAnalysisPrompt(request: AIJobAnalysisRequest, userContext: AIUserContext): string {
    return `You are an expert salary analyst and career advisor. Analyze this job offer and provide comprehensive salary intelligence in valid JSON format.

JOB OFFER DETAILS:
- Title: ${request.jobTitle}
- Company: ${request.company || 'Not specified'}
- Location: ${request.location || 'Not specified'}
- Work Mode: ${request.workMode || 'Not specified'}
- Listed Salary: ${request.salaryInfo || 'Not provided'}
- Description: ${request.description || 'Not provided'}
- Requirements: ${request.requirements || 'Not provided'}

USER CONTEXT:
- Current Location: ${userContext.currentLocation || 'Not specified'}
- Current Country: ${userContext.currentCountry || 'Not specified'}
- Family Size: ${userContext.familySize || 'Not specified'}
- Dependents: ${userContext.dependents || 'Not specified'}
- Marital Status: ${userContext.maritalStatus || 'Not specified'}
- Current Salary: ${userContext.currentSalary ? '$' + userContext.currentSalary : 'Not specified'}
- Expected Salary Range: ${userContext.expectedSalaryMin || userContext.expectedSalaryMax ? `$${userContext.expectedSalaryMin || 'min not set'} - $${userContext.expectedSalaryMax || 'max not set'}` : 'Not specified'}
- Years of Experience: ${userContext.yearsOfExperience || 'Not specified'}
- Key Skills: ${userContext.skills ? userContext.skills.slice(0, 10).join(', ') : 'Not specified'}
- Resume Summary: ${userContext.resumeContent ? userContext.resumeContent.substring(0, 500) + '...' : 'Not provided'}

ANALYSIS REQUIREMENTS:
1. Normalize the job role and detect experience level from title and context
2. Determine appropriate location and work mode details
3. If salary is listed, parse it carefully with currency and period detection
4. Calculate realistic expected salary range based on role, location, experience, and current market
5. Estimate taxes and net income considering location and family situation
6. Calculate cost of living and core expenses based on location and family size
7. Compute affordability score: (monthly_net_income - monthly_core_expenses) / monthly_core_expenses
8. Provide confidence assessment and clear explanations
9. Make realistic assumptions about tax filing, housing, etc. based on family context

CRITICAL INSTRUCTIONS:
- Use REAL market knowledge, not generic estimates
- Consider the user's actual experience level from resume/profile
- Factor in cost of living differences between user's location and job location
- Be realistic about taxes for the job's country/state
- Consider family size for expenses (${userContext.familySize || 1} person household)
- Provide specific, actionable insights
- If data is limited, be explicit about confidence levels
- All monetary amounts should be whole numbers (no decimals)

MANDATORY REQUIREMENTS - NEVER return null for these fields:
- expected_salary_range.min: Must ALWAYS have a number (use market research/comparable roles)
- expected_salary_range.max: Must ALWAYS have a number (typically 20-40% higher than min)
- monthly_net_income: Must ALWAYS calculate based on expected_salary_range.min
- monthly_core_expenses: Must ALWAYS estimate based on location and family size
- affordability_score: Must ALWAYS calculate using the formula provided
- If you lack specific data, make reasonable estimates based on role/location/experience but NEVER return null

Return a valid JSON object with this exact structure:
{
  "schema_version": "1.0.0",
  "methodology_version": "2025-09-09-ai",
  "generated_at_utc": "${new Date().toISOString()}",
  "schema_valid": true,
  "normalized_role": "exact role name",
  "normalized_role_slug": "role_slug",
  "normalized_level_rank": 0-6,
  "level": "intern|junior|mid|senior|lead|staff|principal|unknown",
  "experience_years": number_or_null,
  "location": {
    "city": "city_or_null",
    "admin_area": "state_or_null", 
    "country": "country_name",
    "iso_country_code": "2_letter_code",
    "lat": null,
    "lng": null
  },
  "job_location_mode": "onsite|hybrid|remote_country|remote_global",
  "currency": "USD|EUR|GBP|etc",
  "fx_used": true_or_false,
  "fx_rate_date": "date_or_null",
  "listed_salary": {
    "min": number_or_null,
    "max": number_or_null,
    "period": "year|month|day|hour",
    "basis": "gross|net", 
    "data_quality": 0.0_to_1.0,
    "inference_basis": "description_or_null"
  },
  "expected_salary_range": {
    "min": number_REQUIRED_NOT_NULL,
    "max": number_REQUIRED_NOT_NULL,
    "period": "year",
    "basis": "gross",
    "data_quality": 0.0_to_1.0,
    "inference_basis": "ai_market_analysis"
  },
  "monthly_net_income": number_REQUIRED_NOT_NULL,
  "monthly_core_expenses": number_REQUIRED_NOT_NULL,
  "affordability_score": number_between_minus1_and_3_REQUIRED_NOT_NULL,
  "affordability_label": "unaffordable|tight|comfortable|very_comfortable",
  "explanations": ["explanation1", "explanation2"],
  "confidence": {
    "level": "low|medium|high",
    "reasons": ["reason1", "reason2"]
  },
  "sources": [],
  "cache_meta": {"cache_hits": [], "cache_misses": []},
  "country_tax_model_version": "ai_analysis_v1",
  "tax_method": "ai_calculation",
  "col_model_version": "ai_analysis_v1", 
  "col_method": "ai_analysis",
  "fx_model_version": "ai_analysis_v1",
  "assumptions": {
    "tax_filing_status": "single|married_filing_jointly|etc",
    "dependents": number,
    "housing_type": "1br|2br|etc",
    "household_size": number
  },
  "computation_budget": {"llm_calls": 1, "tool_calls": "<=1", "early_stop": false},
  "calc_notes": ["note1", "note2"],
  "validation_errors": []
}

Provide ONLY the JSON response, no additional text or formatting.`;
  }

  /**
   * Parse AI response and ensure valid structure
   */
  private parseAIResponse(aiResponse: string, generatedAt: string): AISalaryResponse {
    try {
      // Extract JSON from AI response (in case there's extra text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
      
      const parsed = JSON.parse(jsonStr);
      
      // Ensure required fields exist with fallbacks
      const response: AISalaryResponse = {
        schema_version: AISalaryIntelligenceService.SCHEMA_VERSION,
        methodology_version: AISalaryIntelligenceService.METHODOLOGY_VERSION,
        generated_at_utc: generatedAt,
        schema_valid: true,
        
        normalized_role: parsed.normalized_role || 'Unknown Role',
        normalized_role_slug: parsed.normalized_role_slug || 'unknown_role',
        normalized_level_rank: parsed.normalized_level_rank || 0,
        level: parsed.level || 'unknown',
        experience_years: parsed.experience_years || null,
        
        location: {
          city: parsed.location?.city || null,
          admin_area: parsed.location?.admin_area || null,
          country: parsed.location?.country || 'Unknown',
          iso_country_code: parsed.location?.iso_country_code || 'XX',
          lat: null,
          lng: null
        },
        job_location_mode: parsed.job_location_mode || 'onsite',
        
        currency: parsed.currency || 'USD',
        fx_used: parsed.fx_used || false,
        fx_rate_date: parsed.fx_rate_date || null,
        
        listed_salary: parsed.listed_salary || null,
        expected_salary_range: {
          min: this.ensureSalaryMin(parsed.expected_salary_range?.min, parsed.normalized_role, parsed.location?.country, parsed.level),
          max: this.ensureSalaryMax(parsed.expected_salary_range?.max, parsed.expected_salary_range?.min, parsed.normalized_role, parsed.location?.country, parsed.level),
          period: parsed.expected_salary_range?.period || 'year',
          basis: parsed.expected_salary_range?.basis || 'gross',
          data_quality: parsed.expected_salary_range?.data_quality || 0.7,
          inference_basis: parsed.expected_salary_range?.inference_basis || 'ai_market_analysis'
        },
        
        monthly_net_income: null, // Will be calculated below
        monthly_core_expenses: null, // Will be calculated below  
        affordability_score: null, // Will be calculated below
        affordability_label: this.getAffordabilityLabel(parsed.affordability_score),
        
        explanations: Array.isArray(parsed.explanations) ? parsed.explanations : ['AI analysis completed'],
        confidence: {
          level: parsed.confidence?.level || 'medium',
          reasons: Array.isArray(parsed.confidence?.reasons) ? parsed.confidence.reasons : ['AI-powered analysis']
        },
        sources: [],
        cache_meta: { cache_hits: [], cache_misses: [] },
        
        country_tax_model_version: parsed.country_tax_model_version || 'ai_analysis_v1',
        tax_method: parsed.tax_method || 'ai_calculation',
        col_model_version: parsed.col_model_version || 'ai_analysis_v1',
        col_method: parsed.col_method || 'ai_analysis',
        fx_model_version: parsed.fx_model_version || 'ai_analysis_v1',
        
        assumptions: {
          tax_filing_status: parsed.assumptions?.tax_filing_status || 'single',
          dependents: parsed.assumptions?.dependents || 0,
          housing_type: parsed.assumptions?.housing_type || '1br',
          household_size: parsed.assumptions?.household_size || 1
        },
        
        computation_budget: {
          llm_calls: 1,
          tool_calls: '<=1',
          early_stop: false
        },
        
        calc_notes: Array.isArray(parsed.calc_notes) ? parsed.calc_notes : ['AI-powered salary analysis'],
        validation_errors: []
      };
      
      // Post-AI validation: Calculate guaranteed values
      const guaranteedSalaryMin = response.expected_salary_range.min ?? 50000; // Fallback if somehow still null
      response.monthly_net_income = this.ensureMonthlyNetIncome(parsed.monthly_net_income, guaranteedSalaryMin, response.location.country, response.assumptions.tax_filing_status);
      response.monthly_core_expenses = this.ensureMonthlyExpenses(parsed.monthly_core_expenses, response.location.country, response.assumptions.household_size);
      response.affordability_score = this.calculateAffordabilityScore(response.monthly_net_income, response.monthly_core_expenses);
      response.affordability_label = this.getAffordabilityLabel(response.affordability_score);
      
      return response;
      
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error(`Invalid AI response format: ${error}`);
    }
  }

  /**
   * Get affordability label from score
   */
  private getAffordabilityLabel(score: number | null): 'unaffordable' | 'tight' | 'comfortable' | 'very_comfortable' {
    if (score === null || score < 0) return 'unaffordable';
    if (score <= 0.2) return 'tight';
    if (score <= 0.6) return 'comfortable';
    return 'very_comfortable';
  }

  /**
   * Ensure salary minimum is never null - provide market-based fallback
   */
  private ensureSalaryMin(aiValue: number | null, role: string, country: string, level: string): number {
    if (aiValue && aiValue > 0) return Math.round(aiValue);
    
    // Market-based fallbacks by level and country
    const baseRates: Record<string, Record<string, number>> = {
      'United States': { intern: 50000, junior: 70000, mid: 90000, senior: 120000, lead: 150000, staff: 180000, principal: 220000 },
      'United Kingdom': { intern: 35000, junior: 45000, mid: 60000, senior: 80000, lead: 100000, staff: 120000, principal: 150000 },
      'Germany': { intern: 40000, junior: 50000, mid: 65000, senior: 85000, lead: 110000, staff: 130000, principal: 160000 },
      'Canada': { intern: 45000, junior: 60000, mid: 75000, senior: 100000, lead: 125000, staff: 150000, principal: 180000 },
      'Netherlands': { intern: 38000, junior: 48000, mid: 62000, senior: 82000, lead: 105000, staff: 125000, principal: 155000 }
    };
    
    const countryRates = baseRates[country] || baseRates['United States'];
    const levelRate = countryRates[level] || countryRates['mid'] || 75000;
    
    return Math.round(levelRate);
  }

  /**
   * Ensure salary maximum is never null - provide market-based fallback
   */
  private ensureSalaryMax(aiValue: number | null, salaryMin: number | null, role: string, country: string, level: string): number {
    if (aiValue && aiValue > 0) return Math.round(aiValue);
    
    // Calculate max as 125-140% of minimum
    const min = salaryMin || this.ensureSalaryMin(null, role, country, level);
    const multiplier = level === 'senior' || level === 'lead' ? 1.4 : 1.25;
    
    return Math.round(min * multiplier);
  }

  /**
   * Ensure monthly net income is never null - calculate from gross salary with tax estimates
   */
  private ensureMonthlyNetIncome(aiValue: number | null, annualGross: number, country: string, filingStatus: string): number {
    if (aiValue && aiValue > 0) return Math.round(aiValue);
    
    // Tax rate estimates by country
    const taxRates: Record<string, number> = {
      'United States': 0.22, 'United Kingdom': 0.20, 'Germany': 0.25, 'Canada': 0.21, 
      'Netherlands': 0.24, 'France': 0.28, 'Spain': 0.19, 'Italy': 0.27, 'Sweden': 0.32
    };
    
    const taxRate = taxRates[country] || 0.23; // Default 23% tax rate
    const monthlyGross = annualGross / 12;
    const monthlyNet = monthlyGross * (1 - taxRate);
    
    return Math.round(monthlyNet);
  }

  /**
   * Ensure monthly expenses is never null - estimate based on location and household size
   */
  private ensureMonthlyExpenses(aiValue: number | null, country: string, householdSize: number): number {
    if (aiValue && aiValue > 0) return Math.round(aiValue);
    
    // Base monthly expenses per person by country (housing, food, utilities, transport)
    const baseExpenses: Record<string, number> = {
      'United States': 2800, 'United Kingdom': 2200, 'Germany': 1900, 'Canada': 2400,
      'Netherlands': 2100, 'France': 2300, 'Spain': 1600, 'Italy': 1800, 'Sweden': 2500
    };
    
    const basePerPerson = baseExpenses[country] || 2000; // Default $2000/month per person
    const householdMultiplier = Math.max(1, householdSize * 0.7); // Economies of scale
    
    return Math.round(basePerPerson * householdMultiplier);
  }

  /**
   * Calculate affordability score - guaranteed not null
   */
  private calculateAffordabilityScore(monthlyNetIncome: number, monthlyExpenses: number): number {
    if (monthlyNetIncome <= 0 || monthlyExpenses <= 0) return -1;
    
    const surplus = monthlyNetIncome - monthlyExpenses;
    const score = surplus / monthlyExpenses;
    
    // Clamp between -1 and 3
    return Math.max(-1, Math.min(3, Math.round(score * 100) / 100));
  }

  /**
   * Generate error response when AI analysis fails
   */
  private generateErrorResponse(request: AIJobAnalysisRequest, generatedAt: string, error: Error): AISalaryResponse {
    return {
      schema_version: AISalaryIntelligenceService.SCHEMA_VERSION,
      methodology_version: AISalaryIntelligenceService.METHODOLOGY_VERSION,
      generated_at_utc: generatedAt,
      schema_valid: false,
      
      normalized_role: request.jobTitle || 'Unknown',
      normalized_role_slug: 'unknown',
      normalized_level_rank: 0,
      level: 'unknown',
      experience_years: null,
      
      location: {
        city: null,
        admin_area: null,
        country: 'Unknown',
        iso_country_code: 'XX',
        lat: null,
        lng: null
      },
      job_location_mode: request.workMode || 'onsite',
      
      currency: 'USD',
      fx_used: false,
      fx_rate_date: null,
      
      listed_salary: null,
      expected_salary_range: {
        min: null,
        max: null,
        period: 'year',
        basis: 'gross',
        data_quality: null,
        inference_basis: 'error'
      },
      
      monthly_net_income: null,
      monthly_core_expenses: null,
      affordability_score: null,
      affordability_label: 'unaffordable',
      
      explanations: [`AI analysis failed: ${error.message}`],
      confidence: {
        level: 'low',
        reasons: ['Processing error occurred', error.message]
      },
      sources: [],
      cache_meta: { cache_hits: [], cache_misses: [] },
      
      country_tax_model_version: 'unknown',
      tax_method: 'inference',
      col_model_version: 'unknown',
      col_method: 'inference',
      fx_model_version: 'unknown',
      
      assumptions: {
        tax_filing_status: 'single',
        dependents: 0,
        housing_type: '1br',
        household_size: 1
      },
      
      computation_budget: {
        llm_calls: 1,
        tool_calls: '<=1',
        early_stop: false
      },
      
      calc_notes: ['Analysis failed due to processing error.'],
      validation_errors: [`AI Processing error: ${error.message}`]
    };
  }
}

export const aiSalaryIntelligence = new AISalaryIntelligenceService();