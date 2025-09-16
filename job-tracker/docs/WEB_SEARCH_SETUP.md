# 🌐 Web Search Setup Guide

This guide explains how to enable real web search capabilities for your AI salary intelligence system, similar to how ChatGPT can browse the web.

## 🎯 Overview

By default, the system uses AI knowledge for salary estimates. With web search enabled, it can:

- **Search real salary databases** (Glassdoor, PayScale, levels.fyi)
- **Get current cost-of-living data** (Numbeo, local sources)
- **Research company information** (reviews, benefits, ratings)
- **Provide up-to-date market insights** with source links

## 🔧 Setup Options

### Option 1: Tavily Search API (Recommended)

Tavily is specifically designed for AI applications and LLM integration.

1. **Sign up at [tavily.com](https://tavily.com)**
2. **Get your API key** from the dashboard
3. **Add to your .env file:**
   ```bash
   TAVILY_API_KEY="your-tavily-api-key-here"
   ```

**Pros:**
- Built specifically for AI/LLM use cases
- Optimized search results for analysis
- Good free tier (1000 searches/month)
- Returns clean, structured data

**Pricing:** Free tier: 1000 searches/month, Pro: $50/month for 50k searches

### Option 2: Perplexity API

Perplexity combines search with AI analysis.

1. **Sign up at [docs.perplexity.ai](https://docs.perplexity.ai)**
2. **Get API access** (currently in beta)
3. **Add to your .env file:**
   ```bash
   PERPLEXITY_API_KEY="your-perplexity-api-key-here"
   ```

**Pros:**
- Combines search + AI analysis
- High-quality, cited responses
- Good for research-heavy queries

### Option 3: SerpAPI (Google Search)

Traditional Google search results via API.

1. **Sign up at [serpapi.com](https://serpapi.com)**
2. **Get your API key**
3. **Add to your .env file:**
   ```bash
   SERPAPI_KEY="your-serpapi-key-here"
   ```

**Pros:**
- Direct Google search results
- Very reliable and comprehensive
- Good for broad searches

### Option 4: Brave Search API

Privacy-focused search with good API.

1. **Sign up at [brave.com/search/api](https://brave.com/search/api)**
2. **Get your API key**
3. **Add to your .env file:**
   ```bash
   BRAVE_SEARCH_API_KEY="your-brave-search-api-key-here"
   ```

**Pros:**
- Privacy-focused
- Affordable pricing
- Good integration with LangChain

## 🚀 Using Web Search

Once configured, the system will automatically:

1. **Search for salary data** using job title, location, and company
2. **Gather cost-of-living information** for the job location
3. **Research company details** including reviews and ratings
4. **Synthesize all data** with AI for comprehensive analysis

### Web-Enhanced vs Standard Analysis

**Standard Analysis (AI Knowledge Only):**
```typescript
// Uses AI training data
const analysis = await optimizedSalaryIntelligence.analyzeSalary(...)
```

**Web-Enhanced Analysis (Real Web Data):**
```typescript
// Uses live web search + AI synthesis
const analysis = await webEnhancedSalaryIntelligence.analyzeSalary(...)
```

## 🎨 UI Features

The web-enhanced UI clearly shows:

- **Real-time search progress** with actual search queries
- **Data source transparency** with clickable links to sources
- **Confidence scoring** based on web data quality
- **Search query history** showing what was searched
- **Source attribution** for all salary and market data

## 📊 Search Targets

The system searches these types of sites:

**Salary Data:**
- Glassdoor.com
- PayScale.com
- levels.fyi
- Salary.com
- Indeed.com
- LinkedIn salary insights

**Cost of Living:**
- Numbeo.com
- Local real estate sites
- Government economic data
- Local transportation data

**Company Information:**
- Glassdoor reviews
- Company websites
- News articles
- Employee forums

## 🔒 Fallback Behavior

If web search fails or isn't configured:

1. **Graceful degradation** to AI-only analysis
2. **Clear error messages** explaining the limitation
3. **Option to retry** or use standard analysis
4. **No system crashes** - always provides some analysis

## ⚡ Performance

**Web Search Analysis:**
- **Time:** 3-8 seconds (searches multiple sources)
- **Caching:** 24-hour cache for repeated queries
- **API Calls:** 3-5 search queries per analysis
- **Confidence:** 60-95% (based on real data quality)

**Standard Analysis:**
- **Time:** 2-5 seconds (single AI call)
- **Caching:** 24-hour cache
- **API Calls:** 1 OpenAI call
- **Confidence:** 30-70% (based on AI knowledge)

## 🛠️ Implementation Details

The web search system uses a 3-step process:

1. **Parallel Search:** Searches salary, location, and company data simultaneously
2. **Data Extraction:** AI extracts relevant information from search results
3. **Synthesis:** AI combines all web data into comprehensive analysis

```typescript
// Example search flow
const [salaryData, costOfLiving, companyInfo] = await Promise.all([
  aiWebSearch.searchSalaryData(jobTitle, location, company),
  aiWebSearch.searchCostOfLiving(location),
  aiWebSearch.searchCompanyInfo(company)
]);

const analysis = await synthesizeWithAI(salaryData, costOfLiving, companyInfo);
```

## 💡 Best Practices

1. **Start with Tavily** - best for AI applications
2. **Monitor API usage** - set up usage alerts
3. **Cache aggressively** - avoid redundant searches
4. **Handle failures gracefully** - always provide fallback
5. **Show data sources** - maintain transparency

## 🧪 Testing

Test web search functionality:

```bash
# Test without API key (should fallback gracefully)
npm run test:web-search-fallback

# Test with API key (should use real search)
npm run test:web-search-live

# Test caching behavior
npm run test:web-search-cache
```

## 📈 Monitoring

Monitor web search performance:

- **API usage** and costs
- **Search success rate**
- **Data quality metrics**
- **User satisfaction** with web-enhanced results

With web search enabled, your salary intelligence becomes dramatically more accurate and current, providing users with real market data instead of AI estimates.