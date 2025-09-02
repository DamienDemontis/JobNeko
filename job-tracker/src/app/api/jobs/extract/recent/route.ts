import { NextRequest, NextResponse } from 'next/server'
import { jobQueue } from '@/lib/job-queue'

export async function GET(request: NextRequest) {
  try {
    // Get recent extraction jobs from the queue
    const allJobs = Array.from(jobQueue.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10) // Last 10 jobs
    
    return NextResponse.json({
      success: true,
      jobs: allJobs
    })
  } catch (error) {
    console.error('Error fetching recent jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent jobs' },
      { status: 500 }
    )
  }
}