# Enhanced Skills Match Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER OPENS JOB DETAIL PAGE                    │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  OVERVIEW TAB    │  │  SALARY TAB      │  │  APPLICATION TAB │
│  calculate-match │  │  salary-analysis │  │  app-strategy    │
└──────────────────┘  └──────────────────┘  └──────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
              ┌───────────────────────────────┐
              │  Enhanced Skills Match Service │
              │  (SINGLE SOURCE OF TRUTH)     │
              └───────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │ Check Cache  │    │   AI Task    │
            │ in Database  │    │   Tracker    │
            └──────────────┘    └──────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   ┌─────────┐           ┌────────────┐
   │ CACHE   │           │ CACHE MISS │
   │  HIT    │           │            │
   └─────────┘           └────────────┘
        │                       │
        │ Return                │ Call GPT-5
        │ Instant               │ with Prompt
        │ (0ms)                 │
        │                       ▼
        │               ┌──────────────┐
        │               │  GPT-5 Mini  │
        │               │  (reasoning) │
        │               └──────────────┘
        │                       │
        │               ┌───────┴────────┐
        │               │ Parse Response │
        │               │ - matchingSkills
        │               │ - partialMatches
        │               │ - missingSkills
        │               │ - atsKeywords
        │               │ - components
        │               └────────────────┘
        │                       │
        │               Save to Database
        │               (48h TTL)
        │                       │
        └───────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Overview │ │  Salary  │ │   App    │
│ Shows:   │ │ Shows:   │ │ Shows:   │
│ 82%      │ │ 82%      │ │ 82%      │
│ + comps  │ │ + detail │ │ + ATS    │
└──────────┘ └──────────┘ └──────────┘
```

---

## Data Flow

```
┌──────────────────────────────────────────────────────────┐
│  INPUT: Job + Resume Data                                │
├──────────────────────────────────────────────────────────┤
│  - resumeContent (full text)                             │
│  - resumeSkills (extracted list)                         │
│  - resumeExperience (structured)                         │
│  - jobDescription (full text)                            │
│  - jobRequirements (full text)                           │
│  - jobSkills (extracted list)                            │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  PROCESS: Enhanced Skills Match Service                  │
├──────────────────────────────────────────────────────────┤
│  1. Generate cache key (jobId + resumeId + version)     │
│  2. Check database for cached result                     │
│  3. If miss: Call GPT-5 with specialized prompt         │
│  4. Parse AI response into structured data              │
│  5. Save to database with version tag                   │
│  6. Return comprehensive match result                    │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  OUTPUT: Enhanced Skills Match Result                    │
├──────────────────────────────────────────────────────────┤
│  overallScore: 82                                        │
│  confidence: 0.89                                        │
│                                                          │
│  matchingSkills: [                                       │
│    "React", "TypeScript", "Node.js", "AWS"              │
│  ]                                                       │
│                                                          │
│  partialMatches: [                                       │
│    "Docker (has containerization experience)",          │
│    "CI/CD (has Jenkins, needs GitHub Actions)"          │
│  ]                                                       │
│                                                          │
│  missingSkills: [                                        │
│    "Kubernetes", "GraphQL"                              │
│  ]                                                       │
│                                                          │
│  matchExplanation:                                       │
│    "4 exact matches + 2 partial matches out of 8        │
│     total required = 75% base + 7% partial bonus = 82%" │
│                                                          │
│  components: {                                           │
│    skills: 80,        // Technical skills match         │
│    keywords: 85,      // Job keyword presence           │
│    experience: 78,    // Years & level match            │
│    education: 85,     // Degree & field match           │
│    achievements: 72   // Quantifiable results           │
│  }                                                       │
│                                                          │
│  atsKeywords: {                                          │
│    matched: ["agile", "scrum", "rest api", ...],        │
│    missing: ["devops", "cloud-native", ...],            │
│    recommendations: [                                    │
│      "Add 'DevOps' keyword to resume",                  │
│      "Emphasize cloud-native architecture"              │
│    ]                                                     │
│  }                                                       │
│                                                          │
│  calculatedAt: 2025-10-12T22:35:04Z                     │
│  resumeId: "clm123abc"                                  │
│  version: 2                                              │
│  cacheKey: "enhanced-match:job123:resume456:v2"         │
└──────────────────────────────────────────────────────────┘
```

---

## Cache Strategy

```
┌─────────────────────────────────────────────────┐
│           DATABASE: Job Table                   │
├─────────────────────────────────────────────────┤
│  id: "job123"                                   │
│  title: "Senior Software Engineer"             │
│  ...                                            │
│  matchScore: 82.0                               │
│  matchAnalysis: "{...}"  ← JSON string          │
│  matchAnalysisVersion: 2  ← Format version     │
│  matchResumeId: "resume456"  ← Track resume    │
└─────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   CACHE VALID              CACHE INVALID

   ✅ matchResumeId         ❌ matchResumeId
      matches current          != current

   ✅ version = 2           ❌ version = 1

   ✅ age < 48 hours        ❌ age > 48 hours

   ✅ matchAnalysis         ❌ matchAnalysis
      exists                   is null
```

---

## Cache Hit vs Miss Performance

```
SCENARIO 1: CACHE MISS (First Calculation)
═══════════════════════════════════════════

User opens Overview tab
    ↓
Cache check → MISS
    ↓
Create AI Task (AI Activity Monitor)
    ↓
Call GPT-5 with full prompt
    ├─ Resume analysis
    ├─ Job requirements extraction
    ├─ Exact match detection
    ├─ Partial match detection
    ├─ Missing skills identification
    ├─ ATS keyword extraction
    └─ Score calculation
    ↓
⏱️  15-18 seconds
    ↓
Save to database cache
    ↓
Complete AI Task
    ↓
Return result to Overview tab
    ↓
Display: 82% with components


SCENARIO 2: CACHE HIT (Subsequent Tabs)
═══════════════════════════════════════════

User switches to Salary tab
    ↓
Cache check → HIT! ✅
    ↓
Read from database
    ↓
⏱️  50-100ms (instant!)
    ↓
Return cached result
    ↓
Display: 82% with detailed breakdown
```

---

## Multi-Tab Interaction

```
Timeline: User browsing job details
════════════════════════════════════

T=0s    User opens job page (Overview tab)
        └─> calculateMatch() called
        └─> Cache MISS
        └─> AI calculation starts
        └─> AI Task: "Match Calculation" (pending)

T=5s    AI Task: "Analyzing skills match..." (processing 30%)

T=10s   AI Task: "Finalizing results..." (processing 70%)

T=15s   AI calculation complete
        └─> Save to database cache
        └─> AI Task: COMPLETED ✅
        └─> Overview tab shows: 82%

T=20s   User clicks "Salary" tab
        └─> calculateMatch() called
        └─> Cache HIT! ✅
        └─> Return instant (50ms)
        └─> Salary tab shows: 82% (same!) ✅

T=25s   User clicks "Application" tab
        └─> calculateMatch() called
        └─> Cache HIT! ✅
        └─> Return instant (50ms)
        └─> Application tab shows: 82% (same!) ✅

T=30s   User switches back to Overview tab
        └─> calculateMatch() called
        └─> Cache HIT! ✅
        └─> Return instant (50ms)
        └─> Overview tab shows: 82% (same!) ✅

════════════════════════════════════
TOTAL TIME: 15s (with 3 instant loads)
BEFORE: Would have been 45-60s (3× 15-20s each)
IMPROVEMENT: 70% faster ✅
```

---

## Cache Invalidation Triggers

```
┌───────────────────────────────────────────┐
│  TRIGGER 1: Resume Changed                │
├───────────────────────────────────────────┤
│  User uploads new resume                  │
│  → resume.id changes                      │
│  → matchResumeId != cached resumeId       │
│  → Cache INVALID → Recalculate            │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│  TRIGGER 2: Cache Expired                 │
├───────────────────────────────────────────┤
│  48 hours pass                            │
│  → calculatedAt < now - 48h               │
│  → Cache EXPIRED → Recalculate            │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│  TRIGGER 3: Manual Refresh                │
├───────────────────────────────────────────┤
│  User clicks "Recalculate Match" button   │
│  → forceRecalculate = true                │
│  → Cache BYPASSED → Recalculate           │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│  TRIGGER 4: Version Upgrade               │
├───────────────────────────────────────────┤
│  Old cache (version 1)                    │
│  → matchAnalysisVersion != 2              │
│  → Cache OUTDATED → Recalculate           │
└───────────────────────────────────────────┘
```

---

## Error Handling

```
┌──────────────────────────────────────────┐
│  ERROR SCENARIO 1: AI Response Invalid   │
├──────────────────────────────────────────┤
│  GPT-5 returns malformed JSON            │
│  ↓                                       │
│  Try to parse → Error                    │
│  ↓                                       │
│  Mark AI Task as FAILED                  │
│  ↓                                       │
│  Throw error to API route               │
│  ↓                                       │
│  Return 500 error to client             │
│  ↓                                       │
│  User sees: "Failed to calculate match" │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  ERROR SCENARIO 2: Cache Read Fails      │
├──────────────────────────────────────────┤
│  Database error during cache check       │
│  ↓                                       │
│  Catch error, log warning                │
│  ↓                                       │
│  Treat as cache MISS                     │
│  ↓                                       │
│  Proceed with AI calculation             │
│  ↓                                       │
│  Return successful result                │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  ERROR SCENARIO 3: Cache Save Fails      │
├──────────────────────────────────────────┤
│  AI calculation succeeds                 │
│  ↓                                       │
│  Try to save to cache → Error            │
│  ↓                                       │
│  Log error but DON'T throw              │
│  ↓                                       │
│  Return successful result anyway         │
│  ↓                                       │
│  User gets result (just no caching)     │
└──────────────────────────────────────────┘
```

---

## Integration Points

```
┌─────────────────────────────────────────────────────┐
│  OVERVIEW TAB                                       │
│  /api/jobs/[id]/calculate-match                    │
├─────────────────────────────────────────────────────┤
│  Uses: overallScore, components                     │
│  Displays: Percentage + component breakdown         │
│  Special: Force recalculate (bypasses cache)       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  SALARY TAB                                         │
│  /api/jobs/[id]/enhanced-salary-analysis           │
├─────────────────────────────────────────────────────┤
│  Uses: All fields (pass to AI prompt)              │
│  Displays: Detailed skills breakdown               │
│  Special: Pre-calculates before salary search       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  APPLICATION TAB                                    │
│  /api/jobs/[id]/application-strategy-analysis      │
├─────────────────────────────────────────────────────┤
│  Uses: atsKeywords, missingSkills, components      │
│  Displays: ATS optimization recommendations         │
│  Special: Uses for resume tailoring advice          │
└─────────────────────────────────────────────────────┘
```

---

**Architecture Status:** ✅ PRODUCTION READY
