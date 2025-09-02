import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '../route'
import { jobQueue } from '@/lib/job-queue'
import { NextRequest } from 'next/server'

// Mock the job queue
vi.mock('@/lib/job-queue', () => ({
  jobQueue: new Map()
}))

describe('/api/jobs/extract/[jobId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(jobQueue as Map<string, any>).clear()
  })

  describe('GET - Get job status', () => {
    it('should return job status when job exists', async () => {
      const testJob = {
        id: 'test-job-id',
        url: 'https://example.com/job/123',
        status: 'completed',
        createdAt: '2025-01-01T10:00:00.000Z',
        completedAt: '2025-01-01T10:05:00.000Z',
        result: {
          job: { id: 'job-123', title: 'Test Job' }
        }
      }
      
      jobQueue.set('test-job-id', testJob)

      const request = new NextRequest('http://localhost:3000/api/jobs/extract/test-job-id')
      const response = await GET(request, { 
        params: Promise.resolve({ jobId: 'test-job-id' }) 
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.job).toEqual(testJob)
    })

    it('should return 404 when job does not exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/extract/nonexistent-job')
      const response = await GET(request, { 
        params: Promise.resolve({ jobId: 'nonexistent-job' }) 
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Job not found')
    })

    it('should return 404 when jobId is empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/extract/')
      const response = await GET(request, { 
        params: Promise.resolve({ jobId: '' }) 
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Job not found')
    })

    it('should return different statuses correctly', async () => {
      const statuses = ['queued', 'processing', 'completed', 'failed']
      
      for (const status of statuses) {
        const testJob = {
          id: `job-${status}`,
          url: 'https://example.com/job/123',
          status,
          createdAt: '2025-01-01T10:00:00.000Z',
          ...(status === 'completed' && { completedAt: '2025-01-01T10:05:00.000Z' }),
          ...(status === 'failed' && { error: 'Test error message' })
        }
        
        jobQueue.set(`job-${status}`, testJob)

        const request = new NextRequest(`http://localhost:3000/api/jobs/extract/job-${status}`)
        const response = await GET(request, { 
          params: Promise.resolve({ jobId: `job-${status}` }) 
        })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.job.status).toBe(status)
        
        if (status === 'completed') {
          expect(data.job.completedAt).toBeDefined()
        }
        if (status === 'failed') {
          expect(data.job.error).toBe('Test error message')
        }
      }
    })
  })
})