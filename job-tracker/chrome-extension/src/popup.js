const API_BASE_URL = 'http://localhost:3000/api';

// DOM Elements
const authSection = document.getElementById('authSection');
const mainSection = document.getElementById('mainSection');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const extractBtn = document.getElementById('extractBtn');
const logoutLink = document.getElementById('logoutLink');
const dashboardLink = document.getElementById('dashboardLink');
const userEmail = document.getElementById('userEmail');
const statusDiv = document.getElementById('status');

// Check authentication on load
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthState();
});

// Login form submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="loading"></span>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: include cookies
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      await chrome.storage.local.set({ token: data.token, user: data.user });
      showMainSection(data.user);
      showStatus('Logged in successfully!', 'success');
    } else {
      showStatus(data.error || 'Login failed', 'error');
    }
  } catch (error) {
    showStatus('Connection error. Please try again.', 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});

// Register button
registerBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:3000/register' });
});

// Dashboard link
dashboardLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
});

// Logout
logoutLink.addEventListener('click', async (e) => {
  e.preventDefault();
  
  const token = await getStoredToken();
  if (token) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });
  }
  
  // Clear extension storage
  await chrome.storage.local.remove(['token', 'user']);
  
  // Clear cookies
  try {
    await chrome.cookies.remove({
      url: 'http://localhost:3000',
      name: 'token'
    });
  } catch (error) {
    console.log('Could not clear cookie');
  }
  
  showAuthSection();
  showStatus('Logged out successfully', 'info');
});

// Extract job button
extractBtn.addEventListener('click', async () => {
  extractBtn.disabled = true;
  extractBtn.innerHTML = '<span class="loading"></span>';
  
  try {
    // Get the best available token
    const token = await getBestToken();
    console.log('Extract: Got token:', token ? 'Yes (' + token.substring(0, 20) + '...)' : 'No');
    
    if (!token) {
      showStatus('Please log in first', 'error');
      showAuthSection();
      return;
    }
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject content script to extract page data
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractEnhancedPageData,
    });
    
    const pageData = results[0].result;
    console.log('Extracted page data:', pageData);
    
    // Send enhanced data to API for AI processing
    const response = await fetch(`${API_BASE_URL}/jobs/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        url: tab.url,
        html: pageData.html,
        text: pageData.pageText,
        title: pageData.title,
        structured: pageData.structuredData,
        // Pass the pre-extracted data for AI enhancement
        jobTitle: pageData.jobTitle,
        company: pageData.company,
        location: pageData.location,
        salary: pageData.salary,
        description: pageData.description,
        requirements: pageData.requirements,
        skills: pageData.skills,
        workMode: pageData.workMode,
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showStatus('Job extracted successfully!', 'success');
      setTimeout(() => {
        chrome.tabs.create({ url: `http://localhost:3000/dashboard` });
      }, 1500);
    } else {
      console.error('Extraction failed:', response.status, data);
      showStatus(data.error || 'Extraction failed', 'error');
      
      // If token is invalid, clear auth and show login
      if (response.status === 401) {
        console.log('Got 401, clearing auth and showing login');
        await chrome.storage.local.remove(['token', 'user']);
        showAuthSection();
      }
    }
  } catch (error) {
    console.error('Extraction error:', error);
    showStatus('Failed to extract job. Please try again.', 'error');
  } finally {
    extractBtn.disabled = false;
    extractBtn.textContent = 'Extract Job Offer';
  }
});

// Helper functions
async function getStoredToken() {
  const result = await chrome.storage.local.get('token');
  return result.token;
}

async function getBestToken() {
  // Try multiple sources for the token
  
  // 1. Check cookies first (most reliable)
  try {
    const cookie = await chrome.cookies.get({
      url: 'http://localhost:3000',
      name: 'token'
    });
    if (cookie && cookie.value) {
      console.log('Using token from cookie');
      return cookie.value;
    }
  } catch (error) {
    console.log('No cookie found');
  }
  
  // 2. Check extension storage
  const storedToken = await getStoredToken();
  if (storedToken) {
    console.log('Using token from extension storage');
    return storedToken;
  }
  
  // 3. Try to get from web app if we're on it
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.url && tab.url.startsWith('http://localhost:3000')) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => localStorage.getItem('token'),
      });
      const webToken = results[0].result;
      if (webToken) {
        console.log('Using token from web app localStorage');
        return webToken;
      }
    }
  } catch (error) {
    console.log('Could not get token from web app');
  }
  
  return null;
}

async function checkAuthState() {
  try {
    // Get the best available token
    const token = await getBestToken();
    
    if (!token) {
      showAuthSection();
      return;
    }
    
    // Validate the token with the API
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      // Store the valid token and user
      await chrome.storage.local.set({ 
        token: token, 
        user: data.user 
      });
      showMainSection(data.user);
    } else {
      // Token is invalid, clear storage and show auth
      await chrome.storage.local.remove(['token', 'user']);
      showAuthSection();
    }
  } catch (error) {
    console.error('Auth state check error:', error);
    showAuthSection();
  }
}

async function checkAuth(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      showMainSection(data.user);
      return true;
    } else {
      await chrome.storage.local.remove(['token', 'user']);
      showAuthSection();
      return false;
    }
  } catch (error) {
    console.error('Auth check error:', error);
    showAuthSection();
    return false;
  }
}

function showAuthSection() {
  authSection.classList.remove('hidden');
  mainSection.classList.add('hidden');
}

function showMainSection(user) {
  authSection.classList.add('hidden');
  mainSection.classList.remove('hidden');
  userEmail.textContent = user.email;
}

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000);
}

// Enhanced function to extract page data (runs in the page context) - matches content.js
function extractEnhancedPageData() {
  // Helper function to get text content safely
  const getText = (selector) => {
    const element = document.querySelector(selector);
    return element ? element.textContent.trim() : '';
  };

  const getAllText = (selector) => {
    const elements = document.querySelectorAll(selector);
    return Array.from(elements).map(el => el.textContent.trim()).filter(Boolean);
  };

  // Extract job title
  const extractJobTitle = () => {
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
  };

  // Extract company
  const extractCompany = () => {
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
  };

  // Extract location
  const extractLocation = () => {
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
  };

  // Extract salary
  const extractSalary = () => {
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
  };

  // Extract description
  const extractDescription = () => {
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
  };

  // Extract requirements
  const extractRequirements = () => {
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
  };

  // Extract skills
  const extractSkills = () => {
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
  };

  // Extract work mode
  const extractWorkMode = () => {
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
  };

  // Extract structured data
  const extractStructuredData = () => {
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
  };

  // Return comprehensive data for AI processing
  return {
    url: window.location.href,
    title: document.title,
    pageText: document.body.innerText.substring(0, 10000),
    html: document.documentElement.outerHTML.substring(0, 50000),
    
    // Pre-extracted data
    jobTitle: extractJobTitle(),
    company: extractCompany(),
    location: extractLocation(),
    salary: extractSalary(),
    description: extractDescription(),
    requirements: extractRequirements(),
    skills: extractSkills(),
    workMode: extractWorkMode(),
    structuredData: extractStructuredData(),
  };
}