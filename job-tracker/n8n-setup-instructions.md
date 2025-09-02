# n8n Job Extraction System Setup

## Current Status
✅ n8n is running on http://localhost:5678  
✅ Ollama is running on http://localhost:11434  
✅ Chrome extension updated to use n8n webhook  
✅ Workflow JSON created  

## Next Steps to Complete Setup

### 1. Access n8n Web Interface
1. Open http://localhost:5678 in your browser
2. Login with:
   - Username: `admin`
   - Password: `password123`

### 2. Import the Job Extraction Workflow
1. In n8n interface, go to "Workflows" → "Import from file"
2. Upload the file: `n8n/workflows/job-extraction.json`
3. The workflow will create a webhook endpoint at: http://localhost:5678/webhook/extract-job

### 3. Test the System
1. Go to any job posting (like dev-korea.com)
2. Click the Chrome extension icon
3. Click "Extract Job Data" 
4. The system should:
   - Call n8n webhook with the job URL
   - n8n fetches the page content
   - Uses Ollama (llama3.2:3b) to extract structured job data
   - Returns the data to the Chrome extension
   - Show job details in the popup

### 4. Workflow Features
- **Primary**: AI-powered extraction using Ollama
- **Fallback**: Basic HTML parsing if AI fails
- **Universal**: Works on any job site, not just pre-configured ones
- **Smart**: Handles errors gracefully with fallback to original content script

## Architecture
```
Job Site → Chrome Extension → n8n Webhook → Ollama AI → Structured Data → Chrome Extension
```

## Manual Testing
You can test the webhook directly:
```bash
curl -X POST http://localhost:5678/webhook/extract-job \
  -H "Content-Type: application/json" \
  -d '{"url": "https://dev-korea.com/some-job-posting"}'
```

## Troubleshooting
- If webhook doesn't exist: Import the workflow first
- If AI extraction fails: Check Ollama models are downloaded
- If Chrome extension fails: Check localhost:5678 permissions in manifest.json