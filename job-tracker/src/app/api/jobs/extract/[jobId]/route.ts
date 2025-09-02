// Dynamic route for checking job extraction status
import { NextRequest, NextResponse } from 'next/server'

import { jobQueue } from '@/lib/job-queue'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    
    if (!jobId || !jobQueue.has(jobId)) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }
    
    const job = jobQueue.get(jobId)
    
    return NextResponse.json({
      success: true,
      job: job
    })
    
  } catch (error) {
    console.error('Error fetching job status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

