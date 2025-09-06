import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';

const querySchema = z.object({
  search: z.string().optional(),
  company: z.string().optional(),
  workMode: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  minSalary: z.coerce.number().optional(),
  maxSalary: z.coerce.number().optional(),
  sortBy: z.enum(['createdAt', 'matchScore', 'rating']).optional(),
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

    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = querySchema.parse(searchParams);

    // Build where clause
    const where: Record<string, any> = {
      userId: user.id,
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { company: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.company) {
      where.company = { contains: query.company, mode: 'insensitive' };
    }

    if (query.workMode) {
      where.workMode = query.workMode;
    }

    if (query.minSalary !== undefined) {
      where.salaryMin = { gte: query.minSalary };
    }

    if (query.maxSalary !== undefined) {
      where.salaryMax = { lte: query.maxSalary };
    }

    // Build order by
    const orderBy: Record<string, any> = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.order || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    // Get total count
    const total = await prisma.job.count({ where });

    // Get jobs with pagination
    const jobs = await prisma.job.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        ratings: {
          where: { userId: user.id },
          select: { rating: true },
        },
      },
    });

    // Format response
    const formattedJobs = jobs.map(job => ({
      ...job,
      rating: job.ratings[0]?.rating || null,
      ratings: undefined,
    }));

    return NextResponse.json({
      jobs: formattedJobs,
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