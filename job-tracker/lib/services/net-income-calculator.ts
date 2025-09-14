// AI-Powered Net Income Calculator with Location-Aware Tax Calculations
// Uses RAG to get accurate tax data for any location including remote scenarios

import { generateCompletion } from '../ai-service';
import { PrismaClient } from '@prisma/client';
import { internationalTaxRAG } from './international-tax-rag';

const prisma = new PrismaClient();

export interface NetIncomeRequest {
  grossSalary: number;
  location: string;
  workMode: 'onsite' | 'hybrid' | 'remote_country' | 'remote_global';
  currency: string;
  userId: string;
  // Additional deductions
  retirement401k?: number; // Annual contribution
  healthInsurance?: number; // Annual premium
  otherPreTaxDeductions?: number;
  // Remote work specifics
  employerLocation?: string; // For remote workers
  residenceLocation?: string; // Where they actually live
  // Benefits
  employerMatch401k?: number;
  employerHealthContribution?: number;
  stockOptions?: number;
  signingBonus?: number;
  performanceBonus?: number;
}

export interface NetIncomeResponse {
  gross: {
    annual: number;
    monthly: number;
    biweekly: number;
    currency: string;
  };
  taxes: {
    federal: {
      amount: number;
      rate: number;
      breakdown: {
        incomeTax: number;
        socialSecurity: number;
        medicare: number;
      };
    };
    state: {
      amount: number;
      rate: number;
      stateName: string;
    };
    local?: {
      amount: number;
      rate: number;
      locality: string;
    };
    totalTaxes: number;
    effectiveRate: number;
  };
  deductions: {
    retirement401k: number;
    healthInsurance: number;
    other: number;
    totalDeductions: number;
  };
  netIncome: {
    annual: number;
    monthly: number;
    biweekly: number;
    hourly: number; // Assuming 2080 hours/year
    dailyTakeHome: number;
  };
  comparison: {
    vsMedianIncome: string; // e.g., "+45% vs local median"
    purchasingPower: number; // Adjusted for cost of living
    savingsPotential: number; // After typical expenses
  };
  remoteWorkConsiderations?: {
    taxComplexity: 'simple' | 'moderate' | 'complex';
    multiStateTax: boolean;
    recommendedWithholding: number;
    quarterlyEstimates?: number;
    notes: string[];
  };
  insights: {
    taxOptimizations: string[];
    comparisonToSimilarRoles: string;
    takeHomeSummary: string;
    warnings: string[];
  };
  totalCompensation?: {
    baseSalary: number;
    benefits: number;
    bonuses: number;
    equity: number;
    total: number;
    totalAfterTax: number;
  };
  confidence: {
    overall: number;
    taxAccuracy: number;
    source: 'current_tax_tables' | 'recent_estimates' | 'general_calculation';
  };
}

export class NetIncomeCalculatorService {
  private determineTaxLocation(request: NetIncomeRequest): string {
    // If residenceLocation has a clear country identifier, use it
    if (request.residenceLocation) {
      const residenceCountry = this.extractCountry(request.residenceLocation);
      if (residenceCountry !== 'Unknown') {
        console.log(`Using residence location for tax calculation: ${request.residenceLocation} (${residenceCountry})`);
        return request.residenceLocation;
      }
    }

    // Fallback to location
    console.log(`Using fallback location for tax calculation: ${request.location}`);
    return request.location;
  }
  async calculate(request: NetIncomeRequest): Promise<NetIncomeResponse> {
    // For remote work: Use residence location for tax calculation, not employer location
    // Prioritize residenceLocation if it contains a clear country identifier
    const taxCalculationLocation = this.determineTaxLocation(request);

    // Get REAL tax data for the tax residence location
    const taxData = await internationalTaxRAG.getTaxData(
      taxCalculationLocation,
      request.workMode,
      request.employerLocation
    );

    // Build RAG context with REAL tax data
    const ragContext = await this.buildTaxContext(request, taxData);

    // Generate AI-powered tax calculation with REAL data
    const prompt = this.buildCalculationPrompt(request, ragContext, taxData);

    const aiResponse = await generateCompletion(prompt, {
      max_tokens: 2500,
      temperature: 0.1 // Low temperature for accurate calculations
    });

    if (!aiResponse || !aiResponse.content) {
      throw new Error('Failed to calculate net income. AI service unavailable.');
    }

    return this.parseAIResponse(aiResponse.content, request);
  }

  private async buildTaxContext(request: NetIncomeRequest, taxData: any): Promise<string> {
    const contexts: string[] = [];

    // 1. User's tax history context (if available)
    const userContext = await this.getUserTaxContext(request.userId);
    if (userContext) {
      contexts.push(`USER TAX CONTEXT:\n${userContext}`);
    }

    // 2. Location-specific tax information
    const locationContext = this.getLocationTaxContext(request);
    contexts.push(`LOCATION TAX CONTEXT:\n${locationContext}`);

    // 3. Remote work tax considerations
    if (request.workMode.includes('remote')) {
      const remoteContext = this.getRemoteTaxContext(request);
      contexts.push(`REMOTE WORK TAX CONTEXT:\n${remoteContext}`);
    }

    // 4. Similar salaries in the area
    const marketContext = await this.getMarketContext(request);
    if (marketContext) {
      contexts.push(`MARKET CONTEXT:\n${marketContext}`);
    }

    // 5. Current tax year information
    const taxYearContext = this.getTaxYearContext();
    contexts.push(`TAX YEAR CONTEXT:\n${taxYearContext}`);

    return contexts.join('\n\n---\n\n');
  }

  private async getUserTaxContext(userId: string): Promise<string | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true
        }
      });

      if (!user?.profile) return null;

      return `
Current Location: ${user.profile.currentLocation || 'Not specified'}
Filing Status: ${user.profile.filingStatus || 'Single'}
Dependents: ${user.profile.dependents || 0}
Current Salary: ${user.profile.currentSalary || 'Not specified'}
State of Residence: ${user.profile.stateOfResidence || 'Not specified'}
      `.trim();
    } catch (error) {
      console.error('Error getting user tax context:', error);
      return null;
    }
  }

  private getLocationTaxContext(request: NetIncomeRequest): string {
    const location = request.residenceLocation || request.location;

    return `
Primary Work Location: ${request.location}
Residence Location: ${request.residenceLocation || request.location}
Work Mode: ${request.workMode}
Employer Location: ${request.employerLocation || request.location}
Currency: ${request.currency}

Tax Considerations Needed:
- Federal income tax for ${request.currency === 'USD' ? 'United States' : 'the country'}
- State income tax for ${location}
- Local/city taxes if applicable
- Social Security and Medicare (or equivalents)
- Remote work tax implications if applicable
- Multi-state taxation if working across state lines
    `.trim();
  }

  private getRemoteTaxContext(request: NetIncomeRequest): string {
    const workLocation = request.employerLocation || request.location;
    const liveLocation = request.residenceLocation || request.location;

    // Detect if this is international remote work
    const isInternationalRemote = this.isInternationalRemoteWork(workLocation, liveLocation);

    return `
REMOTE WORK TAX SCENARIO:
- Employee lives in: ${liveLocation}
- Employer based in: ${workLocation}
- Work arrangement: ${request.workMode}
- International remote work: ${isInternationalRemote ? 'YES' : 'NO'}

${isInternationalRemote ?
`INTERNATIONAL REMOTE WORK RULES:
1. Tax residence determines primary taxation (employee location: ${liveLocation})
2. Double taxation treaties may apply between countries
3. Employer withholding obligations in employer country: ${workLocation}
4. Employee tax filing obligations in residence country: ${liveLocation}
5. Social security coordination (EU/bilateral agreements)
6. Permanent establishment rules for employer
7. 183-day rule for tax residence determination

CRITICAL: For remote worker living in ${liveLocation}, apply ${liveLocation} tax rates and system, NOT ${workLocation} rates.
Example: South Korean employer + French resident = Use FRENCH tax system (CSG, CRDS, French income tax brackets).` :

`DOMESTIC REMOTE WORK RULES:
1. Nexus rules - which state(s) have taxation rights
2. Reciprocity agreements between states
3. Convenience of employer rule (if applicable)
4. Days worked in each state (if hybrid)
5. Withholding requirements
6. Quarterly estimated tax payments
7. Home office deductions (if applicable)
8. State tax credits to avoid double taxation`}

Special Cases to Consider:
- Digital nomad taxation
- International remote work treaties
- Social security totalization agreements
- Permanent establishment thresholds
    `.trim();
  }

  private isInternationalRemoteWork(employerLocation: string, residenceLocation: string): boolean {
    // Enhanced logic to handle ambiguous employer locations
    const employerCountry = this.extractCountry(employerLocation);
    const residenceCountry = this.extractCountry(residenceLocation);

    // If residence country is clearly identified and different from employer, treat as international
    // This handles cases like "Nancy" (unknown) vs "Nancy, France" (France)
    if (residenceCountry !== 'Unknown') {
      if (employerCountry === 'Unknown') {
        // Check if employer location contains the residence country
        const residenceInEmployer = employerLocation.toLowerCase().includes(residenceCountry.toLowerCase());
        return !residenceInEmployer; // If employer doesn't contain France, it's international
      }
      return employerCountry !== residenceCountry;
    }

    // Fallback to original logic
    return employerCountry !== residenceCountry && employerCountry !== 'Unknown' && residenceCountry !== 'Unknown';
  }

  private extractCountry(location: string): string {
    const countries = [
      'United States', 'USA', 'US', 'France', 'Germany', 'United Kingdom', 'UK',
      'South Korea', 'Japan', 'Canada', 'Australia', 'Netherlands', 'Switzerland',
      'Sweden', 'Norway', 'Denmark', 'Finland', 'Italy', 'Spain', 'Belgium'
    ];

    const normalizedLocation = location.toLowerCase();
    for (const country of countries) {
      if (normalizedLocation.includes(country.toLowerCase())) {
        return country;
      }
    }
    return 'Unknown';
  }

  private async getMarketContext(request: NetIncomeRequest): Promise<string | null> {
    try {
      const similarJobs = await prisma.job.findMany({
        where: {
          location: { contains: request.location.split(',')[0] },
          salaryMin: {
            gte: request.grossSalary * 0.7,
            lte: request.grossSalary * 1.3
          }
        },
        take: 5,
        select: {
          title: true,
          company: true,
          salaryMin: true,
          salaryMax: true
        }
      });

      if (similarJobs.length === 0) return null;

      const comparisons = similarJobs.map(job =>
        `- ${job.title} at ${job.company}: $${job.salaryMin}-${job.salaryMax}`
      ).join('\n');

      return `Similar salaries in the area:\n${comparisons}`;
    } catch (error) {
      console.error('Error getting market context:', error);
      return null;
    }
  }

  private getTaxYearContext(): string {
    const currentYear = new Date().getFullYear();

    return `
Tax Year: ${currentYear}
Standard Deduction (Single): $14,600 (2024)
Standard Deduction (Married Filing Jointly): $29,200 (2024)

Federal Tax Brackets (2024 - Single):
- 10%: $0 to $11,600
- 12%: $11,601 to $47,150
- 22%: $47,151 to $100,525
- 24%: $100,526 to $191,950
- 32%: $191,951 to $243,725
- 35%: $243,726 to $609,350
- 37%: $609,351+

Social Security: 6.2% on first $168,600 (2024)
Medicare: 1.45% on all income
Additional Medicare: 0.9% on income over $200,000
    `.trim();
  }

  private buildCalculationPrompt(request: NetIncomeRequest, ragContext: string, taxData: any): string {
    return `You are an expert tax calculator with access to current tax laws and rates. Calculate the precise net income for this scenario using the REAL TAX DATA provided.

${ragContext}

REAL TAX DATA FOR ${request.residenceLocation || request.location}:
Country: ${taxData.country}
Currency: ${taxData.currency}

INCOME TAX BRACKETS:
${taxData.taxSystem.incomeTax.brackets.map((bracket: any) =>
  `- ${bracket.rate}% on income from ${taxData.currency} ${bracket.min} to ${bracket.max || 'unlimited'}`
).join('\n')}
Personal Allowance: ${taxData.currency} ${taxData.taxSystem.incomeTax.personalAllowance || 0}

SOCIAL CHARGES & CONTRIBUTIONS:
${(taxData.taxSystem.socialCharges || []).map((charge: any) =>
  `- ${charge.name}: ${charge.rate}% ${charge.cap ? `(capped at ${taxData.currency} ${charge.cap})` : ''} - ${charge.description}`
).join('\n')}

${taxData.taxSystem.localTaxes && taxData.taxSystem.localTaxes.length > 0 ?
`LOCAL TAXES:
${taxData.taxSystem.localTaxes.map((tax: any) =>
  `- ${tax.name}: ${tax.rate}% - ${tax.description}`
).join('\n')}` : 'No local taxes apply'}

${taxData.specialRules ?
`SPECIAL RULES:
- Remote Work: ${taxData.specialRules.remoteWork || 'Standard rules apply'}
- Foreign Employer: ${taxData.specialRules.foreignIncome || 'Standard rules apply'}
- Double Taxation: ${taxData.specialRules.doubletaxation || 'No treaty info'}` : ''}

SALARY DETAILS:
- Gross Annual Salary: ${request.currency} ${request.grossSalary}
- Location: ${request.location}
- Work Mode: ${request.workMode}
- Currency: ${request.currency}

DEDUCTIONS:
- 401k Contribution: ${request.currency} ${request.retirement401k || 0}/year
- Health Insurance: ${request.currency} ${request.healthInsurance || 0}/year
- Other Pre-tax: ${request.currency} ${request.otherPreTaxDeductions || 0}/year

ADDITIONAL COMPENSATION:
- 401k Employer Match: ${request.currency} ${request.employerMatch401k || 0}/year
- Employer Health Contribution: ${request.currency} ${request.employerHealthContribution || 0}/year
- Stock Options Value: ${request.currency} ${request.stockOptions || 0}/year
- Signing Bonus: ${request.currency} ${request.signingBonus || 0}
- Performance Bonus: ${request.currency} ${request.performanceBonus || 0}/year

REQUIRED JSON RESPONSE STRUCTURE:
{
  "gross": {
    "annual": number,
    "monthly": number,
    "biweekly": number,
    "currency": "${request.currency}"
  },
  "taxes": {
    "federal": {
      "amount": number,
      "rate": number (as percentage),
      "breakdown": {
        "incomeTax": number,
        "socialSecurity": number,
        "medicare": number
      }
    },
    "state": {
      "amount": number,
      "rate": number (as percentage),
      "stateName": "string"
    },
    "local": {
      "amount": number,
      "rate": number (as percentage),
      "locality": "string"
    },
    "totalTaxes": number,
    "effectiveRate": number (as percentage)
  },
  "deductions": {
    "retirement401k": number,
    "healthInsurance": number,
    "other": number,
    "totalDeductions": number
  },
  "netIncome": {
    "annual": number,
    "monthly": number,
    "biweekly": number,
    "hourly": number,
    "dailyTakeHome": number
  },
  "comparison": {
    "vsMedianIncome": "string (e.g., '+45% vs local median')",
    "purchasingPower": number (cost-of-living adjusted),
    "savingsPotential": number (after typical expenses)
  },
  "remoteWorkConsiderations": {
    "taxComplexity": "simple|moderate|complex",
    "multiStateTax": boolean,
    "recommendedWithholding": number,
    "quarterlyEstimates": number (if applicable),
    "notes": ["array of important notes"]
  },
  "insights": {
    "taxOptimizations": ["array of optimization suggestions"],
    "comparisonToSimilarRoles": "string",
    "takeHomeSummary": "string (one sentence summary)",
    "warnings": ["array of warnings if any"]
  },
  "totalCompensation": {
    "baseSalary": number,
    "benefits": number,
    "bonuses": number,
    "equity": number,
    "total": number,
    "totalAfterTax": number
  },
  "confidence": {
    "overall": number (0.0-1.0),
    "taxAccuracy": number (0.0-1.0),
    "source": "current_tax_tables|recent_estimates|general_calculation"
  }
}

CRITICAL REQUIREMENTS:
1. Use ONLY the REAL TAX DATA provided above - NO US tax rates for non-US locations
2. Apply the exact income tax brackets for ${taxData.country}
3. Include ALL social charges/contributions listed above
4. Apply local taxes if any are specified
5. Use ${taxData.currency} for ALL calculations

INTERNATIONAL TAX MAPPING (adapt US-style JSON structure for international data):
- "federal" field = ALL national taxes for ${taxData.country}
- "federal.amount" = TOTAL of all national taxes (income tax + social charges + contributions)
- "federal.breakdown.incomeTax" = National income tax amount only
- "federal.breakdown.socialSecurity" = Major social charges (CSG, social security, etc.)
- "federal.breakdown.medicare" = Additional charges (CRDS, solidarity, other charges, etc.) - NOT US Medicare
- "state" field = Regional/state taxes if applicable (use region name, not "state")
- "local" field = City/local taxes if applicable

FOR FRANCE SPECIFICALLY - CRITICAL CALCULATION EXAMPLE:
For $45,000 salary:
- Income Tax: ~$3,600 (8% after allowances) → federal.breakdown.incomeTax = 3600
- CSG + Social Security: ~$12,420 (27.6% combined) → federal.breakdown.socialSecurity = 12420
- CRDS + Other: ~$2,250 (5% misc charges) → federal.breakdown.medicare = 2250
- TOTAL FEDERAL: $18,270 → federal.amount = 18270
- stateName = Region name (e.g., "Grand Est" for Nancy)
- CRITICAL: federal.amount MUST equal sum of breakdown components
- NEVER leave federal.amount as 0 when totalTaxes > 0
- If totalTaxes = $18,000, then federal.amount should be ~$18,000 (all national taxes)

6. For Germany: Include solidarity surcharge, social insurance (~40-45% total)
7. For remote work: Apply tax residence country rules
8. CRITICAL: Effective rates must match country norms - France ~40-50%, Germany ~35-45%, UK ~25-35%

VALIDATION EXAMPLES for ${taxData.country}:
${taxData.country === 'France' ?
`- €45,000 gross should result in ~€27,000-29,000 net (38-42% effective rate including CSG/CRDS)
- $45,000 USD gross should result in ~$27,000-29,000 net (38-42% effective rate) if French resident
- €60,000 gross should result in ~€36,000-39,000 net (35-40% effective rate)
- Must include: Income tax (0-45%), CSG (9.2%), CRDS (0.5%), social security (~23% employee portion)
- REMOTE WORK: South Korean employer + French resident = Apply French taxes to salary` :
taxData.country === 'Germany' ?
`- €50,000 gross should result in ~€30,000-32,000 net (36-40% effective rate)
- Must include: Income tax, solidarity surcharge, church tax (if applicable), social insurance` :
`- ${taxData.currency} 50,000 gross should result in realistic net for ${taxData.country} tax system`}

Return ONLY the JSON object, no additional text.`;
  }

  private parseAIResponse(aiResponse: string, request: NetIncomeRequest): NetIncomeResponse {
    try {
      const parsed = JSON.parse(aiResponse);

      // Validate critical fields
      if (!parsed.gross || !parsed.taxes || !parsed.netIncome) {
        throw new Error('AI response missing critical tax calculation fields');
      }

      // Ensure all monetary values are numbers
      this.validateMonetaryFields(parsed);

      return parsed as NetIncomeResponse;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error(`Tax calculation failed: ${error instanceof Error ? error.message : 'Invalid response format'}`);
    }
  }

  private validateMonetaryFields(data: any): void {
    const validateNumber = (value: any, field: string) => {
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`Invalid monetary value for ${field}`);
      }
    };

    // Validate gross income
    validateNumber(data.gross?.annual, 'gross.annual');
    validateNumber(data.gross?.monthly, 'gross.monthly');

    // Validate taxes
    validateNumber(data.taxes?.federal?.amount, 'taxes.federal.amount');
    validateNumber(data.taxes?.state?.amount, 'taxes.state.amount');
    validateNumber(data.taxes?.totalTaxes, 'taxes.totalTaxes');

    // Additional validation for proper tax breakdown
    if (data.taxes?.totalTaxes > 0 && data.taxes?.federal?.amount === 0) {
      throw new Error('Federal tax amount cannot be 0 when total taxes > 0');
    }

    // Validate breakdown components sum to federal amount (with small tolerance for rounding)
    if (data.taxes?.federal?.breakdown) {
      const breakdownSum = (data.taxes.federal.breakdown.incomeTax || 0) +
                          (data.taxes.federal.breakdown.socialSecurity || 0) +
                          (data.taxes.federal.breakdown.medicare || 0);
      const federalAmount = data.taxes.federal.amount || 0;

      if (Math.abs(breakdownSum - federalAmount) > 100) { // Allow $100 tolerance
        console.warn(`Tax breakdown mismatch: breakdown sum ${breakdownSum}, federal amount ${federalAmount}`);
      }
    }

    // Validate net income
    validateNumber(data.netIncome?.annual, 'netIncome.annual');
    validateNumber(data.netIncome?.monthly, 'netIncome.monthly');
  }
}

export const netIncomeCalculator = new NetIncomeCalculatorService();