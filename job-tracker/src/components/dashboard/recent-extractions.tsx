'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ExtractionJob {
  id: string
  url: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  createdAt: string
  completedAt?: string
  result?: any
  error?: string
}

export function RecentExtractions() {
  const [jobs, setJobs] = useState<ExtractionJob[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    
    const fetchRecentExtractions = async () => {
      try {
        // Get recent extraction jobs from the async API
        const response = await fetch('/api/jobs/extract/recent', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          if (mounted) {
            setJobs(data.jobs || [])
          }
        } else {
          console.log('No recent extractions found or API not available')
          if (mounted) {
            setJobs([])
          }
        }
      } catch (error) {
        console.log('Could not fetch recent extractions:', error)
        if (mounted) {
          setJobs([])
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchRecentExtractions()
    
    // Poll for updates every 5 seconds when there are active jobs
    const interval = setInterval(() => {
      if (jobs.some(job => job.status === 'processing' || job.status === 'queued')) {
        fetchRecentExtractions()
      }
    }, 5000)
    
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [jobs])

  const getStatusBadge = (status: ExtractionJob['status']) => {
    switch (status) {
      case 'queued':
        return <Badge variant="secondary">⏳ Queued</Badge>
      case 'processing':
        return <Badge variant="default" className="bg-yellow-500">🔄 Processing</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-500">✅ Completed</Badge>
      case 'failed':
        return <Badge variant="destructive">❌ Failed</Badge>
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Job Extractions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mt-1"></div>
                </div>
                <div className="w-16 h-5 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          Recent Job Extractions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No job extractions yet</p>
            <p className="text-sm">Use the Chrome extension to start extracting jobs!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className={`w-3 h-3 rounded-full ${
                    job.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                    job.status === 'completed' ? 'bg-green-500' :
                    job.status === 'failed' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`}></div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getDomain(job.url)}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {formatTime(job.createdAt)}
                      </p>
                      {job.error && (
                        <p className="text-xs text-red-500 truncate" title={job.error}>
                          {job.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  {getStatusBadge(job.status)}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 pt-3 border-t">
          <p className="text-xs text-gray-500 text-center">
            Use the Chrome extension to extract jobs from any website
          </p>
        </div>
      </CardContent>
    </Card>
  )
}