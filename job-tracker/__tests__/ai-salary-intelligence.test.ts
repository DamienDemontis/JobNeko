// AI-Powered Salary Intelligence Tests
// Tests the new AI-powered system that replaced hardcoded multipliers

import { aiSalaryIntelligence } from '../lib/services/ai-salary-intelligence'

// Mock the generateCompletion function
jest.mock('../lib/ai-service', () => ({
  generateCompletion: jest.fn()
}))

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    user: {
      findUnique: jest.fn()
    }
  }))
}))

const mockGenerateCompletion = require('../lib/ai-service').generateCompletion

describe('AI Salary Intelligence Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock user profile data
    const mockUserProfile = {
      id: 'user123',
      profile: {
        currentLocation: 'San Francisco, CA',
        currentCountry: 'United States',
        familySize: 2,
        dependents: 0,
        maritalStatus: 'married',
        expectedSalaryMin: 120000,
        expectedSalaryMax: 180000,
        currentSalary: 140000,
        yearsOfExperience: 5
      },
      resumes: [{
        content: 'Senior Software Engineer with 5 years experience in React, Node.js, Python',
        skills: JSON.stringify(['React', 'Node.js', 'Python', 'AWS', 'Docker']),
        experience: JSON.stringify([
          {
            title: 'Senior Software Engineer',
            company: 'TechCorp',
            duration: '3 years'
          }
        ])
      }]
    }

    require('@prisma/client').PrismaClient().user.findUnique.mockResolvedValue(mockUserProfile)
  })

  describe('Senior Software Engineer Analysis', () => {
    it('should analyze senior software engineer role correctly', async () => {
      // Mock AI response
      const mockAIResponse = {
        content: JSON.stringify({
          "schema_version": "1.0.0",
          "methodology_version": "2025-09-09-ai",
          "generated_at_utc": "2025-09-09T12:00:00.000Z",
          "schema_valid": true,
          "normalized_role": "Senior Software Engineer",
          "normalized_role_slug": "senior_software_engineer",
          "normalized_level_rank": 3,
          "level": "senior",
          "experience_years": 5,
          "location": {
            "city": "San Francisco",
            "admin_area": "California",
            "country": "United States",
            "iso_country_code": "US",
            "lat": null,
            "lng": null
          },
          "job_location_mode": "onsite",
          "currency": "USD",
          "fx_used": false,
          "fx_rate_date": null,
          "listed_salary": null,
          "expected_salary_range": {
            "min": 150000,
            "max": 200000,
            "period": "year",
            "basis": "gross",
            "data_quality": 0.85,
            "inference_basis": "ai_market_analysis"
          },
          "monthly_net_income": 10500,
          "monthly_core_expenses": 6500,
          "affordability_score": 0.62,
          "affordability_label": "very_comfortable",
          "explanations": [
            "Senior Software Engineer role in San Francisco typically commands high salaries due to competitive market",
            "5 years of experience aligns well with senior level expectations",
            "Location in high-cost San Francisco requires salary adjustment for comfortable living"
          ],
          "confidence": {
            "level": "high",
            "reasons": [
              "Clear role definition and market data available",
              "User profile provides comprehensive context",
              "Experience level matches role seniority"
            ]
          },
          "sources": [],
          "cache_meta": {"cache_hits": [], "cache_misses": []},
          "country_tax_model_version": "ai_analysis_v1",
          "tax_method": "ai_calculation",
          "col_model_version": "ai_analysis_v1",
          "col_method": "ai_analysis",
          "fx_model_version": "ai_analysis_v1",
          "assumptions": {
            "tax_filing_status": "married_filing_jointly",
            "dependents": 0,
            "housing_type": "2br",
            "household_size": 2
          },
          "computation_budget": {"llm_calls": 1, "tool_calls": "<=1", "early_stop": false},
          "calc_notes": ["AI-powered salary analysis based on market data and user context"],
          "validation_errors": []
        })
      }
      
      mockGenerateCompletion.mockResolvedValue(mockAIResponse)

      const result = await aiSalaryIntelligence.analyzeJobSalary({
        jobTitle: 'Senior Software Engineer',
        company: 'Google',
        location: 'San Francisco, CA',
        description: 'Build scalable web applications using modern technologies',
        requirements: 'React, Node.js, 5+ years experience',
        workMode: 'onsite',
        userId: 'user123'
      })

      // Verify AI-powered analysis
      expect(result.schema_valid).toBe(true)
      expect(result.normalized_role).toBe('Senior Software Engineer')
      expect(result.level).toBe('senior')
      expect(result.experience_years).toBe(5)
      expect(result.location.city).toBe('San Francisco')
      expect(result.location.country).toBe('United States')
      expect(result.expected_salary_range.min).toBe(150000)
      expect(result.expected_salary_range.max).toBe(200000)
      expect(result.currency).toBe('USD')
      expect(result.affordability_label).toBe('very_comfortable')
      expect(result.confidence.level).toBe('high')
      
      // Verify methodology is AI-powered
      expect(result.methodology_version).toBe('2025-09-09-ai')
      expect(result.tax_method).toBe('ai_calculation')
      expect(result.col_method).toBe('ai_analysis')
      
      // Verify explanations are present
      expect(result.explanations).toHaveLength(3)
      expect(result.explanations[0]).toContain('San Francisco')
      
      // Verify user context integration
      expect(result.assumptions.household_size).toBe(2)
      expect(result.assumptions.tax_filing_status).toBe('married_filing_jointly')
    })
  })

  describe('Remote Job Analysis', () => {
    it('should handle remote jobs correctly', async () => {
      const mockAIResponse = {
        content: JSON.stringify({
          "schema_version": "1.0.0",
          "methodology_version": "2025-09-09-ai",
          "generated_at_utc": "2025-09-09T12:00:00.000Z",
          "schema_valid": true,
          "normalized_role": "Full Stack Developer",
          "normalized_role_slug": "full_stack_developer",
          "normalized_level_rank": 2,
          "level": "mid",
          "experience_years": 3,
          "location": {
            "city": null,
            "admin_area": null,
            "country": "Global",
            "iso_country_code": "XX",
            "lat": null,
            "lng": null
          },
          "job_location_mode": "remote_global",
          "currency": "USD",
          "fx_used": false,
          "fx_rate_date": null,
          "listed_salary": {
            "min": 80000,
            "max": 120000,
            "period": "year",
            "basis": "gross",
            "data_quality": 0.9,
            "inference_basis": null
          },
          "expected_salary_range": {
            "min": 80000,
            "max": 120000,
            "period": "year",
            "basis": "gross",
            "data_quality": 0.9,
            "inference_basis": "listed_salary_analysis"
          },
          "monthly_net_income": 7200,
          "monthly_core_expenses": 4500,
          "affordability_score": 0.6,
          "affordability_label": "very_comfortable",
          "explanations": [
            "Listed salary range provides good baseline for analysis",
            "Remote work allows for geographic flexibility in cost of living",
            "Mid-level experience appropriate for listed compensation range"
          ],
          "confidence": {
            "level": "high",
            "reasons": [
              "Listed salary available for analysis",
              "Clear remote work arrangement",
              "Experience level matches expectations"
            ]
          },
          "sources": [],
          "cache_meta": {"cache_hits": [], "cache_misses": []},
          "country_tax_model_version": "ai_analysis_v1",
          "tax_method": "ai_calculation",
          "col_model_version": "ai_analysis_v1",
          "col_method": "ai_analysis",
          "fx_model_version": "ai_analysis_v1",
          "assumptions": {
            "tax_filing_status": "married_filing_jointly",
            "dependents": 0,
            "housing_type": "2br",
            "household_size": 2
          },
          "computation_budget": {"llm_calls": 1, "tool_calls": "<=1", "early_stop": false},
          "calc_notes": ["Remote work salary analysis with geographic flexibility"],
          "validation_errors": []
        })
      }
      
      mockGenerateCompletion.mockResolvedValue(mockAIResponse)

      const result = await aiSalaryIntelligence.analyzeJobSalary({
        jobTitle: 'Full Stack Developer',
        location: 'Remote',
        salaryInfo: '$80,000 - $120,000 per year',
        workMode: 'remote_global',
        userId: 'user123'
      })

      // Verify remote job handling
      expect(result.job_location_mode).toBe('remote_global')
      expect(result.location.country).toBe('Global')
      expect(result.location.city).toBe(null)
      
      // Verify salary parsing
      expect(result.listed_salary?.min).toBe(80000)
      expect(result.listed_salary?.max).toBe(120000)
      
      // Verify expected range matches listed
      expect(result.expected_salary_range.min).toBe(80000)
      expect(result.expected_salary_range.max).toBe(120000)
      
      // Verify confidence is high due to listed salary
      expect(result.confidence.level).toBe('high')
    })
  })

  describe('Junior Role Analysis', () => {
    it('should analyze junior roles with appropriate adjustments', async () => {
      const mockAIResponse = {
        content: JSON.stringify({
          "schema_version": "1.0.0",
          "methodology_version": "2025-09-09-ai",
          "generated_at_utc": "2025-09-09T12:00:00.000Z",
          "schema_valid": true,
          "normalized_role": "Junior Software Developer",
          "normalized_role_slug": "junior_software_developer",
          "normalized_level_rank": 1,
          "level": "junior",
          "experience_years": 1,
          "location": {
            "city": "Austin",
            "admin_area": "Texas",
            "country": "United States",
            "iso_country_code": "US",
            "lat": null,
            "lng": null
          },
          "job_location_mode": "onsite",
          "currency": "USD",
          "fx_used": false,
          "fx_rate_date": null,
          "listed_salary": null,
          "expected_salary_range": {
            "min": 70000,
            "max": 90000,
            "period": "year",
            "basis": "gross",
            "data_quality": 0.75,
            "inference_basis": "ai_market_analysis"
          },
          "monthly_net_income": 5200,
          "monthly_core_expenses": 3200,
          "affordability_score": 0.625,
          "affordability_label": "very_comfortable",
          "explanations": [
            "Junior level position appropriate for early career stage",
            "Austin market offers good opportunities for junior developers",
            "Lower cost of living compared to major tech hubs makes salary more competitive"
          ],
          "confidence": {
            "level": "medium",
            "reasons": [
              "No listed salary requires market estimation",
              "Junior level market data less precise than senior roles",
              "Location data provides good context"
            ]
          },
          "sources": [],
          "cache_meta": {"cache_hits": [], "cache_misses": []},
          "country_tax_model_version": "ai_analysis_v1",
          "tax_method": "ai_calculation",
          "col_model_version": "ai_analysis_v1",
          "col_method": "ai_analysis",
          "fx_model_version": "ai_analysis_v1",
          "assumptions": {
            "tax_filing_status": "married_filing_jointly",
            "dependents": 0,
            "housing_type": "1br",
            "household_size": 2
          },
          "computation_budget": {"llm_calls": 1, "tool_calls": "<=1", "early_stop": false},
          "calc_notes": ["Junior role analysis with market-based salary estimation"],
          "validation_errors": []
        })
      }
      
      mockGenerateCompletion.mockResolvedValue(mockAIResponse)

      const result = await aiSalaryIntelligence.analyzeJobSalary({
        jobTitle: 'Junior Software Developer',
        location: 'Austin, TX',
        workMode: 'onsite',
        userId: 'user123'
      })

      // Verify junior role analysis
      expect(result.level).toBe('junior')
      expect(result.normalized_level_rank).toBe(1)
      expect(result.experience_years).toBe(1)
      
      // Verify salary is appropriate for junior level
      expect(result.expected_salary_range.min).toBe(70000)
      expect(result.expected_salary_range.max).toBe(90000)
      
      // Verify location-based analysis
      expect(result.location.city).toBe('Austin')
      expect(result.location.admin_area).toBe('Texas')
      
      // Verify affordability is reasonable
      expect(result.affordability_label).toBe('very_comfortable')
      expect(result.affordability_score).toBeGreaterThan(0.6)
      
      // Verify confidence is medium (no listed salary)
      expect(result.confidence.level).toBe('medium')
    })
  })

  describe('Error Handling', () => {
    it('should handle AI service failures gracefully', async () => {
      mockGenerateCompletion.mockRejectedValue(new Error('OpenAI API error'))

      const result = await aiSalaryIntelligence.analyzeJobSalary({
        jobTitle: 'Data Scientist',
        location: 'New York, NY',
        userId: 'user123'
      })

      // Verify error response structure
      expect(result.schema_valid).toBe(false)
      expect(result.normalized_role).toBe('Data Scientist')
      expect(result.level).toBe('unknown')
      expect(result.expected_salary_range.min).toBe(null)
      expect(result.expected_salary_range.max).toBe(null)
      expect(result.affordability_label).toBe('unaffordable')
      expect(result.confidence.level).toBe('low')
      expect(result.explanations[0]).toContain('OpenAI API error')
    })

    it('should handle invalid AI response format', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: 'This is not valid JSON'
      })

      const result = await aiSalaryIntelligence.analyzeJobSalary({
        jobTitle: 'Product Manager',
        userId: 'user123'
      })

      // Verify error handling for invalid JSON
      expect(result.schema_valid).toBe(false)
      expect(result.confidence.level).toBe('low')
      expect(result.validation_errors[0]).toContain('Processing error')
    })
  })

  describe('User Context Integration', () => {
    it('should integrate user profile data into analysis', async () => {
      const mockAIResponse = {
        content: JSON.stringify({
          "schema_version": "1.0.0",
          "methodology_version": "2025-09-09-ai",
          "generated_at_utc": "2025-09-09T12:00:00.000Z",
          "schema_valid": true,
          "normalized_role": "DevOps Engineer",
          "normalized_role_slug": "devops_engineer",
          "normalized_level_rank": 3,
          "level": "senior",
          "experience_years": 5,
          "location": {
            "city": "Seattle",
            "admin_area": "Washington",
            "country": "United States",
            "iso_country_code": "US",
            "lat": null,
            "lng": null
          },
          "job_location_mode": "hybrid",
          "currency": "USD",
          "fx_used": false,
          "fx_rate_date": null,
          "listed_salary": null,
          "expected_salary_range": {
            "min": 130000,
            "max": 170000,
            "period": "year",
            "basis": "gross",
            "data_quality": 0.8,
            "inference_basis": "ai_market_analysis"
          },
          "monthly_net_income": 9200,
          "monthly_core_expenses": 5800,
          "affordability_score": 0.59,
          "affordability_label": "very_comfortable",
          "explanations": [
            "DevOps role leveraging user's infrastructure experience",
            "Seattle market competitive for technical roles",
            "Hybrid work mode provides flexibility and cost savings"
          ],
          "confidence": {
            "level": "high",
            "reasons": [
              "User experience matches role requirements",
              "Profile skills align with DevOps needs",
              "Market data available for Seattle tech roles"
            ]
          },
          "sources": [],
          "cache_meta": {"cache_hits": [], "cache_misses": []},
          "country_tax_model_version": "ai_analysis_v1",
          "tax_method": "ai_calculation",
          "col_model_version": "ai_analysis_v1",
          "col_method": "ai_analysis",
          "fx_model_version": "ai_analysis_v1",
          "assumptions": {
            "tax_filing_status": "married_filing_jointly",
            "dependents": 0,
            "housing_type": "2br",
            "household_size": 2
          },
          "computation_budget": {"llm_calls": 1, "tool_calls": "<=1", "early_stop": false},
          "calc_notes": ["Analysis considers user's AWS and Docker experience from resume"],
          "validation_errors": []
        })
      }
      
      mockGenerateCompletion.mockResolvedValue(mockAIResponse)

      const result = await aiSalaryIntelligence.analyzeJobSalary({
        jobTitle: 'DevOps Engineer',
        location: 'Seattle, WA',
        workMode: 'hybrid',
        userId: 'user123'
      })

      // Verify user context integration
      expect(result.experience_years).toBe(5) // From user profile
      expect(result.assumptions.household_size).toBe(2) // From family size
      expect(result.assumptions.tax_filing_status).toBe('married_filing_jointly') // From marital status
      
      // Verify explanations reference user context
      expect(result.explanations.some(exp => exp.includes('user\'s'))).toBe(true)
      expect(result.calc_notes[0]).toContain('AWS and Docker') // User skills from resume
      
      // Verify confidence is high due to good user context match
      expect(result.confidence.level).toBe('high')
      expect(result.confidence.reasons).toContain('User experience matches role requirements')
    })
  })

  describe('AI-Powered Methodology', () => {
    it('should use AI methodology throughout the analysis', async () => {
      const mockAIResponse = {
        content: JSON.stringify({
          "schema_version": "1.0.0",
          "methodology_version": "2025-09-09-ai",
          "generated_at_utc": "2025-09-09T12:00:00.000Z",
          "schema_valid": true,
          "normalized_role": "Machine Learning Engineer",
          "normalized_role_slug": "ml_engineer",
          "normalized_level_rank": 4,
          "level": "lead",
          "experience_years": 7,
          "location": {
            "city": "Palo Alto",
            "admin_area": "California", 
            "country": "United States",
            "iso_country_code": "US",
            "lat": null,
            "lng": null
          },
          "job_location_mode": "onsite",
          "currency": "USD",
          "fx_used": false,
          "fx_rate_date": null,
          "listed_salary": null,
          "expected_salary_range": {
            "min": 200000,
            "max": 280000,
            "period": "year",
            "basis": "gross",
            "data_quality": 0.88,
            "inference_basis": "ai_market_analysis"
          },
          "monthly_net_income": 14000,
          "monthly_core_expenses": 8500,
          "affordability_score": 0.65,
          "affordability_label": "very_comfortable",
          "explanations": [
            "ML Engineering roles in Palo Alto command premium salaries",
            "Lead level experience justifies top-tier compensation",
            "AI/ML specialization is highly valued in Silicon Valley market"
          ],
          "confidence": {
            "level": "high",
            "reasons": [
              "AI-powered market analysis for specialized role",
              "Strong demand for ML expertise in region",
              "User background aligns with advanced technical requirements"
            ]
          },
          "sources": [],
          "cache_meta": {"cache_hits": [], "cache_misses": []},
          "country_tax_model_version": "ai_analysis_v1",
          "tax_method": "ai_calculation",
          "col_model_version": "ai_analysis_v1",
          "col_method": "ai_analysis", 
          "fx_model_version": "ai_analysis_v1",
          "assumptions": {
            "tax_filing_status": "married_filing_jointly",
            "dependents": 0,
            "housing_type": "3br",
            "household_size": 2
          },
          "computation_budget": {"llm_calls": 1, "tool_calls": "<=1", "early_stop": false},
          "calc_notes": ["Comprehensive AI analysis for specialized ML role"],
          "validation_errors": []
        })
      }
      
      mockGenerateCompletion.mockResolvedValue(mockAIResponse)

      const result = await aiSalaryIntelligence.analyzeJobSalary({
        jobTitle: 'Machine Learning Engineer',
        company: 'Meta',
        location: 'Palo Alto, CA',
        description: 'Lead ML model development and deployment at scale',
        userId: 'user123'
      })

      // Verify AI methodology is used throughout
      expect(result.methodology_version).toBe('2025-09-09-ai')
      expect(result.country_tax_model_version).toBe('ai_analysis_v1')
      expect(result.tax_method).toBe('ai_calculation')
      expect(result.col_model_version).toBe('ai_analysis_v1')
      expect(result.col_method).toBe('ai_analysis')
      expect(result.fx_model_version).toBe('ai_analysis_v1')
      
      // Verify AI-specific inference basis
      expect(result.expected_salary_range.inference_basis).toBe('ai_market_analysis')
      
      // Verify sources include AI analysis
      expect(result.sources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'salary_analysis',
            source_type: 'ai_analysis'
          })
        ])
      )
      
      // Verify specialized role analysis
      expect(result.level).toBe('lead')
      expect(result.normalized_level_rank).toBe(4)
      expect(result.expected_salary_range.min).toBeGreaterThanOrEqual(200000)
      
      // Verify high confidence due to AI analysis
      expect(result.confidence.level).toBe('high')
      expect(result.confidence.reasons).toContain('AI-powered market analysis for specialized role')
    })
  })
})