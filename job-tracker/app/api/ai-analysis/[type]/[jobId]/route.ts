import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai-service';
import {
  withErrorHandling,
  AuthenticationError,
  ValidationError
} from '@/lib/error-handling';

// Analysis type definitions and their prompts
const ANALYSIS_CONFIGS = {
  timeline_analysis: {
    maxTokens: 3500,
    temperature: 0.3,
    cacheHours: 12,
    requiredFields: ['timeline', 'strategy', 'events'],
    promptTemplate: (job: any, userProfile: any, additionalData?: any) => `
You are an expert application timing strategist. Analyze the optimal application timeline for this job.

JOB DETAILS:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Description: ${job.description || 'No description provided'}

USER CONTEXT:
- Experience Level: ${userProfile?.yearsOfExperience || 0} years
- Location: ${userProfile?.currentLocation || 'Not specified'}

Return a JSON object with this structure:
{
  "applicationWindow": {
    "remainingDays": 14,
    "status": "Active",
    "urgency": "medium"
  },
  "optimalTiming": {
    "recommendation": "Apply within 2-3 days",
    "urgency": "high",
    "reasoning": "Early application increases visibility"
  },
  "timeline": {
    "phases": [
      {
        "name": "Research & Preparation",
        "duration": "1-2 days",
        "status": "pending",
        "description": "Company research and application preparation",
        "actionItems": ["Research company background", "Tailor resume"],
        "deadline": "2024-01-15T00:00:00Z"
      }
    ]
  },
  "strategy": {
    "quickWins": ["Update LinkedIn profile", "Research hiring manager"],
    "longTerm": ["Build relevant portfolio", "Network with employees"],
    "risks": [
      {
        "risk": "Application deadline approaching",
        "mitigation": "Prioritize application submission"
      }
    ]
  },
  "events": [
    {
      "title": "Application Deadline",
      "description": "Final date to submit application",
      "date": "2024-01-20T23:59:59Z",
      "timeframe": "Next week",
      "importance": "high",
      "actionRequired": true,
      "requiredAction": "Submit complete application"
    }
  ],
  "insights": {
    "market": ["High demand for this role", "Competitive application period"],
    "company": ["Fast hiring process", "Values early applications"],
    "personalized": ["Your experience aligns well", "Consider highlighting specific skills"]
  },
  "successPrediction": {
    "rate": 75,
    "factors": ["Strong profile match", "Optimal timing"]
  },
  "analysisDate": "${new Date().toISOString()}"
}

Return ONLY the JSON object, no markdown formatting.`
  },

  communication_generation: {
    maxTokens: 6000,
    temperature: 0.4,
    cacheHours: 2,
    requiredFields: ['generated', 'context'],
    promptTemplate: (job: any, userProfile: any, additionalData?: any) => `
You are an expert communication strategist and professional writer. Generate personalized, context-aware communications for this job application.

JOB DETAILS:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Description: ${job.description || 'No description provided'}

USER CONTEXT:
- Experience Level: ${userProfile?.yearsOfExperience || 0} years
- Location: ${userProfile?.currentLocation || 'Not specified'}

GENERATION SETTINGS:
- Communication Types: ${JSON.stringify(additionalData?.communicationTypes || ['cover_letter'])}
- Tone: ${additionalData?.tone || 'professional'}
- Length: ${additionalData?.length || 'standard'}
- Custom Instructions: ${additionalData?.customInstructions || 'None'}

Generate personalized content for each requested communication type. Use the user's profile and job context to create compelling, targeted content.

Return a JSON object with this structure:
{
  "generated": {
    "cover_letter": {
      "content": "Detailed, personalized cover letter content here...",
      "analysis": {
        "wordCount": 250,
        "toneScore": 9,
        "personalizationLevel": "High",
        "impactScore": "Strong"
      },
      "keyPoints": [
        "Highlighted relevant experience",
        "Connected skills to job requirements",
        "Demonstrated company knowledge"
      ]
    },
    "application_email": {
      "content": "Professional application email content...",
      "analysis": {
        "wordCount": 120,
        "toneScore": 8,
        "personalizationLevel": "High",
        "impactScore": "Strong"
      },
      "keyPoints": [
        "Clear subject line",
        "Concise introduction",
        "Professional closing"
      ]
    }
  },
  "context": {
    "userProfile": {
      "experienceLevel": "Mid-level",
      "skills": ["Backend Development", "API Design"],
      "industryFocus": ["Technology", "Software"]
    },
    "jobMatch": {
      "alignmentScore": 85,
      "keyMatches": ["Technical skills", "Experience level"],
      "differentiators": ["Specific project experience"]
    }
  },
  "analysisDate": "${new Date().toISOString()}"
}

CONTENT REQUIREMENTS:
- Use specific details from job posting
- Incorporate user's background and experience
- Match the requested tone (${additionalData?.tone || 'professional'})
- Adjust length based on preference (${additionalData?.length || 'standard'})
- Include custom instructions: ${additionalData?.customInstructions || 'None'}
- Make each communication type complement the others
- Ensure consistency across all generated content

Return ONLY the JSON object, no markdown formatting.`
  },

  interview_analysis: {
    maxTokens: 4000,
    temperature: 0.3,
    cacheHours: 24,
    requiredFields: ['overallDifficulty', 'processLength', 'interviewTypes'],
    promptTemplate: (job: any, userProfile: any) => `
You are an expert interview coach and recruiter. Analyze the interview process for this specific job.

JOB DETAILS:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Description: ${job.description || 'No description provided'}

USER CONTEXT:
- Experience Level: ${userProfile?.yearsOfExperience || 0} years
- Location: ${userProfile?.currentLocation || 'Not specified'}

Return a JSON object with this structure:
{
  "overallDifficulty": "easy|medium|hard",
  "processLength": "1-2 weeks|2-4 weeks|1-2 months",
  "interviewTypes": [
    {
      "type": "Phone/Video Screening",
      "description": "Initial screening with HR",
      "difficulty": "easy|medium|hard",
      "preparation": ["Research company", "Prepare elevator pitch"]
    }
  ],
  "commonQuestions": [
    {
      "question": "Tell me about yourself",
      "category": "behavioral|technical|situational",
      "difficulty": "easy|medium|hard",
      "tips": ["Focus on relevant experience"]
    }
  ],
  "companySpecificInsights": {
    "culture": ["Company values", "Work environment"],
    "expectations": ["Performance standards"],
    "redFlags": ["Warning signs to watch for"]
  },
  "preparationStrategy": {
    "timeline": "2-3 weeks recommended",
    "priorities": ["Research company", "Practice coding"],
    "resources": ["Company website", "Glassdoor reviews"]
  },
  "analysisDate": "${new Date().toISOString()}"
}

Return ONLY the JSON object, no markdown formatting.`
  },

  network_analysis: {
    maxTokens: 3000,
    temperature: 0.3,
    cacheHours: 12,
    requiredFields: ['networkSummary', 'connections', 'recommendations'],
    promptTemplate: (job: any, userProfile: any, additionalData?: any) => `
You are a professional networking strategist. Analyze networking opportunities for this job application.

JOB DETAILS:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}

USER CONTEXT:
- Experience Level: ${userProfile?.yearsOfExperience || 0} years
- Industry Focus: Technology, Software Development

Return a JSON object with this structure:
{
  "networkSummary": {
    "totalConnections": 150,
    "industryConnections": 45,
    "companyConnections": 8,
    "relevantConnections": 12
  },
  "connections": [
    {
      "name": "Professional Contact",
      "title": "Senior Engineer",
      "company": "${job.company}",
      "relationship": "Former colleague",
      "relevanceScore": 9,
      "outreachStrategy": "Mention shared project experience"
    }
  ],
  "recommendations": [
    {
      "action": "Connect with alumni",
      "priority": "high|medium|low",
      "expectedOutcome": "Insider perspective on company culture",
      "timeline": "1-2 weeks"
    }
  ],
  "outreachTemplates": [
    {
      "scenario": "Cold outreach to employee",
      "subject": "Interest in ${job.title} role",
      "template": "Professional message template"
    }
  ],
  "analysisDate": "${new Date().toISOString()}"
}

Return ONLY the JSON object, no markdown formatting.`
  },

  insider_intelligence: {
    maxTokens: 3500,
    temperature: 0.3,
    cacheHours: 24,
    requiredFields: ['companyInsights', 'teamDynamics', 'strategicIntel'],
    promptTemplate: (job: any, userProfile: any) => `
You are a corporate intelligence analyst. Provide insider insights about this company and role.

JOB DETAILS:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Description: ${job.description || 'No description provided'}

Return a JSON object with this structure:
{
  "companyInsights": {
    "recentNews": ["Major product launch", "Leadership changes"],
    "marketPosition": "Industry leader in 5G technology",
    "challenges": ["Supply chain issues", "Talent retention"],
    "opportunities": ["5G expansion", "Cloud migration"]
  },
  "teamDynamics": {
    "teamSize": "15-20 engineers",
    "workingStyle": "Agile development",
    "collaboration": "Cross-functional teams",
    "remoteFriendly": true
  },
  "strategicIntel": {
    "hiringTrends": ["Expanding engineering team", "Focus on senior talent"],
    "projectPriorities": ["5G infrastructure", "Cloud services"],
    "skillsInDemand": ["Backend development", "Microservices", "Cloud platforms"]
  },
  "employeeInsights": [
    {
      "insight": "Strong engineering culture",
      "source": "Employee reviews",
      "confidence": "high|medium|low"
    }
  ],
  "analysisDate": "${new Date().toISOString()}"
}

Return ONLY the JSON object, no markdown formatting.`
  },

  smart_questions: {
    maxTokens: 3000,
    temperature: 0.4,
    cacheHours: 8,
    requiredFields: ['questions', 'categories'],
    promptTemplate: (job: any, userProfile: any) => `
You are an expert interview strategist. Generate strategic questions for this specific role.

JOB DETAILS:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}

Return a JSON object with this structure:
{
  "questions": [
    {
      "question": "How has the company's focus on 5G technology impacted the strategic priorities for backend development?",
      "category": "strategic|technical|culture|growth",
      "stage": "panel|final|any",
      "priority": "high|medium|low",
      "effectiveness": 9,
      "reasoning": "Shows research depth and connects to role",
      "followUps": ["What role would this position play in that strategy?"]
    }
  ],
  "categories": {
    "strategic": 8,
    "technical": 6,
    "culture": 4,
    "growth": 5
  },
  "customizationTips": [
    "Research recent company announcements",
    "Connect questions to specific role responsibilities"
  ],
  "analysisDate": "${new Date().toISOString()}"
}

Return ONLY the JSON object, no markdown formatting.`
  }
};

// Helper functions
function generateCacheKey(type: string, jobId: string, userId: string, jobData: any): string {
  const data = { type, jobId, userId, company: jobData?.company, title: jobData?.title };
  const input = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `ai_analysis_${type}_${hash.toString(36)}`;
}

// GET - Check for cached analysis
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ type: string; jobId: string }> }
) => {
  const { type, jobId } = await params;
  const { searchParams } = new URL(request.url);
  const checkCache = searchParams.get('checkCache') === 'true';

  if (!checkCache) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Validate auth
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
    where: { id: jobId, userId: user.id }
  });

  if (!job) {
    throw new ValidationError('Job not found');
  }

  const cacheKey = generateCacheKey(type, jobId, user.id, job);

  // Check cache
  const cachedAnalysis = await prisma.aIResponseCache.findFirst({
    where: {
      cacheKey,
      expiresAt: { gt: new Date() }
    }
  });

  if (cachedAnalysis) {
    return NextResponse.json({
      cached: true,
      analysis: JSON.parse(cachedAnalysis.response),
      cacheKey
    });
  }

  return NextResponse.json({
    cached: false,
    analysis: null
  });
});

// POST - Generate fresh analysis
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ type: string; jobId: string }> }
) => {
  const { type, jobId } = await params;

  // Validate analysis type
  if (!ANALYSIS_CONFIGS[type as keyof typeof ANALYSIS_CONFIGS]) {
    return NextResponse.json({ error: 'Invalid analysis type' }, { status: 400 });
  }

  // Check OpenAI config
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'AI service not configured' },
      { status: 503 }
    );
  }

  // Validate auth
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid authentication token');
  }

  // Get request body
  const body = await request.json().catch(() => ({}));

  // Get job and user data
  const [job, userProfile] = await Promise.all([
    prisma.job.findUnique({
      where: { id: jobId, userId: user.id }
    }),
    prisma.userProfile.findUnique({
      where: { userId: user.id }
    })
  ]);

  if (!job) {
    throw new ValidationError('Job not found');
  }

  const config = ANALYSIS_CONFIGS[type as keyof typeof ANALYSIS_CONFIGS];

  console.log(`🤖 Generating ${type} analysis for: ${job.title} at ${job.company}`);

  try {
    // Generate prompt
    const prompt = config.promptTemplate(job, userProfile, body);

    // Call AI service
    const response = await generateCompletion(prompt, {
      max_tokens: config.maxTokens,
      temperature: config.temperature
    });

    if (!response || !response.content) {
      throw new Error(`Failed to generate ${type} analysis`);
    }

    // Parse response
    let analysisData: any;
    try {
      const cleanedContent = response.content
        .replace(/^```json\s*/m, '')
        .replace(/^```\s*/m, '')
        .replace(/\s*```$/m, '')
        .trim();

      analysisData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error(`Failed to parse ${type} response:`, parseError);
      throw new Error('Invalid response format from AI service');
    }

    // Validate response
    const hasRequiredFields = config.requiredFields.every(field => {
      const keys = field.split('.');
      let current = analysisData;
      for (const key of keys) {
        if (!current || typeof current !== 'object' || !(key in current)) {
          return false;
        }
        current = current[key];
      }
      return true;
    });

    if (!hasRequiredFields) {
      console.warn(`${type} analysis missing required fields:`, config.requiredFields);
    }

    // Cache the result
    const cacheKey = generateCacheKey(type, jobId, user.id, job);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.cacheHours);

    await prisma.aIResponseCache.create({
      data: {
        cacheKey,
        response: JSON.stringify(analysisData),
        expiresAt
      }
    });

    console.log(`✅ ${type} analysis completed for ${job.company} - ${job.title}`);

    return NextResponse.json({
      analysis: analysisData,
      cached: false,
      cacheKey
    });

  } catch (error) {
    console.error(`${type} analysis generation failed:`, error);
    throw error;
  }
});