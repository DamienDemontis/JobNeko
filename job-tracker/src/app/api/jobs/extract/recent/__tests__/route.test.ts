import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '../route'
import { jobQueue } from '@/lib/job-queue'
import { NextRequest } from 'next/server'

// Mock the job queue
vi.mock('@/lib/job-queue', () => ({
  jobQueue: new Map()
}))

describe('/api/jobs/extract/recent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(jobQueue as Map<string, any>).clear()
  })

  describe('GET - Get recent extraction jobs', () => {
    it('should return empty array when no jobs exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/extract/recent')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.jobs).toEqual([])
    })

    it('should return jobs sorted by creation date descending', async () => {
      const job1 = {
        id: 'job_1',
        url: 'https://example.com/job/1',
        status: 'completed',
        createdAt: '2025-01-01T09:00:00.000Z'
      }
      const job2 = {
        id: 'job_2', 
        url: 'https://example.com/job/2',
        status: 'processing',
        createdAt: '2025-01-01T10:00:00.000Z'
      }
      const job3 = {
        id: 'job_3',
        url: 'https://example.com/job/3', 
        status: 'failed',
        createdAt: '2025-01-01T11:00:00.000Z'
      }

      jobQueue.set('job_1', job1)
      jobQueue.set('job_2', job2)
      jobQueue.set('job_3', job3)

      const request = new NextRequest('http://localhost:3000/api/jobs/extract/recent')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.jobs).toHaveLength(3)
      expect(data.jobs[0].id).toBe('job_3') // Most recent first
      expect(data.jobs[1].id).toBe('job_2')
      expect(data.jobs[2].id).toBe('job_1') // Oldest last
    })

    it('should limit results to 10 jobs', async () => {
      // Add 15 test jobs
      for (let i = 1; i <= 15; i++) {
        const job = {
          id: `job_${i}`,
          url: `https://example.com/job/${i}`,
          status: i % 3 === 0 ? 'completed' : i % 2 === 0 ? 'processing' : 'queued',
          createdAt: `2025-01-01T${String(i).padStart(2, '0')}:00:00.000Z`
        }
        jobQueue.set(`job_${i}`, job)
      }

      const request = new NextRequest('http://localhost:3000/api/jobs/extract/recent')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.jobs).toHaveLength(10)
      
      // Should be the 10 most recent (jobs 15, 14, 13, ..., 6)
      expect(data.jobs[0].id).toBe('job_15')
      expect(data.jobs[9].id).toBe('job_6')
    })

    it('should include all job statuses and details', async () => {
      const completedJob = {
        id: 'completed-job',
        url: 'https://example.com/completed',
        status: 'completed',
        createdAt: '2025-01-01T10:00:00.000Z',
        completedAt: '2025-01-01T10:05:00.000Z',
        result: {
          job: { id: 'job-123', title: 'Test Job' },
          extractedData: { title: 'Test Job', company: 'Test Co' }
        }
      }

      const failedJob = {
        id: 'failed-job',
        url: 'https://example.com/failed',
        status: 'failed',
        createdAt: '2025-01-01T09:00:00.000Z',
        error: 'Extraction failed due to timeout'
      }

      const processingJob = {
        id: 'processing-job',
        url: 'https://example.com/processing',
        status: 'processing',
        createdAt: '2025-01-01T11:00:00.000Z',
        startedAt: '2025-01-01T11:01:00.000Z'
      }

      jobQueue.set('completed-job', completedJob)
      jobQueue.set('failed-job', failedJob)
      jobQueue.set('processing-job', processingJob)

      const request = new NextRequest('http://localhost:3000/api/jobs/extract/recent')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.jobs).toHaveLength(3)

      // Find each job in the results
      const completed = data.jobs.find((job: any) => job.id === 'completed-job')
      const failed = data.jobs.find((job: any) => job.id === 'failed-job')
      const processing = data.jobs.find((job: any) => job.id === 'processing-job')

      expect(completed.status).toBe('completed')
      expect(completed.result).toBeDefined()
      expect(completed.completedAt).toBe('2025-01-01T10:05:00.000Z')

      expect(failed.status).toBe('failed')
      expect(failed.error).toBe('Extraction failed due to timeout')

      expect(processing.status).toBe('processing')
      expect(processing.startedAt).toBe('2025-01-01T11:01:00.000Z')
    })

    it('should handle server errors gracefully', async () => {
      // Mock an error in the job queue access
      const mockJobQueue = {
        values: vi.fn(() => {
          throw new Error('Database connection failed')
        })
      }
      
      vi.mocked(jobQueue).values = mockJobQueue.values

      const request = new NextRequest('http://localhost:3000/api/jobs/extract/recent')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch recent jobs')
    })
  })
})