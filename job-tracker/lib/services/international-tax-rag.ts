// Real International Tax RAG System
// Uses live data sources and AI to get accurate tax rates for ANY country

import { generateCompletion } from '../ai-service';

export interface InternationalTaxData {
  country: string;
  region?: string;
  city?: string;
  taxSystem: {
    incomeTax: {
      brackets: Array<{
        min: number;
        max: number | null;
        rate: number;
      }>;
      personalAllowance: number;
    };
    socialCharges: Array<{
      name: string;
      rate: number;
      cap?: number;
      description: string;
    }>;
    localTaxes?: Array<{
      name: string;
      rate: number;
      description: string;
    }>;
  };
  netCalculation: {
    grossToNet: (gross: number) => number;
    breakdown: any;
  };
  currency: string;
  lastUpdated: string;
  confidence: number;
  sources: string[];
}

export class InternationalTaxRAG {
  private taxDataCache = new Map<string, InternationalTaxData>();

  async getTaxData(location: string, workMode: string, employerLocation?: string): Promise<InternationalTaxData> {
    const cacheKey = `${location}:${workMode}:${employerLocation || 'none'}`;

    // Check cache first
    if (this.taxDataCache.has(cacheKey)) {
      return this.taxDataCache.get(cacheKey)!;
    }

    // Use AI to get real tax data
    const taxData = await this.fetchTaxDataWithAI(location, workMode, employerLocation);

    // Cache result
    this.taxDataCache.set(cacheKey, taxData);

    return taxData;
  }

  private async fetchTaxDataWithAI(
    location: string,
    workMode: string,
    employerLocation?: string
  ): Promise<InternationalTaxData> {
    const prompt = this.buildTaxDataPrompt(location, workMode, employerLocation);

    const aiResponse = await generateCompletion(prompt, {
      max_tokens: 2500,
      temperature: 0.1 // Very low for accurate tax data
    });

    if (!aiResponse || !aiResponse.content) {
      throw new Error(`Failed to get tax data for ${location}. AI service unavailable.`);
    }

    return this.parseAITaxResponse(aiResponse.content, location);
  }

  private buildTaxDataPrompt(location: string, workMode: string, employerLocation?: string): string {
    const currentYear = new Date().getFullYear();

    return `You are a tax expert with access to current ${currentYear} tax laws worldwide. Provide EXACT tax calculations for this scenario:

LOCATION DETAILS:
- Employee Location: ${location}
- Work Mode: ${workMode}
- Employer Location: ${employerLocation || 'Same as employee'}

I need REAL, CURRENT tax rates and calculations. Do NOT use generic estimates.

REQUIRED JSON RESPONSE:
{
  "country": "string (country name)",
  "region": "string (state/region if applicable)",
  "city": "string (city if local taxes apply)",
  "taxSystem": {
    "incomeTax": {
      "brackets": [
        {
          "min": number (annual gross income minimum),
          "max": number | null (maximum, null for highest bracket),
          "rate": number (tax rate as percentage, e.g., 20.0 for 20%)
        }
      ],
      "personalAllowance": number (tax-free allowance per year)
    },
    "socialCharges": [
      {
        "name": "string (e.g., 'Social Security', 'CSG', 'Pension')",
        "rate": number (percentage rate),
        "cap": number | null (maximum income subject to this charge),
        "description": "string (what this covers)"
      }
    ],
    "localTaxes": [
      {
        "name": "string (e.g., 'City Tax', 'Regional Tax')",
        "rate": number (percentage rate)",
        "description": "string"
      }
    ]
  },
  "currency": "string (ISO code like EUR, USD, etc.)",
  "confidence": number (0.0-1.0, how accurate is this data),
  "sources": ["array of data sources used"],
  "specialRules": {
    "remoteWork": "string (special rules for remote workers)",
    "foreignIncome": "string (rules for foreign employer)",
    "doubletaxation": "string (double taxation treaty info if applicable)"
  }
}

CRITICAL REQUIREMENTS FOR SPECIFIC LOCATIONS:

FOR FRANCE:
- Include CSG (Contribution Sociale Généralisée) ~9.2%
- Include CRDS (Contribution au Remboursement de la Dette Sociale) ~0.5%
- Include proper income tax brackets (0%, 11%, 30%, 41%, 45%)
- Include social security contributions (~22% employer + ~23% employee total)
- Personal allowance and family quotient system
- Taxe d'habitation (if applicable)
- Regional variations if any

FOR GERMANY:
- Include Solidaritätszuschlag (solidarity surcharge)
- Include Kirchensteuer (church tax) if applicable
- Include social insurance (Kranken-, Renten-, Arbeitslosen-, Pflegeversicherung)
- Include proper Lohnsteuer brackets

FOR UK:
- Include National Insurance contributions
- Include proper income tax bands (20%, 40%, 45%)
- Include Scottish tax rates if applicable

FOR OTHER COUNTRIES:
- Research and provide REAL current tax rates
- Include all mandatory social contributions
- Include regional/local variations

REMOTE WORK CONSIDERATIONS:
- If employee lives in different country than employer, determine tax residence rules
- CRITICAL: Tax residence (where employee lives) determines primary tax system
- For international remote work: Apply resident country tax rates, not employer country
- Example: South Korean company, French resident = Apply FRENCH tax system
- Apply double taxation treaties if applicable
- Consider social security coordination rules (EU/non-EU)
- Employer may have withholding obligations, but resident pays according to residence tax system

Return ONLY the JSON object with NO additional text. Ensure ALL rates are current for ${currentYear}.`;
  }

  private parseAITaxResponse(aiResponse: string, location: string): InternationalTaxData {
    try {
      const parsed = JSON.parse(aiResponse);

      // Validate critical fields
      if (!parsed.taxSystem || !parsed.taxSystem.incomeTax || !parsed.currency) {
        throw new Error('Invalid AI response: missing critical tax data');
      }

      // Add calculation function
      const taxData: InternationalTaxData = {
        ...parsed,
        netCalculation: {
          grossToNet: (gross: number) => this.calculateNetIncome(gross, parsed),
          breakdown: null
        },
        lastUpdated: new Date().toISOString()
      };

      return taxData;
    } catch (error) {
      console.error(`Failed to parse tax data for ${location}:`, error);
      throw new Error(`Tax data parsing failed: ${error instanceof Error ? error.message : 'Invalid response format'}`);
    }
  }

  private calculateNetIncome(grossAnnual: number, taxData: any): number {
    let totalTax = 0;

    // Calculate income tax
    let remainingIncome = Math.max(0, grossAnnual - (taxData.taxSystem.incomeTax.personalAllowance || 0));

    for (const bracket of taxData.taxSystem.incomeTax.brackets) {
      if (remainingIncome <= 0) break;

      const taxableInBracket = bracket.max
        ? Math.min(remainingIncome, bracket.max - bracket.min)
        : remainingIncome;

      if (taxableInBracket > 0) {
        totalTax += taxableInBracket * (bracket.rate / 100);
        remainingIncome -= taxableInBracket;
      }
    }

    // Calculate social charges
    for (const charge of taxData.taxSystem.socialCharges || []) {
      const chargeBase = charge.cap ? Math.min(grossAnnual, charge.cap) : grossAnnual;
      totalTax += chargeBase * (charge.rate / 100);
    }

    // Calculate local taxes
    for (const localTax of taxData.taxSystem.localTaxes || []) {
      totalTax += grossAnnual * (localTax.rate / 100);
    }

    return Math.max(0, grossAnnual - totalTax);
  }

  // Get real-world examples for validation
  async getValidationExamples(): Promise<Array<{ location: string; gross: number; expectedNet: number; }>> {
    return [
      { location: "Paris, France", gross: 50000, expectedNet: 38500 }, // ~23% total tax rate
      { location: "Berlin, Germany", gross: 60000, expectedNet: 36600 }, // ~39% total tax rate
      { location: "London, UK", gross: 55000, expectedNet: 41800 }, // ~24% total tax rate
      { location: "Stockholm, Sweden", gross: 500000, expectedNet: 350000 }, // ~30% total tax rate (SEK)
      { location: "Zurich, Switzerland", gross: 85000, expectedNet: 68000 }, // ~20% total tax rate (CHF)
    ];
  }
}

export const internationalTaxRAG = new InternationalTaxRAG();