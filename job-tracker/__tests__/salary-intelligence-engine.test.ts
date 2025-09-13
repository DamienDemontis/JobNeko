// Comprehensive tests for Salary Intelligence Engine
// Tests the deterministic JSON output system per Sary-tab-instructions.md

import { SalaryIntelligenceEngine, salaryIntelligenceEngine } from '@/lib/services/salary-intelligence-engine';

describe('Salary Intelligence Engine', () => {
  // Test deterministic behavior - same input should produce same output
  describe('Deterministic Output', () => {
    it('should produce identical results for identical inputs', async () => {
      const request = {
        jobTitle: 'Senior Software Engineer',
        location: 'San Francisco, CA, USA',
        experienceYears: 5,
        salaryInfo: '$120,000 - $160,000',
        currency: 'USD',
        workMode: 'onsite' as const
      };

      const result1 = await salaryIntelligenceEngine.generateSalaryIntelligence(request);
      const result2 = await salaryIntelligenceEngine.generateSalaryIntelligence(request);

      // Core fields should be identical (ignoring timestamps)
      expect(result1.normalized_role).toBe(result2.normalized_role);
      expect(result1.normalized_role_slug).toBe(result2.normalized_role_slug);
      expect(result1.level).toBe(result2.level);
      expect(result1.affordability_score).toBe(result2.affordability_score);
      expect(result1.affordability_label).toBe(result2.affordability_label);
      expect(result1.monthly_net_income).toBe(result2.monthly_net_income);
      expect(result1.monthly_core_expenses).toBe(result2.monthly_core_expenses);
    });

    it('should always set llm_calls to 1 for deterministic behavior', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Data Scientist'
      });

      expect(result.computation_budget.llm_calls).toBe(1);
    });
  });

  // Test schema validation
  describe('Schema Validation', () => {
    it('should produce valid schema for complete input', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Software Engineer',
        location: 'Berlin, Germany',
        experienceYears: 3,
        salaryInfo: '€70,000 - €90,000',
        currency: 'EUR',
        workMode: 'hybrid'
      });

      // Required fields validation
      expect(result.schema_version).toBe('1.0.0');
      expect(result.methodology_version).toBe('2025-09-01.a');
      expect(result.generated_at_utc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(typeof result.schema_valid).toBe('boolean');
      
      // Role fields
      expect(typeof result.normalized_role).toBe('string');
      expect(typeof result.normalized_role_slug).toBe('string');
      expect(typeof result.normalized_level_rank).toBe('number');
      expect(['intern', 'junior', 'mid', 'senior', 'lead', 'staff', 'principal', 'unknown']).toContain(result.level);
      
      // Location fields
      expect(typeof result.location.country).toBe('string');
      expect(typeof result.location.iso_country_code).toBe('string');
      expect(['onsite', 'hybrid', 'remote_country', 'remote_global']).toContain(result.job_location_mode);
      
      // Currency and FX
      expect(typeof result.currency).toBe('string');
      expect(typeof result.fx_used).toBe('boolean');
      
      // Expected salary range (always required)
      expect(result.expected_salary_range).toBeDefined();
      expect(['year', 'month', 'day', 'hour']).toContain(result.expected_salary_range.period);
      expect(['gross', 'net']).toContain(result.expected_salary_range.basis);
      
      // Affordability (core calculation)
      expect(['unaffordable', 'tight', 'comfortable', 'very_comfortable']).toContain(result.affordability_label);
      
      // Metadata
      expect(Array.isArray(result.explanations)).toBe(true);
      expect(result.confidence).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(result.confidence.level);
      expect(Array.isArray(result.confidence.reasons)).toBe(true);
      expect(Array.isArray(result.sources)).toBe(true);
      
      // Model versions
      expect(typeof result.country_tax_model_version).toBe('string');
      expect(['model', 'approx_table', 'inference']).toContain(result.tax_method);
      expect(typeof result.col_model_version).toBe('string');
      expect(['city', 'admin_area', 'country', 'inference']).toContain(result.col_method);
      expect(typeof result.fx_model_version).toBe('string');
      
      // Assumptions
      expect(result.assumptions).toBeDefined();
      expect(typeof result.assumptions.tax_filing_status).toBe('string');
      expect(typeof result.assumptions.dependents).toBe('number');
      expect(typeof result.assumptions.housing_type).toBe('string');
      expect(typeof result.assumptions.household_size).toBe('number');
      
      // Arrays
      expect(Array.isArray(result.calc_notes)).toBe(true);
      expect(Array.isArray(result.validation_errors)).toBe(true);
    });

    it('should handle missing optional fields gracefully', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Developer'
      });

      expect(result.schema_valid).toBe(true);
      expect(result.validation_errors).toHaveLength(0);
      expect(result.location.country).toBe('Global'); // Default for no location
      expect(result.experience_years).toBeNull(); // No experience provided
      expect(result.listed_salary).toBeNull(); // No salary provided
    });

    it('should validate affordability_score bounds (-1 to 3)', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Senior Engineer',
        location: 'New York, USA',
        salaryInfo: '$200,000'
      });

      if (result.affordability_score !== null) {
        expect(result.affordability_score).toBeGreaterThanOrEqual(-1);
        expect(result.affordability_score).toBeLessThanOrEqual(3);
      }
    });
  });

  // Test role normalization
  describe('Role Normalization', () => {
    it('should normalize software engineering titles correctly', async () => {
      const testCases = [
        { title: 'Software Engineer', expected: 'Software Engineer' },
        { title: 'Full Stack Developer', expected: 'Software Engineer' },
        { title: 'Backend Engineer', expected: 'Software Engineer' },
        { title: 'Programmer', expected: 'Software Engineer' }
      ];

      for (const testCase of testCases) {
        const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
          jobTitle: testCase.title
        });
        expect(result.normalized_role).toBe(testCase.expected);
        expect(result.normalized_role_slug).toBe('software_engineer');
      }
    });

    it('should detect seniority levels from job titles', async () => {
      const testCases = [
        { title: 'Junior Software Engineer', expectedLevel: 'junior', expectedRank: 1 },
        { title: 'Software Engineer', expectedLevel: 'mid', expectedRank: 2 },
        { title: 'Senior Software Engineer', expectedLevel: 'senior', expectedRank: 3 },
        { title: 'Lead Engineer', expectedLevel: 'lead', expectedRank: 4 },
        { title: 'Software Engineering Intern', expectedLevel: 'intern', expectedRank: 0 }
      ];

      for (const testCase of testCases) {
        const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
          jobTitle: testCase.title
        });
        expect(result.level).toBe(testCase.expectedLevel);
        expect(result.normalized_level_rank).toBe(testCase.expectedRank);
      }
    });

    it('should use experience years when title lacks seniority indicators', async () => {
      const testCases = [
        { years: 1, expectedLevel: 'junior' },
        { years: 3, expectedLevel: 'mid' },
        { years: 6, expectedLevel: 'senior' },
        { years: 10, expectedLevel: 'lead' }
      ];

      for (const testCase of testCases) {
        const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
          jobTitle: 'Software Engineer',
          experienceYears: testCase.years
        });
        expect(result.level).toBe(testCase.expectedLevel);
      }
    });
  });

  // Test location normalization
  describe('Location Normalization', () => {
    it('should parse "City, Country" format correctly', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        location: 'London, UK'
      });

      expect(result.location.city).toBe('London');
      expect(result.location.country).toBe('Uk');
      expect(result.location.iso_country_code).toBe('GB');
    });

    it('should handle "City, State, Country" format', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        location: 'Austin, Texas, USA'
      });

      expect(result.location.city).toBe('Austin');
      expect(result.location.admin_area).toBe('Texas');
      expect(result.location.country).toBe('Usa');
      expect(result.location.iso_country_code).toBe('US');
    });

    it('should handle remote work correctly', async () => {
      const testCases = ['Remote', 'Remote work', 'Work from anywhere', 'Fully remote'];

      for (const location of testCases) {
        const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
          jobTitle: 'Engineer',
          location
        });

        expect(result.location.city).toBeNull();
        expect(result.location.country).toBe('Global');
        expect(result.location.iso_country_code).toBe('XX');
      }
    });

    it('should handle single country input', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        location: 'Germany'
      });

      expect(result.location.city).toBeNull();
      expect(result.location.country).toBe('Germany');
    });
  });

  // Test salary parsing
  describe('Salary Parsing', () => {
    it('should parse salary ranges correctly', async () => {
      const testCases = [
        { 
          input: '$80,000 - $120,000', 
          expectedMin: 80000, 
          expectedMax: 120000,
          expectedCurrency: 'USD'
        },
        { 
          input: '€60,000-€80,000', 
          expectedMin: 60000, 
          expectedMax: 80000,
          expectedCurrency: 'EUR' 
        },
        { 
          input: '£50,000 to £70,000', 
          expectedMin: 50000, 
          expectedMax: 70000,
          expectedCurrency: 'GBP' 
        }
      ];

      for (const testCase of testCases) {
        const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
          jobTitle: 'Engineer',
          salaryInfo: testCase.input
        });

        expect(result.listed_salary?.min).toBe(testCase.expectedMin);
        expect(result.listed_salary?.max).toBe(testCase.expectedMax);
        expect(result.currency).toBe(testCase.expectedCurrency);
      }
    });

    it('should handle single salary amounts', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        salaryInfo: '$100,000'
      });

      expect(result.listed_salary?.min).toBe(100000);
      expect(result.listed_salary?.max).toBe(100000);
      expect(result.currency).toBe('USD');
    });

    it('should default to yearly period for salary', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        salaryInfo: '$100,000'
      });

      expect(result.listed_salary?.period).toBe('year');
      expect(result.listed_salary?.basis).toBe('gross');
    });

    it('should handle hourly rates', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        salaryInfo: '$50/hr'
      });

      expect(result.listed_salary?.period).toBe('hour');
      expect(result.currency).toBe('USD');
    });
  });

  // Test tax calculations
  describe('Tax Calculations', () => {
    it('should calculate US taxes correctly', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        location: 'San Francisco, USA',
        salaryInfo: '$100,000'
      });

      expect(result.country_tax_model_version).toBe('US-2025.1');
      expect(result.tax_method).toBe('model');
      expect(result.monthly_net_income).toBeLessThan(100000 / 12); // Should be less due to taxes
      expect(result.monthly_net_income).toBeGreaterThan(0);
    });

    it('should calculate UK taxes correctly', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        location: 'London, UK',
        salaryInfo: '£60,000'
      });

      expect(result.country_tax_model_version).toBe('GB-2025.1');
      expect(result.tax_method).toBe('model');
      expect(result.monthly_net_income).toBeGreaterThan(0);
    });

    it('should handle unknown countries with fallback', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        location: 'Unknown Country',
        salaryInfo: '$50,000'
      });

      // Should fallback to US tax model
      expect(result.country_tax_model_version).toBe('US-2025.1');
      expect(result.monthly_net_income).toBeGreaterThan(0);
    });
  });

  // Test expected salary range calculations
  describe('Expected Salary Range', () => {
    it('should provide salary estimates even without listed salary', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Senior Software Engineer',
        location: 'San Francisco, USA',
        experienceYears: 5
      });

      expect(result.listed_salary).toBeNull();
      expect(result.expected_salary_range).toBeDefined();
      expect(result.expected_salary_range.min).toBeGreaterThan(0);
      expect(result.expected_salary_range.max).toBeGreaterThan(result.expected_salary_range.min!);
      expect(result.expected_salary_range.period).toBe('year');
      expect(result.expected_salary_range.basis).toBe('gross');
    });

    it('should apply location multipliers correctly', async () => {
      // San Francisco should have higher salaries than a smaller city
      const sfResult = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Software Engineer',
        location: 'San Francisco, USA'
      });

      const remoteResult = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Software Engineer',
        location: 'Remote'
      });

      expect(sfResult.expected_salary_range.min!).toBeGreaterThan(remoteResult.expected_salary_range.min!);
      expect(sfResult.expected_salary_range.max!).toBeGreaterThan(remoteResult.expected_salary_range.max!);
    });

    it('should scale salaries by seniority level', async () => {
      const juniorResult = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Junior Software Engineer',
        location: 'New York, USA'
      });

      const seniorResult = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Senior Software Engineer',
        location: 'New York, USA'
      });

      expect(seniorResult.expected_salary_range.min!).toBeGreaterThan(juniorResult.expected_salary_range.min!);
      expect(seniorResult.expected_salary_range.max!).toBeGreaterThan(juniorResult.expected_salary_range.max!);
    });
  });

  // Test affordability calculations
  describe('Affordability Calculations', () => {
    it('should calculate affordability scores correctly', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Software Engineer',
        location: 'Austin, USA',
        salaryInfo: '$120,000'
      });

      expect(result.affordability_score).not.toBeNull();
      expect(result.affordability_score!).toBeGreaterThanOrEqual(-1);
      expect(result.affordability_score!).toBeLessThanOrEqual(3);
      expect(['unaffordable', 'tight', 'comfortable', 'very_comfortable']).toContain(result.affordability_label);
    });

    it('should label high salaries as very comfortable', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Staff Engineer',
        location: 'Remote',
        salaryInfo: '$300,000'
      });

      expect(result.affordability_score!).toBeGreaterThan(0.6);
      expect(result.affordability_label).toBe('very_comfortable');
    });

    it('should handle cases where expenses exceed income', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Intern',
        location: 'San Francisco, USA',
        salaryInfo: '$30,000'
      });

      expect(result.affordability_score!).toBeLessThan(0);
      expect(result.affordability_label).toBe('unaffordable');
    });
  });

  // Test cost of living integration
  describe('Cost of Living', () => {
    it('should use city-specific cost of living data when available', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        location: 'New York, USA'
      });

      expect(result.col_method).toBe('city');
      expect(result.monthly_core_expenses).toBeGreaterThan(0);
    });

    it('should fallback to country-level data for unknown cities', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        location: 'Unknown City, USA'
      });

      expect(['city', 'country', 'inference']).toContain(result.col_method);
      expect(result.monthly_core_expenses).toBeGreaterThan(0);
    });

    it('should account for higher living costs in expensive cities', async () => {
      const sfResult = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        location: 'San Francisco, USA'
      });

      const berlinResult = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        location: 'Berlin, Germany'
      });

      // San Francisco should have higher core expenses than Berlin
      expect(sfResult.monthly_core_expenses!).toBeGreaterThan(berlinResult.monthly_core_expenses!);
    });
  });

  // Test error handling and edge cases
  describe('Error Handling', () => {
    it('should handle computation budget limits', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence(
        {
          jobTitle: 'Engineer',
          location: 'Complex Location That Needs Processing'
        },
        {
          llm_calls: 1,
          tool_calls: '<=1',
          early_stop: true
        }
      );

      expect(result.computation_budget.early_stop).toBe(true);
      expect(result.computation_budget.tool_calls).toBe('<=1');
    });

    it('should provide meaningful error messages in validation_errors', async () => {
      // This should succeed, but we test the structure
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer'
      });

      expect(Array.isArray(result.validation_errors)).toBe(true);
      // Should be empty for valid input
      expect(result.validation_errors).toHaveLength(0);
    });

    it('should handle empty or minimal input gracefully', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer'
      });

      expect(result.schema_valid).toBe(true);
      expect(result.normalized_role).toBe('Software Engineer');
      expect(result.location.country).toBe('Global'); // Default for no location
    });
  });

  // Test source tracking and provenance
  describe('Source Tracking', () => {
    it('should track data sources correctly', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        location: 'Berlin, Germany',
        salaryInfo: '€70,000'
      });

      expect(Array.isArray(result.sources)).toBe(true);
      expect(result.sources.length).toBeGreaterThan(0);
      
      // Check source structure
      for (const source of result.sources) {
        expect(typeof source.field).toBe('string');
        expect(['api', 'cache', 'scrape', 'inference']).toContain(source.source_type);
        expect(typeof source.url_or_name).toBe('string');
        expect(typeof source.retrieved_at).toBe('string');
      }
    });

    it('should track cache hits and misses', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer'
      });

      expect(result.cache_meta).toBeDefined();
      expect(Array.isArray(result.cache_meta.cache_hits)).toBe(true);
      expect(Array.isArray(result.cache_meta.cache_misses)).toBe(true);
    });
  });

  // Test confidence assessment
  describe('Confidence Assessment', () => {
    it('should provide higher confidence for complete input', async () => {
      const completeResult = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Senior Software Engineer',
        location: 'Berlin, Germany',
        experienceYears: 5,
        salaryInfo: '€80,000',
        workMode: 'hybrid'
      });

      const minimalResult = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer'
      });

      // More complete input should generally have higher confidence
      const completeConfidenceValue = 
        completeResult.confidence.level === 'high' ? 3 :
        completeResult.confidence.level === 'medium' ? 2 : 1;
      
      const minimalConfidenceValue = 
        minimalResult.confidence.level === 'high' ? 3 :
        minimalResult.confidence.level === 'medium' ? 2 : 1;

      expect(completeConfidenceValue).toBeGreaterThanOrEqual(minimalConfidenceValue);
    });

    it('should provide confidence reasons', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer'
      });

      expect(Array.isArray(result.confidence.reasons)).toBe(true);
      expect(result.confidence.reasons.length).toBeGreaterThan(0);
      
      for (const reason of result.confidence.reasons) {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(0);
      }
    });
  });

  // Test explanations and calc notes
  describe('Explanations and Notes', () => {
    it('should provide meaningful explanations', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        location: 'London, UK',
        salaryInfo: '£65,000'
      });

      expect(Array.isArray(result.explanations)).toBe(true);
      expect(result.explanations.length).toBeGreaterThan(0);
      
      // Should explain tax and COL calculations
      const explanationText = result.explanations.join(' ').toLowerCase();
      expect(explanationText).toContain('tax');
      expect(explanationText).toContain('expense');
    });

    it('should provide calculation notes', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer'
      });

      expect(Array.isArray(result.calc_notes)).toBe(true);
      
      if (result.calc_notes.length > 0) {
        for (const note of result.calc_notes) {
          expect(typeof note).toBe('string');
        }
      }
    });
  });

  // Test monetary rounding per spec
  describe('Monetary Rounding', () => {
    it('should round USD amounts to 0 decimals', async () => {
      const result = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        location: 'USA',
        salaryInfo: '$100,000.50'
      });

      expect(result.monthly_net_income! % 1).toBe(0); // Should be whole number
      expect(result.monthly_core_expenses! % 1).toBe(0);
    });

    it('should handle different currency formats', async () => {
      const eurResult = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        location: 'Germany',
        salaryInfo: '€70,000'
      });

      const gbpResult = await salaryIntelligenceEngine.generateSalaryIntelligence({
        jobTitle: 'Engineer',
        location: 'UK',
        salaryInfo: '£60,000'
      });

      expect(typeof eurResult.monthly_net_income).toBe('number');
      expect(typeof gbpResult.monthly_net_income).toBe('number');
    });
  });
});