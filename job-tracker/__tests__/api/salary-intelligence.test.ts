// Tests for Salary Intelligence API endpoint
// Tests the POST API that returns deterministic JSON per Sary-tab-instructions.md

import { NextRequest, NextResponse } from 'next/server';
import { POST, GET } from '@/app/api/salary-intelligence/route';
import { validateToken } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/services/salary-intelligence-engine');

const mockValidateToken = validateToken as jest.MockedFunction<typeof validateToken>;

// Mock user for authentication
const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User'
};

// Mock salary intelligence engine response
const mockSalaryIntelligenceResponse = {
  schema_version: '1.0.0',
  methodology_version: '2025-09-01.a',
  generated_at_utc: '2025-09-09T12:00:00.000Z',
  schema_valid: true,
  
  normalized_role: 'Software Engineer',
  normalized_role_slug: 'software_engineer',
  normalized_level_rank: 2,
  level: 'mid' as const,
  experience_years: 3,
  
  location: {
    city: 'Berlin',
    admin_area: null,
    country: 'Germany',
    iso_country_code: 'DE',
    lat: null,
    lng: null
  },
  job_location_mode: 'hybrid' as const,
  
  currency: 'EUR',
  fx_used: true,
  fx_rate_date: '2025-09-09',
  
  listed_salary: {
    min: 70000,
    max: 90000,
    period: 'year' as const,
    basis: 'gross' as const,
    data_quality: 0.8,
    inference_basis: null
  },
  
  expected_salary_range: {
    min: 65000,
    max: 95000,
    period: 'year' as const,
    basis: 'gross' as const,
    data_quality: 0.7,
    inference_basis: 'market_estimation'
  },
  
  monthly_net_income: 4200,
  monthly_core_expenses: 2800,
  affordability_score: 0.5,
  affordability_label: 'comfortable' as const,
  
  explanations: [
    'Net income computed with model for Germany.',
    'Core expenses from COL city (city-level).'
  ],
  
  confidence: {
    level: 'medium' as const,
    reasons: [
      'Listed salary data available with good quality.',
      'Location resolved to specific city.',
      'Expected salary range computed from market analysis.'
    ]
  },
  
  sources: [
    {
      field: 'listed_salary',
      source_type: 'inference' as const,
      url_or_name: 'salary-parser',
      retrieved_at: '2025-09-09T12:00:00.000Z'
    },
    {
      field: 'expected_salary_range',
      source_type: 'inference' as const,
      url_or_name: 'market-calculator',
      retrieved_at: '2025-09-09T12:00:00.000Z'
    },
    {
      field: 'monthly_core_expenses',
      source_type: 'cache' as const,
      url_or_name: 'COL-dataset',
      retrieved_at: '2025-09-09T12:00:00.000Z'
    }
  ],
  
  cache_meta: {
    cache_hits: ['fx:EUR:2025-09-09'],
    cache_misses: ['col:Berlin:2025-09']
  },
  
  country_tax_model_version: 'DE-2025.1',
  tax_method: 'model' as const,
  col_model_version: 'COL-2025.08',
  col_method: 'city' as const,
  fx_model_version: 'FX-1.0',
  
  assumptions: {
    tax_filing_status: 'single',
    dependents: 0,
    housing_type: '1br',
    household_size: 1
  },
  
  computation_budget: {
    llm_calls: 1,
    tool_calls: '<=4',
    early_stop: false
  },
  
  calc_notes: [
    'Affordability thresholds: tight<=0.2, comfortable<=0.6, else very_comfortable.'
  ],
  validation_errors: []
};

// Mock the salary intelligence engine
jest.mock('@/lib/services/salary-intelligence-engine', () => ({
  salaryIntelligenceEngine: {
    generateSalaryIntelligence: jest.fn()
  }
}));

import { salaryIntelligenceEngine } from '@/lib/services/salary-intelligence-engine';
const mockGenerateSalaryIntelligence = salaryIntelligenceEngine.generateSalaryIntelligence as jest.MockedFunction<typeof salaryIntelligenceEngine.generateSalaryIntelligence>;

describe('/api/salary-intelligence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateToken.mockResolvedValue(mockUser);
    mockGenerateSalaryIntelligence.mockResolvedValue(mockSalaryIntelligenceResponse);
  });

  describe('POST method', () => {
    it('should return salary intelligence for valid request', async () => {
      const requestBody = {
        jobTitle: 'Software Engineer',
        location: 'Berlin, Germany',
        experienceYears: 3,
        salaryInfo: '€70,000 - €90,000',
        currency: 'EUR',
        workMode: 'hybrid'
      };

      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(responseData).toEqual(mockSalaryIntelligenceResponse);
      
      // Verify engine was called with correct parameters
      expect(mockGenerateSalaryIntelligence).toHaveBeenCalledWith(
        {
          jobTitle: 'Software Engineer',
          location: 'Berlin, Germany',
          experienceYears: 3,
          salaryInfo: '€70,000 - €90,000',
          currency: 'EUR',
          workMode: 'hybrid'
        },
        {
          llm_calls: 1,
          tool_calls: '<=4',
          early_stop: true
        }
      );
    });

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobTitle: 'Engineer' })
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should handle invalid authentication token', async () => {
      mockValidateToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobTitle: 'Engineer' })
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should require jobTitle in request body', async () => {
      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ location: 'Berlin' })
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toContain('jobTitle is required');
    });

    it('should reject empty jobTitle', async () => {
      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobTitle: '   ' })
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toContain('jobTitle is required and cannot be empty');
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toContain('Invalid JSON');
    });

    it('should use default computation budget when not provided', async () => {
      const requestBody = {
        jobTitle: 'Data Scientist'
      };

      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(mockGenerateSalaryIntelligence).toHaveBeenCalledWith(
        expect.objectContaining({
          jobTitle: 'Data Scientist'
        }),
        {
          llm_calls: 1,
          tool_calls: '<=4',
          early_stop: true
        }
      );
    });

    it('should accept custom computation budget', async () => {
      const requestBody = {
        jobTitle: 'Engineer',
        computationBudget: {
          llm_calls: 1,
          tool_calls: '<=2',
          early_stop: false
        }
      };

      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(mockGenerateSalaryIntelligence).toHaveBeenCalledWith(
        expect.any(Object),
        {
          llm_calls: 1,
          tool_calls: '<=2',
          early_stop: false
        }
      );
    });

    it('should enforce llm_calls = 1 for deterministic output', async () => {
      const requestBody = {
        jobTitle: 'Engineer',
        computationBudget: {
          llm_calls: 5, // Should be rejected
          tool_calls: '<=4',
          early_stop: true
        }
      };

      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toContain('llm_calls must be exactly 1');
    });

    it('should limit tool_calls to reasonable bounds', async () => {
      const requestBody = {
        jobTitle: 'Engineer',
        computationBudget: {
          llm_calls: 1,
          tool_calls: '<=50', // Should be rejected
          early_stop: true
        }
      };

      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toContain('tool_calls cannot exceed <=10');
    });

    it('should handle engine errors gracefully', async () => {
      mockGenerateSalaryIntelligence.mockRejectedValue(new Error('Engine processing failed'));

      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobTitle: 'Engineer' })
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const responseData = await response.json();
      expect(responseData.schema_version).toBe('1.0.0');
      expect(responseData.schema_valid).toBe(false);
      expect(responseData.validation_errors).toContain('Processing error: Engine processing failed');
    });

    it('should trim whitespace from input fields', async () => {
      const requestBody = {
        jobTitle: '  Senior Engineer  ',
        location: '  San Francisco, USA  ',
        salaryInfo: '  $120,000  ',
        currency: '  USD  '
      };

      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(mockGenerateSalaryIntelligence).toHaveBeenCalledWith(
        expect.objectContaining({
          jobTitle: 'Senior Engineer',
          location: 'San Francisco, USA',
          salaryInfo: '$120,000',
          currency: 'USD'
        }),
        expect.any(Object)
      );
    });

    it('should set no-cache header for fresh calculations', async () => {
      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobTitle: 'Engineer' })
      });

      const response = await POST(request);
      expect(response.headers.get('cache-control')).toBe('no-cache');
    });

    it('should return JSON content-type', async () => {
      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobTitle: 'Engineer' })
      });

      const response = await POST(request);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should handle minimal valid request', async () => {
      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobTitle: 'Engineer' })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(mockGenerateSalaryIntelligence).toHaveBeenCalledWith(
        {
          jobTitle: 'Engineer',
          location: undefined,
          experienceYears: undefined,
          salaryInfo: undefined,
          currency: undefined,
          workMode: 'onsite'
        },
        expect.any(Object)
      );
    });

    it('should handle all optional fields when provided', async () => {
      const requestBody = {
        jobTitle: 'Principal Engineer',
        location: 'London, UK',
        experienceYears: 12,
        salaryInfo: '£100,000 - £150,000',
        currency: 'GBP',
        workMode: 'remote_country',
        computationBudget: {
          llm_calls: 1,
          tool_calls: '<=3',
          early_stop: false
        }
      };

      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(mockGenerateSalaryIntelligence).toHaveBeenCalledWith(
        {
          jobTitle: 'Principal Engineer',
          location: 'London, UK',
          experienceYears: 12,
          salaryInfo: '£100,000 - £150,000',
          currency: 'GBP',
          workMode: 'remote_country'
        },
        {
          llm_calls: 1,
          tool_calls: '<=3',
          early_stop: false
        }
      );
    });
  });

  describe('GET method', () => {
    it('should return method not allowed with helpful message', async () => {
      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const response = await GET(request);
      expect(response.status).toBe(405);

      const responseData = await response.json();
      expect(responseData.error).toBe('Method not allowed');
      expect(responseData.message).toContain('POST requests');
      expect(responseData.expected_format).toBeDefined();
      expect(responseData.expected_format.method).toBe('POST');
    });
  });

  describe('Other HTTP methods', () => {
    it('should reject PUT method', async () => {
      // PUT uses the same handler as GET (exports PUT = GET)
      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const response = await GET(request); // PUT maps to GET handler
      expect(response.status).toBe(405);
    });
  });

  describe('Response validation', () => {
    it('should return response matching exact schema format', async () => {
      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobTitle: 'Software Engineer' })
      });

      const response = await POST(request);
      const responseData = await response.json();

      // Verify all required schema fields are present
      const requiredFields = [
        'schema_version', 'methodology_version', 'generated_at_utc', 'schema_valid',
        'normalized_role', 'normalized_role_slug', 'normalized_level_rank', 'level',
        'experience_years', 'location', 'job_location_mode', 'currency', 'fx_used', 'fx_rate_date',
        'listed_salary', 'expected_salary_range', 'monthly_net_income', 'monthly_core_expenses',
        'affordability_score', 'affordability_label', 'confidence', 'sources', 'cache_meta',
        'country_tax_model_version', 'tax_method', 'col_model_version', 'col_method',
        'fx_model_version', 'assumptions', 'computation_budget', 'calc_notes', 'explanations', 
        'validation_errors'
      ];

      for (const field of requiredFields) {
        expect(responseData).toHaveProperty(field);
      }

      // Verify specific field types and constraints
      expect(typeof responseData.schema_version).toBe('string');
      expect(typeof responseData.methodology_version).toBe('string');
      expect(typeof responseData.generated_at_utc).toBe('string');
      expect(typeof responseData.schema_valid).toBe('boolean');
      expect(Array.isArray(responseData.explanations)).toBe(true);
      expect(Array.isArray(responseData.sources)).toBe(true);
      expect(Array.isArray(responseData.calc_notes)).toBe(true);
      expect(Array.isArray(responseData.validation_errors)).toBe(true);
    });

    it('should maintain schema validity for error responses', async () => {
      mockGenerateSalaryIntelligence.mockRejectedValue(new Error('Test error'));

      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobTitle: 'Engineer' })
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.schema_version).toBe('1.0.0');
      expect(responseData.methodology_version).toBe('2025-09-01.a');
      expect(responseData.schema_valid).toBe(false);
      expect(Array.isArray(responseData.validation_errors)).toBe(true);
      expect(responseData.validation_errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and logging', () => {
    it('should log processing metrics', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const request = new NextRequest('http://localhost/api/salary-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          jobTitle: 'Engineer',
          location: 'Berlin',
          salaryInfo: '€70,000'
        })
      });

      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Salary Intelligence processed in'),
        expect.objectContaining({
          userId: mockUser.id,
          jobTitle: 'Engineer',
          location: 'Berlin',
          hasListedSalary: true,
          schemaValid: true,
          confidenceLevel: 'medium',
          processingTimeMs: expect.any(Number)
        })
      );

      consoleSpy.mockRestore();
    });
  });
});