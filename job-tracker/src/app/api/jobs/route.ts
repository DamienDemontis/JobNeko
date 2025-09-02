import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

// Validation schema for job data
const createJobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  description: z.string(),
  location: z.string().optional(),
  url: z.string().url(),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship']).default('full-time'),
  remotePolicy: z.enum(['on-site', 'remote', 'hybrid']).default('on-site'),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = createJobSchema.parse(body)
    
    // Check if company exists, create if not
    let companyId: string
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('name', validatedData.company)
      .single()
    
    if (!existingCompany) {
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: validatedData.company,
          website: body.companyWebsite || null,
          location: validatedData.location || null,
        })
        .select('id')
        .single()
      
      if (companyError || !newCompany) {
        console.error('Error creating company:', companyError)
        return NextResponse.json(
          { error: 'Failed to create company' },
          { status: 500 }
        )
      }
      
      companyId = newCompany.id
    } else {
      companyId = existingCompany.id
    }
    
    // Create job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        company_id: companyId,
        title: validatedData.title,
        description: validatedData.description,
        location: validatedData.location || null,
        job_url: validatedData.url,
        employment_type: validatedData.employmentType,
        remote_policy: validatedData.remotePolicy,
        salary_min: validatedData.salaryMin || null,
        salary_max: validatedData.salaryMax || null,
        posted_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()
    
    if (jobError) {
      console.error('Error creating job:', jobError)
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      )
    }
    
    // Create application entry with "not_applied" status
    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        job_id: job.id,
        status: 'not_applied',
      })
      .select()
      .single()
    
    if (applicationError) {
      console.error('Error creating application:', applicationError)
      return NextResponse.json(
        { error: 'Failed to create application' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      job,
      application,
    })
  } catch (error) {
    console.error('Error in jobs API:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid job data', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get user's applications with job and company data
    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        *,
        jobs (
          *,
          companies (*)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching applications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ applications })
  } catch (error) {
    console.error('Error in jobs API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}