import { extractJobDataWithAI, type ExtractedJobData } from '../lib/ai-service';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');

// Mock fetch for Ollama
global.fetch = jest.fn();

describe('Enhanced AI Job Data Extraction', () => {
  const mockOpenAIResponse = {
    choices: [{
      message: {
        content: JSON.stringify({
          title: 'Senior Software Engineer',
          company: 'TechCorp',
          location: 'San Francisco, CA',
          salary: '$120,000 - $160,000 per year',
          salaryMin: 120000,
          salaryMax: 160000,
          salaryCurrency: 'USD',
          salaryFrequency: 'annual',
          contractType: 'Full-time',
          bonusStructure: {
            type: 'performance',
            percentage: 15,
            frequency: 'annual'
          },
          equityOffered: {
            type: 'RSU',
            amount: '$50,000',
            vestingPeriod: '4 years',
            vestingSchedule: '25% each year'
          },
          totalCompMin: 140000,
          totalCompMax: 200000,
          isNegotiable: true,
          remotePayAdjustment: false,
          skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker'],
          description: 'Join our engineering team to build scalable web applications...',
          requirements: 'Bachelor\'s degree in Computer Science or equivalent...',
          perks: 'Health insurance, 401k matching, flexible PTO...',
          workMode: 'hybrid',
          summary: 'Senior Software Engineer role at TechCorp with competitive compensation...'
        })
      }
    }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'mock-api-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_API_URL;
  });

  describe('extractJobDataWithAI', () => {
    test('extracts comprehensive job data using OpenAI', async () => {
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockOpenAIResponse)
          }
        }
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      const pageData = {
        url: 'https://example.com/job/123',
        title: 'Senior Software Engineer at TechCorp',
        text: 'Senior Software Engineer position at TechCorp. $120k-$160k + bonus + equity. Remote-friendly.',
        html: '<html>...</html>'
      };

      const result = await extractJobDataWithAI(pageData);

      expect(result).toEqual(expect.objectContaining({
        title: 'Senior Software Engineer',
        company: 'TechCorp',
        salaryMin: 120000,
        salaryMax: 160000,
        salaryCurrency: 'USD',
        salaryFrequency: 'annual',
        bonusStructure: expect.objectContaining({
          type: 'performance',
          percentage: 15
        }),
        equityOffered: expect.objectContaining({
          type: 'RSU',
          amount: '$50,000'
        }),
        isNegotiable: true,
        remotePayAdjustment: false
      }));

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          temperature: 0,
          response_format: { type: 'json_object' }
        })
      );
    });

    test('extracts job data using Ollama when OpenAI unavailable', async () => {
      delete process.env.OPENAI_API_KEY;
      process.env.OLLAMA_API_URL = 'http://localhost:11434';

      // Mock Ollama availability check
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // tags endpoint check
        .mockResolvedValueOnce({ // generate endpoint
          ok: true,
          json: () => Promise.resolve({
            response: JSON.stringify({
              title: 'Backend Developer',
              company: 'StartupCo',
              salary: '$80,000 - $100,000',
              salaryMin: 80000,
              salaryMax: 100000,
              salaryCurrency: 'USD',
              contractType: 'Full-time'
            })
          })
        });

      const pageData = {
        url: 'https://example.com/job/456',
        text: 'Backend Developer at StartupCo. $80k-$100k salary.'
      };

      const result = await extractJobDataWithAI(pageData);

      expect(result.title).toBe('Backend Developer');
      expect(result.company).toBe('StartupCo');
      expect(result.salaryMin).toBe(80000);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('llama3.1:8b')
        })
      );
    });

    test('throws error when no AI services are available', async () => {
      delete process.env.OPENAI_API_KEY;
      
      // Mock Ollama unavailability
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const pageData = {
        url: 'https://example.com/job/789',
        text: 'Job description...'
      };

      await expect(extractJobDataWithAI(pageData)).rejects.toThrow(
        'No AI services configured. Please set up OpenAI API key or run Ollama locally'
      );
    });
  });

  describe('enhanced job data normalization', () => {
    test('auto-detects currency from salary string', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Developer',
              company: 'EuroTech',
              salary: '€60,000 - €80,000 per year',
              salaryMin: 60000,
              salaryMax: 80000,
              // No salaryCurrency provided - should be auto-detected
            })
          }
        }]
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      const result = await extractJobDataWithAI({
        url: 'test.com',
        text: '€60,000 - €80,000 per year'
      });

      expect(result.salaryCurrency).toBe('EUR');
    });

    test('auto-detects salary frequency', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Contractor',
              company: 'ConsultingFirm',
              salary: '$50 per hour',
              salaryMin: 50,
              salaryMax: 50,
              // No salaryFrequency provided - should be auto-detected
            })
          }
        }]
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      const result = await extractJobDataWithAI({
        url: 'test.com',
        text: '$50 per hour contract position'
      });

      expect(result.salaryFrequency).toBe('hourly');
    });

    test('detects negotiability from keywords', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Negotiable Role',
              company: 'FlexiCorp',
              salary: 'Competitive salary, negotiable based on experience',
              description: 'Great role with negotiable terms'
            })
          }
        }]
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      const result = await extractJobDataWithAI({
        url: 'test.com',
        text: 'Competitive salary, negotiable based on experience'
      });

      expect(result.isNegotiable).toBe(true);
    });

    test('handles different currency symbols correctly', async () => {
      const testCases = [
        { symbol: '$', expected: 'USD' },
        { symbol: '£', expected: 'GBP' },
        { symbol: '€', expected: 'EUR' },
        { symbol: '¥', expected: 'JPY' },
        { symbol: '₹', expected: 'INR' },
        { symbol: 'CHF', expected: 'CHF' }
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                title: 'Test Role',
                company: 'TestCorp',
                salary: `${testCase.symbol}100,000`,
                salaryMin: 100000,
                salaryMax: 100000
              })
            }
          }]
        };

        const mockOpenAI = {
          chat: {
            completions: {
              create: jest.fn().mockResolvedValue(mockResponse)
            }
          }
        };

        (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

        const result = await extractJobDataWithAI({
          url: 'test.com',
          text: `${testCase.symbol}100,000 salary`
        });

        expect(result.salaryCurrency).toBe(testCase.expected);
      }
    });
  });

  describe('comprehensive compensation parsing', () => {
    test('extracts detailed bonus structure', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Sales Manager',
              company: 'SalesCorp',
              bonusStructure: {
                type: 'performance',
                percentage: 20,
                frequency: 'quarterly'
              }
            })
          }
        }]
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      const result = await extractJobDataWithAI({
        url: 'test.com',
        text: 'Sales role with 20% quarterly performance bonus'
      });

      expect(result.bonusStructure).toEqual({
        type: 'performance',
        percentage: 20,
        frequency: 'quarterly'
      });
    });

    test('extracts equity compensation details', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Senior Engineer',
              company: 'TechStartup',
              equityOffered: {
                type: 'options',
                amount: '1000 shares',
                vestingPeriod: '4 years',
                vestingSchedule: '1 year cliff, then monthly'
              }
            })
          }
        }]
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      const result = await extractJobDataWithAI({
        url: 'test.com',
        text: 'Startup role with stock options: 1000 shares, 4-year vesting with 1-year cliff'
      });

      expect(result.equityOffered).toEqual({
        type: 'options',
        amount: '1000 shares',
        vestingPeriod: '4 years',
        vestingSchedule: '1 year cliff, then monthly'
      });
    });

    test('provides default values for missing fields', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              // Minimal data - most fields missing
              title: 'Basic Job',
              company: 'Basic Corp'
            })
          }
        }]
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      const result = await extractJobDataWithAI({
        url: 'test.com',
        text: 'Basic job posting'
      });

      expect(result.title).toBe('Basic Job');
      expect(result.company).toBe('Basic Corp');
      expect(result.salaryCurrency).toBe('USD'); // Default fallback
      expect(result.salaryFrequency).toBe('annual'); // Default fallback
      expect(result.isNegotiable).toBe(false); // Default fallback
      expect(result.summary).toContain('Basic Job at Basic Corp'); // Auto-generated
    });

    test('handles array skills normalization', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Developer',
              company: 'DevCorp',
              skills: 'JavaScript, React, Node.js, Python' // String format
            })
          }
        }]
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse)
          }
        }
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI as any);

      const result = await extractJobDataWithAI({
        url: 'test.com',
        text: 'Developer role requiring JavaScript, React, Node.js, Python'
      });

      expect(result.skills).toEqual(['JavaScript', 'React', 'Node.js', 'Python']);
    });
  });
});