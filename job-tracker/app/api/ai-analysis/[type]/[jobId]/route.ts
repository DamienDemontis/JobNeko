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
    maxTokens: 3500,
    temperature: 0.4,
    cacheHours: 8,
    requiredFields: ['questions', 'redFlagQuestions'],
    promptTemplate: (job: any, userProfile: any) => `
You are an expert interview strategist helping a candidate prepare strategic questions to ask their interviewer.

**CRITICAL**: These are questions the CANDIDATE will ask the INTERVIEWER during the job interview, NOT questions the interviewer asks the candidate.

JOB DETAILS:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location || 'Not specified'}
- Description: ${job.description || 'Not provided'}
- Requirements: ${job.requirements || 'Not provided'}

Generate strategic, thoughtful questions the CANDIDATE should ask the INTERVIEWER during their job interview. These questions should:
1. Demonstrate deep preparation and research about ${job.company}
2. Help the candidate evaluate if this role/company is a good fit
3. Be SPECIFIC to ${job.company} and ${job.title} - NO generic questions
4. Reveal important information about culture, expectations, and potential issues
5. Show genuine interest and critical thinking

Return a JSON object with this EXACT structure:
{
  "questions": [
    {
      "question": "I noticed ${job.company} recently [specific event/news/achievement]. How is that impacting the priorities for this ${job.title} role?",
      "category": "research",
      "priority": "high",
      "effectiveness": 9,
      "reasoning": "Demonstrates company research and connects to role impact",
      "bestTime": "Mid-interview when discussing role responsibilities",
      "followUps": ["What would success look like in supporting that initiative?"]
    }
  ],
  "redFlagQuestions": [
    {
      "question": "What's the typical tenure for someone in this ${job.title} role?",
      "redFlag": "High turnover in the position",
      "goodAnswer": "Average tenure of 3+ years, people leave for promotions",
      "concerningAnswer": "High turnover (< 1 year), vague answers, defensiveness",
      "priority": "high",
      "reasoning": "Reveals stability and growth opportunities"
    }
  ],
  "analysisDate": "${new Date().toISOString()}"
}

**CATEGORIES** - These are MUTUALLY EXCLUSIVE. Each question belongs to ONE category ONLY:

1. **"research"** - Questions about EXTERNAL information about the company:
   - Recent news articles, press releases, earnings reports
   - Industry trends and how ${job.company} compares to competitors
   - Products, services, technology stack, patents
   - Market position, customer base, partnerships
   - Recent acquisitions, funding rounds, leadership changes
   Example: "I read that ${job.company} recently launched X product. How has that affected the engineering roadmap?"

2. **"culture"** - Questions about INTERNAL team environment and work style:
   - Day-to-day work-life balance (hours, flexibility, burnout)
   - Team collaboration style and communication patterns
   - Decision-making processes, autonomy levels
   - Feedback culture, code review practices
   - Remote work policies, office environment
   - Team social events, diversity initiatives
   Example: "How does the team handle work-life balance during sprint deadlines?"

3. **"role"** - Questions about THIS SPECIFIC ${job.title} POSITION:
   - Daily tasks and responsibilities for THIS role
   - Specific tools, languages, frameworks for THIS job
   - Team structure (who you report to, who reports to you)
   - First 30/60/90 days expectations
   - Performance metrics and success criteria for THIS role
   - Onboarding process, training, mentorship
   Example: "What would a typical day look like for this ${job.title} position?"

4. **"strategy"** - Questions about COMPANY-LEVEL future direction:
   - Long-term vision (3-5 year goals)
   - Planned market expansion, new product lines
   - Strategic priorities for the organization
   - Biggest challenges facing the company
   - Competitive advantages and differentiation
   - Growth trajectory and scaling plans
   Example: "What are ${job.company}'s top 3 strategic priorities for the next 2 years?"

**STRICT RULES TO AVOID OVERLAP**:
- DO NOT ask about "career growth" in role questions → That belongs in "culture" (internal team environment)
- DO NOT ask about "company challenges" in role questions → That belongs in "strategy" (company-level)
- DO NOT ask about "team size" in research questions → That belongs in "role" (specific to this position)
- DO NOT ask about "work culture" in role questions → That belongs in "culture" category
- DO NOT ask about "product roadmap" in role questions → That belongs in "strategy" (company future)

Each question MUST fit ONLY ONE category. If a question could fit multiple categories, it's TOO BROAD - make it more specific.

**REQUIREMENTS**:
- Generate EXACTLY 12-16 strategic questions distributed across categories:
  * 3-4 **research** questions - ONLY about external company info, news, industry, competitors
    Example: "I noticed ${job.company} was mentioned in [article] about [topic]. How does that impact your position in the market?"

  * 3-4 **culture** questions - ONLY about internal team environment, work-life balance, collaboration
    Example: "How does the team typically handle on-call rotations and work-life balance?"

  * 3-4 **role** questions - ONLY about THIS specific ${job.title} position's day-to-day work
    Example: "What tools and technologies would I be working with daily in this ${job.title} role?"

  * 3-4 **strategy** questions - ONLY about company-wide future direction and long-term goals
    Example: "What are the company's main strategic priorities for the next 18-24 months?"

- Each question MUST be categorized correctly. Double-check that:
  * Research questions mention external sources (news, reports, industry data)
  * Culture questions focus on HOW people work together
  * Role questions are specific to THIS ${job.title} position
  * Strategy questions discuss company-wide goals, not team-level plans
- Generate 6-8 red flag questions covering:
  * Turnover and tenure
  * Work-life balance red flags
  * Management and leadership issues
  * Team dynamics problems
  * Role clarity and expectations
  * Growth and development limitations
- ALL questions must be specific to ${job.company} and ${job.title}
- NO generic questions like "What does success look like?" or "Describe the culture"
- Include specific details from job description and requirements
- "effectiveness" should be 7-10 (these are high-value questions)

**PRIORITY LEVELS**:
- "high": Must-ask questions that reveal critical information
- "medium": Important questions that provide valuable insights
- "low": Nice-to-have questions if time permits

**FINAL VALIDATION BEFORE RETURNING**:
Before you return the JSON, verify:
1. Each category has 3-4 DIFFERENT questions
2. NO question appears in multiple categories
3. Research questions mention external sources/data
4. Culture questions focus on team environment/work style
5. Role questions are specific to the ${job.title} position
6. Strategy questions discuss company-wide future plans
7. No overlap between categories

If you find any duplicate topics across categories, REWRITE those questions to be more specific to their category.

Return ONLY the JSON object, no markdown formatting, no additional text.`
  }
};

// Helper functions removed - using unified cache system

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

  // Check cache using JobAnalysisCache (unified cache system)
  const cachedAnalysis = await prisma.jobAnalysisCache.findFirst({
    where: {
      jobId,
      userId: user.id,
      analysisType: type,
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
      cacheKey: `${type}_${jobId}_${user.id}`
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

  // Validate auth
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid authentication token');
  }

  // Get user's API key (handles encryption and platform fallback securely)
  const { getUserApiKey } = await import('@/lib/utils/api-key-helper');
  const apiKey = await getUserApiKey(user.id);

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
      temperature: config.temperature,
      apiKey // Pass user's API key
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

    // Cache the result using JobAnalysisCache (unified cache system)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.cacheHours);

    // Delete existing cache entries for this analysis type
    await prisma.jobAnalysisCache.deleteMany({
      where: {
        jobId,
        userId: user.id,
        analysisType: type
      }
    });

    // Create new cache entry
    await prisma.jobAnalysisCache.create({
      data: {
        jobId,
        userId: user.id,
        analysisType: type,
        analysisData: JSON.stringify(analysisData),
        expiresAt
      }
    });

    console.log(`✅ ${type} analysis completed for ${job.company} - ${job.title}`);

    return NextResponse.json({
      analysis: analysisData,
      cached: false,
      cacheKey: `${type}_${jobId}_${user.id}`
    });

  } catch (error) {
    console.error(`${type} analysis generation failed:`, error);
    throw error;
  }
});