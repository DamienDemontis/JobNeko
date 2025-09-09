/**
 * Enhanced Salary System Tests
 * Testing the new company intelligence, remote work analysis, and total compensation features
 */

import { marketIntelligence } from '@/lib/services/market-intelligence-real';
import { companyIntelligence } from '@/lib/services/company-intelligence';
import { numbeoScraper } from '@/lib/services/numbeo-scraper';

// Mock external dependencies
jest.mock('@/lib/services/numbeo-scraper');
jest.mock('@/lib/services/company-intelligence');

describe('Enhanced Salary System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default Numbeo mock
    (numbeoScraper.getCityData as jest.Mock).mockResolvedValue({
      city: 'Berlin',
      country: 'Germany',
      costOfLivingIndex: 68.5,
      rentIndex: 45.2,
      dataPoints: 250
    });
  });

  describe('Startup Company Analysis', () => {
    test('should detect startup and adjust compensation accordingly', async () => {
      // Mock startup company profile
      (companyIntelligence.analyzeCompany as jest.Mock).mockResolvedValue({
        name: 'TechStartup',
        type: 'startup',
        fundingStage: 'series-b',
        compensationStyle: {
          salaryMultiplier: 0.9, // 90% of market
          equityLikely: true,
          bonusStructure: 'performance',
          benefitsLevel: 'standard'
        },
        confidence: 0.8,
        dataSource: ['job_description_analysis'],
        lastUpdated: new Date()
      });

      // Mock remote work analysis
      (companyIntelligence.analyzeRemoteWork as jest.Mock).mockResolvedValue({
        isRemoteRole: true,
        remoteType: 'fully-remote',
        remoteCompensationStyle: 'location-based',
        premiumMultiplier: 1.0,
        geographicRestrictions: [],
        timeZoneRequirements: []
      });

      const jobDescription = `
        Join our fast-growing Series B startup as a Senior Software Engineer!
        We're looking for passionate developers to join our team of 50+ engineers.
        This role comes with competitive equity and the chance to shape our product.
        Fully remote position with flexible hours.
      `;

      const analysis = await marketIntelligence.getMarketAnalysis(
        'Senior Software Engineer',
        'Remote - Global',
        undefined,
        'TechStartup',
        jobDescription
      );

      // Should detect startup characteristics
      expect(analysis.companyProfile?.type).toBe('startup');
      expect(analysis.companyProfile?.fundingStage).toBe('series-b');
      expect(analysis.companyProfile?.compensationStyle.equityLikely).toBe(true);
      
      // Should have remote work intelligence
      expect(analysis.remoteWorkIntel?.isRemoteRole).toBe(true);
      expect(analysis.remoteWorkIntel?.remoteType).toBe('fully-remote');
      
      // Should calculate total compensation with equity
      expect(analysis.totalCompensation).toBeDefined();
      expect(analysis.totalCompensation?.equity?.likely).toBe(true);
      expect(analysis.totalCompensation?.totalValue.max).toBeGreaterThan(
        analysis.totalCompensation!.baseSalary.max
      );
      
      console.log('Startup Analysis:', {
        companyType: analysis.companyProfile?.type,
        fundingStage: analysis.companyProfile?.fundingStage,
        baseSalary: `${analysis.salaryEstimate.min} - ${analysis.salaryEstimate.max}`,
        totalComp: analysis.totalCompensation ? 
          `${analysis.totalCompensation.totalValue.min} - ${analysis.totalCompensation.totalValue.max}` : 
          'N/A',
        equityValue: analysis.totalCompensation?.equity?.estimatedValue
      });
    });

    test('should handle BigTech company with premium compensation', async () => {
      // Mock BigTech company profile
      (companyIntelligence.analyzeCompany as jest.Mock).mockResolvedValue({
        name: 'Meta',
        type: 'bigtech',
        compensationStyle: {
          salaryMultiplier: 1.2, // 120% of market
          equityLikely: true,
          bonusStructure: 'target-based',
          benefitsLevel: 'premium'
        },
        confidence: 0.9,
        dataSource: ['job_description_analysis'],
        lastUpdated: new Date()
      });

      (companyIntelligence.analyzeRemoteWork as jest.Mock).mockResolvedValue({
        isRemoteRole: false,
        remoteType: 'on-site',
        remoteCompensationStyle: 'location-based',
        premiumMultiplier: 1.0
      });

      const jobDescription = `
        Meta is hiring Senior Software Engineers for our Menlo Park headquarters.
        Join one of the world's leading technology companies with industry-leading
        compensation, including competitive base salary, bonus, and RSUs.
        Premium benefits and career growth opportunities.
      `;

      const analysis = await marketIntelligence.getMarketAnalysis(
        'Senior Software Engineer',
        'Menlo Park, CA',
        undefined,
        'Meta',
        jobDescription
      );

      // Should detect BigTech characteristics
      expect(analysis.companyProfile?.type).toBe('bigtech');
      expect(analysis.companyProfile?.compensationStyle.benefitsLevel).toBe('premium');
      
      // Should have higher salary due to BigTech multiplier
      expect(analysis.salaryEstimate.min).toBeGreaterThan(100000);
      
      // Should have substantial total compensation
      expect(analysis.totalCompensation?.totalValue.max).toBeGreaterThan(200000);
      
      console.log('BigTech Analysis:', {
        companyType: analysis.companyProfile?.type,
        baseSalary: `${analysis.salaryEstimate.min} - ${analysis.salaryEstimate.max}`,
        totalComp: analysis.totalCompensation ? 
          `${analysis.totalCompensation.totalValue.min} - ${analysis.totalCompensation.totalValue.max}` : 
          'N/A',
        bonusRange: analysis.totalCompensation?.bonus?.estimatedRange
      });
    });
  });

  describe('Remote Work Intelligence', () => {
    test('should detect global rate remote position', async () => {
      (companyIntelligence.analyzeRemoteWork as jest.Mock).mockResolvedValue({
        isRemoteRole: true,
        remoteType: 'fully-remote',
        remoteCompensationStyle: 'global-rate',
        premiumMultiplier: 1.15, // 15% premium for global rates
        geographicRestrictions: [],
        timeZoneRequirements: ['PST', 'EST']
      });

      (companyIntelligence.analyzeCompany as jest.Mock).mockResolvedValue({
        name: 'RemoteFirst',
        type: 'scaleup',
        isRemoteFirst: true,
        compensationStyle: {
          salaryMultiplier: 1.0,
          equityLikely: true,
          bonusStructure: 'performance',
          benefitsLevel: 'standard'
        },
        confidence: 0.7,
        dataSource: ['job_description_analysis'],
        lastUpdated: new Date()
      });

      const jobDescription = `
        Fully remote Software Engineer position with global rate compensation.
        We pay Silicon Valley rates regardless of location. 
        Must be available for meetings in PST/EST time zones.
        This role includes equity compensation and performance bonuses.
      `;

      const analysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'Remote - Worldwide',
        undefined,
        'RemoteFirst',
        jobDescription
      );

      // Should detect global rate compensation
      expect(analysis.remoteWorkIntel?.remoteCompensationStyle).toBe('global-rate');
      expect(analysis.remoteWorkIntel?.premiumMultiplier).toBeGreaterThan(1.1);
      expect(analysis.remoteWorkIntel?.timeZoneRequirements).toContain('PST');
      
      // Should have higher confidence due to clear remote strategy
      expect(analysis.confidenceScore).toBeGreaterThan(0.8);
      
      console.log('Global Rate Remote Analysis:', {
        remoteType: analysis.remoteWorkIntel?.remoteType,
        compensationStyle: analysis.remoteWorkIntel?.remoteCompensationStyle,
        premiumMultiplier: analysis.remoteWorkIntel?.premiumMultiplier,
        timeZoneReqs: analysis.remoteWorkIntel?.timeZoneRequirements,
        salaryRange: `${analysis.salaryEstimate.min} - ${analysis.salaryEstimate.max}`
      });
    });

    test('should handle location-restricted remote work', async () => {
      (companyIntelligence.analyzeRemoteWork as jest.Mock).mockResolvedValue({
        isRemoteRole: true,
        remoteType: 'fully-remote',
        remoteCompensationStyle: 'location-based',
        premiumMultiplier: 0.95, // 5% below local rates
        geographicRestrictions: ['EU-only'],
        timeZoneRequirements: ['CET']
      });

      (companyIntelligence.analyzeCompany as jest.Mock).mockResolvedValue({
        name: 'EuropeanTech',
        type: 'enterprise',
        compensationStyle: {
          salaryMultiplier: 1.05,
          equityLikely: false,
          bonusStructure: 'performance',
          benefitsLevel: 'standard'
        },
        confidence: 0.75,
        dataSource: ['job_description_analysis'],
        lastUpdated: new Date()
      });

      const analysis = await marketIntelligence.getMarketAnalysis(
        'Backend Developer',
        'Remote - EU',
        undefined,
        'EuropeanTech',
        'Remote backend developer role, EU residents only. Must work CET hours.'
      );

      expect(analysis.remoteWorkIntel?.geographicRestrictions).toContain('EU-only');
      expect(analysis.remoteWorkIntel?.timeZoneRequirements).toContain('CET');
      expect(analysis.remoteWorkIntel?.premiumMultiplier).toBeLessThan(1.0);
      
      console.log('EU Remote Analysis:', {
        geoRestrictions: analysis.remoteWorkIntel?.geographicRestrictions,
        compensationStyle: analysis.remoteWorkIntel?.remoteCompensationStyle,
        adjustedSalary: `${analysis.salaryEstimate.min} - ${analysis.salaryEstimate.max}`
      });
    });
  });

  describe('Total Compensation Calculations', () => {
    test('should calculate comprehensive compensation for equity-heavy startup', async () => {
      (companyIntelligence.analyzeCompany as jest.Mock).mockResolvedValue({
        name: 'EarlyStartup',
        type: 'startup',
        fundingStage: 'series-a',
        compensationStyle: {
          salaryMultiplier: 0.85, // Below market base
          equityLikely: true,
          bonusStructure: 'none',
          benefitsLevel: 'basic'
        },
        confidence: 0.8,
        dataSource: ['job_description_analysis'],
        lastUpdated: new Date()
      });

      (companyIntelligence.analyzeRemoteWork as jest.Mock).mockResolvedValue({
        isRemoteRole: false,
        remoteType: 'on-site',
        remoteCompensationStyle: 'location-based',
        premiumMultiplier: 1.0
      });

      const analysis = await marketIntelligence.getMarketAnalysis(
        'Senior Engineer',
        'San Francisco, CA',
        undefined,
        'EarlyStartup',
        'Early-stage startup seeking senior engineer. Significant equity package with potential for major upside.'
      );

      // Should have substantial equity component
      expect(analysis.totalCompensation?.equity?.likely).toBe(true);
      expect(analysis.totalCompensation?.equity?.estimatedValue).toBeGreaterThan(5000);
      
      // Total comp should be higher than base due to equity
      const baseSalaryMid = (analysis.salaryEstimate.min + analysis.salaryEstimate.max) / 2;
      const totalCompMid = (analysis.totalCompensation!.totalValue.min + analysis.totalCompensation!.totalValue.max) / 2;
      expect(totalCompMid).toBeGreaterThan(baseSalaryMid * 1.1); // 10% increase due to equity
      
      console.log('Equity-Heavy Startup Analysis:', {
        baseSalaryRange: `${analysis.salaryEstimate.min} - ${analysis.salaryEstimate.max}`,
        equityValue: analysis.totalCompensation?.equity?.estimatedValue,
        totalCompRange: `${analysis.totalCompensation?.totalValue.min} - ${analysis.totalCompensation?.totalValue.max}`,
        equityMultiplier: totalCompMid / baseSalaryMid
      });
    });

    test('should calculate enterprise compensation with bonuses', async () => {
      (companyIntelligence.analyzeCompany as jest.Mock).mockResolvedValue({
        name: 'BigCorp',
        type: 'enterprise',
        compensationStyle: {
          salaryMultiplier: 1.05,
          equityLikely: false,
          bonusStructure: 'target-based',
          benefitsLevel: 'premium'
        },
        confidence: 0.85,
        dataSource: ['job_description_analysis'],
        lastUpdated: new Date()
      });

      const analysis = await marketIntelligence.getMarketAnalysis(
        'Principal Engineer',
        'New York, NY',
        undefined,
        'BigCorp',
        'Fortune 500 company seeking principal engineer. Competitive base salary with performance bonuses and comprehensive benefits.'
      );

      // Should have bonus but no equity
      expect(analysis.totalCompensation?.bonus?.likely).toBe(true);
      expect(analysis.totalCompensation?.equity?.likely).toBeFalsy();
      
      // Should have substantial benefits value
      expect(analysis.totalCompensation?.benefits?.level).toBe('premium');
      expect(analysis.totalCompensation?.benefits?.estimatedValue).toBeGreaterThan(15000);
      
      console.log('Enterprise Analysis:', {
        baseSalaryRange: `${analysis.salaryEstimate.min} - ${analysis.salaryEstimate.max}`,
        bonusRange: analysis.totalCompensation?.bonus?.estimatedRange,
        benefitsValue: analysis.totalCompensation?.benefits?.estimatedValue,
        totalCompRange: `${analysis.totalCompensation?.totalValue.min} - ${analysis.totalCompensation?.totalValue.max}`
      });
    });
  });

  describe('Advanced Scenario Analysis', () => {
    test('should handle hybrid remote BigTech with premium benefits', async () => {
      (numbeoScraper.getCityData as jest.Mock).mockResolvedValue({
        city: 'Seattle',
        country: 'United States',
        costOfLivingIndex: 115.2,
        rentIndex: 95.4,
        dataPoints: 300
      });

      (companyIntelligence.analyzeCompany as jest.Mock).mockResolvedValue({
        name: 'Amazon',
        type: 'bigtech',
        compensationStyle: {
          salaryMultiplier: 1.15,
          equityLikely: true,
          bonusStructure: 'target-based',
          benefitsLevel: 'premium'
        },
        confidence: 0.95,
        dataSource: ['job_description_analysis'],
        lastUpdated: new Date()
      });

      (companyIntelligence.analyzeRemoteWork as jest.Mock).mockResolvedValue({
        isRemoteRole: true,
        remoteType: 'hybrid',
        remoteCompensationStyle: 'location-based',
        premiumMultiplier: 1.02, // Small premium for flexibility
        geographicRestrictions: [],
        timeZoneRequirements: ['PST']
      });

      const jobDescription = `
        Amazon Web Services is seeking a Senior Principal Engineer for our Seattle office.
        Hybrid work model with 3 days in office, 2 days remote flexibility.
        Comprehensive compensation package including base salary, target bonus, RSUs, and premium benefits.
        This is a leadership role with significant technical and business impact.
      `;

      const analysis = await marketIntelligence.getMarketAnalysis(
        'Senior Principal Engineer',
        'Seattle, WA',
        undefined,
        'Amazon',
        jobDescription
      );

      // Should detect all characteristics
      expect(analysis.companyProfile?.type).toBe('bigtech');
      expect(analysis.remoteWorkIntel?.remoteType).toBe('hybrid');
      expect(analysis.roleIntelligence.seniorityLevel).toMatch(/senior|principal/);
      
      // Should have very high total compensation
      expect(analysis.totalCompensation?.totalValue.max).toBeGreaterThan(300000);
      
      // Should have high confidence due to clear signals
      expect(analysis.confidenceScore).toBeGreaterThan(0.9);
      
      console.log('Hybrid BigTech Principal Analysis:', {
        companyType: analysis.companyProfile?.type,
        remoteType: analysis.remoteWorkIntel?.remoteType,
        seniorityLevel: analysis.roleIntelligence.seniorityLevel,
        baseSalary: `${analysis.salaryEstimate.min} - ${analysis.salaryEstimate.max}`,
        totalComp: `${analysis.totalCompensation?.totalValue.min} - ${analysis.totalCompensation?.totalValue.max}`,
        confidence: analysis.confidenceScore
      });
    });
  });

  describe('Error Handling and Fallbacks', () => {
    test('should handle company intelligence failures gracefully', async () => {
      // Mock company intelligence failure
      (companyIntelligence.analyzeCompany as jest.Mock).mockRejectedValue(
        new Error('Company analysis failed')
      );
      
      (companyIntelligence.analyzeRemoteWork as jest.Mock).mockRejectedValue(
        new Error('Remote analysis failed')
      );

      const analysis = await marketIntelligence.getMarketAnalysis(
        'Software Engineer',
        'Berlin, Germany',
        undefined,
        'UnknownCompany',
        'Software engineer position at unknown company'
      );

      // Should still provide basic analysis
      expect(analysis.salaryEstimate.min).toBeGreaterThan(30000);
      expect(analysis.companyProfile).toBeUndefined();
      expect(analysis.remoteWorkIntel).toBeUndefined();
      expect(analysis.totalCompensation).toBeUndefined();
      
      // Should have lower confidence when company intelligence fails
      // But still reasonable confidence from market data
      expect(analysis.confidenceScore).toBeGreaterThan(0.5);
      
      console.log('Fallback Analysis:', {
        salaryRange: `${analysis.salaryEstimate.min} - ${analysis.salaryEstimate.max}`,
        confidence: analysis.confidenceScore,
        hasCompanyProfile: !!analysis.companyProfile,
        hasRemoteIntel: !!analysis.remoteWorkIntel
      });
    });
  });
});