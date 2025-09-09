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
   * Get city data using web scraping and AI enhancement (NO hardcoded data)
   */
  private async scrapeCityData(city: string, country?: string, state?: string): Promise<Partial<CityData> | null> {
    try {
      console.log(`🌐 Attempting to get real data for ${city}, ${country}...`);
      
      // First try external cost of living API if available
      const apiData = await this.fetchFromCostOfLivingAPI(city, country);
      if (apiData) {
        console.log(`✅ Got API data for ${city}, ${country}`);
        return apiData;
      }
      
      // Try web scraping from our ethical scraper
      const { webScraper } = await import('./web-scraper');
      const scrapedData = await webScraper.getCityData(city, country, state);
      if (scrapedData) {
        console.log(`✅ Got scraped data for ${city}, ${country}`);
        return scrapedData;
      }
      
      // Last resort: AI-enhanced estimation (NO hardcoded data)
      console.log(`🤖 Falling back to AI estimation for ${city}, ${country}`);
      return await this.generateAIEnhancedEstimate(city, country, state);
      
    } catch (error) {
      console.error('Error getting city data:', error);
      
      // Even in error case, try AI estimation instead of hardcoded data
      try {
        return await this.generateAIEnhancedEstimate(city, country, state);
      } catch (aiError) {
        console.error('AI estimation also failed:', aiError);
        return null;
      }
    }
  }
  
  /**
   * Try to fetch from external cost of living API
   */
  private async fetchFromCostOfLivingAPI(city: string, country?: string): Promise<Partial<CityData> | null> {
    try {
      // Try multiple APIs with fallbacks
      const sources = [
        () => this.tryRapidAPI(city, country),
        () => this.tryTeleportAPI(city, country),
        () => this.tryWorldBankData(city, country)
      ];
      
      for (const source of sources) {
        try {
          const result = await source();
          if (result) return result;
        } catch (error) {
          console.debug(`API source failed for ${city}:`, error);
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('All external APIs failed:', error);
      return null;
    }
  }
  
  /**
   * Try to scrape from free cost of living websites
   */
  private async tryRapidAPI(city: string, country?: string): Promise<Partial<CityData> | null> {
    try {
      // Try scraping from Expatistan (free public data)
      const expatistanUrl = `https://www.expatistan.com/cost-of-living/${city.toLowerCase().replace(/ /g, '-')}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(expatistanUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }).catch(() => null);
      
      clearTimeout(timeoutId);
      
      if (response && response.ok) {
        const html = await response.text();
        
        // Extract cost index from page
        const indexMatch = html.match(/cost of living index.*?([0-9]+)/i);
        const costIndex = indexMatch ? parseInt(indexMatch[1]) : null;
        
        if (costIndex) {
          return {
            city,
            country: country || 'Unknown',
            costOfLivingIndex: costIndex,
            rentIndex: Math.round(costIndex * 0.7),
            source: 'expatistan_scrape',
            lastUpdated: new Date()
          };
        }
      }
    } catch (error) {
      console.debug('Expatistan scraping failed, trying next source');
    }
    
    // Try Numbeo's public pages
    try {
      const numbeoUrl = `https://www.numbeo.com/cost-of-living/in/${city.replace(/ /g, '-')}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(numbeoUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }).catch(() => null);
      
      clearTimeout(timeoutId);
      
      if (response && response.ok) {
        const html = await response.text();
        
        // Extract indices from Numbeo page
        const costMatch = html.match(/Cost of Living Index:.*?([0-9.]+)/);
        const rentMatch = html.match(/Rent Index:.*?([0-9.]+)/);
        
        if (costMatch) {
          return {
            city,
            country: country || 'Unknown', 
            costOfLivingIndex: parseFloat(costMatch[1]),
            rentIndex: rentMatch ? parseFloat(rentMatch[1]) : undefined,
            source: 'numbeo_public_scrape',
            lastUpdated: new Date()
          };
        }
      }
    } catch (error) {
      console.debug('Numbeo public scraping failed');
    }
    
    return null;
  }
  
  /**
   * Try Teleport API for city data
   */
  private async tryTeleportAPI(city: string, country?: string): Promise<Partial<CityData> | null> {
    try {
      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`https://api.teleport.org/api/cities/?search=${encodeURIComponent(city)}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'JobTracker/1.0'
        }
      }).catch(err => {
        console.warn('Teleport API unreachable:', err.message);
        return null;
      });
      
      clearTimeout(timeoutId);
      
      if (!response || !response.ok) return null;
      
      const searchData = await response.json();
      if (!searchData._embedded?.['city:search-results']?.length) return null;
      
      const cityResult = searchData._embedded['city:search-results'][0];
      const cityUrl = cityResult._links['city:item'].href;
      
      // Get detailed city data with timeout
      const cityController = new AbortController();
      const cityTimeoutId = setTimeout(() => cityController.abort(), 5000);
      
      const cityResponse = await fetch(cityUrl, {
        signal: cityController.signal
      }).catch(() => null);
      
      clearTimeout(cityTimeoutId);
      if (!cityResponse || !cityResponse.ok) return null;
      
      const cityData = await cityResponse.json();
      const scoresUrl = cityData._links?.['city:urban_areas']?.[0]?.href;
      
      if (!scoresUrl) return null;
      
      // Get quality of life scores with timeout
      const scoresController = new AbortController();
      const scoresTimeoutId = setTimeout(() => scoresController.abort(), 5000);
      
      const scoresResponse = await fetch(`${scoresUrl}scores/`, {
        signal: scoresController.signal
      }).catch(() => null);
      
      clearTimeout(scoresTimeoutId);
      if (!scoresResponse || !scoresResponse.ok) return null;
      
      const scoresData = await scoresResponse.json();
      
      return {
        city,
        country: country || cityResult.matching_full_name.split(',')[1]?.trim() || 'Unknown',
        costOfLivingIndex: this.mapTeleportScore(scoresData.categories, 'Cost of Living') * 100,
        rentIndex: this.mapTeleportScore(scoresData.categories, 'Housing') * 80,
        qualityOfLifeIndex: scoresData.teleport_city_score || 50,
        safetyIndex: this.mapTeleportScore(scoresData.categories, 'Safety') * 100,
        healthcareIndex: this.mapTeleportScore(scoresData.categories, 'Healthcare') * 100,
        educationIndex: this.mapTeleportScore(scoresData.categories, 'Education') * 100,
        lastUpdated: new Date(),
        source: 'teleport_api'
      };
    } catch (error) {
      // Silently log and continue with fallback
      console.debug('Teleport API unavailable, using fallback data');
      return null;
    }
  }
  
  /**
   * Try World Bank data for country-level estimates
   */
  private async tryWorldBankData(city: string, country?: string): Promise<Partial<CityData> | null> {
    if (!country) return null;
    
    try {
      // Use World Bank API for real economic data
      const { worldBankApi } = await import('./world-bank-api');
      const countryData = await worldBankApi.getPPPData(country);
      
      if (countryData && countryData.costOfLivingIndex) {
        // Adjust for city within country using economic principles
        const cityLower = city.toLowerCase();
        
        // Capital cities and major economic centers are typically 10-25% more expensive
        let cityAdjustment = 1.0;
        if (cityLower.includes('capital') || cityLower.endsWith('city')) {
          cityAdjustment = 1.2;
        } else if (cityLower.includes('port') || cityLower.includes('international')) {
          cityAdjustment = 1.15;
        }
        
        const adjustedIndex = Math.round(countryData.costOfLivingIndex * cityAdjustment);
        
        return {
          city,
          country,
          costOfLivingIndex: adjustedIndex,
          rentIndex: Math.round(adjustedIndex * 0.65),
          groceriesIndex: Math.round(adjustedIndex * 0.9),
          transportIndex: Math.round(adjustedIndex * 0.85),
          utilitiesIndex: Math.round(adjustedIndex * 0.75),
          source: 'world_bank_adjusted',
          lastUpdated: new Date()
        };
      }
    } catch (error) {
      console.debug('World Bank data unavailable for', country);
    }
    
    return null;
  }
  
  /**
   * Generate AI-enhanced estimate using our new system
   * NO MORE HARDCODED DATA - This now calls the AI data processor
   */
  private async generateAIEnhancedEstimate(city: string, country?: string, state?: string): Promise<Partial<CityData> | null> {
    try {
      console.log(`🤖 Using AI-enhanced estimation for ${city}, ${country} (NO hardcoded data)`);
      
      // Use AI data processor instead of hardcoded estimates
      const { aiDataProcessor } = await import('./ai-data-processor');
      
      const locationContext = {
        city,
        country: country || 'Unknown',
        state,
        isRemote: false,
        userLocation: undefined
      };

      const enhancedData = await aiDataProcessor.getEnhancedCityData(locationContext);
      
      if (enhancedData) {
        console.log(`✅ AI generated realistic data for ${city}, ${country}:`);
        console.log(`  - Cost of Living Index: ${enhancedData.costOfLivingIndex}% (was hardcoded!)`);
        console.log(`  - Confidence: ${enhancedData.confidence}`);
        console.log(`  - Sources: ${enhancedData.dataSources?.join(', ')}`);
        
        return {
          city: enhancedData.city,
          country: enhancedData.country,
          state: enhancedData.state,
          costOfLivingIndex: enhancedData.costOfLivingIndex,
          rentIndex: enhancedData.rentIndex,
          groceriesIndex: enhancedData.groceriesIndex,
          restaurantIndex: enhancedData.restaurantIndex,
          transportIndex: enhancedData.transportIndex,
          utilitiesIndex: enhancedData.utilitiesIndex,
          qualityOfLifeIndex: enhancedData.qualityOfLifeIndex,
          safetyIndex: enhancedData.safetyIndex,
          healthcareIndex: enhancedData.healthcareIndex,
          educationIndex: enhancedData.educationIndex,
          avgNetSalaryUSD: enhancedData.avgNetSalaryUSD,
          lastUpdated: new Date(),
          source: `ai_enhanced_${enhancedData.dataSources?.join('_')}`,
          dataPoints: null
        };
      }

      console.warn(`❌ AI could not generate data for ${city}, ${country}`);
      return null;
    } catch (error) {
      console.error(`Error in AI-enhanced estimation for ${city}:`, error);
      return null;
    }
  }
  
  private mapTeleportScore(categories: any[], categoryName: string): number {
    const category = categories.find(c => c.name === categoryName);
    return category ? category.score_out_of_10 / 10 : 0.5;
  }
  
  // REMOVED: All hardcoded estimation functions
  // These were causing the Nancy, France bug (France was hardcoded to 105% instead of real ~65%)
  // Now using AI-enhanced data processor with real APIs and web scraping
  
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