import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { aiSalaryIntelligence } from '@/lib/services/ai-salary-intelligence';
import { 
  withErrorHandling, 
  AuthenticationError, 
  NotFoundError, 
  validateId 
} from '@/lib/error-handling';

interface SimpleSalaryAnalysis {
  jobId: string;
  hasListedSalary: boolean;
  
  // AI-powered analysis
  analysis: {
    normalizedRole: string;
    experienceLevel: string;
    location: {
      city: string | null;
      country: string;
    };
    salaryRange: {
      min: number | null;
      max: number | null;
      currency: string;
      period: string;
    };
    monthlyNetIncome: number | null;
    monthlyCoreExpenses: number | null;
    affordabilityScore: number | null;
    affordabilityLabel: string;
    insights: string[];
  };
  
  confidence: {
    level: 'low' | 'medium' | 'high';
    reasons: string[];
  };
  
  metadata: {
    methodology: 'ai_powered';
    aiModel: 'openai-gpt-3.5-turbo';
    processedAt: string;
  };
}

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Validate authentication
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  // Validate job ID
  const resolvedParams = await params;
  validateId(resolvedParams.id, 'Job ID');
  const jobId = resolvedParams.id;

  // Fetch job
  const job = await prisma.job.findUnique({
    where: { id: jobId, userId: user.id },
  });

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  try {
    // Use AI for comprehensive salary analysis
    const aiResult = await aiSalaryIntelligence.analyzeJobSalary({
      jobTitle: job.title,
      company: job.company || undefined,
      location: job.location || undefined,
      description: job.description || undefined,
      requirements: job.requirements || undefined,
      salaryInfo: job.salary || undefined,
      workMode: (job.workMode as 'onsite' | 'hybrid' | 'remote_country' | 'remote_global') || 'onsite',
      userId: user.id
    });

    // Build simplified analysis response
    const analysis: SimpleSalaryAnalysis = {
      jobId: job.id,
      hasListedSalary: !!(job.salary || aiResult.listed_salary),
      
      analysis: {
        normalizedRole: aiResult.normalized_role,
        experienceLevel: aiResult.level,
        location: {
          city: aiResult.location.city,
          country: aiResult.location.country
        },
        salaryRange: {
          min: aiResult.expected_salary_range.min,
          max: aiResult.expected_salary_range.max,
          currency: aiResult.currency,
          period: aiResult.expected_salary_range.period
        },
        monthlyNetIncome: aiResult.monthly_net_income,
        monthlyCoreExpenses: aiResult.monthly_core_expenses,
        affordabilityScore: aiResult.affordability_score,
        affordabilityLabel: aiResult.affordability_label,
        insights: aiResult.explanations
      },
      
      confidence: {
        level: aiResult.confidence.level,
        reasons: aiResult.confidence.reasons
      },
      
      metadata: {
        methodology: 'ai_powered',
        aiModel: 'openai-gpt-3.5-turbo',
        processedAt: new Date().toISOString()
      }
    };

    // Log successful analysis
    console.log(`AI Simple Salary Analysis completed for job ${jobId}`, {
      userId: user.id,
      jobTitle: job.title,
      hasListedSalary: analysis.hasListedSalary,
      confidenceLevel: analysis.confidence.level,
      methodology: 'ai_powered'
    });

    return NextResponse.json(analysis, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error(`Simple salary analysis failed for job ${jobId}:`, error);
    
    // Return error response
    const errorAnalysis: SimpleSalaryAnalysis = {
      jobId: job.id,
      hasListedSalary: !!job.salary,
      
      analysis: {
        normalizedRole: job.title,
        experienceLevel: 'unknown',
        location: {
          city: null,
          country: 'Unknown'
        },
        salaryRange: {
          min: null,
          max: null,
          currency: 'USD',
          period: 'year'
        },
        monthlyNetIncome: null,
        monthlyCoreExpenses: null,
        affordabilityScore: null,
        affordabilityLabel: 'unaffordable',
        insights: [`AI analysis failed: ${(error as Error).message}`]
      },
      
      confidence: {
        level: 'low',
        reasons: ['AI processing error occurred']
      },
      
      metadata: {
        methodology: 'ai_powered',
        aiModel: 'openai-gpt-3.5-turbo',
        processedAt: new Date().toISOString()
      }
    };

    return NextResponse.json(errorAnalysis, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});