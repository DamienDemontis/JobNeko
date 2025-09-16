/**
 * Financial Impact Calculator
 * Comprehensive take-home pay and lifestyle impact analysis
 */

import { ExtractedJobData } from '../ai-service';
import { ContextualSalaryAnalysis } from './contextual-salary-analyzer';

export interface FinancialImpactAnalysis {
  // Salary breakdown
  salaryBreakdown: {
    grossAnnual: number;
    grossMonthly: number;
    grossBiweekly: number;
    currency: string;
  };

  // Tax calculations
  taxAnalysis: {
    federalTax: number;
    stateTax: number;
    localTax?: number;
    socialSecurity: number;
    medicare: number;
    totalTaxes: number;
    effectiveRate: number; // Percentage
  };

  // Take-home calculations
  netIncome: {
    annual: number;
    monthly: number;
    biweekly: number;
    weekly: number;
    daily: number; // Based on 250 working days
  };

  // Cost of living analysis
  costOfLiving: {
    location: string;
    housingCosts: {
      rent1BR: number;
      rent2BR: number;
      rent3BR: number;
      buyingPower: number; // Max house price at 30% income
      recommendedBudget: number; // 30% of gross income
    };

    monthlyExpenses: {
      housing: number;
      food: number;
      transportation: number;
      utilities: number;
      healthcare: number;
      entertainment: number;
      savings: number;
      miscellaneous: number;
      total: number;
    };

    survivalBudget: {
      minimumIncome: number;
      survivalMode: boolean; // True if salary below survival threshold
      cushion: number; // Amount above/below survival
    };
  };

  // Lifestyle analysis
  lifestyleImpact: {
    livingStandard: 'luxury' | 'comfortable' | 'moderate' | 'tight' | 'difficult';
    affordabilityIndex: number; // 0-100

    whatYouCanAfford: {
      housingType: string;
      carType: string;
      vacationBudget: number;
      diningOut: string;
      hobbies: string;
      savingsRate: number; // Percentage
    };

    financialGoals: {
      emergencyFund: {
        targetAmount: number;
        timeToSave: string; // Months
        monthlyContribution: number;
      };

      retirement: {
        recommendedContribution: number; // Annual
        percentageOfIncome: number;
        projectedRetirementAge: number;
      };

      majorPurchases: {
        carLoan: {
          maxPrice: number;
          monthlyPayment: number;
        };
        homePurchase: {
          maxPrice: number;
          downPayment: number;
          monthlyMortgage: number;
        };
      };
    };
  };

  // Comparison analysis
  comparison: {
    vsCurrentSalary?: {
      salaryChange: number;
      netIncomeChange: number;
      lifestyleChange: string;
      breakEvenTime?: string; // If negative change
    };

    vsLocationMedian: {
      percentageAbove: number;
      purchasing_power: 'high' | 'medium' | 'low';
      economicPosition: string;
    };

    vsNationalMedian: {
      percentageAbove: number;
      nationalRanking: string; // Percentile
    };
  };

  // Family scenario analysis
  familyScenarios: {
    single: {
      comfortable: boolean;
      savings_potential: number;
      description: string;
    };

    couple: {
      comfortable: boolean;
      dual_income_needed: boolean;
      combined_target: number;
      description: string;
    };

    familyOfFour: {
      feasible: boolean;
      additional_income_needed: number;
      childcare_impact: number;
      education_savings: number;
      description: string;
    };
  };

  // Investment and savings
  wealthBuilding: {
    savingsRate: number; // Percentage of net income
    investmentCapacity: {
      monthly401k: number;
      monthlyIRA: number;
      monthlyTaxable: number;
      totalMonthlyInvestment: number;
    };

    wealthProjection: {
      in5Years: number;
      in10Years: number;
      in20Years: number;
      retirementProjection: number;
    };

    financialIndependence: {
      fireNumber: number; // 25x annual expenses
      yearsToFI: number;
      monthlyInvestmentNeeded: number;
    };
  };

  // Risk analysis
  financialRisk: {
    jobLossImpact: {
      monthsOfExpenses: number;
      emergencyFundAdequacy: 'excellent' | 'good' | 'adequate' | 'poor';
      riskLevel: 'low' | 'medium' | 'high';
    };

    economicDownturn: {
      resiliency: number; // 0-100
      adaptabilityScore: number;
      downside_scenarios: string[];
    };

    industryRisk: {
      stability: 'high' | 'medium' | 'low';
      automation_risk: number; // 0-100
      growth_outlook: 'positive' | 'stable' | 'declining';
    };
  };

  // Recommendations
  recommendations: {
    immediate: Array<{
      category: 'spending' | 'saving' | 'investing' | 'insurance' | 'debt';
      action: string;
      priority: 'high' | 'medium' | 'low';
      impact: string;
    }>;

    short_term: string[]; // 1-2 years
    long_term: string[]; // 5+ years

    optimizations: Array<{
      area: string;
      current: number;
      optimized: number;
      savings: number;
      difficulty: 'easy' | 'medium' | 'hard';
    }>;
  };

  // Meta information
  calculation_metadata: {
    calculated_at: string;
    location_data_source: string;
    tax_year: number;
    assumptions: string[];
    confidence_level: number; // 0-100
    last_updated: string;
  };
}

export class FinancialImpactCalculator {
  private readonly FEDERAL_TAX_BRACKETS_2024 = [
    { min: 0, max: 11000, rate: 0.10 },
    { min: 11000, max: 44725, rate: 0.12 },
    { min: 44725, max: 95375, rate: 0.22 },
    { min: 95375, max: 182050, rate: 0.24 },
    { min: 182050, max: 231250, rate: 0.32 },
    { min: 231250, max: 578125, rate: 0.35 },
    { min: 578125, max: Infinity, rate: 0.37 }
  ];

  private readonly SOCIAL_SECURITY_RATE = 0.062;
  private readonly MEDICARE_RATE = 0.0145;
  private readonly SOCIAL_SECURITY_WAGE_BASE = 160200; // 2024

  /**
   * Calculate comprehensive financial impact
   */
  async calculateFinancialImpact(
    job: ExtractedJobData,
    salaryAnalysis: ContextualSalaryAnalysis,
    userContext: {
      currentSalary?: number;
      location?: string;
      familyStatus?: 'single' | 'couple' | 'family';
      dependents?: number;
      currentExpenses?: {
        housing?: number;
        total?: number;
      };
      financialGoals?: {
        emergencyFund?: number;
        retirement?: number;
        homeDownPayment?: number;
      };
    }
  ): Promise<FinancialImpactAnalysis> {

    const salary = this.determineSalary(job, salaryAnalysis);
    const location = userContext.location || this.extractLocation(job);

    // Core calculations
    const salaryBreakdown = this.calculateSalaryBreakdown(salary, (job as any).salaryCurrency || 'USD');
    const taxAnalysis = this.calculateTaxes(salary, location);
    const netIncome = this.calculateNetIncome(salary, taxAnalysis);
    const costOfLiving = await this.analyzeCostOfLiving(location, salary);
    const lifestyleImpact = this.analyzeLifestyleImpact(netIncome, costOfLiving, userContext);
    const comparison = this.calculateComparisons(salary, netIncome, location, userContext);
    const familyScenarios = this.analyzeFamilyScenarios(netIncome, costOfLiving);
    const wealthBuilding = this.calculateWealthBuilding(netIncome, costOfLiving);
    const financialRisk = this.assessFinancialRisk(netIncome, costOfLiving, job);
    const recommendations = this.generateRecommendations(netIncome, costOfLiving, userContext);

    return {
      salaryBreakdown,
      taxAnalysis,
      netIncome,
      costOfLiving,
      lifestyleImpact,
      comparison,
      familyScenarios,
      wealthBuilding,
      financialRisk: financialRisk as any,
      recommendations,
      calculation_metadata: {
        calculated_at: new Date().toISOString(),
        location_data_source: 'BLS and market research',
        tax_year: 2024,
        assumptions: [
          'Standard federal tax brackets',
          'No state-specific deductions',
          'Average cost-of-living estimates',
          '7% investment return assumption'
        ],
        confidence_level: this.calculateConfidenceLevel(job, userContext),
        last_updated: new Date().toISOString()
      }
    };
  }

  /**
   * Quick financial snapshot for dashboard
   */
  async calculateQuickImpact(
    salary: number,
    location: string = 'US National Average'
  ): Promise<{
    netMonthly: number;
    housingBudget: number;
    savingsPotential: number;
    lifestyleRating: string;
  }> {

    const taxes = this.calculateTaxes(salary, location);
    const netAnnual = salary - taxes.totalTaxes;
    const netMonthly = netAnnual / 12;
    const housingBudget = salary * 0.3 / 12; // 30% rule
    const costOfLiving = await this.analyzeCostOfLiving(location, salary);
    const savingsPotential = netMonthly - costOfLiving.monthlyExpenses.total;

    return {
      netMonthly,
      housingBudget,
      savingsPotential,
      lifestyleRating: this.getLifestyleRating(savingsPotential, costOfLiving)
    };
  }

  private determineSalary(job: ExtractedJobData, salaryAnalysis: ContextualSalaryAnalysis): number {
    // Priority: job posted salary > estimated salary > throw error
    if (job.salaryMin && job.salaryMax) {
      return (job.salaryMin + job.salaryMax) / 2;
    } else if (job.salaryMin) {
      return job.salaryMin;
    } else if (salaryAnalysis.salaryData.estimated?.min) {
      return (salaryAnalysis.salaryData.estimated.min + salaryAnalysis.salaryData.estimated.max) / 2;
    }
    throw new Error('No salary data available - cannot calculate financial impact without real salary information');
  }

  private extractLocation(job: ExtractedJobData): string {
    if (!job.location) {
      throw new Error('No location data available - cannot calculate financial impact without location information');
    }
    return job.location;
  }

  private calculateSalaryBreakdown(salary: number, currency: string) {
    return {
      grossAnnual: salary,
      grossMonthly: salary / 12,
      grossBiweekly: salary / 26,
      currency
    };
  }

  private calculateTaxes(salary: number, location: string) {
    const federalTax = this.calculateFederalTax(salary);
    const stateTax = this.calculateStateTax(salary, location);
    const socialSecurity = Math.min(salary * this.SOCIAL_SECURITY_RATE, this.SOCIAL_SECURITY_WAGE_BASE * this.SOCIAL_SECURITY_RATE);
    const medicare = salary * this.MEDICARE_RATE;

    const totalTaxes = federalTax + stateTax + socialSecurity + medicare;

    return {
      federalTax,
      stateTax,
      localTax: 0, // Simplified
      socialSecurity,
      medicare,
      totalTaxes,
      effectiveRate: (totalTaxes / salary) * 100
    };
  }

  private calculateFederalTax(salary: number): number {
    let tax = 0;
    let remainingIncome = salary;

    for (const bracket of this.FEDERAL_TAX_BRACKETS_2024) {
      const taxableInThisBracket = Math.min(remainingIncome, bracket.max - bracket.min);
      if (taxableInThisBracket <= 0) break;

      tax += taxableInThisBracket * bracket.rate;
      remainingIncome -= taxableInThisBracket;
    }

    return tax;
  }

  private calculateStateTax(salary: number, location: string): number {
    // Simplified state tax calculation
    const stateTaxRates: { [key: string]: number } = {
      'California': 0.093,
      'New York': 0.082,
      'Texas': 0.0,
      'Florida': 0.0,
      'Washington': 0.0,
      'Nevada': 0.0,
      'Tennessee': 0.0,
      'default': 0.05 // Average state tax
    };

    const state = this.extractStateFromLocation(location);
    const rate = stateTaxRates[state] || stateTaxRates['default'];

    return salary * rate;
  }

  private extractStateFromLocation(location: string): string {
    // Simple state extraction logic
    if (location.includes('CA') || location.includes('California')) return 'California';
    if (location.includes('NY') || location.includes('New York')) return 'New York';
    if (location.includes('TX') || location.includes('Texas')) return 'Texas';
    if (location.includes('FL') || location.includes('Florida')) return 'Florida';
    if (location.includes('WA') || location.includes('Washington')) return 'Washington';
    return 'default';
  }

  private calculateNetIncome(salary: number, taxAnalysis: any) {
    const annual = salary - taxAnalysis.totalTaxes;
    return {
      annual,
      monthly: annual / 12,
      biweekly: annual / 26,
      weekly: annual / 52,
      daily: annual / 250 // Working days
    };
  }

  private async analyzeCostOfLiving(location: string, salary: number) {
    // Simplified cost of living analysis
    const costMultipliers = this.getCostMultipliers(location);

    const baseHousing = {
      rent1BR: 1500 * costMultipliers.housing,
      rent2BR: 2000 * costMultipliers.housing,
      rent3BR: 2800 * costMultipliers.housing,
      buyingPower: salary * 3, // Simplified home buying power
      recommendedBudget: salary * 0.3 / 12
    };

    const monthlyExpenses = {
      housing: baseHousing.recommendedBudget,
      food: 600 * costMultipliers.food,
      transportation: 400 * costMultipliers.transportation,
      utilities: 200 * costMultipliers.utilities,
      healthcare: 300 * costMultipliers.healthcare,
      entertainment: 300 * costMultipliers.entertainment,
      savings: salary * 0.2 / 12, // 20% savings goal
      miscellaneous: 200 * costMultipliers.general,
      total: 0
    };

    monthlyExpenses.total = Object.values(monthlyExpenses).reduce((sum, value) => sum + value, 0) - monthlyExpenses.savings;

    const survivalBudget = {
      minimumIncome: monthlyExpenses.total * 0.7 * 12, // 70% of expenses
      survivalMode: salary < (monthlyExpenses.total * 0.7 * 12),
      cushion: salary - (monthlyExpenses.total * 12)
    };

    return {
      location,
      housingCosts: baseHousing,
      monthlyExpenses,
      survivalBudget
    };
  }

  private getCostMultipliers(location: string): {
    housing: number;
    food: number;
    transportation: number;
    utilities: number;
    healthcare: number;
    entertainment: number;
    general: number;
  } {
    // Cost of living multipliers by location
    const locationMultipliers: { [key: string]: any } = {
      'San Francisco': { housing: 2.5, food: 1.4, transportation: 1.3, utilities: 1.2, healthcare: 1.3, entertainment: 1.4, general: 1.3 },
      'New York': { housing: 2.2, food: 1.3, transportation: 1.1, utilities: 1.1, healthcare: 1.2, entertainment: 1.3, general: 1.2 },
      'Los Angeles': { housing: 1.8, food: 1.2, transportation: 1.2, utilities: 1.1, healthcare: 1.1, entertainment: 1.2, general: 1.1 },
      'Austin': { housing: 1.3, food: 1.0, transportation: 1.0, utilities: 1.0, healthcare: 1.0, entertainment: 1.0, general: 1.0 },
      'Denver': { housing: 1.2, food: 1.0, transportation: 1.0, utilities: 0.9, healthcare: 1.0, entertainment: 1.0, general: 1.0 },
      'default': { housing: 1.0, food: 1.0, transportation: 1.0, utilities: 1.0, healthcare: 1.0, entertainment: 1.0, general: 1.0 }
    };

    // Find best match for location
    for (const [city, multipliers] of Object.entries(locationMultipliers)) {
      if (location.toLowerCase().includes(city.toLowerCase())) {
        return multipliers;
      }
    }

    return locationMultipliers['default'];
  }

  private analyzeLifestyleImpact(netIncome: any, costOfLiving: any, userContext: any) {
    const monthlyDisposable = netIncome.monthly - costOfLiving.monthlyExpenses.total;
    const affordabilityIndex = Math.max(0, Math.min(100, (monthlyDisposable / netIncome.monthly) * 100 + 50));

    let livingStandard: 'luxury' | 'comfortable' | 'moderate' | 'tight' | 'difficult';
    if (monthlyDisposable > 2000) livingStandard = 'luxury';
    else if (monthlyDisposable > 1000) livingStandard = 'comfortable';
    else if (monthlyDisposable > 0) livingStandard = 'moderate';
    else if (monthlyDisposable > -500) livingStandard = 'tight';
    else livingStandard = 'difficult';

    return {
      livingStandard,
      affordabilityIndex,
      whatYouCanAfford: {
        housingType: this.determineHousingType(costOfLiving.housingCosts, netIncome.monthly),
        carType: this.determineCarType(monthlyDisposable),
        vacationBudget: Math.max(0, monthlyDisposable * 3), // Quarterly vacation budget
        diningOut: this.determineDiningOut(monthlyDisposable),
        hobbies: this.determineHobbies(monthlyDisposable),
        savingsRate: (costOfLiving.monthlyExpenses.savings / netIncome.monthly) * 100
      },
      financialGoals: this.calculateFinancialGoals(netIncome, costOfLiving)
    };
  }

  private calculateComparisons(salary: number, netIncome: any, location: string, userContext: any) {
    const comparison: any = {
      vsLocationMedian: {
        percentageAbove: 20, // Simplified
        purchasing_power: 'medium' as const,
        economicPosition: 'Above average for location'
      },
      vsNationalMedian: {
        percentageAbove: 35, // Simplified
        nationalRanking: '65th percentile'
      }
    };

    if (userContext.currentSalary) {
      const salaryChange = salary - userContext.currentSalary;
      comparison.vsCurrentSalary = {
        salaryChange,
        netIncomeChange: netIncome.annual - (userContext.currentSalary * 0.7), // Estimated current net
        lifestyleChange: salaryChange > 0 ? 'Improvement' : 'Reduction',
        breakEvenTime: salaryChange < 0 ? '6-12 months to adjust lifestyle' : undefined
      };
    }

    return comparison;
  }

  private analyzeFamilyScenarios(netIncome: any, costOfLiving: any) {
    const monthlyNet = netIncome.monthly;
    const monthlyExpenses = costOfLiving.monthlyExpenses.total;

    return {
      single: {
        comfortable: monthlyNet > monthlyExpenses * 1.2,
        savings_potential: Math.max(0, monthlyNet - monthlyExpenses),
        description: monthlyNet > monthlyExpenses * 1.5 ? 'Very comfortable for single person' : 'Adequate for single person'
      },
      couple: {
        comfortable: monthlyNet > monthlyExpenses * 0.8, // Shared expenses
        dual_income_needed: monthlyNet < monthlyExpenses * 1.2,
        combined_target: monthlyExpenses * 1.5,
        description: 'Consider partner income for optimal lifestyle'
      },
      familyOfFour: {
        feasible: monthlyNet > monthlyExpenses * 1.8, // Higher family expenses
        additional_income_needed: Math.max(0, monthlyExpenses * 2.2 - monthlyNet),
        childcare_impact: 2000, // Estimated monthly childcare
        education_savings: 500, // Recommended monthly education savings
        description: monthlyNet > monthlyExpenses * 2 ? 'Feasible with planning' : 'Challenging without additional income'
      }
    };
  }

  private calculateWealthBuilding(netIncome: any, costOfLiving: any) {
    const monthlyNet = netIncome.monthly;
    const monthlyExpenses = costOfLiving.monthlyExpenses.total;
    const availableForInvestment = Math.max(0, monthlyNet - monthlyExpenses);

    const savingsRate = availableForInvestment > 0 ? (availableForInvestment / monthlyNet) * 100 : 0;

    const investmentCapacity = {
      monthly401k: Math.min(availableForInvestment * 0.6, 2000), // Up to $2k/month
      monthlyIRA: Math.min(availableForInvestment * 0.3, 500), // Up to $500/month
      monthlyTaxable: Math.max(0, availableForInvestment - 2500),
      totalMonthlyInvestment: availableForInvestment
    };

    // Simplified projections assuming 7% annual return
    const annualInvestment = investmentCapacity.totalMonthlyInvestment * 12;
    const wealthProjection = {
      in5Years: this.calculateCompoundGrowth(annualInvestment, 0.07, 5),
      in10Years: this.calculateCompoundGrowth(annualInvestment, 0.07, 10),
      in20Years: this.calculateCompoundGrowth(annualInvestment, 0.07, 20),
      retirementProjection: this.calculateCompoundGrowth(annualInvestment, 0.07, 30)
    };

    const fireNumber = monthlyExpenses * 12 * 25; // 25x annual expenses
    const yearsToFI = this.calculateYearsToFI(annualInvestment, fireNumber);

    return {
      savingsRate,
      investmentCapacity,
      wealthProjection,
      financialIndependence: {
        fireNumber,
        yearsToFI,
        monthlyInvestmentNeeded: fireNumber / (25 * 12) // Simplified
      }
    };
  }

  private assessFinancialRisk(netIncome: any, costOfLiving: any, job: ExtractedJobData) {
    const monthlyExpenses = costOfLiving.monthlyExpenses.total;
    const monthlySavings = Math.max(0, netIncome.monthly - monthlyExpenses);
    const monthsOfExpenses = monthlySavings > 0 ? (monthlySavings * 6) / monthlyExpenses : 0;

    return {
      jobLossImpact: {
        monthsOfExpenses,
        emergencyFundAdequacy: monthsOfExpenses >= 6 ? 'excellent' :
                              monthsOfExpenses >= 3 ? 'good' :
                              monthsOfExpenses >= 1 ? 'adequate' : 'poor',
        riskLevel: monthsOfExpenses >= 3 ? 'low' :
                  monthsOfExpenses >= 1 ? 'medium' : 'high'
      },
      economicDownturn: {
        resiliency: Math.min(100, monthsOfExpenses * 15),
        adaptabilityScore: 75, // Simplified
        downside_scenarios: ['Job market contraction', 'Industry specific downturns']
      },
      industryRisk: {
        stability: 'medium' as const,
        automation_risk: 30, // Tech roles have moderate automation risk
        growth_outlook: 'positive' as const
      }
    };
  }

  private generateRecommendations(netIncome: any, costOfLiving: any, userContext: any) {
    const monthlyDisposable = netIncome.monthly - costOfLiving.monthlyExpenses.total;

    const immediate = [];
    if (monthlyDisposable < 0) {
      immediate.push({
        category: 'spending' as const,
        action: 'Review and reduce monthly expenses',
        priority: 'high' as const,
        impact: 'Essential for financial stability'
      });
    }

    if (costOfLiving.monthlyExpenses.savings < netIncome.monthly * 0.1) {
      immediate.push({
        category: 'saving' as const,
        action: 'Establish emergency fund with $1000 starter',
        priority: 'high' as const,
        impact: 'Financial security foundation'
      });
    }

    return {
      immediate,
      short_term: [
        'Build 3-6 month emergency fund',
        'Optimize tax withholdings',
        'Research better housing options if over 30% of income'
      ],
      long_term: [
        'Maximize 401k employer match',
        'Consider real estate investment',
        'Develop additional income streams'
      ],
      optimizations: [
        {
          area: 'Housing',
          current: costOfLiving.monthlyExpenses.housing,
          optimized: costOfLiving.monthlyExpenses.housing * 0.9,
          savings: costOfLiving.monthlyExpenses.housing * 0.1,
          difficulty: 'medium' as const
        }
      ]
    };
  }

  // Helper methods
  private determineHousingType(housingCosts: any, monthlyIncome: number): string {
    const housingBudget = monthlyIncome * 0.3;

    if (housingBudget >= housingCosts.rent2BR) return '2BR apartment or house';
    if (housingBudget >= housingCosts.rent1BR) return '1BR apartment';
    return 'Studio or shared housing';
  }

  private determineCarType(monthlyDisposable: number): string {
    if (monthlyDisposable > 1500) return 'New car or luxury vehicle';
    if (monthlyDisposable > 500) return 'Reliable used car';
    if (monthlyDisposable > 0) return 'Budget used car';
    return 'Public transportation or minimal car';
  }

  private determineDiningOut(monthlyDisposable: number): string {
    if (monthlyDisposable > 1000) return 'Regular dining out, nice restaurants';
    if (monthlyDisposable > 500) return 'Occasional dining out';
    if (monthlyDisposable > 0) return 'Budget-friendly restaurants';
    return 'Mostly home cooking';
  }

  private determineHobbies(monthlyDisposable: number): string {
    if (monthlyDisposable > 1000) return 'Multiple hobbies, travel, premium activities';
    if (monthlyDisposable > 500) return 'Regular hobbies and activities';
    if (monthlyDisposable > 0) return 'Budget-conscious hobbies';
    return 'Free or low-cost activities';
  }

  private calculateFinancialGoals(netIncome: any, costOfLiving: any) {
    const monthlyNet = netIncome.monthly;
    const monthlyExpenses = costOfLiving.monthlyExpenses.total;
    const availableForGoals = Math.max(0, monthlyNet - monthlyExpenses);

    return {
      emergencyFund: {
        targetAmount: monthlyExpenses * 6,
        timeToSave: availableForGoals > 0 ? `${Math.ceil((monthlyExpenses * 6) / availableForGoals)} months` : 'Not feasible with current budget',
        monthlyContribution: Math.min(availableForGoals * 0.3, monthlyExpenses * 0.5)
      },
      retirement: {
        recommendedContribution: netIncome.annual * 0.15,
        percentageOfIncome: 15,
        projectedRetirementAge: 65
      },
      majorPurchases: {
        carLoan: {
          maxPrice: monthlyNet * 12, // Annual income rule
          monthlyPayment: monthlyNet * 0.15 // 15% of monthly income
        },
        homePurchase: {
          maxPrice: netIncome.annual * 3, // 3x annual income
          downPayment: netIncome.annual * 0.6, // 20% down payment
          monthlyMortgage: monthlyNet * 0.28 // 28% rule
        }
      }
    };
  }

  private calculateCompoundGrowth(annualContribution: number, rate: number, years: number): number {
    // Formula for future value of annuity
    return annualContribution * (((1 + rate) ** years - 1) / rate);
  }

  private calculateYearsToFI(annualInvestment: number, fireNumber: number): number {
    if (annualInvestment <= 0) return Infinity;

    // Simplified calculation assuming 7% return
    const rate = 0.07;
    return Math.log(1 + (fireNumber * rate) / annualInvestment) / Math.log(1 + rate);
  }

  private calculateConfidenceLevel(job: ExtractedJobData, userContext: any): number {
    let confidence = 70;

    if (job.salaryMin) confidence += 15;
    if (job.location) confidence += 10;
    if (userContext.currentSalary) confidence += 5;

    return Math.min(confidence, 100);
  }

  private getLifestyleRating(savingsPotential: number, costOfLiving: any): string {
    if (savingsPotential > 1500) return 'Excellent';
    if (savingsPotential > 800) return 'Good';
    if (savingsPotential > 300) return 'Moderate';
    if (savingsPotential > 0) return 'Tight';
    return 'Difficult';
  }
}

export const financialImpactCalculator = new FinancialImpactCalculator();