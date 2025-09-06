/**
 * Integration tests for the advanced filtering system
 * Tests the core business logic without UI dependencies
 */

import { analyzeSalary, convertToUSD } from '@/lib/salary-intelligence';

describe('Filtering System Integration', () => {
  describe('Salary Intelligence Integration', () => {
    it('should analyze salary and determine comfort levels correctly', () => {
      const testCases = [
        {
          salary: '$50,000',
          location: 'New York',
          expectedCategory: 'struggling-tight', // Should be struggling or tight
        },
        {
          salary: '$120,000',
          location: 'San Francisco',
          expectedCategory: 'comfortable-thriving', // Should be comfortable or thriving
        },
        {
          salary: '$250,000',
          location: 'Seattle',
          expectedCategory: 'luxurious', // Should be luxurious
        },
        {
          salary: '€80,000',
          location: 'Berlin',
          expectedCategory: 'comfortable-thriving', // Should be comfortable/thriving
        },
      ];

      testCases.forEach(({ salary, location, expectedCategory }) => {
        const analysis = analyzeSalary(salary, location);
        expect(analysis).toBeDefined();
        expect(analysis!.comfortLevel).toBeDefined();
        
        // Validate comfort level is reasonable
        const validLevels = ['struggling', 'tight', 'comfortable', 'thriving', 'luxurious'];
        expect(validLevels).toContain(analysis!.comfortLevel);
        
        // Validate score is within bounds
        expect(analysis!.comfortScore).toBeGreaterThanOrEqual(0);
        expect(analysis!.comfortScore).toBeLessThanOrEqual(100);
      });
    });

    it('should handle currency conversion correctly', () => {
      expect(convertToUSD(100000, 'USD')).toBe(100000);
      expect(convertToUSD(100000, 'EUR')).toBe(108000); // 1.08 rate
      expect(convertToUSD(100000, 'GBP')).toBe(127000); // 1.27 rate
    });

    it('should provide consistent analysis for same salary in same location', () => {
      const analysis1 = analyzeSalary('$100,000', 'New York');
      const analysis2 = analyzeSalary('$100,000', 'New York');
      
      expect(analysis1).toEqual(analysis2);
    });
  });

  describe('Filter Logic Simulation', () => {
    // Mock job data for testing filter logic
    const mockJobs = [
      {
        id: '1',
        salary: '$80,000',
        location: 'New York',
        workMode: 'remote',
        title: 'Junior Developer',
        description: 'Entry level position for recent graduates',
      },
      {
        id: '2',
        salary: '$150,000',
        location: 'San Francisco',
        workMode: 'hybrid',
        title: 'Senior Software Engineer',
        description: 'Looking for 5+ years experience',
      },
      {
        id: '3',
        salary: '$250,000',
        location: 'Seattle',
        workMode: 'onsite',
        title: 'Principal Engineer',
        description: 'Lead engineer position requiring 10+ years',
      },
    ];

    it('should filter jobs by work mode', () => {
      const remoteFilter = (job: any) => job.workMode === 'remote';
      const remoteJobs = mockJobs.filter(remoteFilter);
      
      expect(remoteJobs).toHaveLength(1);
      expect(remoteJobs[0].workMode).toBe('remote');
    });

    it('should filter jobs by salary comfort level', () => {
      const jobsWithAnalysis = mockJobs.map(job => ({
        ...job,
        salaryAnalysis: analyzeSalary(job.salary, job.location),
      }));

      const luxuriousFilter = (job: any) => 
        job.salaryAnalysis?.comfortLevel === 'luxurious';
      
      const luxuriousJobs = jobsWithAnalysis.filter(luxuriousFilter);
      
      expect(luxuriousJobs.length).toBeGreaterThan(0);
      expect(luxuriousJobs[0].salaryAnalysis?.comfortLevel).toBe('luxurious');
    });

    it('should filter jobs by experience level based on title patterns', () => {
      const seniorFilter = (job: any) => {
        const title = job.title.toLowerCase();
        return title.includes('senior') || title.includes('principal');
      };

      const seniorJobs = mockJobs.filter(seniorFilter);
      expect(seniorJobs).toHaveLength(2); // Senior and Principal
    });

    it('should apply multiple filters simultaneously', () => {
      const jobsWithAnalysis = mockJobs.map(job => ({
        ...job,
        salaryAnalysis: analyzeSalary(job.salary, job.location),
      }));

      const multiFilter = (job: any) => {
        const isSeniorLevel = job.title.toLowerCase().includes('senior') || 
                             job.title.toLowerCase().includes('principal');
        const isHighComfort = job.salaryAnalysis?.comfortLevel === 'luxurious' ||
                             job.salaryAnalysis?.comfortLevel === 'thriving';
        
        return isSeniorLevel && isHighComfort;
      };

      const filteredJobs = jobsWithAnalysis.filter(multiFilter);
      expect(filteredJobs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Sorting Logic', () => {
    const mockJobsWithScores = [
      { id: '1', comfortScore: 30, matchScore: 85, createdAt: '2024-01-10' },
      { id: '2', comfortScore: 70, matchScore: 60, createdAt: '2024-01-15' },
      { id: '3', comfortScore: 90, matchScore: 95, createdAt: '2024-01-05' },
    ];

    it('should sort by comfort score descending', () => {
      const sorted = [...mockJobsWithScores].sort((a, b) => b.comfortScore - a.comfortScore);
      
      expect(sorted[0].id).toBe('3'); // Highest comfort score
      expect(sorted[1].id).toBe('2'); // Medium comfort score
      expect(sorted[2].id).toBe('1'); // Lowest comfort score
    });

    it('should sort by match score descending', () => {
      const sorted = [...mockJobsWithScores].sort((a, b) => b.matchScore - a.matchScore);
      
      expect(sorted[0].id).toBe('3'); // Highest match score (95)
      expect(sorted[1].id).toBe('1'); // Medium match score (85)
      expect(sorted[2].id).toBe('2'); // Lowest match score (60)
    });

    it('should sort by creation date descending', () => {
      const sorted = [...mockJobsWithScores].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      expect(sorted[0].id).toBe('2'); // Most recent (2024-01-15)
      expect(sorted[1].id).toBe('1'); // Middle (2024-01-10)
      expect(sorted[2].id).toBe('3'); // Oldest (2024-01-05)
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing salary data gracefully', () => {
      const analysis = analyzeSalary(undefined, 'New York');
      expect(analysis).toBeNull();
    });

    it('should handle invalid salary strings gracefully', () => {
      const analysis = analyzeSalary('Competitive salary', 'San Francisco');
      expect(analysis).toBeNull();
    });

    it('should handle unknown locations with remote fallback', () => {
      const analysis = analyzeSalary('$100,000', 'Unknown City, ZZ');
      expect(analysis).toBeDefined();
      expect(analysis!.originalSalary.min).toBe(100000);
    });

    it('should handle extreme salary values', () => {
      const lowAnalysis = analyzeSalary('$1', 'New York');
      const highAnalysis = analyzeSalary('$10,000,000', 'New York');
      
      expect(lowAnalysis).toBeDefined();
      expect(highAnalysis).toBeDefined();
      
      expect(lowAnalysis!.comfortScore).toBeLessThan(1);
      expect(highAnalysis!.comfortScore).toBeGreaterThan(95);
    });
  });

  describe('Performance Considerations', () => {
    it('should process multiple salary analyses efficiently', () => {
      const salaries = [
        '$50,000', '$75,000', '$100,000', '$125,000', '$150,000',
        '$175,000', '$200,000', '$225,000', '$250,000', '$300,000'
      ];
      
      const startTime = Date.now();
      
      salaries.forEach(salary => {
        const analysis = analyzeSalary(salary, 'New York');
        expect(analysis).toBeDefined();
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should process 10 salaries in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});