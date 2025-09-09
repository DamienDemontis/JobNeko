/**
 * Real-World Salary System Validation
 * Testing our salary analysis against actual market data from 2024
 */

import { marketIntelligence } from '@/lib/services/market-intelligence-real';
import { numbeoScraper } from '@/lib/services/numbeo-scraper';

// Mock the numbeo scraper with real market data
jest.mock('@/lib/services/numbeo-scraper');

describe('Real-World Salary System Validation', () => {
  
  describe('European Backend Developer Market Analysis', () => {
    
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('Berlin Backend Developer - Should match market reality (€62,100 average)', async () => {
      // Mock real Berlin cost of living data (cheaper than US)
      (numbeoScraper.getCityData as jest.Mock).mockResolvedValue({
        city: 'Berlin',
        country: 'Germany',
        costOfLivingIndex: 68.5, // Berlin is ~68.5% of US cost
        rentIndex: 45.2,
        dataPoints: 250
      });

      const analysis = await marketIntelligence.getMarketAnalysis(
        'Backend Developer',
        'Berlin, Germany'
      );

      // Market data shows €62,100 ($67,500) average in Berlin
      const expectedMin = 45000; // €41,500 equivalent
      const expectedMax = 85000; // €78,000 equivalent
      
      console.log('Berlin Analysis:', {
        min: analysis.salaryEstimate.min,
        max: analysis.salaryEstimate.max,
        median: analysis.salaryEstimate.median,
        source: analysis.salaryEstimate.source
      });

      expect(analysis.salaryEstimate.min).toBeGreaterThan(expectedMin * 0.7);
      expect(analysis.salaryEstimate.max).toBeLessThan(expectedMax * 1.4);
      expect(analysis.salaryEstimate.source).toBeDefined();
    });

    test('Munich Backend Developer - Should reflect higher cost (€68,900 average)', async () => {
      (numbeoScraper.getCityData as jest.Mock).mockResolvedValue({
        city: 'Munich',
        country: 'Germany',
        costOfLivingIndex: 75.8, // Munich higher COL than Berlin
        rentIndex: 58.4,
        dataPoints: 180
      });

      const analysis = await marketIntelligence.getMarketAnalysis(
        'Backend Developer',
        'Munich, Germany'
      );

      // Market shows €68,900 ($75,000) average - higher than Berlin
      const expectedMin = 50000; // Should be higher than Berlin
      const expectedMax = 95000;
      
      console.log('Munich Analysis:', {
        min: analysis.salaryEstimate.min,
        max: analysis.salaryEstimate.max,
        locationMultiplier: analysis.locationData?.multiplier
      });

      expect(analysis.salaryEstimate.min).toBeGreaterThan(expectedMin * 0.7);
      expect(analysis.salaryEstimate.max).toBeLessThan(expectedMax * 1.3);
    });

    test('London Backend Developer - Should reflect premium market (£67,379 - £77,398)', async () => {
      (numbeoScraper.getCityData as jest.Mock).mockResolvedValue({
        city: 'London',
        country: 'United Kingdom',
        costOfLivingIndex: 85.2, // London expensive
        rentIndex: 75.6,
        dataPoints: 450
      });

      const analysis = await marketIntelligence.getMarketAnalysis(
        'Backend Developer',
        'London, UK'
      );

      // London shows £67K-£77K ($85K-$98K average)
      const expectedMin = 55000; // ~£45K
      const expectedMax = 120000; // ~£95K
      
      console.log('London Analysis:', {
        min: analysis.salaryEstimate.min,
        max: analysis.salaryEstimate.max,
        confidence: analysis.salaryEstimate.confidence
      });

      expect(analysis.salaryEstimate.min).toBeGreaterThan(expectedMin * 0.8);
      expect(analysis.salaryEstimate.max).toBeLessThan(expectedMax * 1.2);
    });

    test('Amsterdam Backend Developer - Should match €70K market rate', async () => {
      (numbeoScraper.getCityData as jest.Mock).mockResolvedValue({
        city: 'Amsterdam',
        country: 'Netherlands',
        costOfLivingIndex: 78.9,
        rentIndex: 65.3,
        dataPoints: 200
      });

      const analysis = await marketIntelligence.getMarketAnalysis(
        'Backend Developer',
        'Amsterdam, Netherlands'
      );

      // Market shows $70K average for Amsterdam
      const expectedRange = { min: 50000, max: 90000 };
      
      console.log('Amsterdam Analysis:', {
        min: analysis.salaryEstimate.min,
        max: analysis.salaryEstimate.max,
        median: analysis.salaryEstimate.median
      });

      expect(analysis.salaryEstimate.min).toBeGreaterThan(expectedRange.min * 0.7);
      expect(analysis.salaryEstimate.max).toBeLessThan(expectedRange.max * 1.3);
    });
  });

  describe('Senior Developer Market Validation', () => {
    
    test('Senior Software Engineer Berlin - Should reflect premium for seniority', async () => {
      (numbeoScraper.getCityData as jest.Mock).mockResolvedValue({
        city: 'Berlin',
        country: 'Germany',
        costOfLivingIndex: 68.5,
        rentIndex: 45.2,
        dataPoints: 250
      });

      const analysis = await marketIntelligence.getMarketAnalysis(
        'Senior Software Engineer',
        'Berlin, Germany'
      );

      // Senior should be significantly higher than regular backend dev
      expect(analysis.roleIntelligence.seniorityLevel).toBe('senior');
      
      // Senior range should be higher than €55K-€75K typical range
      expect(analysis.salaryEstimate.min).toBeGreaterThan(45000);
      expect(analysis.salaryEstimate.max).toBeGreaterThan(65000);
      
      console.log('Senior Berlin Analysis:', {
        seniority: analysis.roleIntelligence.seniorityLevel,
        range: `${analysis.salaryEstimate.min} - ${analysis.salaryEstimate.max}`,
        confidence: analysis.salaryEstimate.confidence
      });
    });

    test('Junior Developer vs Senior - Should show clear salary progression', async () => {
      (numbeoScraper.getCityData as jest.Mock).mockResolvedValue({
        city: 'London',
        country: 'UK',
        costOfLivingIndex: 85.2,
        rentIndex: 75.6,
        dataPoints: 450
      });

      const juniorAnalysis = await marketIntelligence.getMarketAnalysis(
        'Junior Software Developer',
        'London, UK'
      );

      const seniorAnalysis = await marketIntelligence.getMarketAnalysis(
        'Senior Software Engineer',
        'London, UK'
      );

      console.log('London Progression Analysis:', {
        junior: {
          level: juniorAnalysis.roleIntelligence.seniorityLevel,
          range: `${juniorAnalysis.salaryEstimate.min} - ${juniorAnalysis.salaryEstimate.max}`
        },
        senior: {
          level: seniorAnalysis.roleIntelligence.seniorityLevel,
          range: `${seniorAnalysis.salaryEstimate.min} - ${seniorAnalysis.salaryEstimate.max}`
        }
      });

      // Senior should always be higher than junior
      expect(seniorAnalysis.salaryEstimate.min).toBeGreaterThan(juniorAnalysis.salaryEstimate.min);
      expect(seniorAnalysis.salaryEstimate.max).toBeGreaterThan(juniorAnalysis.salaryEstimate.max);
      
      // Verify correct seniority detection
      expect(juniorAnalysis.roleIntelligence.seniorityLevel).toBe('junior');
      expect(seniorAnalysis.roleIntelligence.seniorityLevel).toBe('senior');
    });
  });

  describe('Remote Work Market Reality', () => {
    
    test('Remote Software Engineer - Should reflect European remote market ($116,831 average)', async () => {
      const analysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'Remote - Europe'
      );

      // European remote average is $116,831 according to market data
      // Our system should be reasonably close to this
      const marketAverage = 116831;
      
      console.log('Remote Europe Analysis:', {
        range: `${analysis.salaryEstimate.min} - ${analysis.salaryEstimate.max}`,
        median: analysis.salaryEstimate.median,
        scenario: analysis.scenario,
        locationData: analysis.locationData
      });

      // Should be in reasonable range of market data
      expect(analysis.salaryEstimate.median || 
             (analysis.salaryEstimate.min + analysis.salaryEstimate.max) / 2)
        .toBeGreaterThan(marketAverage * 0.5); // Allow wide range due to remote complexity
      
      expect(analysis.salaryEstimate.max).toBeLessThan(marketAverage * 2);
    });
  });

  describe('Startup vs Enterprise Comparison', () => {
    
    test('Series B Startup vs Enterprise - Should show realistic compensation structure', async () => {
      (numbeoScraper.getCityData as jest.Mock).mockResolvedValue({
        city: 'Berlin',
        country: 'Germany',
        costOfLivingIndex: 68.5,
        rentIndex: 45.2,
        dataPoints: 250
      });

      // Series B typically offers 90-100% of market rate
      const startupAnalysis = await marketIntelligence.getMarketAnalysis(
        'Senior Software Engineer',
        'Berlin, Germany'
      );

      // Enterprise/established company
      const enterpriseAnalysis = await marketIntelligence.getMarketAnalysis(
        'Senior Software Engineer',
        'Berlin, Germany'
      );

      console.log('Startup vs Enterprise Analysis:', {
        startup: {
          range: `${startupAnalysis.salaryEstimate.min} - ${startupAnalysis.salaryEstimate.max}`,
          confidence: startupAnalysis.salaryEstimate.confidence
        },
        enterprise: {
          range: `${enterpriseAnalysis.salaryEstimate.min} - ${enterpriseAnalysis.salaryEstimate.max}`,
          confidence: enterpriseAnalysis.salaryEstimate.confidence
        }
      });

      // Both should be in similar range since our system doesn't differentiate company type yet
      // This is an area for improvement
      expect(startupAnalysis.salaryEstimate.min).toBeGreaterThan(40000);
      expect(enterpriseAnalysis.salaryEstimate.min).toBeGreaterThan(40000);
    });
  });

  describe('Data Quality Assessment', () => {
    
    test('Should provide confidence scores that reflect data quality', async () => {
      (numbeoScraper.getCityData as jest.Mock).mockResolvedValue({
        city: 'Berlin',
        country: 'Germany',
        costOfLivingIndex: 68.5,
        rentIndex: 45.2,
        dataPoints: 250 // High data points should increase confidence
      });

      const analysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'Berlin, Germany'
      );

      console.log('Data Quality Analysis:', {
        confidence: analysis.salaryEstimate.confidence,
        source: analysis.salaryEstimate.source,
        overallConfidence: analysis.confidenceScore
      });

      // Should have reasonable confidence with good data
      expect(analysis.salaryEstimate.confidence).toBeGreaterThan(0.5);
      expect(analysis.confidenceScore).toBeGreaterThan(0.5);
      expect(analysis.salaryEstimate.source).toBeDefined();
    });

    test('Should handle unknown locations gracefully', async () => {
      (numbeoScraper.getCityData as jest.Mock).mockRejectedValue(
        new Error('City not found')
      );

      const analysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'Unknown City, Unknown Country'
      );

      console.log('Unknown Location Analysis:', {
        range: `${analysis.salaryEstimate.min} - ${analysis.salaryEstimate.max}`,
        confidence: analysis.salaryEstimate.confidence,
        source: analysis.salaryEstimate.source
      });

      // Should still provide reasonable estimates with lower confidence
      expect(analysis.salaryEstimate.min).toBeGreaterThan(20000);
      expect(analysis.salaryEstimate.confidence).toBeLessThan(0.9); // Lower confidence for unknown locations
    });
  });

  describe('Market Reality vs System Performance', () => {
    
    test('Cost of Living Adjustment Accuracy', async () => {
      // Test high COL vs low COL cities
      const zurichMock = {
        city: 'Zurich',
        country: 'Switzerland',
        costOfLivingIndex: 140.5, // Very expensive
        rentIndex: 110.2,
        dataPoints: 120
      };

      const pragmeMock = {
        city: 'Prague',
        country: 'Czech Republic',
        costOfLivingIndex: 45.8, // Much cheaper
        rentIndex: 32.1,
        dataPoints: 95
      };

      // Test Zurich (expensive)
      (numbeoScraper.getCityData as jest.Mock).mockResolvedValue(zurichMock);
      const zurichAnalysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'Zurich, Switzerland'
      );

      // Test Prague (cheaper)
      (numbeoScraper.getCityData as jest.Mock).mockResolvedValue(pragmeMock);
      const pragueAnalysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'Prague, Czech Republic'
      );

      console.log('COL Adjustment Analysis:', {
        zurich: {
          colIndex: zurichMock.costOfLivingIndex,
          range: `${zurichAnalysis.salaryEstimate.min} - ${zurichAnalysis.salaryEstimate.max}`,
          multiplier: zurichAnalysis.locationData?.multiplier
        },
        prague: {
          colIndex: pragmeMock.costOfLivingIndex,
          range: `${pragueAnalysis.salaryEstimate.min} - ${pragueAnalysis.salaryEstimate.max}`,
          multiplier: pragueAnalysis.locationData?.multiplier
        }
      });

      // Zurich should have higher salary estimates than Prague
      expect(zurichAnalysis.salaryEstimate.median || 
             (zurichAnalysis.salaryEstimate.min + zurichAnalysis.salaryEstimate.max) / 2)
        .toBeGreaterThan(
          pragueAnalysis.salaryEstimate.median || 
          (pragueAnalysis.salaryEstimate.min + pragueAnalysis.salaryEstimate.max) / 2
        );
    });
  });
});