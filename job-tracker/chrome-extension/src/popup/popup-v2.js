// Enhanced Popup with Async Extraction and Auto-Save

const API_BASE_URL = 'http://localhost:3000';

// DOM Elements
const extractBtn = document.getElementById('extractBtn');
const recentJobsList = document.getElementById('recentJobs');
const statusMessage = document.getElementById('statusMessage');

// Storage keys
const RECENT_JOBS_KEY = 'recentJobs';
const MAX_RECENT_JOBS = 5;

// Initialize popup
async function init() {
  await loadRecentJobs();
  setupEventListeners();
}

// Load and display recent jobs
async function loadRecentJobs() {
  chrome.storage.local.get([RECENT_JOBS_KEY], async (result) => {
    let recentJobs = result[RECENT_JOBS_KEY] || [];
    
    // Sync with server to get updated statuses
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/extract/recent`);
      if (response.ok) {
        const serverData = await response.json();
        const serverJobs = serverData.jobs || [];
        
        // Update local jobs with server status
        recentJobs = await syncJobsWithServer(recentJobs, serverJobs);
        
        // Save synced data back to storage
        chrome.storage.local.set({ [RECENT_JOBS_KEY]: recentJobs });
      }
    } catch (error) {
      console.log('Could not sync with server:', error);
    }
    
    displayRecentJobs(recentJobs);
  });
}

// Display recent jobs in the UI
function displayRecentJobs(jobs) {
  if (!recentJobsList) return;
  
  if (jobs.length === 0) {
    recentJobsList.innerHTML = '<div class="text-gray-500 text-sm">No recent extractions</div>';
    return;
  }
  
  recentJobsList.innerHTML = jobs.map(job => `
    <div class="job-item ${job.status}" data-job-id="${job.id}">
      <div class="job-status-indicator ${job.status}"></div>
      <div class="job-info">
        <div class="job-url">${new URL(job.url).hostname}</div>
        <div class="job-time">${getRelativeTime(job.timestamp)}</div>
      </div>
      <div class="job-status-text">${getStatusText(job.status)}</div>
    </div>
  `).join('');
}

// Get status text
function getStatusText(status) {
  switch(status) {
    case 'processing': return '⏳ Extracting...';
    case 'completed': return '✅ Saved';
    case 'failed': return '❌ Failed';
    default: return '🔄 Queued';
  }
}

// Get relative time
function getRelativeTime(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Sync local jobs with server status
async function syncJobsWithServer(localJobs, serverJobs) {
  return localJobs.map(localJob => {
    // Find matching server job by URL and recent timestamp (within 10 minutes)
    const matchingServerJob = serverJobs.find(serverJob => {
      const urlMatch = serverJob.url === localJob.url;
      const timeMatch = Math.abs(new Date(serverJob.createdAt).getTime() - localJob.timestamp) < 600000; // 10 minutes
      return urlMatch && timeMatch;
    });
    
    if (matchingServerJob) {
      return {
        ...localJob,
        status: matchingServerJob.status,
        serverId: matchingServerJob.id,
        data: matchingServerJob.result || localJob.data,
        error: matchingServerJob.error || localJob.error
      };
    }
    
    return localJob;
  });
}

// Add job to recent list
async function addToRecentJobs(job) {
  chrome.storage.local.get([RECENT_JOBS_KEY], (result) => {
    let recentJobs = result[RECENT_JOBS_KEY] || [];
    
    // Add new job at the beginning
    recentJobs.unshift(job);
    
    // Keep only MAX_RECENT_JOBS
    recentJobs = recentJobs.slice(0, MAX_RECENT_JOBS);
    
    // Save back to storage
    chrome.storage.local.set({ [RECENT_JOBS_KEY]: recentJobs }, () => {
      displayRecentJobs(recentJobs);
    });
  });
}

// Update job status in storage
async function updateJobStatus(jobId, status, data = null) {
  chrome.storage.local.get([RECENT_JOBS_KEY], (result) => {
    let recentJobs = result[RECENT_JOBS_KEY] || [];
    
    const jobIndex = recentJobs.findIndex(j => j.id === jobId);
    if (jobIndex !== -1) {
      recentJobs[jobIndex].status = status;
      if (data) {
        recentJobs[jobIndex].data = data;
      }
      
      chrome.storage.local.set({ [RECENT_JOBS_KEY]: recentJobs }, () => {
        displayRecentJobs(recentJobs);
      });
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  // Extract and Auto-Save button
  extractBtn?.addEventListener('click', async () => {
    extractBtn.disabled = true;
    extractBtn.textContent = 'Starting extraction...';
    
    try {
      // Get current tab URL
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Generate job ID
      const jobId = `job_${Date.now()}`;
      
      // Add to recent jobs immediately
      const jobEntry = {
        id: jobId,
        url: tab.url,
        timestamp: Date.now(),
        status: 'processing'
      };
      
      await addToRecentJobs(jobEntry);
      
      // Start async extraction
      const response = await fetch(`${API_BASE_URL}/api/jobs/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: tab.url
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Show success message
        showStatus('✅ Extraction started! Check dashboard for progress.', 'success');
        
        // Poll for completion (optional)
        if (result.jobId) {
          pollJobStatus(result.jobId, jobId);
        }
        
        // Reset button
        extractBtn.innerHTML = '✅ Extraction Started';
        setTimeout(() => {
          extractBtn.innerHTML = '🔍 Extract & Save Job';
          extractBtn.disabled = false;
        }, 2000);
        
      } else {
        throw new Error('Failed to start extraction');
      }
      
    } catch (error) {
      console.error('Error:', error);
      updateJobStatus(jobId, 'failed');
      showStatus('❌ Extraction failed. Please try again.', 'error');
      
      extractBtn.innerHTML = '❌ Failed';
      setTimeout(() => {
        extractBtn.innerHTML = '🔍 Extract & Save Job';
        extractBtn.disabled = false;
      }, 2000);
    }
  });
}

// Poll job status
async function pollJobStatus(serverJobId, localJobId) {
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds max
  
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/extract/${serverJobId}`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.job.status === 'completed') {
          updateJobStatus(localJobId, 'completed', result.job.result);
          showStatus('✅ Job saved successfully!', 'success');
          clearInterval(interval);
        } else if (result.job.status === 'failed') {
          updateJobStatus(localJobId, 'failed');
          showStatus('❌ Extraction failed', 'error');
          clearInterval(interval);
        }
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
      
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 1000);
}

// Show status message
function showStatus(message, type = 'info') {
  if (!statusMessage) return;
  
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';
  
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 5000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);