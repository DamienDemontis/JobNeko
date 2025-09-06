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
  contractType?: string;
  skills?: string[];
  description?: string;
  requirements?: string;
  perks?: string;
  workMode?: 'remote' | 'hybrid' | 'onsite';
  summary?: string;
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
        content: 'You are a professional job data extraction specialist. Your primary goal is to extract ALL relevant information from job postings comprehensively and accurately. Do NOT summarize or shorten content - preserve all important details that would be valuable to job seekers. Focus on completeness, accuracy, and maintaining all specific details about technologies, responsibilities, benefits, and requirements. Be thorough and comprehensive.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const extracted = JSON.parse(response.choices[0].message.content || '{}');
  return normalizeJobData(extracted);
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
    const extracted = JSON.parse(data.response);
    return normalizeJobData(extracted);
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
  return `You are a professional job data extraction specialist. Extract ALL relevant information from the job posting below and return a comprehensive JSON object.

EXAMPLE OUTPUT FORMAT:
{
  "title": "Senior Backend Engineer",
  "company": "TechCorp",
  "location": "San Francisco, CA",
  "salary": "$120,000 - $180,000 per year",
  "salaryMin": 120000,
  "salaryMax": 180000,
  "contractType": "Full-time",
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
5. **SalaryMin/Max**: Extract numeric values from salary string
6. **ContractType**: Must be one of: "Full-time", "Part-time", "Contract", "Freelance", "Internship", "Temporary"
7. **Skills**: Extract ALL mentioned technical skills, tools, languages, frameworks (aim for 8-15 items)
8. **Description**: 
   - Extract the COMPLETE job description
   - Include role overview, main responsibilities, team information
   - Preserve important details about projects, technologies, impact
   - Make it 3-4 paragraphs, well-formatted and comprehensive
9. **Requirements**: 
   - Extract ALL requirements and qualifications (required AND preferred)
   - Include years of experience, technical skills, education, certifications
   - Mention specific tools, platforms, methodologies mentioned
   - Be comprehensive - don't leave out details
10. **Perks**: 
    - Extract ALL benefits, compensation, perks mentioned
    - Include health benefits, time off, equity, professional development
    - Work environment details, equipment, remote work policies
    - Company culture elements, team activities
11. **WorkMode**: "remote", "hybrid", or "onsite" based on the posting
12. **Summary**: 2-3 sentence compelling overview highlighting the role, company, and key selling points

CRITICAL INSTRUCTIONS:
- Be COMPREHENSIVE - don't summarize or shorten important information
- Extract EVERYTHING relevant, don't skip details
- Maintain professional language while preserving all key information
- Include specific technologies, methodologies, team sizes, project details
- Don't generic-ize - keep company-specific and role-specific details
- If information seems important to a job seeker, include it

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

Return ONLY the JSON object with comprehensive, detailed extraction.`;
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

// AI-only extraction - no fallbacks allowed

function normalizeJobData(data: Record<string, any>): ExtractedJobData {
  return {
    title: data.title || 'Unknown Position',
    company: data.company || 'Unknown Company',
    location: data.location,
    salary: data.salary,
    salaryMin: data.salaryMin ? Number(data.salaryMin) : undefined,
    salaryMax: data.salaryMax ? Number(data.salaryMax) : undefined,
    contractType: data.contractType,
    skills: Array.isArray(data.skills) ? data.skills : data.skills?.split(',').map((s: string) => s.trim()),
    description: data.description,
    requirements: data.requirements,
    perks: data.perks,
    workMode: data.workMode,
    summary: data.summary || `${data.title || 'Position'} at ${data.company || 'Unknown Company'}. Review the full description for details.`,
  };
}