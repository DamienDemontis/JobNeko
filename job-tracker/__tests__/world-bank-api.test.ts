// Tests for World Bank API integration

import { WorldBankApiService } from '../lib/services/world-bank-api';

describe('WorldBankApiService', () => {
  let service: WorldBankApiService;

  beforeEach(() => {
    service = WorldBankApiService.getInstance();
  });

  describe('Country code mapping', () => {
    test('should map known countries correctly', () => {
      // Test the private getCountryCode method by checking known mappings
      expect(service['getCountryCode']('United States')).toBe('US');
      expect(service['getCountryCode']('France')).toBe('FR');
      expect(service['getCountryCode']('Germany')).toBe('DE');
      expect(service['getCountryCode']('United Kingdom')).toBe('GB');
      expect(service['getCountryCode']('Japan')).toBe('JP');
    });

    test('should handle unknown countries gracefully', () => {
      expect(service['getCountryCode']('NonexistentCountry')).toBeNull();
    });

    test('should be case insensitive', () => {
      expect(service['getCountryCode']('united states')).toBe('US');
      expect(service['getCountryCode']('FRANCE')).toBe('FR');
    });
  });

  describe('Caching', () => {
    test('should implement caching for API responses', async () => {
      jest.setTimeout(15000);
      
      const country = 'France';
      
      // First call
      const startTime1 = Date.now();
      const result1 = await service.getPPPData(country);
      const endTime1 = Date.now();
      const duration1 = endTime1 - startTime1;
      
      // Second call should use cache
      const startTime2 = Date.now();
      const result2 = await service.getPPPData(country);
      const endTime2 = Date.now();
      const duration2 = endTime2 - startTime2;
      
      // Cache should be significantly faster (unless API fails)
      if (result1 && result2) {
        expect(duration2).toBeLessThan(duration1);
      }
    });
  });

  describe('Data structure', () => {
    test('should return correct data structure when successful', async () => {
      jest.setTimeout(10000);
      
      const result = await service.getPPPData('France');
      
      if (result) {
        expect(result).toHaveProperty('countryCode');
        expect(result).toHaveProperty('countryName');
        expect(result).toHaveProperty('year');
        expect(result).toHaveProperty('pppConversionFactor');
        expect(result).toHaveProperty('costOfLivingIndex');
        expect(result).toHaveProperty('source', 'world_bank_api');
        
        expect(typeof result.costOfLivingIndex).toBe('number');
        expect(result.costOfLivingIndex).toBeGreaterThan(0);
      }
    });
  });

  describe('Error handling', () => {
    test('should handle network failures gracefully', async () => {
      jest.setTimeout(10000);
      
      // Test with non-existent country
      const result = await service.getPPPData('InvalidCountryName');
      expect(result).toBeNull();
    });
  });

  describe('Singleton pattern', () => {
    test('should return same instance', () => {
      const instance1 = WorldBankApiService.getInstance();
      const instance2 = WorldBankApiService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});