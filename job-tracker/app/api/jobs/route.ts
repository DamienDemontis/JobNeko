import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { analyzeSalarySync, convertToUSDSync } from '@/lib/salary-intelligence';

const querySchema = z.object({
  search: z.string().optional(),
  company: z.string().optional(),
  workMode: z.string().optional(), // Can be multiple values separated by comma
  comfortLevel: z.string().optional(), // Can be multiple values separated by comma  
  experienceLevel: z.string().optional(), // Can be multiple values separated by comma
  companySize: z.string().optional(), // Can be multiple values separated by comma
  salaryMin: z.coerce.number().optional(),
  salaryMax: z.coerce.number().optional(),
  currency: z.string().optional(),
  hasRemoteOption: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'matchScore', 'rating', 'comfortScore']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse query parameters - handle multiple values for arrays
    const searchParams = request.nextUrl.searchParams;
    const queryParams: Record<string, any> = {};
    
    // Handle array parameters
    const workModes = searchParams.getAll('workMode');
    const comfortLevels = searchParams.getAll('comfortLevel');
    const experienceLevels = searchParams.getAll('experienceLevel');
    const companySizes = searchParams.getAll('companySize');
    
    // Single value parameters
    for (const [key, value] of searchParams.entries()) {
      if (!['workMode', 'comfortLevel', 'experienceLevel', 'companySize'].includes(key)) {
        queryParams[key] = value;
      }
    }
    
    const query = querySchema.parse(queryParams);

    // Get all jobs first to apply client-side filtering for salary analysis
    const allJobs = await prisma.job.findMany({
      where: {
        userId: user.id,
        ...(query.search && {
          OR: [
            { title: { contains: query.search } },
            { company: { contains: query.search } },
            { description: { contains: query.search } },
            { skills: { contains: query.search } },
          ],
        }),
        ...(query.company && {
          company: { contains: query.company },
        }),
        ...(workModes.length > 0 && {
          workMode: { in: workModes },
        }),
        ...(query.hasRemoteOption && {
          workMode: 'remote',
        }),
      },
      include: {
        ratings: {
          where: { userId: user.id },
          select: { rating: true },
        },
      },
    });

    // Enhance jobs with salary analysis and apply advanced filters
    let filteredJobs = allJobs.map(job => {
      const salaryAnalysis = analyzeSalarySync(job.salary ?? undefined, job.location ?? undefined);
      return {
        ...job,
        rating: job.ratings[0]?.rating || null,
        ratings: undefined,
        salaryAnalysis,
      };
    });

    // Apply salary-based filters
    if (comfortLevels.length > 0) {
      filteredJobs = filteredJobs.filter(job => 
        job.salaryAnalysis && comfortLevels.includes(job.salaryAnalysis.comfortLevel)
      );
    }

    if (query.salaryMin !== undefined || query.salaryMax !== undefined) {
      const currency = query.currency || 'USD';
      filteredJobs = filteredJobs.filter(job => {
        if (!job.salaryAnalysis) return true;
        
        const minUSD = job.salaryAnalysis.normalizedSalaryUSD.min;
        const maxUSD = job.salaryAnalysis.normalizedSalaryUSD.max;
        
        let passesMin = true;
        let passesMax = true;
        
        if (query.salaryMin !== undefined) {
          const minThreshold = convertToUSDSync(query.salaryMin, currency);
          passesMin = maxUSD >= minThreshold;
        }
        
        if (query.salaryMax !== undefined) {
          const maxThreshold = convertToUSDSync(query.salaryMax, currency);
          passesMax = minUSD <= maxThreshold;
        }
        
        return passesMin && passesMax;
      });
    }

    // Apply experience level filtering (basic pattern matching)
    if (experienceLevels.length > 0) {
      filteredJobs = filteredJobs.filter(job => {
        const titleLower = job.title.toLowerCase();
        const descLower = (job.description || '').toLowerCase();
        const reqsLower = (job.requirements || '').toLowerCase();
        const text = `${titleLower} ${descLower} ${reqsLower}`;
        
        return experienceLevels.some(level => {
          switch (level) {
            case 'entry':
              return text.includes('entry') || text.includes('junior') || text.includes('graduate') || text.includes('intern');
            case 'mid':
              return text.includes('mid') || text.includes('intermediate') || (text.includes('2') && text.includes('year')) || (text.includes('3') && text.includes('year'));
            case 'senior':
              return text.includes('senior') || (text.includes('5') && text.includes('year')) || text.includes('lead');
            case 'lead':
              return text.includes('lead') || text.includes('principal') || text.includes('architect');
            case 'principal':
              return text.includes('principal') || text.includes('staff') || text.includes('distinguished');
            case 'executive':
              return text.includes('director') || text.includes('vp') || text.includes('cto') || text.includes('head of');
            default:
              return true;
          }
        });
      });
    }

    // Apply company size filtering (basic pattern matching)
    if (companySizes.length > 0) {
      filteredJobs = filteredJobs.filter(job => {
        const company = job.company.toLowerCase();
        const desc = (job.description || '').toLowerCase();
        
        return companySizes.some(size => {
          switch (size) {
            case 'startup':
              return desc.includes('startup') || desc.includes('early stage') || desc.includes('seed');
            case 'small':
              return desc.includes('small team') || desc.includes('boutique') || desc.includes('<50');
            case 'medium':
              return desc.includes('growing') || desc.includes('scale') || desc.includes('50-200');
            case 'large':
              return desc.includes('established') || desc.includes('200+') || desc.includes('enterprise');
            case 'enterprise':
              return desc.includes('enterprise') || desc.includes('fortune') || desc.includes('global') || 
                     ['google', 'microsoft', 'amazon', 'apple', 'meta', 'netflix', 'tesla', 'uber', 'airbnb'].some(bigTech => company.includes(bigTech));
            default:
              return true;
          }
        });
      });
    }

    // Sort results
    filteredJobs.sort((a, b) => {
      const order = query.order === 'asc' ? 1 : -1;
      
      switch (query.sortBy) {
        case 'matchScore':
          return order * ((b.matchScore || 0) - (a.matchScore || 0));
        case 'rating':
          return order * ((b.rating || 0) - (a.rating || 0));
        case 'comfortScore':
          const aScore = a.salaryAnalysis?.comfortScore || 0;
          const bScore = b.salaryAnalysis?.comfortScore || 0;
          return order * (bScore - aScore);
        case 'createdAt':
        default:
          return order * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    });

    // Apply pagination
    const total = filteredJobs.length;
    const startIndex = (query.page - 1) * query.limit;
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + query.limit);

    return NextResponse.json({
      jobs: paginatedJobs,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Get jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// Delete a job
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Verify ownership and delete
    const job = await prisma.job.deleteMany({
      where: {
        id: jobId,
        userId: user.id,
      },
    });

    if (job.count === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}