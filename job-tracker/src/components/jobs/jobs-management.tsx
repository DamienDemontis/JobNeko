'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Job {
  id: string
  title: string
  description: string
  location: string
  employment_type: string
  remote_policy: string
  salary_min?: number
  salary_max?: number
  currency?: string
  job_level?: string
  tech_stack?: string[]
  industry?: string
  external_url: string
  created_at: string
  companies: {
    id: string
    name: string
    size?: string
    industry?: string
    website?: string
    logo_url?: string
  }
  applications: {
    id: string
    status: string
    priority: string
    notes?: string
    applied_at?: string
    deadline?: string
    created_at: string
    updated_at: string
  }[]
}

interface JobsManagementProps {
  initialJobs: Job[]
}

export function JobsManagement({ initialJobs }: JobsManagementProps) {
  const [jobs] = useState<Job[]>(initialJobs)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [remoteFilter, setRemoteFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('list')

  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobs.filter(job => {
      const application = job.applications[0]
      
      // Search filter
      const searchMatch = 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.companies.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.tech_stack && job.tech_stack.some(tech => 
          tech.toLowerCase().includes(searchTerm.toLowerCase())
        ))

      // Status filter
      const statusMatch = statusFilter === 'all' || application.status === statusFilter

      // Remote filter
      const remoteMatch = remoteFilter === 'all' || job.remote_policy === remoteFilter

      // Priority filter
      const priorityMatch = priorityFilter === 'all' || application.priority === priorityFilter

      return searchMatch && statusMatch && remoteMatch && priorityMatch
    })

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'title':
          aValue = a.title
          bValue = b.title
          break
        case 'company':
          aValue = a.companies.name
          bValue = b.companies.name
          break
        case 'salary':
          aValue = a.salary_max || 0
          bValue = b.salary_max || 0
          break
        case 'updated_at':
        default:
          aValue = new Date(a.applications[0].updated_at).getTime()
          bValue = new Date(b.applications[0].updated_at).getTime()
          break
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortOrder === 'asc' ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue)
    })

    return filtered
  }, [jobs, searchTerm, statusFilter, remoteFilter, priorityFilter, sortBy, sortOrder])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      saved: { variant: 'secondary' as const, text: '💾 Saved', color: 'bg-gray-100 text-gray-800' },
      applied: { variant: 'default' as const, text: '📝 Applied', color: 'bg-blue-100 text-blue-800' },
      'first-contact': { variant: 'default' as const, text: '📞 First Contact', color: 'bg-green-100 text-green-800' },
      interviewing: { variant: 'default' as const, text: '🎯 Interviewing', color: 'bg-yellow-100 text-yellow-800' },
      offer: { variant: 'default' as const, text: '🎉 Offer', color: 'bg-purple-100 text-purple-800' },
      rejected: { variant: 'destructive' as const, text: '❌ Rejected', color: 'bg-red-100 text-red-800' }
    }
    const config = statusConfig[status] || statusConfig.saved
    return <Badge className={config.color}>{config.text}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    if (priority === 'high') return <Badge className="bg-red-100 text-red-800">🔥 High Priority</Badge>
    if (priority === 'medium') return <Badge className="bg-yellow-100 text-yellow-800">⭐ Medium</Badge>
    return null
  }

  const getRemoteBadge = (remotePolicy: string) => {
    const remoteConfig = {
      remote: { text: '🏠 Remote', color: 'bg-green-100 text-green-800' },
      hybrid: { text: '🏢 Hybrid', color: 'bg-blue-100 text-blue-800' },
      'on-site': { text: '🏛️ On-site', color: 'bg-gray-100 text-gray-800' }
    }
    const config = remoteConfig[remotePolicy] || remoteConfig['on-site']
    return <Badge className={config.color}>{config.text}</Badge>
  }

  const formatSalary = (min: number | undefined, max: number | undefined, currency: string = 'USD') => {
    if (!min && !max) return null
    if (min && max) return `$${min.toLocaleString()}-${max.toLocaleString()} ${currency}`
    if (max) return `Up to $${max.toLocaleString()} ${currency}`
    if (min) return `From $${min.toLocaleString()} ${currency}`
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getTimeSinceUpdate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return formatDate(dateString)
  }

  if (selectedJob) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setSelectedJob(null)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            ← Back to Jobs
          </button>
          <div className="flex items-center space-x-2">
            {getPriorityBadge(selectedJob.applications[0].priority)}
            {getStatusBadge(selectedJob.applications[0].status)}
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedJob.title}</h1>
              <p className="text-lg text-gray-600 mb-4">{selectedJob.companies.name}</p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                <Badge className="bg-gray-100 text-gray-800">📍 {selectedJob.location}</Badge>
                {getRemoteBadge(selectedJob.remote_policy)}
                <Badge className="bg-gray-100 text-gray-800">
                  {selectedJob.employment_type?.replace('-', ' ')?.toUpperCase() || 'FULL-TIME'}
                </Badge>
                {selectedJob.job_level && (
                  <Badge className="bg-gray-100 text-gray-800">
                    {selectedJob.job_level.toUpperCase()}
                  </Badge>
                )}
              </div>

              {formatSalary(selectedJob.salary_min, selectedJob.salary_max, selectedJob.currency) && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">💰 Salary</h3>
                  <p className="text-lg text-green-600 font-medium">
                    {formatSalary(selectedJob.salary_min, selectedJob.salary_max, selectedJob.currency)}
                  </p>
                </div>
              )}

              {selectedJob.tech_stack && selectedJob.tech_stack.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">🛠️ Tech Stack</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.tech_stack.map(tech => (
                      <Badge key={tech} className="bg-blue-100 text-blue-800">{tech}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">📋 Job Description</h3>
                <div className="prose prose-sm max-w-none text-gray-700">
                  {selectedJob.description.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-2">{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Application Details */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Application Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(selectedJob.applications[0].status)}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Priority</label>
                    <div className="mt-1">
                      {getPriorityBadge(selectedJob.applications[0].priority) || (
                        <Badge className="bg-gray-100 text-gray-800">Normal</Badge>
                      )}
                    </div>
                  </div>

                  {selectedJob.applications[0].applied_at && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Applied Date</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatDate(selectedJob.applications[0].applied_at)}
                      </p>
                    </div>
                  )}

                  {selectedJob.applications[0].deadline && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Deadline</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatDate(selectedJob.applications[0].deadline)}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Updated</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {getTimeSinceUpdate(selectedJob.applications[0].updated_at)}
                    </p>
                  </div>

                  {selectedJob.applications[0].notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Notes</label>
                      <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                        {selectedJob.applications[0].notes}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <a
                      href={selectedJob.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center block"
                    >
                      View Original Posting →
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Search jobs, companies, locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="saved">Saved</option>
            <option value="applied">Applied</option>
            <option value="first-contact">First Contact</option>
            <option value="interviewing">Interviewing</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Remote Filter */}
          <select
            value={remoteFilter}
            onChange={(e) => setRemoteFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Locations</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="on-site">On-site</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Priority</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-')
              setSortBy(field)
              setSortOrder(order as 'asc' | 'desc')
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="updated_at-desc">Recently Updated</option>
            <option value="updated_at-asc">Least Recently Updated</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="company-asc">Company A-Z</option>
            <option value="company-desc">Company Z-A</option>
            <option value="salary-desc">Salary High-Low</option>
            <option value="salary-asc">Salary Low-High</option>
          </select>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="text-sm text-gray-600">
            Showing {filteredAndSortedJobs.length} of {jobs.length} jobs
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded ${view === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              List View
            </button>
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded ${view === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              Grid View
            </button>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {filteredAndSortedJobs.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <div className="text-gray-400 text-lg mb-2">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or filters</p>
          </div>
        ) : (
          filteredAndSortedJobs.map(job => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer ${
                view === 'list' ? 'p-6' : 'p-4'
              }`}
            >
              <div className={`${view === 'list' ? 'flex items-center justify-between' : 'space-y-3'}`}>
                <div className={view === 'list' ? 'flex-1' : ''}>
                  <div className={`${view === 'list' ? 'flex items-center space-x-4' : 'space-y-2'}`}>
                    <div className={view === 'list' ? 'flex-1' : ''}>
                      <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                      <p className="text-gray-600">{job.companies.name}</p>
                    </div>
                    
                    {view === 'list' && (
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-gray-100 text-gray-800">📍 {job.location}</Badge>
                        {getRemoteBadge(job.remote_policy)}
                      </div>
                    )}
                  </div>

                  {view === 'grid' && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge className="bg-gray-100 text-gray-800 text-xs">📍 {job.location}</Badge>
                      {getRemoteBadge(job.remote_policy)}
                    </div>
                  )}

                  {formatSalary(job.salary_min, job.salary_max, job.currency) && (
                    <p className="text-green-600 font-medium text-sm mt-1">
                      💰 {formatSalary(job.salary_min, job.salary_max, job.currency)}
                    </p>
                  )}
                </div>

                <div className={`${view === 'list' ? 'flex items-center space-x-3' : 'flex justify-between items-end mt-3'}`}>
                  <div className="flex items-center space-x-2">
                    {getPriorityBadge(job.applications[0].priority)}
                    {getStatusBadge(job.applications[0].status)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getTimeSinceUpdate(job.applications[0].updated_at)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}