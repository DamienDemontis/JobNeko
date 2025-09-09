import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';

// Force this API route to use Node.js runtime instead of Edge Runtime
export const runtime = 'nodejs';

const updateSchema = z.object({
  // Basic job information
  title: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  contractType: z.string().optional(),
  workMode: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  skills: z.string().optional(),
  perks: z.string().optional(),
  url: z.string().url().optional(),
  
  // Application tracking
  applicationStatus: z.enum([
    'not_applied', 'applied', 'phone_screening', 'phone_screening_completed', 
    'technical_assessment', 'first_interview', 'second_interview', 'final_interview',
    'reference_check', 'offer_extended', 'offer_accepted', 'offer_rejected', 
    'application_rejected', 'withdrawn'
  ]).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  notes: z.string().optional(),
  privateNotes: z.string().optional(),
  companyResearch: z.string().optional(),
  preparationNotes: z.string().optional(),
  recruiterName: z.string().optional(),
  recruiterEmail: z.string().optional(),
  recruiterPhone: z.string().optional(),
  companyContact: z.string().optional(),
  appliedAt: z.string().datetime().optional(),
  applicationDeadline: z.string().datetime().optional(),
  phoneScreeningAt: z.string().datetime().optional(),
  firstInterviewAt: z.string().datetime().optional(),
  secondInterviewAt: z.string().datetime().optional(),
  finalInterviewAt: z.string().datetime().optional(),
  offerReceivedAt: z.string().datetime().optional(),
  followUpDate: z.string().datetime().optional(),
  rejectionFeedback: z.string().optional(),
});

// Get single job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check both header and cookie for token
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const cookieToken = request.cookies.get('token')?.value;
    const token = authHeader || cookieToken;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const resolvedParams = await params;
    const job = await prisma.job.findFirst({
      where: {
        id: resolvedParams.id,
        userId: user.id,
      },
      include: {
        ratings: {
          where: { userId: user.id },
          select: { rating: true },
        },
        activities: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const formattedJob = {
      ...job,
      rating: job.ratings[0]?.rating || null,
      ratings: undefined,
    };

    return NextResponse.json({ job: formattedJob });
  } catch (error) {
    console.error('Get job error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

// Update job
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check both header and cookie for token
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const cookieToken = request.cookies.get('token')?.value;
    const token = authHeader || cookieToken;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const resolvedParams = await params;
    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    // Convert string dates to Date objects
    const updates: any = { ...validatedData };
    const dateFields = [
      'appliedAt', 'applicationDeadline', 'phoneScreeningAt', 'firstInterviewAt',
      'secondInterviewAt', 'finalInterviewAt', 'offerReceivedAt', 'followUpDate'
    ];

    dateFields.forEach(field => {
      if (updates[field]) {
        updates[field] = new Date(updates[field]);
      }
    });

    const job = await prisma.job.updateMany({
      where: {
        id: resolvedParams.id,
        userId: user.id,
      },
      data: updates,
    });

    if (job.count === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Create activity log for status changes
    if (validatedData.applicationStatus) {
      await prisma.jobActivity.create({
        data: {
          jobId: resolvedParams.id,
          userId: user.id,
          type: 'status_change',
          title: `Status changed to ${validatedData.applicationStatus.replace('_', ' ')}`,
          description: `Application status updated to: ${validatedData.applicationStatus.replace('_', ' ')}`,
        },
      });
    }

    const updatedJob = await prisma.job.findUnique({
      where: { id: resolvedParams.id },
      include: {
        activities: {
          orderBy: { date: 'desc' },
        },
      },
    });

    return NextResponse.json({ job: updatedJob });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update job error:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

// Delete job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check both header and cookie for token
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const cookieToken = request.cookies.get('token')?.value;
    const token = authHeader || cookieToken;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const resolvedParams = await params;
    const job = await prisma.job.deleteMany({
      where: {
        id: resolvedParams.id,
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