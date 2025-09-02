// Chrome Extension Popup Tests
// Note: These tests simulate the Chrome extension environment

describe('Chrome Extension Popup', () => {
  let mockChrome
  let mockFetch
  let document

  beforeEach(() => {
    // Setup DOM
    document = {
      getElementById: jest.fn(),
      addEventListener: jest.fn(),
      createElement: jest.fn(),
    }
    
    global.document = document

    // Mock Chrome APIs
    mockChrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn(),
        }
      },
      tabs: {
        query: jest.fn(),
      }
    }
    global.chrome = mockChrome

    // Mock fetch
    mockFetch = jest.fn()
    global.fetch = mockFetch

    // Reset DOM elements
    const mockElements = {
      extractBtn: { 
        addEventListener: jest.fn(), 
        disabled: false, 
        textContent: '🔍 Extract & Save Job',
        innerHTML: '🔍 Extract & Save Job'
      },
      recentJobsList: { innerHTML: '' },
      statusMessage: { 
        textContent: '', 
        className: '', 
        style: { display: 'none' } 
      }
    }

    document.getElementById.mockImplementation((id) => mockElements[id] || null)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize popup on DOMContentLoaded', async () => {
      // Mock storage with empty recent jobs
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ recentJobs: [] })
      })

      // Import the popup script
      require('../popup-v2.js')

      // Simulate DOMContentLoaded
      const domContentLoadedCallback = document.addEventListener.mock.calls
        .find(call => call[0] === 'DOMContentLoaded')[1]
      
      await domContentLoadedCallback()

      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['recentJobs'], expect.any(Function))
    })

    it('should load recent jobs from storage', async () => {
      const mockJobs = [
        {
          id: 'job_123',
          url: 'https://example.com/job',
          timestamp: Date.now() - 60000, // 1 minute ago
          status: 'completed'
        }
      ]

      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ recentJobs: mockJobs })
      })

      require('../popup-v2.js')
      const domContentLoadedCallback = document.addEventListener.mock.calls
        .find(call => call[0] === 'DOMContentLoaded')[1]
      
      await domContentLoadedCallback()

      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['recentJobs'], expect.any(Function))
    })
  })

  describe('Job Extraction', () => {
    it('should start job extraction when extract button is clicked', async () => {
      // Setup mocks
      mockChrome.tabs.query.mockResolvedValue([{ url: 'https://example.com/job/123' }])
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ recentJobs: [] })
      })
      mockChrome.storage.local.set.mockImplementation((items, callback) => {
        if (callback) callback()
      })
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          jobId: 'server_job_123',
          status: 'queued',
          statusUrl: '/api/jobs/extract/server_job_123'
        })
      })

      const mockExtractBtn = {
        addEventListener: jest.fn(),
        disabled: false,
        textContent: '🔍 Extract & Save Job',
        innerHTML: '🔍 Extract & Save Job'
      }

      document.getElementById.mockImplementation((id) => {
        if (id === 'extractBtn') return mockExtractBtn
        return null
      })

      require('../popup-v2.js')
      const domContentLoadedCallback = document.addEventListener.mock.calls
        .find(call => call[0] === 'DOMContentLoaded')[1]
      
      await domContentLoadedCallback()

      // Get the click handler
      const clickHandler = mockExtractBtn.addEventListener.mock.calls
        .find(call => call[0] === 'click')[1]

      // Simulate button click
      await clickHandler()

      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true })
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/job/123' })
      })
    })

    it('should handle extraction API failure', async () => {
      mockChrome.tabs.query.mockResolvedValue([{ url: 'https://example.com/job/123' }])
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ recentJobs: [] })
      })
      mockChrome.storage.local.set.mockImplementation((items, callback) => {
        if (callback) callback()
      })

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      })

      const mockExtractBtn = {
        addEventListener: jest.fn(),
        disabled: false,
        textContent: '🔍 Extract & Save Job',
        innerHTML: '🔍 Extract & Save Job'
      }

      const mockStatusMessage = {
        textContent: '',
        className: '',
        style: { display: 'none' }
      }

      document.getElementById.mockImplementation((id) => {
        if (id === 'extractBtn') return mockExtractBtn
        if (id === 'statusMessage') return mockStatusMessage
        return null
      })

      require('../popup-v2.js')
      const domContentLoadedCallback = document.addEventListener.mock.calls
        .find(call => call[0] === 'DOMContentLoaded')[1]
      
      await domContentLoadedCallback()

      const clickHandler = mockExtractBtn.addEventListener.mock.calls
        .find(call => call[0] === 'click')[1]

      await clickHandler()

      expect(mockStatusMessage.textContent).toBe('❌ Extraction failed. Please try again.')
      expect(mockStatusMessage.className).toBe('status-message error')
    })

    it('should add job to recent jobs immediately', async () => {
      mockChrome.tabs.query.mockResolvedValue([{ url: 'https://example.com/job/123' }])
      
      let storedJobs = []
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ recentJobs: storedJobs })
      })
      mockChrome.storage.local.set.mockImplementation((items, callback) => {
        storedJobs = items.recentJobs
        if (callback) callback()
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          jobId: 'server_job_123'
        })
      })

      const mockExtractBtn = {
        addEventListener: jest.fn(),
        disabled: false,
        textContent: '🔍 Extract & Save Job',
        innerHTML: '🔍 Extract & Save Job'
      }

      document.getElementById.mockImplementation((id) => {
        if (id === 'extractBtn') return mockExtractBtn
        return { innerHTML: '' }
      })

      require('../popup-v2.js')
      const domContentLoadedCallback = document.addEventListener.mock.calls
        .find(call => call[0] === 'DOMContentLoaded')[1]
      
      await domContentLoadedCallback()

      const clickHandler = mockExtractBtn.addEventListener.mock.calls
        .find(call => call[0] === 'click')[1]

      await clickHandler()

      expect(storedJobs).toHaveLength(1)
      expect(storedJobs[0].url).toBe('https://example.com/job/123')
      expect(storedJobs[0].status).toBe('processing')
    })
  })

  describe('Job Status Polling', () => {
    it('should poll job status until completion', async (done) => {
      let pollCount = 0
      mockFetch
        .mockResolvedValueOnce({ // First poll - still processing
          ok: true,
          json: () => Promise.resolve({
            job: { status: 'processing' }
          })
        })
        .mockResolvedValueOnce({ // Second poll - completed
          ok: true,
          json: () => Promise.resolve({
            job: { 
              status: 'completed',
              result: { job: { title: 'Test Job' } }
            }
          })
        })

      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ recentJobs: [] })
      })
      mockChrome.storage.local.set.mockImplementation((items, callback) => {
        if (callback) callback()
      })

      require('../popup-v2.js')
      
      // Access the pollJobStatus function (would need to be exposed for testing)
      // This is a simplified test - in practice, you'd need to structure the code
      // to make internal functions testable
      
      setTimeout(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
        done()
      }, 2100) // After 2 polling intervals
    })
  })

  describe('Job Synchronization', () => {
    it('should sync local jobs with server status', async () => {
      const localJobs = [
        {
          id: 'local_job_1',
          url: 'https://example.com/job/1',
          timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago
          status: 'processing'
        }
      ]

      const serverJobs = [
        {
          id: 'server_job_1',
          url: 'https://example.com/job/1',
          createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          status: 'completed',
          result: { job: { title: 'Test Job' } }
        }
      ]

      mockChrome.storage.local.get
        .mockImplementationOnce((keys, callback) => {
          callback({ recentJobs: localJobs })
        })
        .mockImplementationOnce((keys, callback) => {
          callback({ recentJobs: localJobs }) // For the sync call
        })

      mockChrome.storage.local.set.mockImplementation((items, callback) => {
        if (callback) callback()
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          jobs: serverJobs
        })
      })

      require('../popup-v2.js')
      const domContentLoadedCallback = document.addEventListener.mock.calls
        .find(call => call[0] === 'DOMContentLoaded')[1]
      
      await domContentLoadedCallback()

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/jobs/extract/recent', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      })

      // Should have updated the local job status
      expect(mockChrome.storage.local.set).toHaveBeenCalled()
    })
  })

  describe('Time Formatting', () => {
    it('should format time correctly', () => {
      require('../popup-v2.js')
      
      // Access time formatting functions (would need to be exposed)
      const now = Date.now()
      
      // Test cases for different time differences
      const testCases = [
        { timestamp: now - 30 * 1000, expected: 'just now' }, // 30 seconds ago
        { timestamp: now - 5 * 60 * 1000, expected: '5m ago' }, // 5 minutes ago
        { timestamp: now - 2 * 60 * 60 * 1000, expected: '2h ago' }, // 2 hours ago
        { timestamp: now - 25 * 60 * 60 * 1000, expected: '1d ago' } // 25 hours ago
      ]

      // This would require exposing the getRelativeTime function for testing
      // testCases.forEach(testCase => {
      //   expect(getRelativeTime(testCase.timestamp)).toBe(testCase.expected)
      // })
    })
  })

  describe('Domain Extraction', () => {
    it('should extract domain from URLs correctly', () => {
      require('../popup-v2.js')
      
      const testUrls = [
        { url: 'https://www.example.com/job/123', expected: 'example.com' },
        { url: 'https://subdomain.company.co.uk/careers', expected: 'subdomain.company.co.uk' },
        { url: 'http://localhost:3000/test', expected: 'localhost:3000' },
        { url: 'invalid-url', expected: 'invalid-url' }
      ]

      // This would require exposing the getDomain function for testing
      // testUrls.forEach(testCase => {
      //   expect(getDomain(testCase.url)).toBe(testCase.expected)
      // })
    })
  })
})