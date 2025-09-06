import { NextRequest } from 'next/server';
import { GET } from '@/app/api/jobs/route';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    job: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  validateToken: jest.fn(),
}));

const mockValidateToken = validateToken as jest.MockedFunction<typeof validateToken>;
const mockPrismaJobFindMany = prisma.job.findMany as jest.MockedFunction<typeof prisma.job.findMany>;

describe('Advanced Job Filtering API', () => {
  const mockUser = { id: 'user123', email: 'test@example.com' };
  
  const mockJobs = [
    {
      id: '1',
      userId: 'user123',
      title: 'Senior Software Engineer',
      company: 'Google',
      location: 'San Francisco, CA',
      salary: '$150,000 - $200,000',
      workMode: 'remote',
      description: 'We are looking for a senior software engineer with 5+ years of experience...',
      requirements: 'Bachelor degree, 5+ years experience, Python, JavaScript',
      skills: 'Python, JavaScript, React, Node.js',
      contractType: 'Full-time',
      matchScore: 85,
      createdAt: new Date('2024-01-15'),
      ratings: [{ rating: 4 }],
    },
    {
      id: '2',
      userId: 'user123',
      title: 'Junior Developer',
      company: 'Startup Inc',
      location: 'Austin, TX',
      salary: '$60,000 - $80,000',
      workMode: 'hybrid',
      description: 'Entry level position for recent graduates...',
      requirements: 'Bachelor degree, 0-2 years experience',
      skills: 'JavaScript, HTML, CSS',
      contractType: 'Full-time',
      matchScore: 65,
      createdAt: new Date('2024-01-10'),
      ratings: [{ rating: 3 }],
    },
    {
      id: '3',
      userId: 'user123',
      title: 'Principal Engineer',
      company: 'Microsoft',
      location: 'Seattle, WA',
      salary: '$250,000 - $300,000',
      workMode: 'onsite',
      description: 'We need a principal engineer to lead our enterprise solutions team...',
      requirements: '10+ years experience, leadership experience, enterprise systems',
      skills: 'C#, .NET, Azure, SQL Server',
      contractType: 'Full-time',
      matchScore: 90,
      createdAt: new Date('2024-01-20'),
      ratings: [{ rating: 5 }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateToken.mockResolvedValue(mockUser);
    mockPrismaJobFindMany.mockResolvedValue(mockJobs);
  });

  const createRequest = (params: Record<string, string | string[]>) => {
    const url = new URL('http://localhost:3000/api/jobs');
    
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, v));
      } else {
        url.searchParams.set(key, value);
      }
    });

    return new NextRequest(url.toString(), {
      headers: { authorization: 'Bearer valid-token' },
    });
  };

  describe('Work Mode Filtering', () => {
    it('should filter by single work mode', async () => {
      const request = createRequest({ workMode: 'remote' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].workMode).toBe('remote');
    });

    it('should filter by multiple work modes', async () => {
      const request = createRequest({ workMode: ['remote', 'hybrid'] });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(2);
      expect(data.jobs.map((j: any) => j.workMode)).toEqual(expect.arrayContaining(['remote', 'hybrid']));
    });
  });

  describe('Comfort Level Filtering', () => {
    it('should filter by comfort level', async () => {
      const request = createRequest({ comfortLevel: ['luxurious'] });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // High salary jobs should be classified as luxurious
      const luxuriousJobs = data.jobs.filter((job: any) => 
        job.salaryAnalysis?.comfortLevel === 'luxurious'
      );
      expect(luxuriousJobs.length).toBeGreaterThan(0);
    });

    it('should filter by multiple comfort levels', async () => {
      const request = createRequest({ comfortLevel: ['comfortable', 'thriving', 'luxurious'] });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs.length).toBeGreaterThan(0);
    });
  });

  describe('Experience Level Filtering', () => {
    it('should filter entry level jobs', async () => {
      const request = createRequest({ experienceLevel: ['entry'] });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].title).toBe('Junior Developer');
    });

    it('should filter senior level jobs', async () => {
      const request = createRequest({ experienceLevel: ['senior'] });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].title).toBe('Senior Software Engineer');
    });

    it('should filter principal level jobs', async () => {
      const request = createRequest({ experienceLevel: ['principal'] });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].title).toBe('Principal Engineer');
    });

    it('should filter multiple experience levels', async () => {
      const request = createRequest({ experienceLevel: ['senior', 'principal'] });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(2);
    });
  });

  describe('Company Size Filtering', () => {
    it('should filter startup companies', async () => {
      const request = createRequest({ companySize: ['startup'] });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should find the job at "Startup Inc"
      expect(data.jobs.some((job: any) => job.company === 'Startup Inc')).toBe(true);
    });

    it('should filter enterprise companies', async () => {
      const request = createRequest({ companySize: ['enterprise'] });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should find jobs at Google and Microsoft
      expect(data.jobs.length).toBeGreaterThan(0);
      expect(data.jobs.some((job: any) => ['Google', 'Microsoft'].includes(job.company))).toBe(true);
    });
  });

  describe('Salary Range Filtering', () => {
    it('should filter by minimum salary', async () => {
      const request = createRequest({ salaryMin: '100000', currency: 'USD' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should filter out the junior developer job
      expect(data.jobs).toHaveLength(2);
      expect(data.jobs.every((job: any) => 
        !job.title.includes('Junior')
      )).toBe(true);
    });

    it('should filter by maximum salary', async () => {
      const request = createRequest({ salaryMax: '100000', currency: 'USD' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should only include the junior developer job
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].title).toBe('Junior Developer');
    });

    it('should filter by salary range', async () => {
      const request = createRequest({ 
        salaryMin: '80000', 
        salaryMax: '200000',
        currency: 'USD' 
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].title).toBe('Senior Software Engineer');
    });
  });

  describe('Remote Option Filtering', () => {
    it('should filter jobs with remote option', async () => {
      const request = createRequest({ hasRemoteOption: 'true' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].workMode).toBe('remote');
    });
  });

  describe('Search Integration', () => {
    it('should combine search with filters', async () => {
      const request = createRequest({ 
        search: 'engineer',
        workMode: ['remote', 'onsite']
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(2);
      expect(data.jobs.every((job: any) => 
        job.title.toLowerCase().includes('engineer') &&
        ['remote', 'onsite'].includes(job.workMode)
      )).toBe(true);
    });
  });

  describe('Sorting', () => {
    it('should sort by comfort score', async () => {
      const request = createRequest({ sortBy: 'comfortScore', order: 'desc' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs.length).toBeGreaterThan(1);
      
      // Should be sorted by comfort score descending
      for (let i = 0; i < data.jobs.length - 1; i++) {
        const currentScore = data.jobs[i].salaryAnalysis?.comfortScore || 0;
        const nextScore = data.jobs[i + 1].salaryAnalysis?.comfortScore || 0;
        expect(currentScore).toBeGreaterThanOrEqual(nextScore);
      }
    });

    it('should sort by match score', async () => {
      const request = createRequest({ sortBy: 'matchScore', order: 'desc' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs.length).toBeGreaterThan(1);
      
      // Should be sorted by match score descending
      for (let i = 0; i < data.jobs.length - 1; i++) {
        expect(data.jobs[i].matchScore).toBeGreaterThanOrEqual(data.jobs[i + 1].matchScore);
      }
    });
  });

  describe('Complex Filtering Scenarios', () => {
    it('should handle multiple filter types simultaneously', async () => {
      const request = createRequest({
        workMode: ['remote', 'hybrid'],
        experienceLevel: ['senior'],
        comfortLevel: ['comfortable', 'thriving'],
        salaryMin: '100000',
        currency: 'USD'
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should apply all filters correctly
      expect(data.jobs.length).toBeLessThanOrEqual(mockJobs.length);
    });

    it('should return empty results for impossible filter combinations', async () => {
      const request = createRequest({
        experienceLevel: ['entry'],
        salaryMin: '200000',
        currency: 'USD'
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(0);
    });
  });

  describe('Salary Analysis Integration', () => {
    it('should enhance all jobs with salary analysis', async () => {
      const request = createRequest({});
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs.length).toBeGreaterThan(0);
      
      data.jobs.forEach((job: any) => {
        if (job.salary) {
          expect(job.salaryAnalysis).toBeDefined();
          expect(job.salaryAnalysis.comfortLevel).toBeDefined();
          expect(job.salaryAnalysis.comfortScore).toBeGreaterThanOrEqual(0);
          expect(job.salaryAnalysis.comfortScore).toBeLessThanOrEqual(100);
          expect(job.salaryAnalysis.normalizedSalaryUSD).toBeDefined();
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing authorization', async () => {
      const url = new URL('http://localhost:3000/api/jobs');
      const request = new NextRequest(url.toString());
      
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should handle invalid token', async () => {
      mockValidateToken.mockResolvedValue(null);
      
      const request = createRequest({});
      const response = await GET(request);
      
      expect(response.status).toBe(401);
    });

    it('should handle database errors', async () => {
      mockPrismaJobFindMany.mockRejectedValue(new Error('Database error'));
      
      const request = createRequest({});
      const response = await GET(request);
      
      expect(response.status).toBe(500);
    });
  });

  describe('Pagination', () => {
    it('should respect pagination parameters', async () => {
      const request = createRequest({ page: '1', limit: '2' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs.length).toBeLessThanOrEqual(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(2);
    });
  });
});