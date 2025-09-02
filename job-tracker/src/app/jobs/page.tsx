import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { JobsManagement } from '@/components/jobs/jobs-management'

async function getJobsWithApplications(supabase: any, userId: string) {
  try {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        description,
        location,
        employment_type,
        remote_policy,
        salary_min,
        salary_max,
        currency,
        job_level,
        tech_stack,
        industry,
        external_url,
        created_at,
        companies (
          id,
          name,
          size,
          industry as company_industry,
          website,
          logo_url
        ),
        applications!inner (
          id,
          status,
          priority,
          notes,
          applied_at,
          deadline,
          created_at,
          updated_at,
          user_id
        )
      `)
      .eq('applications.user_id', userId)
      .order('applications.updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching jobs:', error)
      return []
    }

    return jobs || []
  } catch (error) {
    console.error('Error in getJobsWithApplications:', error)
    return []
  }
}

async function getJobsStats(supabase: any, userId: string) {
  try {
    const { data: applications } = await supabase
      .from('applications')
      .select('status, priority, created_at')
      .eq('user_id', userId)

    const stats = {
      total: applications?.length || 0,
      saved: applications?.filter(a => a.status === 'saved').length || 0,
      applied: applications?.filter(a => a.status === 'applied').length || 0,
      inProgress: applications?.filter(a => ['first-contact', 'interviewing'].includes(a.status)).length || 0,
      offers: applications?.filter(a => a.status === 'offer').length || 0,
      rejected: applications?.filter(a => a.status === 'rejected').length || 0,
      priority: applications?.filter(a => a.priority === 'high').length || 0,
      thisWeek: applications?.filter(a => {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return new Date(a.created_at) > weekAgo
      }).length || 0
    }

    return stats
  } catch (error) {
    console.error('Error fetching job stats:', error)
    return { total: 0, saved: 0, applied: 0, inProgress: 0, offers: 0, rejected: 0, priority: 0, thisWeek: 0 }
  }
}

export default async function JobsPage() {
  const supabase = await createServerSupabaseClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const [jobs, stats] = await Promise.all([
    getJobsWithApplications(supabase, user.id),
    getJobsStats(supabase, user.id)
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <a
                    href="/dashboard"
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    ← Dashboard
                  </a>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Job Applications</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage and track all your job applications in one place
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  <span className="font-medium text-blue-600">{stats.total}</span> total applications
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{stats.saved}</div>
            <div className="text-sm text-gray-500">Saved</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-green-600">{stats.applied}</div>
            <div className="text-sm text-gray-500">Applied</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-purple-600">{stats.offers}</div>
            <div className="text-sm text-gray-500">Offers</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-500">Rejected</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-orange-600">{stats.priority}</div>
            <div className="text-sm text-gray-500">Priority</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-indigo-600">{stats.thisWeek}</div>
            <div className="text-sm text-gray-500">This Week</div>
          </div>
        </div>

        {/* Jobs Management Component */}
        <JobsManagement initialJobs={jobs} />
      </div>
    </div>
  )
}