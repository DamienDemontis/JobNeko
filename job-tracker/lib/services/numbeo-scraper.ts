import { prisma } from '@/lib/prisma';
import { CityData } from '@prisma/client';

// Types for Numbeo data
interface NumbeoIndices {
  costOfLivingIndex: number;
  rentIndex: number;
  groceriesIndex: number;
  restaurantPriceIndex: number;
  localPurchasingPowerIndex: number;
  trafficTimeIndex?: number;
  pollutionIndex?: number;
  climateIndex?: number;
  safetyIndex?: number;
  healthCareIndex?: number;
  qualityOfLifeIndex?: number;
}

interface NumbeoSalaryData {
  averageMonthlyNetSalary?: number;
  averageMonthlyNetSalaryAfterTax?: number;
}

interface NumbeoPrices {
  mealInexpensiveRestaurant?: number;
  mealFor2MidRangeRestaurant?: number;
  domesticBeerRestaurant?: number;
  cappuccino?: number;
  cokePepsi?: number;
  water?: number;
  milk1Liter?: number;
  bread500g?: number;
  eggs12?: number;
  localCheese1kg?: number;
  chickenBreasts1kg?: number;
  apples1kg?: number;
  oranges1kg?: number;
  tomato1kg?: number;
  potato1kg?: number;
  onion1kg?: number;
  lettuce1Head?: number;
  water1_5Liter?: number;
  wineBottle?: number;
  domesticBeer0_5L?: number;
  importedBeer0_33L?: number;
  cigarettes20Pack?: number;
  
  // Transportation
  oneWayTicketLocalTransport?: number;
  monthlyPassLocalTransport?: number;
  taxiStart?: number;
  taxi1km?: number;
  taxi1hourWaiting?: number;
  gasoline1Liter?: number;
  
  // Utilities (monthly)
  basicUtilities85m2?: number;
  mobilePhone1minPrepaid?: number;
  internet60MbpsUnlimited?: number;
  
  // Sports and Leisure
  fitnessClubMonthly?: number;
  tennisCourtRent1Hour?: number;
  cinema1Seat?: number;
  
  // Childcare
  preschoolMonthly?: number;
  primarySchoolYearly?: number;
  
  // Clothing
  jeans1Pair?: number;
  summerDress?: number;
  nikeRunningShoes?: number;
  menLeatherBusinessShoes?: number;
  
  // Rent (monthly)
  apartment1BedroomCityCentre?: number;
  apartment1BedroomOutsideCentre?: number;
  apartment3BedroomsCityCentre?: number;
  apartment3BedroomsOutsideCentre?: number;
  
  // Buy apartment
  pricePerSquareMeterCityCentre?: number;
  pricePerSquareMeterOutsideCentre?: number;
  
  // Salaries
  averageMonthlyNetSalary?: number;
  mortgageInterestRatePercent?: number;
}

// Cache duration in milliseconds (7 days)
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

export class NumbeoScraper {
  private static instance: NumbeoScraper;
  
  private constructor() {}
  
  static getInstance(): NumbeoScraper {
    if (!NumbeoScraper.instance) {
      NumbeoScraper.instance = new NumbeoScraper();
    }
    return NumbeoScraper.instance;
  }
  
  /**
   * Get city data with caching
   */
  async getCityData(city: string, country?: string, state?: string): Promise<CityData | null> {
    try {
      // First, check if we have cached data
      const cached = await this.getCachedData(city, country, state);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }
      
      // If no valid cache, scrape fresh data
      const freshData = await this.scrapeCityData(city, country, state);
      
      if (freshData) {
        // Save to database
        return await this.saveCityData(freshData);
      }
      
      // If scraping fails but we have old cache, return it
      if (cached) {
        console.warn(`Using stale cache for ${city}, ${country} due to scraping failure`);
        return cached;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting city data:', error);
      // Try to return cached data even if expired
      const cached = await this.getCachedData(city, country, state);
      return cached || null;
    }
  }
  
  /**
   * Get cached city data from database
   */
  private async getCachedData(city: string, country?: string, state?: string): Promise<CityData | null> {
    return await prisma.cityData.findFirst({
      where: {
        city: {
          equals: city
        },
        ...(country && { 
          country: {
            equals: country
          }
        }),
        ...(state && { 
          state: {
            equals: state
          }
        })
      },
      orderBy: {
        lastUpdated: 'desc'
      }
    });
  }
  
  /**
   * Check if cached data is still valid
   */
  private isCacheValid(data: CityData): boolean {
    const age = Date.now() - data.lastUpdated.getTime();
    return age < CACHE_DURATION;
  }
  
  /**
   * Scrape city data from Numbeo
   * NOTE: In production, this should be replaced with official API or proper scraping with consent
   */
  private async scrapeCityData(city: string, country?: string, state?: string): Promise<Partial<CityData> | null> {
    try {
      // Construct the Numbeo URL
      const citySlug = this.createCitySlug(city, country);
      const url = `https://www.numbeo.com/cost-of-living/in/${citySlug}`;
      
      // Fetch the page content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobTracker/1.0; +https://jobtracker.com)',
          'Accept': 'text/html,application/xhtml+xml',
        }
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch Numbeo data for ${city}: ${response.status}`);
        return null;
      }
      
      const html = await response.text();
      
      // Parse the HTML to extract data
      // NOTE: This is a simplified example. In production, use a proper HTML parser like cheerio
      const indices = this.extractIndices(html);
      const prices = this.extractPrices(html);
      const salaryData = this.extractSalaryData(html);
      
      return {
        city,
        country: country || this.extractCountry(html) || 'Unknown',
        state: state || undefined,
        costOfLivingIndex: indices.costOfLivingIndex || 60,
        rentIndex: indices.rentIndex || 40,
        groceriesIndex: indices.groceriesIndex || 50,
        restaurantIndex: indices.restaurantPriceIndex || 50,
        transportIndex: this.calculateTransportIndex(prices),
        utilitiesIndex: this.calculateUtilitiesIndex(prices),
        qualityOfLifeIndex: indices.qualityOfLifeIndex,
        safetyIndex: indices.safetyIndex,
        healthcareIndex: indices.healthCareIndex,
        educationIndex: this.calculateEducationIndex(prices),
        trafficTimeIndex: indices.trafficTimeIndex,
        pollutionIndex: indices.pollutionIndex,
        climateIndex: indices.climateIndex,
        avgNetSalaryUSD: salaryData.averageMonthlyNetSalary,
        medianHousePriceUSD: this.calculateMedianHousePrice(prices),
        incomeTaxRate: this.estimateTaxRate(salaryData),
        salesTaxRate: this.estimateSalesTax(country),
        lastUpdated: new Date(),
        source: 'numbeo',
        dataPoints: this.extractDataPoints(html)
      };
    } catch (error) {
      console.error('Error scraping Numbeo data:', error);
      return null;
    }
  }
  
  /**
   * Save city data to database
   */
  private async saveCityData(data: Partial<CityData>): Promise<CityData> {
    const { city, country, state, ...updateData } = data;
    const normalizedState = state || null;
    
    // First try to find existing record
    const existing = await prisma.cityData.findFirst({
      where: {
        city: city!,
        country: country!,
        state: normalizedState
      }
    });

    if (existing) {
      // Update existing record
      return await prisma.cityData.update({
        where: { id: existing.id },
        data: {
          ...updateData,
          lastUpdated: new Date()
        }
      });
    }

    // Create new record
    return await prisma.cityData.create({
      data: {
        city: city!,
        country: country!,
        state: normalizedState,
        costOfLivingIndex: updateData.costOfLivingIndex || 60,
        rentIndex: updateData.rentIndex || 40,
        groceriesIndex: updateData.groceriesIndex || 50,
        restaurantIndex: updateData.restaurantIndex || 50,
        transportIndex: updateData.transportIndex || 50,
        utilitiesIndex: updateData.utilitiesIndex || 50,
        ...updateData,
        lastUpdated: new Date(),
        source: 'numbeo'
      }
    });
  }
  
  /**
   * Create a URL-friendly city slug
   */
  private createCitySlug(city: string, country?: string): string {
    let slug = city.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    if (country) {
      const countrySlug = country.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      slug = `${slug}-${countrySlug}`;
    }
    
    return slug;
  }
  
  /**
   * Extract indices from HTML (simplified - use proper parser in production)
   */
  private extractIndices(html: string): Partial<NumbeoIndices> {
    const indices: Partial<NumbeoIndices> = {};
    
    // Extract Cost of Living Index
    const coliMatch = html.match(/Cost of Living Index[^>]*>([0-9.]+)/);
    if (coliMatch) indices.costOfLivingIndex = parseFloat(coliMatch[1]);
    
    // Extract Rent Index
    const rentMatch = html.match(/Rent Index[^>]*>([0-9.]+)/);
    if (rentMatch) indices.rentIndex = parseFloat(rentMatch[1]);
    
    // Extract other indices similarly...
    // This is simplified - in production, use a proper HTML parser
    
    return indices;
  }
  
  /**
   * Extract prices from HTML
   */
  private extractPrices(html: string): Partial<NumbeoPrices> {
    // Simplified extraction - use proper parser in production
    const prices: Partial<NumbeoPrices> = {};
    
    // Example: Extract average salary
    const salaryMatch = html.match(/Average Monthly Net Salary[^>]*>([0-9,]+\.?[0-9]*)/);
    if (salaryMatch) {
      prices.averageMonthlyNetSalary = parseFloat(salaryMatch[1].replace(/,/g, ''));
    }
    
    return prices;
  }
  
  /**
   * Extract salary data from HTML
   */
  private extractSalaryData(html: string): Partial<NumbeoSalaryData> {
    const data: Partial<NumbeoSalaryData> = {};
    
    const salaryMatch = html.match(/Average Monthly Net Salary[^>]*>([0-9,]+\.?[0-9]*)/);
    if (salaryMatch) {
      data.averageMonthlyNetSalary = parseFloat(salaryMatch[1].replace(/,/g, ''));
    }
    
    return data;
  }
  
  /**
   * Extract country from HTML
   */
  private extractCountry(html: string): string | null {
    const match = html.match(/<title>.*?in\s+[^,]+,\s*([^<]+)<\/title>/i);
    return match ? match[1].trim() : null;
  }
  
  /**
   * Calculate transport index from prices
   */
  private calculateTransportIndex(prices: Partial<NumbeoPrices>): number {
    const factors = [
      prices.oneWayTicketLocalTransport,
      prices.monthlyPassLocalTransport,
      prices.gasoline1Liter,
      prices.taxi1km
    ].filter(Boolean);
    
    if (factors.length === 0) return 50;
    
    // Normalize based on NYC baseline (rough approximation)
    const nycBaseline = { oneWay: 2.9, monthly: 127, gas: 1.05, taxi: 3 };
    // Simplified calculation
    return 50; // Default for now
  }
  
  /**
   * Calculate utilities index from prices
   */
  private calculateUtilitiesIndex(prices: Partial<NumbeoPrices>): number {
    if (!prices.basicUtilities85m2) return 50;
    
    // NYC baseline ~$150
    const nycBaseline = 150;
    return (prices.basicUtilities85m2 / nycBaseline) * 100;
  }
  
  /**
   * Calculate education index from prices
   */
  private calculateEducationIndex(prices: Partial<NumbeoPrices>): number {
    if (!prices.preschoolMonthly && !prices.primarySchoolYearly) return 50;
    
    // Simplified calculation
    return 50;
  }
  
  /**
   * Calculate median house price
   */
  private calculateMedianHousePrice(prices: Partial<NumbeoPrices>): number | undefined {
    if (!prices.pricePerSquareMeterCityCentre) return undefined;
    
    // Assume average apartment size of 85m2
    return prices.pricePerSquareMeterCityCentre * 85;
  }
  
  /**
   * Estimate tax rate from salary data
   */
  private estimateTaxRate(salaryData: Partial<NumbeoSalaryData>): number | undefined {
    // This would need more sophisticated calculation
    return 25; // Default estimate
  }
  
  /**
   * Estimate sales tax by country
   */
  private estimateSalesTax(country?: string): number | undefined {
    const salesTaxByCountry: Record<string, number> = {
      'USA': 7,
      'United States': 7,
      'Canada': 13,
      'UK': 20,
      'United Kingdom': 20,
      'Germany': 19,
      'France': 20,
      'Spain': 21,
      'Italy': 22,
      'Australia': 10,
      'Japan': 10,
      'Singapore': 7,
      'India': 18,
      'China': 13,
      'South Korea': 10,
      'Thailand': 7,
      'Malaysia': 6,
      'Indonesia': 11,
      'Philippines': 12,
      'Vietnam': 10,
      'Taiwan': 5,
      'UAE': 5,
      'Hong Kong': 0,
      'Netherlands': 21,
      'Sweden': 25,
      'Denmark': 25,
      'Ireland': 23,
      'Brazil': 17,
      'Mexico': 16,
      'Argentina': 21,
    };
    
    return country ? salesTaxByCountry[country] : undefined;
  }
  
  /**
   * Extract number of data points
   */
  private extractDataPoints(html: string): number | undefined {
    const match = html.match(/Based on ([0-9,]+) prices/);
    return match ? parseInt(match[1].replace(/,/g, '')) : undefined;
  }
  
  /**
   * Batch update multiple cities
   */
  async updateCitiesData(cities: Array<{ city: string; country?: string; state?: string }>): Promise<void> {
    console.log(`Updating data for ${cities.length} cities...`);
    
    for (const location of cities) {
      try {
        await this.getCityData(location.city, location.country, location.state);
        // Add delay to be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to update ${location.city}:`, error);
      }
    }
    
    console.log('City data update complete');
  }
  
  /**
   * Get common cities for initial seeding
   */
  static getCommonCities(): Array<{ city: string; country: string; state?: string }> {
    return [
      // USA
      { city: 'New York', country: 'USA', state: 'NY' },
      { city: 'San Francisco', country: 'USA', state: 'CA' },
      { city: 'Los Angeles', country: 'USA', state: 'CA' },
      { city: 'Seattle', country: 'USA', state: 'WA' },
      { city: 'Austin', country: 'USA', state: 'TX' },
      { city: 'Boston', country: 'USA', state: 'MA' },
      { city: 'Chicago', country: 'USA', state: 'IL' },
      { city: 'Denver', country: 'USA', state: 'CO' },
      { city: 'Miami', country: 'USA', state: 'FL' },
      { city: 'Portland', country: 'USA', state: 'OR' },
      
      // Europe
      { city: 'London', country: 'UK' },
      { city: 'Berlin', country: 'Germany' },
      { city: 'Paris', country: 'France' },
      { city: 'Amsterdam', country: 'Netherlands' },
      { city: 'Barcelona', country: 'Spain' },
      { city: 'Madrid', country: 'Spain' },
      { city: 'Munich', country: 'Germany' },
      { city: 'Dublin', country: 'Ireland' },
      { city: 'Stockholm', country: 'Sweden' },
      { city: 'Copenhagen', country: 'Denmark' },
      
      // Canada
      { city: 'Toronto', country: 'Canada', state: 'ON' },
      { city: 'Vancouver', country: 'Canada', state: 'BC' },
      { city: 'Montreal', country: 'Canada', state: 'QC' },
      
      // Asia Pacific (APAC)
      { city: 'Singapore', country: 'Singapore' },
      { city: 'Tokyo', country: 'Japan' },
      { city: 'Hong Kong', country: 'China' },
      { city: 'Seoul', country: 'South Korea' },
      { city: 'Bangalore', country: 'India' },
      { city: 'Mumbai', country: 'India' },
      { city: 'Delhi', country: 'India' },
      { city: 'Hyderabad', country: 'India' },
      { city: 'Chennai', country: 'India' },
      { city: 'Pune', country: 'India' },
      { city: 'Dubai', country: 'UAE' },
      { city: 'Bangkok', country: 'Thailand' },
      { city: 'Kuala Lumpur', country: 'Malaysia' },
      { city: 'Jakarta', country: 'Indonesia' },
      { city: 'Manila', country: 'Philippines' },
      { city: 'Ho Chi Minh City', country: 'Vietnam' },
      { city: 'Taipei', country: 'Taiwan' },
      { city: 'Shanghai', country: 'China' },
      { city: 'Beijing', country: 'China' },
      { city: 'Shenzhen', country: 'China' },
      { city: 'Guangzhou', country: 'China' },
      
      // Australia
      { city: 'Sydney', country: 'Australia' },
      { city: 'Melbourne', country: 'Australia' },
      
      // Latin America
      { city: 'Mexico City', country: 'Mexico' },
      { city: 'São Paulo', country: 'Brazil' },
      { city: 'Buenos Aires', country: 'Argentina' },
    ];
  }
}

// Export singleton instance
export const numbeoScraper = NumbeoScraper.getInstance();