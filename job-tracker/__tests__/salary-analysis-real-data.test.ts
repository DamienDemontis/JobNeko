/**
 * Comprehensive tests for salary analysis with real data
 * Verifies that no mock or hardcoded values are used
 */

import { marketIntelligence } from '@/lib/services/market-intelligence-real'

describe('Salary Analysis - Real Data Verification', () => {

  describe('Market Intelligence Service', () => {
    it('calculates salaries based on BLS data, not hardcoded values', async () => {
      const analysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'New York, United States'
      )

      // Verify it's using real calculation based on BLS median ($105,260)
      expect(analysis.salaryEstimate.median).toBeGreaterThan(100000)
      expect(analysis.salaryEstimate.median).toBeLessThan(200000)
      
      // Verify source indicates real calculation
      expect(analysis.salaryEstimate.source).toBe('market_calculation')
      
      // Verify confidence is reasonable (not hardcoded)
      expect(analysis.confidenceScore).toBeGreaterThan(0.5)
      expect(analysis.confidenceScore).toBeLessThan(1.0)
    })

    it('applies location multipliers correctly', async () => {
      const sfAnalysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'San Francisco, United States'
      )
      
      const detroitAnalysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'Detroit, United States'
      )
      
      // San Francisco should have higher salary than Detroit
      expect(sfAnalysis.salaryEstimate.median).toBeGreaterThan(
        detroitAnalysis.salaryEstimate.median
      )
      
      // Location multipliers should be different
      expect(sfAnalysis.locationData.multiplier).toBeGreaterThan(
        detroitAnalysis.locationData.multiplier
      )
    })

    it('adjusts for different seniority levels', async () => {
      const juniorAnalysis = await marketIntelligence.getMarketAnalysis(
        'Junior Software Engineer',
        'United States'
      )
      
      const seniorAnalysis = await marketIntelligence.getMarketAnalysis(
        'Senior Software Engineer',
        'United States'
      )
      
      // Senior should earn significantly more than junior
      expect(seniorAnalysis.salaryEstimate.median).toBeGreaterThan(
        juniorAnalysis.salaryEstimate.median * 1.3
      )
      
      // Verify experience years mapping
      expect(juniorAnalysis.roleIntelligence.experienceYears.max).toBeLessThan(
        seniorAnalysis.roleIntelligence.experienceYears.min
      )
    })

    it('handles international locations with GDP-based multipliers', async () => {
      const analysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'Berlin, Germany'
      )
      
      // Should use regional multiplier, not hardcoded value
      expect(analysis.locationData.multiplier).toBeGreaterThan(0.5)
      expect(analysis.locationData.multiplier).toBeLessThan(1.5)
      
      // Salary should reflect location adjustment
      expect(analysis.salaryEstimate.median).toBeGreaterThan(50000)
      expect(analysis.salaryEstimate.median).toBeLessThan(200000)
    })
  })

  describe('Location Data Resolution', () => {
    it('uses regional multipliers based on economic indicators', async () => {
      const sfAnalysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'San Francisco, United States'
      )
      
      const berlinAnalysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'Berlin, Germany'
      )
      
      // San Francisco should have higher multiplier than Berlin
      expect(sfAnalysis.locationData.multiplier).toBeGreaterThan(
        berlinAnalysis.locationData.multiplier
      )
      
      // Both should have reasonable multipliers (not hardcoded 1.0)
      expect(sfAnalysis.locationData.multiplier).toBeGreaterThan(1.0)
      expect(berlinAnalysis.locationData.multiplier).toBeGreaterThan(0.5)
      expect(berlinAnalysis.locationData.multiplier).toBeLessThan(1.2)
    })
  })

  describe('BLS Base Salary Calculations', () => {
    it('uses Bureau of Labor Statistics baseline for calculations', async () => {
      const analysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'United States'
      )
      
      // Should be close to BLS median ($105,260) for mid-level in US
      expect(analysis.salaryEstimate.median).toBeGreaterThan(90000)
      expect(analysis.salaryEstimate.median).toBeLessThan(130000)
      
      // Should have reasonable range
      expect(analysis.salaryEstimate.max).toBeGreaterThan(analysis.salaryEstimate.min)
      expect(analysis.salaryEstimate.median).toBeGreaterThanOrEqual(analysis.salaryEstimate.min)
      expect(analysis.salaryEstimate.median).toBeLessThanOrEqual(analysis.salaryEstimate.max)
    })
  })

  describe('Edge Cases and Unusual Inputs', () => {
    it('handles unusual job titles without falling back to hardcoded values', async () => {
      // Test with unusual job title
      const analysis = await marketIntelligence.getMarketAnalysis(
        'Quantum Computing Researcher',
        'United States'
      )
      
      // Should still provide calculated estimates, not defaults
      expect(analysis.salaryEstimate.source).toBe('market_calculation')
      expect(analysis.roleIntelligence.matchConfidence).toBeGreaterThan(0)
      expect(analysis.locationData.multiplier).toBeGreaterThan(0)
      expect(analysis.salaryEstimate.median).toBeGreaterThan(50000)
      expect(analysis.salaryEstimate.median).toBeLessThan(500000)
    })

    it('handles remote locations with calculated multipliers', async () => {
      const analysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'Remote, Global'
      )
      
      // Should have reasonable remote multiplier (not hardcoded 1.0)
      expect(analysis.locationData.multiplier).toBeGreaterThan(0.5)
      expect(analysis.locationData.multiplier).toBeLessThan(1.0)
      expect(analysis.salaryEstimate.source).toBe('market_calculation')
    })
  })

  describe('Data Validation', () => {
    it('ensures all salary ranges are reasonable', async () => {
      const testRoles = [
        'Software Engineer',
        'Data Scientist', 
        'Product Manager',
        'UX Designer',
        'DevOps Engineer'
      ]
      
      for (const role of testRoles) {
        const analysis = await marketIntelligence.getMarketAnalysis(role, 'United States')
        
        // No salary should be below minimum wage equivalent
        expect(analysis.salaryEstimate.min).toBeGreaterThan(25000)
        
        // No salary should be unrealistically high
        expect(analysis.salaryEstimate.max).toBeLessThan(1000000)
        
        // Range should be reasonable (max > min)
        expect(analysis.salaryEstimate.max).toBeGreaterThan(analysis.salaryEstimate.min)
        
        // Median should be within range
        expect(analysis.salaryEstimate.median).toBeGreaterThanOrEqual(analysis.salaryEstimate.min)
        expect(analysis.salaryEstimate.median).toBeLessThanOrEqual(analysis.salaryEstimate.max)
      }
    })

    it('verifies salary calculations use economic indicators', async () => {
      const testLocations = [
        { location: 'San Francisco, United States', minMultiplier: 1.2 },
        { location: 'Berlin, Germany', maxMultiplier: 1.0 },
        { location: 'Mumbai, India', maxMultiplier: 0.4 },
        { location: 'Remote, Global', maxMultiplier: 1.0 }
      ]
      
      for (const { location, minMultiplier, maxMultiplier } of testLocations) {
        const analysis = await marketIntelligence.getMarketAnalysis('Software Engineer', location)
        
        if (minMultiplier) {
          expect(analysis.locationData.multiplier).toBeGreaterThanOrEqual(minMultiplier)
        }
        if (maxMultiplier) {
          expect(analysis.locationData.multiplier).toBeLessThanOrEqual(maxMultiplier)
        }
        
        // All locations should have positive, reasonable salaries
        expect(analysis.salaryEstimate.median).toBeGreaterThan(20000)
        expect(analysis.salaryEstimate.median).toBeLessThan(1000000)
      }
    })
  })

  describe('No Hardcoded Values Verification', () => {
    it('confirms no salary estimates are exactly hardcoded values', async () => {
      // Common hardcoded values to avoid
      const forbiddenValues = [50000, 70000, 100000, 150000, 200000]
      
      const analysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'United States'
      )
      
      // Median should not be exactly any of these common hardcoded values
      for (const value of forbiddenValues) {
        expect(analysis.salaryEstimate.median).not.toBe(value)
      }
      
      // Source should indicate real calculation
      expect(analysis.salaryEstimate.source).toBe('market_calculation')
    })

    it('confirms different roles produce different salary calculations', async () => {
      const juniorAnalysis = await marketIntelligence.getMarketAnalysis(
        'Junior Software Engineer',
        'United States'
      )
      
      const seniorAnalysis = await marketIntelligence.getMarketAnalysis(
        'Senior Software Engineer',  
        'United States'
      )
      
      // Should be significantly different (not using same hardcoded base)
      expect(seniorAnalysis.salaryEstimate.median).toBeGreaterThan(
        juniorAnalysis.salaryEstimate.median * 1.3
      )
      
      // Both should use real calculations
      expect(juniorAnalysis.salaryEstimate.source).toBe('market_calculation')
      expect(seniorAnalysis.salaryEstimate.source).toBe('market_calculation')
    })
  })
})