import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/auth';
import { aiResumeExtractor } from '@/lib/services/ai-resume-extractor';
import {
  withErrorHandling,
  AuthenticationError,
  ValidationError
} from '@/lib/error-handling';

// Helper function to extract text from different file types
async function extractTextFromFile(file: File): Promise<{ text: string; extractedData?: any }> {
  const fileType = file.type;

  if (fileType === 'text/plain') {
    // Plain text file
    const text = await file.text();
    return { text };
  } else if (fileType === 'application/pdf') {
    // Use the same PDF extraction logic as the profile page
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract using the existing AI resume extractor
    const extractedData = await aiResumeExtractor.extractFromPDF(buffer, file.name);

    return {
      text: extractedData.rawText || '',
      extractedData
    };
  } else if (fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // For DOC/DOCX files, we'll need a document parser
    // For now, we'll throw an error and suggest using a text version
    throw new Error('Word document extraction not yet implemented. Please upload a text version of your resume.');
  } else {
    throw new Error('Unsupported file type. Please upload a TXT, PDF, DOC, or DOCX file.');
  }
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate authentication
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  const user = await validateToken(token);
  if (!user) {
    throw new AuthenticationError('Invalid authentication token');
  }

  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File;

    if (!file) {
      throw new ValidationError('No resume file provided');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new ValidationError('File size must be less than 5MB');
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new ValidationError('Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.');
    }

    console.log(`📄 Extracting resume data from ${file.name} (${file.type})`);

    // Extract text from the file
    const { text: resumeText, extractedData: aiExtractedData } = await extractTextFromFile(file);

    if (!resumeText || resumeText.trim().length < 100) {
      throw new ValidationError('Resume file appears to be empty or too short');
    }

    console.log(`✅ Resume extraction completed for user ${user.id}`);

    // For PDF files, use the comprehensive AI extraction data
    // For text files, provide the raw text as content
    const responseData = file.type === 'application/pdf' && aiExtractedData
      ? {
          // Use the comprehensive AI extraction for PDFs
          content: resumeText,
          extractedData: aiExtractedData,
          originalText: resumeText,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          extractedAt: new Date().toISOString()
        }
      : {
          // For text files, provide basic structure
          content: resumeText,
          originalText: resumeText,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          extractedAt: new Date().toISOString()
        };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Resume extraction error:', error);

    if (error instanceof ValidationError) {
      throw error;
    }

    throw new Error(error instanceof Error ? error.message : 'Failed to extract resume data');
  }
});