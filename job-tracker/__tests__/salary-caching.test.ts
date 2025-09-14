import { GET, POST } from '../app/api/jobs/[id]/perfect-salary-analysis/route';
import { NextRequest } from 'next/server';
import { prisma } from '../lib/prisma';

// Mock dependencies
jest.mock('../lib/auth', () => ({
  validateToken: jest.fn().mockResolvedValue({
    id: 'test-user-id',
    email: 'test@example.com'
  })
}));

jest.mock('../lib/services/perfect-ai-rag', () => ({
  perfectAIRAG: {
    analyzeJobOffer: jest.fn().mockResolvedValue({
      role: {
        title: 'Software Engineer',
        normalizedTitle: 'Software Engineer',
        seniorityLevel: 'mid',
        industry: 'Technology',
        skillsRequired: ['JavaScript', 'React'],
        experienceLevel: 3,
        marketDemand: 85,
        jobType: 'fulltime',
        workMode: 'hybrid',
        compensationModel: 'salary'
      },
      compensation: {
        salaryRange: {
          min: 80000,
          max: 120000,
          median: 100000,
          currency: 'USD',
          confidence: 0.85
        },
        totalCompensation: {
          base: 100000,
          bonus: 10000,
          equity: 5000,
          benefits: 15000,
          total: 130000
        },
        marketPosition: 'competitive',
        negotiationPower: 75
      },
      analysis: {
        overallScore: 82,
        pros: ['Good salary range', 'Modern tech stack'],
        cons: ['Limited remote work'],
        recommendations: ['Negotiate for more remote flexibility']
      },
      metadata: {
        analysisTimestamp: new Date().toISOString(),
        ragVersion: '1.0.0-perfect',
        processingTime: 2500
      }
    })
  }
}));

jest.mock('../lib/prisma', () => ({
  prisma: {
    job: {
      findFirst: jest.fn(),
      update: jest.fn()
    }
  }
}));

describe('Salary Intelligence Caching System', () => {
  const mockJob = {
    id: 'test-job-id',
    userId: 'test-user-id',
    title: 'Software Engineer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    extractedData: null,
    user: {
      id: 'test-user-id',
      profile: {
        currentLocation: 'San Francisco, CA',
        currentSalary: 90000,
        expectedSalaryMin: 100000,
        expectedSalaryMax: 140000,
        yearsOfExperience: 3
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should perform fresh analysis when no cache exists', async () => {
    const mockPrismaJob = { ...mockJob, extractedData: null };
    (prisma.job.findFirst as jest.Mock).mockResolvedValue(mockPrismaJob);
    (prisma.job.update as jest.Mock).mockResolvedValue(mockPrismaJob);

    const request = new NextRequest('http://localhost:3000/api/jobs/test-job-id/perfect-salary-analysis', {
      headers: { authorization: 'Bearer mock-token' }
    });

    const params = Promise.resolve({ id: 'test-job-id' });
    const response = await GET(request, { params });
    const result = await response.json();

    expect(result.metadata.cached).toBe(false);
    expect(result.metadata.processingTimeFormatted).toMatch(/\d+\.\d+s/);
    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: 'test-job-id' },
      data: expect.objectContaining({
        extractedData: expect.stringContaining('perfectRAGAnalysis')
      })
    });
  });

  test('should use cached analysis when available and fresh', async () => {
    const cachedAnalysis = {
      role: { title: 'Cached Software Engineer' },
      compensation: { salaryRange: { min: 85000, max: 125000 } },
      analysis: { overallScore: 80 }
    };

    const mockJobWithCache = {
      ...mockJob,
      extractedData: JSON.stringify({
        perfectRAGAnalysis: cachedAnalysis,
        analysisDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        version: '1.0.0-perfect'
      })
    };

    (prisma.job.findFirst as jest.Mock).mockResolvedValue(mockJobWithCache);

    const request = new NextRequest('http://localhost:3000/api/jobs/test-job-id/perfect-salary-analysis', {
      headers: { authorization: 'Bearer mock-token' }
    });

    const params = Promise.resolve({ id: 'test-job-id' });
    const response = await GET(request, { params });
    const result = await response.json();

    expect(result.metadata.cached).toBe(true);
    expect(result.metadata.cacheAge).toMatch(/\d+\.\d+ hours/);
    expect(result.metadata.processingTimeFormatted).toBe('cached');
    expect(result.role.title).toBe('Cached Software Engineer');

    // Should not update database when using cache
    expect(prisma.job.update).not.toHaveBeenCalled();
  });

  test('should refresh expired cache after 24 hours', async () => {
    const oldCachedAnalysis = {
      role: { title: 'Old Cached Analysis' },
      compensation: { salaryRange: { min: 70000, max: 100000 } },
      analysis: { overallScore: 70 }
    };

    const mockJobWithExpiredCache = {
      ...mockJob,
      extractedData: JSON.stringify({
        perfectRAGAnalysis: oldCachedAnalysis,
        analysisDate: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        version: '1.0.0-perfect'
      })
    };

    (prisma.job.findFirst as jest.Mock).mockResolvedValue(mockJobWithExpiredCache);
    (prisma.job.update as jest.Mock).mockResolvedValue(mockJobWithExpiredCache);

    const request = new NextRequest('http://localhost:3000/api/jobs/test-job-id/perfect-salary-analysis', {
      headers: { authorization: 'Bearer mock-token' }
    });

    const params = Promise.resolve({ id: 'test-job-id' });
    const response = await GET(request, { params });
    const result = await response.json();

    expect(result.metadata.cached).toBe(false);
    expect(result.metadata.processingTimeFormatted).toMatch(/\d+\.\d+s/);
    expect(result.role.title).toBe('Software Engineer'); // Fresh analysis result

    // Should update database with fresh analysis
    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: 'test-job-id' },
      data: expect.objectContaining({
        extractedData: expect.stringContaining('perfectRAGAnalysis')
      })
    });
  });

  test('should force refresh when forceRefresh parameter is provided', async () => {
    const cachedAnalysis = {
      role: { title: 'Cached Analysis' },
      compensation: { salaryRange: { min: 80000, max: 120000 } },
      analysis: { overallScore: 75 }
    };

    const mockJobWithCache = {
      ...mockJob,
      extractedData: JSON.stringify({
        perfectRAGAnalysis: cachedAnalysis,
        analysisDate: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        version: '1.0.0-perfect'
      })
    };

    (prisma.job.findFirst as jest.Mock).mockResolvedValue(mockJobWithCache);
    (prisma.job.update as jest.Mock).mockResolvedValue(mockJobWithCache);

    const request = new NextRequest('http://localhost:3000/api/jobs/test-job-id/perfect-salary-analysis?forceRefresh=true', {
      headers: { authorization: 'Bearer mock-token' }
    });

    const params = Promise.resolve({ id: 'test-job-id' });
    const response = await GET(request, { params });
    const result = await response.json();

    expect(result.metadata.cached).toBe(false);
    expect(result.metadata.processingTimeFormatted).toMatch(/\d+\.\d+s/);
    expect(result.role.title).toBe('Software Engineer'); // Fresh analysis result

    // Should update database with fresh analysis even though cache was valid
    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: 'test-job-id' },
      data: expect.objectContaining({
        extractedData: expect.stringContaining('perfectRAGAnalysis')
      })
    });
  });

  test('should handle corrupted cache data gracefully', async () => {
    const mockJobWithCorruptedCache = {
      ...mockJob,
      extractedData: 'invalid-json-data'
    };

    (prisma.job.findFirst as jest.Mock).mockResolvedValue(mockJobWithCorruptedCache);
    (prisma.job.update as jest.Mock).mockResolvedValue(mockJobWithCorruptedCache);

    const request = new NextRequest('http://localhost:3000/api/jobs/test-job-id/perfect-salary-analysis', {
      headers: { authorization: 'Bearer mock-token' }
    });

    const params = Promise.resolve({ id: 'test-job-id' });
    const response = await GET(request, { params });
    const result = await response.json();

    // Should perform fresh analysis when cache is corrupted
    expect(result.metadata.cached).toBe(false);
    expect(result.metadata.processingTimeFormatted).toMatch(/\d+\.\d+s/);
    expect(prisma.job.update).toHaveBeenCalled();
  });
});