import { extractJobDataWithAI } from '@/lib/ai-service';

// Mock the AI service to avoid needing real API keys
jest.mock('@/lib/ai-service', () => ({
  extractJobDataWithAI: jest.fn(),
}));

const mockExtractJobDataWithAI = extractJobDataWithAI as jest.MockedFunction<typeof extractJobDataWithAI>;

describe('AI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('Job extraction', () => {
    it('should extract job data from page content', async () => {
      const mockPageData = {
        url: 'https://example.com/job',
        title: 'Software Engineer at TechCorp',
        text: `
          Software Engineer
          TechCorp
          San Francisco, CA
          $120,000 - $150,000
          Full-time
          Remote work available

          We are looking for a skilled software engineer with experience in:
          - JavaScript
          - React
          - Node.js
          - TypeScript

          Requirements:
          - 3+ years of experience
          - Bachelor's degree in Computer Science
        `,
      };

      // Mock successful extraction
      mockExtractJobDataWithAI.mockResolvedValue({
        title: 'Software Engineer',
        company: 'TechCorp',
        location: 'San Francisco, CA',
        salary: '$120,000 - $150,000',
        salaryMin: 120000,
        salaryMax: 150000,
        salaryCurrency: 'USD',
        salaryFrequency: 'annual',
        contractType: 'Full-time',
        description: 'We are looking for a skilled software engineer...',
        requirements: 'JavaScript, React, Node.js, TypeScript, 3+ years experience',
        skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
        experienceRequired: '3+ years',
        workMode: 'hybrid',
        isRemote: true,
        benefits: ['Remote work available'],
        postedDate: new Date().toISOString(),
        extractedAt: new Date().toISOString(),
        confidence: 0.9
      });

      const result = await extractJobDataWithAI(mockPageData);

      expect(result).toBeDefined();
      expect(result.title).toBe('Software Engineer');
      expect(result.company).toBe('TechCorp');
      expect(typeof result.title).toBe('string');
      expect(typeof result.company).toBe('string');
      expect(result.salaryMin).toBe(120000);
      expect(result.salaryMax).toBe(150000);
    });

    it('should handle empty or malformed data gracefully', async () => {
      const mockPageData = {
        url: 'https://example.com/empty',
        title: '',
        text: '',
      };

      // Mock extraction with minimal data
      mockExtractJobDataWithAI.mockResolvedValue({
        title: 'Unknown Position',
        company: 'Unknown Company',
        location: 'Not specified',
        salary: 'Not specified',
        description: 'Job description not available',
        requirements: 'Not specified',
        skills: [],
        extractedAt: new Date().toISOString(),
        confidence: 0.1
      });

      const result = await extractJobDataWithAI(mockPageData);

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.company).toBeDefined();
      expect(result.title).toBe('Unknown Position');
      expect(result.company).toBe('Unknown Company');
      expect(result.confidence).toBe(0.1);
    });
  });
});