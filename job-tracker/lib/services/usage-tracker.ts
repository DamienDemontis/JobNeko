import { tierSystem } from './tier-system';
import { performanceTracker } from './performance-tracker';

export interface UsageEvent {
  id: string;
  userId: string;
  feature: string;
  action: string;
  timestamp: Date;
  success: boolean;
  metadata?: {
    tokensUsed?: number;
    responseTime?: number;
    model?: string;
    cost?: number;
    source?: string;
  };
}

export interface FeatureUsageStats {
  feature: string;
  totalUsage: number;
  successfulUsage: number;
  failedUsage: number;
  averageTokens: number;
  averageResponseTime: number;
  totalCost: number;
  lastUsed: Date;
  popularActions: { action: string; count: number }[];
}

export interface UserUsageReport {
  userId: string;
  period: { start: Date; end: Date };
  totalUsage: number;
  totalCost: number;
  tierLimits: { [feature: string]: { used: number; limit: number; remaining: number } };
  topFeatures: FeatureUsageStats[];
  dailyUsage: { date: string; usage: number; cost: number }[];
  recommendations: string[];
}

export interface UsageAlert {
  id: string;
  userId: string;
  type: 'limit_warning' | 'limit_exceeded' | 'cost_threshold' | 'unusual_activity';
  feature: string;
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  acknowledged: boolean;
}

export class UsageTracker {
  private events: UsageEvent[] = [];
  private alerts: UsageAlert[] = [];

  constructor() {
    this.initializeTracking();
  }

  private initializeTracking() {
    // Load persisted data if available
    if (typeof window !== 'undefined') {
      this.loadPersistedData();
    }
  }

  trackUsage(
    userId: string,
    feature: string,
    action: string,
    success: boolean,
    metadata?: {
      tokensUsed?: number;
      responseTime?: number;
      model?: string;
      cost?: number;
      source?: string;
    }
  ): boolean {
    // Check if user can use this feature
    if (!tierSystem.canUseFeature(userId, feature)) {
      this.createAlert(userId, 'limit_exceeded', feature,
        `Usage limit exceeded for ${feature}`,
        this.getFeatureLimit(userId, feature),
        this.getFeatureUsage(userId, feature)
      );
      return false;
    }

    // Record the usage
    const event: UsageEvent = {
      id: this.generateEventId(),
      userId,
      feature,
      action,
      timestamp: new Date(),
      success,
      metadata
    };

    this.events.push(event);

    // Update tier system
    if (success) {
      tierSystem.useFeature(userId, feature);
    }

    // Track performance
    performanceTracker.trackEvent(userId, feature, action, success, metadata || {});

    // Check for alerts
    this.checkUsageAlerts(userId, feature);

    // Persist data
    this.persistData();

    return true;
  }

  trackAIUsage(
    userId: string,
    feature: string,
    model: string,
    tokensUsed: number,
    responseTime: number,
    success: boolean,
    cost?: number
  ): boolean {
    const calculatedCost = cost || this.calculateAICost(model, tokensUsed);

    return this.trackUsage(userId, feature, 'ai_request', success, {
      tokensUsed,
      responseTime,
      model,
      cost: calculatedCost,
      source: 'ai_service'
    });
  }

  getFeatureUsage(userId: string, feature: string, timeframe: 'day' | 'week' | 'month' = 'month'): number {
    const cutoffDate = this.getCutoffDate(timeframe);

    return this.events.filter(event =>
      event.userId === userId &&
      event.feature === feature &&
      event.timestamp >= cutoffDate &&
      event.success
    ).length;
  }

  getFeatureUsageStats(userId: string, feature: string, timeframe: 'day' | 'week' | 'month' = 'month'): FeatureUsageStats {
    const cutoffDate = this.getCutoffDate(timeframe);
    const userEvents = this.events.filter(event =>
      event.userId === userId &&
      event.feature === feature &&
      event.timestamp >= cutoffDate
    );

    const totalUsage = userEvents.length;
    const successfulUsage = userEvents.filter(e => e.success).length;
    const failedUsage = totalUsage - successfulUsage;

    const tokensUsed = userEvents
      .filter(e => e.metadata?.tokensUsed)
      .map(e => e.metadata!.tokensUsed!);

    const responseTimes = userEvents
      .filter(e => e.metadata?.responseTime)
      .map(e => e.metadata!.responseTime!);

    const costs = userEvents
      .filter(e => e.metadata?.cost)
      .map(e => e.metadata!.cost!);

    const actionCounts = new Map<string, number>();
    userEvents.forEach(event => {
      const count = actionCounts.get(event.action) || 0;
      actionCounts.set(event.action, count + 1);
    });

    const lastUsed = userEvents.length > 0
      ? new Date(Math.max(...userEvents.map(e => e.timestamp.getTime())))
      : new Date(0);

    return {
      feature,
      totalUsage,
      successfulUsage,
      failedUsage,
      averageTokens: tokensUsed.length > 0 ? tokensUsed.reduce((sum, tokens) => sum + tokens, 0) / tokensUsed.length : 0,
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0,
      totalCost: costs.reduce((sum, cost) => sum + cost, 0),
      lastUsed,
      popularActions: Array.from(actionCounts.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    };
  }

  getUserUsageReport(userId: string, timeframe: 'week' | 'month' | 'quarter' = 'month'): UserUsageReport {
    const cutoffDate = this.getCutoffDate(timeframe);
    const endDate = new Date();

    const userEvents = this.events.filter(event =>
      event.userId === userId &&
      event.timestamp >= cutoffDate &&
      event.timestamp <= endDate
    );

    const totalUsage = userEvents.length;
    const totalCost = userEvents
      .filter(e => e.metadata?.cost)
      .reduce((sum, e) => sum + e.metadata!.cost!, 0);

    // Get tier limits
    const tierLimits = tierSystem.getUsageLimits(userId);

    // Get top features
    const featureUsage = new Map<string, UsageEvent[]>();
    userEvents.forEach(event => {
      const events = featureUsage.get(event.feature) || [];
      events.push(event);
      featureUsage.set(event.feature, events);
    });

    const topFeatures = Array.from(featureUsage.entries())
      .map(([feature, events]) => this.calculateFeatureStats(feature, events))
      .sort((a, b) => b.totalUsage - a.totalUsage)
      .slice(0, 10);

    // Calculate daily usage
    const dailyUsage = this.calculateDailyUsage(userEvents, cutoffDate, endDate);

    // Generate recommendations
    const recommendations = this.generateUsageRecommendations(userId, topFeatures, tierLimits);

    return {
      userId,
      period: { start: cutoffDate, end: endDate },
      totalUsage,
      totalCost,
      tierLimits,
      topFeatures,
      dailyUsage,
      recommendations
    };
  }

  getUsageAlerts(userId: string, acknowledged: boolean = false): UsageAlert[] {
    return this.alerts.filter(alert =>
      alert.userId === userId &&
      alert.acknowledged === acknowledged
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.persistData();
      return true;
    }
    return false;
  }

  createUsageForecast(userId: string, days: number = 30): { feature: string; predictedUsage: number; predictedCost: number }[] {
    const historicalData = this.getUserUsageReport(userId, 'month');
    const dailyAverage = historicalData.totalUsage / 30;

    return historicalData.topFeatures.map(feature => ({
      feature: feature.feature,
      predictedUsage: Math.round(dailyAverage * days * (feature.totalUsage / historicalData.totalUsage)),
      predictedCost: (feature.totalCost / 30) * days
    }));
  }

  optimizeUsage(userId: string): { recommendations: string[]; potentialSavings: number } {
    const report = this.getUserUsageReport(userId, 'month');
    const recommendations: string[] = [];
    let potentialSavings = 0;

    // Analyze usage patterns
    report.topFeatures.forEach(feature => {
      if (feature.failedUsage > feature.successfulUsage * 0.2) {
        recommendations.push(`High failure rate for ${feature.feature}. Consider reviewing usage patterns.`);
      }

      if (feature.averageResponseTime > 5000) {
        recommendations.push(`Slow response times for ${feature.feature}. Consider optimizing queries.`);
      }

      if (feature.totalCost > 10 && feature.totalUsage < 10) {
        recommendations.push(`High cost per usage for ${feature.feature}. Consider batching requests.`);
        potentialSavings += feature.totalCost * 0.3; // 30% potential savings
      }
    });

    // Check tier optimization
    const currentTier = tierSystem.getUserTier(userId);
    const limits = tierSystem.getUsageLimits(userId);

    const underutilized = Object.entries(limits).filter(([feature, limit]) => {
      return limit.remaining > limit.limit * 0.5;
    });

    if (underutilized.length > 2) {
      recommendations.push('Consider downgrading your tier - you have significant unused capacity.');
    }

    return { recommendations, potentialSavings };
  }

  exportUsageData(userId: string, format: 'json' | 'csv' = 'json'): string {
    const report = this.getUserUsageReport(userId, 'quarter');
    const userEvents = this.events.filter(e => e.userId === userId);

    const data = {
      summary: report,
      events: userEvents,
      alerts: this.getUsageAlerts(userId),
      forecast: this.createUsageForecast(userId),
      optimization: this.optimizeUsage(userId)
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  private checkUsageAlerts(userId: string, feature: string): void {
    const usage = this.getFeatureUsage(userId, feature);
    const limit = this.getFeatureLimit(userId, feature);

    if (limit > 0) {
      const percentage = (usage / limit) * 100;

      // Warning at 80%
      if (percentage >= 80 && percentage < 100) {
        this.createAlert(userId, 'limit_warning', feature,
          `Approaching usage limit for ${feature} (${percentage.toFixed(1)}%)`,
          limit, usage
        );
      }
    }

    // Check cost thresholds
    const monthlyCost = this.getFeatureCost(userId, feature, 'month');
    if (monthlyCost > 50) { // $50 threshold
      this.createAlert(userId, 'cost_threshold', feature,
        `High monthly cost for ${feature}: $${monthlyCost.toFixed(2)}`,
        50, monthlyCost
      );
    }
  }

  private createAlert(userId: string, type: UsageAlert['type'], feature: string, message: string, threshold: number, currentValue: number): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(alert =>
      alert.userId === userId &&
      alert.type === type &&
      alert.feature === feature &&
      !alert.acknowledged &&
      Date.now() - alert.timestamp.getTime() < 24 * 60 * 60 * 1000 // Within 24 hours
    );

    if (existingAlert) return;

    const alert: UsageAlert = {
      id: this.generateAlertId(),
      userId,
      type,
      feature,
      message,
      threshold,
      currentValue,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.push(alert);
  }

  private getFeatureLimit(userId: string, feature: string): number {
    const limits = tierSystem.getUsageLimits(userId);
    return limits[feature]?.limit || 0;
  }

  private getFeatureCost(userId: string, feature: string, timeframe: 'day' | 'week' | 'month'): number {
    const cutoffDate = this.getCutoffDate(timeframe);

    return this.events
      .filter(event =>
        event.userId === userId &&
        event.feature === feature &&
        event.timestamp >= cutoffDate &&
        event.metadata?.cost
      )
      .reduce((sum, event) => sum + (event.metadata?.cost || 0), 0);
  }

  private calculateAICost(model: string, tokens: number): number {
    // Simplified cost calculation
    const costs = {
      'gpt-4': 0.00003,
      'gpt-3.5-turbo': 0.000002,
      'claude-3': 0.000015,
      'local': 0
    };

    const costPerToken = costs[model as keyof typeof costs] || 0.000002;
    return tokens * costPerToken;
  }

  private getCutoffDate(timeframe: 'day' | 'week' | 'month' | 'quarter'): Date {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateFeatureStats(feature: string, events: UsageEvent[]): FeatureUsageStats {
    const totalUsage = events.length;
    const successfulUsage = events.filter(e => e.success).length;
    const failedUsage = totalUsage - successfulUsage;

    const tokensUsed = events
      .filter(e => e.metadata?.tokensUsed)
      .map(e => e.metadata!.tokensUsed!);

    const responseTimes = events
      .filter(e => e.metadata?.responseTime)
      .map(e => e.metadata!.responseTime!);

    const costs = events
      .filter(e => e.metadata?.cost)
      .map(e => e.metadata!.cost!);

    const actionCounts = new Map<string, number>();
    events.forEach(event => {
      const count = actionCounts.get(event.action) || 0;
      actionCounts.set(event.action, count + 1);
    });

    const lastUsed = events.length > 0
      ? new Date(Math.max(...events.map(e => e.timestamp.getTime())))
      : new Date(0);

    return {
      feature,
      totalUsage,
      successfulUsage,
      failedUsage,
      averageTokens: tokensUsed.length > 0 ? tokensUsed.reduce((sum, tokens) => sum + tokens, 0) / tokensUsed.length : 0,
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0,
      totalCost: costs.reduce((sum, cost) => sum + cost, 0),
      lastUsed,
      popularActions: Array.from(actionCounts.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    };
  }

  private calculateDailyUsage(events: UsageEvent[], startDate: Date, endDate: Date): { date: string; usage: number; cost: number }[] {
    const dailyMap = new Map<string, { usage: number; cost: number }>();

    // Initialize all days in range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dailyMap.set(dateKey, { usage: 0, cost: 0 });
    }

    // Aggregate events by day
    events.forEach(event => {
      const dateKey = event.timestamp.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { usage: 0, cost: 0 };
      existing.usage++;
      existing.cost += event.metadata?.cost || 0;
      dailyMap.set(dateKey, existing);
    });

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private generateUsageRecommendations(
    userId: string,
    topFeatures: FeatureUsageStats[],
    tierLimits: { [feature: string]: { used: number; limit: number; remaining: number } }
  ): string[] {
    const recommendations: string[] = [];

    // Check for underutilized features
    const underutilized = Object.entries(tierLimits).filter(([feature, limit]) => {
      return limit.used < limit.limit * 0.3 && limit.limit > 0;
    });

    if (underutilized.length > 0) {
      recommendations.push(`You're underutilizing: ${underutilized.map(([f]) => f).join(', ')}. Consider exploring these features.`);
    }

    // Check for high-cost features
    const highCostFeatures = topFeatures.filter(f => f.totalCost > f.totalUsage * 0.1);
    if (highCostFeatures.length > 0) {
      recommendations.push(`High cost per usage: ${highCostFeatures.map(f => f.feature).join(', ')}. Consider optimizing usage.`);
    }

    // Check for failed usage patterns
    const highFailureFeatures = topFeatures.filter(f => f.failedUsage > f.successfulUsage * 0.3);
    if (highFailureFeatures.length > 0) {
      recommendations.push(`High failure rates: ${highFailureFeatures.map(f => f.feature).join(', ')}. Review your usage patterns.`);
    }

    return recommendations;
  }

  private generateEventId(): string {
    return `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadPersistedData(): void {
    try {
      const eventsData = localStorage.getItem('usageEvents');
      const alertsData = localStorage.getItem('usageAlerts');

      if (eventsData) {
        this.events = JSON.parse(eventsData).map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));
      }

      if (alertsData) {
        this.alerts = JSON.parse(alertsData).map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load persisted usage data:', error);
    }
  }

  private persistData(): void {
    try {
      // Keep only last 10000 events to prevent storage bloat
      if (this.events.length > 10000) {
        this.events = this.events.slice(-10000);
      }

      // Keep only last 1000 alerts
      if (this.alerts.length > 1000) {
        this.alerts = this.alerts.slice(-1000);
      }

      localStorage.setItem('usageEvents', JSON.stringify(this.events));
      localStorage.setItem('usageAlerts', JSON.stringify(this.alerts));
    } catch (error) {
      console.warn('Failed to persist usage data:', error);
    }
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion for events
    const events = data.events.map((event: UsageEvent) => [
      event.timestamp.toISOString(),
      event.feature,
      event.action,
      event.success,
      event.metadata?.tokensUsed || '',
      event.metadata?.cost || '',
      event.metadata?.model || ''
    ]);

    const headers = ['Timestamp', 'Feature', 'Action', 'Success', 'Tokens', 'Cost', 'Model'];
    return [headers, ...events].map(row => row.join(',')).join('\n');
  }
}

// Global instance
export const usageTracker = new UsageTracker();