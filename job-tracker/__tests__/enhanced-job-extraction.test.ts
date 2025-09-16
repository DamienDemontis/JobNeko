/**
 * Enhanced Job Extraction Test
 * Tests the comprehensive AI extraction capabilities with richer data fields
 */

import { extractJobDataWithAI, ExtractedJobData } from '../lib/ai-service';

// Mock data simulating a comprehensive job posting
const mockJobPosting = {
  url: 'https://example.com/jobs/senior-backend-engineer',
  title: 'Senior Backend Engineer - TechCorp',
  html: `
    <div class="job-posting">
      <h1>Senior Backend Engineer</h1>
      <div class="company-info">
        <img src="https://techcorp.com/logo.png" alt="TechCorp Logo" class="company-logo">
        <h2>TechCorp</h2>
        <p>A fast-growing scale-up in the fintech space</p>
      </div>

      <div class="job-details">
        <p><strong>Location:</strong> San Francisco, CA (Remote friendly)</p>
        <p><strong>Salary:</strong> $140,000 - $180,000 per year</p>
        <p><strong>Team:</strong> Join our 8-person backend engineering team</p>
        <p><strong>Experience:</strong> 5+ years required</p>
        <p><strong>Bonus:</strong> Up to 15% performance bonus annually</p>
        <p><strong>Equity:</strong> RSU grant worth $40,000 vesting over 4 years</p>
      </div>

      <div class="description">
        <h3>About the Role</h3>
        <p>Join our backend engineering team to build scalable microservices that power our fintech platform.
        You'll work on high-impact projects serving millions of users, designing APIs, optimizing database
        performance, and mentoring junior developers. This role offers significant growth opportunities
        in a collaborative, innovation-driven environment.</p>

        <h3>What You'll Do Daily</h3>
        <ul>
          <li>Write clean, maintainable Python code using Django framework</li>
          <li>Design and optimize complex PostgreSQL queries</li>
          <li>Deploy services to AWS using Docker and Kubernetes</li>
          <li>Participate in code reviews and mentor team members</li>
          <li>Collaborate with product team in daily standups</li>
        </ul>

        <h3>Key Projects</h3>
        <ul>
          <li>Migration from monolith to microservices architecture</li>
          <li>Real-time payment processing system</li>
          <li>Performance optimization reducing latency by 50%</li>
        </ul>
      </div>

      <div class="requirements">
        <h3>Requirements</h3>
        <ul>
          <li>5+ years of backend development experience</li>
          <li>Expert-level Python and Django skills</li>
          <li>Strong PostgreSQL and Redis knowledge</li>
          <li>AWS cloud platform experience</li>
          <li>Docker and Kubernetes proficiency</li>
          <li>Agile/Scrum methodology experience</li>
          <li>Test-driven development practices</li>
        </ul>
      </div>

      <div class="benefits">
        <h3>Benefits & Culture</h3>
        <ul>
          <li>Comprehensive health, dental, and vision insurance</li>
          <li>Flexible work arrangements with remote options</li>
          <li>$3,000 annual professional development budget</li>
          <li>401k matching up to 4%</li>
          <li>Unlimited PTO policy</li>
          <li>Modern equipment and home office stipend</li>
        </ul>

        <p><strong>Culture:</strong> We're a collaborative, learning-focused team that values work-life balance.
        Our environment encourages innovation and provides flexible hours with core collaboration time.</p>
      </div>
    </div>
  `,
  text: 'Senior Backend Engineer at TechCorp - $140,000-$180,000 - San Francisco, CA - Remote friendly'
};

describe('Enhanced Job Extraction with AI', () => {
  // Skip these tests if no AI service is available
  const skipIfNoAI = process.env.OPENAI_API_KEY ? test : test.skip;

  skipIfNoAI('should extract comprehensive job data with enhanced fields', async () => {
    const result = await extractJobDataWithAI(mockJobPosting);

    // Verify basic extraction still works
    expect(result.title).toBe('Senior Backend Engineer');
    expect(result.company).toBe('TechCorp');
    expect(result.location).toContain('San Francisco');

    // Test enhanced fields that improve overview display
    expect(result.yearsExperienceRequired).toBeGreaterThanOrEqual(5);
    expect(result.teamSize).toContain('8');
    expect(result.companyStage).toBeDefined();
    expect(result.managementLevel).toBe('individual_contributor');

    // Test comprehensive skills categorization
    expect(result.programmingLanguages).toContain('Python');
    expect(result.frameworks).toContain('Django');
    expect(result.databases).toContain('PostgreSQL');
    expect(result.cloudPlatforms).toContain('AWS');
    expect(result.tools).toContain('Docker');
    expect(result.methodologies).toContain('Agile');

    // Test detailed role information
    expect(result.responsibilities).toHaveLength(4); // Should extract key responsibilities
    expect(result.dayToDay).toHaveLength(5); // Should extract daily activities
    expect(result.keyProjects).toHaveLength(3); // Should extract mentioned projects
    expect(result.impact).toContain('millions of users');

    // Test enhanced compensation analysis
    expect(result.salaryMin).toBe(140000);
    expect(result.salaryMax).toBe(180000);
    expect(result.bonusStructure?.type).toBe('performance');
    expect(result.bonusStructure?.percentage).toBe(15);
    expect(result.equityOffered?.type).toBe('RSU');
    expect(result.totalCompMin).toBeGreaterThan(140000); // Should include bonus and equity

    // Test culture and work environment
    expect(result.cultureHighlights).toContain('collaborative');
    expect(result.workLifeBalance).toContain('flexible');
    expect(result.benefits).toContain('health insurance');

    console.log('✅ Enhanced job extraction test passed!');
    console.log(`📊 Extracted ${result.programmingLanguages?.length || 0} programming languages`);
    console.log(`🔧 Extracted ${result.tools?.length || 0} development tools`);
    console.log(`📋 Extracted ${result.responsibilities?.length || 0} key responsibilities`);
    console.log(`🎯 Extracted ${result.keyProjects?.length || 0} key projects`);
  }, 15000);

  skipIfNoAI('should handle jobs without comprehensive data gracefully', async () => {
    const basicJob = {
      url: 'https://example.com/basic-job',
      title: 'Software Engineer',
      html: '<div><h1>Software Engineer</h1><p>Basic job posting with minimal information</p></div>',
      text: 'Software Engineer - Basic posting'
    };

    const result = await extractJobDataWithAI(basicJob);

    // Should still extract basic information
    expect(result.title).toBe('Software Engineer');

    // Enhanced fields should be undefined or have sensible defaults
    expect(result.yearsExperienceRequired).toBeDefined(); // AI should infer some experience level
    expect(result.companyStage).toBeDefined(); // Should have a default

    // Arrays should be empty rather than undefined
    expect(Array.isArray(result.programmingLanguages)).toBeTruthy();
    expect(Array.isArray(result.responsibilities)).toBeTruthy();
    expect(Array.isArray(result.keyProjects)).toBeTruthy();

    console.log('✅ Basic job extraction test passed!');
  }, 10000);

  test('should maintain type safety with enhanced interface', () => {
    // Verify the ExtractedJobData interface includes all new fields
    const mockData: Partial<ExtractedJobData> = {
      yearsExperienceRequired: 5,
      managementLevel: 'individual_contributor',
      companyStage: 'scale_up',
      programmingLanguages: ['Python', 'JavaScript'],
      databases: ['PostgreSQL', 'Redis'],
      cloudPlatforms: ['AWS'],
      methodologies: ['Agile', 'TDD'],
      responsibilities: ['Design APIs', 'Optimize performance'],
      dayToDay: ['Write code', 'Review PRs'],
      keyProjects: ['Microservices migration'],
      impact: 'Improve user experience',
      cultureHighlights: ['collaborative', 'innovative'],
      workLifeBalance: 'Flexible hours'
    };

    // If this compiles, the types are correctly defined
    expect(mockData.yearsExperienceRequired).toBe(5);
    expect(mockData.programmingLanguages).toHaveLength(2);
    expect(mockData.responsibilities).toHaveLength(2);

    console.log('✅ Type safety test passed!');
  });
});