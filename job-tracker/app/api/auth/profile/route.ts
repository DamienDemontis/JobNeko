import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { 
  withErrorHandling, 
  AuthenticationError, 
  ConflictError,
  ValidationError
} from '@/lib/error-handling';

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
});

const updateProfileSchema = z.object({
  // Location Information (mapping form fields to DB fields)
  currentCity: z.string().optional(),      // Maps to currentLocation
  currentCountry: z.string().optional(),   // Maps to currentCountry
  currentState: z.string().optional(),     // Will be combined with city
  // Family Context
  familySize: z.number().min(1).optional(),
  dependents: z.number().min(0).optional(),
  maritalStatus: z.enum(['single', 'married', 'partnered']).optional(),
  // Financial Context
  expectedSalary: z.number().min(0).optional(),    // Maps to expectedSalaryMax
  currentSalary: z.number().min(0).optional(),
  currencyPreference: z.string().optional(),       // Maps to preferredCurrency
  // Preferences
  workModePreference: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  willingToRelocate: z.boolean().optional(),       // Maps to openToRelocation
});

// GET profile data
export const GET = withErrorHandling(async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    throw new AuthenticationError('Authorization header required');
  }

  const token = authHeader.replace('Bearer ', '');
  const session = await validateToken(token);

  if (!session) {
    throw new AuthenticationError('Invalid or expired token');
  }

  // Get user with profile data
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      profile: true,
    },
  });

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  // Combine user data with profile data (mapping DB fields to form fields)
  const profileData = {
    // User fields
    id: user.id,
    email: user.email,
    name: user.name,
    // Profile fields (with defaults, mapped to form field names)
    currentCity: user.profile?.currentLocation || '',
    currentCountry: user.profile?.currentCountry || '',
    currentState: '', // Not stored separately in DB
    familySize: user.profile?.familySize || 1,
    dependents: user.profile?.dependents || 0,
    maritalStatus: user.profile?.maritalStatus || 'single',
    expectedSalary: user.profile?.expectedSalaryMax || 0,
    currentSalary: user.profile?.currentSalary || 0,
    currencyPreference: user.profile?.preferredCurrency || 'USD',
    workModePreference: 'hybrid', // Default since not stored yet
    willingToRelocate: user.profile?.openToRelocation || false,
  };

  return NextResponse.json({
    profile: profileData,
  });
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      throw new AuthenticationError('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const session = await validateToken(token);

    if (!session) {
      throw new AuthenticationError('Invalid or expired token');
    }

    const body = await request.json();
    
    // Separate user fields from profile fields, filtering out empty strings
    const userFields = {
      name: body.name && body.name.trim() !== '' ? body.name : undefined,
      email: body.email && body.email.trim() !== '' ? body.email : undefined,
    };
    
    const profileFields = {
      currentCity: body.currentCity && body.currentCity.trim() !== '' ? body.currentCity : undefined,
      currentCountry: body.currentCountry && body.currentCountry.trim() !== '' ? body.currentCountry : undefined,
      currentState: body.currentState && body.currentState.trim() !== '' ? body.currentState : undefined,
      familySize: typeof body.familySize === 'number' ? body.familySize : undefined,
      dependents: typeof body.dependents === 'number' ? body.dependents : undefined,
      maritalStatus: body.maritalStatus && body.maritalStatus.trim() !== '' ? body.maritalStatus : undefined,
      expectedSalary: typeof body.expectedSalary === 'number' ? body.expectedSalary : undefined,
      currentSalary: typeof body.currentSalary === 'number' ? body.currentSalary : undefined,
      currencyPreference: body.currencyPreference && body.currencyPreference.trim() !== '' ? body.currencyPreference : undefined,
      workModePreference: body.workModePreference && body.workModePreference.trim() !== '' ? body.workModePreference : undefined,
      willingToRelocate: typeof body.willingToRelocate === 'boolean' ? body.willingToRelocate : undefined,
    };

    // Validate data with better error handling
    let validatedUserData;
    let validatedProfileData;
    
    try {
      validatedUserData = updateUserSchema.parse(userFields);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid user data', error.errors);
      }
      throw error;
    }
    
    try {
      validatedProfileData = updateProfileSchema.parse(profileFields);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid profile data', error.errors);
      }
      throw error;
    }

    // Check if email is being changed and if it already exists
    if (validatedUserData.email) {
      const existingUser = await prisma.user.findUnique({
        where: { 
          email: validatedUserData.email,
          NOT: { id: session.id }
        },
      });

      if (existingUser) {
        throw new ConflictError('Email is already in use by another account');
      }
    }

    // Update user fields if any
    let updatedUser = null;
    if (Object.values(validatedUserData).some(val => val !== undefined)) {
      updatedUser = await prisma.user.update({
        where: { id: session.id },
        data: validatedUserData,
      });
    }

    // Update or create profile - map form fields to DB fields
    const dbMappedData: any = {};
    
    if (validatedProfileData.currentCity !== undefined) {
      // Combine city and state for currentLocation
      const location = validatedProfileData.currentState 
        ? `${validatedProfileData.currentCity}, ${validatedProfileData.currentState}`
        : validatedProfileData.currentCity;
      dbMappedData.currentLocation = location;
    }
    
    if (validatedProfileData.currentCountry !== undefined) {
      dbMappedData.currentCountry = validatedProfileData.currentCountry;
    }
    
    if (validatedProfileData.familySize !== undefined) {
      dbMappedData.familySize = validatedProfileData.familySize;
    }
    
    if (validatedProfileData.dependents !== undefined) {
      dbMappedData.dependents = validatedProfileData.dependents;
    }
    
    if (validatedProfileData.maritalStatus !== undefined) {
      dbMappedData.maritalStatus = validatedProfileData.maritalStatus;
    }
    
    if (validatedProfileData.expectedSalary !== undefined) {
      dbMappedData.expectedSalaryMax = validatedProfileData.expectedSalary;
    }
    
    if (validatedProfileData.currentSalary !== undefined) {
      dbMappedData.currentSalary = validatedProfileData.currentSalary;
    }
    
    if (validatedProfileData.currencyPreference !== undefined) {
      dbMappedData.preferredCurrency = validatedProfileData.currencyPreference;
    }
    
    if (validatedProfileData.willingToRelocate !== undefined) {
      dbMappedData.openToRelocation = validatedProfileData.willingToRelocate;
    }
    
    const profileUpdateData = Object.fromEntries(
      Object.entries(dbMappedData).filter(([, value]) => value !== undefined)
    );

    let updatedProfile = null;
    if (Object.keys(profileUpdateData).length > 0) {
      updatedProfile = await prisma.userProfile.upsert({
        where: { userId: session.id },
        update: profileUpdateData,
        create: {
          userId: session.id,
          ...profileUpdateData,
        },
      });
    }

    // Get the complete user with profile for response
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        profile: true,
      },
    });

    // Combine user data with profile data for response (mapping DB fields back to form fields)
    const responseData = {
      // User fields
      id: user!.id,
      email: user!.email,
      name: user!.name,
      // Profile fields (with defaults, mapped to form field names)
      currentCity: user!.profile?.currentLocation || '',
      currentCountry: user!.profile?.currentCountry || '',
      currentState: '', // Not stored separately in DB
      familySize: user!.profile?.familySize || 1,
      dependents: user!.profile?.dependents || 0,
      maritalStatus: user!.profile?.maritalStatus || 'single',
      expectedSalary: user!.profile?.expectedSalaryMax || 0,
      currentSalary: user!.profile?.currentSalary || 0,
      currencyPreference: user!.profile?.preferredCurrency || 'USD',
      workModePreference: 'hybrid', // Default since not stored yet
      willingToRelocate: user!.profile?.openToRelocation || false,
    };

    return NextResponse.json({
      profile: responseData,
      message: 'Profile updated successfully',
    });
});