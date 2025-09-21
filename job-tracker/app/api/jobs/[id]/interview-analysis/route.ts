import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai-service';
import {
  withErrorHandling,
  AuthenticationError,
  ValidationError
} from '@/lib/error-handling';

interface InterviewAnalysisData {
  overallDifficulty: string;
  processLength: string;
  interviewTypes: Array<{
    type: string;
    description: string;
    difficulty: string;
    preparation: string[];
  }>;
  commonQuestions: Array<{
    question: string;
    category: string;
    difficulty: string;
    tips: string[];
  }>;
  companySpecificInsights: {
    culture: string[];
    expectations: string[];
    redFlags: string[];
  };
  preparationStrategy: {
    timeline: string;
    priorities: string[];
    resources: string[];
  };
  successMetrics: Array<{
    metric: string;
    target: string;
    importance: string;
  }>;
  analysisDate: string;
}

// Helper to generate cache key
function generateCacheKey(jobId: string, userId: string, jobData: any): string {
  const data = {
    jobId,
    userId,
    company: jobData?.company,
    title: jobData?.title,
    location: jobData?.location
  };
  const input = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `interview_analysis_${hash.toString(36)}`;
}

// GET method to check for cached analysis
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const checkCache = searchParams.get('checkCache') === 'true';

  if (!checkCache) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Validate authentication
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid authentication token');
  }

  // Get job data
  const job = await prisma.job.findUnique({
    where: { id, userId: user.id }
  });

  if (!job) {
    throw new ValidationError('Job not found');
  }

  const cacheKey = generateCacheKey(id, user.id, job);

  // Check for cached analysis using unified cache system
  const cachedAnalysis = await prisma.jobAnalysisCache.findFirst({
    where: {
      jobId: id,
      userId: user.id,
      analysisType: 'interview_analysis',
      expiresAt: { gt: new Date() }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (cachedAnalysis) {
    return NextResponse.json({
      cached: true,
      analysis: JSON.parse(cachedAnalysis.analysisData),
      cacheKey: `interview_analysis_${id}_${user.id}`
    });
  }

  return NextResponse.json({
    cached: false,
    analysis: null
  });
});

// POST method to generate fresh analysis
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  // Check if OpenAI is configured
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'AI service not configured. Please set OPENAI_API_KEY in environment variables.' },
      { status: 503 }
    );
  }

  // Validate authentication
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid authentication token');
  }

  // Get job and user data
  const [job, userProfile] = await Promise.all([
    prisma.job.findUnique({
      where: { id, userId: user.id }
    }),
    prisma.userProfile.findUnique({
      where: { userId: user.id }
    })
  ]);

  if (!job) {
    throw new ValidationError('Job not found');
  }

  console.log(`🎯 Generating interview analysis for job: ${job.title} at ${job.company}`);

  try {
    const analysisPrompt = `
You are an expert interview coach and recruiter with deep knowledge of company-specific interview processes. Analyze the following job posting and provide comprehensive interview intelligence.

JOB DETAILS:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Description: ${job.description || 'No description provided'}

USER PROFILE:
- Experience Level: ${userProfile?.yearsOfExperience || 0} years
- Current Location: ${userProfile?.currentLocation || 'Not specified'}

Provide a detailed interview analysis in the following JSON format:

{
  "overallDifficulty": "easy|medium|hard",
  "processLength": "1-2 weeks|2-4 weeks|1-2 months|2+ months",
  "interviewTypes": [
    {
      "type": "Phone/Video Screening",
      "description": "Initial screening with HR or hiring manager",
      "difficulty": "easy|medium|hard",
      "preparation": ["Research company basics", "Prepare elevator pitch"]
    }
  ],
  "commonQuestions": [
    {
      "question": "Tell me about yourself",
      "category": "behavioral|technical|situational",
      "difficulty": "easy|medium|hard",
      "tips": ["Focus on relevant experience", "Keep it concise"]
    }
  ],
  "companySpecificInsights": {
    "culture": ["Company values", "Work environment"],
    "expectations": ["Performance standards", "Skills needed"],
    "redFlags": ["Warning signs to watch for"]
  },
  "preparationStrategy": {
    "timeline": "2-3 weeks recommended",
    "priorities": ["Research company", "Practice coding"],
    "resources": ["Company website", "Glassdoor reviews"]
  },
  "successMetrics": [
    {
      "metric": "Technical Competency",
      "target": "Demonstrate proficiency in required technologies",
      "importance": "critical|high|medium|low"
    }
  ],
  "analysisDate": "${new Date().toISOString()}"
}

ANALYSIS REQUIREMENTS:
- Provide realistic, company-specific insights based on industry standards
- Include specific preparation recommendations
- Consider the user's experience level
- Be practical and actionable
- Include both positive opportunities and potential challenges

Return ONLY the JSON object, no markdown formatting or explanations.`;

    const response = await generateCompletion(analysisPrompt, {
      max_tokens: 4000,
      temperature: 0.3
    });

    if (!response || !response.content) {
      throw new Error('Failed to generate interview analysis');
    }

    // Parse and validate the response
    let analysisData: InterviewAnalysisData;
    try {
      // Clean the response
      const cleanedContent = response.content
        .replace(/^```json\s*/m, '')
        .replace(/^```\s*/m, '')
        .replace(/\s*```$/m, '')
        .trim();

      analysisData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse interview analysis response:', parseError);
      throw new Error('Invalid response format from AI service');
    }

    // Cache the analysis
    const cacheKey = generateCacheKey(id, user.id, job);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Cache for 24 hours

    // Delete existing cache entries for this analysis type
    await prisma.jobAnalysisCache.deleteMany({
      where: {
        jobId: id,
        userId: user.id,
        analysisType: 'interview_analysis'
      }
    });

    // Create new cache entry using unified cache system
    await prisma.jobAnalysisCache.create({
      data: {
        jobId: id,
        userId: user.id,
        analysisType: 'interview_analysis',
        analysisData: JSON.stringify(analysisData),
        expiresAt
      }
    });

    console.log(`✅ Interview analysis completed for ${job.company} - ${job.title}`);

    return NextResponse.json({
      analysis: analysisData,
      cached: false
    });

  } catch (error) {
    console.error('Interview analysis generation failed:', error);
    throw error;
  }
});