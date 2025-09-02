import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { NextRequest } from 'next/server'
import { POST as extractPOST, GET as extractGET } from '@/app/api/jobs/extract/route'
import { GET as statusGET } from '@/app/api/jobs/extract/[jobId]/route'
import { GET as recentGET } from '@/app/api/jobs/extract/recent/route'
import { jobQueue } from '@/lib/job-queue'
import { RecentExtractions } from '@/components/dashboard/recent-extractions'
import { JobsManagement } from '@/components/jobs/jobs-management'
import { createTestJobWithApplication } from '@/test/test-utils'

// Mock fetch for the component tests
global.fetch = vi.fn()

describe('Job Extraction Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(jobQueue as Map<string, any>).clear()
  })

  describe('End-to-End Extraction Flow', () => {
    it('should complete full extraction workflow from API to dashboard', async () => {
      // Step 1: Start extraction via API
      const extractRequest = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com/job/123' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const extractResponse = await extractPOST(extractRequest)
      const extractData = await extractResponse.json()

      expect(extractResponse.status).toBe(200)
      expect(extractData.success).toBe(true)
      expect(extractData.jobId).toBeDefined()

      // Step 2: Verify job is in queue
      expect(jobQueue.size).toBe(1)
      const queuedJob = jobQueue.get(extractData.jobId)
      expect(queuedJob.status).toBe('queued')
      expect(queuedJob.url).toBe('https://example.com/job/123')

      // Step 3: Simulate job processing completion
      queuedJob.status = 'completed'
      queuedJob.completedAt = new Date().toISOString()
      queuedJob.result = {
        job: {
          id: 'test-job-id',
          title: 'Software Engineer',
          company: 'Test Company',
          location: 'San Francisco, CA'
        },
        extractedData: {
          title: 'Software Engineer',
          company: 'Test Company',
          location: 'San Francisco, CA',
          salary: '$100k-$150k',
          employmentType: 'full-time',
          remotePolicy: 'remote',
          description: 'A great job opportunity',
          url: 'https://example.com/job/123',
          extractedAt: new Date().toISOString(),
          source: 'ai-extraction'
        }
      }

      // Step 4: Check job status via status endpoint
      const statusRequest = new NextRequest(`http://localhost:3000/api/jobs/extract/${extractData.jobId}`)
      const statusResponse = await statusGET(statusRequest, {
        params: Promise.resolve({ jobId: extractData.jobId })
      })
      const statusData = await statusResponse.json()

      expect(statusResponse.status).toBe(200)
      expect(statusData.success).toBe(true)
      expect(statusData.job.status).toBe('completed')
      expect(statusData.job.result).toBeDefined()

      // Step 5: Verify job appears in recent extractions
      const recentRequest = new NextRequest('http://localhost:3000/api/jobs/extract/recent')
      const recentResponse = await recentGET(recentRequest)
      const recentData = await recentResponse.json()

      expect(recentResponse.status).toBe(200)
      expect(recentData.success).toBe(true)
      expect(recentData.jobs).toHaveLength(1)
      expect(recentData.jobs[0].id).toBe(extractData.jobId)
      expect(recentData.jobs[0].status).toBe('completed')
    })

    it('should handle extraction failure gracefully', async () => {
      // Start extraction
      const extractRequest = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com/job/456' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const extractResponse = await extractPOST(extractRequest)
      const extractData = await extractResponse.json()

      // Simulate extraction failure
      const job = jobQueue.get(extractData.jobId)
      job.status = 'failed'
      job.error = 'Could not extract job data'
      job.failedAt = new Date().toISOString()

      // Check status endpoint reflects failure
      const statusRequest = new NextRequest(`http://localhost:3000/api/jobs/extract/${extractData.jobId}`)
      const statusResponse = await statusGET(statusRequest, {
        params: Promise.resolve({ jobId: extractData.jobId })
      })
      const statusData = await statusResponse.json()

      expect(statusData.job.status).toBe('failed')
      expect(statusData.job.error).toBe('Could not extract job data')

      // Verify failure appears in recent extractions
      const recentRequest = new NextRequest('http://localhost:3000/api/jobs/extract/recent')
      const recentResponse = await recentGET(recentRequest)
      const recentData = await recentResponse.json()

      expect(recentData.jobs[0].status).toBe('failed')
      expect(recentData.jobs[0].error).toBe('Could not extract job data')
    })
  })

  describe('Dashboard Component Integration', () => {
    it('should display recent extractions in RecentExtractions component', async () => {
      // Add a completed job to the queue
      const jobId = 'test_job_123'
      jobQueue.set(jobId, {
        id: jobId,
        url: 'https://example.com/job/123',
        status: 'completed',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        completedAt: new Date().toISOString(),
        result: {
          job: { title: 'Software Engineer' }
        }
      })

      // Mock fetch to return the job queue data
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          jobs: Array.from(jobQueue.values())
        })
      } as Response)

      render(<RecentExtractions />)

      await waitFor(() => {
        expect(screen.getByText('example.com')).toBeInTheDocument()
        expect(screen.getByText('✅ Completed')).toBeInTheDocument()
        expect(screen.getByText('5m ago')).toBeInTheDocument()
      })
    })

    it('should handle real-time updates in RecentExtractions component', async () => {
      // Start with a processing job
      const jobId = 'processing_job_123'
      jobQueue.set(jobId, {
        id: jobId,
        url: 'https://example.com/job/456',
        status: 'processing',
        createdAt: new Date().toISOString()
      })

      // Mock initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          jobs: [jobQueue.get(jobId)]
        })
      } as Response)

      render(<RecentExtractions />)

      await waitFor(() => {
        expect(screen.getByText('🔄 Processing')).toBeInTheDocument()
      })

      // Simulate job completion
      const job = jobQueue.get(jobId)
      job.status = 'completed'
      job.completedAt = new Date().toISOString()

      // Mock next fetch call (polling)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          jobs: [job]
        })
      } as Response)

      // Wait for polling to occur (component polls every 5 seconds)
      await new Promise(resolve => setTimeout(resolve, 100))

      await waitFor(() => {
        expect(screen.getByText('✅ Completed')).toBeInTheDocument()
      })
    })
  })

  describe('Jobs Management Integration', () => {
    it('should display jobs with all filtering and sorting functionality', async () => {
      const testJobs = [
        createTestJobWithApplication(
          {
            title: 'Senior React Developer',
            location: 'San Francisco, CA',
            companies: { name: 'TechCorp', size: 'large' },
            salary_max: 150000,
            remote_policy: 'remote',
            tech_stack: ['React', 'TypeScript']
          },
          {
            status: 'applied',
            priority: 'high',
            updated_at: '2025-01-15T10:00:00.000Z'
          }
        ),
        createTestJobWithApplication(
          {
            title: 'Backend Engineer',
            location: 'New York, NY',
            companies: { name: 'StartupCo', size: 'startup' },
            salary_max: 120000,
            remote_policy: 'hybrid',
            tech_stack: ['Python', 'Django']
          },
          {
            status: 'saved',
            priority: 'medium',
            updated_at: '2025-01-14T10:00:00.000Z'
          }
        )
      ]

      render(<JobsManagement initialJobs={testJobs} />)

      // Test initial display
      expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
      expect(screen.getByText('Backend Engineer')).toBeInTheDocument()
      expect(screen.getByText('Showing 2 of 2 jobs')).toBeInTheDocument()

      // Test search functionality
      const searchInput = screen.getByPlaceholderText('Search jobs, companies, locations...')
      fireEvent.change(searchInput, { target: { value: 'React' } })

      await waitFor(() => {
        expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
        expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument()
        expect(screen.getByText('Showing 1 of 2 jobs')).toBeInTheDocument()
      })

      // Clear search and test filtering
      fireEvent.change(searchInput, { target: { value: '' } })
      
      await waitFor(() => {
        expect(screen.getByText('Showing 2 of 2 jobs')).toBeInTheDocument()
      })

      // Test status filter
      const statusFilter = screen.getByDisplayValue('All Status')
      fireEvent.change(statusFilter, { target: { value: 'applied' } })

      await waitFor(() => {
        expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
        expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument()
        expect(screen.getByText('Showing 1 of 2 jobs')).toBeInTheDocument()
      })

      // Test sorting
      const sortSelect = screen.getByDisplayValue('Recently Updated')
      fireEvent.change(sortSelect, { target: { value: 'salary-desc' } })

      await waitFor(() => {
        const jobCards = screen.getAllByRole('generic').filter(el => 
          el.className.includes('cursor-pointer')
        )
        expect(jobCards[0]).toHaveTextContent('Senior React Developer') // Higher salary first
      })
    })

    it('should open job detail view when job is clicked', async () => {
      const testJob = createTestJobWithApplication(
        {
          title: 'Full Stack Developer',
          description: 'Build amazing web applications using modern technologies.',
          location: 'Austin, TX',
          companies: { name: 'InnovativeTech', website: 'https://innovativetech.com' },
          salary_min: 90000,
          salary_max: 130000,
          remote_policy: 'hybrid',
          tech_stack: ['React', 'Node.js', 'PostgreSQL'],
          external_url: 'https://example.com/job/789'
        },
        {
          status: 'interviewing',
          priority: 'high',
          applied_at: '2025-01-10T10:00:00.000Z',
          notes: 'Really excited about this opportunity!'
        }
      )

      render(<JobsManagement initialJobs={[testJob]} />)

      // Click on the job
      fireEvent.click(screen.getByText('Full Stack Developer'))

      await waitFor(() => {
        expect(screen.getByText('← Back to Jobs')).toBeInTheDocument()
        expect(screen.getByText('Application Details')).toBeInTheDocument()
        expect(screen.getByText('🛠️ Tech Stack')).toBeInTheDocument()
        expect(screen.getByText('📋 Job Description')).toBeInTheDocument()
        expect(screen.getByText('Really excited about this opportunity!')).toBeInTheDocument()
        expect(screen.getByText('$90,000-130,000 USD')).toBeInTheDocument()
        expect(screen.getByText('View Original Posting →')).toBeInTheDocument()
      })

      // Test back navigation
      fireEvent.click(screen.getByText('← Back to Jobs'))

      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 1 jobs')).toBeInTheDocument()
        expect(screen.queryByText('← Back to Jobs')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed job data gracefully', async () => {
      const malformedJob = {
        id: 'malformed-job',
        title: null,
        // Missing required fields
        applications: [{ status: 'saved', priority: null }]
      }

      // Should not crash when rendering malformed data
      expect(() => {
        render(<JobsManagement initialJobs={[malformedJob] as any} />)
      }).not.toThrow()
    })

    it('should handle API errors in RecentExtractions', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      render(<RecentExtractions />)

      await waitFor(() => {
        expect(screen.getByText('No job extractions yet')).toBeInTheDocument()
        expect(screen.getByText('Use the Chrome extension to start extracting jobs!')).toBeInTheDocument()
      })
    })

    it('should handle empty responses from API', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, jobs: null })
      } as Response)

      render(<RecentExtractions />)

      await waitFor(() => {
        expect(screen.getByText('No job extractions yet')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Optimization', () => {
    it('should handle large datasets efficiently', async () => {
      // Create 100 test jobs
      const largeJobSet = Array.from({ length: 100 }, (_, i) =>
        createTestJobWithApplication(
          {
            id: `job-${i}`,
            title: `Job ${i}`,
            companies: { name: `Company ${i}` }
          },
          {
            status: i % 3 === 0 ? 'completed' : i % 2 === 0 ? 'processing' : 'saved'
          }
        )
      )

      const startTime = performance.now()
      render(<JobsManagement initialJobs={largeJobSet} />)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(1000) // Should render in less than 1 second

      // Should show all jobs initially
      expect(screen.getByText('Showing 100 of 100 jobs')).toBeInTheDocument()

      // Test filtering performance
      const searchStart = performance.now()
      const searchInput = screen.getByPlaceholderText('Search jobs, companies, locations...')
      fireEvent.change(searchInput, { target: { value: 'Job 1' } })
      const searchEnd = performance.now()

      expect(searchEnd - searchStart).toBeLessThan(100) // Should filter quickly

      await waitFor(() => {
        expect(screen.getByText('Showing 11 of 100 jobs')).toBeInTheDocument() // Job 1, 10, 11, ..., 19, 100
      })
    })
  })
})