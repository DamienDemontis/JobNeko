// Currency conversion service using free APIs
// No paid APIs, no hardcoded fallbacks

interface CurrencyRates {
  [currency: string]: number;
}

interface ConversionResult {
  from: string;
  to: string;
  amount: number;
  converted: number;
  rate: number;
  timestamp: Date;
}

export class CurrencyConverter {
  private static instance: CurrencyConverter;
  private cachedRates: Map<string, { rates: CurrencyRates; timestamp: Date }> = new Map();
  private readonly CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour cache

  // Popular currencies for salary display
  public readonly SUPPORTED_CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'KRW', symbol: '₩', name: 'Korean Won' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  ];

  private constructor() {}

  static getInstance(): CurrencyConverter {
    if (!CurrencyConverter.instance) {
      CurrencyConverter.instance = new CurrencyConverter();
    }
    return CurrencyConverter.instance;
  }

  /**
   * Get exchange rates from free API
   * Using exchangerate-api.com free tier or fallback to fixer.io free tier
   */
  private async fetchExchangeRates(baseCurrency: string): Promise<CurrencyRates | null> {
    // Check cache first
    const cached = this.cachedRates.get(baseCurrency);
    if (cached && (Date.now() - cached.timestamp.getTime() < this.CACHE_DURATION_MS)) {
      return cached.rates;
    }

    try {
      // Try exchangerate-api.com (free, no API key needed for basic usage)
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rates = data.rates as CurrencyRates;

        // Cache the rates
        this.cachedRates.set(baseCurrency, {
          rates,
          timestamp: new Date()
        });

        return rates;
      }
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
    }

    // Try alternative free API (fixer.io requires free API key but we'll use another)
    try {
      // Using frankfurter.app as backup (completely free, no API key)
      const response = await fetch(
        `https://api.frankfurter.app/latest?from=${baseCurrency}`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Frankfurter returns rates differently, normalize to our format
        const rates: CurrencyRates = { [baseCurrency]: 1 };
        if (data.rates) {
          Object.assign(rates, data.rates);
        }

        // Cache the rates
        this.cachedRates.set(baseCurrency, {
          rates,
          timestamp: new Date()
        });

        return rates;
      }
    } catch (error) {
      console.error('Backup API also failed:', error);
    }

    return null;
  }

  /**
   * Convert amount from one currency to another
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ConversionResult | null> {
    try {
      // If same currency, no conversion needed
      if (fromCurrency === toCurrency) {
        return {
          from: fromCurrency,
          to: toCurrency,
          amount,
          converted: amount,
          rate: 1,
          timestamp: new Date()
        };
      }

      // Get exchange rates
      const rates = await this.fetchExchangeRates(fromCurrency);

      if (!rates || !rates[toCurrency]) {
        console.error(`No exchange rate found for ${fromCurrency} to ${toCurrency}`);
        return null;
      }

      const rate = rates[toCurrency];
      const converted = amount * rate;

      return {
        from: fromCurrency,
        to: toCurrency,
        amount,
        converted,
        rate,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Currency conversion failed:', error);
      return null;
    }
  }

  /**
   * Convert salary range
   */
  async convertSalaryRange(
    salaryRange: { min: number; max: number; median: number },
    fromCurrency: string,
    toCurrency: string
  ): Promise<{ min: number; max: number; median: number; rate: number } | null> {
    const minResult = await this.convert(salaryRange.min, fromCurrency, toCurrency);

    if (!minResult) {
      return null;
    }

    return {
      min: minResult.converted,
      max: salaryRange.max * minResult.rate,
      median: salaryRange.median * minResult.rate,
      rate: minResult.rate
    };
  }

  /**
   * Format currency with appropriate symbol and formatting
   */
  formatCurrency(amount: number, currencyCode: string): string {
    const currency = this.SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);

    if (!currency) {
      // Fallback to basic formatting
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }).format(amount);
    }

    // Special formatting for certain currencies
    if (currencyCode === 'KRW' || currencyCode === 'JPY') {
      // No decimal places for these
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }).format(amount);
    }

    if (currencyCode === 'INR') {
      // Indian numbering system
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }).format(amount);
    }

    // Default formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Get currency symbol
   */
  getCurrencySymbol(currencyCode: string): string {
    const currency = this.SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    return currency?.symbol || currencyCode;
  }

  /**
   * Clear cached rates
   */
  clearCache(): void {
    this.cachedRates.clear();
  }
}

// Export singleton instance
export const currencyConverter = CurrencyConverter.getInstance();