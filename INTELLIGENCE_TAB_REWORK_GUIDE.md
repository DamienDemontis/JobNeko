# Intelligence Tab Rework Guide

**Purpose**: Standardized approach for reworking all intelligence tabs (Application Strategy, Timeline, Communication, etc.) to match the quality of Salary Intel and Location Intel tabs.

---

## 🎯 Core Principles

### 1. **No Hardcoded or Fallback Values**
- ❌ Never use placeholder data, default values, or mock responses
- ✅ All data MUST come from real AI analysis or web searches
- ✅ If data is missing, throw errors or show empty states - never fake it
- ✅ Validate data structure before rendering

### 2. **Black & White Premium Design**
- ✅ White cards with gray borders (`border border-gray-200`)
- ✅ Gray backgrounds for highlights (`bg-gray-50`)
- ✅ Colored icons ONLY (green $, blue 📍, red ❤️, etc.)
- ✅ Subtle color for special cases: blue for user-specific data, status badges
- ❌ No colored card backgrounds (no `bg-blue-500`, `bg-purple-200`, etc.)
- ❌ No gradients except for buttons/badges

**Example Good**:
```tsx
<Card> {/* White card, gray border */}
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <DollarSign className="w-5 h-5 text-green-600" /> {/* Colored icon */}
      Salary Analysis
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="p-4 bg-gray-50 rounded-lg border"> {/* Gray bg only */}
      Content here
    </div>
  </CardContent>
</Card>
```

**Example Bad**:
```tsx
<Card className="bg-gradient-to-r from-blue-500 to-purple-600"> {/* NO! */}
  <div className="bg-yellow-200 p-4"> {/* NO! */}
    Colorful mess
  </div>
</Card>
```

---

## 🏗️ Architecture Pattern

### File Structure
```
app/api/jobs/[id]/[tab-name]-analysis/
  └── route.ts                    # API endpoint with GPT-5 web search

components/ui/
  └── [tab-name]-intelligence.tsx # Main UI component

components/shared/                # Reusable components
  ├── data-sources-section.tsx   # Collapsible sources
  ├── quality-metric-grid.tsx    # Metrics with progress bars
  └── info-grid.tsx               # Key-value pairs
```

### API Route Pattern (`route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateToken } from '@/lib/auth';
import { unifiedAI } from '@/lib/services/unified-ai-service';
import { gpt5Service } from '@/lib/services/gpt5-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🎯 [${requestId}] [Tab Name] analysis API called`);

  try {
    // 1. Authentication
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const cookieToken = request.cookies.get('token')?.value;
    const token = authHeader || cookieToken;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const resolvedParams = await params;
    const jobId = resolvedParams.id;

    // 2. Get job + user data with resume
    const job = await prisma.job.findFirst({
      where: { id: jobId, userId: user.id },
      include: { user: { include: { profile: true } } }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 3. Get user's resume (if needed for context)
    const resume = await prisma.resume.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { updatedAt: 'desc' }
    });

    // 4. Handle cache check parameter
    const checkCache = request.nextUrl.searchParams.get('checkCache') === 'true';
    const forceRefresh = request.nextUrl.searchParams.get('forceRefresh') === 'true';

    if (checkCache) {
      // Check for cached analysis (48h cache)
      if (job.extractedData) {
        try {
          const cached = JSON.parse(job.extractedData);
          if (cached.[tabName]Analysis && cached.[tabName]AnalysisDate) {
            const hoursSinceAnalysis = (Date.now() - new Date(cached.[tabName]AnalysisDate).getTime()) / (1000 * 60 * 60);

            if (hoursSinceAnalysis < 48 && cached.[tabName]Analysis?.someRequiredField) {
              console.log(`📋 [${requestId}] Returning cached analysis (${hoursSinceAnalysis.toFixed(1)}h old)`);
              return NextResponse.json({
                cached: true,
                analysis: cached.[tabName]Analysis,
                cacheAge: `${hoursSinceAnalysis.toFixed(1)} hours`
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️ [${requestId}] Failed to parse cached data:`, error);
        }
      }

      return NextResponse.json({ cached: false, analysis: null });
    }

    // 5. Check cache unless force refresh
    if (!forceRefresh && job.extractedData) {
      // Same cache check logic as above
    }

    console.log(`🔍 Starting REAL web search for [tab purpose]`);

    // 6. Run GPT-5 web searches in PARALLEL
    const [search1Results, search2Results] = await Promise.all([
      gpt5Service.searchWeb(query1, {
        userId: user.id,
        maxResults: 5,
        domains: ['relevant-domain-1.com', 'relevant-domain-2.com'],
        searchType: 'general',
        reasoning: 'low' // Low reasoning for speed
      }),
      gpt5Service.searchWeb(query2, {
        userId: user.id,
        maxResults: 5,
        domains: ['relevant-domain-3.com', 'relevant-domain-4.com'],
        searchType: 'general',
        reasoning: 'low'
      })
    ]);

    console.log(`✅ Found ${search1Results.results.length} + ${search2Results.results.length} sources`);

    // 7. Deduplicate sources
    const allSourcesMap = new Map();
    [...search1Results.results, ...search2Results.results].forEach(result => {
      if (result.url) {
        const existing = allSourcesMap.get(result.url);
        if (!existing || (result.relevance || 0) > (existing.relevance || 0)) {
          allSourcesMap.set(result.url, result);
        }
      }
    });

    // 8. AI Analysis with REAL web data
    const analysisPrompt = `
You are a [domain expert]. Analyze the following REAL web search data.

**Job Information:**
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}

**User Profile:**
- Current Location: ${job.user.profile?.currentLocation || 'Not specified'}
- Experience: ${job.user.profile?.yearsOfExperience || 'Not specified'} years
${resume ? `- Resume Skills: ${JSON.parse(resume.skills || '[]').join(', ')}` : ''}

**REAL WEB SEARCH DATA:**
${search1Results.summary}

${search2Results.summary}

**CRITICAL INSTRUCTIONS:**
1. Use ONLY the real web search data provided above - NO MADE-UP NUMBERS
2. For missing data, use reasonable estimates based on industry knowledge
3. Extract actual numbers and facts from the web search summaries
4. Be specific and cite the data sources when making claims
5. **Fill ALL fields** - do not leave fields empty unless absolutely no data exists
6. Format text for readability (use bullet points, line breaks)

**Response Format (EXACT JSON structure required):**
{
  "field1": {
    "subfield1": <value from web data>,
    "subfield2": ["Array", "Of", "Items"],
    "insights": [
      "Insight 1 with source citation",
      "Insight 2 with source citation",
      "Insight 3 with source citation"
    ]
  },
  "field2": {
    // Structure based on tab requirements
  }
}

**VALIDATION RULES:**
- All scores: 0-100 only
- NEVER say "Data not available" - provide reasonable estimates
- ALL array fields must have 3 items minimum
- Return ONLY the JSON object, no additional text
`;

    const startTime = Date.now();
    const response = await unifiedAI.complete(
      analysisPrompt,
      'gpt-5-mini',
      'medium',
      user.id // Pass userId - unified AI service handles API key
    );
    const processingTime = Date.now() - startTime;

    if (!response.success) {
      const errorMsg = response.error?.message || 'Unknown error';
      console.error('❌ AI Analysis Failed:', response.error);
      throw new Error(`AI analysis failed: ${errorMsg}`);
    }

    // 9. Parse and validate JSON
    let analysisData;
    try {
      const rawContent = response.rawResponse || response.data;
      if (typeof rawContent !== 'string') {
        throw new Error('AI response is not a string');
      }
      const cleanedResponse = rawContent.replace(/```json\n?|\n?```/g, '').trim();
      analysisData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      throw new Error('AI returned invalid JSON format');
    }

    // 10. Validate required fields - NO FALLBACKS
    if (!analysisData.someRequiredField) {
      throw new Error('Invalid analysis format: missing required fields');
    }

    // 11. Build web sources with proper formatting
    const webSources = Array.from(allSourcesMap.values()).map(result => ({
      title: result.title || 'Web Source',
      url: result.url,
      type: 'Descriptive Type', // e.g., "Application Strategy", "Timeline Data"
      relevance: Math.round((result.relevance || 0.5) * 100)
    }));

    const finalAnalysis = {
      ...analysisData,
      sources: { webSources }
    };

    // 12. Cache the results
    try {
      const existingData = job.extractedData ? JSON.parse(job.extractedData) : {};
      await prisma.job.update({
        where: { id: jobId },
        data: {
          extractedData: JSON.stringify({
            ...existingData,
            [tabName]Analysis: finalAnalysis,
            [tabName]AnalysisDate: new Date()
          }),
          updatedAt: new Date()
        }
      });
      console.log('💾 Cached analysis');
    } catch (cacheError) {
      console.warn('Failed to cache analysis:', cacheError);
    }

    console.log(`✅ [${requestId}] Analysis completed in ${processingTime}ms`);

    return NextResponse.json({
      cached: false,
      analysis: finalAnalysis,
      job: {
        id: job.id,
        title: job.title,
        company: job.company
      }
    });

  } catch (error) {
    console.error('[Tab name] analysis failed:', error);
    return NextResponse.json({
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST method - calls GET
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return GET(request, { params });
}
```

---

## 🎨 UI Component Pattern

### Component Structure

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from 'lucide-react';
import { toast } from 'sonner';
import { DataSourcesSection, QualityMetricGrid, InfoGrid } from '@/components/shared';

interface TabIntelligenceProps {
  jobId: string;
  // ... other props
  token: string; // ALWAYS pass token as prop, never use cookies-next
}

interface AnalysisData {
  // Define TypeScript interfaces matching API response
  // Use optional fields with safety checks in render
}

interface State {
  status: 'idle' | 'searching' | 'analyzing' | 'complete' | 'error';
  progress: number;
  currentStep: string;
  analysis: AnalysisData | null;
  error: string | null;
}

export default function TabIntelligence({ jobId, token, ... }: TabIntelligenceProps) {
  const [state, setState] = useState<State>({
    status: 'idle',
    progress: 0,
    currentStep: '',
    analysis: null,
    error: null,
  });

  const lastJobIdRef = useRef<string | null>(null);
  const hasAutoLoadedRef = useRef(false);

  // Auto-load cached analysis ONCE
  useEffect(() => {
    if (!hasAutoLoadedRef.current) {
      hasAutoLoadedRef.current = true;
      lastJobIdRef.current = jobId;
      checkForCachedAnalysis();
    } else if (lastJobIdRef.current !== jobId) {
      lastJobIdRef.current = jobId;
      checkForCachedAnalysis();
    }
  }, [jobId]);

  const checkForCachedAnalysis = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/[tab-name]-analysis?checkCache=true`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.cached && data.analysis) {
          setState({
            status: 'complete',
            progress: 100,
            currentStep: '',
            analysis: data.analysis,
            error: null,
          });
        }
      }
    } catch (error) {
      console.log('No cached analysis found');
    }
  };

  const runAnalysis = async (forceRefresh = false) => {
    setState({
      status: 'searching',
      progress: 5,
      currentStep: 'Initializing...',
      analysis: null,
      error: null,
    });

    try {
      // Simulate progress updates
      await new Promise(resolve => setTimeout(resolve, 800));
      setState(prev => ({ ...prev, progress: 40, currentStep: 'Searching web...' }));

      await new Promise(resolve => setTimeout(resolve, 1000));
      setState(prev => ({ ...prev, status: 'analyzing', progress: 70, currentStep: 'Analyzing data...' }));

      const response = await fetch(`/api/jobs/${jobId}/[tab-name]-analysis${forceRefresh ? '?forceRefresh=true' : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ forceRefresh }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Analysis failed');
      }

      const data = await response.json();

      setState({
        status: 'complete',
        progress: 100,
        currentStep: '',
        analysis: data.analysis,
        error: null,
      });

      toast.success(forceRefresh ? 'Fresh analysis completed!' : 'Analysis completed!');
    } catch (error) {
      console.error('Analysis failed:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Analysis failed',
      }));
      toast.error('Failed to analyze. Please try again.');
    }
  };

  // Render methods
  const renderInitialState = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-blue-600" />
          [Tab Name] Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-4 p-8 bg-gray-50 rounded-lg border">
          <Icon className="w-12 h-12 text-blue-600 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Analyze [Purpose]</h3>
            <p className="text-gray-600 text-sm max-w-lg mx-auto">
              Description of what this analysis provides
            </p>
          </div>
          <Button onClick={() => runAnalysis()} className="w-full max-w-md mx-auto">
            <Zap className="w-4 h-4 mr-2" />
            Start Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderLoadingState = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-blue-600" />
          Analyzing...
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{state.currentStep}</span>
            <span className="text-sm text-gray-500">{state.progress}%</span>
          </div>
          <Progress value={state.progress} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Progress indicators */}
        </div>
      </CardContent>
    </Card>
  );

  const renderAnalysisResults = () => {
    const { analysis } = state;
    if (!analysis) return null;

    // Prepare data for shared components
    const infoItems = [...];
    const metrics = [...];

    return (
      <div className="space-y-6">
        {/* Use InfoGrid, QualityMetricGrid, DataSourcesSection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Results</CardTitle>
              <Button variant="outline" size="sm" onClick={() => runAnalysis(true)}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Use shared components with safety checks */}
            {analysis.field1 && <InfoGrid items={infoItems} columns={4} />}
          </CardContent>
        </Card>

        <DataSourcesSection sources={analysis.sources?.webSources || []} />
      </div>
    );
  };

  const renderErrorState = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          Analysis Failed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {state.error || 'Failed to analyze. Please try again.'}
          </AlertDescription>
        </Alert>
        <Button onClick={() => runAnalysis()} className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Analysis
        </Button>
      </CardContent>
    </Card>
  );

  switch (state.status) {
    case 'searching':
    case 'analyzing':
      return renderLoadingState();
    case 'complete':
      return renderAnalysisResults();
    case 'error':
      return renderErrorState();
    default:
      return renderInitialState();
  }
}
```

---

## ✅ Quality Checklist

Before completing any tab rework, verify:

- [ ] **API Route**
  - [ ] Uses `gpt5Service.searchWeb()` for real data
  - [ ] Parallel web searches with `Promise.all()`
  - [ ] Low reasoning (`reasoning: 'low'`) for speed
  - [ ] Passes `userId` to unified AI (not raw API key)
  - [ ] Deduplicates sources by URL
  - [ ] Proper error handling (no try-catch that hides errors)
  - [ ] 48-hour cache with structure validation
  - [ ] Handles `checkCache` and `forceRefresh` parameters
  - [ ] Returns proper source types (not `type_with_underscores`)

- [ ] **UI Component**
  - [ ] Auto-loads cached data on mount (single call)
  - [ ] Uses `token` prop (not `cookies-next`)
  - [ ] Black & white design (no colored cards)
  - [ ] Uses shared components (`DataSourcesSection`, `InfoGrid`, `QualityMetricGrid`)
  - [ ] Safety checks for all fields (`analysis?.field || []`)
  - [ ] Proper TypeScript interfaces
  - [ ] Loading states with progress
  - [ ] Error states with retry button
  - [ ] Refresh button in results
  - [ ] Toast notifications for success/error

- [ ] **Data Quality**
  - [ ] No hardcoded values
  - [ ] No fallback data
  - [ ] All arrays have minimum 3 items
  - [ ] All scores are 0-100
  - [ ] Text formatted with line breaks for readability
  - [ ] Source citations in insights
  - [ ] User profile data used when available

---

## 📚 Reference Examples

**Perfect Implementation**: `components/ui/location-intelligence.tsx` + `app/api/jobs/[id]/location-analysis/route.ts`

**Shared Components**: `components/shared/`
- `data-sources-section.tsx`
- `quality-metric-grid.tsx`
- `info-grid.tsx`

**Import Pattern**:
```typescript
import { DataSourcesSection, QualityMetricGrid, InfoGrid } from '@/components/shared';
```

---

## 🚀 Rollout Strategy

1. Create API route with GPT-5 web searches
2. Define TypeScript interfaces for response
3. Create UI component using shared components
4. Test with real data
5. Clear old cache for users
6. Deploy

---

## 💡 Common Patterns

### Comparisons with User Data
Always compare with user's profile when available:
```typescript
"vsUserLocation": "${job.user.profile?.currentLocation ? `15% cheaper than ${job.user.profile.currentLocation}` : 'User location not specified'}"
```

### Formatted Insights
Use arrays for better readability:
```typescript
"keyInsights": [
  "Brief, clear statement with source (Source, 2025)",
  "Another insight with citation (Source, 2025)",
  "Third insight with data"
]
```

### Safety Checks in UI
```typescript
{analysis.field?.subfield && analysis.field.subfield.length > 0 && (
  <div>
    {analysis.field.subfield.map(...)}
  </div>
)}
```

---

This guide ensures **consistent, high-quality, premium-feeling intelligence tabs** across the entire application. 🎯
