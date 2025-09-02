import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test/test-utils'
import { RecentExtractions } from '../recent-extractions'
import { createTestExtractionJob, mockFetchSuccess, mockFetchError } from '@/test/test-utils'

// Mock fetch
global.fetch = vi.fn()

describe('RecentExtractions Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Initial Loading', () => {
    it('should show loading state initially', () => {
      // Mock fetch to never resolve to test loading state
      vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))
      
      render(<RecentExtractions />)
      
      expect(screen.getByText('Recent Job Extractions')).toBeInTheDocument()
      expect(screen.getAllByRole('generic')).toHaveLength(7) // Loading skeletons
    })

    it('should show empty state when no extractions', async () => {
      mockFetchSuccess({ success: true, jobs: [] })
      
      render(<RecentExtractions />)
      
      await waitFor(() => {
        expect(screen.getByText('No job extractions yet')).toBeInTheDocument()
        expect(screen.getByText('Use the Chrome extension to start extracting jobs!')).toBeInTheDocument()
      })
    })

    it('should handle fetch error gracefully', async () => {
      mockFetchError(500, 'Server Error')
      
      render(<RecentExtractions />)
      
      await waitFor(() => {
        expect(screen.getByText('No job extractions yet')).toBeInTheDocument()
        expect(screen.getByText('Use the Chrome extension to start extracting jobs!')).toBeInTheDocument()
      })
    })
  })

  describe('Job Display', () => {
    const mockJobs = [
      createTestExtractionJob({
        id: 'job_1',
        url: 'https://dev-korea.com/jobs/software-developer',
        status: 'completed',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      }),
      createTestExtractionJob({
        id: 'job_2',
        url: 'https://linkedin.com/jobs/view/12345',
        status: 'processing',
        createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString()
      }),
      createTestExtractionJob({
        id: 'job_3',
        url: 'https://indeed.com/job/senior-dev',
        status: 'failed',
        createdAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
        error: 'Failed to extract job data'
      })
    ]

    it('should display extraction jobs correctly', async () => {
      mockFetchSuccess({ success: true, jobs: mockJobs })
      
      render(<RecentExtractions />)
      
      await waitFor(() => {
        expect(screen.getByText('dev-korea.com')).toBeInTheDocument()
        expect(screen.getByText('linkedin.com')).toBeInTheDocument()
        expect(screen.getByText('indeed.com')).toBeInTheDocument()
      })
    })

    it('should show correct status badges', async () => {
      mockFetchSuccess({ success: true, jobs: mockJobs })
      
      render(<RecentExtractions />)
      
      await waitFor(() => {
        expect(screen.getByText('✅ Completed')).toBeInTheDocument()
        expect(screen.getByText('🔄 Processing')).toBeInTheDocument()
        expect(screen.getByText('❌ Failed')).toBeInTheDocument()
      })
    })

    it('should format time correctly', async () => {
      mockFetchSuccess({ success: true, jobs: mockJobs })
      
      render(<RecentExtractions />)
      
      await waitFor(() => {
        expect(screen.getByText('5m ago')).toBeInTheDocument()
        expect(screen.getByText('2m ago')).toBeInTheDocument()
        expect(screen.getByText('1m ago')).toBeInTheDocument()
      })
    })

    it('should show error messages for failed extractions', async () => {
      mockFetchSuccess({ success: true, jobs: mockJobs })
      
      render(<RecentExtractions />)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to extract job data')).toBeInTheDocument()
      })
    })

    it('should show processing indicator animation', async () => {
      mockFetchSuccess({ success: true, jobs: mockJobs })
      
      render(<RecentExtractions />)
      
      await waitFor(() => {
        const processingIndicator = screen.getByText('Processing', { exact: false }).previousSibling
        expect(processingIndicator).toHaveClass('bg-yellow-500', 'animate-pulse')
      })
    })
  })

  describe('Domain Extraction', () => {
    it('should extract domain names correctly', async () => {
      const jobsWithVariousURLs = [
        createTestExtractionJob({
          url: 'https://www.example.com/jobs/123',
          status: 'completed'
        }),
        createTestExtractionJob({
          url: 'https://subdomain.company.co.uk/careers/developer',
          status: 'completed'
        }),
        createTestExtractionJob({
          url: 'http://localhost:3000/test-job',
          status: 'completed'
        })
      ]

      mockFetchSuccess({ success: true, jobs: jobsWithVariousURLs })
      
      render(<RecentExtractions />)
      
      await waitFor(() => {
        expect(screen.getByText('example.com')).toBeInTheDocument()
        expect(screen.getByText('subdomain.company.co.uk')).toBeInTheDocument()
        expect(screen.getByText('localhost:3000')).toBeInTheDocument()
      })
    })

    it('should handle invalid URLs gracefully', async () => {
      const jobsWithInvalidURLs = [
        createTestExtractionJob({
          url: 'not-a-url',
          status: 'failed'
        })
      ]

      mockFetchSuccess({ success: true, jobs: jobsWithInvalidURLs })
      
      render(<RecentExtractions />)
      
      await waitFor(() => {
        expect(screen.getByText('not-a-url')).toBeInTheDocument()
      })
    })
  })

  describe('Polling Behavior', () => {
    it('should poll for updates when processing jobs exist', async () => {
      const processingJob = createTestExtractionJob({
        status: 'processing'
      })
      
      mockFetchSuccess({ success: true, jobs: [processingJob] })
      
      render(<RecentExtractions />)
      
      await waitFor(() => {
        expect(screen.getByText('🔄 Processing')).toBeInTheDocument()
      })

      // Clear previous fetch calls
      vi.mocked(fetch).mockClear()
      
      // Mock another successful response
      mockFetchSuccess({ success: true, jobs: [{ ...processingJob, status: 'completed' }] })
      
      // Advance timers to trigger polling
      vi.advanceTimersByTime(5000)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/jobs/extract/recent', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
      })
    })

    it('should not poll when no processing jobs exist', async () => {
      const completedJob = createTestExtractionJob({
        status: 'completed'
      })
      
      mockFetchSuccess({ success: true, jobs: [completedJob] })
      
      render(<RecentExtractions />)
      
      await waitFor(() => {
        expect(screen.getByText('✅ Completed')).toBeInTheDocument()
      })

      // Clear previous fetch calls
      vi.mocked(fetch).mockClear()
      
      // Advance timers - should not trigger polling
      vi.advanceTimersByTime(5000)
      
      // Wait a bit to ensure no additional calls are made
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should handle polling errors gracefully', async () => {
      const processingJob = createTestExtractionJob({
        status: 'processing'
      })
      
      mockFetchSuccess({ success: true, jobs: [processingJob] })
      
      render(<RecentExtractions />)
      
      await waitFor(() => {
        expect(screen.getByText('🔄 Processing')).toBeInTheDocument()
      })

      // Clear previous fetch calls and mock error
      vi.mocked(fetch).mockClear()
      mockFetchError(500)
      
      // Advance timers to trigger polling
      vi.advanceTimersByTime(5000)
      
      // Should not crash or show error state
      await waitFor(() => {
        expect(screen.getByText('🔄 Processing')).toBeInTheDocument()
      })
    })
  })

  describe('Status Indicators', () => {
    it('should show correct colors for different statuses', async () => {
      const jobsWithAllStatuses = [
        createTestExtractionJob({ status: 'queued' }),
        createTestExtractionJob({ status: 'processing' }),
        createTestExtractionJob({ status: 'completed' }),
        createTestExtractionJob({ status: 'failed' })
      ]

      mockFetchSuccess({ success: true, jobs: jobsWithAllStatuses })
      
      render(<RecentExtractions />)
      
      await waitFor(() => {
        const indicators = screen.getAllByRole('generic').filter(el => 
          el.className.includes('w-3 h-3 rounded-full')
        )
        
        expect(indicators).toHaveLength(4)
        expect(indicators[0]).toHaveClass('bg-gray-400') // queued
        expect(indicators[1]).toHaveClass('bg-yellow-500', 'animate-pulse') // processing
        expect(indicators[2]).toHaveClass('bg-green-500') // completed
        expect(indicators[3]).toHaveClass('bg-red-500') // failed
      })
    })
  })

  describe('Component Cleanup', () => {
    it('should clear interval on unmount', async () => {
      const processingJob = createTestExtractionJob({
        status: 'processing'
      })
      
      mockFetchSuccess({ success: true, jobs: [processingJob] })
      
      const { unmount } = render(<RecentExtractions />)
      
      await waitFor(() => {
        expect(screen.getByText('🔄 Processing')).toBeInTheDocument()
      })

      // Unmount component
      unmount()
      
      // Clear previous fetch calls
      vi.mocked(fetch).mockClear()
      
      // Advance timers - should not trigger polling after unmount
      vi.advanceTimersByTime(5000)
      
      expect(fetch).not.toHaveBeenCalled()
    })
  })
})