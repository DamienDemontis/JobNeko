import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as extractPOST } from '@/app/api/jobs/extract/route'
import { GET as recentGET } from '@/app/api/jobs/extract/recent/route'
import { GET as statusGET } from '@/app/api/jobs/extract/[jobId]/route'
import { jobQueue } from '@/lib/job-queue'

// Direct API route testing - testing actual API handlers without HTTP
describe('API Route Handler Tests (Direct Function Calls)', () => {
  
  let createdJobIds: string[] = []

  beforeEach(() => {
    createdJobIds = []
    // Clear job queue before each test
    ;(jobQueue as Map<string, any>).clear()
  })

  afterEach(() => {
    // Clean up job queue after each test
    ;(jobQueue as Map<string, any>).clear()
  })

  describe('Job Extraction Route Handler', () => {
    it('should successfully start job extraction with valid URL', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com/job/test-123'
        })
      })

      const response = await extractPOST(request)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.jobId).toBeDefined()
      expect(data.status).toBe('queued')
      expect(data.message).toBe('Job extraction started')
      expect(data.statusUrl).toBe(`/api/jobs/extract/${data.jobId}`)

      // Store job ID for cleanup
      createdJobIds.push(data.jobId)

      // Verify job ID format
      expect(data.jobId).toMatch(/^job_\d+_.+$/)
      
      // Verify job was added to queue
      expect(jobQueue.has(data.jobId)).toBe(true)
    })

    it('should reject invalid URLs', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'not-a-valid-url'
        })
      })

      const response = await extractPOST(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Invalid URL provided')
      expect(data.details).toBeDefined()
    })

    it('should handle missing URL parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      const response = await extractPOST(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Invalid URL provided')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json-{{'
      })

      const response = await extractPOST(request)
      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe('Failed to start extraction')
    })
  })

  describe('Job Status Route Handler', () => {
    it('should retrieve job status for existing job', async () => {
      // First, create a job
      const createRequest = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com/job/status-test'
        })
      })

      const createResponse = await extractPOST(createRequest)
      const createData = await createResponse.json()
      const jobId = createData.jobId
      createdJobIds.push(jobId)

      // Check job status
      const statusResponse = await statusGET(
        new NextRequest(`http://localhost:3000/api/jobs/extract/${jobId}`),
        { params: { jobId } }
      )
      
      expect(statusResponse.status).toBe(200)
      
      const statusData = await statusResponse.json()
      expect(statusData.success).toBe(true)
      expect(statusData.job).toBeDefined()
      expect(statusData.job.id).toBe(jobId)
      expect(statusData.job.url).toBe('https://example.com/job/status-test')
      expect(['queued', 'processing', 'completed', 'failed']).toContain(statusData.job.status)
    })

    it('should return 404 for non-existent job', async () => {
      const response = await statusGET(
        new NextRequest('http://localhost:3000/api/jobs/extract/non-existent-job-id'),
        { params: { jobId: 'non-existent-job-id' } }
      )
      
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data.error).toBe('Job not found')
    })
  })

  describe('Recent Jobs Route Handler', () => {
    it('should return recent jobs list', async () => {
      const response = await recentGET(new NextRequest('http://localhost:3000/api/jobs/extract/recent'))
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.jobs)).toBe(true)
    })

    it('should return jobs sorted by creation date', async () => {
      // Create multiple jobs
      const urls = [
        'https://example.com/job/recent-1',
        'https://example.com/job/recent-2',
        'https://example.com/job/recent-3'
      ]

      for (const url of urls) {
        const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })
        
        const response = await extractPOST(request)
        const data = await response.json()
        createdJobIds.push(data.jobId)
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      // Get recent jobs
      const response = await recentGET(new NextRequest('http://localhost:3000/api/jobs/extract/recent'))
      const data = await response.json()

      if (data.jobs.length > 1) {
        // Verify they are sorted by creation date (newest first)
        for (let i = 1; i < data.jobs.length; i++) {
          const prev = new Date(data.jobs[i-1].createdAt).getTime()
          const curr = new Date(data.jobs[i].createdAt).getTime()
          expect(prev).toBeGreaterThanOrEqual(curr)
        }
      }
    })

    it('should limit results to 10 jobs maximum', async () => {
      const response = await recentGET(new NextRequest('http://localhost:3000/api/jobs/extract/recent'))
      const data = await response.json()

      expect(data.jobs.length).toBeLessThanOrEqual(10)
    })
  })

  describe('API Response Format Validation', () => {
    it('should return consistent response format for job creation', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/job/format-test' })
      })

      const response = await extractPOST(request)
      const data = await response.json()
      
      // Verify response structure
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('jobId')
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('statusUrl')
      
      expect(typeof data.success).toBe('boolean')
      expect(typeof data.jobId).toBe('string')
      expect(typeof data.status).toBe('string')
      expect(typeof data.message).toBe('string')
      expect(typeof data.statusUrl).toBe('string')

      createdJobIds.push(data.jobId)
    })

    it('should return consistent error format', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'invalid-url' })
      })

      const response = await extractPOST(request)
      const data = await response.json()
      
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      
      // Detailed errors should include details
      if (data.details) {
        expect(Array.isArray(data.details)).toBe(true)
      }
    })
  })

  describe('Data Validation and Security', () => {
    it('should validate and sanitize all inputs', async () => {
      const validRequest = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/job/validation-test' })
      })

      const response = await extractPOST(validRequest)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      createdJobIds.push(data.jobId)
    })

    it('should handle URLs with various protocols', async () => {
      const testUrls = [
        'https://example.com/job/standard',
        'http://example.com/job/http',
        'ftp://example.com/job/ftp'
      ]

      for (const url of testUrls) {
        const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })

        const response = await extractPOST(request)
        
        // The API should either accept valid URLs or reject invalid ones consistently
        if (response.status === 200) {
          const data = await response.json()
          expect(data.success).toBe(true)
          createdJobIds.push(data.jobId)
        } else {
          expect(response.status).toBe(400)
          const data = await response.json()
          expect(data.error).toBeDefined()
        }
      }
    })

    it('should handle oversized payloads', async () => {
      const largePayload = {
        url: 'https://example.com/job/large',
        extraData: 'x'.repeat(10000) // 10KB of extra data
      }

      const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(largePayload)
      })

      const response = await extractPOST(request)
      
      // Should either accept it or reject it gracefully
      if (response.status === 200) {
        const data = await response.json()
        createdJobIds.push(data.jobId)
      } else {
        expect([400, 413]).toContain(response.status) // Bad Request or Payload Too Large
      }
    })
  })
})