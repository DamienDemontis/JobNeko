// Background service worker for Chrome extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Job Tracker Extension installed');
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJob') {
    // Handle job extraction request
    handleJobExtraction(request.data, sender.tab)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

async function handleJobExtraction(data, tab) {
  // Get stored authentication token
  const { token } = await chrome.storage.local.get('token');
  
  if (!token) {
    throw new Error('Not authenticated. Please log in first.');
  }
  
  // Send extraction request to API
  const response = await fetch('http://localhost:3000/api/jobs/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: tab.url,
      ...data,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to extract job');
  }
  
  return response.json();
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This won't be triggered since we have a popup
  // But kept for potential future use
});

// Listen for tab updates to potentially show extraction availability
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Could update badge or icon based on whether the page looks like a job posting
    checkIfJobPage(tab.url).then(isJobPage => {
      if (isJobPage) {
        chrome.action.setBadgeText({ text: '!', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#667eea', tabId: tabId });
      } else {
        chrome.action.setBadgeText({ text: '', tabId: tabId });
      }
    });
  }
});

function checkIfJobPage(url) {
  // Simple heuristic to check if URL might be a job page
  const jobKeywords = ['job', 'career', 'position', 'vacancy', 'opening', 'apply', 'recruit'];
  const urlLower = url.toLowerCase();
  return Promise.resolve(jobKeywords.some(keyword => urlLower.includes(keyword)));
}