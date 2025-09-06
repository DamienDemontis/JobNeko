import { extractJobDataWithAI } from '@/lib/ai-service';

describe('AI Service', () => {
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

      const result = await extractJobDataWithAI(mockPageData);

      expect(result).toBeDefined();
      expect(result.title).toBeTruthy();
      expect(result.company).toBeTruthy();
      expect(typeof result.title).toBe('string');
      expect(typeof result.company).toBe('string');
    });

    it('should handle empty or malformed data gracefully', async () => {
      const mockPageData = {
        url: 'https://example.com/empty',
        title: '',
        text: '',
      };

      const result = await extractJobDataWithAI(mockPageData);

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.company).toBeDefined();
    });
  });
});