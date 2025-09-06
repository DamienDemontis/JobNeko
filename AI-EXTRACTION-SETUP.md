# 🤖 AI-Only Job Extraction System

The job tracker uses **AI-powered extraction exclusively**. No fallbacks are available - this ensures consistently high-quality, AI-processed job data.

## ⚡ IMPORTANT: AI Service Required

**⚠️ You MUST configure at least one AI service to extract jobs. The system will not work without AI.**

## 🚀 Available AI Services

### Option 1: OpenAI API (Recommended)
**Best quality** - Uses GPT-3.5-turbo for superior extraction and formatting

**Setup:**
1. Get an OpenAI API key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Add to your `.env` file:
```bash
OPENAI_API_KEY="your-api-key-here"
```
3. Restart your development server

**Cost:** ~$0.001-0.003 per job extraction (very affordable)

### Option 2: Local Ollama (Free)
**Free option** - Runs AI models locally on your machine

**Setup:**
1. Install Ollama from [https://ollama.ai](https://ollama.ai)
2. Pull a suitable model:
```bash
ollama pull llama3.1:8b
```
3. Start Ollama service:
```bash
ollama serve
```
4. Update `.env` file (optional, uses default):
```bash
OLLAMA_API_URL="http://localhost:11434"
```

**Pros:** Free, private, no API costs  
**Cons:** Requires local computing resources, slower than OpenAI

## 🔄 AI Service Priority

The system automatically uses AI services in this order:
1. **OpenAI** (if API key provided)
2. **Ollama** (if service running)

**If no AI service is available, job extraction will fail with an error.**

## ✨ What's Enhanced in AI Extraction

### 📊 Better Data Quality
- **Consistent Formatting**: All job titles, companies, and locations are standardized
- **Clean Descriptions**: Removes marketing fluff, focuses on actual job content
- **Standardized Skills**: "React.js" → "React", "Javascript" → "JavaScript"
- **Professional Language**: Proper capitalization and professional presentation

### 🔍 Smart Content Processing
- **AI-Generated Summaries**: 2-3 sentence compelling summaries for each job
- **Enhanced Requirements**: Clean, readable requirements without bullet points
- **Better Perks Extraction**: Benefits presented in paragraph form
- **Salary Normalization**: Consistent salary range formatting

### 🏗️ Advanced Extraction Pipeline
1. **DOM Analysis**: Chrome extension pre-extracts data using advanced selectors
2. **Structured Data**: Looks for JSON-LD and schema.org markup
3. **AI Enhancement**: Uses AI to clean, format, and enhance all extracted data
4. **Fallback Intelligence**: Multiple layers of fallback for reliability

## 🔧 How It Works

### Chrome Extension Enhancement
The Chrome extension now performs intelligent pre-extraction:
- **Multiple Selector Strategies**: Tests dozens of CSS selectors per field
- **Pattern Recognition**: Finds salary ranges, work modes, and requirements
- **Structured Data Mining**: Extracts JSON-LD schema markup
- **Context-Aware Extraction**: Understands different job site layouts

### AI Processing
When AI services are available:
```javascript
// The AI receives comprehensive prompts with:
- Pre-extracted basic data from Chrome extension
- Full page text (first 4000 chars)
- Structured data (if available)
- Specific formatting requirements
- Consistency rules for standardization
```

### Error Handling
When no AI service is available:
- **Job extraction will fail** with a clear error message
- Users will be prompted to configure an AI service
- No data will be stored without AI processing
- Ensures all jobs maintain high quality standards

## 🚀 Getting Started

### Quick Setup (OpenAI)
1. Get OpenAI API key
2. Add to `.env`:
```bash
OPENAI_API_KEY="sk-your-key-here"
```
3. Restart server
4. Test extraction on any job posting

### Free Setup (Ollama)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull model
ollama pull llama3.1:8b

# Start service
ollama serve
```

### Testing the System
1. Start your development server: `npm run dev`
2. Install the Chrome extension
3. Navigate to any job posting (LinkedIn, Indeed, company websites)
4. Click "Extract Job Offer" in the extension
5. Check the dashboard for enhanced, AI-processed job data

## 📈 Benefits You'll See

### Before (Basic Scraping)
```
Title: "Software Engineer - Company XYZ - Remote"
Company: "Company XYZ"
Description: "Join our team as a Software Engineer... [messy formatting]"
```

### After (AI Enhancement)
```
Title: "Software Engineer"
Company: "Company XYZ"
Summary: "Exciting Software Engineer position at Company XYZ focusing on 
         full-stack development with React and Node.js. Join a growing 
         team building innovative fintech solutions."
Description: "Clean, well-formatted job description with proper paragraphs
             and professional language..."
Skills: ["React", "Node.js", "TypeScript", "AWS", "PostgreSQL"]
```

## 🔍 AI Service Status

The system automatically logs which AI service is being used:
- **Console Logs**: Check browser dev tools for "Using openai for job extraction"
- **Fallback Notices**: See "No AI services available, using enhanced fallback"
- **Error Handling**: Graceful degradation if AI services fail

## 🛠️ Advanced Configuration

### Custom Ollama Models
```bash
# For better performance, try these models:
ollama pull mistral:7b       # Fast and efficient
ollama pull codellama:13b    # Great for technical content
ollama pull llama2:13b       # Balanced performance
```

Update `.env`:
```bash
OLLAMA_API_URL="http://localhost:11434"
```

### Environment Variables
```bash
# Required for OpenAI
OPENAI_API_KEY="your-key-here"

# Optional for Ollama
OLLAMA_API_URL="http://localhost:11434"  # Default value

# Database
DATABASE_URL="file:./dev.db"

# Auth
JWT_SECRET="your-jwt-secret"
```

## 🎯 Best Practices

1. **Use OpenAI for Production**: Best quality and reliability
2. **Use Ollama for Development**: Free and private
3. **Test Multiple Job Sites**: Different sites have different structures
4. **Check AI Service Status**: Monitor logs to ensure AI is working
5. **Review Extracted Data**: Verify quality and make improvements

The enhanced AI extraction system ensures you get professional, consistent, and high-quality job data from any website! 🚀