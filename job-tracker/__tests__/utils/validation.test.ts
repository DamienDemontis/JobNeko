import { z } from 'zod';

describe('Validation Utilities', () => {
  describe('Email validation', () => {
    const emailSchema = z.string().email();

    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'first+last@company.org',
        'number123@test.net',
      ];

      validEmails.forEach(email => {
        expect(() => emailSchema.parse(email)).not.toThrow();
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        '',
      ];

      invalidEmails.forEach(email => {
        expect(() => emailSchema.parse(email)).toThrow();
      });
    });
  });

  describe('Password validation', () => {
    const passwordSchema = z.string().min(6);

    it('should accept passwords with 6 or more characters', () => {
      const validPasswords = [
        'password',
        '123456',
        'verylongpassword',
        'p@ssw0rd!',
      ];

      validPasswords.forEach(password => {
        expect(() => passwordSchema.parse(password)).not.toThrow();
      });
    });

    it('should reject passwords with less than 6 characters', () => {
      const invalidPasswords = [
        '12345',
        'pwd',
        'a',
        '',
      ];

      invalidPasswords.forEach(password => {
        expect(() => passwordSchema.parse(password)).toThrow();
      });
    });
  });

  describe('Job data validation', () => {
    const jobSchema = z.object({
      title: z.string().min(1),
      company: z.string().min(1),
      location: z.string().optional(),
      salary: z.string().optional(),
      workMode: z.enum(['remote', 'hybrid', 'onsite']).optional(),
    });

    it('should validate complete job data', () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'TechCorp',
        location: 'San Francisco, CA',
        salary: '$120,000',
        workMode: 'remote' as const,
      };

      expect(() => jobSchema.parse(jobData)).not.toThrow();
      const parsed = jobSchema.parse(jobData);
      expect(parsed.title).toBe('Software Engineer');
      expect(parsed.workMode).toBe('remote');
    });

    it('should validate minimal job data', () => {
      const jobData = {
        title: 'Developer',
        company: 'Company Inc.',
      };

      expect(() => jobSchema.parse(jobData)).not.toThrow();
    });

    it('should reject invalid work modes', () => {
      const jobData = {
        title: 'Developer',
        company: 'Company Inc.',
        workMode: 'invalid-mode',
      };

      expect(() => jobSchema.parse(jobData)).toThrow();
    });

    it('should require title and company', () => {
      const incompleteJobs = [
        { company: 'Company Inc.' }, // Missing title
        { title: 'Developer' }, // Missing company
        {}, // Missing both
      ];

      incompleteJobs.forEach(job => {
        expect(() => jobSchema.parse(job)).toThrow();
      });
    });
  });

  describe('Rating validation', () => {
    const ratingSchema = z.number().min(1).max(5);

    it('should accept valid ratings', () => {
      const validRatings = [1, 2, 3, 4, 5];

      validRatings.forEach(rating => {
        expect(() => ratingSchema.parse(rating)).not.toThrow();
      });
    });

    it('should reject invalid ratings', () => {
      const invalidRatings = [0, 6, -1, 10];

      invalidRatings.forEach(rating => {
        expect(() => ratingSchema.parse(rating)).toThrow();
      });
    });
  });
});