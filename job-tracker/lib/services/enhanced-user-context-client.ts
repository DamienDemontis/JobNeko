/**
 * Enhanced User Context Client Service
 * Client-side service that fetches user context from the API
 * NO FALLBACKS - Only real data from server
 */

export interface EnhancedUserContext {
  userId: string;
  name: string;
  currentLocation: string;
  experienceLevel: string;
  industryFocus: string[];
  professionalProfile: {
    title: string;
    summary: string;
    skills: string[];
    yearsOfExperience: number;
  };
  marketPositioning: {
    strengths: string[];
    differentiators: string[];
    targetRoles: string[];
    careerGoals: string[];
  };
  profile: {
    fullName: string;
    email: string;
    location: string;
    currentRole: string;
    yearsOfExperience: number;
    skills: string[];
    education: any[];
    preferences: {
      desiredRole: string;
      desiredCompanies: string[];
      salaryExpectations: {
        min: number;
        max: number;
        currency: string;
      };
      workMode: string;
      locations: string[];
    };
  };
  linkedIn: {
    url: string;
    connections: number;
    skills: string[];
    experience: any[];
    education: any[];
    recommendations: number;
  } | null;
  careerProgress: {
    yearsOfExperience: number;
    currentLevel: string;
    roleProgression: any[];
    skillGrowth: any[];
  };
  applicationHistory: {
    totalApplications: number;
    successRate: number;
    averageResponseTime: number;
    preferredCompanies: string[];
  };
  communicationStyle: {
    tone: string;
    preferences: any;
  };
  networkGraph: {
    totalConnections: number;
    industryConnections: Record<string, number>;
    companyConnections: Record<string, string[]>;
    schoolConnections: Record<string, string[]>;
    mutualConnections: Record<string, any>;
  };
}

class EnhancedUserContextClient {
  private static instance: EnhancedUserContextClient;
  private cache: EnhancedUserContext | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): EnhancedUserContextClient {
    if (!EnhancedUserContextClient.instance) {
      EnhancedUserContextClient.instance = new EnhancedUserContextClient();
    }
    return EnhancedUserContextClient.instance;
  }

  async buildEnhancedContext(): Promise<EnhancedUserContext> {
    // Check cache
    if (this.cache && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.cache;
    }

    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch('/api/user-context', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user context');
      }

      const context = await response.json();

      // Update cache
      this.cache = context;
      this.cacheTimestamp = Date.now();

      return context;
    } catch (error) {
      console.error('Failed to build enhanced user context:', error);
      throw error;
    }
  }

  async updateLinkedInProfile(linkedInUrl: string): Promise<EnhancedUserContext> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch('/api/user-context', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contextType: 'linkedin',
          data: { url: linkedInUrl }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update LinkedIn profile');
      }

      const context = await response.json();

      // Update cache
      this.cache = context;
      this.cacheTimestamp = Date.now();

      return context;
    } catch (error) {
      console.error('Failed to update LinkedIn profile:', error);
      throw error;
    }
  }

  async updatePreferences(preferences: any): Promise<EnhancedUserContext> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch('/api/user-context', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contextType: 'preferences',
          data: preferences
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update preferences');
      }

      const context = await response.json();

      // Update cache
      this.cache = context;
      this.cacheTimestamp = Date.now();

      return context;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  }

  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  private getAuthToken(): string | null {
    // Check multiple sources for the token
    if (typeof window !== 'undefined') {
      // Try localStorage first
      const token = localStorage.getItem('token');
      if (token) return token;

      // Try sessionStorage
      const sessionToken = sessionStorage.getItem('token');
      if (sessionToken) return sessionToken;

      // Try cookies
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'token') return value;
      }
    }
    return null;
  }
}

export const enhancedUserContextClient = EnhancedUserContextClient.getInstance();