const API_BASE_URL = 'http://localhost:3000/api';

// DOM Elements
const loadingSection = document.getElementById('loadingSection');
const headerSection = document.getElementById('headerSection');
const authSection = document.getElementById('authSection');
const mainSection = document.getElementById('mainSection');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const extractBtn = document.getElementById('extractBtn');
const logoutLink = document.getElementById('logoutLink');
const dashboardLink = document.getElementById('dashboardLink');
const userEmail = document.getElementById('userEmail');
const userAvatar = document.getElementById('userAvatar');
const statusDiv = document.getElementById('status');
const queueList = document.getElementById('queueList');
const queueCount = document.getElementById('queueCount');
const queueEmpty = document.getElementById('queueEmpty');

// Tab elements
const navTabs = document.querySelectorAll('.nav-tab');
const tabPanels = document.querySelectorAll('.tab-panel');

// Queue polling interval
let queueInterval = null;

// Check authentication on load
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  await checkAuthState();
});

// Login form submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="loading"></span> Signing In...';
  
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
  showStatus('Signed out successfully', 'info');
});

// Extract job button
extractBtn.addEventListener('click', async () => {
  extractBtn.disabled = true;
  extractBtn.innerHTML = '<span class="loading"></span> Adding to Queue...';

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

    // Extract page HTML using content script to bypass 403 errors
    let pageHtml = null;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.documentElement.outerHTML
      });
      pageHtml = results[0]?.result;
      console.log('📄 Extracted page HTML:', pageHtml ? `${pageHtml.length} chars` : 'Failed');
    } catch (error) {
      console.warn('⚠️ Could not extract HTML from page:', error);
      // Continue without HTML - server will try to fetch
    }

    // Add to extraction queue with optional pre-extracted HTML
    const response = await fetch(`${API_BASE_URL}/extraction/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        url: tab.url,
        priority: 1,
        preExtractedHtml: pageHtml // Send HTML if we got it
      }),
    });

    const data = await response.json();

    if (response.ok) {
      showStatus('Job added to extraction queue!', 'success');
      // Switch to queue tab to show progress
      switchToTab('queue');
      // Refresh queue immediately
      await refreshQueue();
    } else if (response.status === 409 && data.isDuplicate) {
      // Handle duplicate job with beautiful modal
      showDuplicateModal(data.message, data.existingJobId);
      showStatus('Job already extracted', 'info');
    } else {
      console.error('Queue add failed:', response.status, data);
      showStatus(data.error || 'Failed to add to queue', 'error');

      // If token is invalid, clear auth and show login
      if (response.status === 401) {
        console.log('Got 401, clearing auth and showing login');
        await chrome.storage.local.remove(['token', 'user']);
        showAuthSection();
      }
    }
  } catch (error) {
    console.error('Extraction error:', error);
    showStatus('Failed to add to extraction queue. Please try again.', 'error');
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
  loadingSection.classList.add('hidden');
  headerSection.classList.remove('hidden');
  authSection.classList.remove('hidden');
  mainSection.classList.add('hidden');
  userAvatar.classList.add('hidden');
  stopQueuePolling();
}

function showMainSection(user) {
  loadingSection.classList.add('hidden');
  headerSection.classList.remove('hidden');
  authSection.classList.add('hidden');
  mainSection.classList.remove('hidden');
  userAvatar.classList.remove('hidden');
  userEmail.textContent = user.email;

  // Set user avatar initial
  if (user.name) {
    userAvatar.textContent = user.name.charAt(0).toUpperCase();
  } else {
    userAvatar.textContent = user.email.charAt(0).toUpperCase();
  }

  // Start queue polling
  startQueuePolling();
}

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';

  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000);
}

// Tab Navigation Functions
function setupTabs() {
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      switchToTab(tabName);
    });
  });
}

function switchToTab(tabName) {
  // Update active tab
  navTabs.forEach(tab => {
    tab.classList.remove('active');
    if (tab.getAttribute('data-tab') === tabName) {
      tab.classList.add('active');
    }
  });

  // Update active panel
  tabPanels.forEach(panel => {
    panel.classList.remove('active');
  });

  const targetPanel = document.getElementById(`${tabName}Tab`);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  // Refresh queue when switching to queue tab
  if (tabName === 'queue') {
    refreshQueue();
    // Force immediate reconnect to long-poll if already watching
    if (isPollingActive && longPollAbortController) {
      console.log('🔄 Force reconnecting to long-poll');
      longPollAbortController.abort();
      setTimeout(watchQueue, 0);
    }
  }
}

// Event-Driven Queue Management (NO LOOPS - Pure Recursive Promises)
let longPollAbortController = null;
let isPollingActive = false;

function startQueuePolling() {
  if (isPollingActive) return; // Already watching

  isPollingActive = true;
  console.log('📡 Starting event-driven queue watch');

  // Start the recursive promise chain
  watchQueue();
}

/**
 * Recursive promise-based queue watcher
 * Each request schedules the next one - NO WHILE LOOPS
 * Pure event-driven architecture using promise chains and setTimeout
 */
async function watchQueue() {
  // Exit condition
  if (!isPollingActive) {
    console.log('📡 Queue watch stopped');
    return;
  }

  try {
    const token = await getBestToken();

    if (!token) {
      // No auth - schedule retry via setTimeout (event-driven)
      console.log('⏳ No auth, retry in 5s');
      setTimeout(watchQueue, 5000);
      return;
    }

    // Create abort controller
    longPollAbortController = new AbortController();

    // Long-poll request (server holds connection until update)
    const response = await fetch(`${API_BASE_URL}/extraction/queue/watch`, {
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include',
      signal: longPollAbortController.signal
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log('🔒 Unauthorized, stopping watch');
        isPollingActive = false;
        return;
      }

      // Error - schedule retry via setTimeout
      console.error('❌ Poll error:', response.status);
      setTimeout(watchQueue, 5000);
      return;
    }

    // Process update
    const data = await response.json();
    const queue = data.queue || [];

    // Always update display immediately when data arrives
    console.log('📊 Updating queue display with', queue.length, 'items');
    updateQueueDisplay(queue);

    // Determine next poll timing based on queue state
    const hasActiveItems = queue.some(item =>
      item.status === 'PENDING' || item.status === 'PROCESSING'
    );

    if (hasActiveItems) {
      // Active extraction - aggressive polling every 500ms
      console.log('🔄 Active items detected, fast reconnect (500ms)');
      setTimeout(watchQueue, 500); // Faster updates for active items
    } else {
      // Idle queue - brief delay before reconnect
      console.log('💤 Queue idle, reconnect in 2s');
      setTimeout(watchQueue, 2000);
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('🛑 Request aborted');
      return;
    }

    // Error - schedule retry via setTimeout
    console.error('❌ Watch error:', error);
    setTimeout(watchQueue, 5000);
  }
}

function stopQueuePolling() {
  console.log('🛑 Stopping queue watch');
  isPollingActive = false;

  if (longPollAbortController) {
    longPollAbortController.abort();
    longPollAbortController = null;
  }
}

async function refreshQueue() {
  // One-time queue refresh (used for manual refresh)
  try {
    const token = await getBestToken();
    if (!token) return;

    const response = await fetch(`${API_BASE_URL}/extraction/queue`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      updateQueueDisplay(data.queue || []);
    }
  } catch (error) {
    console.error('Failed to refresh queue:', error);
  }
}

function updateQueueDisplay(queueItems) {
  queueCount.textContent = `${queueItems.length} item${queueItems.length !== 1 ? 's' : ''}`;

  if (queueItems.length === 0) {
    queueList.style.display = 'none';
    queueEmpty.style.display = 'block';
    return;
  }

  queueList.style.display = 'block';
  queueEmpty.style.display = 'none';

  queueList.innerHTML = queueItems.map(item => {
    const url = new URL(item.url);
    const domain = url.hostname.replace('www.', '');
    const isCompleted = item.status === 'COMPLETED';
    const jobId = isCompleted && item.result ? item.result.jobId : null;
    const clickable = isCompleted && jobId;

    return `
      <div class="queue-item ${clickable ? 'queue-item-clickable' : ''}" ${clickable ? `data-job-id="${jobId}"` : ''}>
        <div class="queue-item-header">
          <div class="queue-item-url" title="${item.url}">${domain}</div>
          <div class="queue-status ${item.status.toLowerCase()}">${item.status}</div>
        </div>
        ${item.status === 'PROCESSING' ? `
          <div class="queue-progress">
            <div class="queue-progress-label">${item.currentStep || 'Processing...'}</div>
            <div class="queue-progress-bar">
              <div class="queue-progress-fill" style="width: ${item.progress}%"></div>
            </div>
          </div>
        ` : ''}
        ${item.error ? `
          <div class="queue-progress">
            <div class="queue-progress-label" style="color: #ff6b6b;">${item.error}</div>
          </div>
        ` : ''}
        ${clickable ? `
          <div class="queue-action">
            <span class="queue-view-job">Click to view job →</span>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // Add click handlers to completed items
  document.querySelectorAll('.queue-item-clickable').forEach(item => {
    item.addEventListener('click', () => {
      const jobId = item.dataset.jobId;
      if (jobId) {
        chrome.tabs.create({ url: `http://localhost:3000/jobs/${jobId}` });
      }
    });
  });
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

// Initialize Lottie animation for logo
document.addEventListener('DOMContentLoaded', () => {
  const catContainer = document.getElementById('catAnimation');
  if (catContainer) {
    if (typeof lottie !== 'undefined') {
      fetch(chrome.runtime.getURL('src/black-cat.json'))
        .then(response => response.json())
        .then(animationData => {
          lottie.loadAnimation({
            container: catContainer,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData: animationData
          });
        })
        .catch(error => {
          console.error('Failed to load cat animation:', error);
          // Fallback to emoji
          catContainer.textContent = '🐱';
        });
    } else {
      console.error('Lottie library not loaded');
      catContainer.textContent = '🐱';
    }
  }
});

// Duplicate Job Modal Functions
function showDuplicateModal(message, jobId) {
  const modal = document.getElementById('duplicateModal');
  const messageEl = document.getElementById('duplicateMessage');
  const viewBtn = document.getElementById('duplicateViewBtn');
  const closeBtn = document.getElementById('duplicateCloseBtn');

  messageEl.textContent = message;
  modal.classList.remove('hidden');

  // View job button handler
  const viewHandler = () => {
    if (jobId) {
      chrome.tabs.create({ url: `http://localhost:3000/jobs/${jobId}` });
      closeDuplicateModal();
    }
  };

  // Close button handler
  const closeHandler = () => {
    closeDuplicateModal();
  };

  // Overlay click handler
  const overlayHandler = (e) => {
    if (e.target.classList.contains('duplicate-overlay')) {
      closeDuplicateModal();
    }
  };

  // Remove existing listeners and add new ones
  viewBtn.replaceWith(viewBtn.cloneNode(true));
  closeBtn.replaceWith(closeBtn.cloneNode(true));

  const newViewBtn = document.getElementById('duplicateViewBtn');
  const newCloseBtn = document.getElementById('duplicateCloseBtn');

  newViewBtn.addEventListener('click', viewHandler);
  newCloseBtn.addEventListener('click', closeHandler);
  modal.addEventListener('click', overlayHandler);
}

function closeDuplicateModal() {
  const modal = document.getElementById('duplicateModal');
  modal.classList.add('hidden');
}

// Clean up long polling when popup closes
window.addEventListener('beforeunload', () => {
  stopQueuePolling();
});

// Handle visibility changes (when extension popup is hidden)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopQueuePolling();
  } else {
    // Restart polling when popup becomes visible again
    const queueTab = document.querySelector('[data-tab="queue"]');
    if (queueTab && queueTab.classList.contains('active')) {
      startQueuePolling();
    }
  }
});