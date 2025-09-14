// AI-Powered Resume Content Extractor
// Directly processes PDF content with AI - no hardcoded parsing

import { generateCompletion } from '../ai-service';

export interface ResumeExtraction {
  // Personal Information
  name?: string;
  email?: string;
  phone?: string;
  location?: string;

  // Professional Summary
  summary?: string;

  // Skills (categorized)
  technicalSkills: string[];
  softSkills: string[];
  languages: string[];
  certifications: string[];

  // Experience
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    location?: string;
    responsibilities: string[];
    achievements: string[];
  }>;

  // Education
  education: Array<{
    degree: string;
    institution: string;
    graduationYear?: string;
    gpa?: string;
    relevantCoursework?: string[];
  }>;

  // Projects
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }>;

  // Additional Sections
  awards: string[];
  publications: string[];
  volunteering: string[];

  // AI Analysis
  careerLevel: 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | 'executive';
  yearsOfExperience: number;
  industryFocus: string[];
  keyStrengths: string[];

  // Metadata
  confidence: number; // 0-1
  extractionDate: string;
  processingTimeMs: number;
}

export class AIResumeExtractor {
  async extractFromPDF(pdfBuffer: Buffer, fileName: string): Promise<ResumeExtraction> {
    const startTime = Date.now();

    // Convert PDF to base64 for AI processing
    const pdfBase64 = pdfBuffer.toString('base64');

    const prompt = this.buildExtractionPrompt(fileName);

    // Send PDF directly to AI with multimodal capabilities
    const aiResponse = await generateCompletion(prompt, {
      max_tokens: 3000,
      temperature: 0.1, // Low temperature for accurate extraction
      // Include the PDF as base64 data
      files: [{
        type: 'application/pdf',
        data: pdfBase64,
        name: fileName
      }]
    });

    if (!aiResponse || !aiResponse.content) {
      throw new Error('Failed to extract resume content. AI service unavailable.');
    }

    // Parse AI response
    const extraction = this.parseAIResponse(aiResponse.content);

    // Add metadata
    extraction.extractionDate = new Date().toISOString();
    extraction.processingTimeMs = Date.now() - startTime;

    return extraction;
  }

  private buildExtractionPrompt(fileName: string): string {
    return `You are an expert resume parser. Extract ALL information from this PDF resume with perfect accuracy.

RESUME FILE: ${fileName}

Extract the following information in JSON format. If information is not present, use null or empty arrays.

REQUIRED JSON STRUCTURE:
{
  "name": "string | null",
  "email": "string | null",
  "phone": "string | null",
  "location": "string | null",
  "summary": "string | null",
  "technicalSkills": ["array of technical skills"],
  "softSkills": ["array of soft skills"],
  "languages": ["array of programming/spoken languages"],
  "certifications": ["array of certifications"],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "duration": "employment period",
      "location": "job location | null",
      "responsibilities": ["array of responsibilities"],
      "achievements": ["array of quantified achievements"]
    }
  ],
  "education": [
    {
      "degree": "degree name",
      "institution": "school name",
      "graduationYear": "year | null",
      "gpa": "GPA | null",
      "relevantCoursework": ["relevant courses"]
    }
  ],
  "projects": [
    {
      "name": "project name",
      "description": "project description",
      "technologies": ["technologies used"],
      "url": "project URL | null"
    }
  ],
  "awards": ["array of awards"],
  "publications": ["array of publications"],
  "volunteering": ["array of volunteer work"],
  "careerLevel": "entry|junior|mid|senior|lead|principal|executive",
  "yearsOfExperience": number,
  "industryFocus": ["primary industries"],
  "keyStrengths": ["top 5 professional strengths"],
  "confidence": number (0.0-1.0)
}

EXTRACTION RULES:
1. Extract EXACTLY what's written - no interpretation
2. Preserve all technical terms, company names, technologies
3. Include quantified achievements (numbers, percentages, metrics)
4. Separate technical skills from soft skills accurately
5. Infer career level from titles and responsibilities
6. Calculate years of experience from employment history
7. Identify key strengths from achievements and skills
8. Set confidence based on information clarity and completeness

CRITICAL: Return ONLY the JSON object, no additional text.`;
  }

  private parseAIResponse(aiResponse: string): ResumeExtraction {
    try {
      const parsed = JSON.parse(aiResponse);

      // Validate basic structure exists (allow flexible parsing)
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid AI response: not a valid object');
      }

      // Ensure arrays exist
      const extraction: ResumeExtraction = {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        location: parsed.location,
        summary: parsed.summary,
        technicalSkills: parsed.technicalSkills || [],
        softSkills: parsed.softSkills || [],
        languages: parsed.languages || [],
        certifications: parsed.certifications || [],
        experience: parsed.experience || [],
        education: parsed.education || [],
        projects: parsed.projects || [],
        awards: parsed.awards || [],
        publications: parsed.publications || [],
        volunteering: parsed.volunteering || [],
        careerLevel: parsed.careerLevel || 'entry',
        yearsOfExperience: parsed.yearsOfExperience || 0,
        industryFocus: parsed.industryFocus || [],
        keyStrengths: parsed.keyStrengths || [],
        confidence: parsed.confidence || 0.0,
        extractionDate: '',
        processingTimeMs: 0
      };

      return extraction;
    } catch (error) {
      console.error('Failed to parse AI resume extraction:', error);
      throw new Error(`Resume extraction failed: ${error instanceof Error ? error.message : 'Invalid AI response format'}`);
    }
  }
}

export const aiResumeExtractor = new AIResumeExtractor();