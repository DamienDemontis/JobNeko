-- Enhanced Job Tracking Fields Migration

-- Update application status enum to match component expectations
ALTER TYPE application_status RENAME TO application_status_old;
CREATE TYPE application_status AS ENUM ('saved', 'applied', 'first-contact', 'interviewing', 'offer', 'rejected');

-- Create job level and priority enums
CREATE TYPE job_level AS ENUM ('entry', 'mid', 'senior', 'lead', 'principal', 'director');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE company_size AS ENUM ('startup', 'small', 'medium', 'large', 'enterprise');

-- Add new fields to jobs table
ALTER TABLE public.jobs 
ADD COLUMN currency TEXT DEFAULT 'USD',
ADD COLUMN job_level job_level,
ADD COLUMN tech_stack TEXT[],
ADD COLUMN industry TEXT,
ADD COLUMN external_url TEXT;

-- Copy job_url to external_url and make it required
UPDATE public.jobs SET external_url = job_url WHERE job_url IS NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN external_url SET NOT NULL;

-- Add new fields to companies table
ALTER TABLE public.companies 
ADD COLUMN size company_size;

-- Add new fields to applications table
ALTER TABLE public.applications 
ADD COLUMN priority priority_level DEFAULT 'medium',
ADD COLUMN applied_at TIMESTAMPTZ,
ADD COLUMN deadline DATE;

-- Update applications status column to use new enum
ALTER TABLE public.applications 
ALTER COLUMN status DROP DEFAULT;

-- Convert old status values to new ones
UPDATE public.applications 
SET status = CASE 
    WHEN status::text = 'not_applied' THEN 'saved'
    WHEN status::text = 'applied' THEN 'applied'
    WHEN status::text = 'phone_screen' THEN 'first-contact'
    WHEN status::text = 'interview' THEN 'interviewing'
    WHEN status::text = 'offer' THEN 'offer'
    WHEN status::text = 'rejected' THEN 'rejected'
    ELSE 'saved'
END::application_status;

-- Set new default
ALTER TABLE public.applications 
ALTER COLUMN status SET DEFAULT 'saved'::application_status;

-- Drop old enum
DROP TYPE application_status_old;

-- Update application_status_history table
ALTER TABLE public.application_status_history 
ALTER COLUMN status TYPE application_status USING status::text::application_status;

-- Create new indexes for performance
CREATE INDEX idx_jobs_job_level ON public.jobs(job_level);
CREATE INDEX idx_jobs_industry ON public.jobs(industry);
CREATE INDEX idx_jobs_tech_stack ON public.jobs USING GIN(tech_stack);
CREATE INDEX idx_applications_priority ON public.applications(priority);
CREATE INDEX idx_applications_applied_at ON public.applications(applied_at DESC);
CREATE INDEX idx_applications_deadline ON public.applications(deadline);
CREATE INDEX idx_companies_size ON public.companies(size);

-- Add some sample data to test the new fields
INSERT INTO public.companies (name, industry, size, website) VALUES 
('Tech Startup Inc.', 'Technology', 'startup', 'https://techstartup.com'),
('Global Enterprise Corp.', 'Finance', 'enterprise', 'https://globalcorp.com')
ON CONFLICT (lower(name)) DO NOTHING;