// Public endpoint for Chrome extension to save jobs
// This bypasses authentication for development
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// For development, we'll use the anon key with a workaround
// In production, you should use SUPABASE_SERVICE_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Validation schema for job data
const createJobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  url: z.string().url().optional().nullable(),
  employmentType: z.string().optional().nullable(),
  remotePolicy: z.string().optional().nullable(),
  salary: z.string().optional().nullable(),
  salaryMin: z.number().optional().nullable(),
  salaryMax: z.number().optional().nullable(),
  extractedAt: z.string().optional(),
  source: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    console.log('Received job data:', body)
    
    const validatedData = createJobSchema.parse(body)
    
    // For development, we'll use a hardcoded user ID or create one via auth
    let userId = null
    
    // Try to get existing users first
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    if (users && users.length > 0) {
      userId = users[0].id
    } else {
      // Try to create a user via auth (which bypasses RLS)
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: 'demo@jobtracker.com',
          password: 'DemoPassword123!',
        })
        
        if (authData?.user) {
          userId = authData.user.id
          
          // Create user profile
          await supabase
            .from('users')
            .insert({
              id: userId,
              email: 'demo@jobtracker.com',
              full_name: 'Demo User'
            })
        }
      } catch (e) {
        console.log('Could not create demo user, continuing anyway')
      }
    }
    
    // If still no user, we'll just use a placeholder ID
    if (!userId) {
      // Use a deterministic UUID for development
      userId = '00000000-0000-0000-0000-000000000000'
    }
    
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
        .select()
        .single()
      
      if (companyError) {
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
    
    // Create the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        company_id: companyId,
        title: validatedData.title,
        description: validatedData.description || '',
        location: validatedData.location || null,
        external_url: validatedData.url || null,
        employment_type: validatedData.employmentType || 'full-time',
        remote_policy: validatedData.remotePolicy || 'on-site',
        salary_min: validatedData.salaryMin || null,
        salary_max: validatedData.salaryMax || null,
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
    
    // Create an application for this job (with status 'saved')
    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .insert({
        user_id: userId,
        job_id: job.id,
        status: 'saved',
        notes: `Extracted from: ${validatedData.url || 'Chrome Extension'}`
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
      message: 'Job saved successfully!'
    })
    
  } catch (error) {
    console.error('Error in public jobs API:', error)
    
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

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}