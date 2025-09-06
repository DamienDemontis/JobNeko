// Content script for job extraction

console.log('Job Tracker content script loaded');

// Listen for extraction requests from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractPageData') {
    const data = extractJobData();
    sendResponse(data);
  }
});

function extractJobData() {
  // Helper function to get text content safely
  const getText = (selector) => {
    const element = document.querySelector(selector);
    return element ? element.textContent.trim() : '';
  };

  const getAllText = (selector) => {
    const elements = document.querySelectorAll(selector);
    return Array.from(elements).map(el => el.textContent.trim()).filter(Boolean);
  };

  // Try multiple strategies to extract job data
  const data = {
    url: window.location.href,
    title: document.title,
    
    // Try to extract job-specific data
    jobTitle: extractJobTitle(),
    company: extractCompany(),
    location: extractLocation(),
    salary: extractSalary(),
    description: extractDescription(),
    requirements: extractRequirements(),
    skills: extractSkills(),
    workMode: extractWorkMode(),
    
    // Raw page data for AI processing
    pageText: document.body.innerText.substring(0, 10000),
    structuredData: extractStructuredData(),
  };

  return data;
}

function extractJobTitle() {
  const selectors = [
    'h1',
    '[class*="job-title"]',
    '[class*="position-title"]',
    '[class*="job_title"]',
    '[id*="job-title"]',
    '[data-testid*="job-title"]',
    '.job-title',
    '.position',
    '[role="heading"][aria-level="1"]',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      return element.textContent.trim();
    }
  }

  return '';
}

function extractCompany() {
  const selectors = [
    '[class*="company-name"]',
    '[class*="employer"]',
    '[class*="organization"]',
    '[data-testid*="company"]',
    '.company',
    '[itemProp="hiringOrganization"]',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      return element.textContent.trim();
    }
  }

  return '';
}

function extractLocation() {
  const selectors = [
    '[class*="location"]',
    '[class*="address"]',
    '[class*="job-location"]',
    '[data-testid*="location"]',
    '[itemProp="jobLocation"]',
    '.location',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      return element.textContent.trim();
    }
  }

  return '';
}

function extractSalary() {
  const selectors = [
    '[class*="salary"]',
    '[class*="compensation"]',
    '[class*="pay"]',
    '[class*="wage"]',
    '[data-testid*="salary"]',
    '[itemProp="baseSalary"]',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      return element.textContent.trim();
    }
  }

  // Look for salary patterns in text
  const salaryPattern = /\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:per|\/)\s*(?:year|hour|month))?/gi;
  const matches = document.body.innerText.match(salaryPattern);
  if (matches && matches.length > 0) {
    return matches[0];
  }

  return '';
}

function extractDescription() {
  const selectors = [
    '[class*="description"]',
    '[class*="job-description"]',
    '[class*="summary"]',
    '[class*="overview"]',
    '[data-testid*="description"]',
    '[itemProp="description"]',
    '.description',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim().length > 100) {
      return element.textContent.trim();
    }
  }

  return '';
}

function extractRequirements() {
  const selectors = [
    '[class*="requirement"]',
    '[class*="qualification"]',
    '[class*="must-have"]',
    '[data-testid*="requirement"]',
  ];

  const requirements = [];
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const text = el.textContent.trim();
      if (text && !requirements.includes(text)) {
        requirements.push(text);
      }
    });
  }

  return requirements.join('\n');
}

function extractSkills() {
  const selectors = [
    '[class*="skill"]',
    '[class*="technology"]',
    '[class*="tech-stack"]',
    '[data-testid*="skill"]',
    '.skill-tag',
    '.tech',
  ];

  const skills = new Set();
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const text = el.textContent.trim();
      if (text && text.length < 50) { // Avoid long paragraphs
        skills.add(text);
      }
    });
  }

  return Array.from(skills).join(', ');
}

function extractWorkMode() {
  const text = document.body.innerText.toLowerCase();
  
  if (text.includes('remote') || text.includes('work from home') || text.includes('wfh')) {
    if (text.includes('hybrid')) {
      return 'hybrid';
    }
    return 'remote';
  }
  
  if (text.includes('hybrid')) {
    return 'hybrid';
  }
  
  if (text.includes('on-site') || text.includes('onsite') || text.includes('in-office')) {
    return 'onsite';
  }
  
  return '';
}

function extractStructuredData() {
  // Look for JSON-LD structured data
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  const structuredData = [];
  
  scripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent);
      if (data['@type'] === 'JobPosting' || (Array.isArray(data) && data.some(item => item['@type'] === 'JobPosting'))) {
        structuredData.push(data);
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  });
  
  return structuredData;
}