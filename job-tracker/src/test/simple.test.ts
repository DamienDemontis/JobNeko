import { describe, it, expect } from 'vitest'

describe('Simple Test', () => {
  it('should verify test environment is working', () => {
    expect(1 + 1).toBe(2)
    expect(process.env.NODE_ENV).toBe('test')
  })

  it('should verify vitest globals are available', () => {
    expect(expect).toBeDefined()
    expect(describe).toBeDefined()
    expect(it).toBeDefined()
  })
})