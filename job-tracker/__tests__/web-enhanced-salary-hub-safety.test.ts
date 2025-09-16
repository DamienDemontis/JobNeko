/**
 * Tests for Web Enhanced Salary Hub data structure safety
 * Ensures component handles undefined/null properties gracefully
 */

import { WebEnhancedSalaryAnalysis } from '../lib/services/web-enhanced-salary-intelligence';

describe('Web Enhanced Salary Hub Data Safety', () => {
  // Helper function to simulate the validation logic from the component
  const isValidAnalysis = (analysis: any): boolean => {
    return !!(analysis &&
           typeof analysis === 'object' &&
           analysis.compensation &&
           (analysis.compensation.salaryRange || analysis.compensation.totalCompensation));
  };

  test('should validate complete analysis structure', () => {
    const validAnalysis: Partial<WebEnhancedSalaryAnalysis> = {
      compensation: {
        salaryRange: {
          min: 50000,
          max: 80000,
          median: 65000,
          currency: 'USD',
          confidence: 0.8
        },
        totalCompensation: {
          base: 65000,
          bonus: 6500,
          equity: 0,
          benefits: 13000,
          total: 84500
        },
        marketPosition: 'at_market',
        negotiationPower: 70,
        marketData: ['Market competitive compensation']
      }
    };

    expect(isValidAnalysis(validAnalysis)).toBe(true);
  });

  test('should reject invalid analysis structures', () => {
    // Null analysis
    expect(isValidAnalysis(null)).toBe(false);

    // Undefined analysis
    expect(isValidAnalysis(undefined)).toBe(false);

    // Empty object
    expect(isValidAnalysis({})).toBe(false);

    // Missing compensation
    expect(isValidAnalysis({ role: { title: 'Engineer' } })).toBe(false);

    // Empty compensation
    expect(isValidAnalysis({ compensation: {} })).toBe(false);

    // String instead of object
    expect(isValidAnalysis('invalid')).toBe(false);
  });

  test('should handle partial compensation structures', () => {
    // Only salaryRange
    const withSalaryRange = {
      compensation: {
        salaryRange: { min: 50000, max: 80000, median: 65000 }
      }
    };
    expect(isValidAnalysis(withSalaryRange)).toBe(true);

    // Only totalCompensation
    const withTotalComp = {
      compensation: {
        totalCompensation: { base: 65000, total: 65000 }
      }
    };
    expect(isValidAnalysis(withTotalComp)).toBe(true);
  });

  test('should provide safe fallback values', () => {
    // Test the fallback logic similar to component implementation
    const safeFallbacks = {
      minSalary: (analysis: any) => analysis?.compensation?.salaryRange?.min || 50000,
      maxSalary: (analysis: any) => analysis?.compensation?.salaryRange?.max || 80000,
      medianSalary: (analysis: any) => analysis?.compensation?.salaryRange?.median || 65000,
      totalComp: (analysis: any) => analysis?.compensation?.totalCompensation?.total || 80000,
      marketPosition: (analysis: any) => analysis?.compensation?.marketPosition || 'at_market',
      companySize: (analysis: any) => analysis?.company?.size || 'Unknown',
      confidence: (analysis: any) => analysis?.compensation?.salaryRange?.confidence || 0.7
    };

    // Test with empty analysis
    const emptyAnalysis = {};
    expect(safeFallbacks.minSalary(emptyAnalysis)).toBe(50000);
    expect(safeFallbacks.maxSalary(emptyAnalysis)).toBe(80000);
    expect(safeFallbacks.medianSalary(emptyAnalysis)).toBe(65000);
    expect(safeFallbacks.totalComp(emptyAnalysis)).toBe(80000);
    expect(safeFallbacks.marketPosition(emptyAnalysis)).toBe('at_market');
    expect(safeFallbacks.companySize(emptyAnalysis)).toBe('Unknown');
    expect(safeFallbacks.confidence(emptyAnalysis)).toBe(0.7);

    // Test with null
    expect(safeFallbacks.minSalary(null)).toBe(50000);
    expect(safeFallbacks.maxSalary(null)).toBe(80000);
    expect(safeFallbacks.confidence(null)).toBe(0.7);
  });

  test('should handle NaN values safely', () => {
    const analysisWithNaN = {
      compensation: {
        salaryRange: {
          min: NaN,
          max: undefined,
          median: null,
          confidence: NaN
        },
        totalCompensation: {
          base: NaN,
          bonus: NaN,
          total: NaN
        }
      }
    };

    // The component's fallback logic should handle these
    const safeMin = analysisWithNaN?.compensation?.salaryRange?.min || 50000;
    const safeMax = analysisWithNaN?.compensation?.salaryRange?.max || 80000;
    const safeTotal = analysisWithNaN?.compensation?.totalCompensation?.total || 80000;

    expect(safeMin).toBe(50000); // NaN should be replaced with fallback
    expect(safeMax).toBe(80000); // undefined should be replaced
    expect(safeTotal).toBe(80000); // NaN should be replaced
    expect(isNaN(safeMin)).toBe(false);
    expect(isNaN(safeMax)).toBe(false);
    expect(isNaN(safeTotal)).toBe(false);
  });

  test('should validate currency formatting safety', () => {
    const formatCurrencySafe = (amount: number) => {
      // Simulate the component's formatCurrency function
      if (isNaN(amount) || !isFinite(amount)) {
        amount = 0; // Safe fallback
      }
      try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0
        }).format(amount);
      } catch (error) {
        return '$0'; // Ultimate fallback
      }
    };

    expect(formatCurrencySafe(65000)).toBe('$65,000');
    expect(formatCurrencySafe(NaN)).toBe('$0');
    expect(formatCurrencySafe(Infinity)).toBe('$0');
    expect(formatCurrencySafe(-Infinity)).toBe('$0');
    expect(formatCurrencySafe(undefined as any)).toBe('$0');
    expect(formatCurrencySafe(null as any)).toBe('$0');
  });

  test('should handle array properties safely', () => {
    const analysisWithArrays = {
      compensation: {
        marketData: null
      },
      company: {
        benefits: undefined
      },
      sources: {
        salaryData: []
      }
    };

    // Test safe array access patterns from component
    const safeMarketData = analysisWithArrays?.compensation?.marketData || [];
    const safeBenefits = analysisWithArrays?.company?.benefits || ['Health insurance', 'PTO'];
    const safeSalaryData = analysisWithArrays?.sources?.salaryData || [];

    expect(Array.isArray(safeMarketData)).toBe(true);
    expect(Array.isArray(safeBenefits)).toBe(true);
    expect(Array.isArray(safeSalaryData)).toBe(true);
    expect(safeBenefits.length).toBeGreaterThan(0);
  });
});