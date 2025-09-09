import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { analyzeSalarySync, convertToUSDSync } from '@/lib/salary-intelligence';
import { 
  withErrorHandling, 
  AuthenticationError, 
  ValidationError,
  validateId 
} from '@/lib/error-handling';

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

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Validate authentication
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid or expired token');
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

    // Build comprehensive database query with proper filtering
    const whereClause: any = {
      userId: user.id,
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { company: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { skills: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.company && {
        company: { contains: query.company, mode: 'insensitive' },
      }),
      ...(workModes.length > 0 && {
        workMode: { in: workModes },
      }),
      ...(query.hasRemoteOption && {
        workMode: 'remote',
      }),
    };

    // Add database-level salary filtering when possible
    if (query.salaryMin !== undefined && query.currency === 'USD') {
      whereClause.salaryMin = { gte: query.salaryMin };
    }
    if (query.salaryMax !== undefined && query.currency === 'USD') {
      whereClause.salaryMax = { lte: query.salaryMax };
    }

    // Add experience level filtering at database level
    if (experienceLevels.length > 0) {
      const experiencePatterns = experienceLevels.flatMap(level => {
        switch (level) {
          case 'entry': return ['entry', 'junior', 'graduate', 'intern'];
          case 'mid': return ['mid', 'intermediate'];
          case 'senior': return ['senior', 'lead'];
          case 'lead': return ['lead', 'principal', 'architect'];
          case 'principal': return ['principal', 'staff', 'distinguished'];
          case 'executive': return ['director', 'vp', 'cto', 'head of'];
          default: return [];
        }
      });

      if (experiencePatterns.length > 0) {
        whereClause.OR = whereClause.OR || [];
        whereClause.OR.push(...experiencePatterns.map(pattern => ({
          OR: [
            { title: { contains: pattern, mode: 'insensitive' } },
            { description: { contains: pattern, mode: 'insensitive' } },
            { requirements: { contains: pattern, mode: 'insensitive' } },
          ]
        })));
      }
    }

    // Get initial count for pagination
    const totalCount = await prisma.job.count({ where: whereClause });

    // Build order by clause
    let orderBy: any = {};
    switch (query.sortBy) {
      case 'matchScore':
        orderBy = { matchScore: query.order || 'desc' };
        break;
      case 'rating':
        // This requires a more complex query with joins, fallback to date for now
        orderBy = { createdAt: query.order || 'desc' };
        break;
      case 'createdAt':
      default:
        orderBy = { createdAt: query.order || 'desc' };
        break;
    }

    // Execute optimized database query
    const jobs = await prisma.job.findMany({
      where: whereClause,
      include: {
        ratings: {
          where: { userId: user.id },
          select: { rating: true },
        },
      },
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    // Enhance jobs with salary analysis only for returned results
    let filteredJobs = jobs.map(job => {
      const salaryAnalysis = analyzeSalarySync(job.salary ?? undefined, job.location ?? undefined);
      return {
        ...job,
        rating: job.ratings[0]?.rating || null,
        ratings: undefined,
        salaryAnalysis,
      };
    });

    // Apply remaining client-side filters that couldn't be done at DB level
    if (comfortLevels.length > 0) {
      filteredJobs = filteredJobs.filter(job => 
        job.salaryAnalysis && comfortLevels.includes(job.salaryAnalysis.comfortLevel)
      );
    }

    // Apply complex salary filtering for non-USD currencies
    if ((query.salaryMin !== undefined || query.salaryMax !== undefined) && query.currency !== 'USD') {
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

    // Apply company size filtering (client-side for complex pattern matching)
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

    // Apply comfort score sorting if requested
    if (query.sortBy === 'comfortScore') {
      filteredJobs.sort((a, b) => {
        const aScore = a.salaryAnalysis?.comfortScore || 0;
        const bScore = b.salaryAnalysis?.comfortScore || 0;
        return query.order === 'asc' ? aScore - bScore : bScore - aScore;
      });
    }

    // Calculate final count after client-side filtering
    const finalTotal = filteredJobs.length;
    
    // For client-side filtered results, apply pagination
    let paginatedJobs = filteredJobs;
    let actualTotal = totalCount;
    
    // If we had to apply client-side filters that changed the count significantly,
    // we need to handle pagination differently
    if (comfortLevels.length > 0 || companySizes.length > 0 || 
        (query.currency !== 'USD' && (query.salaryMin !== undefined || query.salaryMax !== undefined))) {
      // Client-side pagination for complex filters
      const startIndex = (query.page - 1) * query.limit;
      paginatedJobs = filteredJobs.slice(startIndex, startIndex + query.limit);
      actualTotal = finalTotal;
    }

  return NextResponse.json({
    jobs: paginatedJobs,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: actualTotal,
      totalPages: Math.ceil(actualTotal / query.limit),
    },
  });
});

// Delete a job
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('id');

  if (!jobId) {
    throw new ValidationError('Job ID is required');
  }

  validateId(jobId, 'Job ID');

  // Verify ownership and delete
  const job = await prisma.job.deleteMany({
    where: {
      id: jobId,
      userId: user.id,
    },
  });

  if (job.count === 0) {
    throw new ValidationError('Job not found or you do not have permission to delete it');
  }

  return NextResponse.json({ message: 'Job deleted successfully' });
});