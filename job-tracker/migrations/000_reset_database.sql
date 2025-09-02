-- Reset Database Script
-- Run this FIRST to clean up any existing data

-- Drop all policies first (to avoid dependency issues)
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

DROP POLICY IF EXISTS "Anyone can read companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON public.companies;

DROP POLICY IF EXISTS "Anyone can read jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON public.jobs;

DROP POLICY IF EXISTS "Users can read own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can create own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can delete own applications" ON public.applications;

DROP POLICY IF EXISTS "Users can read own application history" ON public.application_status_history;
DROP POLICY IF EXISTS "Users can create application history for own applications" ON public.application_status_history;

-- Drop triggers
DROP TRIGGER IF EXISTS create_application_status_history_trigger ON public.applications;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
DROP TRIGGER IF EXISTS update_applications_updated_at ON public.applications;

-- Drop functions
DROP FUNCTION IF EXISTS public.create_application_status_history();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS public.application_status_history CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS public.application_status CASCADE;
DROP TYPE IF EXISTS public.remote_policy CASCADE;
DROP TYPE IF EXISTS public.employment_type CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_jobs_company_id;
DROP INDEX IF EXISTS idx_jobs_created_at;
DROP INDEX IF EXISTS idx_applications_user_id;
DROP INDEX IF EXISTS idx_applications_job_id;
DROP INDEX IF EXISTS idx_applications_status;
DROP INDEX IF EXISTS idx_applications_created_at;
DROP INDEX IF EXISTS idx_application_status_history_application_id;
DROP INDEX IF EXISTS idx_application_status_history_changed_at;
DROP INDEX IF EXISTS idx_companies_name_unique;

-- Success message
SELECT 'Database reset completed. You can now run the migration scripts.' as message;