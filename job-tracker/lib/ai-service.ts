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
    console.log('No AI services available, using enhanced fallback extraction');
    return enhancedFallbackExtraction(pageData);
  }

  try {
    console.log(`Using ${availableService.name} for job extraction`);
    
    if (availableService.name === 'openai') {
      return await extractWithOpenAI(pageData);
    } else if (availableService.name === 'ollama') {
      return await extractWithOllama(pageData);
    }
  } catch (error) {
    console.error(`${availableService.name} extraction error:`, error);
  }

  // Fallback to enhanced extraction if AI fails
  return enhancedFallbackExtraction(pageData);
}

async function extractWithOpenAI(pageData: any): Promise<ExtractedJobData> {
  const prompt = createExtractionPrompt(pageData);

  const response = await openai!.chat.completions.create({
    model: AI_MODELS.openai,
    messages: [
      {
        role: 'system',
        content: 'You are an expert job data extraction and enhancement assistant. Your goal is to create clean, professional, and consistent job listings. Always prioritize clarity, readability, and professional presentation. Remove marketing fluff and focus on concrete information that job seekers need.',
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
  const systemPrompt = 'You are an expert job data extraction assistant. Extract and format job information as clean, professional JSON. Focus on accuracy and consistency.';

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODELS.ollama,
        prompt: `${systemPrompt}\n\n${prompt}\n\nRespond only with valid JSON:`,
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
  return `Extract and enhance job information from the following webpage content. Return a JSON object with these fields:
    
    IMPORTANT FORMATTING REQUIREMENTS:
    - title: Clean, professional job title (remove company name if duplicated)
    - company: Company name only
    - location: City, State/Country format (e.g., "San Francisco, CA" or "Remote")
    - salary: Clean salary range (e.g., "$80,000 - $120,000 per year" or "$45/hour")
    - salaryMin: minimum salary as number (extract from salary string)
    - salaryMax: maximum salary as number (extract from salary string)
    - contractType: Use only: "Full-time", "Part-time", "Contract", "Freelance", "Internship", or "Temporary"
    - skills: Array of 5-8 most important technical skills (clean, standardized names like "React", "Python", "AWS")
    - description: Clean, well-structured job description (2-3 paragraphs, remove excessive formatting/bullets)
    - requirements: Clear, concise requirements summary (remove "Required:" headers, make it flow naturally)
    - perks: Benefits and perks in a readable format (remove bullet points, make it paragraph form)
    - workMode: Use only "remote", "hybrid", or "onsite"
    - summary: Create a compelling 2-3 sentence summary highlighting the role's key aspects, responsibilities, and what makes it attractive

    CONSISTENCY RULES:
    - Always use proper capitalization and professional language
    - Remove redundant information between sections
    - Make descriptions readable and engaging, not just copy-paste
    - Focus on the most important and unique aspects of the role
    - Standardize skill names (e.g., "React.js" → "React", "Javascript" → "JavaScript")

    Page content:
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
    Text: ${pageData.text?.substring(0, 4000)}`;
}

export async function extractResumeData(pdfText: string): Promise<Record<string, any>> {
  if (!openai) {
    return fallbackResumeExtraction(pdfText);
  }

  try {
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
  } catch (error) {
    console.error('Resume extraction error:', error);
    return fallbackResumeExtraction(pdfText);
  }
}

export async function calculateJobMatch(resumeData: Record<string, any>, jobData: Record<string, any>): Promise<number> {
  if (!openai) {
    return fallbackMatchCalculation(resumeData, jobData);
  }

  try {
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
  } catch (error) {
    console.error('Match calculation error:', error);
    return fallbackMatchCalculation(resumeData, jobData);
  }
}

// Enhanced fallback extraction when AI is not available
function enhancedFallbackExtraction(pageData: Record<string, any>): ExtractedJobData {
  const text = pageData.text || pageData.pageText || '';
  const structured = pageData.structured || {};
  
  // Use Chrome extension detected data first, then fallback to patterns
  const title = pageData.jobTitle || structured.title || pageData.title || extractPattern(text, /(?:job title|position|role):?\s*([^\n]+)/i) || 'Unknown Position';
  const company = pageData.company || structured.company || extractPattern(text, /(?:company|employer|organization):?\s*([^\n]+)/i) || 'Unknown Company';
  const location = pageData.location || structured.location || extractPattern(text, /(?:location|address):?\s*([^\n]+)/i);
  const salary = pageData.salary || structured.salary || extractSalary(text);
  const description = pageData.description || structured.description || extractLongDescription(text);
  const requirements = pageData.requirements || extractRequirementsFromText(text);
  const skills = pageData.skills ? pageData.skills.split(',').map((s: string) => s.trim()) : extractSkills(text);
  const workMode = pageData.workMode || detectWorkMode(text);
  
  // Create a better summary using available data
  const summaryParts = [];
  if (title !== 'Unknown Position') summaryParts.push(`${title} position`);
  if (company !== 'Unknown Company') summaryParts.push(`at ${company}`);
  if (location) summaryParts.push(`in ${location}`);
  if (workMode) summaryParts.push(`(${workMode})`);
  
  const summary = summaryParts.length > 0 
    ? `${summaryParts.join(' ')}. ${description ? extractFirstSentence(description) : 'Review the full description for more details.'}`
    : `${title} position at ${company}. Review the full description for more details about this opportunity.`;
  
  return {
    title,
    company,
    location,
    salary,
    salaryMin: extractSalaryNumber(salary, 'min'),
    salaryMax: extractSalaryNumber(salary, 'max'),
    contractType: extractContractType(text),
    skills,
    description,
    requirements,
    perks: extractPerks(text),
    workMode,
    summary: summary.substring(0, 500), // Limit summary length
  };
}

function fallbackResumeExtraction(text: string): Record<string, any> {
  return {
    skills: extractSkills(text),
    experience: [],
    education: [],
    content: text.substring(0, 2000),
  };
}

function fallbackMatchCalculation(resumeData: Record<string, any>, jobData: Record<string, any>): number {
  // Simple keyword matching
  const resumeSkills = new Set((resumeData.skills || []).map((s: string) => s.toLowerCase()));
  const jobSkills = new Set((jobData.skills || []).map((s: string) => s.toLowerCase()));
  
  if (jobSkills.size === 0) return 50;
  
  let matches = 0;
  jobSkills.forEach(skill => {
    if (resumeSkills.has(skill)) matches++;
  });
  
  return Math.round((matches / jobSkills.size) * 100);
}

// Helper functions
function extractPattern(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern);
  return match ? match[1].trim() : undefined;
}

function extractSalary(text: string): string | undefined {
  const salaryPattern = /\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:per|\/)\s*(?:year|hour|month))?/gi;
  const match = text.match(salaryPattern);
  return match ? match[0] : undefined;
}

function extractContractType(text: string): string | undefined {
  const types = ['full-time', 'part-time', 'contract', 'freelance', 'internship', 'temporary'];
  const textLower = text.toLowerCase();
  
  for (const type of types) {
    if (textLower.includes(type)) {
      return type;
    }
  }
  
  return undefined;
}

function extractSkills(text: string): string[] {
  // Common tech skills to look for
  const commonSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Rust',
    'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
    'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
    'Git', 'CI/CD', 'Agile', 'Scrum',
  ];
  
  const foundSkills: string[] = [];
  const textLower = text.toLowerCase();
  
  for (const skill of commonSkills) {
    if (textLower.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  }
  
  return foundSkills;
}

function detectWorkMode(text: string): 'remote' | 'hybrid' | 'onsite' | undefined {
  const textLower = text.toLowerCase();
  
  if (textLower.includes('remote') || textLower.includes('work from home')) {
    return 'remote';
  }
  if (textLower.includes('hybrid')) {
    return 'hybrid';
  }
  if (textLower.includes('on-site') || textLower.includes('onsite') || textLower.includes('in-office')) {
    return 'onsite';
  }
  
  return undefined;
}

function extractLongDescription(text: string): string {
  // Try to find the main job description section
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 100);
  return paragraphs.slice(0, 3).join('\n\n').substring(0, 2000);
}

function extractRequirementsFromText(text: string): string {
  const requirementsPatterns = [
    /(?:requirements?|qualifications?|must have|you should have|we(?:'re| are) looking for)[:\s]*([\s\S]*?)(?:\n\n|\n(?:[A-Z]|•|-))/gi,
    /(?:required)[:\s]*([\s\S]*?)(?:\n\n|\n(?:[A-Z]|•|-))/gi,
  ];
  
  for (const pattern of requirementsPatterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      return match[0].substring(0, 1000);
    }
  }
  
  return '';
}

function extractPerks(text: string): string {
  const perksPatterns = [
    /(?:benefits?|perks?|we offer|what we offer|compensation)[:\s]*([\s\S]*?)(?:\n\n|\n(?:[A-Z]|•|-))/gi,
    /(?:bonus|equity|stock|401k|health|dental|vision|pto|vacation)[:\s]*([\s\S]*?)(?:\n\n|\n(?:[A-Z]|•|-))/gi,
  ];
  
  for (const pattern of perksPatterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      return match[0].substring(0, 800);
    }
  }
  
  return '';
}

function extractFirstSentence(text: string): string {
  const sentences = text.split(/[.!?]+/);
  return sentences[0]?.trim() + (sentences.length > 1 ? '.' : '') || '';
}

function extractSalaryNumber(salaryString: string | undefined, type: 'min' | 'max'): number | undefined {
  if (!salaryString) return undefined;
  
  const numbers = salaryString.match(/\$[\d,]+/g);
  if (!numbers) return undefined;
  
  const cleanNumbers = numbers.map(n => parseInt(n.replace(/[$,]/g, '')));
  
  if (cleanNumbers.length === 1) {
    return cleanNumbers[0];
  } else if (cleanNumbers.length >= 2) {
    return type === 'min' ? Math.min(...cleanNumbers) : Math.max(...cleanNumbers);
  }
  
  return undefined;
}

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