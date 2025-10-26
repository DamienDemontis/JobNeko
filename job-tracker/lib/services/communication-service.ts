export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  sms: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

export interface Notification {
  id: string;
  userId: string;
  type: 'job_match' | 'interview_reminder' | 'deadline_warning' | 'application_update' | 'network_activity' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('email' | 'push' | 'inApp' | 'sms')[];
  scheduledFor?: Date;
  sentAt?: Date;
  readAt?: Date;
  actionUrl?: string;
  expiresAt?: Date;
}

export interface RealTimeEvent {
  id: string;
  userId: string;
  type: string;
  data: any;
  timestamp: Date;
  broadcast?: boolean;
}

export interface ConnectionStatus {
  userId: string;
  connected: boolean;
  lastSeen: Date;
  activeSession: string;
}

export class CommunicationService {
  private wsConnections: Map<string, WebSocket> = new Map();
  private notifications: Map<string, Notification[]> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private connections: Map<string, ConnectionStatus> = new Map();
  private eventQueue: RealTimeEvent[] = [];

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    // Initialize default preferences and load persisted data
    if (typeof window !== 'undefined') {
      this.loadPersistedData();
      this.setupHeartbeat();
    }
  }

  // WebSocket Connection Management
  async connectUser(userId: string, wsUrl?: string): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;

      const url = wsUrl || `ws://localhost:3001/ws?userId=${userId}`;
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`WebSocket connected for user ${userId}`);
        this.wsConnections.set(userId, ws);
        this.updateConnectionStatus(userId, true);

        // Send queued events
        this.processQueuedEvents(userId);
      };

      ws.onmessage = (event) => {
        this.handleIncomingMessage(userId, JSON.parse(event.data));
      };

      ws.onclose = () => {
        console.log(`WebSocket disconnected for user ${userId}`);
        this.wsConnections.delete(userId);
        this.updateConnectionStatus(userId, false);

        // Attempt reconnection after delay
        setTimeout(() => this.reconnectUser(userId), 5000);
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
      };

      return true;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      return false;
    }
  }

  disconnectUser(userId: string): void {
    const ws = this.wsConnections.get(userId);
    if (ws) {
      ws.close();
      this.wsConnections.delete(userId);
      this.updateConnectionStatus(userId, false);
    }
  }

  private async reconnectUser(userId: string): Promise<void> {
    if (!this.wsConnections.has(userId)) {
      await this.connectUser(userId);
    }
  }

  // Real-time Event Broadcasting
  broadcastEvent(event: RealTimeEvent): void {
    if (event.broadcast) {
      // Broadcast to all connected users
      this.wsConnections.forEach((ws, userId) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(event));
        }
      });
    } else {
      // Send to specific user
      this.sendEventToUser(event.userId, event);
    }
  }

  sendEventToUser(userId: string, event: RealTimeEvent): boolean {
    const ws = this.wsConnections.get(userId);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
      return true;
    } else {
      // Queue event for later delivery
      this.eventQueue.push(event);
      return false;
    }
  }

  // Notification Management
  async sendNotification(notification: Notification): Promise<boolean> {
    try {
      // Check user preferences
      const prefs = this.getUserPreferences(notification.userId);

      if (!this.shouldSendNotification(notification, prefs)) {
        return false;
      }

      // Filter channels based on preferences
      notification.channels = notification.channels.filter(channel => {
        return prefs[channel as keyof Pick<NotificationPreferences, 'email' | 'push' | 'inApp' | 'sms'>];
      });

      if (notification.channels.length === 0) {
        return false;
      }

      // Schedule or send immediately
      if (notification.scheduledFor && notification.scheduledFor > new Date()) {
        this.scheduleNotification(notification);
      } else {
        await this.deliverNotification(notification);
      }

      // Store notification
      this.storeNotification(notification);

      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  private async deliverNotification(notification: Notification): Promise<void> {
    notification.sentAt = new Date();

    // Deliver via each channel
    for (const channel of notification.channels) {
      try {
        switch (channel) {
          case 'inApp':
            await this.sendInAppNotification(notification);
            break;
          case 'email':
            await this.sendEmailNotification(notification);
            break;
          case 'push':
            await this.sendPushNotification(notification);
            break;
          case 'sms':
            await this.sendSMSNotification(notification);
            break;
        }
      } catch (error) {
        console.error(`Failed to deliver notification via ${channel}:`, error);
      }
    }
  }

  private async sendInAppNotification(notification: Notification): Promise<void> {
    // Send via WebSocket for real-time in-app notification
    const event: RealTimeEvent = {
      id: `event_${Date.now()}`,
      userId: notification.userId,
      type: 'notification',
      data: notification,
      timestamp: new Date()
    };

    this.sendEventToUser(notification.userId, event);
  }

  private async sendEmailNotification(notification: Notification): Promise<void> {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`Sending email notification to user ${notification.userId}:`, notification.title);

    // Mock email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendPushNotification(notification: Notification): Promise<void> {
    // In production, integrate with push notification service (FCM, APNs, etc.)
    console.log(`Sending push notification to user ${notification.userId}:`, notification.title);

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(notification.title, {
          body: notification.message,
          icon: '/icon-192.png',
          badge: '/badge-72.png',
          data: notification.data,
          ...(notification.actionUrl && {
            actions: [
              { action: 'view', title: 'View' },
              { action: 'dismiss', title: 'Dismiss' }
            ]
          })
        });
      } catch (error) {
        console.error('Failed to show push notification:', error);
      }
    }
  }

  private async sendSMSNotification(notification: Notification): Promise<void> {
    // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`Sending SMS notification to user ${notification.userId}:`, notification.title);

    // Mock SMS sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Notification Queries
  getUserNotifications(userId: string, unreadOnly: boolean = false): Notification[] {
    const userNotifications = this.notifications.get(userId) || [];

    if (unreadOnly) {
      return userNotifications.filter(n => !n.readAt);
    }

    return userNotifications.sort((a, b) =>
      (b.sentAt || b.scheduledFor || new Date()).getTime() -
      (a.sentAt || a.scheduledFor || new Date()).getTime()
    );
  }

  markNotificationAsRead(notificationId: string, userId: string): boolean {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return false;

    const notification = userNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.readAt = new Date();
      this.persistData();
      return true;
    }

    return false;
  }

  markAllNotificationsAsRead(userId: string): number {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return 0;

    let count = 0;
    const now = new Date();

    userNotifications.forEach(notification => {
      if (!notification.readAt) {
        notification.readAt = now;
        count++;
      }
    });

    if (count > 0) {
      this.persistData();
    }

    return count;
  }

  deleteNotification(notificationId: string, userId: string): boolean {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return false;

    const index = userNotifications.findIndex(n => n.id === notificationId);
    if (index >= 0) {
      userNotifications.splice(index, 1);
      this.persistData();
      return true;
    }

    return false;
  }

  // Preferences Management
  getUserPreferences(userId: string): NotificationPreferences {
    return this.preferences.get(userId) || this.getDefaultPreferences();
  }

  updateUserPreferences(userId: string, prefs: Partial<NotificationPreferences>): void {
    const currentPrefs = this.getUserPreferences(userId);
    const updatedPrefs = { ...currentPrefs, ...prefs };
    this.preferences.set(userId, updatedPrefs);
    this.persistData();
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      email: true,
      push: true,
      inApp: true,
      sms: false,
      frequency: 'immediate',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
  }

  // Specialized Notification Methods
  async notifyJobMatch(userId: string, jobId: string, matchScore: number): Promise<void> {
    const notification: Notification = {
      id: this.generateNotificationId(),
      userId,
      type: 'job_match',
      title: 'New Job Match Found!',
      message: `We found a job with ${matchScore}% match to your profile`,
      data: { jobId, matchScore },
      priority: matchScore >= 90 ? 'high' : 'medium',
      channels: ['inApp', 'push', 'email'],
      actionUrl: `/jobs/${jobId}`
    };

    await this.sendNotification(notification);
  }

  async notifyInterviewReminder(userId: string, jobId: string, interviewDate: Date): Promise<void> {
    const timeUntil = interviewDate.getTime() - Date.now();
    const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));

    const notification: Notification = {
      id: this.generateNotificationId(),
      userId,
      type: 'interview_reminder',
      title: 'Interview Reminder',
      message: `Your interview is in ${hoursUntil} hours`,
      data: { jobId, interviewDate },
      priority: 'high',
      channels: ['inApp', 'push', 'email', 'sms'],
      actionUrl: `/jobs/${jobId}`,
      scheduledFor: new Date(interviewDate.getTime() - 24 * 60 * 60 * 1000) // 24 hours before
    };

    await this.sendNotification(notification);
  }

  async notifyApplicationDeadline(userId: string, jobId: string, deadline: Date): Promise<void> {
    const timeUntil = deadline.getTime() - Date.now();
    const daysUntil = Math.floor(timeUntil / (1000 * 60 * 60 * 24));

    if (daysUntil <= 3 && daysUntil > 0) {
      const notification: Notification = {
        id: this.generateNotificationId(),
        userId,
        type: 'deadline_warning',
        title: 'Application Deadline Soon',
        message: `Application deadline in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
        data: { jobId, deadline },
        priority: daysUntil === 1 ? 'urgent' : 'high',
        channels: ['inApp', 'push', 'email'],
        actionUrl: `/jobs/${jobId}`
      };

      await this.sendNotification(notification);
    }
  }

  async notifyApplicationUpdate(userId: string, jobId: string, status: string): Promise<void> {
    const notification: Notification = {
      id: this.generateNotificationId(),
      userId,
      type: 'application_update',
      title: 'Application Status Update',
      message: `Your application status changed to: ${status}`,
      data: { jobId, status },
      priority: ['offer_extended', 'interview_scheduled'].includes(status) ? 'high' : 'medium',
      channels: ['inApp', 'push', 'email'],
      actionUrl: `/jobs/${jobId}`
    };

    await this.sendNotification(notification);
  }

  // Utility Methods
  private shouldSendNotification(notification: Notification, prefs: NotificationPreferences): boolean {
    // Check quiet hours
    if (prefs.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (currentTime >= prefs.quietHours.start || currentTime <= prefs.quietHours.end) {
        if (notification.priority !== 'urgent') {
          return false;
        }
      }
    }

    // Check frequency preferences
    if (prefs.frequency !== 'immediate') {
      // Queue for batch delivery based on frequency
      // This would be implemented with a job scheduler in production
      return false;
    }

    return true;
  }

  private scheduleNotification(notification: Notification): void {
    const delay = notification.scheduledFor!.getTime() - Date.now();

    if (delay > 0) {
      setTimeout(async () => {
        await this.deliverNotification(notification);
      }, delay);
    }
  }

  private storeNotification(notification: Notification): void {
    const userNotifications = this.notifications.get(notification.userId) || [];
    userNotifications.push(notification);

    // Keep only last 100 notifications per user
    if (userNotifications.length > 100) {
      userNotifications.splice(0, userNotifications.length - 100);
    }

    this.notifications.set(notification.userId, userNotifications);
    this.persistData();
  }

  private updateConnectionStatus(userId: string, connected: boolean): void {
    const status: ConnectionStatus = {
      userId,
      connected,
      lastSeen: new Date(),
      activeSession: connected ? this.generateSessionId() : ''
    };

    this.connections.set(userId, status);
  }

  private processQueuedEvents(userId: string): void {
    const userEvents = this.eventQueue.filter(event => event.userId === userId);

    userEvents.forEach(event => {
      this.sendEventToUser(userId, event);
    });

    // Remove processed events
    this.eventQueue = this.eventQueue.filter(event => event.userId !== userId);
  }

  private handleIncomingMessage(userId: string, message: any): void {
    switch (message.type) {
      case 'ping':
        this.sendEventToUser(userId, {
          id: 'pong',
          userId,
          type: 'pong',
          data: { timestamp: Date.now() },
          timestamp: new Date()
        });
        break;

      case 'notification_read':
        this.markNotificationAsRead(message.data.notificationId, userId);
        break;

      case 'typing':
        // Handle typing indicators for collaborative features
        this.broadcastEvent({
          id: this.generateEventId(),
          userId,
          type: 'user_typing',
          data: message.data,
          timestamp: new Date(),
          broadcast: true
        });
        break;

      default:
        console.log('Unhandled message type:', message.type);
    }
  }

  private setupHeartbeat(): void {
    setInterval(() => {
      this.wsConnections.forEach((ws, userId) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now()
          }));
        }
      });
    }, 30000); // 30 seconds
  }

  private loadPersistedData(): void {
    try {
      const notificationsData = localStorage.getItem('notifications');
      const preferencesData = localStorage.getItem('notificationPreferences');

      if (notificationsData) {
        const parsed = JSON.parse(notificationsData);
        this.notifications = new Map(Object.entries(parsed));
      }

      if (preferencesData) {
        const parsed = JSON.parse(preferencesData);
        this.preferences = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.warn('Failed to load persisted communication data:', error);
    }
  }

  private persistData(): void {
    try {
      const notificationsObj = Object.fromEntries(this.notifications);
      const preferencesObj = Object.fromEntries(this.preferences);

      localStorage.setItem('notifications', JSON.stringify(notificationsObj));
      localStorage.setItem('notificationPreferences', JSON.stringify(preferencesObj));
    } catch (error) {
      console.warn('Failed to persist communication data:', error);
    }
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global instance
export const communicationService = new CommunicationService();