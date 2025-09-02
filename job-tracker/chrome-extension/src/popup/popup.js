// Popup JavaScript

const API_BASE_URL = 'http://localhost:3000';

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
    const cookies = await chrome.cookies.getAll({ url: API_BASE_URL });
    // In a real implementation, you would decode the JWT token or make an API call
    // For now, we'll just show a placeholder
    userEmail.textContent = 'user@example.com';
  } catch (error) {
    console.error('Error loading user data:', error);
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
  // Extract button
  extractBtn?.addEventListener('click', async () => {
    extractBtn.disabled = true;
    extractBtn.textContent = 'Extracting...';
    
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { action: 'extractAndSave' }, response => {
        if (response && response.success) {
          extractBtn.textContent = 'Extracted!';
          setTimeout(() => {
            extractBtn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Extract Current Page
            `;
            extractBtn.disabled = false;
          }, 2000);
        } else {
          extractBtn.textContent = 'No job found';
          setTimeout(() => {
            extractBtn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Extract Current Page
            `;
            extractBtn.disabled = false;
          }, 2000);
        }
      });
    } catch (error) {
      console.error('Error extracting job:', error);
      extractBtn.textContent = 'Error';
      extractBtn.disabled = false;
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