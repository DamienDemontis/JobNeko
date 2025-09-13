import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { aiSalaryIntelligence } from '@/lib/services/ai-salary-intelligence';
import { 
  withErrorHandling, 
  AuthenticationError, 
  ValidationError 
} from '@/lib/error-handling';

// AI-Powered Salary Intelligence API - Uses OpenAI for all analysis
// No hardcoded multipliers or base salaries - everything from AI

interface SalaryIntelligenceAPIRequest {
  jobTitle: string;
  company?: string;
  location?: string;
  description?: string;
  requirements?: string;
  experienceYears?: number;
  salaryInfo?: string;
  currency?: string;
  workMode?: 'onsite' | 'hybrid' | 'remote_country' | 'remote_global';
  computationBudget?: {
    llm_calls: number;
    tool_calls: string;
    early_stop: boolean;
  };
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const startTime = performance.now();
  
  // Extract and validate token
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  // Parse request body
  let requestBody: SalaryIntelligenceAPIRequest;
  try {
    requestBody = await request.json();
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body');
  }

  // Validate required fields
  if (!requestBody.jobTitle || requestBody.jobTitle.trim().length === 0) {
    throw new ValidationError('jobTitle is required and cannot be empty');
  }

  try {
    // Generate AI-powered salary intelligence with user context
    const salaryIntelligence = await aiSalaryIntelligence.analyzeJobSalary({
      jobTitle: requestBody.jobTitle.trim(),
      company: requestBody.company?.trim(),
      location: requestBody.location?.trim(),
      description: requestBody.description?.trim(),
      requirements: requestBody.requirements?.trim(),
      experienceYears: requestBody.experienceYears,
      salaryInfo: requestBody.salaryInfo?.trim(),
      workMode: requestBody.workMode || 'onsite',
      userId: user.id
    });

    const endTime = performance.now();
    const processingTimeMs = Math.round(endTime - startTime);

    // Log processing metrics (for monitoring, not included in response)
    console.log(`AI Salary Intelligence processed in ${processingTimeMs}ms`, {
      userId: user.id,
      jobTitle: requestBody.jobTitle,
      company: requestBody.company || 'unspecified',
      location: requestBody.location || 'unspecified',
      hasDescription: !!requestBody.description,
      hasRequirements: !!requestBody.requirements,
      hasListedSalary: !!requestBody.salaryInfo,
      schemaValid: salaryIntelligence.schema_valid,
      confidenceLevel: salaryIntelligence.confidence.level,
      processingTimeMs,
      methodology: 'ai_powered'
    });

    // Return ONLY the JSON object as specified in instructions
    // No prose, no code fences, no explanations - just the JSON
    return NextResponse.json(salaryIntelligence, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache', // Ensure fresh calculations
      }
    });

  } catch (aiError) {
    console.error('AI Salary Intelligence error:', aiError);
    
    // Return a valid schema-compliant error response
    const errorResponse = {
      schema_version: '1.0.0',
      methodology_version: '2025-09-09-ai',
      generated_at_utc: new Date().toISOString(),
      schema_valid: false,
      
      normalized_role: requestBody.jobTitle,
      normalized_role_slug: 'unknown',
      normalized_level_rank: 0,
      level: 'unknown' as const,
      experience_years: null,
      
      location: {
        city: null,
        admin_area: null,
        country: 'Unknown',
        iso_country_code: 'XX',
        lat: null,
        lng: null
      },
      job_location_mode: requestBody.workMode || 'onsite' as const,
      
      currency: requestBody.currency || 'USD',
      fx_used: false,
      fx_rate_date: null,
      
      listed_salary: null,
      expected_salary_range: {
        min: null,
        max: null,
        period: 'year' as const,
        basis: 'gross' as const,
        data_quality: null,
        inference_basis: 'ai_error'
      },
      
      monthly_net_income: null,
      monthly_core_expenses: null,
      affordability_score: null,
      affordability_label: 'unaffordable' as const,
      
      explanations: [
        'AI analysis failed during processing.',
        'Unable to complete AI-powered salary analysis.'
      ],
      confidence: {
        level: 'low' as const,
        reasons: [
          'AI service error prevented analysis completion.',
          'OpenAI processing failed.'
        ]
      },
      sources: [],
      cache_meta: {
        cache_hits: [],
        cache_misses: []
      },
      
      country_tax_model_version: 'ai_analysis_v1',
      tax_method: 'inference' as const,
      col_model_version: 'ai_analysis_v1',
      col_method: 'inference' as const,
      fx_model_version: 'ai_analysis_v1',
      
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
      
      calc_notes: [
        'AI analysis failed due to processing error.',
        'Please retry the request.'
      ],
      validation_errors: [
        `AI Processing error: ${(aiError as Error).message}`
      ]
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});

// GET method not supported - this API only responds to POST
export const GET = withErrorHandling(async (request: NextRequest) => {
  return NextResponse.json({
    error: 'Method not allowed',
    message: 'Salary Intelligence API only accepts POST requests',
    expected_format: {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        jobTitle: 'string (required)',
        company: 'string (optional)',
        location: 'string (optional)',
        description: 'string (optional)',
        requirements: 'string (optional)',
        experienceYears: 'number (optional)',
        salaryInfo: 'string (optional)',
        currency: 'string (optional)',
        workMode: 'onsite | hybrid | remote_country | remote_global (optional)'
      }
    }
  }, { status: 405 });
});

// Other HTTP methods not supported
export const PUT = GET;
export const DELETE = GET;
export const PATCH = GET;