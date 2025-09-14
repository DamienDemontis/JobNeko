import OpenAI from 'openai';

// Initialize OpenAI client if API key is available
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// Ollama client configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';

// Available AI models in order of preference
const AI_MODELS = {
  openai: 'gpt-3.5-turbo',
  ollama: 'llama3.1:8b', // Popular local model
  fallback: 'manual'
};

export interface ExtractedJobData {
  title: string;
  company: string;
  location?: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryFrequency?: 'annual' | 'monthly' | 'hourly';
  contractType?: string;
  
  // Enhanced Compensation Details
  bonusStructure?: {
    type: string; // 'performance' | 'annual' | 'signing' | 'retention'
    amount?: number;
    percentage?: number;
    frequency?: string;
  };
  equityOffered?: {
    type: 'RSU' | 'options' | 'shares' | 'phantom';
    amount?: string;
    vestingPeriod?: string;
    vestingSchedule?: string;
  };
  totalCompMin?: number;
  totalCompMax?: number;
  isNegotiable?: boolean;
  remotePayAdjustment?: boolean;

  // Enhanced Job Details
  department?: string;
  teamSize?: string;
  reportingStructure?: string;
  experienceLevel?: string;
  educationRequirements?: string;
  industryFocus?: string;

  // Comprehensive Skills and Technologies
  skills?: string[];
  programmingLanguages?: string[];
  frameworks?: string[];
  tools?: string[];
  softSkills?: string[];
  certifications?: string[];

  // Detailed Content
  description?: string;
  responsibilities?: string[];
  requirements?: string;
  qualifications?: string[];
  preferredQualifications?: string[];

  // Benefits and Compensation Details
  perks?: string;
  benefits?: string[];
  healthInsurance?: string;
  retirement?: string;
  vacation?: string;
  flexibleSchedule?: boolean;
  professionalDevelopment?: string;

  // Company Culture and Environment
  companySize?: string;
  companyDescription?: string;
  missionValues?: string;
  workEnvironment?: string;
  dresscode?: string;

  // Application Process
  applicationProcess?: string;
  applicationDeadline?: string;
  startDate?: string;
  interviewProcess?: string;

  // Project and Role Context
  projectDetails?: string;
  clientTypes?: string[];
  travelRequirements?: string;
  overtime?: string;

  // Growth and Career
  careerProgression?: string;
  mentorship?: string;
  trainingOpportunities?: string[];

  // Work Mode and Flexibility
  workMode?: 'remote' | 'hybrid' | 'onsite';

  // Summary and Insights
  summary?: string;
  keyHighlights?: string[];
  potentialChallenges?: string[];
  uniqueSellingPoints?: string[];
}

export async function extractJobDataWithAI(
  pageData: {
    url: string;
    html?: string;
    text?: string;
    title?: string;
    structured?: Record<string, any>;
  }
): Promise<ExtractedJobData> {
  // Try AI services in order of preference
  const aiServices = [
    { name: 'openai', available: !!openai },
    { name: 'ollama', available: await isOllamaAvailable() },
  ];

  const availableService = aiServices.find(service => service.available);
  
  if (!availableService) {
    throw new Error('No AI services configured. Please set up OpenAI API key or run Ollama locally. AI extraction is required for job processing.');
  }

  console.log(`Using ${availableService.name} for job extraction`);
  
  if (availableService.name === 'openai') {
    return await extractWithOpenAI(pageData);
  } else if (availableService.name === 'ollama') {
    return await extractWithOllama(pageData);
  }

  throw new Error('AI extraction failed. No fallback available.');
}

async function extractWithOpenAI(pageData: any): Promise<ExtractedJobData> {
  const prompt = createExtractionPrompt(pageData);

  const response = await openai!.chat.completions.create({
    model: AI_MODELS.openai,
    messages: [
      {
        role: 'system',
        content: 'You are an expert job data extraction specialist. Your primary goal is to extract ALL relevant information from job postings comprehensively and accurately. Do NOT summarize or shorten content - preserve all important details that would be valuable to job seekers. Focus on completeness, accuracy, and maintaining all specific details about technologies, responsibilities, benefits, and requirements. Be thorough and comprehensive. CRITICAL: Always return valid JSON only - no explanations or additional text.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  try {
    const extracted = JSON.parse(response.choices[0].message.content || '{}');
    return normalizeJobData(extracted);
  } catch (error) {
    console.error('Failed to parse OpenAI job extraction response:', error);
    console.error('Response was:', response.choices[0].message.content?.substring(0, 200));
    throw new Error('AI returned invalid JSON for job extraction. Please try again.');
  }
}

async function extractWithOllama(pageData: any): Promise<ExtractedJobData> {
  const prompt = createExtractionPrompt(pageData);
  const systemPrompt = 'You are a professional job data extraction specialist. Extract ALL relevant information from job postings comprehensively and accurately. Do NOT summarize or shorten content - preserve all important details that would be valuable to job seekers. Focus on completeness, accuracy, and maintaining all specific details about technologies, responsibilities, benefits, and requirements.';

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODELS.ollama,
        prompt: `${systemPrompt}\n\n${prompt}\n\nRespond only with valid JSON containing comprehensive job information:`,
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    try {
      const extracted = JSON.parse(data.response);
      return normalizeJobData(extracted);
    } catch (parseError) {
      console.error('Failed to parse Ollama job extraction response:', parseError);
      console.error('Response was:', data.response?.substring(0, 200));
      throw new Error('AI returned invalid JSON for job extraction. Please try again.');
    }
  } catch (error) {
    console.error('Ollama extraction error:', error);
    throw error;
  }
}

async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

function createExtractionPrompt(pageData: any): string {
  return `You are a professional job data extraction specialist. Extract ALL relevant information from the job posting below and return a comprehensive JSON object with enhanced compensation analysis.

EXAMPLE OUTPUT FORMAT:
{
  "title": "Senior Backend Engineer",
  "company": "TechCorp",
  "location": "San Francisco, CA",
  "salary": "$120,000 - $180,000 per year",
  "salaryMin": 120000,
  "salaryMax": 180000,
  "salaryCurrency": "USD",
  "salaryFrequency": "annual",
  "contractType": "Full-time",
  "bonusStructure": {
    "type": "performance",
    "percentage": 15,
    "frequency": "annual"
  },
  "equityOffered": {
    "type": "RSU",
    "amount": "$50,000",
    "vestingPeriod": "4 years",
    "vestingSchedule": "25% each year"
  },
  "totalCompMin": 140000,
  "totalCompMax": 220000,
  "isNegotiable": true,
  "remotePayAdjustment": false,
  "skills": ["Python", "Django", "PostgreSQL", "AWS", "Docker", "Kubernetes", "Redis"],
  "description": "Join our backend engineering team to build scalable microservices that power our platform. You'll design and implement APIs, optimize database performance, and collaborate with cross-functional teams to deliver high-quality software. We're looking for someone passionate about clean code, system design, and mentoring junior developers.",
  "requirements": "5+ years of backend development experience with Python and Django. Strong understanding of relational databases, particularly PostgreSQL. Experience with cloud platforms like AWS, containerization with Docker, and orchestration with Kubernetes. Knowledge of caching strategies with Redis. Proven track record of building and maintaining production systems at scale.",
  "perks": "Comprehensive health insurance including dental and vision. Flexible work arrangements with remote options. Professional development budget of $3,000 annually. Stock options and 401k matching. Unlimited PTO policy. Modern equipment and home office stipend. Team retreats and learning conferences.",
  "workMode": "remote",
  "summary": "Senior Backend Engineer role at TechCorp focusing on scalable microservices development with Python and Django. Remote-friendly position offering excellent benefits, professional development opportunities, and the chance to work on high-impact systems serving millions of users."
}

EXTRACTION REQUIREMENTS:
1. **Title**: Extract the exact job title, remove company name if included
2. **Company**: Company name only
3. **Location**: Full location or "Remote" if applicable
4. **Salary**: Complete salary information including currency, range, and period
5. **SalaryMin/Max**: Extract numeric values from salary string (convert to annual if needed)
6. **SalaryCurrency**: Extract currency code (USD, EUR, GBP, CAD, etc.) or symbol detection
7. **SalaryFrequency**: "annual", "monthly", or "hourly" based on the posting
8. **ContractType**: Must be one of: "Full-time", "Part-time", "Contract", "Freelance", "Internship", "Temporary"
9. **BonusStructure**: Extract bonus information including:
   - Type: "performance", "annual", "signing", "retention", "quarterly"
   - Amount (if specified) or percentage of base salary
   - Frequency: "annual", "quarterly", "monthly", "one-time"
10. **EquityOffered**: Extract equity compensation details:
    - Type: "RSU" (Restricted Stock Units), "options", "shares", "phantom"
    - Amount: dollar value or number of shares/options
    - Vesting period: "4 years", "3 years", etc.
    - Vesting schedule: "25% each year", "monthly", "cliff + monthly"
11. **TotalCompMin/Max**: Calculate total compensation including base + bonus + equity value
12. **IsNegotiable**: Look for phrases like "negotiable", "competitive", "depending on experience"
13. **RemotePayAdjustment**: Check if salary is adjusted based on location for remote roles
14. **Skills**: Extract ALL mentioned technical skills, tools, languages, frameworks (aim for 8-15 items)
15. **Description**: 
    - Extract the COMPLETE job description
    - Include role overview, main responsibilities, team information
    - Preserve important details about projects, technologies, impact
    - Make it 3-4 paragraphs, well-formatted and comprehensive
16. **Requirements**: 
    - Extract ALL requirements and qualifications (required AND preferred)
    - Include years of experience, technical skills, education, certifications
    - Mention specific tools, platforms, methodologies mentioned
    - Be comprehensive - don't leave out details
17. **Perks**: 
    - Extract ALL benefits, compensation, perks mentioned
    - Include health benefits, time off, equity, professional development
    - Work environment details, equipment, remote work policies
    - Company culture elements, team activities
18. **WorkMode**: "remote", "hybrid", or "onsite" based on the posting
19. **Summary**: 2-3 sentence compelling overview highlighting the role, company, and key selling points

SPECIAL COMPENSATION PARSING INSTRUCTIONS:
- Look for bonus mentions: "up to X% bonus", "annual bonus", "performance bonus", "signing bonus"
- Identify equity: "stock options", "RSUs", "equity grant", "shares", "ownership stake"
- Calculate total comp: base salary + estimated bonus + equity value (if provided)
- Detect currency from symbols ($, £, €, ¥, ₹) or explicit currency codes
- Convert hourly/monthly to annual: hourly × 2080, monthly × 12
- Look for location-based pay: "salary varies by location", "geographic pay zones"

CRITICAL INSTRUCTIONS FOR COMPREHENSIVE EXTRACTION:
- Be COMPREHENSIVE - don't summarize or shorten important information
- Extract EVERYTHING relevant, don't skip details
- Maintain professional language while preserving all key information
- Include specific technologies, methodologies, team sizes, project details
- Don't generic-ize - keep company-specific and role-specific details
- If information seems important to a job seeker, include it

ENHANCED EXTRACTION REQUIREMENTS:
- TEAM DETAILS: Extract team size, department, reporting structure, collaboration style
- COMPANY CULTURE: Mission, values, work environment, dress code, company size
- BENEFITS: Detailed breakdown of health, retirement, PTO, professional development
- GROWTH: Career progression paths, mentorship, training opportunities
- PROJECT CONTEXT: Specific projects, client types, industry focus
- PROCESS: Application steps, interview process, start date, deadlines
- SKILLS BREAKDOWN: Separate technical skills, frameworks, tools, soft skills, certifications
- UNIQUE ASPECTS: What makes this role special, key selling points, potential challenges
- WORK FLEXIBILITY: Remote policy details, schedule flexibility, travel requirements

SALARY EXTRACTION RULES:
- ONLY extract salary if it contains specific numbers or ranges
- DO NOT extract generic terms like: "Variable", "Competitive", "Negotiable", "DOE", "TBD", "Market rate", "Attractive", "Excellent", "Fair", "Open", "Commensurate with experience"
- If salary field contains only generic terms without numbers, leave salary field empty/null
- Examples of VALID salaries: "$80,000 - $120,000", "€50k per year", "£40-60K", "$75/hour"
- Examples of INVALID salaries (leave empty): "Variable salary", "Competitive compensation", "Salary DOE", "TBD based on experience"
- If you see both generic terms AND numbers, extract the numbers: "Competitive salary $90K" → "$90K"

JOB POSTING CONTENT:
URL: ${pageData.url}
Title: ${pageData.title}
${pageData.structured ? `Structured Data: ${JSON.stringify(pageData.structured)}` : ''}
${pageData.jobTitle ? `Detected Job Title: ${pageData.jobTitle}` : ''}
${pageData.company ? `Detected Company: ${pageData.company}` : ''}
${pageData.location ? `Detected Location: ${pageData.location}` : ''}
${pageData.salary ? `Detected Salary: ${pageData.salary}` : ''}
${pageData.description ? `Detected Description: ${pageData.description}` : ''}
${pageData.requirements ? `Detected Requirements: ${pageData.requirements}` : ''}
${pageData.skills ? `Detected Skills: ${pageData.skills}` : ''}
${pageData.workMode ? `Detected Work Mode: ${pageData.workMode}` : ''}

FULL TEXT CONTENT (MOST IMPORTANT - Extract from here):
${pageData.text?.substring(0, 8000)}

ENHANCED OUTPUT REQUIREMENTS:
- Populate ALL available fields from the comprehensive schema above
- Use arrays for lists (skills, responsibilities, benefits, etc.)
- Include detailed analysis in summary, keyHighlights, potentialChallenges
- Extract specific details, not generic statements
- Categorize skills properly (programmingLanguages vs frameworks vs tools)
- Provide actionable insights in the AI analysis fields

Return ONLY the JSON object with comprehensive, detailed extraction using ALL available fields.`;
}

export async function extractResumeData(pdfText: string): Promise<Record<string, any>> {
  if (!openai) {
    throw new Error('OpenAI API key required for resume extraction. Please configure OPENAI_API_KEY in your environment.');
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'Extract structured information from resume text. Return JSON with: skills (array), experience (array of {title, company, duration, description}), education (array of {degree, institution, year}).',
      },
      {
        role: 'user',
        content: `Extract resume information from: ${pdfText.substring(0, 4000)}`,
      },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

export async function calculateJobMatch(resumeData: Record<string, any>, jobData: Record<string, any>): Promise<number> {
  if (!openai) {
    throw new Error('OpenAI API key required for job matching. Please configure OPENAI_API_KEY in your environment.');
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'Calculate a match percentage (0-100) between a resume and job posting. Consider skills match, experience relevance, and requirements fulfillment.',
      },
      {
        role: 'user',
        content: `Resume: ${JSON.stringify(resumeData)}\n\nJob: ${JSON.stringify(jobData)}\n\nReturn only a number between 0 and 100.`,
      },
    ],
    temperature: 0,
  });

  const score = parseFloat(response.choices[0].message.content || '0');
  return Math.min(100, Math.max(0, score));
}

/**
 * General-purpose AI completion function for various AI tasks
 */
export async function generateCompletion(
  prompt: string, 
  options: {
    max_tokens?: number;
    temperature?: number;
  } = {}
): Promise<{ content: string } | null> {
  // Try AI services in order of preference
  const aiServices = [
    { name: 'openai', available: !!openai },
    { name: 'ollama', available: await isOllamaAvailable() },
  ];

  const availableService = aiServices.find(service => service.available);
  
  if (!availableService) {
    console.warn('No AI services configured for completion generation');
    return null;
  }

  try {
    if (availableService.name === 'openai') {
      const response = await openai!.chat.completions.create({
        model: AI_MODELS.openai,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: options.max_tokens || 800,
        temperature: options.temperature || 0.3,
      });

      return {
        content: response.choices[0].message.content || ''
      };
    } else if (availableService.name === 'ollama') {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_MODELS.ollama,
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: data.response || ''
      };
    }
  } catch (error) {
    console.error(`AI completion failed with ${availableService.name}:`, error);
    return null;
  }

  return null;
}

// AI-only extraction - no fallbacks allowed

function normalizeJobData(data: Record<string, any>): ExtractedJobData {
  // Enhanced salary parsing with better currency detection
  const salaryMin = data.salaryMin ? Number(data.salaryMin) : undefined;
  const salaryMax = data.salaryMax ? Number(data.salaryMax) : undefined;
  
  // Auto-detect currency from salary string if not provided
  let salaryCurrency = data.salaryCurrency;
  if (!salaryCurrency && data.salary) {
    const currencyMatch = data.salary.match(/([£€$¥₹]|USD|EUR|GBP|CAD|AUD|JPY|INR|CHF|SGD)/i);
    if (currencyMatch) {
      const currencyMap: Record<string, string> = {
        '$': 'USD', '£': 'GBP', '€': 'EUR', '¥': 'JPY', '₹': 'INR'
      };
      salaryCurrency = currencyMap[currencyMatch[0]] || currencyMatch[0].toUpperCase();
    } else {
      salaryCurrency = 'USD'; // default fallback
    }
  }
  
  // Auto-detect frequency from salary string if not provided
  let salaryFrequency = data.salaryFrequency;
  if (!salaryFrequency && data.salary) {
    if (/\b(hour|hr|hourly)\b/i.test(data.salary)) {
      salaryFrequency = 'hourly';
    } else if (/\b(month|monthly|mo)\b/i.test(data.salary)) {
      salaryFrequency = 'monthly';
    } else {
      salaryFrequency = 'annual';
    }
  }
  
  // Parse negotiability from salary string or description
  let isNegotiable = data.isNegotiable;
  if (isNegotiable === undefined) {
    const negotiableKeywords = /\b(negotiable|competitive|depending on experience|DOE|commensurate)\b/i;
    isNegotiable = negotiableKeywords.test(data.salary || '') || 
                   negotiableKeywords.test(data.description || '') || 
                   negotiableKeywords.test(data.perks || '');
  }
  
  // Detect remote pay adjustment mentions
  let remotePayAdjustment = data.remotePayAdjustment;
  if (remotePayAdjustment === undefined) {
    const adjustmentKeywords = /\b(location.based|geographic.zones|salary.varies|location.adjustment|cost.of.living.adjustment)\b/i;
    remotePayAdjustment = adjustmentKeywords.test(data.salary || '') || 
                          adjustmentKeywords.test(data.description || '') || 
                          adjustmentKeywords.test(data.perks || '');
  }
  
  return {
    title: data.title || 'Unknown Position',
    company: data.company || 'Unknown Company',
    location: data.location,
    salary: data.salary,
    salaryMin,
    salaryMax,
    salaryCurrency,
    salaryFrequency: salaryFrequency as 'annual' | 'monthly' | 'hourly',
    contractType: data.contractType,
    bonusStructure: data.bonusStructure ? {
      type: data.bonusStructure.type || 'performance',
      amount: data.bonusStructure.amount ? Number(data.bonusStructure.amount) : undefined,
      percentage: data.bonusStructure.percentage ? Number(data.bonusStructure.percentage) : undefined,
      frequency: data.bonusStructure.frequency || 'annual'
    } : undefined,
    equityOffered: data.equityOffered ? {
      type: data.equityOffered.type as 'RSU' | 'options' | 'shares' | 'phantom',
      amount: data.equityOffered.amount,
      vestingPeriod: data.equityOffered.vestingPeriod,
      vestingSchedule: data.equityOffered.vestingSchedule
    } : undefined,
    totalCompMin: data.totalCompMin ? Number(data.totalCompMin) : undefined,
    totalCompMax: data.totalCompMax ? Number(data.totalCompMax) : undefined,
    isNegotiable,
    remotePayAdjustment,
    skills: Array.isArray(data.skills) ? data.skills : data.skills?.split(',').map((s: string) => s.trim()),
    description: data.description,
    requirements: data.requirements,
    perks: data.perks,
    workMode: data.workMode as 'remote' | 'hybrid' | 'onsite',
    summary: data.summary || `${data.title || 'Position'} at ${data.company || 'Unknown Company'}. Review the full description for details.`,
  };
}