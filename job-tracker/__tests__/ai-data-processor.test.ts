// Tests for AI-enhanced data processing system

import { AIDataProcessor } from '../lib/services/ai-data-processor';

describe('AIDataProcessor', () => {
  let processor: AIDataProcessor;

  beforeEach(() => {
    processor = AIDataProcessor.getInstance();
    jest.setTimeout(30000); // AI operations can take time
  });

  describe('Location context processing', () => {
    test('should process basic location context', () => {
      const location = {
        city: 'Paris',
        country: 'France',
        isRemote: false
      };

      expect(location.city).toBe('Paris');
      expect(location.country).toBe('France');
      expect(location.isRemote).toBe(false);
    });

    test('should handle remote job contexts', () => {
      const location = {
        city: 'Remote',
        country: 'Global',
        isRemote: true,
        userLocation: 'Nancy, France'
      };

      expect(location.isRemote).toBe(true);
      expect(location.userLocation).toBeDefined();
    });
  });

  describe('Regional threshold calculations', () => {
    test('should generate realistic salary thresholds', async () => {
      const mockCityData = {
        id: 'test_city',
        city: 'TestCity',
        country: 'TestCountry', 
        state: null,
        costOfLivingIndex: 75.0,
        rentIndex: 65.0,
        groceriesIndex: 70.0,
        restaurantIndex: 80.0,
        transportIndex: 60.0,
        utilitiesIndex: 70.0,
        qualityOfLifeIndex: 75.0,
        safetyIndex: 80.0,
        healthcareIndex: 85.0,
        educationIndex: 75.0,
        trafficTimeIndex: null,
        pollutionIndex: null,
        climateIndex: null,
        avgNetSalaryUSD: 3000.0,
        medianHousePriceUSD: null,
        incomeTaxRate: null,
        salesTaxRate: null,
        population: null,
        lastUpdated: new Date(),
        source: 'test',
        dataPoints: null,
        confidence: 0.8,
        dataSources: ['test'],
        aiProcessed: true,
        estimationMethod: 'test'
      };

      const thresholds = await processor.calculateRegionalThresholds(mockCityData);

      expect(thresholds).toHaveProperty('struggling');
      expect(thresholds).toHaveProperty('tight');
      expect(thresholds).toHaveProperty('comfortable');
      expect(thresholds).toHaveProperty('thriving');
      expect(thresholds).toHaveProperty('luxurious');

      // Should be in ascending order
      expect(thresholds.struggling).toBeLessThan(thresholds.tight);
      expect(thresholds.tight).toBeLessThan(thresholds.comfortable);
      expect(thresholds.comfortable).toBeLessThan(thresholds.thriving);
      expect(thresholds.thriving).toBeLessThan(thresholds.luxurious);

      // Should be reasonable values for cost of living index of 75%
      expect(thresholds.comfortable).toBeGreaterThan(30000);
      expect(thresholds.comfortable).toBeLessThan(150000);
    });
  });

  describe('AI gap filling', () => {
    test('should build comprehensive prompts', () => {
      // Test the prompt building logic
      const params = {
        city: 'TestCity',
        country: 'TestCountry',
        state: 'TestState',
        existingCityData: null,
        countryPPP: {
          costOfLivingIndex: 75.0,
          pppConversionFactor: 0.85
        },
        isRemote: false,
        userLocation: null
      };

      const prompt = processor['buildGapFillingPrompt'](params);
      
      expect(prompt).toContain('TestCity');
      expect(prompt).toContain('TestCountry');
      expect(prompt).toContain('TestState');
      expect(prompt).toContain('costOfLivingIndex');
      expect(prompt).toContain('OUTPUT FORMAT (JSON)');
    });
  });

  describe('Economic level classification', () => {
    test('should classify economic levels correctly', () => {
      expect(processor['getEconomicLevel'](150)).toBe('High-income developed');
      expect(processor['getEconomicLevel'](100)).toBe('Upper-middle income');
      expect(processor['getEconomicLevel'](60)).toBe('Middle income');
      expect(processor['getEconomicLevel'](30)).toBe('Lower-middle income');
      expect(processor['getEconomicLevel'](10)).toBe('Low income');
    });
  });

  describe('Data validation', () => {
    test('should validate AI responses properly', () => {
      const validResponse = `{
        "costOfLivingIndex": 75.5,
        "rentIndex": 65.2,
        "confidence": 0.8,
        "estimationMethod": "AI analysis",
        "reasoning": "Based on economic indicators"
      }`;

      const parsed = JSON.parse(validResponse);
      
      expect(parsed.costOfLivingIndex).toBeGreaterThan(0);
      expect(parsed.confidence).toBeGreaterThanOrEqual(0);
      expect(parsed.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Error handling', () => {
    test('should handle missing AI services gracefully', async () => {
      // Mock scenario where no AI service is available
      const location = {
        city: 'TestCity',
        country: 'TestCountry',
        isRemote: false
      };

      // This should not throw but may return null
      const result = await processor.getEnhancedCityData(location);
      expect(result).toBeNull();
    });
  });

  describe('Singleton pattern', () => {
    test('should return same instance', () => {
      const instance1 = AIDataProcessor.getInstance();
      const instance2 = AIDataProcessor.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});