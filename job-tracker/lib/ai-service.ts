import OpenAI from 'openai';
// Import GPT5Model type only, not the service instance (to avoid client-side initialization)
import { GPT5Model } from './services/gpt5-service';

// Re-export types for other modules (safe for client-side)
export type { GPT5Model };

// Import unified response formatting utilities
import {
  parseAIResponse,
  cleanJsonResponse,
  handleAIServiceError,
  validateEssentialFields,
  logAIOperation
} from '@/lib/utils/ai-response-formatter';

// OpenAI client will be initialized lazily when needed to avoid browser issues

// Available GPT-5 models - no fallbacks
const AI_MODELS = {
  openai: 'gpt-5' as GPT5Model, // Latest GPT-5 with native web search
  openai_mini: 'gpt-5-mini' as GPT5Model, // Cost-optimized GPT-5
  openai_nano: 'gpt-5-nano' as GPT5Model // High-throughput GPT-5
};

export interface ExtractedJobData {
  title: string;
  company: string;
  companyLogoUrl?: string;
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
  managementLevel?: 'individual_contributor' | 'team_lead' | 'manager' | 'senior_manager' | 'director' | 'executive';
  experienceLevel?: string;
  yearsExperienceRequired?: number;
  educationRequirements?: string;
  industryFocus?: string;

  // Comprehensive Skills and Technologies
  skills?: string[];
  programmingLanguages?: string[];
  frameworks?: string[];
  tools?: string[];
  softSkills?: string[];
  certifications?: string[];
  methodologies?: string[];
  databases?: string[];
  cloudPlatforms?: string[];

  // Detailed Content
  description?: string;
  responsibilities?: string[];
  requirements?: string;
  qualifications?: string[];
  preferredQualifications?: string[];
  dayToDay?: string[];
  impact?: string;
  keyProjects?: string[];

  // Benefits and Compensation Details
  perks?: string;
  benefits?: string[];
  healthInsurance?: string;
  retirement?: string;
  vacation?: string;
  flexibleSchedule?: boolean;
  professionalDevelopment?: string;
  workLifeBalance?: string;
  equipmentProvided?: string;
  remoteWorkPolicy?: string;

  // Company Culture and Environment
  companySize?: string;
  companyStage?: 'startup' | 'scale_up' | 'established' | 'enterprise' | 'public';
  companyDescription?: string;
  missionValues?: string;
  workEnvironment?: string;
  dresscode?: string;
  diversityInclusion?: string;
  cultureHighlights?: string[];

  // Application Process
  applicationProcess?: string;
  applicationDeadline?: string;
  postedDate?: string;
  startDate?: string;
  interviewProcess?: string;
  timeToHire?: string;
  urgency?: 'immediate' | 'soon' | 'flexible';
  applicationInstructions?: string;

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
    structured?: Record<string, unknown>;
  },
  apiKey?: string
): Promise<ExtractedJobData> {
  // Validate API key is available
  if (!apiKey && !process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. GPT-5 is required for job extraction.');
  }

  console.log(`Using GPT-5 for job extraction${apiKey ? ' with user API key' : ' with platform key'} - no fallbacks`);

  try {
    return await extractWithOpenAI(pageData, apiKey);
  } catch (error) {
    // Show error directly instead of trying fallback services
    const aiError = handleAIServiceError(error, 'job_extraction', pageData.url);
    console.error('❌ Job extraction failed:', aiError);
    throw new Error(`Job extraction failed: ${aiError.message}`);
  }
}

async function extractWithOpenAI(
  pageData: {
    url: string;
    html?: string;
    text?: string;
    title?: string;
    structured?: Record<string, unknown>;
  },
  apiKey?: string
): Promise<ExtractedJobData> {
  // Create comprehensive but structured prompt for GPT-5
  const comprehensivePrompt = `Extract job information and return ONLY a valid JSON object. No explanations, no markdown, no code blocks.

Your response must start with { and end with }. Example format:

EXTRACT ALL THESE FIELDS:
{
  "title": "exact job title (remove company name if included)",
  "company": "company name only",
  "companyLogoUrl": "FULL absolute URL to company logo image (CRITICAL - see extraction rules below)",
  "location": "full location or Remote/Hybrid",
  "salary": "complete salary info with currency and period",
  "salaryMin": numeric_minimum_if_available,
  "salaryMax": numeric_maximum_if_available,
  "salaryCurrency": "USD/EUR/GBP/etc",
  "salaryFrequency": "annual/monthly/hourly",
  "contractType": "Full-time/Part-time/Contract/Freelance/Internship",
  "department": "department or team name",
  "experienceLevel": "Junior/Mid/Senior/Principal/etc",
  "yearsExperienceRequired": numeric_years_if_specified,
  "managementLevel": "individual_contributor/team_lead/manager/director",
  "skills": ["skill1", "skill2", "skill3..."],
  "programmingLanguages": ["language1", "language2..."],
  "frameworks": ["framework1", "framework2..."],
  "tools": ["tool1", "tool2..."],
  "databases": ["db1", "db2..."],
  "cloudPlatforms": ["AWS", "Azure", "GCP..."],
  "description": "complete job description - 3-4 paragraphs with role overview, responsibilities, team info, projects, technologies, impact",
  "requirements": "detailed requirements and qualifications",
  "responsibilities": ["responsibility1", "responsibility2..."],
  "qualifications": ["qual1", "qual2..."],
  "benefits": ["benefit1", "benefit2..."],
  "perks": "additional perks and benefits info",
  "workMode": "Remote/Hybrid/On-site",
  "isNegotiable": true_if_salary_negotiable,
  "bonusStructure": {"type": "performance/annual/signing", "percentage": number_if_available},
  "equityOffered": {"type": "RSU/options/shares", "amount": "value_if_specified"},
  "companySize": "startup/small/medium/large/enterprise",
  "companyStage": "startup/scale_up/established/enterprise",
  "applicationDeadline": "deadline_if_specified",
  "startDate": "start_date_if_specified",
  "summary": "comprehensive 2-3 sentence summary highlighting key aspects"
}

🔴🔴🔴 CRITICAL: COMPANY LOGO URL EXTRACTION 🔴🔴🔴

**YOU MUST EXTRACT THE COMPANY LOGO URL. THIS IS MANDATORY.**

**THINKING PROCESS (Do this mentally before extracting):**

Step 1: Identify the company name
  → Company name: "${pageData.title?.includes(' - ') ? pageData.title.split(' - ')[0] : '[company from HTML]'}"

Step 2: Search HTML for ALL <img> tags containing company name or logo keywords
  → Look for: src attributes in <img> tags
  → Keywords to find: "logo", "brand", company name, "header", "nav"

Step 3: Examine each <img> tag and score it:
  → High priority: Contains "logo" or company name in src, alt, or class
  → Medium priority: In header/nav area (early in HTML)
  → Low priority: Generic images, banners, stock photos

Step 4: Convert relative URLs to absolute URLs
  → Base domain: "${pageData.url ? new URL(pageData.url).origin : 'https://[extract-from-url]'}"
  → If src="/path" → prepend base domain
  → If src="//cdn..." → prepend "https:"
  → If src="path" (relative) → prepend base domain + "/"

**REAL-WORLD EXAMPLES OF LOGO EXTRACTION:**

Example 1: LinkedIn
HTML: <img class="company-logo" alt="Microsoft Logo" src="/media/companies/microsoft.png">
URL: https://linkedin.com/jobs/view/12345
CORRECT OUTPUT: "companyLogoUrl": "https://linkedin.com/media/companies/microsoft.png"

Example 2: Indeed
HTML: <img src="//d2q79iu7y748jz.cloudfront.net/s/_logos/google.png" class="company_logo">
URL: https://indeed.com/viewjob?jk=abc
CORRECT OUTPUT: "companyLogoUrl": "https://d2q79iu7y748jz.cloudfront.net/s/_logos/google.png"

Example 3: Custom Job Board
HTML: <div class="company-card"><img src="../uploads/logos/startup_logo_96x96.png" alt="Startup Inc"></div>
URL: https://jobs-board.com/posting/456
CORRECT OUTPUT: "companyLogoUrl": "https://jobs-board.com/uploads/logos/startup_logo_96x96.png"

Example 4: Job Listing with Company Section
HTML: <aside class="company-info"><h3>About TechCorp</h3><img src="https://cdn.example.com/companies/techcorp.svg"></aside>
URL: https://careers.example.com/job/789
CORRECT OUTPUT: "companyLogoUrl": "https://cdn.example.com/companies/techcorp.svg"

**SEARCH STRATEGY:**

1. Search the ENTIRE HTML (all 30,000 characters) for these patterns:
   - <img ... src="[anything with 'logo']" ...>
   - <img ... src="[anything with company name]" ...>
   - <img ... alt="[company name]" ...>
   - <img ... class="[anything with 'logo' or 'brand']" ...>

2. Look in these HTML sections (scan the whole HTML):
   - Company information sections (class="company", "about-company", etc.)
   - Header/navigation areas
   - Sidebar with company details
   - Job listing header with employer info

3. URL conversion is CRITICAL:
   - Extract base domain from page URL: ${pageData.url ? new URL(pageData.url).origin : 'https://domain'}
   - If src="/logo.png" → "${pageData.url ? new URL(pageData.url).origin : 'https://domain'}/logo.png"
   - If src="//cdn.site.com/logo.png" → "https://cdn.site.com/logo.png"
   - If src="images/logo.png" → "${pageData.url ? new URL(pageData.url).origin : 'https://domain'}/images/logo.png"

4. Quality checks:
   - Must be a valid image URL (contains .png, .jpg, .svg, .webp, .gif OR from CDN)
   - Must start with http:// or https://
   - Should relate to the company (not generic job site branding)
   - Prefer smaller images (logos) over large banners

**WHAT YOU MUST DO:**
1. Scan ALL the HTML provided (30,000 chars)
2. Find EVERY <img> tag
3. Check each one for logo-related attributes
4. Convert the BEST candidate to absolute URL
5. Return it in companyLogoUrl field

**WHAT TO NEVER DO:**
- Return null if ANY logo exists (null is ONLY for truly no logo found)
- Return relative URLs (always convert to absolute)
- Return job site's logo instead of company logo
- Skip searching the full HTML

**CURRENT JOB PAGE DATA:**
Base URL: ${pageData.url}
Base Domain: ${pageData.url ? new URL(pageData.url).origin : 'https://domain'}
Company: Look for company name in HTML

SALARY EXTRACTION RULES:
- Extract numeric ranges: "$80,000 - $120,000" → salaryMin: 80000, salaryMax: 120000
- Convert to annual: "$50/hour" → estimate annual equivalent
- Detect currency symbols: $=USD, £=GBP, €=EUR
- Mark as negotiable if text contains: "negotiable", "competitive", "DOE"

CONTENT TO EXTRACT FROM:
URL: ${pageData.url}
Page Title: ${pageData.title || 'Not provided'}
${pageData.structured ? `Structured Data: ${JSON.stringify(pageData.structured).substring(0, 1000)}` : ''}

HTML CONTENT (FULL HTML - SCAN EVERYTHING FOR LOGO):
${pageData.html ? pageData.html : 'No HTML available'}

FULL TEXT CONTENT:
${pageData.text?.substring(0, 8000) || 'No text content available'}

IMPORTANT REMINDERS:
1. Scan the ENTIRE HTML above - don't stop early
2. Find ALL <img> tags and examine each one
3. Convert relative URLs to absolute using the base domain: ${pageData.url ? new URL(pageData.url).origin : 'https://domain'}
4. Return the best logo URL candidate in companyLogoUrl field
5. If you find a logo, you MUST convert it to absolute URL format

Now return the complete JSON object (start with { and end with }). The companyLogoUrl field is MANDATORY if any logo exists in the HTML:`;

  // Dynamic import to avoid client-side initialization
  const { gpt5Service } = await import('./services/gpt5-service');

  console.log('🔍 Starting job extraction with GPT-5...');
  const response = await gpt5Service.complete(comprehensivePrompt, {
    model: 'gpt-5-mini', // No token limit - let GPT-5 use what it needs (up to 128k max)
    apiKey // Pass user's API key if provided
  });

  console.log('🔍 GPT-5 raw response length:', response?.length || 0);
  console.log('🔍 GPT-5 raw response preview:', response?.substring(0, 200));

  const startTime = Date.now();
  const parseResult = parseAIResponse<Record<string, unknown>>(response);

  if (!parseResult.success) {
    console.error('❌ Failed to parse GPT-5 job extraction response:', parseResult.error);
    logAIOperation('job_extraction', 'gpt-5-mini', pageData.text?.length || 0, 0, Date.now() - startTime, false);
    throw new Error(`Job extraction failed: ${parseResult.error?.message}`);
  }

  const extracted = parseResult.data as any;
  console.log('✅ Parsed extraction data:', {
    title: extracted.title,
    company: extracted.company,
    location: extracted.location,
    salary: extracted.salary,
    companyLogoUrl: extracted.companyLogoUrl,
    hasDescription: !!extracted.description,
    skillsCount: Array.isArray(extracted.skills) ? extracted.skills.length : 0,
    responsibilitiesCount: Array.isArray(extracted.responsibilities) ? extracted.responsibilities.length : 0,
    keysCount: Object.keys(extracted).length
  });

  // Validate essential fields
  const validation = validateEssentialFields(extracted, ['title', 'company'], 'job_extraction');
  if (!validation.success) {
    console.error('❌ Essential fields missing:', validation.error);
    logAIOperation('job_extraction', 'gpt-5-mini', pageData.text?.length || 0, 0, Date.now() - startTime, false);
    throw new Error(`Job extraction validation failed: ${validation.error?.message}`);
  }

  const normalized = normalizeJobData(extracted);
  console.log('🎯 Normalized extraction data:', {
    title: normalized.title,
    company: normalized.company,
    location: normalized.location,
    salary: normalized.salary,
    companyLogoUrl: normalized.companyLogoUrl,
    hasDescription: !!normalized.description,
    skillsCount: normalized.skills?.length || 0,
    contractType: normalized.contractType
  });

  logAIOperation('job_extraction', 'gpt-5-mini', pageData.text?.length || 0, response?.length || 0, Date.now() - startTime, true);
  return normalized;
}

// Ollama functions removed - using only GPT-5 with no fallbacks

function createExtractionPrompt(pageData: {
  url: string;
  html?: string;
  text?: string;
  title?: string;
  structured?: Record<string, unknown>;
  jobTitle?: string;
  company?: string;
  location?: string;
  salary?: string;
  description?: string;
  requirements?: string;
  skills?: string;
  benefits?: string;
  companyInfo?: string;
}): string {
  return `You are a professional job data extraction specialist. Extract ALL relevant information from the job posting below and return a comprehensive JSON object with enhanced details for the overview display.

EXAMPLE OUTPUT FORMAT:
{
  "title": "Senior Backend Engineer",
  "company": "TechCorp",
  "companyLogoUrl": "https://example.com/logos/techcorp-logo.png",
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
  "teamSize": "8-12 engineers",
  "managementLevel": "individual_contributor",
  "yearsExperienceRequired": 5,
  "companyStage": "scale_up",
  "skills": ["Python", "Django", "PostgreSQL", "AWS", "Docker", "Kubernetes", "Redis"],
  "programmingLanguages": ["Python", "JavaScript", "SQL"],
  "frameworks": ["Django", "FastAPI", "React"],
  "tools": ["Docker", "Kubernetes", "Jenkins", "Git", "Jira"],
  "databases": ["PostgreSQL", "Redis", "MongoDB"],
  "cloudPlatforms": ["AWS", "Docker"],
  "methodologies": ["Agile", "Scrum", "Test-Driven Development"],
  "responsibilities": [
    "Design and implement scalable backend APIs and microservices",
    "Optimize database performance and query efficiency",
    "Collaborate with frontend and product teams on feature development",
    "Mentor junior developers and conduct code reviews",
    "Lead technical discussions and architecture decisions"
  ],
  "dayToDay": [
    "Write clean, maintainable Python code using Django framework",
    "Design database schemas and optimize complex queries",
    "Deploy and monitor services using AWS and Kubernetes",
    "Participate in daily standups and sprint planning",
    "Review pull requests and provide constructive feedback"
  ],
  "keyProjects": [
    "Migration of monolith to microservices architecture",
    "Implementation of real-time notification system",
    "Performance optimization reducing API response times by 40%"
  ],
  "impact": "Your work will directly impact millions of users by improving system performance and reliability",
  "cultureHighlights": ["Collaborative environment", "Learning-focused", "Innovation-driven", "Work-life balance"],
  "workLifeBalance": "Flexible hours with core collaboration time, mental health days, no weekend work expectation",
  "description": "Join our backend engineering team to build scalable microservices that power our platform. You'll design and implement APIs, optimize database performance, and collaborate with cross-functional teams to deliver high-quality software. We're looking for someone passionate about clean code, system design, and mentoring junior developers.",
  "requirements": "5+ years of backend development experience with Python and Django. Strong understanding of relational databases, particularly PostgreSQL. Experience with cloud platforms like AWS, containerization with Docker, and orchestration with Kubernetes. Knowledge of caching strategies with Redis. Proven track record of building and maintaining production systems at scale.",
  "perks": "Comprehensive health insurance including dental and vision. Flexible work arrangements with remote options. Professional development budget of $3,000 annually. Stock options and 401k matching. Unlimited PTO policy. Modern equipment and home office stipend. Team retreats and learning conferences.",
  "workMode": "remote",
  "postedDate": "2024-01-15T10:00:00Z",
  "applicationDeadline": "2024-02-15T23:59:59Z",
  "summary": "Senior Backend Engineer role at TechCorp focusing on scalable microservices development with Python and Django. Remote-friendly position offering excellent benefits, professional development opportunities, and the chance to work on high-impact systems serving millions of users."
}

EXTRACTION REQUIREMENTS:
1. **Title**: Extract the exact job title, remove company name if included
2. **Company**: Company name only
3. **CompanyLogoUrl**: Extract the URL of the company logo image if present (look for img tags with company name, logo class names, or in header/branding areas)
4. **Location**: Full location or "Remote" if applicable
5. **Salary**: Complete salary information including currency, range, and period
6. **SalaryMin/Max**: Extract numeric values from salary string (convert to annual if needed)
7. **SalaryCurrency**: Extract currency code (USD, EUR, GBP, CAD, etc.) or symbol detection
8. **SalaryFrequency**: "annual", "monthly", or "hourly" based on the posting
9. **ContractType**: Must be one of: "Full-time", "Part-time", "Contract", "Freelance", "Internship", "Temporary"
10. **BonusStructure**: Extract bonus information including:
   - Type: "performance", "annual", "signing", "retention", "quarterly"
   - Amount (if specified) or percentage of base salary
   - Frequency: "annual", "quarterly", "monthly", "one-time"
11. **EquityOffered**: Extract equity compensation details:
    - Type: "RSU" (Restricted Stock Units), "options", "shares", "phantom"
    - Amount: dollar value or number of shares/options
    - Vesting period: "4 years", "3 years", etc.
    - Vesting schedule: "25% each year", "monthly", "cliff + monthly"
12. **TotalCompMin/Max**: Calculate total compensation including base + bonus + equity value
13. **IsNegotiable**: Look for phrases like "negotiable", "competitive", "depending on experience"
14. **RemotePayAdjustment**: Check if salary is adjusted based on location for remote roles
15. **Skills**: Extract ALL mentioned technical skills, tools, languages, frameworks (aim for 8-15 items)
16. **Description**:
    - Extract the COMPLETE job description
    - Include role overview, main responsibilities, team information
    - Preserve important details about projects, technologies, impact
    - Make it 3-4 paragraphs, well-formatted and comprehensive
17. **Requirements**: 
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

ENHANCED EXTRACTION REQUIREMENTS FOR RICH OVERVIEW DISPLAY:

20. **TeamSize**: Extract team size numbers ("5-8 engineers", "team of 12", "small agile team")
21. **ManagementLevel**: Determine level: "individual_contributor", "team_lead", "manager", "senior_manager", "director", "executive"
22. **YearsExperienceRequired**: Extract numeric years from requirements (3, 5, 10, etc.)
23. **CompanyStage**: Determine: "startup", "scale_up", "established", "enterprise", "public"
24. **ProgrammingLanguages**: Extract only programming languages (Python, JavaScript, Java, Go, etc.)
25. **Frameworks**: Extract frameworks/libraries (React, Django, Spring, Express, etc.)
26. **Tools**: Extract development tools (Docker, Git, Jenkins, Jira, etc.)
27. **Databases**: Extract database technologies (PostgreSQL, MongoDB, Redis, etc.)
28. **CloudPlatforms**: Extract cloud services (AWS, GCP, Azure, etc.)
29. **Methodologies**: Extract methodologies (Agile, Scrum, TDD, CI/CD, etc.)
30. **Responsibilities**: Extract 4-6 key responsibilities as bullet points
31. **DayToDay**: Extract typical daily activities as bullet points
32. **KeyProjects**: Extract specific projects mentioned in the posting
33. **Impact**: Extract information about role impact and outcomes
34. **CultureHighlights**: Extract company culture keywords (collaborative, innovative, etc.)
35. **WorkLifeBalance**: Extract work-life balance information (flexible hours, PTO, etc.)
36. **PostedDate**: Extract job posting date in ISO format (look for "Posted", "Published", "Added", date stamps). Use exact dates when available.
37. **ApplicationDeadline**: Extract application deadline in ISO format (look for "Apply by", "Deadline", "Close date", "Applications close"). Return null if no deadline specified.

COMPREHENSIVE BREAKDOWN INSTRUCTIONS:
- **SKILLS CATEGORIZATION**: Separate technical skills into specific categories
- **TEAM DETAILS**: Extract team size, department, reporting structure, collaboration style
- **COMPANY INSIGHTS**: Mission, values, work environment, stage, culture highlights
- **ROLE SPECIFICS**: Daily activities, key projects, impact measurement, growth opportunities
- **BENEFITS DETAIL**: Detailed breakdown of health, retirement, PTO, professional development
- **WORK ENVIRONMENT**: Remote policy details, schedule flexibility, equipment provided
- **CAREER GROWTH**: Progression paths, mentorship, training opportunities, learning budget
- **PROJECT CONTEXT**: Specific projects, client types, industry focus, technical challenges
- **PROCESS DETAILS**: Application steps, interview process, start date, urgency level
- **UNIQUE VALUE**: What makes this role special, key selling points, differentiators

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
${(pageData as any).workMode ? `Detected Work Mode: ${(pageData as any).workMode}` : ''}

FULL TEXT CONTENT (MOST IMPORTANT - Extract from here):
${pageData.text?.substring(0, 8000)}

ENHANCED OUTPUT REQUIREMENTS:
- Populate ALL available fields from the comprehensive schema above
- Use arrays for lists (skills, responsibilities, benefits, etc.)
- Include detailed analysis in summary, keyHighlights, potentialChallenges
- Extract specific details, not generic statements
- Categorize skills properly (programmingLanguages vs frameworks vs tools)
- Provide actionable insights in the AI analysis fields

FINAL INSTRUCTIONS FOR OUTPUT:
1. Return ONLY a valid JSON object - no other text
2. Start your response immediately with {
3. End your response with }
4. Include "title" and "company" fields as they are required
5. If any information is missing, use null instead of generic defaults
6. Double-check JSON syntax before responding

JSON OUTPUT:`;
}

export async function extractResumeData(pdfText: string): Promise<Record<string, any>> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key required for resume extraction. Please configure OPENAI_API_KEY in your environment.');
  }

  const prompt = `Extract structured information from resume text.

IMPORTANT: Return ONLY valid JSON - no markdown code blocks, no \`\`\`json wrapper, no explanations. Just the raw JSON object with: skills (array), experience (array of {title, company, duration, description}), education (array of {degree, institution, year}).

Resume text: ${pdfText.substring(0, 4000)}`;

  // Dynamic import to avoid client-side initialization
  const { gpt5Service } = await import('./services/gpt5-service');
  const response = await gpt5Service.complete(prompt, {
    model: 'gpt-5-mini',
    reasoning: 'low',
    verbosity: 'low'
  });

  const parseResult = parseAIResponse(response, {});

  if (!parseResult.success) {
    console.error('Failed to parse resume extraction response:', parseResult.error);
    logAIOperation('resume_parsing', 'gpt-5-mini', pdfText.length, 0, 0, false);
    return {};
  }

  logAIOperation('resume_parsing', 'gpt-5-mini', pdfText.length, response?.length || 0, 0, true);
  return parseResult.data!;
}

export async function calculateJobMatch(resumeData: Record<string, any>, jobData: Record<string, any>): Promise<number> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key required for job matching. Please configure OPENAI_API_KEY in your environment.');
  }

  const prompt = `Calculate a match percentage (0-100) between a resume and job posting. Consider skills match, experience relevance, and requirements fulfillment.

Resume: ${JSON.stringify(resumeData)}

Job: ${JSON.stringify(jobData)}

Return only a number between 0 and 100.`;

  // Dynamic import to avoid client-side initialization
  const { gpt5Service } = await import('./services/gpt5-service');
  const response = await gpt5Service.complete(prompt, {
    model: 'gpt-5-mini',
    reasoning: 'low',
    verbosity: 'low'
  });

  const score = parseFloat(response || '0');
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
    model?: GPT5Model;
    reasoning?: 'minimal' | 'low' | 'medium' | 'high';
    verbosity?: 'low' | 'medium' | 'high';
    apiKey?: string; // User's API key
  } = {}
): Promise<{ content: string } | null> {
  // Check if API key is available (either provided or in environment)
  const hasApiKey = !!(options.apiKey || process.env.OPENAI_API_KEY);

  if (!hasApiKey) {
    throw new Error('No AI services available. Please configure OpenAI API key.');
  }

  try {
    // Dynamic import to avoid client-side initialization
    const { gpt5Service } = await import('./services/gpt5-service');
    const response = await gpt5Service.complete(prompt, {
      model: options.model || AI_MODELS.openai,
      reasoning: options.reasoning || 'minimal',
      verbosity: options.verbosity || 'low',
      maxTokens: options.max_tokens,  // No default token limit - use what user specifies or GPT-5's full capacity
      apiKey: options.apiKey  // Pass user's API key
    });

    return {
      content: response
    };
  } catch (error) {
    // Show error directly instead of retrying
    const aiError = handleAIServiceError(error, 'generateCompletion', prompt.substring(0, 200));
    console.error(`❌ AI completion failed with GPT-5:`, aiError);
    throw new Error(`GPT-5 service error: ${aiError.message}`);
  }
}

// AI-only extraction - no fallbacks allowed

function normalizeJobData(data: Record<string, unknown>): ExtractedJobData {
  // Enhanced salary parsing with better currency detection
  const salaryMin = data.salaryMin ? Number(data.salaryMin) : undefined;
  const salaryMax = data.salaryMax ? Number(data.salaryMax) : undefined;
  
  // Auto-detect currency from salary string if not provided
  let salaryCurrency = data.salaryCurrency as string | undefined;
  if (!salaryCurrency && data.salary) {
    const salaryStr = String(data.salary);
    const currencyMatch = salaryStr.match(/([£€$¥₹]|USD|EUR|GBP|CAD|AUD|JPY|INR|CHF|SGD)/i);
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
  let salaryFrequency = data.salaryFrequency as string | undefined;
  if (!salaryFrequency && data.salary) {
    const salaryStr = String(data.salary);
    if (/\b(hour|hr|hourly)\b/i.test(salaryStr)) {
      salaryFrequency = 'hourly';
    } else if (/\b(month|monthly|mo)\b/i.test(salaryStr)) {
      salaryFrequency = 'monthly';
    } else {
      salaryFrequency = 'annual';
    }
  }
  
  // Parse negotiability from salary string or description
  let isNegotiable = data.isNegotiable as boolean | undefined;
  if (isNegotiable === undefined) {
    const negotiableKeywords = /\b(negotiable|competitive|depending on experience|DOE|commensurate)\b/i;
    isNegotiable = negotiableKeywords.test(String(data.salary || '')) ||
                   negotiableKeywords.test(String(data.description || '')) ||
                   negotiableKeywords.test(String(data.perks || ''));
  }
  
  // Detect remote pay adjustment mentions
  let remotePayAdjustment = data.remotePayAdjustment as boolean | undefined;
  if (remotePayAdjustment === undefined) {
    const adjustmentKeywords = /\b(location.based|geographic.zones|salary.varies|location.adjustment|cost.of.living.adjustment)\b/i;
    remotePayAdjustment = adjustmentKeywords.test(String(data.salary || '')) ||
                          adjustmentKeywords.test(String(data.description || '')) ||
                          adjustmentKeywords.test(String(data.perks || ''));
  }
  
  // Essential field validation is now handled by unified utilities before this function

  return {
    title: String(data.title),
    company: String(data.company),
    location: data.location as string | undefined,
    salary: data.salary as string | undefined,
    salaryMin,
    salaryMax,
    salaryCurrency,
    salaryFrequency: salaryFrequency as 'annual' | 'monthly' | 'hourly',
    contractType: data.contractType as string | undefined,
    bonusStructure: data.bonusStructure ? {
      type: String((data.bonusStructure as Record<string, unknown>).type || 'performance'),
      amount: (data.bonusStructure as Record<string, unknown>).amount ? Number((data.bonusStructure as Record<string, unknown>).amount) : undefined,
      percentage: (data.bonusStructure as Record<string, unknown>).percentage ? Number((data.bonusStructure as Record<string, unknown>).percentage) : undefined,
      frequency: String((data.bonusStructure as Record<string, unknown>).frequency || 'annual')
    } : undefined,
    equityOffered: data.equityOffered ? {
      type: (data.equityOffered as Record<string, unknown>).type as 'RSU' | 'options' | 'shares' | 'phantom',
      amount: String((data.equityOffered as Record<string, unknown>).amount || ''),
      vestingPeriod: String((data.equityOffered as Record<string, unknown>).vestingPeriod || ''),
      vestingSchedule: String((data.equityOffered as Record<string, unknown>).vestingSchedule || '')
    } : undefined,
    totalCompMin: data.totalCompMin ? Number(data.totalCompMin) : undefined,
    totalCompMax: data.totalCompMax ? Number(data.totalCompMax) : undefined,
    isNegotiable,
    remotePayAdjustment,
    skills: Array.isArray(data.skills) ? data.skills.map(s => String(s)) : typeof data.skills === 'string' ? data.skills.split(',').map((s: string) => s.trim()) : undefined,
    description: data.description as string | undefined,
    requirements: data.requirements as string | undefined,
    perks: data.perks as string | undefined,
    workMode: data.workMode as 'remote' | 'hybrid' | 'onsite',
    summary: data.summary ? String(data.summary) : `${data.title || 'Position'} at ${data.company || 'Unknown Company'}. Review the full description for details.`,
    // Enhanced fields
    companyLogoUrl: data.companyLogoUrl as string | undefined,
    department: data.department as string | undefined,
    teamSize: data.teamSize as string | undefined,
    reportingStructure: data.reportingStructure as string | undefined,
    managementLevel: data.managementLevel as 'individual_contributor' | 'team_lead' | 'manager' | 'senior_manager' | 'director' | 'executive' | undefined,
    experienceLevel: data.experienceLevel as string | undefined,
    yearsExperienceRequired: data.yearsExperienceRequired ? Number(data.yearsExperienceRequired) : undefined,
    educationRequirements: data.educationRequirements as string | undefined,
    industryFocus: data.industryFocus as string | undefined,
    programmingLanguages: Array.isArray(data.programmingLanguages) ? data.programmingLanguages.map(s => String(s)) : undefined,
    frameworks: Array.isArray(data.frameworks) ? data.frameworks.map(s => String(s)) : undefined,
    tools: Array.isArray(data.tools) ? data.tools.map(s => String(s)) : undefined,
    softSkills: Array.isArray(data.softSkills) ? data.softSkills.map(s => String(s)) : undefined,
    certifications: Array.isArray(data.certifications) ? data.certifications.map(s => String(s)) : undefined,
    methodologies: Array.isArray(data.methodologies) ? data.methodologies.map(s => String(s)) : undefined,
    databases: Array.isArray(data.databases) ? data.databases.map(s => String(s)) : undefined,
    cloudPlatforms: Array.isArray(data.cloudPlatforms) ? data.cloudPlatforms.map(s => String(s)) : undefined,
    responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities.map(s => String(s)) : undefined,
    qualifications: Array.isArray(data.qualifications) ? data.qualifications.map(s => String(s)) : undefined,
    preferredQualifications: Array.isArray(data.preferredQualifications) ? data.preferredQualifications.map(s => String(s)) : undefined,
    dayToDay: Array.isArray(data.dayToDay) ? data.dayToDay.map(s => String(s)) : undefined,
    impact: data.impact as string | undefined,
    keyProjects: Array.isArray(data.keyProjects) ? data.keyProjects.map(s => String(s)) : undefined,
    benefits: Array.isArray(data.benefits) ? data.benefits.map(s => String(s)) : undefined,
    healthInsurance: data.healthInsurance as string | undefined,
    retirement: data.retirement as string | undefined,
    vacation: data.vacation as string | undefined,
    flexibleSchedule: data.flexibleSchedule as boolean | undefined,
    professionalDevelopment: data.professionalDevelopment as string | undefined,
    workLifeBalance: data.workLifeBalance as string | undefined,
    equipmentProvided: data.equipmentProvided as string | undefined,
    remoteWorkPolicy: data.remoteWorkPolicy as string | undefined,
    companySize: data.companySize as string | undefined,
    companyStage: data.companyStage as 'startup' | 'scale_up' | 'established' | 'enterprise' | 'public' | undefined,
    companyDescription: data.companyDescription as string | undefined,
    missionValues: data.missionValues as string | undefined,
    workEnvironment: data.workEnvironment as string | undefined,
    dresscode: data.dresscode as string | undefined,
    diversityInclusion: data.diversityInclusion as string | undefined,
    cultureHighlights: Array.isArray(data.cultureHighlights) ? data.cultureHighlights.map(s => String(s)) : undefined,
    applicationProcess: data.applicationProcess as string | undefined,
    applicationDeadline: data.applicationDeadline as string | undefined,
    startDate: data.startDate as string | undefined,
    interviewProcess: data.interviewProcess as string | undefined,
    timeToHire: data.timeToHire as string | undefined,
    urgency: data.urgency as 'immediate' | 'soon' | 'flexible' | undefined,
    applicationInstructions: data.applicationInstructions as string | undefined,
    projectDetails: data.projectDetails as string | undefined,
    clientTypes: Array.isArray(data.clientTypes) ? data.clientTypes.map(s => String(s)) : undefined,
    travelRequirements: data.travelRequirements as string | undefined,
    overtime: data.overtime as string | undefined,
    careerProgression: data.careerProgression as string | undefined,
    mentorship: data.mentorship as string | undefined,
    trainingOpportunities: Array.isArray(data.trainingOpportunities) ? data.trainingOpportunities.map(s => String(s)) : undefined,
    uniqueSellingPoints: Array.isArray(data.uniqueSellingPoints) ? data.uniqueSellingPoints.map(s => String(s)) : undefined,
    keyHighlights: Array.isArray(data.keyHighlights) ? data.keyHighlights.map(s => String(s)) : undefined,
    potentialChallenges: Array.isArray(data.potentialChallenges) ? data.potentialChallenges.map(s => String(s)) : undefined,
  };
}