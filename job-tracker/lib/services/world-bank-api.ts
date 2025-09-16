// import { prisma } from '@/lib/prisma';

interface WorldBankIndicator {
  indicator: {
    id: string;
    value: string;
  };
  country: {
    id: string;
    value: string;
  };
  countryiso3code: string;
  date: string;
  value: number | null;
  unit: string;
  obs_status: string;
  decimal: number;
}

interface _WorldBankResponse {
  page: number;
  pages: number;
  per_page: number;
  total: number;
}

interface CountryPPPData {
  countryCode: string;
  countryName: string;
  year: number;
  pppConversionFactor: number; // Local currency per USD
  gdpPerCapitaPPP: number; // GDP per capita in PPP terms
  costOfLivingIndex: number; // Derived from PPP (NYC = 100 baseline)
  lastUpdated: Date;
  source: string;
}

export class WorldBankApiService {
  private static instance: WorldBankApiService;
  private baseUrl = 'https://api.worldbank.org/v2';
  private cache: Map<string, { data: CountryPPPData; timestamp: number }> = new Map();
  private cacheDuration = 7 * 24 * 60 * 60 * 1000; // 7 days

  private constructor() {}

  static getInstance(): WorldBankApiService {
    if (!WorldBankApiService.instance) {
      WorldBankApiService.instance = new WorldBankApiService();
    }
    return WorldBankApiService.instance;
  }

  /**
   * Get PPP data for a country
   */
  async getPPPData(countryName: string): Promise<CountryPPPData | null> {
    try {
      const countryCode = this.getCountryCode(countryName);
      if (!countryCode) {
        console.warn(`Unknown country: ${countryName}`);
        return null;
      }

      // Check cache first
      const cacheKey = `ppp_${countryCode}`;
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheDuration) {
        console.log(`✅ Using cached PPP data for ${countryName}`);
        return cached.data;
      }

      console.log(`🌐 Fetching PPP data for ${countryName} from World Bank API`);

      // Fetch multiple indicators in parallel
      const [pppData, gdpData] = await Promise.all([
        this.fetchPPPConversionFactor(countryCode),
        this.fetchGDPPerCapitaPPP(countryCode)
      ]);

      if (!pppData) {
        console.warn(`No PPP data available for ${countryName}`);
        return null;
      }

      // Calculate cost of living index from PPP
      // Lower PPP conversion factor = higher purchasing power = lower cost of living
      // US PPP factor is ~1.0, so we can use it as baseline
      const usPppFactor = 1.0; // US baseline
      const costOfLivingIndex = ((pppData.value || 1.0) / usPppFactor) * 100;

      const result: CountryPPPData = {
        countryCode: countryCode,
        countryName: pppData.country.value,
        year: parseInt(pppData.date),
        pppConversionFactor: pppData.value || 1.0,
        gdpPerCapitaPPP: gdpData?.value || 0,
        costOfLivingIndex: Math.round(costOfLivingIndex * 100) / 100, // Round to 2 decimal places
        lastUpdated: new Date(),
        source: 'world_bank_api'
      };

      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

      console.log(`💾 Cached PPP data for ${countryName}: ${result.costOfLivingIndex}% of US costs`);
      return result;
    } catch (error) {
      console.error(`Error fetching PPP data for ${countryName}:`, error);
      return null;
    }
  }

  /**
   * Fetch PPP conversion factor (Local Currency Unit per USD)
   */
  private async fetchPPPConversionFactor(countryCode: string): Promise<WorldBankIndicator | null> {
    try {
      // PPP conversion factor, GDP (LCU per international $)
      const indicator = 'PA.NUS.PPP';
      const url = `${this.baseUrl}/country/${countryCode}/indicator/${indicator}?format=json&date=2020:2023&per_page=10`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // World Bank API returns [metadata, data] array
      if (!Array.isArray(data) || data.length < 2) {
        return null;
      }

      const indicators = data[1] as WorldBankIndicator[];
      
      // Find most recent year with data
      const validData = indicators.filter(item => item.value !== null && item.value > 0);
      if (validData.length === 0) {
        return null;
      }

      // Return most recent data
      return validData.sort((a, b) => parseInt(b.date) - parseInt(a.date))[0];
    } catch (error) {
      console.error(`Error fetching PPP conversion factor for ${countryCode}:`, error);
      return null;
    }
  }

  /**
   * Fetch GDP per capita PPP
   */
  private async fetchGDPPerCapitaPPP(countryCode: string): Promise<WorldBankIndicator | null> {
    try {
      // GDP per capita, PPP (current international $)
      const indicator = 'NY.GDP.PCAP.PP.CD';
      const url = `${this.baseUrl}/country/${countryCode}/indicator/${indicator}?format=json&date=2020:2023&per_page=10`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data) || data.length < 2) {
        return null;
      }

      const indicators = data[1] as WorldBankIndicator[];
      const validData = indicators.filter(item => item.value !== null && item.value > 0);
      
      if (validData.length === 0) {
        return null;
      }

      return validData.sort((a, b) => parseInt(b.date) - parseInt(a.date))[0];
    } catch (error) {
      console.error(`Error fetching GDP per capita PPP for ${countryCode}:`, error);
      return null;
    }
  }

  /**
   * Get World Bank country code from country name
   */
  private getCountryCode(countryName: string): string | null {
    const countryMap: Record<string, string> = {
      // Major countries
      'united states': 'US',
      'usa': 'US',
      'us': 'US',
      'united kingdom': 'GB',
      'uk': 'GB',
      'britain': 'GB',
      'england': 'GB',
      'france': 'FR',
      'germany': 'DE',
      'deutschland': 'DE',
      'italy': 'IT',
      'spain': 'ES',
      'canada': 'CA',
      'mexico': 'MX',
      'brazil': 'BR',
      'argentina': 'AR',
      'chile': 'CL',
      'colombia': 'CO',
      'peru': 'PE',
      'venezuela': 'VE',

      // Asia-Pacific
      'japan': 'JP',
      'china': 'CN',
      'india': 'IN',
      'south korea': 'KR',
      'korea': 'KR',
      'indonesia': 'ID',
      'thailand': 'TH',
      'vietnam': 'VN',
      'malaysia': 'MY',
      'singapore': 'SG',
      'philippines': 'PH',
      'australia': 'AU',
      'new zealand': 'NZ',

      // Europe
      'netherlands': 'NL',
      'belgium': 'BE',
      'switzerland': 'CH',
      'austria': 'AT',
      'sweden': 'SE',
      'norway': 'NO',
      'denmark': 'DK',
      'finland': 'FI',
      'poland': 'PL',
      'czech republic': 'CZ',
      'hungary': 'HU',
      'portugal': 'PT',
      'greece': 'GR',
      'turkey': 'TR',
      'russia': 'RU',
      'ukraine': 'UA',
      'romania': 'RO',
      'bulgaria': 'BG',
      'croatia': 'HR',
      'serbia': 'RS',
      'slovenia': 'SI',
      'slovakia': 'SK',
      'estonia': 'EE',
      'latvia': 'LV',
      'lithuania': 'LT',
      'ireland': 'IE',
      'iceland': 'IS',

      // Middle East & Africa
      'israel': 'IL',
      'saudi arabia': 'SA',
      'uae': 'AE',
      'united arab emirates': 'AE',
      'qatar': 'QA',
      'kuwait': 'KW',
      'south africa': 'ZA',
      'egypt': 'EG',
      'morocco': 'MA',
      'tunisia': 'TN',
      'algeria': 'DZ',
      'nigeria': 'NG',
      'kenya': 'KE',
      'ghana': 'GH',
      'ethiopia': 'ET'
    };

    const normalized = countryName.toLowerCase().trim();
    return countryMap[normalized] || null;
  }

  /**
   * Get multiple countries' PPP data for comparison
   */
  async getMultipleCountriesPPP(countryNames: string[]): Promise<CountryPPPData[]> {
    const results: CountryPPPData[] = [];
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < countryNames.length; i += batchSize) {
      const batch = countryNames.slice(i, i + batchSize);
      const batchPromises = batch.map(country => this.getPPPData(country));
      
      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(result => result !== null) as CountryPPPData[];
      results.push(...validResults);

      // Add delay between batches to be respectful
      if (i + batchSize < countryNames.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Save PPP data to database for caching
   */
  async savePPPDataToDatabase(data: CountryPPPData): Promise<void> {
    try {
      // We could create a PPP data table, but for now just log
      console.log(`📊 PPP Data for ${data.countryName}: ${data.costOfLivingIndex}% of US costs`);
      
      // Could implement database storage here if needed
      // await prisma.countryPPPData.upsert({ ... })
    } catch (error) {
      console.error('Error saving PPP data to database:', error);
    }
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ World Bank API cache cleared');
  }
}

export const worldBankApi = WorldBankApiService.getInstance();