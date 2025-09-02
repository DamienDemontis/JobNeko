// Popup JavaScript

const API_BASE_URL = 'http://localhost:3000';
const EXTRACTION_API_URL = 'http://localhost:5679/extract-job';

// DOM Elements
const statusIndicator = document.getElementById('statusIndicator');
const statusDot = statusIndicator.querySelector('.status-dot');
const statusText = statusIndicator.querySelector('.status-text');

const loadingView = document.getElementById('loadingView');
const authenticatedView = document.getElementById('authenticatedView');
const unauthenticatedView = document.getElementById('unauthenticatedView');

const userEmail = document.getElementById('userEmail');
const totalJobs = document.getElementById('totalJobs');
const appliedJobs = document.getElementById('appliedJobs');

const extractBtn = document.getElementById('extractBtn');
const saveBtn = document.getElementById('saveBtn');
const extractStatus = document.getElementById('extractStatus');
const jobTitle = document.getElementById('jobTitle');
const jobCompany = document.getElementById('jobCompany');
const jobLocation = document.getElementById('jobLocation');
const dashboardLink = document.getElementById('dashboardLink');
const signOutBtn = document.getElementById('signOutBtn');
const signInBtn = document.getElementById('signInBtn');
const signUpLink = document.getElementById('signUpLink');
const settingsLink = document.getElementById('settingsLink');
const helpLink = document.getElementById('helpLink');

// Initialize popup
async function init() {
  // Check authentication status
  chrome.runtime.sendMessage({ action: 'getAuthStatus' }, async response => {
    if (response && response.isAuthenticated) {
      await showAuthenticatedView();
    } else {
      showUnauthenticatedView();
    }
  });
  
  // Set up event listeners
  setupEventListeners();
}

// Show authenticated view
async function showAuthenticatedView() {
  loadingView.classList.add('hidden');
  unauthenticatedView.classList.add('hidden');
  authenticatedView.classList.remove('hidden');
  
  statusDot.classList.add('connected');
  statusText.textContent = 'Connected';
  
  // Load user data
  await loadUserData();
  await loadStats();
}

// Show unauthenticated view
function showUnauthenticatedView() {
  loadingView.classList.add('hidden');
  authenticatedView.classList.add('hidden');
  unauthenticatedView.classList.remove('hidden');
  
  statusDot.classList.remove('connected');
  statusDot.classList.add('error');
  statusText.textContent = 'Not signed in';
}

// Load user data
async function loadUserData() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      userEmail.textContent = data.user.email;
    } else {
      userEmail.textContent = 'user@example.com';
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    userEmail.textContent = 'user@example.com';
  }
}

// Load statistics
async function loadStats() {
  try {
    // In a real implementation, this would make an API call
    // For now, we'll use placeholder data
    totalJobs.textContent = '0';
    appliedJobs.textContent = '0';
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Set up event listeners
function setupEventListeners() {
  let currentJobData = null;

  // Extract button - Extract AND auto-save job data
  extractBtn?.addEventListener('click', async () => {
    extractBtn.disabled = true;
    extractBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      Extracting...
    `;
    
    try {
      // Get current tab URL
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Call job extraction API with the URL
      const response = await fetch(EXTRACTION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: tab.url
        })
      });
      
      if (response.ok) {
        const responseText = await response.text();
        console.log('Job extraction API response:', responseText);
        
        if (!responseText.trim()) {
          throw new Error('Empty response from job extraction API');
        }
        
        const result = JSON.parse(responseText);
        
        if (result.success && result.data) {
          currentJobData = result.data;
          
          // Show extracted job data
          jobTitle.textContent = currentJobData.title || 'Title not found';
          jobCompany.textContent = currentJobData.company || 'Company not found';
          jobLocation.textContent = currentJobData.location || 'Location not specified';
          extractStatus.classList.remove('hidden');
          
          // Reset extract button
          extractBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Job Extracted
          `;
          extractBtn.disabled = false;
        } else {
          throw new Error(result.error || 'Failed to extract job data');
        }
      } else {
        throw new Error('Job extraction API request failed');
      }
      
    } catch (error) {
      console.error('Error extracting job:', error);
      
      // Fallback to content script extraction
      try {
        chrome.tabs.sendMessage(tab.id, { action: 'extractJobData' }, response => {
          if (response && response.success && response.data) {
            currentJobData = response.data;
            
            // Show extracted job data
            jobTitle.textContent = currentJobData.title;
            jobCompany.textContent = currentJobData.company;
            jobLocation.textContent = currentJobData.location || 'Location not specified';
            extractStatus.classList.remove('hidden');
            
            // Reset extract button with fallback indicator
            extractBtn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Job Extracted (Fallback)
            `;
            extractBtn.disabled = false;
          } else {
            // Show error state
            extractBtn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              No Job Found
            `;
            
            setTimeout(() => {
              extractBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                Extract Job Data
              `;
              extractBtn.disabled = false;
            }, 2000);
          }
        });
      } catch (fallbackError) {
        extractBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          Error
        `;
        extractBtn.disabled = false;
      }
    }
  });

  // Save button - Save the extracted job data
  saveBtn?.addEventListener('click', async () => {
    if (!currentJobData) return;
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      Saving...
    `;
    
    try {
      // Save job via background script
      chrome.runtime.sendMessage({ 
        action: 'saveJob', 
        data: currentJobData 
      }, response => {
        if (response && response.success) {
          saveBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Saved!
          `;
          
          // Update stats
          loadStats();
          
          // Reset after delay
          setTimeout(() => {
            extractStatus.classList.add('hidden');
            currentJobData = null;
            extractBtn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              Extract Job Data
            `;
            saveBtn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Save Job
            `;
            saveBtn.disabled = false;
          }, 2000);
        } else {
          const errorMsg = response?.error || 'Failed to save';
          saveBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            Failed
          `;
          console.error('Failed to save job:', errorMsg);
          
          // Show auth error specifically
          if (errorMsg.includes('Not authenticated') || errorMsg.includes('401')) {
            alert('Please sign in to your Job Tracker first at http://localhost:3000');
            chrome.tabs.create({ url: `${API_BASE_URL}/auth/signin` });
          }
          
          saveBtn.disabled = false;
        }
      });
    } catch (error) {
      console.error('Error saving job:', error);
      saveBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        Error
      `;
      saveBtn.disabled = false;
    }
  });
  
  // Dashboard link
  dashboardLink?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${API_BASE_URL}/dashboard` });
  });
  
  // Sign out button
  signOutBtn?.addEventListener('click', async () => {
    try {
      // Clear cookies
      const cookies = await chrome.cookies.getAll({ url: API_BASE_URL });
      for (const cookie of cookies) {
        await chrome.cookies.remove({ url: API_BASE_URL, name: cookie.name });
      }
      
      // Show unauthenticated view
      showUnauthenticatedView();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  });
  
  // Sign in button
  signInBtn?.addEventListener('click', () => {
    chrome.tabs.create({ url: `${API_BASE_URL}/auth/signin` });
    window.close();
  });
  
  // Sign up link
  signUpLink?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${API_BASE_URL}/auth/signup` });
    window.close();
  });
  
  // Settings link
  settingsLink?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${API_BASE_URL}/settings` });
  });
  
  // Help link
  helpLink?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${API_BASE_URL}/help` });
  });
}

// Listen for auth changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.isAuthenticated) {
    if (changes.isAuthenticated.newValue) {
      showAuthenticatedView();
    } else {
      showUnauthenticatedView();
    }
  }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);