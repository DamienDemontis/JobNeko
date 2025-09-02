import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { JobsManagement } from '../jobs-management'
import { createTestJobWithApplication } from '@/test/test-utils'

const mockJobs = [
  createTestJobWithApplication(
    {
      id: 'job-1',
      title: 'Senior React Developer',
      location: 'San Francisco, CA',
      companies: { id: 'comp-1', name: 'TechCorp', size: 'large' },
      salary_min: 100000,
      salary_max: 150000,
      remote_policy: 'remote',
      tech_stack: ['React', 'TypeScript', 'Node.js']
    },
    {
      id: 'app-1',
      status: 'applied',
      priority: 'high',
      updated_at: '2025-01-15T10:00:00.000Z'
    }
  ),
  createTestJobWithApplication(
    {
      id: 'job-2',
      title: 'Backend Engineer',
      location: 'New York, NY',
      companies: { id: 'comp-2', name: 'StartupCo', size: 'startup' },
      salary_min: 80000,
      salary_max: 120000,
      remote_policy: 'hybrid',
      tech_stack: ['Python', 'Django', 'PostgreSQL']
    },
    {
      id: 'app-2',
      status: 'saved',
      priority: 'medium',
      updated_at: '2025-01-14T10:00:00.000Z'
    }
  ),
  createTestJobWithApplication(
    {
      id: 'job-3',
      title: 'Frontend Developer',
      location: 'Austin, TX',
      companies: { id: 'comp-3', name: 'BigCorp', size: 'enterprise' },
      salary_min: 70000,
      salary_max: 100000,
      remote_policy: 'on-site',
      tech_stack: ['Vue.js', 'JavaScript']
    },
    {
      id: 'app-3',
      status: 'interviewing',
      priority: 'low',
      updated_at: '2025-01-13T10:00:00.000Z'
    }
  )
]

describe('JobsManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render all jobs in list view by default', () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
      expect(screen.getByText('Backend Engineer')).toBeInTheDocument()
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument()
      expect(screen.getByText('Showing 3 of 3 jobs')).toBeInTheDocument()
    })

    it('should display job details correctly', () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      expect(screen.getByText('TechCorp')).toBeInTheDocument()
      expect(screen.getByText('📍 San Francisco, CA')).toBeInTheDocument()
      expect(screen.getByText('🏠 Remote')).toBeInTheDocument()
      expect(screen.getByText('📝 Applied')).toBeInTheDocument()
      expect(screen.getByText('🔥 High Priority')).toBeInTheDocument()
      expect(screen.getByText('💰 $100,000-150,000 USD')).toBeInTheDocument()
    })

    it('should show empty state when no jobs', () => {
      render(<JobsManagement initialJobs={[]} />)
      
      expect(screen.getByText('🔍')).toBeInTheDocument()
      expect(screen.getByText('No jobs found')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your search criteria or filters')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should filter jobs by title', async () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      const searchInput = screen.getByPlaceholderText('Search jobs, companies, locations...')
      fireEvent.change(searchInput, { target: { value: 'React' } })
      
      await waitFor(() => {
        expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
        expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument()
        expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument()
        expect(screen.getByText('Showing 1 of 3 jobs')).toBeInTheDocument()
      })
    })

    it('should filter jobs by company name', async () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      const searchInput = screen.getByPlaceholderText('Search jobs, companies, locations...')
      fireEvent.change(searchInput, { target: { value: 'StartupCo' } })
      
      await waitFor(() => {
        expect(screen.getByText('Backend Engineer')).toBeInTheDocument()
        expect(screen.queryByText('Senior React Developer')).not.toBeInTheDocument()
        expect(screen.getByText('Showing 1 of 3 jobs')).toBeInTheDocument()
      })
    })

    it('should filter jobs by location', async () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      const searchInput = screen.getByPlaceholderText('Search jobs, companies, locations...')
      fireEvent.change(searchInput, { target: { value: 'New York' } })
      
      await waitFor(() => {
        expect(screen.getByText('Backend Engineer')).toBeInTheDocument()
        expect(screen.queryByText('Senior React Developer')).not.toBeInTheDocument()
        expect(screen.getByText('Showing 1 of 3 jobs')).toBeInTheDocument()
      })
    })

    it('should filter jobs by tech stack', async () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      const searchInput = screen.getByPlaceholderText('Search jobs, companies, locations...')
      fireEvent.change(searchInput, { target: { value: 'TypeScript' } })
      
      await waitFor(() => {
        expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
        expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument()
        expect(screen.getByText('Showing 1 of 3 jobs')).toBeInTheDocument()
      })
    })
  })

  describe('Filtering', () => {
    it('should filter jobs by status', async () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      const statusFilter = screen.getByDisplayValue('All Status')
      fireEvent.change(statusFilter, { target: { value: 'applied' } })
      
      await waitFor(() => {
        expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
        expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument()
        expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument()
        expect(screen.getByText('Showing 1 of 3 jobs')).toBeInTheDocument()
      })
    })

    it('should filter jobs by remote policy', async () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      const remoteFilter = screen.getByDisplayValue('All Locations')
      fireEvent.change(remoteFilter, { target: { value: 'remote' } })
      
      await waitFor(() => {
        expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
        expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument()
        expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument()
        expect(screen.getByText('Showing 1 of 3 jobs')).toBeInTheDocument()
      })
    })

    it('should filter jobs by priority', async () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      const priorityFilter = screen.getByDisplayValue('All Priority')
      fireEvent.change(priorityFilter, { target: { value: 'high' } })
      
      await waitFor(() => {
        expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
        expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument()
        expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument()
        expect(screen.getByText('Showing 1 of 3 jobs')).toBeInTheDocument()
      })
    })

    it('should combine multiple filters', async () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      const searchInput = screen.getByPlaceholderText('Search jobs, companies, locations...')
      const statusFilter = screen.getByDisplayValue('All Status')
      
      fireEvent.change(searchInput, { target: { value: 'Developer' } })
      fireEvent.change(statusFilter, { target: { value: 'saved' } })
      
      await waitFor(() => {
        expect(screen.queryByText('Senior React Developer')).not.toBeInTheDocument()
        expect(screen.getByText('Backend Engineer')).toBeInTheDocument() // Has "Developer" in description, status is saved
        expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument() // Status is interviewing, not saved
        expect(screen.getByText('Showing 1 of 3 jobs')).toBeInTheDocument()
      })
    })
  })

  describe('Sorting', () => {
    it('should sort jobs by update date (default)', () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      const jobTitles = screen.getAllByRole('heading', { level: 3 })
      expect(jobTitles[0]).toHaveTextContent('Senior React Developer') // Most recent
      expect(jobTitles[1]).toHaveTextContent('Backend Engineer')
      expect(jobTitles[2]).toHaveTextContent('Frontend Developer') // Oldest
    })

    it('should sort jobs by title A-Z', async () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      const sortSelect = screen.getByDisplayValue('Recently Updated')
      fireEvent.change(sortSelect, { target: { value: 'title-asc' } })
      
      await waitFor(() => {
        const jobTitles = screen.getAllByRole('heading', { level: 3 })
        expect(jobTitles[0]).toHaveTextContent('Backend Engineer')
        expect(jobTitles[1]).toHaveTextContent('Frontend Developer')
        expect(jobTitles[2]).toHaveTextContent('Senior React Developer')
      })
    })

    it('should sort jobs by company name', async () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      const sortSelect = screen.getByDisplayValue('Recently Updated')
      fireEvent.change(sortSelect, { target: { value: 'company-asc' } })
      
      await waitFor(() => {
        const companies = screen.getAllByText(/TechCorp|StartupCo|BigCorp/)
        expect(companies[0]).toHaveTextContent('BigCorp')
        expect(companies[1]).toHaveTextContent('StartupCo')
        expect(companies[2]).toHaveTextContent('TechCorp')
      })
    })

    it('should sort jobs by salary high to low', async () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      const sortSelect = screen.getByDisplayValue('Recently Updated')
      fireEvent.change(sortSelect, { target: { value: 'salary-desc' } })
      
      await waitFor(() => {
        const salaries = screen.getAllByText(/\$[\d,]+-[\d,]+ USD/)
        expect(salaries[0]).toHaveTextContent('$100,000-150,000 USD')
        expect(salaries[1]).toHaveTextContent('$80,000-120,000 USD')
        expect(salaries[2]).toHaveTextContent('$70,000-100,000 USD')
      })
    })
  })

  describe('View Toggle', () => {
    it('should switch between list and grid view', async () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      // Initially in list view
      expect(screen.getByRole('button', { name: /List View/ })).toHaveClass('bg-blue-100')
      expect(screen.getByRole('button', { name: /Grid View/ })).toHaveClass('text-gray-400')
      
      // Switch to grid view
      fireEvent.click(screen.getByRole('button', { name: /Grid View/ }))
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Grid View/ })).toHaveClass('bg-blue-100')
        expect(screen.getByRole('button', { name: /List View/ })).toHaveClass('text-gray-400')
      })
    })
  })

  describe('Job Detail View', () => {
    it('should open job detail when job is clicked', async () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      // Click on a job
      fireEvent.click(screen.getByText('Senior React Developer'))
      
      await waitFor(() => {
        expect(screen.getByText('← Back to Jobs')).toBeInTheDocument()
        expect(screen.getByText('Application Details')).toBeInTheDocument()
        expect(screen.getByText('Tech Stack')).toBeInTheDocument()
        expect(screen.getByText('Job Description')).toBeInTheDocument()
      })
    })

    it('should show job details correctly in detail view', async () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      fireEvent.click(screen.getByText('Senior React Developer'))
      
      await waitFor(() => {
        expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
        expect(screen.getByText('TechCorp')).toBeInTheDocument()
        expect(screen.getByText('📍 San Francisco, CA')).toBeInTheDocument()
        expect(screen.getByText('🏠 Remote')).toBeInTheDocument()
        expect(screen.getByText('React')).toBeInTheDocument()
        expect(screen.getByText('TypeScript')).toBeInTheDocument()
        expect(screen.getByText('Node.js')).toBeInTheDocument()
        expect(screen.getByText('$100,000-150,000 USD')).toBeInTheDocument()
      })
    })

    it('should return to job list when back button is clicked', async () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      fireEvent.click(screen.getByText('Senior React Developer'))
      
      await waitFor(() => {
        expect(screen.getByText('← Back to Jobs')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('← Back to Jobs'))
      
      await waitFor(() => {
        expect(screen.getByText('Showing 3 of 3 jobs')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Search jobs, companies, locations...')).toBeInTheDocument()
      })
    })
  })

  describe('Badge Rendering', () => {
    it('should render status badges correctly', () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      expect(screen.getByText('📝 Applied')).toBeInTheDocument()
      expect(screen.getByText('💾 Saved')).toBeInTheDocument()
      expect(screen.getByText('🎯 Interviewing')).toBeInTheDocument()
    })

    it('should render priority badges correctly', () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      expect(screen.getByText('🔥 High Priority')).toBeInTheDocument()
      expect(screen.getByText('⭐ Medium')).toBeInTheDocument()
      // Low priority jobs don't show priority badge
    })

    it('should render remote policy badges correctly', () => {
      render(<JobsManagement initialJobs={mockJobs} />)
      
      expect(screen.getByText('🏠 Remote')).toBeInTheDocument()
      expect(screen.getByText('🏢 Hybrid')).toBeInTheDocument()
      expect(screen.getByText('🏛️ On-site')).toBeInTheDocument()
    })
  })

  describe('Time Display', () => {
    it('should format relative time correctly', () => {
      // Mock current time
      const mockDate = new Date('2025-01-15T12:00:00.000Z')
      vi.setSystemTime(mockDate)
      
      render(<JobsManagement initialJobs={mockJobs} />)
      
      // Job updated 2 hours ago
      expect(screen.getByText('2h ago')).toBeInTheDocument()
      
      vi.useRealTimers()
    })
  })
})