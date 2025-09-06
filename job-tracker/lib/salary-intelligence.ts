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

// Currency conversion rates (in production, use a real-time API)
const CURRENCY_RATES: Record<string, number> = {
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

export function convertToUSD(amount: number, currency: string): number {
  const rate = CURRENCY_RATES[currency] || 1.0;
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

export function analyzeSalary(
  salaryStr: string | undefined,
  location: string | undefined
): SalaryAnalysis | null {
  if (!salaryStr) return null;
  
  const parsed = parseSalaryString(salaryStr);
  if (!parsed) return null;
  
  const costData = getCostOfLivingData(location || 'remote');
  
  // Convert to USD
  const minUSD = convertToUSD(parsed.min, parsed.currency);
  const maxUSD = convertToUSD(parsed.max, parsed.currency);
  const avgUSD = (minUSD + maxUSD) / 2;
  
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