# Database Migrations

This directory contains the database migration files for the Job Tracker Platform.

## Migration Files

1. **001_initial_schema.sql** - Creates the core database schema with tables for users, companies, jobs, applications, and application status history
2. **002_rls_policies.sql** - Sets up Row Level Security policies for data protection and access control

## How to Apply Migrations

### Using Supabase CLI (Recommended)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-id
   ```

4. Apply migrations:
   ```bash
   supabase db reset
   ```

### Manual Application

You can also run these SQL files directly in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste each migration file in order (001, 002)
4. Execute each file

## Schema Overview

### Tables

- **users** - User profiles (extends auth.users)
- **companies** - Company information
- **jobs** - Job postings with detailed information
- **applications** - User job applications with status tracking
- **application_status_history** - Timeline of application status changes

### Key Features

- **Row Level Security (RLS)** enabled on all tables
- **Automatic triggers** for updated_at timestamps
- **Status history tracking** for application changes
- **User registration handling** with automatic profile creation
- **Proper indexing** for optimal query performance

### Security

- Users can only access their own applications and history
- Public read access to companies and jobs
- Authenticated users can create companies and jobs
- All sensitive data is protected with RLS policies

## Environment Variables

Make sure to set up your environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```