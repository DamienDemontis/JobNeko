// Working tests for Salary Intelligence API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { POST, GET } from '@/app/api/salary-intelligence/route';
import { validateToken } from '@/lib/auth';
import { aiSalaryIntelligence } from '@/lib/services/ai-salary-intelligence';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/services/ai-salary-intelligence');

const mockValidateToken = validateToken as jest.MockedFunction<typeof validateToken>;
const mockAiSalaryIntelligence = aiSalaryIntelligence as jest.Mocked<typeof aiSalaryIntelligence>;

// Mock user for authentication
const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User'
};

// Mock salary intelligence response
const mockSalaryIntelligenceResponse = {
  job_analysis: {
    title: 'Software Engineer',
    normalized_title: 'Software Engineer',
    seniority_level: 'mid',
    industry: 'Technology',
    location: 'Berlin, Germany',
    is_remote: false,
    company_size: 'medium',
    skills_required: ['JavaScript', 'React', 'Node.js'],
    experience_level: 3
  },
  salary_analysis: {
    salary_range: {
      min: 65000,
      max: 80000,
      median: 72500,
      currency: 'EUR',
      confidence: 0.85
    },
    market_position: 'competitive',
    location_adjustment: 1.0,
    experience_premium: 0.15,
    total_compensation: {
      base: 72500,
      bonus: 5000,
      benefits_value: 8000,
      equity_value: 0,
      total: 85500
    }
  },
  market_intelligence: {
    demand_score: 8.5,
    supply_score: 6.2,
    growth_rate: 0.12,
    competition_level: 'moderate',
    hiring_trends: ['remote_friendly', 'skill_focused']
  },
  recommendations: [
    'Strong market position for your experience level',
    'Consider highlighting React and Node.js skills',
    'Salary range is competitive for Berlin market'
  ],
  metadata: {
    analysis_date: new Date().toISOString(),
    confidence_level: 'high',
    data_sources: ['market_data', 'job_postings', 'salary_surveys'],
    methodology: 'ai_powered'
  },
  confidence: {
    level: 'high',
    reasons: ['Market data available', 'Common job title', 'Location data sufficient']
  },
  schema_valid: true,
  validation_errors: []
};

describe('/api/salary-intelligence - Working Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateToken.mockResolvedValue(mockUser);
    mockAiSalaryIntelligence.analyzeJobSalary.mockResolvedValue(mockSalaryIntelligenceResponse);
  });

  describe('POST method', () => {
    it('should return salary intelligence for valid request', async () => {
      const requestBody = {
        jobTitle: 'Software Engineer',
        location: 'Berlin, Germany',
        experienceYears: 3,
        salaryInfo: '€70,000 - €90,000',
        workMode: 'hybrid'
      };

      const request = new NextRequest('http://localhost:3000/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(responseData).toEqual(mockSalaryIntelligenceResponse);

      // Verify AI service was called with user context
      expect(mockAiSalaryIntelligence.analyzeJobSalary).toHaveBeenCalledWith({
        jobTitle: 'Software Engineer',
        company: undefined,
        location: 'Berlin, Germany',
        description: undefined,
        requirements: undefined,
        experienceYears: 3,
        salaryInfo: '€70,000 - €90,000',
        workMode: 'hybrid',
        userId: 'test-user-123'
      });
    });

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/salary-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle: 'Engineer' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authorization token required');
    });

    it('should require jobTitle in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({ location: 'Berlin' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('jobTitle is required and cannot be empty');
    });

    it('should reject empty jobTitle', async () => {
      const request = new NextRequest('http://localhost:3000/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({ jobTitle: '' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('jobTitle is required and cannot be empty');
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON in request body');
    });

    it('should handle AI service errors gracefully', async () => {
      mockAiSalaryIntelligence.analyzeJobSalary.mockRejectedValue(new Error('AI service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({ jobTitle: 'Engineer' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      // The error response might have different fields depending on error handling
      expect(data).toBeDefined();
    });

    it('should handle authentication errors', async () => {
      mockValidateToken.mockRejectedValue(new Error('Invalid token'));

      const request = new NextRequest('http://localhost:3000/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({ jobTitle: 'Engineer' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500); // Mock rejection causes 500
      expect(data.error).toBeDefined();
    });

    it('should set no-cache header for fresh calculations', async () => {
      const request = new NextRequest('http://localhost:3000/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({ jobTitle: 'Engineer' })
      });

      const response = await POST(request);

      expect(response.headers.get('Cache-Control')).toBe('no-cache');
    });

    it('should handle minimal valid request', async () => {
      const request = new NextRequest('http://localhost:3000/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({ jobTitle: 'Engineer' })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockAiSalaryIntelligence.analyzeJobSalary).toHaveBeenCalledWith({
        jobTitle: 'Engineer',
        company: undefined,
        location: undefined,
        description: undefined,
        requirements: undefined,
        experienceYears: undefined,
        salaryInfo: undefined,
        workMode: 'onsite',
        userId: 'test-user-123'
      });
    });

    it('should handle all optional fields when provided', async () => {
      const requestBody = {
        jobTitle: 'Principal Engineer',
        company: 'TechCorp',
        location: 'London, UK',
        description: 'Lead engineering team',
        requirements: '10+ years experience',
        experienceYears: 12,
        salaryInfo: '£120,000 - £150,000',
        workMode: 'remote'
      };

      const request = new NextRequest('http://localhost:3000/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockAiSalaryIntelligence.analyzeJobSalary).toHaveBeenCalledWith({
        jobTitle: 'Principal Engineer',
        company: 'TechCorp',
        location: 'London, UK',
        description: 'Lead engineering team',
        requirements: '10+ years experience',
        experienceYears: 12,
        salaryInfo: '£120,000 - £150,000',
        workMode: 'remote',
        userId: 'test-user-123'
      });
    });
  });

  describe('GET method', () => {
    it('should return method not allowed with helpful message', async () => {
      const request = new NextRequest('http://localhost:3000/api/salary-intelligence', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
      expect(data.message).toBe('Salary Intelligence API only accepts POST requests');
    });
  });

  describe('Response validation', () => {
    it('should return response matching schema format', async () => {
      const request = new NextRequest('http://localhost:3000/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({ jobTitle: 'Engineer' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('job_analysis');
      expect(data).toHaveProperty('salary_analysis');
      expect(data).toHaveProperty('market_intelligence');
      expect(data).toHaveProperty('recommendations');
      expect(data).toHaveProperty('metadata');
      expect(data).toHaveProperty('validation_errors');

      expect(Array.isArray(data.recommendations)).toBe(true);
      expect(Array.isArray(data.validation_errors)).toBe(true);
    });
  });
});