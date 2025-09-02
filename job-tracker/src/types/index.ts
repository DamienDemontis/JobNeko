import { Database } from './database'

export type User = Database['public']['Tables']['users']['Row']
export type Company = Database['public']['Tables']['companies']['Row']
export type Job = Database['public']['Tables']['jobs']['Row']
export type Application = Database['public']['Tables']['applications']['Row']
export type ApplicationStatusHistory = Database['public']['Tables']['application_status_history']['Row']

export type JobWithCompany = Job & {
  companies: Company
}

export type ApplicationWithJob = Application & {
  jobs: JobWithCompany
}

export type ApplicationStatus = Application['status']
export type EmploymentType = Job['employment_type']
export type RemotePolicy = Job['remote_policy']

export interface CreateJobData {
  title: string
  company_name: string
  description: string
  requirements?: string
  salary_min?: number
  salary_max?: number
  location?: string
  employment_type: EmploymentType
  remote_policy: RemotePolicy
  job_url: string
  posted_date?: string
  company_website?: string
  company_description?: string
  company_industry?: string
}

export interface CreateApplicationData {
  job_id: string
  status?: ApplicationStatus
  applied_date?: string
  notes?: string
}