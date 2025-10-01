import { unifiedAI } from './unified-ai-service';
import { worldBankApi } from './world-bank-api';
import { webScraper } from './web-scraper';
import type { CityData } from '@prisma/client';

interface AIEnhancedCityData extends CityData {
  confidence: number;
  dataSources: string[];
  aiProcessed: boolean;
  estimationMethod?: string;
}

interface LocationContext {
  city: string;
  country: string;
  state?: string;
  isRemote: boolean;
  userLocation?: string;
}

interface GapFillingResult {
  data: AIEnhancedCityData;
  confidence: number;
  method: string;
  sources: string[];
}

export class AIDataProcessor {
  private static instance: AIDataProcessor;

  private constructor() {}

  static getInstance(): AIDataProcessor {
    if (!AIDataProcessor.instance) {
      AIDataProcessor.instance = new AIDataProcessor();
    }
    return AIDataProcessor.instance;
  }

  /**
   * Main method to get comprehensive city data using AI enhancement
   */
  async getEnhancedCityData(location: LocationContext): Promise<AIEnhancedCityData | null> {
    try {
      console.log(`🤖 AI processing data for ${location.city}, ${location.country}`);

      // Step 1: Try direct city data (web scraping)
      let cityData = await webScraper.getCityData(location.city, location.country, location.state);
      const dataSources: string[] = [];
      let confidence = 0;

      if (cityData) {
        dataSources.push('web_scraped');
        confidence = 0.8;
        console.log(`✅ Found direct city data for ${location.city}`);
      } else {
        console.log(`❌ No direct city data found for ${location.city}, using AI enhancement`);
      }

      // Step 2: Get country-level PPP data as baseline
      const countryPPP = await worldBankApi.getPPPData(location.country);
      if (countryPPP) {
        dataSources.push('world_bank_ppp');
        console.log(`📊 PPP data for ${location.country}: ${countryPPP.costOfLivingIndex}% of US costs`);
      }

      // Step 3: AI-enhanced gap filling
      const gapFillingResult = await this.aiGapFilling({
        city: location.city,
        country: location.country,
        state: location.state,
        existingCityData: cityData,
        countryPPP: countryPPP,
        isRemote: location.isRemote,
        userLocation: location.userLocation
      });

      if (gapFillingResult) {
        cityData = gapFillingResult.data;
        confidence = Math.max(confidence, gapFillingResult.confidence);
        dataSources.push(...gapFillingResult.sources);
      }

      // Step 4: AI validation and cross-checking
      if (cityData) {
        const validatedData = await this.aiValidateData(cityData, countryPPP);
        return {
          ...validatedData,
          confidence: Math.min(confidence, validatedData.confidence),
          dataSources,
          aiProcessed: true
        };
      }

      console.error(`❌ Could not generate data for ${location.city}, ${location.country}`);
      return null;
    } catch (error) {
      console.error('Error in AI data processing:', error);
      return null;
    }
  }

  /**
   * AI-powered gap filling using existing AI service
   */
  private async aiGapFilling(params: {
    city: string;
    country: string;
    state?: string;
    existingCityData: CityData | null;
    countryPPP: any;
    isRemote: boolean;
    userLocation?: string;
  }): Promise<GapFillingResult | null> {
    try {
      const prompt = this.buildGapFillingPrompt(params);
      
      console.log(`🧠 AI gap filling for ${params.city}, ${params.country}`);

      const aiResponse = await unifiedAI.process({
      operation: 'general_completion',
      content: prompt
    });
      if (!aiResponse.success) {
        console.warn('No AI response for gap filling');
        return null;
      }

      // Parse AI response
      const parsedData = this.parseAIGapFillingResponse((typeof aiResponse.data === 'string' ? aiResponse.data : JSON.stringify(aiResponse.data)), params);
      
      if (parsedData) {
        console.log(`✅ AI successfully filled gaps for ${params.city}`);
        return parsedData;
      }

      return null;
    } catch (error) {
      console.error('Error in AI gap filling:', error);
      return null;
    }
  }

  /**
   * Build comprehensive prompt for AI gap filling
   */
  private buildGapFillingPrompt(params: any): string {
    const { city, country, state, existingCityData, countryPPP, isRemote, userLocation } = params;

    let prompt = `You are a cost-of-living analyst. Generate accurate cost-of-living data for ${city}, ${country}${state ? `, ${state}` : ''}.

CONTEXT:
- City: ${city}
- Country: ${country}
- State/Region: ${state || 'N/A'}
- Is Remote Job: ${isRemote}
- User Location: ${userLocation || 'N/A'}

EXISTING DATA:`;

    if (existingCityData) {
      prompt += `
- Direct city data available: YES
- Cost of Living Index: ${existingCityData.costOfLivingIndex}
- Rent Index: ${existingCityData.rentIndex}
- Source: ${existingCityData.source}`;
    } else {
      prompt += `
- Direct city data available: NO`;
    }

    if (countryPPP) {
      prompt += `
- Country PPP Data: Available
- ${country} Cost Index: ${countryPPP.costOfLivingIndex}% of US costs
- PPP Factor: ${countryPPP.pppConversionFactor}
- GDP per capita: $${countryPPP.gdpPerCapitaPPP?.toLocaleString() || 'N/A'}`;
    } else {
      prompt += `
- Country PPP Data: Not available`;
    }

    prompt += `

TASK: Generate missing cost-of-living data using intelligent estimation.

GUIDELINES:
1. Use existing city data if available, otherwise estimate from country PPP data
2. For smaller cities, apply 10-20% discount vs major cities in same country
3. For remote jobs, consider user's actual location
4. Be realistic about regional variations
5. Consider economic development level of the area

OUTPUT FORMAT (JSON):
{
  "costOfLivingIndex": number (NYC = 100 baseline),
  "rentIndex": number,
  "groceriesIndex": number,
  "restaurantIndex": number,
  "transportIndex": number,
  "utilitiesIndex": number,
  "qualityOfLifeIndex": number (0-100),
  "safetyIndex": number (0-100),
  "healthcareIndex": number (0-100),
  "educationIndex": number (0-100),
  "avgNetSalaryUSD": number (annual),
  "confidence": number (0.0-1.0),
  "estimationMethod": "description of method used",
  "reasoning": "brief explanation of estimates"
}

Generate realistic data based on known economic patterns:`;

    return prompt;
  }

  /**
   * Parse AI response for gap filling
   */
  private parseAIGapFillingResponse(response: string, params: any): GapFillingResult | null {
    try {
      // Extract JSON from AI response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in AI response');
        return null;
      }

      const aiData = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (typeof aiData.costOfLivingIndex !== 'number' || aiData.costOfLivingIndex <= 0) {
        console.error('Invalid cost of living index from AI');
        return null;
      }

      // Create enhanced city data
      const enhancedData: AIEnhancedCityData = {
        id: `ai_${params.city}_${params.country}`.toLowerCase().replace(/\s+/g, '_'),
        city: params.city,
        country: params.country,
        state: params.state || null,
        costOfLivingIndex: Math.round(aiData.costOfLivingIndex * 100) / 100,
        rentIndex: aiData.rentIndex || aiData.costOfLivingIndex * 0.8,
        groceriesIndex: aiData.groceriesIndex || aiData.costOfLivingIndex * 0.9,
        restaurantIndex: aiData.restaurantIndex || aiData.costOfLivingIndex * 1.1,
        transportIndex: aiData.transportIndex || aiData.costOfLivingIndex * 0.8,
        utilitiesIndex: aiData.utilitiesIndex || aiData.costOfLivingIndex * 0.9,
        qualityOfLifeIndex: aiData.qualityOfLifeIndex || 70,
        safetyIndex: aiData.safetyIndex || 70,
        healthcareIndex: aiData.healthcareIndex || 70,
        educationIndex: aiData.educationIndex || 70,
        trafficTimeIndex: null,
        pollutionIndex: null,
        climateIndex: null,
        avgNetSalaryUSD: aiData.avgNetSalaryUSD || null,
        medianHousePriceUSD: null,
        incomeTaxRate: null,
        salesTaxRate: null,
        population: null,
        lastUpdated: new Date(),
        source: 'ai_enhanced',
        dataPoints: null,
        confidence: aiData.confidence || 0.6,
        dataSources: ['ai_estimation'],
        aiProcessed: true,
        estimationMethod: aiData.estimationMethod || 'AI gap filling'
      };

      return {
        data: enhancedData,
        confidence: aiData.confidence || 0.6,
        method: aiData.estimationMethod || 'AI gap filling',
        sources: ['ai_estimation']
      };
    } catch (error) {
      console.error('Error parsing AI gap filling response:', error);
      return null;
    }
  }

  /**
   * AI validation of data quality and consistency
   */
  private async aiValidateData(cityData: CityData, countryPPP?: any): Promise<AIEnhancedCityData> {
    try {
      const validationPrompt = `Validate this cost-of-living data for consistency and realism:

CITY DATA:
- City: ${cityData.city}, ${cityData.country}
- Cost of Living Index: ${cityData.costOfLivingIndex}
- Rent Index: ${cityData.rentIndex}
- Groceries: ${cityData.groceriesIndex}
- Restaurant: ${cityData.restaurantIndex}
- Source: ${cityData.source}

${countryPPP ? `
COUNTRY BASELINE:
- Country PPP Index: ${countryPPP.costOfLivingIndex}% of US costs
- GDP per capita: $${countryPPP.gdpPerCapitaPPP?.toLocaleString()}
` : ''}

Check for:
1. Reasonable values (e.g., cost index 10-300)
2. Consistent relationships (rent usually 70-120% of cost index)
3. Country alignment (city shouldn't be wildly off from country PPP)
4. Obvious errors or outliers

OUTPUT: Confidence score (0.0-1.0) and any corrections needed.

Response format: {"confidence": 0.8, "corrections": {"rentIndex": 85}, "reasoning": "explanation"}`;

      const validationResponse = await unifiedAI.complete(validationPrompt, 'gpt-5-mini', 'medium');
      if (validationResponse?.success && validationResponse.data) {
        const jsonMatch = (typeof validationResponse.data === 'string' ? validationResponse.data : JSON.stringify(validationResponse.data)).match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const validation = JSON.parse(jsonMatch[0]);
          
          // Apply corrections if needed
          const correctedData = { ...cityData };
          if (validation.corrections) {
            Object.assign(correctedData, validation.corrections);
          }

          return {
            ...correctedData,
            confidence: validation.confidence || 0.7,
            dataSources: [],
            aiProcessed: true
          } as AIEnhancedCityData;
        }
      }
    } catch (error) {
      console.warn('AI validation failed, using original data:', error);
    }

    // Return original data with default confidence
    return {
      ...cityData,
      confidence: 0.7,
      dataSources: [],
      aiProcessed: true
    } as AIEnhancedCityData;
  }

  /**
   * AI-powered location resolution for vague job locations
   */
  async resolveJobLocation(jobLocation: string, userLocation?: string): Promise<LocationContext | null> {
    try {
      const prompt = `Resolve this job location to specific city and country:

JOB LOCATION: "${jobLocation}"
USER LOCATION: "${userLocation || 'Unknown'}"

Common patterns:
- "Remote" + user location → use user's city
- "Europe" → major European city or user's city if in Europe
- "San Francisco Bay Area" → San Francisco, United States
- "NYC" → New York, United States
- "London, UK" → London, United Kingdom

OUTPUT (JSON): {"city": "CityName", "country": "CountryName", "state": "State/Region", "isRemote": boolean, "confidence": 0.0-1.0}`;

      const response = await unifiedAI.complete(prompt, 'gpt-5-mini', 'medium');
      if (response?.success && response.data) {
        const jsonMatch = (typeof response.data === 'string' ? response.data : JSON.stringify(response.data)).match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const resolved = JSON.parse(jsonMatch[0]);
          return {
            city: resolved.city,
            country: resolved.country,
            state: resolved.state,
            isRemote: resolved.isRemote || false,
            userLocation
          };
        }
      }
    } catch (error) {
      console.error('AI location resolution failed:', error);
    }

    return null;
  }

  /**
   * Calculate region-appropriate comfort thresholds using AI
   */
  async calculateRegionalThresholds(cityData: AIEnhancedCityData): Promise<{
    struggling: number;
    tight: number;
    comfortable: number;
    thriving: number;
    luxurious: number;
  }> {
    try {
      const prompt = `Calculate realistic salary comfort thresholds for ${cityData.city}, ${cityData.country}:

CONTEXT:
- Cost of Living Index: ${cityData.costOfLivingIndex} (NYC = 100)
- Average local salary: $${cityData.avgNetSalaryUSD?.toLocaleString() || 'Unknown'}
- Country economic level: ${this.getEconomicLevel(cityData.costOfLivingIndex)}

Calculate 5 salary thresholds in USD (annual):
- Struggling: Below basic needs
- Tight: Basic needs met, little savings
- Comfortable: Good lifestyle, some savings
- Thriving: Very comfortable, substantial savings
- Luxurious: High-end lifestyle

Consider local cost of living, not US standards.

OUTPUT (JSON): {"struggling": 30000, "tight": 45000, "comfortable": 75000, "thriving": 120000, "luxurious": 180000}`;

      const response = await unifiedAI.complete(prompt, 'gpt-5-mini', 'medium');
      if (response?.success && response.data) {
        const jsonMatch = (typeof response.data === 'string' ? response.data : JSON.stringify(response.data)).match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const thresholds = JSON.parse(jsonMatch[0]);
          return thresholds;
        }
      }
    } catch (error) {
      console.error('AI threshold calculation failed:', error);
    }

    // Fallback to cost-adjusted US thresholds
    const adjustmentFactor = cityData.costOfLivingIndex / 100;
    return {
      struggling: Math.round(35000 * adjustmentFactor),
      tight: Math.round(55000 * adjustmentFactor),
      comfortable: Math.round(90000 * adjustmentFactor),
      thriving: Math.round(140000 * adjustmentFactor),
      luxurious: Math.round(200000 * adjustmentFactor)
    };
  }

  /**
   * Determine economic development level
   */
  private getEconomicLevel(costIndex: number): string {
    if (costIndex > 120) return 'High-income developed';
    if (costIndex > 80) return 'Upper-middle income';
    if (costIndex > 40) return 'Middle income';
    if (costIndex > 20) return 'Lower-middle income';
    return 'Low income';
  }
}

export const aiDataProcessor = AIDataProcessor.getInstance();