import { NumbeoScraper } from '../lib/services/numbeo-scraper';
import { prisma } from '../lib/prisma';

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    cityData: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn()
    }
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('Numbeo Scraper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCityData = {
    id: 'test-city-id',
    city: 'New York',
    country: 'USA',
    state: 'NY',
    costOfLivingIndex: 100,
    rentIndex: 100,
    groceriesIndex: 95,
    restaurantIndex: 105,
    transportIndex: 90,
    utilitiesIndex: 85,
    qualityOfLifeIndex: 85,
    safetyIndex: 80,
    healthcareIndex: 90,
    educationIndex: 88,
    trafficTimeIndex: 60,
    pollutionIndex: 55,
    climateIndex: 75,
    avgNetSalaryUSD: 70000,
    medianHousePriceUSD: 650000,
    incomeTaxRate: 30,
    salesTaxRate: 8.5,
    population: 8000000,
    lastUpdated: new Date(),
    source: 'numbeo',
    dataPoints: 5000
  };

  describe('getCityData', () => {
    test('returns cached data when available and recent', async () => {
      const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      (prisma.cityData.findUnique as jest.Mock).mockResolvedValue({
        ...mockCityData,
        lastUpdated: recentDate
      });

      const result = await NumbeoScraper.getCityData('New York', 'USA', 'NY');

      expect(result).toEqual(expect.objectContaining({
        city: 'New York',
        country: 'USA',
        costOfLivingIndex: 100
      }));
      expect(prisma.cityData.findUnique).toHaveBeenCalledWith({
        where: {
          city_country_state: {
            city: 'New York',
            country: 'USA',
            state: 'NY'
          }
        }
      });
    });

    test('scrapes new data when cache is stale', async () => {
      const staleDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      (prisma.cityData.findUnique as jest.Mock).mockResolvedValue({
        ...mockCityData,
        lastUpdated: staleDate
      });

      const mockHtml = `
        <html>
          <body>
            <table class="data_wide_table">
              <tr><td>Cost of Living Index</td><td style="text-align: right">95.5</td></tr>
              <tr><td>Rent Index</td><td style="text-align: right">85.2</td></tr>
              <tr><td>Groceries Index</td><td style="text-align: right">92.1</td></tr>
              <tr><td>Restaurant Price Index</td><td style="text-align: right">88.7</td></tr>
              <tr><td>Local Purchasing Power Index</td><td style="text-align: right">110.3</td></tr>
            </table>
            <table>
              <tr><td>Quality of Life Index</td><td style="text-align: right">178.5</td></tr>
              <tr><td>Safety Index</td><td style="text-align: right">65.2</td></tr>
              <tr><td>Health Care Index</td><td style="text-align: right">85.4</td></tr>
              <tr><td>Climate Index</td><td style="text-align: right">75.8</td></tr>
            </table>
          </body>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });

      (prisma.cityData.upsert as jest.Mock).mockResolvedValue({
        ...mockCityData,
        costOfLivingIndex: 95.5,
        rentIndex: 85.2
      });

      const result = await NumbeoScraper.getCityData('Berlin', 'Germany');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('numbeo.com/cost-of-living/in/Berlin')
      );
      expect(prisma.cityData.upsert).toHaveBeenCalled();
      expect(result?.costOfLivingIndex).toBe(95.5);
    });

    test('returns null when city data cannot be found or scraped', async () => {
      (prisma.cityData.findUnique as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      });

      const result = await NumbeoScraper.getCityData('NonExistent', 'Country');
      expect(result).toBeNull();
    });

    test('handles scraping errors gracefully', async () => {
      (prisma.cityData.findUnique as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await NumbeoScraper.getCityData('Test City', 'Test Country');
      expect(result).toBeNull();
    });
  });

  describe('scraping functionality', () => {
    test('parses cost of living data correctly', async () => {
      const mockHtml = `
        <html>
          <body>
            <table class="data_wide_table">
              <tr><td>Cost of Living Index</td><td style="text-align: right">120.5</td></tr>
              <tr><td>Rent Index</td><td style="text-align: right">110.8</td></tr>
              <tr><td>Groceries Index</td><td style="text-align: right">115.2</td></tr>
              <tr><td>Restaurant Price Index</td><td style="text-align: right">125.7</td></tr>
              <tr><td>Local Purchasing Power Index</td><td style="text-align: right">95.3</td></tr>
            </table>
          </body>
        </html>
      `;

      (prisma.cityData.findUnique as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });

      (prisma.cityData.upsert as jest.Mock).mockImplementation(({ create }) => 
        Promise.resolve({ id: 'test-id', ...create })
      );

      const result = await NumbeoScraper.getCityData('Expensive City', 'Country');

      expect(result).toEqual(expect.objectContaining({
        costOfLivingIndex: 120.5,
        rentIndex: 110.8,
        groceriesIndex: 115.2,
        restaurantIndex: 125.7
      }));
    });

    test('parses quality of life data correctly', async () => {
      const mockHtml = `
        <html>
          <body>
            <table>
              <tr><td>Quality of Life Index</td><td style="text-align: right">185.2</td></tr>
              <tr><td>Safety Index</td><td style="text-align: right">85.7</td></tr>
              <tr><td>Health Care Index</td><td style="text-align: right">92.3</td></tr>
              <tr><td>Climate Index</td><td style="text-align: right">78.9</td></tr>
              <tr><td>Cost of Living Index</td><td style="text-align: right">100.0</td></tr>
              <tr><td>Property Price to Income Ratio</td><td style="text-align: right">12.5</td></tr>
              <tr><td>Traffic Commute Time Index</td><td style="text-align: right">45.2</td></tr>
              <tr><td>Pollution Index</td><td style="text-align: right">35.8</td></tr>
            </table>
          </body>
        </html>
      `;

      (prisma.cityData.findUnique as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });

      (prisma.cityData.upsert as jest.Mock).mockImplementation(({ create }) => 
        Promise.resolve({ id: 'test-id', ...create })
      );

      const result = await NumbeoScraper.getCityData('Quality City', 'Country');

      expect(result).toEqual(expect.objectContaining({
        qualityOfLifeIndex: 185.2,
        safetyIndex: 85.7,
        healthcareIndex: 92.3,
        climateIndex: 78.9,
        trafficTimeIndex: 45.2,
        pollutionIndex: 35.8
      }));
    });

    test('handles incomplete data gracefully', async () => {
      const mockHtml = `
        <html>
          <body>
            <table class="data_wide_table">
              <tr><td>Cost of Living Index</td><td style="text-align: right">80.5</td></tr>
              <tr><td>Rent Index</td><td style="text-align: right">-</td></tr>
            </table>
          </body>
        </html>
      `;

      (prisma.cityData.findUnique as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });

      (prisma.cityData.upsert as jest.Mock).mockImplementation(({ create }) => 
        Promise.resolve({ id: 'test-id', ...create })
      );

      const result = await NumbeoScraper.getCityData('Incomplete City', 'Country');

      expect(result?.costOfLivingIndex).toBe(80.5);
      expect(result?.rentIndex).toBe(60); // Should fall back to default
    });
  });

  describe('updateCitiesData', () => {
    test('updates multiple cities in batch', async () => {
      const cities = [
        { city: 'New York', country: 'USA' },
        { city: 'London', country: 'UK' },
        { city: 'Tokyo', country: 'Japan' }
      ];

      (prisma.cityData.findUnique as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><table class="data_wide_table"><tr><td>Cost of Living Index</td><td style="text-align: right">100</td></tr></table></html>')
      });
      (prisma.cityData.upsert as jest.Mock).mockResolvedValue(mockCityData);

      await NumbeoScraper.updateCitiesData(cities);

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(prisma.cityData.upsert).toHaveBeenCalledTimes(3);
    });

    test('handles individual city failures gracefully', async () => {
      const cities = [
        { city: 'Valid City', country: 'Country' },
        { city: 'Invalid City', country: 'Country' }
      ];

      (prisma.cityData.findUnique as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html><table class="data_wide_table"><tr><td>Cost of Living Index</td><td style="text-align: right">100</td></tr></table></html>')
        })
        .mockRejectedValueOnce(new Error('Network error'));
      
      (prisma.cityData.upsert as jest.Mock).mockResolvedValue(mockCityData);

      await NumbeoScraper.updateCitiesData(cities);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(prisma.cityData.upsert).toHaveBeenCalledTimes(1); // Only successful one
    });
  });

  describe('getCommonCities', () => {
    test('returns predefined list of major cities', () => {
      const cities = NumbeoScraper.getCommonCities();

      expect(cities).toBeInstanceOf(Array);
      expect(cities.length).toBeGreaterThan(30);
      expect(cities).toEqual(expect.arrayContaining([
        expect.objectContaining({ city: 'New York', country: 'USA' }),
        expect.objectContaining({ city: 'London', country: 'UK' }),
        expect.objectContaining({ city: 'Tokyo', country: 'Japan' })
      ]));
    });

    test('cities have required properties', () => {
      const cities = NumbeoScraper.getCommonCities();

      cities.forEach(city => {
        expect(city).toHaveProperty('city');
        expect(city).toHaveProperty('country');
        expect(typeof city.city).toBe('string');
        expect(typeof city.country).toBe('string');
        expect(city.city.length).toBeGreaterThan(0);
        expect(city.country.length).toBeGreaterThan(0);
      });
    });
  });

  describe('caching behavior', () => {
    test('uses cache for recently updated data', async () => {
      const recentDate = new Date(Date.now() - 1000); // 1 second ago
      (prisma.cityData.findUnique as jest.Mock).mockResolvedValue({
        ...mockCityData,
        lastUpdated: recentDate
      });

      await NumbeoScraper.getCityData('Cached City', 'Country');

      expect(global.fetch).not.toHaveBeenCalled();
      expect(prisma.cityData.upsert).not.toHaveBeenCalled();
    });

    test('refreshes stale cache data', async () => {
      const staleDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      (prisma.cityData.findUnique as jest.Mock).mockResolvedValue({
        ...mockCityData,
        lastUpdated: staleDate
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><table class="data_wide_table"><tr><td>Cost of Living Index</td><td style="text-align: right">105</td></tr></table></html>')
      });

      (prisma.cityData.upsert as jest.Mock).mockResolvedValue({
        ...mockCityData,
        costOfLivingIndex: 105
      });

      const result = await NumbeoScraper.getCityData('Stale City', 'Country');

      expect(global.fetch).toHaveBeenCalled();
      expect(prisma.cityData.upsert).toHaveBeenCalled();
      expect(result?.costOfLivingIndex).toBe(105);
    });

    test('cache TTL is respected', async () => {
      const cacheEdgeDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 1000); // Just over 7 days
      (prisma.cityData.findUnique as jest.Mock).mockResolvedValue({
        ...mockCityData,
        lastUpdated: cacheEdgeDate
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><table class="data_wide_table"><tr><td>Cost of Living Index</td><td style="text-align: right">102</td></tr></table></html>')
      });

      await NumbeoScraper.getCityData('Edge Case City', 'Country');

      expect(global.fetch).toHaveBeenCalled(); // Should refresh because it's past TTL
    });
  });

  describe('error handling and edge cases', () => {
    test('handles database connection errors', async () => {
      (prisma.cityData.findUnique as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const result = await NumbeoScraper.getCityData('DB Error City', 'Country');
      expect(result).toBeNull();
    });

    test('handles malformed HTML responses', async () => {
      (prisma.cityData.findUnique as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><body>Invalid HTML structure</body></html>')
      });

      const result = await NumbeoScraper.getCityData('Malformed City', 'Country');
      expect(result).toBeNull();
    });

    test('handles rate limiting gracefully', async () => {
      (prisma.cityData.findUnique as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429, // Too Many Requests
        statusText: 'Too Many Requests'
      });

      const result = await NumbeoScraper.getCityData('Rate Limited City', 'Country');
      expect(result).toBeNull();
    });

    test('validates city and country parameters', async () => {
      const result1 = await NumbeoScraper.getCityData('', 'Country');
      const result2 = await NumbeoScraper.getCityData('City', '');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });
});