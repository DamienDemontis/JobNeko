import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST, GET } from '../route'
import { jobQueue } from '@/lib/job-queue'
import { NextRequest } from 'next/server'

// Mock the job queue
vi.mock('@/lib/job-queue', () => ({
  jobQueue: new Map()
}))

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-job-id' }, error: null }))
        }))
      }))
    }))
  }))
}))

describe('/api/jobs/extract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(jobQueue as Map<string, any>).clear()
  })

  describe('POST - Start job extraction', () => {
    it('should start a job extraction with valid URL', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com/job/123' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.jobId).toMatch(/^job_\d+_.+$/)
      expect(data.status).toBe('queued')
      expect(data.message).toBe('Job extraction started')
      expect(data.statusUrl).toBe(`/api/jobs/extract/${data.jobId}`)
    })

    it('should reject invalid URL', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        body: JSON.stringify({ url: 'not-a-url' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid URL provided')
      expect(data.details).toBeDefined()
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to start extraction')
    })

    it('should add job to queue immediately', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com/job/123' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(jobQueue.size).toBe(1)
      const job = jobQueue.get(data.jobId)
      expect(job).toBeDefined()
      expect(job.url).toBe('https://example.com/job/123')
      expect(job.status).toBe('queued')
      expect(job.id).toBe(data.jobId)
    })
  })

  describe('GET - List recent jobs', () => {
    it('should return empty list when no jobs', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/extract')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.jobs).toEqual([])
    })

    it('should return recent jobs sorted by creation date', async () => {
      // Add test jobs to queue
      const job1 = {
        id: 'job_1',
        url: 'https://example.com/job/1',
        status: 'completed',
        createdAt: '2025-01-01T10:00:00.000Z'
      }
      const job2 = {
        id: 'job_2',
        url: 'https://example.com/job/2',
        status: 'processing',
        createdAt: '2025-01-01T11:00:00.000Z'
      }
      
      jobQueue.set('job_1', job1)
      jobQueue.set('job_2', job2)

      const request = new NextRequest('http://localhost:3000/api/jobs/extract')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.jobs).toHaveLength(2)
      expect(data.jobs[0].id).toBe('job_2') // Most recent first
      expect(data.jobs[1].id).toBe('job_1')
    })

    it('should limit to 10 jobs maximum', async () => {
      // Add 15 test jobs
      for (let i = 1; i <= 15; i++) {
        jobQueue.set(`job_${i}`, {
          id: `job_${i}`,
          url: `https://example.com/job/${i}`,
          status: 'completed',
          createdAt: `2025-01-01T${10 + i}:00:00.000Z`
        })
      }

      const request = new NextRequest('http://localhost:3000/api/jobs/extract')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.jobs).toHaveLength(10)
    })
  })
})

describe('Job processing background function', () => {
  it('should handle extraction API failure gracefully', async () => {
    // Mock fetch to fail
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    const testJob = {
      id: 'test-job-id',
      url: 'https://example.com/job/123',
      status: 'queued',
      createdAt: new Date().toISOString()
    }
    jobQueue.set('test-job-id', testJob)

    // Import and call the processing function
    const { POST } = await import('../route')
    
    // Wait for background processing to complete
    await new Promise(resolve => setTimeout(resolve, 100))

    const job = jobQueue.get('test-job-id')
    expect(job.status).toBe('failed')
    expect(job.error).toBeDefined()
  })
})