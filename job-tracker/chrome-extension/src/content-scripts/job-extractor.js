// Job Extractor Content Script

(() => {
  let saveButton = null;
  let currentJobData = null;

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

  // Extract job data from the current page
  function extractJobData() {
    const extractor = getExtractor();
    if (!extractor) {
      console.log('No extractor found for this site');
      return null;
    }
    
    try {
      const data = extractor.extract();
      
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

  // Create save button
  function createSaveButton() {
    if (saveButton) return;
    
    saveButton = document.createElement('button');
    saveButton.id = 'job-tracker-save-btn';
    saveButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      <span>Save Job</span>
    `;
    saveButton.className = 'job-tracker-save-btn';
    
    saveButton.addEventListener('click', handleSaveClick);
    document.body.appendChild(saveButton);
  }

  // Handle save button click
  async function handleSaveClick() {
    if (!currentJobData) {
      currentJobData = extractJobData();
    }
    
    if (!currentJobData) {
      showNotification('Unable to extract job data from this page', 'error');
      return;
    }
    
    // Check authentication
    chrome.runtime.sendMessage({ action: 'getAuthStatus' }, response => {
      if (!response.isAuthenticated) {
        if (confirm('You need to sign in to save jobs. Open sign in page?')) {
          chrome.runtime.sendMessage({ action: 'openAuthTab' });
        }
        return;
      }
      
      // Save the job
      saveButton.disabled = true;
      saveButton.innerHTML = '<span>Saving...</span>';
      
      chrome.runtime.sendMessage({ 
        action: 'saveJob', 
        data: currentJobData 
      }, response => {
        if (response.success) {
          showNotification('Job saved successfully!', 'success');
          saveButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Saved</span>
          `;
        } else {
          showNotification('Failed to save job: ' + response.error, 'error');
          saveButton.disabled = false;
          saveButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            <span>Save Job</span>
          `;
        }
      });
    });
  }

  // Show notification
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `job-tracker-notification job-tracker-notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('job-tracker-notification-show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('job-tracker-notification-show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Check if current page is a job listing
  function checkForJobListing() {
    const extractor = getExtractor();
    if (extractor) {
      // Try to extract job data
      currentJobData = extractJobData();
      if (currentJobData && currentJobData.title) {
        createSaveButton();
      }
    }
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkForJobListing') {
      checkForJobListing();
    }
  });

  // Initialize when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkForJobListing);
  } else {
    // Delay to ensure page content is loaded
    setTimeout(checkForJobListing, 1000);
  }
  
  // Also check when URL changes (for SPAs)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(checkForJobListing, 1000);
    }
  }).observe(document, { subtree: true, childList: true });
})();