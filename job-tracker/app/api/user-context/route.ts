/**
 * User Context API - Server-side endpoint for enhanced user context
 * Handles all user context operations that require database access
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  withErrorHandling,
  AuthenticationError,
  ValidationError
} from '@/lib/error-handling';

// Enhanced User Context Builder (server-side version)
class EnhancedUserContextBuilder {
  async buildEnhancedContext(userId: string) {
    try {
      // Fetch user profile data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          jobs: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!user) {
        throw new ValidationError('User not found');
      }

      // Build enhanced context
      const context = {
        userId,
        name: user.name || '',
        currentLocation: user.profile?.currentLocation || '',
        experienceLevel: this.determineSeniorityLevel(user.profile?.yearsOfExperience || 0),
        industryFocus: ['Technology', 'Software Development'],
        professionalProfile: {
          title: user.profile?.additionalInfo || 'Professional',
          summary: 'Experienced professional with strong technical background',
          skills: [],
          yearsOfExperience: user.profile?.yearsOfExperience || 0
        },
        marketPositioning: {
          strengths: ['Technical expertise', 'Problem solving', 'Team collaboration'],
          differentiators: ['Strong analytical skills', 'Adaptable to new technologies'],
          targetRoles: ['Software Engineer', 'Full Stack Developer'],
          careerGoals: ['Technical leadership', 'System architecture', 'Team mentoring']
        },
        profile: {
          fullName: user.name || '',
          email: user.email,
          location: user.profile?.currentLocation || '',
          currentRole: user.profile?.additionalInfo || '',
          yearsOfExperience: user.profile?.yearsOfExperience || 0,
          skills: [],
          education: [],
          preferences: {
            desiredRole: '',
            desiredCompanies: [],
            salaryExpectations: {
              min: user.profile?.expectedSalaryMin || 0,
              max: user.profile?.expectedSalaryMax || 0,
              currency: user.profile?.preferredCurrency || 'USD'
            },
            workMode: 'hybrid',
            locations: this.parseLocations(user.profile?.preferredCountries)
          }
        },
        linkedIn: null,
        careerProgress: this.analyzeCareerProgress(user.profile),
        applicationHistory: this.analyzeApplicationHistory(user.jobs),
        communicationStyle: {
          tone: 'professional',
          preferences: {}
        },
        networkGraph: {
          totalConnections: 0,
          industryConnections: {},
          companyConnections: {},
          schoolConnections: {},
          mutualConnections: {}
        }
      };

      return context;
    } catch (error) {
      console.error('Failed to build enhanced user context:', error);
      throw error;
    }
  }

  private parseSkills(skills: any): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') {
      try {
        return JSON.parse(skills);
      } catch {
        return skills.split(',').map((s: string) => s.trim());
      }
    }
    return [];
  }

  private parseEducation(education: any): any[] {
    if (!education) return [];
    if (Array.isArray(education)) return education;
    if (typeof education === 'string') {
      try {
        return JSON.parse(education);
      } catch {
        return [];
      }
    }
    return [];
  }

  private parseCompanies(companies: any): string[] {
    if (!companies) return [];
    if (Array.isArray(companies)) return companies;
    if (typeof companies === 'string') {
      try {
        const parsed = JSON.parse(companies);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return companies.split(',').map((c: string) => c.trim());
      }
    }
    return [];
  }

  private parseLocations(locations: any): string[] {
    if (!locations) return [];
    if (Array.isArray(locations)) return locations;
    if (typeof locations === 'string') {
      try {
        const parsed = JSON.parse(locations);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return locations.split(',').map((l: string) => l.trim());
      }
    }
    return [];
  }

  private parseLinkedIn(linkedinUrl: any) {
    if (!linkedinUrl) return null;
    return {
      url: linkedinUrl,
      connections: 0,
      skills: [],
      experience: [],
      education: [],
      recommendations: 0
    };
  }

  private analyzeCareerProgress(profile: any) {
    if (!profile) return { yearsOfExperience: 0, currentLevel: 'junior', roleProgression: [], skillGrowth: [] };

    return {
      yearsOfExperience: profile.yearsOfExperience || 0,
      currentLevel: this.determineSeniorityLevel(profile.yearsOfExperience || 0),
      roleProgression: [],
      skillGrowth: []
    };
  }

  private determineSeniorityLevel(years: number): string {
    if (years < 2) return 'junior';
    if (years < 5) return 'mid';
    if (years < 8) return 'senior';
    if (years < 12) return 'staff';
    return 'principal';
  }

  private analyzeApplicationHistory(jobs: any[]) {
    if (!jobs || jobs.length === 0) {
      return {
        totalApplications: 0,
        successRate: 0,
        averageResponseTime: 0,
        preferredCompanies: []
      };
    }

    const successfulApplications = jobs.filter(j =>
      j.status === 'interview' || j.status === 'offer' || j.status === 'accepted'
    ).length;

    return {
      totalApplications: jobs.length,
      successRate: jobs.length > 0 ? (successfulApplications / jobs.length) * 100 : 0,
      averageResponseTime: 7, // Default estimate in days
      preferredCompanies: this.extractTopCompanies(jobs)
    };
  }

  private extractTopCompanies(jobs: any[]): string[] {
    const companyCount = jobs.reduce((acc, job) => {
      const company = job.company || 'Unknown';
      acc[company] = (acc[company] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(companyCount)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([company]) => company);
  }
}

// GET endpoint - Build user context
export const GET = withErrorHandling(async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('Authorization token required');
  }

  const token = authHeader.slice(7);
  const user = await validateToken(token);

  if (!user) {
    throw new AuthenticationError('Invalid authentication token');
  }

  const builder = new EnhancedUserContextBuilder();
  const context = await builder.buildEnhancedContext(user.id);

  return NextResponse.json(context, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
    }
  });
});

// POST endpoint - Update specific context aspects
export const POST = withErrorHandling(async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('Authorization token required');
  }

  const token = authHeader.slice(7);
  const user = await validateToken(token);

  if (!user) {
    throw new AuthenticationError('Invalid authentication token');
  }

  const body = await request.json();
  const { contextType, data } = body;

  // Handle specific context updates
  switch (contextType) {
    case 'linkedin':
      await prisma.user.update({
        where: { id: user.id },
        data: {
          profile: {
            update: {
              linkedinUrl: data.url
            }
          }
        }
      });
      break;

    case 'preferences':
      await prisma.user.update({
        where: { id: user.id },
        data: {
          profile: {
            update: {
              expectedSalaryMin: data.salaryMin,
              expectedSalaryMax: data.salaryMax,
              preferredCountries: JSON.stringify(data.locations)
            }
          }
        }
      });
      break;

    default:
      throw new ValidationError(`Unknown context type: ${contextType}`);
  }

  // Return updated context
  const builder = new EnhancedUserContextBuilder();
  const context = await builder.buildEnhancedContext(user.id);

  return NextResponse.json(context, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
});