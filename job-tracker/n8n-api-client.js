// n8n API Client to manage workflows programmatically
const N8N_BASE_URL = 'http://localhost:5678';

class N8nApiClient {
  constructor(baseUrl = N8N_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async login(email = 'admin@example.com', password = 'password123') {
    try {
      const response = await fetch(`${this.baseUrl}/rest/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password
        })
      });
      
      if (response.ok) {
        console.log('✅ Logged into n8n successfully');
        return await response.json();
      } else {
        console.log('❌ Login failed:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  }

  async getWorkflows() {
    try {
      const response = await fetch(`${this.baseUrl}/rest/workflows`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        console.log('❌ Failed to get workflows:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Get workflows error:', error);
      return null;
    }
  }

  async createWorkflow(workflowData) {
    try {
      const response = await fetch(`${this.baseUrl}/rest/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(workflowData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Workflow created:', result.name);
        return result;
      } else {
        console.log('❌ Failed to create workflow:', response.status);
        const error = await response.text();
        console.log('Error details:', error);
        return null;
      }
    } catch (error) {
      console.error('Create workflow error:', error);
      return null;
    }
  }

  async activateWorkflow(workflowId) {
    try {
      const response = await fetch(`${this.baseUrl}/rest/workflows/${workflowId}/activate`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        console.log('✅ Workflow activated:', workflowId);
        return true;
      } else {
        console.log('❌ Failed to activate workflow:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Activate workflow error:', error);
      return false;
    }
  }

  async testWebhook(webhookPath = 'extract-job', testData = { url: 'https://example.com' }) {
    try {
      const response = await fetch(`${this.baseUrl}/webhook/${webhookPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
      
      const responseText = await response.text();
      console.log('🔍 Webhook test response:', {
        status: response.status,
        body: responseText
      });
      
      return {
        success: response.ok,
        status: response.status,
        data: responseText
      };
    } catch (error) {
      console.error('Webhook test error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Simple workflow that should work
const createSimpleWorkflow = {
  name: "Job Extraction API",
  active: true,
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "extract-job",
        responseMode: "responseNode"
      },
      id: "webhook-1",
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 1,
      position: [240, 300]
    },
    {
      parameters: {
        jsCode: `// Simple job extraction
const url = $input.first().json.url || 'https://example.com';

// Create mock job data for testing
const jobData = {
  title: 'Test Job Title - ' + new Date().toLocaleString(),
  company: 'Test Company',
  location: 'Test Location',
  salary: '$50,000 - $70,000',
  employmentType: 'full-time',
  remotePolicy: 'hybrid',
  description: 'This is a test job extracted from: ' + url,
  url: url,
  extractedAt: new Date().toISOString(),
  source: 'n8n-api-test'
};

return {
  success: true,
  data: jobData,
  error: null,
  message: 'API test successful'
};`
      },
      id: "code-1",
      name: "Code",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [460, 300]
    },
    {
      parameters: {
        respondWith: "json",
        responseBody: "={{ $json }}"
      },
      id: "respond-1",
      name: "Respond to Webhook",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1,
      position: [680, 300]
    }
  ],
  connections: {
    "Webhook": {
      "main": [[{"node": "Code", "type": "main", "index": 0}]]
    },
    "Code": {
      "main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]
    }
  }
};

// Usage example
async function setupN8nWorkflow() {
  const client = new N8nApiClient();
  
  console.log('🚀 Setting up n8n workflow via API...\n');
  
  // First, try to get workflows (this will tell us if we need to login)
  const workflows = await client.getWorkflows();
  
  if (!workflows) {
    console.log('🔐 Need to login first...');
    await client.login();
  }
  
  // Create the workflow
  const workflow = await client.createWorkflow(createSimpleWorkflow);
  
  if (workflow) {
    // Activate the workflow
    await client.activateWorkflow(workflow.id);
    
    // Test the webhook
    console.log('\n🧪 Testing webhook...');
    await client.testWebhook();
  }
}

// For Node.js
if (typeof window === 'undefined') {
  // Uncomment to run: node n8n-api-client.js
  // setupN8nWorkflow();
}

// For browser
if (typeof window !== 'undefined') {
  window.N8nApiClient = N8nApiClient;
  window.setupN8nWorkflow = setupN8nWorkflow;
  console.log('Run setupN8nWorkflow() to create the workflow via API');
}