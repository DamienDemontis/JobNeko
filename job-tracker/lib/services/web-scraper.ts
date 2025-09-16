import { prisma } from '@/lib/prisma';
import type { CityData } from '@prisma/client';

// Rate limiting and caching configuration
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
const REQUEST_DELAY = 10000; // 10 seconds between requests
const _MAX_RETRIES = 3;

interface ScrapedCityData {
  city: string;
  country: string;
  state?: string;
  costOfLivingIndex: number;
  rentIndex: number;
  groceriesIndex?: number;
  restaurantIndex?: number;
  transportIndex?: number;
  utilitiesIndex?: number;
  qualityOfLifeIndex?: number;
  safetyIndex?: number;
  healthcareIndex?: number;
  educationIndex?: number;
  avgNetSalaryUSD?: number;
  source: string;
  confidence: number;
  dataPoints?: number;
}

export class EthicalWebScraper {
  private static instance: EthicalWebScraper;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;

  private constructor() {}

  static getInstance(): EthicalWebScraper {
    if (!EthicalWebScraper.instance) {
      EthicalWebScraper.instance = new EthicalWebScraper();
    }
    return EthicalWebScraper.instance;
  }

  /**
   * Main method to get city data with ethical scraping and caching
   */
  async getCityData(city: string, country?: string, state?: string): Promise<CityData | null> {
    try {
      // First check cache
      const cached = await this.getCachedData(city, country, state);
      if (cached && this.isCacheValid(cached)) {
        console.log(`✅ Using cached data for ${city}, ${country}`);
        return cached;
      }

      console.log(`🔍 Fetching fresh data for ${city}, ${country}`);

      // Try multiple sources with fallbacks
      const sources = [
        () => this.scrapeNumbeoData(city, country, state),
        () => this.scrapeExpatistanData(city, country, state),
        () => this.scrapeAlternativeSources(city, country, state)
      ];

      for (const source of sources) {
        try {
          const scrapedData = await this.queueRequest(source);
          if (scrapedData && scrapedData.confidence > 0.5) {
            // Save to database with attribution
            return await this.saveCityDataWithAttribution(scrapedData);
          }
        } catch (error) {
          console.warn(`Source failed for ${city}:`, error);
          continue;
        }
      }

      // If all scraping fails, return cached data even if stale
      if (cached) {
        console.warn(`⚠️ Using stale cache for ${city}, ${country}`);
        return cached;
      }

      console.error(`❌ No data available for ${city}, ${country}`);
      return null;
    } catch (error) {
      console.error('Error in getCityData:', error);
      return null;
    }
  }

  /**
   * Queue requests to respect rate limits
   */
  private async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process request queue with rate limiting
   */
  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      // Respect rate limiting
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < REQUEST_DELAY) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest));
      }

      try {
        await request();
        this.lastRequestTime = Date.now();
      } catch (error) {
        console.error('Request failed:', error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Scrape Numbeo with proper attribution
   */
  private async scrapeNumbeoData(city: string, country?: string, state?: string): Promise<ScrapedCityData | null> {
    try {
      // Construct Numbeo URL
      const cityParam = encodeURIComponent(city);
      const countryParam = country ? encodeURIComponent(country) : '';
      const url = `https://www.numbeo.com/cost-of-living/in/${cityParam}${countryParam ? '-' + countryParam : ''}`;

      console.log(`🌐 Scraping Numbeo: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Compatible Job Search Platform - Data for salary analysis)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return this.parseNumbeoHtml(html, city, country, state);
    } catch (error) {
      console.error(`Numbeo scraping failed for ${city}:`, error);
      return null;
    }
  }

  /**
   * Parse Numbeo HTML to extract cost of living data
   */
  private parseNumbeoHtml(html: string, city: string, country?: string, state?: string): ScrapedCityData | null {
    try {
      // Extract cost of living index
      const costIndexMatch = html.match(/Cost of Living Index[^>]*>[\s\S]*?(\d+\.?\d*)/i);
      const rentIndexMatch = html.match(/Rent Index[^>]*>[\s\S]*?(\d+\.?\d*)/i);
      const groceriesIndexMatch = html.match(/Groceries Index[^>]*>[\s\S]*?(\d+\.?\d*)/i);
      const restaurantIndexMatch = html.match(/Restaurant Price Index[^>]*>[\s\S]*?(\d+\.?\d*)/i);
      const _localPurchasingMatch = html.match(/Local Purchasing Power Index[^>]*>[\s\S]*?(\d+\.?\d*)/i);

      // Extract average salary
      const salaryMatch = html.match(/Average Monthly Net Salary[^>]*>[\s\S]*?\$?([\d,]+\.?\d*)/i);
      
      // Extract number of data points for confidence
      const dataPointsMatch = html.match(/Based on ([0-9,]+) prices/i);

      if (!costIndexMatch) {
        console.warn(`No cost of living index found for ${city}`);
        return null;
      }

      const costOfLivingIndex = parseFloat(costIndexMatch[1]);
      const rentIndex = rentIndexMatch ? parseFloat(rentIndexMatch[1]) : costOfLivingIndex * 0.8;
      const groceriesIndex = groceriesIndexMatch ? parseFloat(groceriesIndexMatch[1]) : costOfLivingIndex * 0.9;
      const restaurantIndex = restaurantIndexMatch ? parseFloat(restaurantIndexMatch[1]) : costOfLivingIndex * 1.1;
      const avgSalary = salaryMatch ? parseFloat(salaryMatch[1].replace(/,/g, '')) * 12 : undefined; // Convert monthly to yearly
      const dataPoints = dataPointsMatch ? parseInt(dataPointsMatch[1].replace(/,/g, '')) : 100;

      // Calculate confidence based on data availability
      const confidence = Math.min(0.95, 0.4 + (dataPoints / 1000) * 0.5 + (avgSalary ? 0.1 : 0));

      return {
        city,
        country: country || 'Unknown',
        state,
        costOfLivingIndex,
        rentIndex,
        groceriesIndex,
        restaurantIndex,
        transportIndex: costOfLivingIndex * 0.8, // Estimated
        utilitiesIndex: costOfLivingIndex * 0.9, // Estimated
        avgNetSalaryUSD: avgSalary,
        source: 'numbeo_scraped',
        confidence,
        dataPoints
      };
    } catch (error) {
      console.error(`Error parsing Numbeo HTML for ${city}:`, error);
      return null;
    }
  }

  /**
   * Scrape Expatistan as alternative source
   */
  private async scrapeExpatistanData(city: string, country?: string, state?: string): Promise<ScrapedCityData | null> {
    try {
      const citySlug = city.toLowerCase().replace(/\s+/g, '-');
      const countrySlug = country?.toLowerCase().replace(/\s+/g, '-');
      const url = `https://www.expatistan.com/cost-of-living/country/comparison/${citySlug}${countrySlug ? '-' + countrySlug : ''}`;

      console.log(`🌐 Scraping Expatistan: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Compatible Job Search Platform - Data for salary analysis)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return this.parseExpatistanHtml(html, city, country, state);
    } catch (error) {
      console.warn(`Expatistan scraping failed for ${city}:`, error);
      return null;
    }
  }

  /**
   * Parse Expatistan HTML
   */
  private parseExpatistanHtml(html: string, city: string, country?: string, state?: string): ScrapedCityData | null {
    try {
      // Expatistan uses different format - try to extract relative cost data
      // This is a simplified parser - would need more sophisticated parsing
      const costMatch = html.match(/cost[^>]*index[^>]*?(\d+)/i);
      
      if (!costMatch) {
        return null;
      }

      const relativeIndex = parseFloat(costMatch[1]);
      // Convert to Numbeo-style index (NYC = 100 baseline)
      const costOfLivingIndex = relativeIndex * 0.8; // Rough conversion

      return {
        city,
        country: country || 'Unknown',
        state,
        costOfLivingIndex,
        rentIndex: costOfLivingIndex * 0.8,
        source: 'expatistan_scraped',
        confidence: 0.6 // Lower confidence for alternative source
      };
    } catch (error) {
      console.error(`Error parsing Expatistan HTML for ${city}:`, error);
      return null;
    }
  }

  /**
   * Scrape other alternative sources
   */
  private async scrapeAlternativeSources(_city: string, _country?: string, _state?: string): Promise<ScrapedCityData | null> {
    // Could add other sources like cost-of-living.org, etc.
    // For now, return null to fall back to API data
    return null;
  }

  /**
   * Get cached data from database
   */
  private async getCachedData(city: string, country?: string, state?: string): Promise<CityData | null> {
    return await prisma.cityData.findFirst({
      where: {
        city: city,
        country: country || undefined,
        state: state || undefined
      },
      orderBy: {
        lastUpdated: 'desc'
      }
    });
  }

  /**
   * Check if cached data is still valid (30 days)
   */
  private isCacheValid(data: CityData): boolean {
    const age = Date.now() - data.lastUpdated.getTime();
    return age < CACHE_DURATION;
  }

  /**
   * Save scraped data to database with proper attribution
   */
  private async saveCityDataWithAttribution(data: ScrapedCityData): Promise<CityData> {
    const { city, country, state, ...updateData } = data;
    
    // Add attribution note
    const attributionNote = data.source.includes('numbeo') 
      ? 'Data sourced from Numbeo.com with attribution - https://www.numbeo.com'
      : `Data sourced from ${data.source}`;

    // First try to find existing record
    const existingRecord = await prisma.cityData.findFirst({
      where: {
        city: city.toLowerCase(),
        country: (country || 'unknown').toLowerCase(),
        state: state?.toLowerCase() ?? null
      }
    });

    const cityData = existingRecord 
      ? await prisma.cityData.update({
          where: { id: existingRecord.id },
          data: {
            ...updateData,
            lastUpdated: new Date(),
            source: `${data.source}_with_attribution - ${attributionNote}`
          }
        })
      : await prisma.cityData.create({
          data: {
            city,
            country: country || 'Unknown',
            state,
            costOfLivingIndex: data.costOfLivingIndex,
            rentIndex: data.rentIndex,
            groceriesIndex: data.groceriesIndex ?? 0,
            restaurantIndex: data.restaurantIndex ?? 0,
            transportIndex: data.transportIndex ?? 0,
            utilitiesIndex: data.utilitiesIndex ?? 0,
            qualityOfLifeIndex: data.qualityOfLifeIndex,
            safetyIndex: data.safetyIndex,
            healthcareIndex: data.healthcareIndex,
            educationIndex: data.educationIndex,
            avgNetSalaryUSD: data.avgNetSalaryUSD,
            population: null,
            lastUpdated: new Date(),
            source: `${data.source}_with_attribution - ${attributionNote}`,
            dataPoints: data.dataPoints ?? null
          }
        });

    console.log(`💾 Saved data for ${city}, ${country} from ${data.source}`);
    return cityData;
  }

  /**
   * Batch update multiple cities (for initial seeding)
   */
  async seedCommonCities(): Promise<void> {
    const commonCities = [
      { city: 'New York', country: 'United States' },
      { city: 'London', country: 'United Kingdom' },
      { city: 'Paris', country: 'France' },
      { city: 'Nancy', country: 'France' },
      { city: 'Tokyo', country: 'Japan' },
      { city: 'Sydney', country: 'Australia' },
      { city: 'Toronto', country: 'Canada' },
      { city: 'Berlin', country: 'Germany' },
      { city: 'Singapore', country: 'Singapore' },
      { city: 'Zurich', country: 'Switzerland' }
    ];

    console.log(`🌱 Seeding ${commonCities.length} common cities...`);

    for (const location of commonCities) {
      try {
        await this.getCityData(location.city, location.country);
        // Extra delay for seeding to be extra respectful
        await new Promise(resolve => setTimeout(resolve, 15000));
      } catch (error) {
        console.error(`Failed to seed ${location.city}:`, error);
      }
    }

    console.log('✅ City seeding complete');
  }
}

export const webScraper = EthicalWebScraper.getInstance();