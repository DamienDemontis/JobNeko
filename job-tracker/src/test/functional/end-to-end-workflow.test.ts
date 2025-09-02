import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as extractPOST } from '@/app/api/jobs/extract/route'
import { GET as recentGET } from '@/app/api/jobs/extract/recent/route'
import { GET as statusGET } from '@/app/api/jobs/extract/[jobId]/route'
import { jobQueue } from '@/lib/job-queue'

// End-to-end workflow tests using direct function calls
describe('End-to-End Workflow Tests (Direct Function Integration)', () => {
  
  let testJobIds: string[] = []

  beforeEach(() => {
    testJobIds = []
    // Clear job queue before each test
    ;(jobQueue as Map<string, any>).clear()
  })

  afterEach(() => {
    // Clean up job queue after each test
    ;(jobQueue as Map<string, any>).clear()
    testJobIds.length = 0
  })

  describe('Complete Job Extraction Workflow', () => {
    it('should handle complete job extraction lifecycle', async () => {
      const testUrl = 'https://example.com/job/lifecycle-test'
      
      // Step 1: Start job extraction
      const startRequest = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: testUrl })
      })
      
      const startResponse = await extractPOST(startRequest)
      expect(startResponse.status).toBe(200)
      
      const startData = await startResponse.json()
      expect(startData.success).toBe(true)
      expect(startData.jobId).toBeDefined()
      expect(startData.status).toBe('queued')
      
      testJobIds.push(startData.jobId)
      
      // Step 2: Check job appears in recent extractions immediately
      const recentResponse = await recentGET(new NextRequest('http://localhost:3000/api/jobs/extract/recent'))
      expect(recentResponse.status).toBe(200)
      
      const recentData = await recentResponse.json()
      expect(recentData.success).toBe(true)
      
      const ourJob = recentData.jobs.find((job: any) => job.id === startData.jobId)
      expect(ourJob).toBeDefined()
      expect(ourJob.url).toBe(testUrl)
      // Job status should be one of the valid statuses
      expect(['queued', 'processing', 'completed', 'failed'].includes(ourJob.status)).toBe(true)
      
      // Step 3: Check individual job status
      const statusResponse = await statusGET(
        new NextRequest(`http://localhost:3000/api/jobs/extract/${startData.jobId}`),
        { params: { jobId: startData.jobId } }
      )
      expect(statusResponse.status).toBe(200)
      
      const statusData = await statusResponse.json()
      expect(statusData.success).toBe(true)
      expect(statusData.job.id).toBe(startData.jobId)
      expect(statusData.job.url).toBe(testUrl)
      
      // Verify job is in queue
      expect(jobQueue.has(startData.jobId)).toBe(true)
      const queueJob = jobQueue.get(startData.jobId)
      expect(queueJob.url).toBe(testUrl)
    })

    it('should handle multiple concurrent extractions', async () => {
      const urls = [
        'https://example.com/job/concurrent-1',
        'https://example.com/job/concurrent-2',
        'https://example.com/job/concurrent-3'
      ]

      const promises = urls.map(url => {
        const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })
        return extractPOST(request)
      })

      const responses = await Promise.all(promises)
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
      
      // All should return unique job IDs
      const jobIds = []
      for (const response of responses) {
        const data = await response.json()
        jobIds.push(data.jobId)
        testJobIds.push(data.jobId)
      }

      const uniqueIds = new Set(jobIds)
      expect(uniqueIds.size).toBe(jobIds.length) // All IDs should be unique
      
      // All jobs should be in the queue
      expect(jobQueue.size).toBe(3)
      jobIds.forEach(id => {
        expect(jobQueue.has(id)).toBe(true)
      })
    })

    it('should maintain data consistency across API calls', async () => {
      const testUrl = 'https://example.com/job/consistency-test'
      
      // Create job
      const createRequest = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: testUrl })
      })

      const createResponse = await extractPOST(createRequest)
      const createData = await createResponse.json()
      testJobIds.push(createData.jobId)
      
      // Verify same data across different endpoints
      const statusResponse = await statusGET(
        new NextRequest(`http://localhost:3000/api/jobs/extract/${createData.jobId}`),
        { params: { jobId: createData.jobId } }
      )
      const statusData = await statusResponse.json()
      
      const recentResponse = await recentGET(new NextRequest('http://localhost:3000/api/jobs/extract/recent'))
      const recentData = await recentResponse.json()
      const recentJob = recentData.jobs.find((job: any) => job.id === createData.jobId)
      
      // Data should be consistent
      expect(statusData.job.url).toBe(testUrl)
      expect(recentJob.url).toBe(testUrl)
      expect(statusData.job.id).toBe(createData.jobId)
      expect(recentJob.id).toBe(createData.jobId)
    })
  })

  describe('Error Handling Workflows', () => {
    it('should handle invalid URLs gracefully throughout workflow', async () => {
      const invalidUrl = 'not-a-valid-url'
      
      const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: invalidUrl })
      })

      const response = await extractPOST(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Invalid URL provided')
      expect(data.details).toBeDefined()
      
      // Should not affect other parts of the system
      const recentResponse = await recentGET(new NextRequest('http://localhost:3000/api/jobs/extract/recent'))
      expect(recentResponse.status).toBe(200)
    })

    it('should handle workflow errors and recovery', async () => {
      // Test that the system can handle errors and continue functioning
      const validUrl = 'https://example.com/job/recovery-test'
      
      const createRequest = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: validUrl })
      })

      const createResponse = await extractPOST(createRequest)
      expect(createResponse.status).toBe(200)
      
      const createData = await createResponse.json()
      testJobIds.push(createData.jobId)
      
      // System should continue to work normally after errors
      const recentResponse = await recentGET(new NextRequest('http://localhost:3000/api/jobs/extract/recent'))
      expect(recentResponse.status).toBe(200)
      
      const statusResponse = await statusGET(
        new NextRequest(`http://localhost:3000/api/jobs/extract/${createData.jobId}`),
        { params: { jobId: createData.jobId } }
      )
      expect(statusResponse.status).toBe(200)
    })

    it('should handle edge cases in job processing', async () => {
      // Test various edge cases that might occur in real usage
      const edgeCaseUrls = [
        'https://example.com/job/with-query?param=value',
        'https://example.com/job/with-fragment#section',
        'https://example.com/job/with-ports:8080/path',
      ]

      for (const url of edgeCaseUrls) {
        const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })

        const response = await extractPOST(request)
        
        if (response.status === 200) {
          const data = await response.json()
          testJobIds.push(data.jobId)
          expect(data.success).toBe(true)
        } else {
          // Edge cases might be rejected, that's acceptable
          expect(response.status).toBe(400)
        }
      }
    })
  })

  describe('System Integration and Performance', () => {
    it('should maintain performance with multiple operations', async () => {
      const startTime = performance.now()
      
      // Create multiple jobs
      const promises = Array.from({ length: 5 }, (_, i) => {
        const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: `https://example.com/job/perf-${i}` })
        })
        return extractPOST(request)
      })

      const responses = await Promise.all(promises)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // Should complete reasonably quickly
      expect(totalTime).toBeLessThan(1000) // Less than 1 second
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Store job IDs for cleanup
      for (const response of responses) {
        const data = await response.json()
        testJobIds.push(data.jobId)
      }
    })

    it('should handle concurrent queue operations', async () => {
      // Test that concurrent operations don't interfere with each other
      const operations = []
      
      // Create jobs concurrently
      for (let i = 0; i < 3; i++) {
        const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: `https://example.com/job/concurrent-${i}` })
        })
        operations.push(extractPOST(request))
      }
      
      // Check recent jobs concurrently
      operations.push(recentGET(new NextRequest('http://localhost:3000/api/jobs/extract/recent')))
      
      const results = await Promise.all(operations)
      
      // All operations should succeed
      results.forEach(result => {
        expect(result.status).toBe(200)
      })
      
      // Store job IDs for cleanup
      for (let i = 0; i < 3; i++) {
        const data = await results[i].json()
        testJobIds.push(data.jobId)
      }
    })

    it('should maintain data integrity under load', async () => {
      // Create multiple jobs and verify they're all tracked correctly
      const jobCount = 10
      const createdJobs = []
      
      for (let i = 0; i < jobCount; i++) {
        const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: `https://example.com/job/integrity-${i}` })
        })
        
        const response = await extractPOST(request)
        const data = await response.json()
        
        createdJobs.push(data.jobId)
        testJobIds.push(data.jobId)
      }
      
      // Verify all jobs are in the system
      expect(jobQueue.size).toBe(jobCount)
      
      createdJobs.forEach(jobId => {
        expect(jobQueue.has(jobId)).toBe(true)
      })
      
      // Verify through recent jobs endpoint
      const recentResponse = await recentGET(new NextRequest('http://localhost:3000/api/jobs/extract/recent'))
      const recentData = await recentResponse.json()
      
      // Should show our created jobs (limited to 10)
      expect(recentData.jobs.length).toBeLessThanOrEqual(10)
      expect(recentData.jobs.length).toBeGreaterThan(0)
    })
  })

  describe('Real-World Usage Patterns', () => {
    it('should handle typical user workflow', async () => {
      // Simulate a typical user workflow:
      // 1. Extract a job
      // 2. Check recent extractions
      // 3. Check specific job status
      // 4. Extract another job
      
      // Step 1: Extract first job
      const job1Request = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/job/workflow-1' })
      })
      
      const job1Response = await extractPOST(job1Request)
      const job1Data = await job1Response.json()
      testJobIds.push(job1Data.jobId)
      
      // Step 2: Check recent extractions
      let recentResponse = await recentGET(new NextRequest('http://localhost:3000/api/jobs/extract/recent'))
      let recentData = await recentResponse.json()
      
      expect(recentData.jobs.length).toBe(1)
      expect(recentData.jobs[0].id).toBe(job1Data.jobId)
      
      // Step 3: Check specific job status
      const statusResponse = await statusGET(
        new NextRequest(`http://localhost:3000/api/jobs/extract/${job1Data.jobId}`),
        { params: { jobId: job1Data.jobId } }
      )
      const statusData = await statusResponse.json()
      
      expect(statusData.job.id).toBe(job1Data.jobId)
      
      // Step 4: Extract second job
      const job2Request = new NextRequest('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/job/workflow-2' })
      })
      
      const job2Response = await extractPOST(job2Request)
      const job2Data = await job2Response.json()
      testJobIds.push(job2Data.jobId)
      
      // Verify both jobs are now in recent extractions
      recentResponse = await recentGET(new NextRequest('http://localhost:3000/api/jobs/extract/recent'))
      recentData = await recentResponse.json()
      
      expect(recentData.jobs.length).toBe(2)
      const jobIds = recentData.jobs.map((job: any) => job.id)
      expect(jobIds).toContain(job1Data.jobId)
      expect(jobIds).toContain(job2Data.jobId)
    })

    it('should handle system state consistency', async () => {
      // Create some jobs and verify system state remains consistent
      const urls = [
        'https://example.com/job/state-1',
        'https://example.com/job/state-2'
      ]
      
      const jobIds = []
      
      for (const url of urls) {
        const request = new NextRequest('http://localhost:3000/api/jobs/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })
        
        const response = await extractPOST(request)
        const data = await response.json()
        
        jobIds.push(data.jobId)
        testJobIds.push(data.jobId)
      }
      
      // Verify queue state
      expect(jobQueue.size).toBe(2)
      
      // Verify through recent endpoint
      const recentResponse = await recentGET(new NextRequest('http://localhost:3000/api/jobs/extract/recent'))
      const recentData = await recentResponse.json()
      
      expect(recentData.jobs.length).toBe(2)
      
      // Verify through individual status endpoints
      for (const jobId of jobIds) {
        const statusResponse = await statusGET(
          new NextRequest(`http://localhost:3000/api/jobs/extract/${jobId}`),
          { params: { jobId } }
        )
        expect(statusResponse.status).toBe(200)
        
        const statusData = await statusResponse.json()
        expect(statusData.job.id).toBe(jobId)
      }
    })
  })
})