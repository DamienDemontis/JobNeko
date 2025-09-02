// Job Extractor Content Script - Extract Only Mode

(() => {
  // Site-specific extractors
  const extractors = {
    indeed: {
      matches: url => url.includes('indeed.com'),
      extract: () => {
        const data = {};
        
        // Job title
        const titleElement = document.querySelector('h1[data-testid="job-title"], h1.jobsearch-JobInfoHeader-title, .jobsearch-JobInfoHeader-title');
        data.title = titleElement?.textContent?.trim() || '';
        
        // Company name
        const companyElement = document.querySelector('[data-testid="company-name"], div[data-company-name="true"] a, .jobsearch-InlineCompanyRating-companyHeader a');
        data.company = companyElement?.textContent?.trim() || '';
        
        // Location
        const locationElement = document.querySelector('[data-testid="job-location"], [data-testid="jobsearch-JobInfoHeader-companyLocation"], div[data-testid="job-location"]');
        data.location = locationElement?.textContent?.trim() || '';
        
        // Description
        const descElement = document.querySelector('#jobDescriptionText, .jobsearch-JobComponent-description');
        data.description = descElement?.textContent?.trim() || '';
        
        // Salary
        const salaryElement = document.querySelector('[data-testid="job-salary"], .jobsearch-JobMetadataHeader-salaryText');
        data.salary = salaryElement?.textContent?.trim() || '';
        
        // Job URL
        data.url = window.location.href;
        
        // Employment type
        const typeElement = document.querySelector('.jobsearch-JobMetadataHeader-item:has(.jobsearch-JobMetadataHeader-iconLabel)');
        data.employmentType = typeElement?.textContent?.trim() || '';
        
        return data;
      }
    },
    
    linkedin: {
      matches: url => url.includes('linkedin.com/jobs'),
      extract: () => {
        const data = {};
        
        // Job title
        const titleElement = document.querySelector('h1.t-24, h1.jobs-unified-top-card__job-title');
        data.title = titleElement?.textContent?.trim() || '';
        
        // Company name  
        const companyElement = document.querySelector('.jobs-unified-top-card__company-name a, .jobs-unified-top-card__subtitle-primary-grouping a');
        data.company = companyElement?.textContent?.trim() || '';
        
        // Location
        const locationElement = document.querySelector('.jobs-unified-top-card__bullet, span.jobs-unified-top-card__workplace-type');
        data.location = locationElement?.textContent?.trim() || '';
        
        // Description
        const descElement = document.querySelector('.jobs-description__content, .jobs-box__html-content');
        data.description = descElement?.textContent?.trim() || '';
        
        // Job URL
        data.url = window.location.href.split('?')[0]; // Remove query params
        
        // Employment type
        const typeElement = document.querySelector('.jobs-unified-top-card__job-insight span');
        data.employmentType = typeElement?.textContent?.trim() || '';
        
        return data;
      }
    },
    
    glassdoor: {
      matches: url => url.includes('glassdoor.com'),
      extract: () => {
        const data = {};
        
        // Job title
        const titleElement = document.querySelector('[data-test="job-title"], .JobDetails_jobTitle__Rw_gn');
        data.title = titleElement?.textContent?.trim() || '';
        
        // Company name
        const companyElement = document.querySelector('[data-test="employer-name"], .JobDetails_companyName__FvAcX');
        data.company = companyElement?.textContent?.trim() || '';
        
        // Location
        const locationElement = document.querySelector('[data-test="location"], .JobDetails_location__MbnUM');
        data.location = locationElement?.textContent?.trim() || '';
        
        // Description
        const descElement = document.querySelector('.JobDetails_jobDescription__6VeBn, .JobDetails_jobDescriptionWrapper__X5Jqb');
        data.description = descElement?.textContent?.trim() || '';
        
        // Salary
        const salaryElement = document.querySelector('[data-test="detailSalary"], .JobDetails_salaryEstimate__b68tM');
        data.salary = salaryElement?.textContent?.trim() || '';
        
        // Job URL
        data.url = window.location.href;
        
        return data;
      }
    }
  };

  // Get the appropriate extractor for the current site
  function getExtractor() {
    const url = window.location.href;
    for (const [name, extractor] of Object.entries(extractors)) {
      if (extractor.matches(url)) {
        return extractor;
      }
    }
    return null;
  }

  // Generic AI-powered extraction for unknown sites
  function extractGenericJobData() {
    try {
      const data = {};
      
      // Try to find job title using common patterns
      const titleSelectors = [
        'h1', 'h2', 'h3',
        '[class*="title"]', '[class*="job"]', '[class*="position"]',
        '[id*="title"]', '[id*="job"]', '[id*="position"]',
        '.job-title', '.position-title', '.post-title'
      ];
      
      // First pass - look for job-related keywords
      const jobKeywords = ['developer', 'engineer', 'manager', 'analyst', 'designer', 'specialist', 'coordinator', 'director', 'lead', 'senior', 'junior', 'intern', 'programmer', 'architect', 'consultant', 'administrator', 'technician'];
      
      for (const selector of titleSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent?.trim();
          if (text && text.length > 5 && text.length < 100) {
            if (jobKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
              data.title = text;
              break;
            }
          }
        }
        if (data.title) break;
      }
      
      // Second pass - if no job-related title found, use the main heading
      if (!data.title) {
        const mainHeading = document.querySelector('h1');
        if (mainHeading) {
          const text = mainHeading.textContent?.trim();
          if (text && text.length > 3 && text.length < 150) {
            data.title = text;
          }
        }
      }
      
      // Try to find company name
      const companySelectors = [
        '[class*="company"]', '[class*="employer"]', '[class*="organization"]',
        '[id*="company"]', '[id*="employer"]', 
        '.company-name', '.employer-name', '.org-name',
        'meta[property="og:site_name"]', 'meta[name="author"]'
      ];
      
      for (const selector of companySelectors) {
        let text = null;
        const element = document.querySelector(selector);
        
        if (element && element.tagName === 'META') {
          text = element.getAttribute('content')?.trim();
        } else {
          text = element?.textContent?.trim();
        }
        
        if (text && text.length > 1 && text.length < 50) {
          data.company = text;
          break;
        }
      }
      
      // Fallback - try to extract from domain name
      if (!data.company) {
        const hostname = window.location.hostname;
        const domainParts = hostname.split('.');
        let domainName = domainParts[domainParts.length - 2]; // get the main domain part
        
        if (domainName && domainName !== 'www') {
          // Clean up and capitalize
          domainName = domainName.replace(/[-_]/g, ' ');
          domainName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
          data.company = domainName;
        }
      }
      
      // Try to find location
      const locationSelectors = [
        '[class*="location"]', '[class*="city"]', '[class*="address"]',
        '[id*="location"]', '[id*="city"]',
        '.location', '.city', '.address'
      ];
      
      for (const selector of locationSelectors) {
        const element = document.querySelector(selector);
        const text = element?.textContent?.trim();
        if (text && text.length > 2 && text.length < 100) {
          data.location = text;
          break;
        }
      }
      
      // Get page description - try to find the main content
      const descriptionSelectors = [
        '[class*="description"]', '[class*="content"]', '[class*="detail"]',
        '[id*="description"]', '[id*="content"]',
        '.description', '.content', '.job-description', '.post-content'
      ];
      
      for (const selector of descriptionSelectors) {
        const element = document.querySelector(selector);
        const text = element?.textContent?.trim();
        if (text && text.length > 50) {
          data.description = text.substring(0, 1000); // Limit description length
          break;
        }
      }
      
      // If no specific description found, get the main content of the page
      if (!data.description) {
        const mainContent = document.querySelector('main') || document.querySelector('article') || document.querySelector('.main-content') || document.body;
        const text = mainContent?.textContent?.trim();
        if (text && text.length > 100) {
          data.description = text.substring(0, 1000);
        }
      }
      
      // Set current URL
      data.url = window.location.href;
      
      return data;
    } catch (error) {
      console.error('Error in generic extraction:', error);
      return null;
    }
  }

  // Extract job data from the current page
  function extractJobData() {
    const extractor = getExtractor();
    let data = null;
    
    if (extractor) {
      // Use site-specific extractor
      try {
        data = extractor.extract();
      } catch (error) {
        console.error('Site-specific extraction failed:', error);
      }
    }
    
    // If no site-specific extractor or it failed, try generic extraction
    if (!data || !data.title || !data.company) {
      console.log('Trying generic extraction...');
      data = extractGenericJobData();
    }
    
    if (!data) {
      console.log('No job data could be extracted');
      return null;
    }
    
    // Validate that we have essential data
    if (!data.title || !data.company) {
      console.log('Missing essential job data (title or company)');
      return null;
    }
      
      // Parse salary if present
      if (data.salary) {
        const salaryMatch = data.salary.match(/\$?([\d,]+)\s*-?\s*\$?([\d,]+)?/);
        if (salaryMatch) {
          data.salaryMin = parseInt(salaryMatch[1].replace(/,/g, '')) || null;
          data.salaryMax = salaryMatch[2] ? parseInt(salaryMatch[2].replace(/,/g, '')) : null;
        }
      }
      
      // Determine employment type
      const desc = (data.description + ' ' + data.employmentType).toLowerCase();
      if (desc.includes('full-time') || desc.includes('full time')) {
        data.employmentType = 'full-time';
      } else if (desc.includes('part-time') || desc.includes('part time')) {
        data.employmentType = 'part-time';
      } else if (desc.includes('contract')) {
        data.employmentType = 'contract';
      } else if (desc.includes('intern')) {
        data.employmentType = 'internship';
      } else {
        data.employmentType = 'full-time'; // default
      }
      
      // Determine remote policy
      const locationDesc = (data.location + ' ' + data.description).toLowerCase();
      if (locationDesc.includes('remote')) {
        data.remotePolicy = 'remote';
      } else if (locationDesc.includes('hybrid')) {
        data.remotePolicy = 'hybrid';
      } else {
        data.remotePolicy = 'on-site';
      }
      
      return data;
    } catch (error) {
      console.error('Error extracting job data:', error);
      return null;
    }
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractJobData') {
      const jobData = extractJobData();
      sendResponse({ success: !!jobData, data: jobData });
    }
  });

  console.log('Job Tracker: Content script loaded for', window.location.hostname);
})();