// Intelligent Salary Analysis with Cost of Living Adjustments

interface CostOfLivingData {
  city: string;
  country: string;
  costIndex: number; // 100 = New York baseline
  rentIndex: number;
  purchasingPowerIndex: number;
}

// Removed unused interface

// Sample cost of living indices (in production, use an API like Numbeo)
const COST_OF_LIVING_DATA: Record<string, CostOfLivingData> = {
  'san francisco': { city: 'San Francisco', country: 'USA', costIndex: 95, rentIndex: 120, purchasingPowerIndex: 110 },
  'new york': { city: 'New York', country: 'USA', costIndex: 100, rentIndex: 100, purchasingPowerIndex: 100 },
  'austin': { city: 'Austin', country: 'USA', costIndex: 70, rentIndex: 65, purchasingPowerIndex: 125 },
  'seattle': { city: 'Seattle', country: 'USA', costIndex: 85, rentIndex: 85, purchasingPowerIndex: 115 },
  'london': { city: 'London', country: 'UK', costIndex: 85, rentIndex: 95, purchasingPowerIndex: 90 },
  'berlin': { city: 'Berlin', country: 'Germany', costIndex: 65, rentIndex: 55, purchasingPowerIndex: 110 },
  'toronto': { city: 'Toronto', country: 'Canada', costIndex: 70, rentIndex: 70, purchasingPowerIndex: 95 },
  'sydney': { city: 'Sydney', country: 'Australia', costIndex: 80, rentIndex: 85, purchasingPowerIndex: 105 },
  'singapore': { city: 'Singapore', country: 'Singapore', costIndex: 85, rentIndex: 110, purchasingPowerIndex: 95 },
  'tokyo': { city: 'Tokyo', country: 'Japan', costIndex: 80, rentIndex: 70, purchasingPowerIndex: 90 },
  'bangalore': { city: 'Bangalore', country: 'India', costIndex: 30, rentIndex: 20, purchasingPowerIndex: 70 },
  'remote': { city: 'Remote', country: 'Global', costIndex: 60, rentIndex: 50, purchasingPowerIndex: 100 },
};

// Currency cache with TTL
interface CurrencyCache {
  rates: Record<string, number>;
  lastUpdated: Date;
}

let currencyCache: CurrencyCache | null = null;
const CURRENCY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Fetch live currency rates from free API
async function fetchCurrencyRates(): Promise<Record<string, number>> {
  try {
    // Check cache first
    if (currencyCache && 
        (new Date().getTime() - currencyCache.lastUpdated.getTime()) < CURRENCY_CACHE_TTL) {
      return currencyCache.rates;
    }

    // Fetch from free API (fawazahmed0/exchange-api)
    const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
    
    if (!response.ok) {
      throw new Error('Failed to fetch currency rates');
    }

    const data = await response.json();
    const usdRates = data.usd;
    
    // Convert to our format (value = how many USD per 1 unit of currency)
    const rates: Record<string, number> = { USD: 1.0 };
    
    // Map common currencies
    const currencyMap: Record<string, string> = {
      'EUR': 'eur',
      'GBP': 'gbp', 
      'CAD': 'cad',
      'AUD': 'aud',
      'JPY': 'jpy',
      'INR': 'inr',
      'CHF': 'chf',
      'SGD': 'sgd',
      'CNY': 'cny',
      'BRL': 'brl',
      'MXN': 'mxn',
      'NZD': 'nzd',
      'SEK': 'sek',
      'NOK': 'nok',
      'DKK': 'dkk',
      'PLN': 'pln',
      'ZAR': 'zar',
      'KRW': 'krw',
      'HKD': 'hkd',
      'THB': 'thb',
      'MYR': 'myr',
      'PHP': 'php',
      'IDR': 'idr',
      'CZK': 'czk',
      'HUF': 'huf',
      'RON': 'ron',
      'BGN': 'bgn',
      'HRK': 'hrk',
      'RUB': 'rub',
      'TRY': 'try',
      'AED': 'aed',
      'SAR': 'sar',
      'QAR': 'qar',
      'KWD': 'kwd',
      'EGP': 'egp',
      'ILS': 'ils',
      'NGN': 'ngn',
      'KES': 'kes',
      'GHS': 'ghs',
      'MAD': 'mad',
      'CLP': 'clp',
      'COP': 'cop',
      'PEN': 'pen',
      'ARS': 'ars',
      'UYU': 'uyu',
      'VND': 'vnd',
      'PKR': 'pkr',
      'BDT': 'bdt',
      'LKR': 'lkr',
      'TWD': 'twd',
    };
    
    for (const [code, apiCode] of Object.entries(currencyMap)) {
      if (usdRates[apiCode]) {
        // API gives USD to X rate, we need to invert for X to USD
        rates[code] = 1 / usdRates[apiCode];
      }
    }
    
    // Update cache
    currencyCache = {
      rates,
      lastUpdated: new Date(),
    };
    
    return rates;
  } catch (error) {
    console.warn('Failed to fetch live currency rates, using fallback:', error);
    
    // Fallback to approximate rates if API fails
    return {
      'USD': 1.0,
      'EUR': 1.08,
      'GBP': 1.27,
      'CAD': 0.74,
      'AUD': 0.65,
      'JPY': 0.0067,
      'INR': 0.012,
      'CHF': 1.11,
      'SGD': 0.74,
      'CNY': 0.14,
      'BRL': 0.20,
      'MXN': 0.059,
      'NZD': 0.62,
      'SEK': 0.092,
      'NOK': 0.089,
      'DKK': 0.14,
      'PLN': 0.24,
      'ZAR': 0.053,
      'KRW': 0.00075,
      'HKD': 0.13,
      'THB': 0.028,
      'MYR': 0.22,
      'PHP': 0.018,
      'IDR': 0.000064,
      'CZK': 0.044,
      'HUF': 0.0027,
      'RON': 0.21,
      'BGN': 0.54,
      'HRK': 0.14,
      'RUB': 0.011,
      'TRY': 0.031,
      'AED': 0.27,
      'SAR': 0.27,
      'QAR': 0.27,
      'KWD': 3.25,
      'EGP': 0.032,
      'ILS': 0.27,
      'NGN': 0.0013,
      'KES': 0.0078,
      'GHS': 0.083,
      'MAD': 0.10,
      'CLP': 0.0011,
      'COP': 0.00025,
      'PEN': 0.27,
      'ARS': 0.001,
      'UYU': 0.025,
      'VND': 0.000041,
      'PKR': 0.0036,
      'BDT': 0.0091,
      'LKR': 0.0031,
      'TWD': 0.031,
    };
  }
}

export interface SalaryAnalysis {
  originalSalary: {
    min: number;
    max: number;
    currency: string;
  };
  normalizedSalaryUSD: {
    min: number;
    max: number;
  };
  costOfLivingAdjusted: {
    min: number;
    max: number;
  };
  comfortScore: number; // 0-100
  comfortLevel: 'struggling' | 'tight' | 'comfortable' | 'thriving' | 'luxurious';
  purchasingPower: number;
  savingsPotential: number; // Percentage of salary that can be saved
  betterThanPercent: number; // Better than X% of jobs in the same location
}

export function parseSalaryString(salaryStr: string): { min: number; max: number; currency: string } | null {
  if (!salaryStr) return null;

  // Extract currency symbol or code
  const currencyMatch = salaryStr.match(/([£€$¥₹]|USD|EUR|GBP|CAD|AUD|JPY|INR|CHF|SGD|CNY|BRL|MXN)/i);
  let currency = 'USD';
  
  if (currencyMatch) {
    const currencyMap: Record<string, string> = {
      '$': 'USD',
      '£': 'GBP',
      '€': 'EUR',
      '¥': 'JPY',
      '₹': 'INR',
    };
    currency = currencyMap[currencyMatch[0]] || currencyMatch[0].toUpperCase();
  }

  // Extract numbers
  const numbers = salaryStr.match(/[\d,]+(?:k)?/gi);
  if (!numbers || numbers.length === 0) return null;

  const parseNumber = (str: string): number => {
    str = str.replace(/,/g, '');
    if (str.toLowerCase().includes('k')) {
      return parseFloat(str) * 1000;
    }
    return parseFloat(str);
  };

  const values = numbers.map(parseNumber).filter(n => !isNaN(n));
  
  if (values.length === 0) return null;
  
  // Handle hourly rates
  const isHourly = /hour|hr|\/hr/i.test(salaryStr);
  if (isHourly) {
    // Convert to annual (assuming 2080 hours/year)
    values[0] *= 2080;
    if (values[1]) values[1] *= 2080;
  }

  // Handle monthly rates
  const isMonthly = /month|mo|\/mo/i.test(salaryStr);
  if (isMonthly) {
    values[0] *= 12;
    if (values[1]) values[1] *= 12;
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values) || Math.min(...values),
    currency
  };
}

export async function convertToUSD(amount: number, currency: string): Promise<number> {
  const rates = await fetchCurrencyRates();
  const rate = rates[currency] || 1.0;
  return amount * rate;
}

// Synchronous version with fallback rates for immediate calculations
export function convertToUSDSync(amount: number, currency: string): number {
  // Use cached rates if available
  if (currencyCache && 
      (new Date().getTime() - currencyCache.lastUpdated.getTime()) < CURRENCY_CACHE_TTL) {
    const rate = currencyCache.rates[currency] || 1.0;
    return amount * rate;
  }
  
  // Fallback to static rates for sync operations
  const fallbackRates: Record<string, number> = {
    'USD': 1.0,
    'EUR': 1.08,
    'GBP': 1.27,
    'CAD': 0.74,
    'AUD': 0.65,
    'JPY': 0.0067,
    'INR': 0.012,
    'CHF': 1.11,
    'SGD': 0.74,
    'CNY': 0.14,
    'BRL': 0.20,
    'MXN': 0.059,
  };
  
  const rate = fallbackRates[currency] || 1.0;
  return amount * rate;
}

export function getCostOfLivingData(location: string): CostOfLivingData {
  if (!location) return COST_OF_LIVING_DATA['remote'];
  
  const normalized = location.toLowerCase();
  
  // Try exact match first
  if (COST_OF_LIVING_DATA[normalized]) {
    return COST_OF_LIVING_DATA[normalized];
  }
  
  // Try to find city in location string
  for (const [key, data] of Object.entries(COST_OF_LIVING_DATA)) {
    if (normalized.includes(key)) {
      return data;
    }
  }
  
  // Default to remote/average
  return COST_OF_LIVING_DATA['remote'];
}

export function calculateComfortScore(
  salaryUSD: number,
  costOfLivingIndex: number
): number {
  // Adjust salary based on cost of living (NYC = 100 baseline)
  const adjustedSalary = (salaryUSD / costOfLivingIndex) * 100;
  
  // Comfort score thresholds (adjusted for purchasing power)
  // These represent annual salaries in NYC-equivalent dollars
  const thresholds = {
    struggling: 40000,    // < $40k
    tight: 60000,         // $40k - $60k
    comfortable: 100000,  // $60k - $100k
    thriving: 150000,     // $100k - $150k
    luxurious: 200000,    // > $150k
  };
  
  // Calculate score on 0-100 scale
  if (adjustedSalary < thresholds.struggling) {
    return Math.max(0, (adjustedSalary / thresholds.struggling) * 20);
  } else if (adjustedSalary < thresholds.tight) {
    return 20 + ((adjustedSalary - thresholds.struggling) / (thresholds.tight - thresholds.struggling)) * 20;
  } else if (adjustedSalary < thresholds.comfortable) {
    return 40 + ((adjustedSalary - thresholds.tight) / (thresholds.comfortable - thresholds.tight)) * 20;
  } else if (adjustedSalary < thresholds.thriving) {
    return 60 + ((adjustedSalary - thresholds.comfortable) / (thresholds.thriving - thresholds.comfortable)) * 20;
  } else if (adjustedSalary < thresholds.luxurious) {
    return 80 + ((adjustedSalary - thresholds.thriving) / (thresholds.luxurious - thresholds.thriving)) * 15;
  } else {
    return Math.min(100, 95 + (adjustedSalary - thresholds.luxurious) / 50000);
  }
}

export function getComfortLevel(score: number): SalaryAnalysis['comfortLevel'] {
  if (score < 20) return 'struggling';
  if (score < 40) return 'tight';
  if (score < 60) return 'comfortable';
  if (score < 80) return 'thriving';
  return 'luxurious';
}

export function calculateSavingsPotential(
  salaryUSD: number,
  costOfLivingIndex: number
): number {
  const adjustedSalary = (salaryUSD / costOfLivingIndex) * 100;
  
  // Basic living costs (NYC baseline)
  const basicCosts = 35000; // Minimum living expenses
  const comfortableCosts = 55000; // Comfortable living expenses
  
  if (adjustedSalary <= basicCosts) {
    return 0; // No savings potential
  } else if (adjustedSalary <= comfortableCosts) {
    // Can save 0-15% as income increases
    return ((adjustedSalary - basicCosts) / adjustedSalary) * 100;
  } else {
    // Can save increasingly more above comfortable threshold
    const surplus = adjustedSalary - comfortableCosts;
    const savingsRate = Math.min(50, 15 + (surplus / adjustedSalary) * 100);
    return savingsRate;
  }
}

export async function analyzeSalary(
  salaryStr: string | undefined,
  location: string | undefined
): Promise<SalaryAnalysis | null> {
  if (!salaryStr) return null;
  
  const parsed = parseSalaryString(salaryStr);
  if (!parsed) return null;
  
  const costData = getCostOfLivingData(location || 'remote');
  
  // Convert to USD with live rates
  const minUSD = await convertToUSD(parsed.min, parsed.currency);
  const maxUSD = await convertToUSD(parsed.max, parsed.currency);
  const avgUSD = (minUSD + maxUSD) / 2;

  // Rest of the function remains the same
  return analyzeSalaryCore(parsed, minUSD, maxUSD, avgUSD, costData);
}

// Synchronous version for immediate UI updates
export function analyzeSalarySync(
  salaryStr: string | undefined,
  location: string | undefined
): SalaryAnalysis | null {
  if (!salaryStr) return null;
  
  const parsed = parseSalaryString(salaryStr);
  if (!parsed) return null;
  
  const costData = getCostOfLivingData(location || 'remote');
  
  // Convert to USD with cached/fallback rates
  const minUSD = convertToUSDSync(parsed.min, parsed.currency);
  const maxUSD = convertToUSDSync(parsed.max, parsed.currency);
  const avgUSD = (minUSD + maxUSD) / 2;

  return analyzeSalaryCore(parsed, minUSD, maxUSD, avgUSD, costData);
}

// Core analysis logic extracted to avoid duplication
function analyzeSalaryCore(
  parsed: { min: number; max: number; currency: string },
  minUSD: number,
  maxUSD: number,
  avgUSD: number,
  costData: CostOfLivingData
): SalaryAnalysis {
  
  // Calculate adjusted values
  const adjustmentFactor = 100 / costData.costIndex;
  const adjustedMin = minUSD * adjustmentFactor;
  const adjustedMax = maxUSD * adjustmentFactor;
  const adjustedAvg = avgUSD * adjustmentFactor;
  
  // Calculate comfort score
  const comfortScore = calculateComfortScore(avgUSD, costData.costIndex);
  const comfortLevel = getComfortLevel(comfortScore);
  
  // Calculate savings potential
  const savingsPotential = calculateSavingsPotential(avgUSD, costData.costIndex);
  
  // Calculate purchasing power
  const purchasingPower = (adjustedAvg / 100000) * costData.purchasingPowerIndex;
  
  // Calculate percentile (simplified - in production, use actual job data)
  const betterThanPercent = Math.min(95, Math.max(5, comfortScore * 0.9));
  
  return {
    originalSalary: parsed,
    normalizedSalaryUSD: {
      min: minUSD,
      max: maxUSD,
    },
    costOfLivingAdjusted: {
      min: adjustedMin,
      max: adjustedMax,
    },
    comfortScore,
    comfortLevel,
    purchasingPower,
    savingsPotential,
    betterThanPercent,
  };
}

// Initialize currency cache on module load
if (typeof window === 'undefined') {
  // Server-side: pre-fetch rates
  fetchCurrencyRates().catch(console.warn);
}

export function formatSalaryRange(min: number, max: number, currency: string = 'USD'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
  
  if (min === max) {
    return formatter.format(min);
  }
  
  return `${formatter.format(min)} - ${formatter.format(max)}`;
}

export function getComfortColor(level: SalaryAnalysis['comfortLevel']): string {
  const colors = {
    struggling: 'text-red-600 bg-red-50 border-red-200',
    tight: 'text-orange-600 bg-orange-50 border-orange-200',
    comfortable: 'text-blue-600 bg-blue-50 border-blue-200',
    thriving: 'text-green-600 bg-green-50 border-green-200',
    luxurious: 'text-purple-600 bg-purple-50 border-purple-200',
  };
  return colors[level];
}

export function getComfortIcon(level: SalaryAnalysis['comfortLevel']): string {
  const icons = {
    struggling: '😰',
    tight: '😓',
    comfortable: '😊',
    thriving: '😄',
    luxurious: '🤩',
  };
  return icons[level];
}