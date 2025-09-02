// Service Worker for Job Tracker Extension

const API_BASE_URL = 'http://localhost:3000';

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Job Tracker Extension installed');
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveJob') {
    saveJobToDatabase(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'getAuthStatus') {
    checkAuthStatus()
      .then(isAuthenticated => sendResponse({ isAuthenticated }))
      .catch(error => sendResponse({ isAuthenticated: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'openAuthTab') {
    chrome.tabs.create({ url: `${API_BASE_URL}/auth/signin` });
    sendResponse({ success: true });
  }
});

// Save job to database via API
async function saveJobToDatabase(jobData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(jobData)
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Not authenticated. Please sign in first.');
      }
      throw new Error(`Failed to save job: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving job:', error);
    throw error;
  }
}

// Check authentication status
async function checkAuthStatus() {
  try {
    // Check if user is authenticated by making a test API call
    const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
      method: 'GET',
      credentials: 'include',
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error checking auth status:', error);
    return false;
  }
}

// Listen for tab updates to inject content script dynamically if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const jobSites = [
      'indeed.com',
      'linkedin.com',
      'glassdoor.com',
      'monster.com',
      'ziprecruiter.com',
      'dice.com',
      'angellist.com',
      'wellfound.com',
      'remote.co',
      'remoteok.io',
      'flexjobs.com'
    ];
    
    const isJobSite = jobSites.some(site => tab.url.includes(site));
    
    if (isJobSite) {
      // Content script is already injected via manifest, but we can send a message
      chrome.tabs.sendMessage(tabId, { action: 'checkForJobListing' });
    }
  }
});