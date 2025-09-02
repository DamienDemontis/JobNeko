// Async job extraction endpoint - immediately returns and processes in background
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

import { jobQueue } from '@/lib/job-queue'

// Input validation
const extractRequestSchema = z.object({
  url: z.string().url()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = extractRequestSchema.parse(body)
    
    // Generate a unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    // Store initial status
    jobQueue.set(jobId, {
      id: jobId,
      url: url,
      status: 'queued',
      createdAt: new Date().toISOString(),
      result: null,
      error: null
    })
    
    // Process in background (don't await)
    processJobExtraction(jobId, url)
    
    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      jobId: jobId,
      status: 'queued',
      message: 'Job extraction started',
      statusUrl: `/api/jobs/extract/${jobId}`
    })
    
  } catch (error) {
    console.error('Extract request error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid URL provided', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to start extraction' },
      { status: 500 }
    )
  }
}

// Background processing function
async function processJobExtraction(jobId: string, url: string) {
  try {
    // Update status to processing
    jobQueue.set(jobId, {
      ...jobQueue.get(jobId),
      status: 'processing',
      startedAt: new Date().toISOString()
    })
    
    // Call the extraction API
    const extractionResponse = await fetch('http://localhost:5679/extract-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    })
    
    if (!extractionResponse.ok) {
      throw new Error('Extraction failed')
    }
    
    const extractionResult = await extractionResponse.json()
    
    if (!extractionResult.success) {
      throw new Error(extractionResult.error || 'Extraction failed')
    }
    
    // Save to database
    const jobData = extractionResult.data
    
    // Get or create user
    let userId = '00000000-0000-0000-0000-000000000000'
    const { data: users } = await supabase.from('users').select('id').limit(1)
    if (users && users.length > 0) {
      userId = users[0].id
    }
    
    // Get or create company
    let companyId: string
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('name', jobData.company)
      .single()
    
    if (!existingCompany) {
      // Try to create company with retry logic
      let retryCount = 0;
      let newCompany = null;
      
      while (!newCompany && retryCount < 3) {
        const companyName = retryCount > 0 ? `${jobData.company}_${retryCount}` : jobData.company;
        
        const { data, error } = await supabase
          .from('companies')
          .insert({
            name: companyName,
            location: jobData.location
          })
          .select()
          .single()
        
        if (data) {
          newCompany = data;
        } else {
          console.log(`Company creation attempt ${retryCount + 1} failed:`, error?.message);
          retryCount++;
        }
      }
      
      companyId = newCompany?.id || 'unknown-company'
    } else {
      companyId = existingCompany.id
    }
    
    // Create job
    const { data: job } = await supabase
      .from('jobs')
      .insert({
        company_id: companyId,
        title: jobData.title,
        description: jobData.description || '',
        location: jobData.location,
        external_url: jobData.url,
        employment_type: jobData.employmentType || 'full-time',
        remote_policy: jobData.remotePolicy || 'on-site'
      })
      .select()
      .single()
    
    // Create application
    if (job) {
      await supabase
        .from('applications')
        .insert({
          user_id: userId,
          job_id: job.id,
          status: 'saved',
          notes: `Auto-extracted from: ${url}`
        })
    }
    
    // Update status to completed
    jobQueue.set(jobId, {
      ...jobQueue.get(jobId),
      status: 'completed',
      completedAt: new Date().toISOString(),
      result: {
        job: job,
        extractedData: jobData
      }
    })
    
  } catch (error: unknown) {
    console.error('Job processing error:', error)
    
    // Update status to failed
    jobQueue.set(jobId, {
      ...jobQueue.get(jobId),
      status: 'failed',
      failedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

