/**
 * Centralized AI Analysis Service
 * Smart, unified approach for all AI-powered components
 * NO FALLBACKS, NO HARDCODED DATA - Only real AI analysis
 */

export type AnalysisType =
  | 'interview_analysis'
  | 'network_analysis'
  | 'insider_intelligence'
  | 'outreach_generation'
  | 'interview_pipeline'
  | 'interview_coaching'
  | 'smart_questions'
  | 'timeline_analysis'
  | 'communication_generation'
  | 'company_intelligence'
  | 'culture_analysis'
  | 'competitive_analysis';

export interface AnalysisResult<T = any> {
  data: T;
  cached: boolean;
  analysisDate: string;
  cacheKey: string;
}

export interface AnalysisOptions {
  forceRefresh?: boolean;
  timeout?: number;
  maxRetries?: number;
}

class CentralizedAIAnalysisService {
  private static instance: CentralizedAIAnalysisService;
  private baseUrl = '/api/ai-analysis';

  static getInstance(): CentralizedAIAnalysisService {
    if (!CentralizedAIAnalysisService.instance) {
      CentralizedAIAnalysisService.instance = new CentralizedAIAnalysisService();
    }
    return CentralizedAIAnalysisService.instance;
  }

  /**
   * Universal AI Analysis Method
   * Handles all analysis types with consistent error handling and caching
   */
  async runAnalysis<T = any>(
    type: AnalysisType,
    jobId: string,
    userId: string,
    token: string,
    additionalData?: Record<string, any>,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult<T>> {
    const { forceRefresh = false, timeout = 30000, maxRetries = 2 } = options;

    try {
      // First check cache if not forcing refresh
      if (!forceRefresh) {
        const cachedResult = await this.checkCache<T>(type, jobId, token);
        if (cachedResult) {
          return cachedResult;
        }
      }

      // Generate fresh analysis
      const result = await this.generateAnalysis<T>(
        type,
        jobId,
        userId,
        token,
        additionalData,
        timeout,
        maxRetries
      );

      return result;

    } catch (error) {
      console.error(`❌ Analysis failed for ${type}:`, error);
      throw new Error(
        error instanceof Error
          ? error.message
          : `Failed to generate ${type} analysis`
      );
    }
  }

  private async checkCache<T>(
    type: AnalysisType,
    jobId: string,
    token: string
  ): Promise<AnalysisResult<T> | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${type}/${jobId}?checkCache=true`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.cached && data.analysis) {
          return {
            data: data.analysis,
            cached: true,
            analysisDate: data.analysis.analysisDate || new Date().toISOString(),
            cacheKey: data.cacheKey || ''
          };
        }
      }
    } catch (error) {
      console.log(`No cached analysis found for ${type}`);
    }

    return null;
  }

  private async generateAnalysis<T>(
    type: AnalysisType,
    jobId: string,
    userId: string,
    token: string,
    additionalData?: Record<string, any>,
    timeout: number = 30000,
    maxRetries: number = 2
  ): Promise<AnalysisResult<T>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 Generating ${type} analysis (attempt ${attempt}/${maxRetries})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(
          `${this.baseUrl}/${type}/${jobId}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId,
              ...additionalData
            }),
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate analysis`);
        }

        const result = await response.json();

        console.log(`✅ ${type} analysis completed successfully`);

        return {
          data: result.analysis,
          cached: false,
          analysisDate: result.analysis?.analysisDate || new Date().toISOString(),
          cacheKey: result.cacheKey || ''
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error occurred');
        console.warn(`⚠️ Attempt ${attempt} failed for ${type}:`, lastError.message);

        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error(`Failed to generate ${type} analysis after ${maxRetries} attempts`);
  }

  /**
   * Safe data access helper - prevents "Cannot read property of undefined" errors
   */
  safeAccess<T>(
    obj: any,
    path: string,
    defaultValue: T
  ): T {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
    }

    return current !== undefined ? current : defaultValue;
  }

  /**
   * Safe array join helper
   */
  safeJoin(array: any, separator: string = ', '): string {
    if (!Array.isArray(array)) {
      return '';
    }
    return array.filter(item => item != null && item !== '').join(separator);
  }

  /**
   * Validates analysis response structure
   */
  validateAnalysisResponse(data: any, requiredFields: string[]): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    return requiredFields.every(field => {
      const value = this.safeAccess(data, field, null);
      return value !== null && value !== undefined;
    });
  }
}

export const centralizedAIAnalysis = CentralizedAIAnalysisService.getInstance();