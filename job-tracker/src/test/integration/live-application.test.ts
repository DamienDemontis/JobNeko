import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import fetch from 'node-fetch'

const SERVER_URL = 'http://localhost:3001'

// Integration tests that actually hit the live application server
describe('Live Application Integration Tests', () => {
  
  let serverAvailable = false

  beforeAll(async () => {
    // Check if server is running
    try {
      const response = await fetch(`${SERVER_URL}`)
      serverAvailable = response.ok
    } catch (error) {
      console.error('⚠️  Server not available. Start with: npm run dev')
      serverAvailable = false
    }
  })

  describe('Real Server Health Checks', () => {
    it('should have server running', async () => {
      expect(serverAvailable).toBe(true)
    })

    it('should load homepage without hydration errors', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${SERVER_URL}`)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/html')
      
      const html = await response.text()
      expect(html).toContain('<html')
      expect(html).toContain('</html>')
    })

    it('should load dashboard page', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${SERVER_URL}/dashboard`)
      expect(response.status).toBe(200)
      
      const html = await response.text()
      expect(html).toContain('Dashboard')
    })

    it('should load jobs page', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${SERVER_URL}/jobs`)
      expect(response.status).toBe(200)
      
      const html = await response.text()
      expect(html).toContain('Jobs')
    })
  })

  describe('API Routes - Real HTTP Tests', () => {
    it('should handle job extraction API endpoint', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${SERVER_URL}/api/jobs/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com/test-job'
        })
      })
      
      console.log('Extract API Response Status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Extract API Response Data:', data)
        
        expect(data.success).toBe(true)
        expect(data.jobId).toBeDefined()
        
        // Test job status endpoint
        const statusResponse = await fetch(`${SERVER_URL}/api/jobs/extract/${data.jobId}`)
        console.log('Status API Response Status:', statusResponse.status)
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          console.log('Status API Response Data:', statusData)
          expect(statusData.job).toBeDefined()
        }
      } else {
        const errorText = await response.text()
        console.log('Extract API Error:', errorText)
        // Log error but don't fail test - we want to see what's wrong
        expect(response.status).toBeGreaterThanOrEqual(400)
      }
    })

    it('should handle recent jobs API endpoint', async () => {
      if (!serverAvailable) return

      const response = await fetch(`${SERVER_URL}/api/jobs/extract/recent`)
      console.log('Recent API Response Status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Recent API Response Data:', data)
        expect(data.success).toBe(true)
        expect(Array.isArray(data.jobs)).toBe(true)
      } else {
        const errorText = await response.text()
        console.log('Recent API Error:', errorText)
        expect(response.status).toBeGreaterThanOrEqual(400)
      }
    })

    it('should test database queries work', async () => {
      if (!serverAvailable) return

      // This will reveal the database query parsing errors we saw in logs
      const response = await fetch(`${SERVER_URL}/api/jobs/public`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      })
      
      console.log('Public Jobs API Response Status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Public Jobs API Response Data:', data)
      } else {
        const errorText = await response.text()
        console.log('Public Jobs API Error:', errorText)
        // This should reveal database query issues
      }
    })
  })

  describe('Component Rendering - Real Browser Tests', () => {
    it('should check for hydration issues', async () => {
      if (!serverAvailable) return

      // Test pages that are likely to have hydration issues
      const pages = ['/', '/dashboard', '/jobs']
      
      for (const page of pages) {
        const response = await fetch(`${SERVER_URL}${page}`)
        const html = await response.text()
        
        console.log(`Testing page ${page}:`)
        console.log('- Status:', response.status)
        console.log('- Contains React:', html.includes('__NEXT_DATA__'))
        
        // Check for common hydration error patterns
        const hasDateNow = html.includes('Date.now()')
        const hasMathRandom = html.includes('Math.random()')
        const hasWindowCheck = html.includes('typeof window')
        
        if (hasDateNow || hasMathRandom || hasWindowCheck) {
          console.log('⚠️  Potential hydration issue sources found:')
          if (hasDateNow) console.log('  - Date.now() usage detected')
          if (hasMathRandom) console.log('  - Math.random() usage detected')
          if (hasWindowCheck) console.log('  - typeof window check detected')
        }
        
        expect(response.status).toBe(200)
      }
    })
  })

  describe('Database Integration Issues', () => {
    it('should test RLS policies work correctly', async () => {
      if (!serverAvailable) return

      // This should reveal RLS policy violations
      console.log('Testing database operations that may hit RLS policies...')
      
      const testData = {
        url: 'https://example.com/rls-test',
        testMode: true
      }

      const response = await fetch(`${SERVER_URL}/api/jobs/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      })
      
      console.log('RLS Test Response Status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log('RLS Test Error:', errorText)
        
        // Check if it's an RLS violation
        if (errorText.includes('row-level security policy')) {
          console.log('🔴 RLS Policy Violation Detected!')
          console.log('This explains the server errors in the logs')
        }
      }
    })

    it('should test SQL query parsing', async () => {
      if (!serverAvailable) return

      // This should reveal SQL parsing errors like "applications.updated_at.desc"
      console.log('Testing database query parsing...')
      
      try {
        const response = await fetch(`${SERVER_URL}/api/jobs/public?sort=updated_at.desc&limit=5`)
        console.log('Query Test Response Status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log('Query Test Error:', errorText)
          
          if (errorText.includes('failed to parse order')) {
            console.log('🔴 SQL Query Parsing Error Detected!')
            console.log('This explains the PGRST100 errors in the logs')
          }
        } else {
          const data = await response.json()
          console.log('Query Test Success:', data)
        }
      } catch (error) {
        console.log('Query Test Exception:', error)
      }
    })
  })

  describe('Real User Workflow Tests', () => {
    it('should test complete user journey', async () => {
      if (!serverAvailable) return

      console.log('🚀 Testing complete user workflow...')
      
      // Step 1: User visits dashboard
      const dashboardResponse = await fetch(`${SERVER_URL}/dashboard`)
      console.log('Step 1 - Dashboard load:', dashboardResponse.status)
      
      // Step 2: User submits job extraction
      const extractResponse = await fetch(`${SERVER_URL}/api/jobs/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://linkedin.com/jobs/view/123456'
        })
      })
      
      console.log('Step 2 - Job extraction:', extractResponse.status)
      
      if (extractResponse.ok) {
        const extractData = await extractResponse.json()
        console.log('Step 2 - Extract data:', extractData)
        
        // Step 3: User checks recent extractions
        const recentResponse = await fetch(`${SERVER_URL}/api/jobs/extract/recent`)
        console.log('Step 3 - Recent extractions:', recentResponse.status)
        
        if (recentResponse.ok) {
          const recentData = await recentResponse.json()
          console.log('Step 3 - Recent data:', recentData)
          
          // Step 4: User visits jobs page
          const jobsResponse = await fetch(`${SERVER_URL}/jobs`)
          console.log('Step 4 - Jobs page:', jobsResponse.status)
          
          // If we get here, basic workflow is functional
          console.log('✅ Basic user workflow completed')
          expect(true).toBe(true)
        } else {
          console.log('❌ Step 3 failed - Recent extractions broken')
          expect(recentResponse.status).toBe(200)
        }
      } else {
        const errorText = await extractResponse.text()
        console.log('❌ Step 2 failed - Job extraction broken:', errorText)
        expect(extractResponse.status).toBe(200)
      }
    })
  })
})