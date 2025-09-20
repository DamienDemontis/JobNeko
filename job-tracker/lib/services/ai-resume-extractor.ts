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
  rawText?: string; // Store full PDF text content for AI services
}

export class AIResumeExtractor {
  async extractFromPDF(pdfBuffer: Buffer, fileName: string): Promise<ResumeExtraction> {
    const startTime = Date.now();

    try {
      // Extract text from PDF using pdfparse
      const textContent = await this.extractTextFromPDF(pdfBuffer);

      if (!textContent || textContent.trim().length === 0) {
        throw new Error('No text content found in PDF');
      }

      console.log(`Extracted ${textContent.length} characters from PDF`);

      // Use AI to parse the resume data from the extracted text
      const aiResult = await this.parseResumeWithAI(textContent);

      if (!aiResult) {
        throw new Error('Failed to extract resume content. AI service unavailable.');
      }

      const extraction: ResumeExtraction = {
        ...aiResult,
        confidence: aiResult.confidence || 1.0,
        extractionDate: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
        rawText: textContent // Store the full raw text for AI services
      };

      console.log(`Resume text extraction completed for ${fileName} in ${extraction.processingTimeMs}ms`);
      return extraction;
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      throw error;
    }
  }

  private async extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    try {
      console.log('Starting PDF text extraction, buffer size:', pdfBuffer.length);

      // Set up PDF.js worker source before parsing
      const path = require('path');

      // Set worker source for different environments
      if (typeof global !== 'undefined' && (global as any).PDFJS) {
        // Already configured in test environment
      } else {
        // Production environment - configure dynamically
        const pdfjs = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
        if (pdfjs.GlobalWorkerOptions) {
          pdfjs.GlobalWorkerOptions.workerSrc = require.resolve('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.worker.js');
        }
      }

      // Use require for server-side module loading
      const pdfParse = require('pdf-parse');

      // Extract text from PDF buffer with options to handle worker issues
      const options = {
        // Disable worker in test environment to avoid worker issues
        max: 0,
        version: 'v1.10.100'
      };

      const data = await pdfParse(pdfBuffer, options);

      console.log('PDF parsing successful, text length:', data.text?.length || 0);

      if (!data.text || data.text.trim().length === 0) {
        throw new Error('PDF contains no readable text');
      }

      return data.text;
    } catch (error) {
      console.error('PDF text extraction failed:', error);

      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }

      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildExtractionPrompt(textContent: string, fileName: string): string {
    return `You are an expert resume parser. Extract ALL information from this PDF resume with perfect accuracy.

RESUME FILE: ${fileName}

${textContent}

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

CRITICAL: Return ONLY the JSON object, no additional text, no markdown code blocks, no formatting.
Do NOT wrap the response in code blocks or any markdown formatting.
Return the raw JSON object starting with { and ending with }.`;
  }

  private async parseResumeWithAI(textContent: string): Promise<ResumeExtraction | null> {
    try {
      console.log('Starting AI resume parsing...');

      // Check if OpenAI is available
      if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OpenAI API key not configured for resume extraction');
        throw new Error('AI service not configured. Please set OPENAI_API_KEY in environment variables.');
      }

      const prompt = this.buildExtractionPrompt(textContent, 'unknown.pdf');
      console.log('Generated prompt for AI, calling generateCompletion...');

      const result = await generateCompletion(prompt, { max_tokens: 4000, temperature: 0.1 });

      if (!result || !result.content) {
        console.error('❌ No content received from AI for resume extraction');
        throw new Error('AI service failed to generate content for resume extraction');
      }

      console.log('✅ AI completion received, parsing response...');
      return this.parseAIResponse(result.content);
    } catch (error) {
      console.error('❌ AI resume parsing failed:', error);
      // If it's a parsing error, rethrow it to preserve the specific error message
      if (error instanceof Error && error.message.includes('Resume extraction failed')) {
        throw error;
      }
      // Rethrow AI service errors
      throw error;
    }
  }

  private parseAIResponse(aiResponse: string): ResumeExtraction {
    try {
      // Clean the AI response by removing markdown code blocks
      let cleanedResponse = aiResponse.trim();

      // Remove ```json and ``` markers
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Remove any leading/trailing whitespace
      cleanedResponse = cleanedResponse.trim();

      console.log('Cleaned AI response for parsing:', cleanedResponse.substring(0, 200) + '...');

      const parsed = JSON.parse(cleanedResponse);

      // Validate basic structure exists (allow flexible parsing)
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid AI response: not a valid object');
      }

      // Ensure arrays exist and null/undefined handling
      const extraction: ResumeExtraction = {
        name: parsed.name || null,
        email: parsed.email || null,
        phone: parsed.phone || null,
        location: parsed.location || null,
        summary: parsed.summary || null,
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
      console.error('Raw AI response:', aiResponse);

      // Try to extract JSON from anywhere in the response as a fallback
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('Attempting fallback JSON extraction...');
          const parsed = JSON.parse(jsonMatch[0]);

          if (typeof parsed === 'object' && parsed !== null) {
            // Return a basic extraction structure
            const extraction: ResumeExtraction = {
              name: parsed.name || 'Unknown',
              email: parsed.email || '',
              phone: parsed.phone || '',
              location: parsed.location || '',
              summary: parsed.summary || '',
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
              confidence: parsed.confidence || 0.5,
              extractionDate: '',
              processingTimeMs: 0
            };

            console.log('Fallback extraction successful');
            return extraction;
          }
        }
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
      }

      throw new Error(`Resume extraction failed: ${error instanceof Error ? error.message : 'Invalid AI response format'}`);
    }
  }
}

export const aiResumeExtractor = new AIResumeExtractor();