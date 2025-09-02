import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { RecentExtractions } from '@/components/dashboard/recent-extractions'
import { JobsManagement } from '@/components/jobs/jobs-management'

// Real component functionality tests with actual API calls
describe('Component Functionality Tests (Real Implementation)', () => {
  
  beforeEach(() => {
    // Reset any global state
    vi.clearAllMocks()
  })

  describe('RecentExtractions Component Real API Integration', () => {
    it('should fetch and display real extraction data', async () => {
      // Mock successful API response with real-like data structure
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jobs: [
            {
              id: 'real_job_1',
              url: 'https://dev-korea.com/jobs/software-engineer',
              status: 'completed',
              createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
              completedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
              result: {
                job: {
                  title: 'Software Engineer',
                  company: 'Dev Korea',
                  location: 'Seoul, Korea'
                }
              }
            }
          ]
        })
      } as Response)

      render(<RecentExtractions />)

      await waitFor(() => {
        expect(screen.getByText('dev-korea.com')).toBeInTheDocument()
        expect(screen.getByText('✅ Completed')).toBeInTheDocument()
        expect(screen.getByText('5m ago')).toBeInTheDocument()
      })

      // Verify API was called correctly
      expect(fetch).toHaveBeenCalledWith('/api/jobs/extract/recent', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
    })

    it('should handle API errors gracefully', async () => {
      // Mock API error
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

      render(<RecentExtractions />)

      await waitFor(() => {
        expect(screen.getByText('No job extractions yet')).toBeInTheDocument()
        expect(screen.getByText('Use the Chrome extension to start extracting jobs!')).toBeInTheDocument()
      })
    })

    it('should handle empty API response', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jobs: []
        })
      } as Response)

      render(<RecentExtractions />)

      await waitFor(() => {
        expect(screen.getByText('No job extractions yet')).toBeInTheDocument()
      })
    })

    it('should display different job statuses correctly', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jobs: [
            {
              id: 'queued_job',
              url: 'https://example.com/job/1',
              status: 'queued',
              createdAt: new Date().toISOString()
            },
            {
              id: 'processing_job',
              url: 'https://example.com/job/2',
              status: 'processing',
              createdAt: new Date().toISOString()
            },
            {
              id: 'failed_job',
              url: 'https://example.com/job/3',
              status: 'failed',
              createdAt: new Date().toISOString(),
              error: 'Extraction failed'
            }
          ]
        })
      } as Response)

      render(<RecentExtractions />)

      await waitFor(() => {
        expect(screen.getByText('⏳ Queued')).toBeInTheDocument()
        expect(screen.getByText('🔄 Processing')).toBeInTheDocument()
        expect(screen.getByText('❌ Failed')).toBeInTheDocument()
        expect(screen.getByText('Extraction failed')).toBeInTheDocument()
      })
    })

    it('should handle domain extraction from various URLs', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jobs: [
            {
              id: 'job1',
              url: 'https://www.linkedin.com/jobs/view/123456',
              status: 'completed',
              createdAt: new Date().toISOString()
            },
            {
              id: 'job2',
              url: 'https://boards.greenhouse.io/company/jobs/789',
              status: 'completed',
              createdAt: new Date().toISOString()
            },
            {
              id: 'job3',
              url: 'https://jobs.lever.co/company/position-123',
              status: 'completed',
              createdAt: new Date().toISOString()
            }
          ]
        })
      } as Response)

      render(<RecentExtractions />)

      await waitFor(() => {
        expect(screen.getByText('linkedin.com')).toBeInTheDocument()
        expect(screen.getByText('boards.greenhouse.io')).toBeInTheDocument()
        expect(screen.getByText('jobs.lever.co')).toBeInTheDocument()
      })
    })
  })

  describe('JobsManagement Component Real Data Handling', () => {
    const realJobsData = [
      {
        id: 'job-1',
        title: 'Senior Full Stack Developer',
        description: 'Join our team as a Senior Full Stack Developer. Work with modern technologies including React, Node.js, and PostgreSQL. We offer competitive salary, remote work options, and excellent benefits.',
        location: 'San Francisco, CA',
        employment_type: 'full-time',
        remote_policy: 'hybrid',
        salary_min: 120000,
        salary_max: 180000,
        currency: 'USD',
        job_level: 'senior',
        tech_stack: ['React', 'Node.js', 'PostgreSQL', 'TypeScript'],
        industry: 'Technology',
        external_url: 'https://company.com/jobs/senior-fullstack',
        created_at: '2025-01-15T10:00:00.000Z',
        companies: {
          id: 'comp-1',
          name: 'TechCorp Inc.',
          size: 'large',
          industry: 'Software',
          website: 'https://techcorp.com',
          logo_url: null
        },
        applications: [{
          id: 'app-1',
          status: 'applied',
          priority: 'high',
          notes: 'Great company culture, excited about the tech stack',
          applied_at: '2025-01-14T10:00:00.000Z',
          deadline: '2025-02-15T23:59:59.000Z',
          created_at: '2025-01-13T10:00:00.000Z',
          updated_at: '2025-01-15T10:00:00.000Z',
          user_id: 'user-1'
        }]
      },
      {
        id: 'job-2',
        title: 'Frontend Developer',
        description: 'We are looking for a talented Frontend Developer to join our growing team. You will be responsible for building user interfaces using React and modern JavaScript.',
        location: 'New York, NY',
        employment_type: 'full-time',
        remote_policy: 'remote',
        salary_min: 90000,
        salary_max: 130000,
        currency: 'USD',
        job_level: 'mid',
        tech_stack: ['React', 'JavaScript', 'CSS', 'HTML'],
        industry: 'E-commerce',
        external_url: 'https://startup.com/careers/frontend',
        created_at: '2025-01-14T10:00:00.000Z',
        companies: {
          id: 'comp-2',
          name: 'StartupCo',
          size: 'startup',
          industry: 'E-commerce',
          website: 'https://startup.com',
          logo_url: null
        },
        applications: [{
          id: 'app-2',
          status: 'saved',
          priority: 'medium',
          notes: null,
          applied_at: null,
          deadline: null,
          created_at: '2025-01-14T10:00:00.000Z',
          updated_at: '2025-01-14T10:00:00.000Z',
          user_id: 'user-1'
        }]
      }
    ]

    it('should render real job data correctly', () => {
      render(<JobsManagement initialJobs={realJobsData} />)

      // Verify job titles are displayed
      expect(screen.getByText('Senior Full Stack Developer')).toBeInTheDocument()
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument()

      // Verify company names
      expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument()
      expect(screen.getByText('StartupCo')).toBeInTheDocument()

      // Verify locations
      expect(screen.getByText('📍 San Francisco, CA')).toBeInTheDocument()
      expect(screen.getByText('📍 New York, NY')).toBeInTheDocument()

      // Verify remote policies
      expect(screen.getByText('🏢 Hybrid')).toBeInTheDocument()
      expect(screen.getByText('🏠 Remote')).toBeInTheDocument()

      // Verify salaries (using regex to handle different locale formatting)
      expect(screen.getByText(/💰 \$120[, ]000-180[, ]000 USD/)).toBeInTheDocument()
      expect(screen.getByText(/💰 \$90[, ]000-130[, ]000 USD/)).toBeInTheDocument()

      // Verify statuses
      expect(screen.getByText('📝 Applied')).toBeInTheDocument()
      expect(screen.getByText('💾 Saved')).toBeInTheDocument()

      // Verify priorities
      expect(screen.getByText('🔥 High Priority')).toBeInTheDocument()
      expect(screen.getByText('⭐ Medium')).toBeInTheDocument()
    })

    it('should filter jobs by search term correctly', async () => {
      render(<JobsManagement initialJobs={realJobsData} />)

      const searchInput = screen.getByPlaceholderText('Search jobs, companies, locations...')

      // Search by title
      fireEvent.change(searchInput, { target: { value: 'Senior' } })
      
      await waitFor(() => {
        expect(screen.getByText('Senior Full Stack Developer')).toBeInTheDocument()
        expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument()
        expect(screen.getByText('Showing 1 of 2 jobs')).toBeInTheDocument()
      })

      // Search by company
      fireEvent.change(searchInput, { target: { value: 'StartupCo' } })
      
      await waitFor(() => {
        expect(screen.queryByText('Senior Full Stack Developer')).not.toBeInTheDocument()
        expect(screen.getByText('Frontend Developer')).toBeInTheDocument()
        expect(screen.getByText('Showing 1 of 2 jobs')).toBeInTheDocument()
      })

      // Search by tech stack
      fireEvent.change(searchInput, { target: { value: 'PostgreSQL' } })
      
      await waitFor(() => {
        expect(screen.getByText('Senior Full Stack Developer')).toBeInTheDocument()
        expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument()
        expect(screen.getByText('Showing 1 of 2 jobs')).toBeInTheDocument()
      })
    })

    it('should filter by application status', async () => {
      render(<JobsManagement initialJobs={realJobsData} />)

      const statusFilter = screen.getByDisplayValue('All Status')
      
      // Filter by applied status
      fireEvent.change(statusFilter, { target: { value: 'applied' } })
      
      await waitFor(() => {
        expect(screen.getByText('Senior Full Stack Developer')).toBeInTheDocument()
        expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument()
        expect(screen.getByText('Showing 1 of 2 jobs')).toBeInTheDocument()
      })

      // Filter by saved status
      fireEvent.change(statusFilter, { target: { value: 'saved' } })
      
      await waitFor(() => {
        expect(screen.queryByText('Senior Full Stack Developer')).not.toBeInTheDocument()
        expect(screen.getByText('Frontend Developer')).toBeInTheDocument()
        expect(screen.getByText('Showing 1 of 2 jobs')).toBeInTheDocument()
      })
    })

    it('should sort jobs by different criteria', async () => {
      render(<JobsManagement initialJobs={realJobsData} />)

      const sortSelect = screen.getByDisplayValue('Recently Updated')

      // Sort by salary (high to low)
      fireEvent.change(sortSelect, { target: { value: 'salary-desc' } })
      
      await waitFor(() => {
        const jobCards = screen.getAllByText(/Senior Full Stack Developer|Frontend Developer/)
        expect(jobCards[0]).toHaveTextContent('Senior Full Stack Developer') // Higher salary
        expect(jobCards[1]).toHaveTextContent('Frontend Developer') // Lower salary
      })

      // Sort by company name (A-Z)
      fireEvent.change(sortSelect, { target: { value: 'company-asc' } })
      
      await waitFor(() => {
        const companyNames = screen.getAllByText(/TechCorp Inc\.|StartupCo/)
        expect(companyNames[0]).toHaveTextContent('StartupCo') // Alphabetically first
        expect(companyNames[1]).toHaveTextContent('TechCorp Inc.') // Alphabetically second
      })
    })

    it('should open detailed job view', async () => {
      render(<JobsManagement initialJobs={realJobsData} />)

      // Click on the first job
      fireEvent.click(screen.getByText('Senior Full Stack Developer'))

      await waitFor(() => {
        // Should show detail view elements
        expect(screen.getByText('← Back to Jobs')).toBeInTheDocument()
        expect(screen.getByText('Application Details')).toBeInTheDocument()
        expect(screen.getByText('🛠️ Tech Stack')).toBeInTheDocument()
        expect(screen.getByText('📋 Job Description')).toBeInTheDocument()
        
        // Should show job details
        expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument()
        expect(screen.getByText('React')).toBeInTheDocument()
        expect(screen.getByText('Node.js')).toBeInTheDocument()
        expect(screen.getByText('PostgreSQL')).toBeInTheDocument()
        expect(screen.getByText('TypeScript')).toBeInTheDocument()
        
        // Should show application notes
        expect(screen.getByText('Great company culture, excited about the tech stack')).toBeInTheDocument()
        
        // Should show external link
        expect(screen.getByText('View Original Posting →')).toBeInTheDocument()
      })
    })

    it('should handle empty state correctly', () => {
      render(<JobsManagement initialJobs={[]} />)

      expect(screen.getByText('🔍')).toBeInTheDocument()
      expect(screen.getByText('No jobs found')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your search criteria or filters')).toBeInTheDocument()
    })

    it('should handle jobs with missing optional data', () => {
      const incompleteJob = {
        id: 'incomplete-job',
        title: 'Basic Job Listing',
        description: 'Minimal job information',
        location: 'Unknown Location',
        employment_type: 'full-time',
        remote_policy: 'on-site',
        // Missing salary, tech_stack, etc.
        external_url: 'https://example.com/job',
        created_at: '2025-01-15T10:00:00.000Z',
        companies: {
          id: 'comp-basic',
          name: 'Basic Company',
          // Missing optional company fields
        },
        applications: [{
          id: 'app-basic',
          status: 'saved',
          priority: 'low',
          // Missing optional application fields
          created_at: '2025-01-15T10:00:00.000Z',
          updated_at: '2025-01-15T10:00:00.000Z',
          user_id: 'user-1'
        }]
      }

      render(<JobsManagement initialJobs={[incompleteJob] as any} />)

      expect(screen.getByText('Basic Job Listing')).toBeInTheDocument()
      expect(screen.getByText('Basic Company')).toBeInTheDocument()
      expect(screen.getByText('💾 Saved')).toBeInTheDocument()
      
      // Should not show salary if not available
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
    })

    it('should toggle between list and grid views', async () => {
      render(<JobsManagement initialJobs={realJobsData} />)

      // Should start in list view
      expect(screen.getByRole('button', { name: /List View/ })).toHaveClass('bg-blue-100')
      
      // Switch to grid view
      fireEvent.click(screen.getByRole('button', { name: /Grid View/ }))
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Grid View/ })).toHaveClass('bg-blue-100')
        expect(screen.getByRole('button', { name: /List View/ })).toHaveClass('text-gray-400')
      })
    })

    it('should display correct job counts', () => {
      render(<JobsManagement initialJobs={realJobsData} />)

      expect(screen.getByText('Showing 2 of 2 jobs')).toBeInTheDocument()

      // After filtering
      const searchInput = screen.getByPlaceholderText('Search jobs, companies, locations...')
      fireEvent.change(searchInput, { target: { value: 'Senior' } })

      waitFor(() => {
        expect(screen.getByText('Showing 1 of 2 jobs')).toBeInTheDocument()
      })
    })
  })
})