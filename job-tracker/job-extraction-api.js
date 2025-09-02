// Simple Job Extraction API Server
// This replaces the complex n8n setup with a direct Node.js API

const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = 5679; // Different from n8n to avoid conflicts
const OLLAMA_URL = 'http://localhost:11434';

// Simple HTTP server to handle job extraction
const server = http.createServer(async (req, res) => {
  // Enable CORS for Chrome extension
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'POST' && req.url === '/extract-job') {
    try {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          const { url } = JSON.parse(body);
          console.log('🔍 Extracting job from:', url);
          
          const result = await extractJobFromUrl(url);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          
        } catch (error) {
          console.error('❌ Extraction error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: error.message,
            data: null
          }));
        }
      });
      
    } catch (error) {
      console.error('❌ Request error:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Invalid request',
        data: null
      }));
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Helper function to make HTTP requests without node-fetch
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 30000 // Increased default timeout for AI
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Extract job data from URL
async function extractJobFromUrl(url) {
  try {
    // Fetch the page content
    console.log('📡 Fetching page content...');
    const response = await makeRequest(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }
    
    const html = await response.text();
    
    if (html.length < 100) {
      throw new Error('Page content too short');
    }
    
    // Try AI extraction first
    console.log('🤖 Trying AI extraction...');
    try {
      const aiResult = await extractWithOllama(html, url);
      if (aiResult.success) {
        return aiResult;
      }
    } catch (aiError) {
      console.log('⚠️ AI extraction failed, using fallback:', aiError.message);
    }
    
    // Fallback to simple extraction
    console.log('🛠️ Using fallback extraction...');
    return extractWithFallback(html, url);
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

// AI extraction using Ollama with better prompting
async function extractWithOllama(html, url) {
  // Clean HTML first
  const cleanedHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .substring(0, 4000); // Use more context

  const prompt = `You are a job data extractor. Extract job information from this text.

TEXT: ${cleanedHtml}
URL: ${url}

Extract and return ONLY a JSON object with exactly these fields:
{
  "title": "exact job title only",
  "company": "company name only",
  "location": "city, country or Remote",
  "salary": "salary range or null",
  "employmentType": "full-time or part-time or contract or internship",
  "remotePolicy": "remote or hybrid or on-site",
  "description": "2-3 sentence summary of the job"
}

Rules:
- Return ONLY the JSON, no other text
- Use null for missing fields
- Keep values short and clean
- No explanations, just the JSON`;

  const ollamaResponse = await makeRequest(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama3.2:3b', // Use the better model now available
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1, // Low temperature for consistency
        num_predict: 500, // Limit response length
        timeout: 30000    // 30 second timeout
      }
    })
  });
  
  if (!ollamaResponse.ok) {
    throw new Error('Ollama API request failed');
  }
  
  const ollamaResult = await ollamaResponse.json();
  const aiText = ollamaResult.response;
  
  // Try to parse JSON from AI response
  const jsonMatch = aiText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const jobData = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      data: {
        ...jobData,
        url: url,
        extractedAt: new Date().toISOString(),
        source: 'ollama-ai-extraction'
      },
      error: null
    };
  } else {
    throw new Error('Could not find JSON in AI response');
  }
}

// Simple fallback extraction with better parsing
function extractWithFallback(html, url) {
  try {
    // Clean the HTML first
    const cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Extract title - clean it from site names and extra info
    let title = 'Job Position';
    const titleMatch = cleanHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1]
        .replace(/\s*[\|•\-–—]\s*.*$/, '') // Remove site name after separators
        .replace(/\s+at\s+.*$/, '') // Remove "at Company" part
        .trim()
        .replace(/\s+/g, ' ');
    }
    
    // Try to find actual job title from h1 or common patterns
    const h1Match = cleanHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) {
      const h1Text = h1Match[1].trim();
      // Use h1 if it looks like a job title
      if (h1Text.length > 5 && h1Text.length < 100 && !h1Text.includes('404')) {
        title = h1Text;
      }
    }
    
    // Extract company - try multiple methods
    let company = 'Unknown Company';
    
    // Method 1: Look for company patterns in HTML
    const companyPatterns = [
      /<[^>]*(?:class|id)=[^>]*company[^>]*>([^<]+)</i,
      /<[^>]*(?:class|id)=[^>]*employer[^>]*>([^<]+)</i,
      /<[^>]*(?:class|id)=[^>]*organization[^>]*>([^<]+)</i,
      /(?:Company|Employer|Organization):\s*([^<\n]+)/i
    ];
    
    for (const pattern of companyPatterns) {
      const match = cleanHtml.match(pattern);
      if (match && match[1]) {
        company = match[1].trim();
        break;
      }
    }
    
    // Method 2: Extract from title if it contains "at Company"
    const atMatch = titleMatch?.[1].match(/\s+at\s+([^•\|]+)/i);
    if (atMatch && company === 'Unknown Company') {
      company = atMatch[1].trim();
    }
    
    // Method 3: Use domain as last resort
    if (company === 'Unknown Company') {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      company = domain.split('.')[0];
      company = company.charAt(0).toUpperCase() + company.slice(1);
    }
    
    // Extract location with better detection
    let location = null;
    const locationPatterns = [
      /<[^>]*(?:class|id)=[^>]*location[^>]*>([^<]+)</i,
      /(?:Location|City|Office):\s*([^<\n]+)/i,
      /(?:Seoul|Busan|Tokyo|Singapore|London|New York|San Francisco|Remote|Hybrid)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = cleanHtml.match(pattern);
      if (match) {
        location = typeof match[1] === 'string' ? match[1].trim() : match[0];
        break;
      }
    }
    
    // Detect employment type
    let employmentType = 'full-time';
    const lowerHtml = cleanHtml.toLowerCase();
    if (lowerHtml.includes('part-time') || lowerHtml.includes('part time')) {
      employmentType = 'part-time';
    } else if (lowerHtml.includes('contract') || lowerHtml.includes('freelance')) {
      employmentType = 'contract';
    } else if (lowerHtml.includes('intern') || lowerHtml.includes('internship')) {
      employmentType = 'internship';
    }
    
    // Detect remote policy
    let remotePolicy = 'on-site';
    if (lowerHtml.includes('remote') || lowerHtml.includes('work from home')) {
      remotePolicy = 'remote';
    } else if (lowerHtml.includes('hybrid')) {
      remotePolicy = 'hybrid';
    }
    
    // Extract clean description (first meaningful paragraph)
    let description = '';
    const textContent = cleanHtml.replace(/<[^>]*>/g, ' ')
                                 .replace(/\s+/g, ' ')
                                 .trim();
    
    // Find first paragraph with job-related keywords
    const sentences = textContent.split(/[.!?]\s+/);
    const jobKeywords = ['responsible', 'develop', 'manage', 'design', 'build', 'create', 'work', 'experience', 'skills', 'requirements', 'qualifications'];
    
    for (const sentence of sentences) {
      if (sentence.length > 50 && jobKeywords.some(kw => sentence.toLowerCase().includes(kw))) {
        description = sentence.substring(0, 500) + '...';
        break;
      }
    }
    
    // If no good description found, use first 500 chars
    if (!description) {
      description = textContent.substring(0, 500) + '...';
    }
    
    // Return standardized format
    return {
      success: true,
      data: {
        title: title.substring(0, 100),
        company: company.substring(0, 100),
        location: location,
        salary: null,
        employmentType: employmentType,
        remotePolicy: remotePolicy,
        description: description,
        url: url,
        extractedAt: new Date().toISOString(),
        source: 'fallback-extraction'
      },
      error: null
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Job Extraction API running on http://localhost:${PORT}`);
  console.log(`📡 Endpoint: POST http://localhost:${PORT}/extract-job`);
  console.log(`🤖 Ollama URL: ${OLLAMA_URL}`);
  console.log('\n✅ Ready to extract jobs from any website!');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Job Extraction API...');
  server.close(() => {
    process.exit(0);
  });
});