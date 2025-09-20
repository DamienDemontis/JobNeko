export interface PerformanceEvent {
  id: string;
  userId: string;
  feature: string;
  action: string;
  timestamp: Date;
  duration?: number;
  success: boolean;
  metadata?: Record<string, any>;
  sessionId: string;
}

export interface FeatureUsage {
  feature: string;
  totalUsage: number;
  successRate: number;
  averageDuration: number;
  popularActions: { action: string; count: number }[];
  lastUsed: Date;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  features: string[];
  totalActions: number;
  successful: boolean;
}

export interface PerformanceMetrics {
  responseTime: number;
  successRate: number;
  userEngagement: number;
  featureAdoption: number;
  errorRate: number;
}

export class PerformanceTracker {
  private events: PerformanceEvent[] = [];
  private sessions: Map<string, UserSession> = new Map();
  private currentSessionId: string | null = null;

  constructor() {
    this.initializeTracking();
  }

  private initializeTracking() {
    // Initialize performance tracking
    if (typeof window !== 'undefined') {
      this.currentSessionId = this.generateSessionId();
      this.trackPageLoad();
      this.setupBeforeUnloadHandler();
    }
  }

  startSession(userId: string): string {
    const sessionId = this.generateSessionId();

    const session: UserSession = {
      sessionId,
      userId,
      startTime: new Date(),
      features: [],
      totalActions: 0,
      successful: true
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;

    this.trackEvent(userId, 'session', 'start', true, {}, sessionId);

    return sessionId;
  }

  endSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = new Date();
      this.trackEvent(session.userId, 'session', 'end', true, {
        duration: session.endTime.getTime() - session.startTime.getTime(),
        totalActions: session.totalActions,
        featuresUsed: session.features.length
      }, sessionId);
    }
  }

  trackEvent(
    userId: string,
    feature: string,
    action: string,
    success: boolean,
    metadata: Record<string, any> = {},
    sessionId?: string
  ): void {
    const event: PerformanceEvent = {
      id: this.generateEventId(),
      userId,
      feature,
      action,
      timestamp: new Date(),
      success,
      metadata,
      sessionId: sessionId || this.currentSessionId || this.generateSessionId()
    };

    this.events.push(event);

    // Update session
    const session = this.sessions.get(event.sessionId);
    if (session) {
      if (!session.features.includes(feature)) {
        session.features.push(feature);
      }
      session.totalActions++;
      if (!success) {
        session.successful = false;
      }
    }

    // Store in localStorage for persistence
    this.persistEvent(event);
  }

  trackFeatureUsage(
    userId: string,
    feature: string,
    action: string,
    startTime: Date,
    success: boolean,
    metadata: Record<string, any> = {}
  ): void {
    const duration = Date.now() - startTime.getTime();

    this.trackEvent(userId, feature, action, success, {
      ...metadata,
      duration
    });
  }

  trackError(
    userId: string,
    feature: string,
    error: Error,
    context: Record<string, any> = {}
  ): void {
    this.trackEvent(userId, feature, 'error', false, {
      errorMessage: error.message,
      errorStack: error.stack,
      ...context
    });
  }

  trackAIUsage(
    userId: string,
    feature: string,
    modelUsed: string,
    tokensUsed: number,
    responseTime: number,
    success: boolean
  ): void {
    this.trackEvent(userId, feature, 'ai_request', success, {
      modelUsed,
      tokensUsed,
      responseTime,
      costEstimate: this.calculateCost(modelUsed, tokensUsed)
    });
  }

  getFeatureUsage(userId: string, timeframe: 'day' | 'week' | 'month' = 'week'): FeatureUsage[] {
    const cutoffDate = this.getCutoffDate(timeframe);
    const userEvents = this.events.filter(
      event => event.userId === userId && event.timestamp >= cutoffDate
    );

    interface FeatureData {
      totalUsage: number;
      successCount: number;
      durations: number[];
      actions: Map<string, number>;
      lastUsed: Date;
    }

    const featureMap = new Map<string, FeatureData>();

    userEvents.forEach(event => {
      const existing = featureMap.get(event.feature) || {
        totalUsage: 0,
        successCount: 0,
        durations: [] as number[],
        actions: new Map<string, number>(),
        lastUsed: event.timestamp
      };

      existing.totalUsage++;
      if (event.success) existing.successCount++;
      if (event.duration) existing.durations.push(event.duration);

      const actionCount = existing.actions.get(event.action) || 0;
      existing.actions.set(event.action, actionCount + 1);

      if (event.timestamp > existing.lastUsed) {
        existing.lastUsed = event.timestamp;
      }

      featureMap.set(event.feature, existing);
    });

    return Array.from(featureMap.entries()).map(([feature, data]) => ({
      feature,
      totalUsage: data.totalUsage,
      successRate: data.totalUsage > 0 ? (data.successCount / data.totalUsage) * 100 : 0,
      averageDuration: data.durations.length > 0
        ? data.durations.reduce((sum, duration) => sum + duration, 0) / data.durations.length
        : 0,
      popularActions: Array.from(data.actions.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      lastUsed: data.lastUsed
    }));
  }

  getPerformanceMetrics(userId: string, timeframe: 'day' | 'week' | 'month' = 'week'): PerformanceMetrics {
    const cutoffDate = this.getCutoffDate(timeframe);
    const userEvents = this.events.filter(
      event => event.userId === userId && event.timestamp >= cutoffDate
    );

    if (userEvents.length === 0) {
      return {
        responseTime: 0,
        successRate: 0,
        userEngagement: 0,
        featureAdoption: 0,
        errorRate: 0
      };
    }

    const totalEvents = userEvents.length;
    const successfulEvents = userEvents.filter(event => event.success).length;
    const errorEvents = userEvents.filter(event => event.action === 'error').length;

    const durations = userEvents
      .filter(event => event.duration)
      .map(event => event.duration!);

    const averageResponseTime = durations.length > 0
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
      : 0;

    const uniqueFeatures = new Set(userEvents.map(event => event.feature)).size;
    const totalFeatures = this.getTotalFeatureCount();

    const userSessions = Array.from(this.sessions.values())
      .filter(session => session.userId === userId && session.startTime >= cutoffDate);

    const averageSessionActions = userSessions.length > 0
      ? userSessions.reduce((sum, session) => sum + session.totalActions, 0) / userSessions.length
      : 0;

    return {
      responseTime: averageResponseTime,
      successRate: (successfulEvents / totalEvents) * 100,
      userEngagement: Math.min(100, averageSessionActions * 10), // Scale to 0-100
      featureAdoption: (uniqueFeatures / totalFeatures) * 100,
      errorRate: (errorEvents / totalEvents) * 100
    };
  }

  getUserJourney(userId: string, sessionId?: string): PerformanceEvent[] {
    let events = this.events.filter(event => event.userId === userId);

    if (sessionId) {
      events = events.filter(event => event.sessionId === sessionId);
    }

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getPopularFeatures(timeframe: 'day' | 'week' | 'month' = 'week'): { feature: string; usage: number }[] {
    const cutoffDate = this.getCutoffDate(timeframe);
    const recentEvents = this.events.filter(event => event.timestamp >= cutoffDate);

    const featureUsage = new Map<string, number>();

    recentEvents.forEach(event => {
      const count = featureUsage.get(event.feature) || 0;
      featureUsage.set(event.feature, count + 1);
    });

    return Array.from(featureUsage.entries())
      .map(([feature, usage]) => ({ feature, usage }))
      .sort((a, b) => b.usage - a.usage);
  }

  async exportData(userId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const userEvents = this.events.filter(event => event.userId === userId);
    const userSessions = Array.from(this.sessions.values()).filter(session => session.userId === userId);

    const data = {
      events: userEvents,
      sessions: userSessions,
      summary: this.getPerformanceMetrics(userId, 'month'),
      featureUsage: this.getFeatureUsage(userId, 'month')
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCutoffDate(timeframe: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateCost(model: string, tokens: number): number {
    // Simplified cost calculation - in production, use actual pricing
    const costPerToken = model.includes('gpt-4') ? 0.00003 : 0.000002;
    return tokens * costPerToken;
  }

  private getTotalFeatureCount(): number {
    // Return total number of features in the system
    return 15; // Based on our implemented features
  }

  private trackPageLoad(): void {
    if (typeof window !== 'undefined' && window.performance) {
      const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;

      // Track page load performance
      setTimeout(() => {
        this.trackEvent('anonymous', 'page', 'load', true, {
          loadTime,
          url: window.location.pathname
        });
      }, 100);
    }
  }

  private setupBeforeUnloadHandler(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.currentSessionId) {
          this.endSession(this.currentSessionId);
        }
      });
    }
  }

  private persistEvent(event: PerformanceEvent): void {
    if (typeof window !== 'undefined') {
      try {
        const storedEvents = localStorage.getItem('performanceEvents');
        const events = storedEvents ? JSON.parse(storedEvents) : [];
        events.push(event);

        // Keep only last 1000 events to prevent storage bloat
        if (events.length > 1000) {
          events.splice(0, events.length - 1000);
        }

        localStorage.setItem('performanceEvents', JSON.stringify(events));
      } catch (error) {
        console.warn('Failed to persist performance event:', error);
      }
    }
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion - in production, use a proper CSV library
    const events = data.events.map((event: PerformanceEvent) => [
      event.timestamp.toISOString(),
      event.feature,
      event.action,
      event.success,
      event.duration || '',
      JSON.stringify(event.metadata)
    ]);

    const headers = ['Timestamp', 'Feature', 'Action', 'Success', 'Duration', 'Metadata'];
    const csvContent = [headers, ...events].map(row => row.join(',')).join('\n');

    return csvContent;
  }
}

// Global instance
export const performanceTracker = new PerformanceTracker();