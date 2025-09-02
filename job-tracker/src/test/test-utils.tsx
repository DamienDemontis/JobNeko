import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'

// Test data factories to ensure consistent test data
export const createTestUser = (overrides?: Partial<any>) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  ...overrides
})

export const createTestCompany = (overrides?: Partial<any>) => ({
  id: 'test-company-id',
  name: 'Test Company',
  industry: 'Technology',
  size: 'medium',
  website: 'https://testcompany.com',
  ...overrides
})

export const createTestJob = (overrides?: Partial<any>) => ({
  id: 'test-job-id',
  title: 'Software Developer',
  description: 'A great job opportunity for a software developer.',
  location: 'San Francisco, CA',
  employment_type: 'full-time',
  remote_policy: 'remote',
  salary_min: 80000,
  salary_max: 120000,
  currency: 'USD',
  job_level: 'mid',
  tech_stack: ['JavaScript', 'React', 'Node.js'],
  industry: 'Technology',
  external_url: 'https://example.com/job/123',
  created_at: '2025-01-01T00:00:00.000Z',
  companies: createTestCompany(),
  ...overrides
})

export const createTestApplication = (overrides?: Partial<any>) => ({
  id: 'test-app-id',
  status: 'saved',
  priority: 'medium',
  notes: 'Test application notes',
  applied_at: null,
  deadline: null,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  user_id: 'test-user-id',
  ...overrides
})

export const createTestJobWithApplication = (jobOverrides?: Partial<any>, appOverrides?: Partial<any>) => ({
  ...createTestJob(jobOverrides),
  applications: [createTestApplication(appOverrides)]
})

export const createTestExtractionJob = (overrides?: Partial<any>) => ({
  id: 'test-extraction-job-id',
  url: 'https://example.com/job/123',
  status: 'completed',
  createdAt: '2025-01-01T00:00:00.000Z',
  completedAt: '2025-01-01T00:10:00.000Z',
  result: {
    job: createTestJob(),
    extractedData: {
      title: 'Software Developer',
      company: 'Test Company',
      location: 'San Francisco, CA',
      salary: '$80k-$120k',
      employmentType: 'full-time',
      remotePolicy: 'remote',
      description: 'A great job opportunity.',
      url: 'https://example.com/job/123',
      extractedAt: '2025-01-01T00:10:00.000Z',
      source: 'ai-extraction'
    }
  },
  error: null,
  ...overrides
})

// Mock fetch responses
export const mockFetchSuccess = (data: any) => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
    status: 200,
    statusText: 'OK'
  } as Response)
}

export const mockFetchError = (status: number = 500, statusText: string = 'Internal Server Error') => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve({ error: statusText })
  } as Response)
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options })

export * from '@testing-library/react'
export { customRender as render }