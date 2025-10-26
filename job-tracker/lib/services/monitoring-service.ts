export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    load: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
}

export interface ApplicationMetrics {
  timestamp: Date;
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  database: {
    connections: number;
    queries: number;
    slowQueries: number;
    averageQueryTime: number;
  };
  ai: {
    requests: number;
    tokens: number;
    cost: number;
    averageResponseTime: number;
    errors: number;
  };
  users: {
    active: number;
    total: number;
    signups: number;
    churn: number;
  };
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'auto_scale' | 'restart';
  config: Record<string, any>;
  triggered: boolean;
  triggeredAt?: Date;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: Date;
  message?: string;
  details?: Record<string, any>;
}

export interface MonitoringConfig {
  metrics: {
    interval: number; // seconds
    retention: number; // days
  };
  alerts: {
    enabled: boolean;
    thresholds: {
      cpu: number;
      memory: number;
      disk: number;
      responseTime: number;
      errorRate: number;
    };
  };
  healthChecks: {
    interval: number; // seconds
    timeout: number; // seconds
    services: string[];
  };
}

export class MonitoringService {
  private systemMetrics: SystemMetrics[] = [];
  private applicationMetrics: ApplicationMetrics[] = [];
  private alerts: Alert[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();
  private config: MonitoringConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private healthCheckIntervalId: NodeJS.Timeout | null = null;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      metrics: {
        interval: 60, // 1 minute
        retention: 30 // 30 days
      },
      alerts: {
        enabled: true,
        thresholds: {
          cpu: 80,
          memory: 85,
          disk: 90,
          responseTime: 5000,
          errorRate: 10
        }
      },
      healthChecks: {
        interval: 30, // 30 seconds
        timeout: 5000, // 5 seconds
        services: ['database', 'ai_service', 'redis', 'storage']
      },
      ...config
    };

    this.initialize();
  }

  private initialize() {
    this.startMetricsCollection();
    this.startHealthChecks();
    this.loadPersistedData();
  }

  // Metrics Collection
  private startMetricsCollection() {
    this.intervalId = setInterval(async () => {
      await this.collectSystemMetrics();
      await this.collectApplicationMetrics();
      this.checkAlerts();
      this.cleanupOldMetrics();
    }, this.config.metrics.interval * 1000);
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      // In production, this would use actual system monitoring APIs
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        cpu: {
          usage: Math.random() * 100,
          load: [Math.random() * 2, Math.random() * 2, Math.random() * 2]
        },
        memory: {
          used: Math.random() * 8000000000, // 8GB
          total: 8000000000,
          percentage: Math.random() * 100
        },
        disk: {
          used: Math.random() * 500000000000, // 500GB
          total: 1000000000000, // 1TB
          percentage: Math.random() * 100
        },
        network: {
          bytesIn: Math.random() * 1000000,
          bytesOut: Math.random() * 1000000,
          packetsIn: Math.random() * 10000,
          packetsOut: Math.random() * 10000
        }
      };

      this.systemMetrics.push(metrics);
    } catch (error) {
      console.error('Failed to collect system metrics:', error);
    }
  }

  private async collectApplicationMetrics(): Promise<void> {
    try {
      // In production, this would aggregate from various sources
      const metrics: ApplicationMetrics = {
        timestamp: new Date(),
        requests: {
          total: Math.floor(Math.random() * 1000),
          successful: Math.floor(Math.random() * 950),
          failed: Math.floor(Math.random() * 50),
          averageResponseTime: Math.random() * 2000
        },
        database: {
          connections: Math.floor(Math.random() * 100),
          queries: Math.floor(Math.random() * 5000),
          slowQueries: Math.floor(Math.random() * 10),
          averageQueryTime: Math.random() * 100
        },
        ai: {
          requests: Math.floor(Math.random() * 200),
          tokens: Math.floor(Math.random() * 100000),
          cost: Math.random() * 50,
          averageResponseTime: Math.random() * 3000,
          errors: Math.floor(Math.random() * 5)
        },
        users: {
          active: Math.floor(Math.random() * 500),
          total: Math.floor(Math.random() * 10000),
          signups: Math.floor(Math.random() * 20),
          churn: Math.floor(Math.random() * 5)
        }
      };

      this.applicationMetrics.push(metrics);
    } catch (error) {
      console.error('Failed to collect application metrics:', error);
    }
  }

  // Health Checks
  private startHealthChecks() {
    this.healthCheckIntervalId = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthChecks.interval * 1000);
  }

  private async performHealthChecks(): Promise<void> {
    const checks = this.config.healthChecks.services.map(service =>
      this.checkServiceHealth(service)
    );

    await Promise.allSettled(checks);
  }

  private async checkServiceHealth(service: string): Promise<void> {
    const startTime = Date.now();

    try {
      let status: HealthCheck['status'] = 'healthy';
      let message = 'Service is operating normally';
      let details = {};

      // Simulate service-specific health checks
      switch (service) {
        case 'database':
          // Mock database health check
          const dbResponseTime = Math.random() * 100;
          if (dbResponseTime > 50) status = 'degraded';
          if (dbResponseTime > 80) status = 'unhealthy';
          details = { responseTime: dbResponseTime, connections: Math.floor(Math.random() * 100) };
          break;

        case 'ai_service':
          // Mock AI service health check
          const aiSuccess = Math.random() > 0.1; // 90% success rate
          status = aiSuccess ? 'healthy' : 'unhealthy';
          message = aiSuccess ? 'AI service responding' : 'AI service unavailable';
          details = { successRate: aiSuccess ? 0.9 : 0.1 };
          break;

        case 'redis':
          // Mock Redis health check
          const redisLatency = Math.random() * 10;
          status = redisLatency < 5 ? 'healthy' : redisLatency < 8 ? 'degraded' : 'unhealthy';
          details = { latency: redisLatency };
          break;

        case 'storage':
          // Mock storage health check
          const storageUsage = Math.random() * 100;
          status = storageUsage < 80 ? 'healthy' : storageUsage < 95 ? 'degraded' : 'unhealthy';
          details = { usage: storageUsage };
          break;
      }

      const healthCheck: HealthCheck = {
        service,
        status,
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message,
        details
      };

      this.healthChecks.set(service, healthCheck);

      // Generate alerts for unhealthy services
      if (status === 'unhealthy') {
        this.createAlert(
          'critical',
          `Service Unhealthy: ${service}`,
          `${service} is reporting unhealthy status: ${message}`,
          'service_health',
          1,
          0
        );
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const healthCheck: HealthCheck = {
        service,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message: `Health check failed: ${errorMessage}`,
        details: { error: errorMessage }
      };

      this.healthChecks.set(service, healthCheck);
    }
  }

  // Alert Management
  private checkAlerts(): void {
    if (!this.config.alerts.enabled) return;

    const latestSystemMetrics = this.systemMetrics[this.systemMetrics.length - 1];
    const latestAppMetrics = this.applicationMetrics[this.applicationMetrics.length - 1];

    if (!latestSystemMetrics || !latestAppMetrics) return;

    // CPU Alert
    if (latestSystemMetrics.cpu.usage > this.config.alerts.thresholds.cpu) {
      this.createAlert(
        'warning',
        'High CPU Usage',
        `CPU usage is at ${latestSystemMetrics.cpu.usage.toFixed(1)}%`,
        'cpu_usage',
        this.config.alerts.thresholds.cpu,
        latestSystemMetrics.cpu.usage
      );
    }

    // Memory Alert
    if (latestSystemMetrics.memory.percentage > this.config.alerts.thresholds.memory) {
      this.createAlert(
        'warning',
        'High Memory Usage',
        `Memory usage is at ${latestSystemMetrics.memory.percentage.toFixed(1)}%`,
        'memory_usage',
        this.config.alerts.thresholds.memory,
        latestSystemMetrics.memory.percentage
      );
    }

    // Disk Alert
    if (latestSystemMetrics.disk.percentage > this.config.alerts.thresholds.disk) {
      this.createAlert(
        'critical',
        'High Disk Usage',
        `Disk usage is at ${latestSystemMetrics.disk.percentage.toFixed(1)}%`,
        'disk_usage',
        this.config.alerts.thresholds.disk,
        latestSystemMetrics.disk.percentage
      );
    }

    // Response Time Alert
    if (latestAppMetrics.requests.averageResponseTime > this.config.alerts.thresholds.responseTime) {
      this.createAlert(
        'warning',
        'High Response Time',
        `Average response time is ${latestAppMetrics.requests.averageResponseTime.toFixed(0)}ms`,
        'response_time',
        this.config.alerts.thresholds.responseTime,
        latestAppMetrics.requests.averageResponseTime
      );
    }

    // Error Rate Alert
    const errorRate = (latestAppMetrics.requests.failed / latestAppMetrics.requests.total) * 100;
    if (errorRate > this.config.alerts.thresholds.errorRate) {
      this.createAlert(
        'error',
        'High Error Rate',
        `Error rate is at ${errorRate.toFixed(1)}%`,
        'error_rate',
        this.config.alerts.thresholds.errorRate,
        errorRate
      );
    }
  }

  private createAlert(
    type: Alert['type'],
    title: string,
    description: string,
    metric: string,
    threshold: number,
    currentValue: number
  ): void {
    // Check if similar alert already exists and is not resolved
    const existingAlert = this.alerts.find(alert =>
      alert.metric === metric &&
      !alert.resolved &&
      Date.now() - alert.timestamp.getTime() < 5 * 60 * 1000 // Within 5 minutes
    );

    if (existingAlert) return;

    const alert: Alert = {
      id: this.generateAlertId(),
      type,
      title,
      description,
      metric,
      threshold,
      currentValue,
      timestamp: new Date(),
      resolved: false,
      actions: this.getAlertActions(type, metric)
    };

    this.alerts.push(alert);
    this.executeAlertActions(alert);
  }

  private getAlertActions(type: Alert['type'], metric: string): AlertAction[] {
    const actions: AlertAction[] = [];

    // Email notifications for all alerts
    actions.push({
      type: 'email',
      config: { recipients: ['admin@jobtracker.com'] },
      triggered: false
    });

    // Webhook for critical alerts
    if (type === 'critical') {
      actions.push({
        type: 'webhook',
        config: { url: 'https://hooks.slack.com/services/monitoring' },
        triggered: false
      });
    }

    // Auto-scaling for CPU/Memory issues
    if (metric === 'cpu_usage' || metric === 'memory_usage') {
      actions.push({
        type: 'auto_scale',
        config: { instances: 2 },
        triggered: false
      });
    }

    return actions;
  }

  private async executeAlertActions(alert: Alert): Promise<void> {
    for (const action of alert.actions) {
      try {
        switch (action.type) {
          case 'email':
            await this.sendEmailAlert(alert, action.config);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert, action.config);
            break;
          case 'slack':
            await this.sendSlackAlert(alert, action.config);
            break;
          case 'auto_scale':
            await this.triggerAutoScaling(alert, action.config);
            break;
          case 'restart':
            await this.restartService(alert, action.config);
            break;
        }

        action.triggered = true;
        action.triggeredAt = new Date();
      } catch (error) {
        console.error(`Failed to execute alert action ${action.type}:`, error);
      }
    }
  }

  // Query Methods
  getSystemMetrics(timeRange?: { start: Date; end: Date }): SystemMetrics[] {
    if (!timeRange) return this.systemMetrics;

    return this.systemMetrics.filter(metric =>
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  getApplicationMetrics(timeRange?: { start: Date; end: Date }): ApplicationMetrics[] {
    if (!timeRange) return this.applicationMetrics;

    return this.applicationMetrics.filter(metric =>
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getAllAlerts(limit?: number): Alert[] {
    const sorted = this.alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  getHealthStatus(): Map<string, HealthCheck> {
    return new Map(this.healthChecks);
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      return true;
    }
    return false;
  }

  // Utility Methods
  private cleanupOldMetrics(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.metrics.retention);

    this.systemMetrics = this.systemMetrics.filter(metric => metric.timestamp >= cutoffDate);
    this.applicationMetrics = this.applicationMetrics.filter(metric => metric.timestamp >= cutoffDate);

    // Clean up old alerts (keep for 90 days)
    const alertCutoff = new Date();
    alertCutoff.setDate(alertCutoff.getDate() - 90);
    this.alerts = this.alerts.filter(alert => alert.timestamp >= alertCutoff);
  }

  private async sendEmailAlert(alert: Alert, config: any): Promise<void> {
    // Mock email sending
    console.log(`Sending email alert: ${alert.title} to ${config.recipients?.join(', ')}`);
  }

  private async sendWebhookAlert(alert: Alert, config: any): Promise<void> {
    // Mock webhook call
    console.log(`Sending webhook alert to ${config.url}:`, alert.title);
  }

  private async sendSlackAlert(alert: Alert, config: any): Promise<void> {
    // Mock Slack notification
    console.log(`Sending Slack alert to ${config.channel}:`, alert.title);
  }

  private async triggerAutoScaling(alert: Alert, config: any): Promise<void> {
    // Mock auto-scaling trigger
    console.log(`Triggering auto-scaling: ${config.instances} instances`);
  }

  private async restartService(alert: Alert, config: any): Promise<void> {
    // Mock service restart
    console.log(`Restarting service: ${config.service}`);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadPersistedData(): void {
    // In production, load from persistent storage
  }

  // Control Methods
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = null;
    }
  }

  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart with new config
    this.stop();
    this.initialize();
  }

  // Export/Import
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    const data = {
      system: this.systemMetrics,
      application: this.applicationMetrics,
      alerts: this.alerts,
      health: Array.from(this.healthChecks.entries())
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion - in production, use proper CSV library
    const systemRows = data.system.map((metric: SystemMetrics) => [
      metric.timestamp.toISOString(),
      'system',
      metric.cpu.usage,
      metric.memory.percentage,
      metric.disk.percentage
    ]);

    const appRows = data.application.map((metric: ApplicationMetrics) => [
      metric.timestamp.toISOString(),
      'application',
      metric.requests.total,
      metric.requests.failed,
      metric.requests.averageResponseTime
    ]);

    const headers = ['Timestamp', 'Type', 'Value1', 'Value2', 'Value3'];
    const allRows = [headers, ...systemRows, ...appRows];

    return allRows.map(row => row.join(',')).join('\n');
  }
}

// Global monitoring instance
export const monitoringService = new MonitoringService();