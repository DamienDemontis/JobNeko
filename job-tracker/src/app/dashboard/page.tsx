import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { RecentExtractions } from '@/components/dashboard/recent-extractions'

async function getJobStats(supabase: any, userId: string) {
  try {
    // Get applications count
    const { data: applications } = await supabase
      .from('applications')
      .select('status')
      .eq('user_id', userId)

    // Get recent jobs  
    const { data: recentJobs } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        external_url,
        created_at,
        companies (
          name
        ),
        applications!inner (
          status,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    const stats = {
      total: applications?.length || 0,
      applied: applications?.filter(a => a.status === 'applied').length || 0,
      inProgress: applications?.filter(a => ['first-contact', 'interviewing', 'offer'].includes(a.status)).length || 0,
      saved: applications?.filter(a => a.status === 'saved').length || 0,
    }

    return { stats, recentJobs: recentJobs || [] }
  } catch (error) {
    console.error('Error fetching stats:', error)
    return { stats: { total: 0, applied: 0, inProgress: 0, saved: 0 }, recentJobs: [] }
  }
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const { stats, recentJobs } = await getJobStats(supabase, user.id)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Job Tracker Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">Welcome back, {user.email?.split('@')[0]}!</p>
              </div>
              <div className="flex items-center space-x-4">
                <a
                  href="/jobs"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📋 Manage All Jobs
                </a>
                <div className="text-sm text-gray-500">
                  Chrome Extension: <span className="font-medium text-green-600">Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Jobs</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Applied</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.applied}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.inProgress}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Saved</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.saved}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Extractions */}
          <RecentExtractions />

          {/* Recent Jobs */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Job Applications</h3>
            </div>
            <div className="p-6">
              {recentJobs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M8 6v10a2 2 0 002 2h4a2 2 0 002-2V6"></path>
                    </svg>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">No job applications yet</h4>
                  <p className="text-sm text-gray-500 mb-4">Use the Chrome extension to start extracting and saving jobs!</p>
                  <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                    <p>📌 <strong>Quick Start:</strong></p>
                    <p>1. Install the Chrome extension</p>
                    <p>2. Visit any job posting</p>
                    <p>3. Click the Job Tracker icon</p>
                    <p>4. Click "Extract & Save Job"</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentJobs.map((job: any, index: number) => (
                    <div key={job.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            {index + 1}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {job.title}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {job.companies?.name || 'Unknown Company'}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-xs text-gray-400">
                        {new Date(job.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Extension Status */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Chrome Extension Active</h3>
              <p className="mt-1 text-sm text-blue-700">
                Your Job Tracker extension is ready to extract jobs from any website. 
                Visit job postings and click the extension icon to start saving jobs automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}