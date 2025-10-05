import { NextRequest, NextResponse } from 'next/server';
import { aiResumeExtractor } from '../../../../lib/services/ai-resume-extractor';
import { prisma } from '../../../../lib/prisma';
import { validateToken } from '@/lib/auth';
import { salaryAnalysisPersistence } from '@/lib/services/salary-analysis-persistence';

export async function POST(request: NextRequest) {
  try {
    // Try to get user ID from formData first (old profile page method)
    const formData = await request.formData();
    const resume = formData.get('resume') as File;
    let userId = formData.get('userId') as string;

    // If no userId in formData, try to get from auth token (onboarding method)
    if (!userId) {
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      if (token) {
        const user = await validateToken(token);
        if (user) {
          userId = user.id;
        }
      }
    }

    if (!resume) {
      return NextResponse.json({ error: 'No resume file provided' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID or authentication required' }, { status: 400 });
    }

    if (resume.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    if (resume.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await resume.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract resume content using AI
    const extraction = await aiResumeExtractor.extractFromPDF(buffer, resume.name);

    // Store resume data in database
    const newResume = await prisma.resume.create({
      data: {
        userId: userId,
        fileName: resume.name,
        fileUrl: '',
        content: JSON.stringify(extraction),
        skills: JSON.stringify(extraction.technicalSkills.concat(extraction.softSkills)),
        experience: JSON.stringify(extraction.experience || []),
        education: JSON.stringify(extraction.education || []),
        isActive: true
      }
    });

    // Generate summary for response
    const summary = {
      name: extraction.name,
      email: extraction.email,
      phone: extraction.phone,
      location: extraction.location,
      yearsOfExperience: extraction.yearsOfExperience,
      careerLevel: extraction.careerLevel,
      skillsCount: {
        technical: extraction.technicalSkills.length,
        soft: extraction.softSkills.length,
        languages: extraction.languages.length,
        certifications: extraction.certifications.length
      },
      experienceCount: extraction.experience.length,
      educationCount: extraction.education.length,
      projectsCount: extraction.projects.length,
      confidence: extraction.confidence,
      keyStrengths: extraction.keyStrengths.slice(0, 3)
    };

    // Clear salary analysis cache when new resume is uploaded
    const clearedCount = await salaryAnalysisPersistence.clearUserCache(userId);
    console.log(`Cleared ${clearedCount} cached salary analyses after resume upload for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Resume uploaded and processed successfully',
      summary,
      extraction,
      processingTime: extraction.processingTimeMs,
      recommendations: [
        'Your resume has been analyzed and will now provide personalized job insights',
        'Check your profile to verify extracted information',
        'Visit job listings to see enhanced match scores and salary intelligence'
      ]
    });

  } catch (error) {
    console.error('Resume upload failed:', error);

    // Provide specific error messages
    if (error instanceof Error) {
      if (error.message.includes('AI service unavailable')) {
        return NextResponse.json(
          { error: 'Resume processing service is temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }

      if (error.message.includes('Resume extraction failed')) {
        return NextResponse.json(
          { error: 'Could not extract text from PDF. Please ensure the file is not password protected or corrupted.' },
          { status: 422 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Resume upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve resume status/summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // First check if there are ANY resumes for this user
    const allResumes = await prisma.resume.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        isActive: true,
        fileName: true,
      }
    });

    console.log(`Found ${allResumes.length} resumes for user ${userId}:`, allResumes);

    const activeResume = await prisma.resume.findFirst({
      where: {
        userId: userId,
        isActive: true
      },
      select: {
        id: true,
        fileName: true,
        content: true,
        skills: true,
        createdAt: true
      }
    });

    if (!activeResume) {
      // If there are resumes but none are active, try to find the most recent one
      if (allResumes.length > 0) {
        const mostRecentResume = await prisma.resume.findFirst({
          where: {
            userId: userId,
          },
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            fileName: true,
            content: true,
            skills: true,
            createdAt: true
          }
        });

        if (mostRecentResume && mostRecentResume.content) {
          console.log('Found inactive resume, returning as active:', mostRecentResume.id);
          return NextResponse.json({
            hasResume: true,
            id: mostRecentResume.id,
            fileName: mostRecentResume.fileName,
            uploadedAt: mostRecentResume.createdAt,
            message: 'Resume found (activated from inactive status)'
          });
        }
      }

      return NextResponse.json({
        hasResume: false,
        message: 'No resume uploaded'
      });
    }

    if (!activeResume.content) {
      return NextResponse.json({
        hasResume: false,
        message: 'No resume uploaded'
      });
    }

    try {
      // Handle both JSON and plain text content
      let extraction;
      try {
        extraction = JSON.parse(activeResume.content);
      } catch (parseError) {
        // If content is not JSON, create a basic structure
        extraction = {
          name: activeResume.content.split('\n')[0] || 'Unknown',
          technicalSkills: activeResume.skills || [],
          softSkills: [],
          yearsOfExperience: 0,
          careerLevel: 'Unknown'
        };
      }

      const summary = {
        fileName: activeResume.fileName,
        uploadedAt: activeResume.createdAt,
        name: extraction.name,
        yearsOfExperience: extraction.yearsOfExperience,
        careerLevel: extraction.careerLevel,
        skillsCount: {
          technical: extraction.technicalSkills?.length || 0,
          soft: extraction.softSkills?.length || 0,
          total: (extraction.technicalSkills?.length || 0) + (extraction.softSkills?.length || 0)
        },
        experienceCount: extraction.experience?.length || 0,
        confidence: extraction.confidence,
        keyStrengths: extraction.keyStrengths?.slice(0, 3) || []
      };

      return NextResponse.json({
        hasResume: true,
        summary,
        lastUpdated: activeResume.createdAt
      });

    } catch (parseError) {
      console.error('Failed to parse stored resume:', parseError);
      return NextResponse.json({
        hasResume: true,
        error: 'Resume data is corrupted. Please re-upload your resume.',
        fileName: activeResume.fileName,
        uploadedAt: activeResume.createdAt
      }, { status: 422 });
    }

  } catch (error) {
    console.error('Resume status check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check resume status' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove resume
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    await prisma.resume.updateMany({
      where: {
        userId: userId,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    // Clear salary analysis cache when resume is deleted
    const clearedCount = await salaryAnalysisPersistence.clearUserCache(userId);
    console.log(`Cleared ${clearedCount} cached salary analyses after resume deletion for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Resume removed successfully'
    });

  } catch (error) {
    console.error('Resume deletion failed:', error);
    return NextResponse.json(
      { error: 'Failed to remove resume' },
      { status: 500 }
    );
  }
}