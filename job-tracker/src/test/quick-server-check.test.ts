import { describe, it, expect } from 'vitest'

describe('Quick Server Check', () => {
  it('should connect to the development server', async () => {
    console.log('🔍 Testing server connection...')
    
    try {
      const response = await fetch('http://localhost:3001/')
      console.log('✅ Server Response Status:', response.status)
      console.log('✅ Server Response OK:', response.ok)
      
      if (response.ok) {
        const html = await response.text()
        console.log('✅ Response contains HTML:', html.includes('<html'))
        console.log('✅ Response length:', html.length)
        
        // Check for hydration errors in the HTML
        if (html.includes('hydrat')) {
          console.log('⚠️ Hydration mentioned in response')
        }
      }
      
      expect(response.ok).toBe(true)
    } catch (error) {
      console.error('❌ Server connection failed:', error)
      throw error
    }
  })

  it('should test API route', async () => {
    console.log('🔍 Testing API route...')
    
    try {
      const response = await fetch('http://localhost:3001/api/jobs/extract/recent')
      console.log('✅ API Response Status:', response.status)
      console.log('✅ API Response OK:', response.ok)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ API Response Data:', data)
      } else {
        const errorText = await response.text()
        console.log('❌ API Error Response:', errorText)
      }
    } catch (error) {
      console.error('❌ API request failed:', error)
    }
  })
})